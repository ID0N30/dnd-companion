import { db, auth, rtdb } from "./firebase";
import { 
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, 
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  runTransaction, writeBatch 
} from "firebase/firestore";
import { 
  ref, set as rtdbSet, get as rtdbGet, update as rtdbUpdate, remove as rtdbRemove, 
  push as rtdbPush, onValue, off, onDisconnect, query as rtdbQuery, limitToLast, 
  runTransaction as rtdbRunTransaction 
} from "firebase/database";
import { useStore, CharacterState, LogEntry, syncAllLocalPlayersToStorage, CombatMonster } from "@/store/useStore";
import { logError, saveOfflineCharacterBackup } from "./errorLogger";
import { withRetry } from "./firestoreResilience";
import { 
  DEMO_ROOM_ID, 
  DEMO_ROOM_NAME, 
  DEMO_DM_NAME, 
  DEMO_INITIAL_MESSAGES, 
  DEMO_INITIAL_LOGS, 
  getFactoryDemoParty 
} from "./demoData";

export const isDemoRoom = (roomId?: string | null): boolean => {
  if (!roomId) return false;
  return roomId === DEMO_ROOM_ID || roomId.startsWith('demo_');
};

export const isDemoCharacterId = (playerId?: string | null): boolean => {
  if (!playerId) return false;
  return playerId === 'drizzt_dourden_demo' || playerId.startsWith('demo_');
};

export const isDemoCharacter = (character?: CharacterState | null): boolean => {
  if (!character || !character.id) return false;
  return isDemoCharacterId(character.id) || isDemoRoom(character.roomId);
};

export type Character = CharacterState;
export type RoomLogEntry = LogEntry;

export type DirectMessage = {
  id: string;
  senderId: string;
  senderUid?: string;
  playerUid?: string; // UID del jugador participante en la conversación (para filtrado unificado Jugador <-> DM)
  senderName: string;
  characterName: string;
  recipientCharacterId?: string;
  recipientCharacterName?: string;
  isFromDM?: boolean;
  content: string;
  timestamp: number;
  read?: boolean;
};

export type WhisperMessage = DirectMessage;

export type Room = {
  id: string;
  name: string;
  nameLower?: string;
  dmId: string;
  dmName: string;
  isPublic: boolean;
  hasPassword: boolean;
  password?: string;
  allowGuests: boolean;
  isCombatMode: boolean;
  inCombat?: boolean;
  round?: number;
  initiativeOrder: string[];
  currentTurnIndex: number;
  combatMonsters?: CombatMonster[];
  lastTurnEvent?: { id: string; timestamp: number } | null;
  lastLevelUpEvent?: any;
  lastItemReceivedEvent?: any;
  hpTerminology?: 'PG' | 'HP';
  currencyMode?: 'standard' | 'all';
  directMessages?: DirectMessage[];
  createdAt?: any;
};

export const cleanFirebaseData = <T>(obj: T): T => {
  if (obj === undefined) return null as any;
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
};

// Room DM ID cache to denormalize dmId on players for zero get() reads
const roomDmIdCache = new Map<string, string>();

// Set of room IDs that have had their /meta node hydrated in RTDB
const hydratedRoomMetaSet = new Set<string>();

// Map of messageId -> playerUid for resolving whisper threads
const whisperMsgThreadMap = new Map<string, string>();

// Active log keys tracked in memory per room for zero-download pruning
const roomActiveLogKeys = new Map<string, Array<{ key: string; timestamp: number }>>();
const roomLogInsertCounter = new Map<string, number>();

// Rate limiter map to prevent hammering Firestore (Quota protection)
const lastWriteTimeMap = new Map<string, number>();
const MIN_WRITE_INTERVAL_MS = 1500; // Minimum 1.5s interval between writes to same doc

const isWriteRateLimited = (key: string): boolean => {
  const now = Date.now();
  const last = lastWriteTimeMap.get(key) || 0;
  if (now - last < MIN_WRITE_INTERVAL_MS) {
    return true;
  }
  lastWriteTimeMap.set(key, now);
  return false;
};

// 1. Subscribe to Public Rooms for Home Page
export const subscribePublicRooms = (callback: (rooms: Room[]) => void) => {
  if (!db) return () => {};
  try {
    const q = query(
      collection(db, "rooms"),
      where("isPublic", "==", true),
      limit(30)
    );
    
    return onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs
        .filter(docSnap => !isDemoRoom(docSnap.id))
        .map(docSnap => {
          const data = docSnap.data() as Room;
          const { password, id: _dataId, ...safeRoom } = data;
          return {
            id: docSnap.id,
            ...safeRoom,
            hasPassword: Boolean(data.hasPassword || data.password)
          } as Room;
        });
      callback(rooms);
    }, (error) => {
      logError(error, 'subscribePublicRooms', 'WARNING');
      callback([]);
    });
  } catch (err) {
    logError(err, 'subscribePublicRooms', 'WARNING');
    callback([]);
    return () => {};
  }
};

// 1.2 Fetch Public Rooms with 60-Second Cache
const PUBLIC_ROOMS_CACHE_KEY = 'dnd_public_rooms_cache';
const PUBLIC_ROOMS_TTL_MS = 60 * 1000;
let memPublicRoomsCache: { data: Room[]; timestamp: number } | null = null;

export const fetchPublicRooms = async (forceRefresh: boolean = false): Promise<Room[]> => {
  const now = Date.now();

  if (!forceRefresh) {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const stored = sessionStorage.getItem(PUBLIC_ROOMS_CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (now - parsed.timestamp < PUBLIC_ROOMS_TTL_MS)) {
            return parsed.data as Room[];
          }
        }
      } catch (e) {}
    } else if (memPublicRoomsCache && (now - memPublicRoomsCache.timestamp < PUBLIC_ROOMS_TTL_MS)) {
      return memPublicRoomsCache.data;
    }
  }

  if (!db) return [];

  try {
    const q = query(
      collection(db, "rooms"),
      where("isPublic", "==", true),
      limit(20)
    );
    const snap = await withRetry(() => getDocs(q), { context: 'fetchPublicRooms' });
    const rooms = snap.docs
      .filter(d => !isDemoRoom(d.id))
      .map(d => {
        const data = d.data() as Room;
        const { password, id: _dataId, ...safeRoom } = data;
        return {
          id: d.id,
          ...safeRoom,
          hasPassword: Boolean(data.hasPassword || data.password)
        } as Room;
      });

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(PUBLIC_ROOMS_CACHE_KEY, JSON.stringify({ data: rooms, timestamp: now }));
      } catch (e) {}
    } else {
      memPublicRoomsCache = { data: rooms, timestamp: now };
    }

    return rooms;
  } catch (err: any) {
    logError(err, 'fetchPublicRooms', 'WARNING');
    return [];
  }
};

// 1.5 Verify Room Password Securely
export const verifyRoomPassword = async (roomId: string, inputPassword: string): Promise<boolean> => {
  if (!roomId) return false;
  if (isDemoRoom(roomId)) return true;
  if (!db) return false;
  try {
    const roomRef = doc(db, "rooms", roomId);
    const snap = await withRetry(() => getDoc(roomRef), { context: 'verifyRoomPassword' });
    if (!snap.exists()) return false;
    const data = snap.data() as Room;
    if (!data.hasPassword && !data.password) return true;
    return (data.password || "").trim() === inputPassword.trim();
  } catch (err) {
    logError(err, 'verifyRoomPassword', 'WARNING');
    return false;
  }
};

// 2. Create a New Campaign (DM Only) with RTDB /meta sync
export const createRoom = async (data: {
  name: string;
  isPublic: boolean;
  password?: string;
  allowGuests: boolean;
  dmId: string;
  dmName: string;
}): Promise<string> => {
  if (!db) {
    const err = new Error("Firestore no está configurado.");
    logError(err, 'createRoom', 'CRITICAL');
    throw err;
  }

  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error("El nombre de la campaña no puede estar vacío.");
  }
  
  try {
    const nameLower = trimmedName.toLowerCase();
    const dupQuery = query(
      collection(db, "rooms"),
      where("nameLower", "==", nameLower),
      limit(1)
    );
    const dupSnap = await withRetry(() => getDocs(dupQuery), { context: 'createRoom_checkDupLower' });
    let isDuplicate = !dupSnap.empty;

    if (!isDuplicate) {
      const exactQuery = query(
        collection(db, "rooms"),
        where("name", "==", trimmedName),
        limit(1)
      );
      const exactSnap = await withRetry(() => getDocs(exactQuery), { context: 'createRoom_checkDupExact' });
      isDuplicate = !exactSnap.empty;
    }

    if (isDuplicate) {
      throw new Error(`Ya existe una campaña llamada "${trimmedName}". Por favor elige un nombre único para evitar confusiones.`);
    }

    const roomRef = doc(collection(db, "rooms"));
    const newRoom: Room = {
      id: roomRef.id,
      name: trimmedName,
      nameLower: trimmedName.toLowerCase(),
      dmId: data.dmId,
      dmName: data.dmName,
      isPublic: data.isPublic,
      hasPassword: Boolean(data.password),
      password: data.password || "",
      allowGuests: data.allowGuests,
      isCombatMode: false,
      initiativeOrder: [],
      currentTurnIndex: 0,
      createdAt: serverTimestamp()
    };

    await withRetry(() => setDoc(roomRef, cleanFirebaseData(newRoom)), { context: 'createRoom_setDoc' });
    roomDmIdCache.set(roomRef.id, data.dmId);

    // Sync metadata to RTDB (/rooms/{roomId}/meta)
    if (rtdb) {
      try {
        await rtdbSet(ref(rtdb, `rooms/${roomRef.id}/meta`), {
          dmId: data.dmId,
          createdAt: Date.now()
        });
      } catch (rtdbErr) {
        console.warn("[createRoom] RTDB meta sync warning:", rtdbErr);
      }
    }

    await addRoomLog(roomRef.id, `Campaña creada por el DM ${data.dmName}.`);
    return roomRef.id;
  } catch (err: any) {
    logError(err, 'createRoom', 'CRITICAL');
    throw err;
  }
};

// 3. Subscribe to Single Room Realtime State (Combines Firestore Metadata + RTDB Combat)
export const subscribeRoom = (roomId: string, callback: (room: Room | null) => void) => {
  if (!roomId) return () => {};
  if (isDemoRoom(roomId)) {
    callback({
      id: roomId,
      name: DEMO_ROOM_NAME,
      dmId: "dm_demo",
      dmName: DEMO_DM_NAME,
      isPublic: false,
      hasPassword: false,
      allowGuests: true,
      isCombatMode: false,
      initiativeOrder: [],
      currentTurnIndex: 0,
      directMessages: DEMO_INITIAL_MESSAGES
    });
    return () => {};
  }
  if (!db) return () => {};

  try {
    let currentFirestoreRoom: Room | null = null;
    let currentCombatData: any = null;
    let rtdbHydrated = false;

    const emitUnifiedRoom = () => {
      if (!currentFirestoreRoom) {
        callback(null);
        return;
      }

      const combat = currentCombatData || {};
      const isCombat = combat.inCombat !== undefined 
        ? combat.inCombat 
        : (combat.isCombatMode !== undefined ? combat.isCombatMode : currentFirestoreRoom.isCombatMode);

      const unifiedRoom: Room = {
        ...currentFirestoreRoom,
        isCombatMode: Boolean(isCombat),
        inCombat: Boolean(isCombat),
        currentTurnIndex: combat.currentTurnIndex !== undefined ? combat.currentTurnIndex : currentFirestoreRoom.currentTurnIndex,
        round: combat.round !== undefined ? combat.round : currentFirestoreRoom.round,
        initiativeOrder: combat.initiativeOrder !== undefined ? combat.initiativeOrder : currentFirestoreRoom.initiativeOrder,
        combatMonsters: combat.combatMonsters !== undefined ? combat.combatMonsters : currentFirestoreRoom.combatMonsters,
        lastTurnEvent: combat.lastTurnEvent !== undefined ? combat.lastTurnEvent : currentFirestoreRoom.lastTurnEvent
      };

      callback(unifiedRoom);
    };

    const roomRef = doc(db, "rooms", roomId);
    const unsubFirestore = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Room;
        currentFirestoreRoom = { ...data, id: snapshot.id };
        roomDmIdCache.set(roomId, currentFirestoreRoom.dmId);

        const activeRtdb = rtdb;

        // Progressive hydration for /rooms/{roomId}/meta/dmId in existing rooms
        if (activeRtdb && auth?.currentUser?.uid === data.dmId && !hydratedRoomMetaSet.has(roomId)) {
          hydratedRoomMetaSet.add(roomId);
          rtdbUpdate(ref(activeRtdb, `rooms/${roomId}/meta`), {
            dmId: data.dmId,
            updatedAt: Date.now()
          }).catch(() => {});
        }

        // Progressive hydration: If RTDB combat node doesn't exist yet but Firestore has combat state
        if (activeRtdb && !rtdbHydrated && currentCombatData === null && data.isCombatMode !== undefined) {
          rtdbHydrated = true;
          rtdbGet(ref(activeRtdb, `rooms/${roomId}/combat`)).then((cSnap) => {
            if (!cSnap.exists()) {
              rtdbSet(ref(activeRtdb, `rooms/${roomId}/combat`), cleanFirebaseData({
                inCombat: Boolean(data.isCombatMode),
                isCombatMode: Boolean(data.isCombatMode),
                currentTurnIndex: data.currentTurnIndex || 0,
                round: (data as any).round || 1,
                initiativeOrder: data.initiativeOrder || [],
                combatMonsters: data.combatMonsters || [],
                lastTurnEvent: data.lastTurnEvent || null
              })).catch(() => {});
            }
          }).catch(() => {});
        }

        emitUnifiedRoom();
      } else {
        currentFirestoreRoom = null;
        emitUnifiedRoom();
      }
    }, (err) => {
      logError(err, 'subscribeRoom', 'WARNING');
      callback(null);
    });

    let unsubRTDB = () => {};
    if (rtdb) {
      const combatRef = ref(rtdb, `rooms/${roomId}/combat`);
      const rtdbCb = (snapshot: any) => {
        currentCombatData = snapshot.val();
        emitUnifiedRoom();
      };
      onValue(combatRef, rtdbCb);
      unsubRTDB = () => off(combatRef, 'value', rtdbCb);
    }

    return () => {
      unsubFirestore();
      unsubRTDB();
    };
  } catch (err) {
    logError(err, 'subscribeRoom', 'WARNING');
    return () => {};
  }
};

// 3.5 Realtime Presence Native Engine with onDisconnect()
export const setupRealtimePresence = (roomId: string, uid: string): () => void => {
  if (!roomId || !uid || isDemoRoom(roomId) || !rtdb) {
    return () => {};
  }

  try {
    const connectedRef = ref(rtdb, '.info/connected');
    const presenceRef = ref(rtdb, `rooms/${roomId}/presence/${uid}`);
    let isSubscribed = true;

    const onConnectedChange = (snap: any) => {
      if (!isSubscribed) return;
      if (snap.val() === true) {
        try {
          onDisconnect(presenceRef).update({
            online: false,
            lastSeen: Date.now()
          });

          rtdbUpdate(presenceRef, {
            online: true,
            lastSeen: Date.now(),
            kicked: false
          });
        } catch (e) {
          console.warn("[setupRealtimePresence] presence update error:", e);
        }
      }
    };

    onValue(connectedRef, onConnectedChange);

    return () => {
      isSubscribed = false;
      off(connectedRef, 'value', onConnectedChange);
      try {
        rtdbUpdate(presenceRef, {
          online: false,
          lastSeen: Date.now()
        });
      } catch (e) {}
    };
  } catch (err) {
    console.warn("[setupRealtimePresence] setup error:", err);
    return () => {};
  }
};

// 4. Subscribe to Room Players (Characters) - Merges Firestore Characters with RTDB Presence
export const subscribeRoomPlayers = (roomId: string, callback: (players: CharacterState[]) => void) => {
  if (!roomId) return () => {};
  if (isDemoRoom(roomId)) {
    callback(getFactoryDemoParty());
    return () => {};
  }
  if (!db) return () => {};

  try {
    let firestorePlayers: CharacterState[] = [];
    let presenceMap: Record<string, { online?: boolean; lastSeen?: number; kicked?: boolean }> = {};

    const emitCombinedPlayers = () => {
      const combined = firestorePlayers.map(p => {
        const presById = presenceMap[p.id];
        const presByOwner = p.ownerId ? presenceMap[p.ownerId] : undefined;
        const kicked = Boolean(presById?.kicked || presByOwner?.kicked || (p as any).kicked);
        const isOnline = kicked
          ? false
          : (presByOwner?.online !== undefined
              ? presByOwner.online
              : (presById?.online !== undefined ? presById.online : undefined));
        const lastSeen = presByOwner?.lastSeen || presById?.lastSeen || p.lastSeen;

        return {
          ...p,
          isOnline,
          online: isOnline,
          lastSeen,
          kicked
        };
      });
      callback(combined);
    };

    const playersRef = collection(db, "rooms", roomId, "players");
    const unsubFirestore = onSnapshot(playersRef, (snapshot) => {
      firestorePlayers = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          roomId: data.roomId || roomId
        };
      }) as CharacterState[];
      emitCombinedPlayers();
    }, (err) => {
      logError(err, 'subscribeRoomPlayers', 'WARNING');
    });

    let unsubRTDB = () => {};
    if (rtdb) {
      const presenceRef = ref(rtdb, `rooms/${roomId}/presence`);
      const presenceCb = (snapshot: any) => {
        presenceMap = snapshot.val() || {};
        emitCombinedPlayers();
      };
      onValue(presenceRef, presenceCb);
      unsubRTDB = () => off(presenceRef, 'value', presenceCb);
    }

    return () => {
      unsubFirestore();
      unsubRTDB();
    };
  } catch (err) {
    logError(err, 'subscribeRoomPlayers', 'WARNING');
    return () => {};
  }
};

export type LogCategory = 'all' | 'combat' | 'currency' | 'rests' | 'features' | 'rolls' | 'settings';

export const getLogCategory = (message: string): { type: LogCategory; icon: string; badgeClass: string; label: string } => {
  const msg = message.toLowerCase();
  if (msg.includes('daño') || msg.includes('hp') || msg.includes('salvación') || msg.includes('moribundo') || msg.includes('fallecido') || msg.includes('revivir') || msg.includes('estabiliz') || msg.includes('turno') || msg.includes('combate') || msg.includes('iniciativa') || msg.includes('⚔️') || msg.includes('🩸') || msg.includes('☠️')) {
    return { type: 'combat', icon: '⚔️', badgeClass: 'bg-red-950/80 text-red-300 border-red-800', label: 'Combate' };
  }
  if (msg.includes('moneda') || msg.includes('gasto') || msg.includes('compr') || msg.includes('oro') || msg.includes('po') || msg.includes('objeto') || msg.includes('inventario') || msg.includes('💰') || msg.includes('🛒') || msg.includes('🎁')) {
    return { type: 'currency', icon: '💰', badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800', label: 'Economía' };
  }
  if (msg.includes('descanso') || msg.includes('recuper') || msg.includes('⛺') || msg.includes('☕')) {
    return { type: 'rests', icon: '⛺', badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-800', label: 'Descanso' };
  }
  if (msg.includes('lanzó') || msg.includes('conjuro') || msg.includes('hechizo') || msg.includes('rasgo') || msg.includes('usó') || msg.includes('habilidad') || msg.includes('📜') || msg.includes('⚡')) {
    return { type: 'features', icon: '📜', badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-800', label: 'Conjuros/Rasgos' };
  }
  if (msg.includes('d20') || msg.includes('dado') || msg.includes('prueba') || msg.includes('🎲')) {
    return { type: 'rolls', icon: '🎲', badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800', label: 'Tirada' };
  }
  return { type: 'settings', icon: '⚙️', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700', label: 'General' };
};

// 5. Subscribe to Room Logs (RTDB first with limit protection, zero Firestore reads)
export const subscribeRoomLogs = (roomId: string, callback: (logs: LogEntry[]) => void) => {
  if (!roomId) return () => {};
  if (isDemoRoom(roomId)) {
    const initialLogs: LogEntry[] = DEMO_INITIAL_LOGS.map((msg, idx) => ({
      id: `demo_log_${idx}`,
      message: msg,
      timestamp: Date.now() - (DEMO_INITIAL_LOGS.length - idx) * 1000
    }));
    callback(initialLogs);
    return () => {};
  }

  // Prefer RTDB (/rooms/{roomId}/logs)
  if (rtdb) {
    try {
      const logsRef = ref(rtdb, `rooms/${roomId}/logs`);
      const logsQuery = rtdbQuery(logsRef, limitToLast(40));
      const onLogsVal = (snapshot: any) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const entries: LogEntry[] = Object.keys(val).map(key => ({
          id: val[key].id || key,
          message: val[key].message,
          timestamp: val[key].timestamp
        }));

        // Keep active keys sorted by timestamp ascending for direct in-memory pruning
        const sortedAsc = Object.keys(val).map(key => ({
          key,
          timestamp: val[key].timestamp || 0
        })).sort((a, b) => a.timestamp - b.timestamp);
        roomActiveLogKeys.set(roomId, sortedAsc);

        entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(entries);
      };
      onValue(logsQuery, onLogsVal);
      return () => off(logsQuery, 'value', onLogsVal);
    } catch (rtdbErr) {
      console.warn("[subscribeRoomLogs] RTDB error, falling back to Firestore:", rtdbErr);
    }
  }

  // Fallback to Firestore if RTDB is unavailable
  if (!db) return () => {};
  try {
    const logsRef = collection(db, "rooms", roomId, "logs");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(35));
    
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as LogEntry[];
      callback(logs);
    }, (_err) => {
      const qSimple = query(logsRef, limit(35));
      return onSnapshot(qSimple, (snapshot) => {
        const logs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as LogEntry[];
        logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(logs);
      });
    });
  } catch (err) {
    logError(err, 'subscribeRoomLogs', 'INFO');
    return () => {};
  }
};

// 6. Save/Update Player Character in Room (Rate-limited + Deduplicated + Denormalized dmId)
const lastSavedDataMap = new Map<string, string>();
const pendingWriteTimers = new Map<string, NodeJS.Timeout>();

export const savePlayerInRoom = async (roomId: string, character: CharacterState, forceWrite: boolean = false) => {
  if (!roomId || !character || !character.id) return;
  
  if (isDemoRoom(roomId) || isDemoCharacter(character)) return;
  if (!db) return;

  if (character.roomId && character.roomId !== roomId) {
    console.warn(`[savePlayerInRoom] Blocked cross-room leak: "${character.name}" (assigned to ${character.roomId}) cannot be saved into "${roomId}".`);
    return;
  }

  const currentUser = auth?.currentUser;
  const denormalizedDmId = (character as any).dmId || roomDmIdCache.get(roomId);

  const characterToSave: CharacterState & { dmId?: string } = {
    ...character,
    roomId: roomId,
    ownerId: character.ownerId || currentUser?.uid,
    ownerName: character.ownerName || currentUser?.displayName || currentUser?.email || (currentUser?.isAnonymous ? 'Invitado' : 'Jugador'),
    ...(denormalizedDmId ? { dmId: denormalizedDmId } : {})
  };

  const writeKey = `${roomId}_${character.id}`;

  if (forceWrite && pendingWriteTimers.has(writeKey)) {
    clearTimeout(pendingWriteTimers.get(writeKey)!);
    pendingWriteTimers.delete(writeKey);
  }
  
  if (!forceWrite && isWriteRateLimited(writeKey)) {
    saveOfflineCharacterBackup(characterToSave);
    syncAllLocalPlayersToStorage([characterToSave]);

    if (pendingWriteTimers.has(writeKey)) {
      clearTimeout(pendingWriteTimers.get(writeKey)!);
    }
    const timer = setTimeout(() => {
      pendingWriteTimers.delete(writeKey);
      savePlayerInRoom(roomId, characterToSave, true);
    }, 1600);
    pendingWriteTimers.set(writeKey, timer);
    return;
  }

  const { lastSeen: _ls, ...meaningfulData } = characterToSave;
  const dataString = JSON.stringify(cleanFirebaseData(meaningfulData));
  const previousDataString = lastSavedDataMap.get(writeKey);
  
  if (!forceWrite && previousDataString === dataString) {
    return;
  }

  lastWriteTimeMap.set(writeKey, Date.now());
  lastSavedDataMap.set(writeKey, dataString);

  try {
    const playerRef = doc(db, "rooms", roomId, "players", character.id);
    useStore.getState().setSyncState?.('saving');
    await withRetry(
      () => setDoc(playerRef, cleanFirebaseData(characterToSave), { merge: true }),
      { context: 'savePlayerInRoom' }
    );
    useStore.getState().setSyncState?.('synced');
    saveOfflineCharacterBackup(characterToSave);
    syncAllLocalPlayersToStorage([characterToSave]);
    invalidateUserCharactersCache(characterToSave.ownerId);
  } catch (err: any) {
    useStore.getState().setSyncState?.('offline');
    logError(err, 'savePlayerInRoom', 'CRITICAL');
    saveOfflineCharacterBackup(characterToSave);
    syncAllLocalPlayersToStorage([characterToSave]);
  }
};

// 6.1 Batch Update Multiple Players in Room (Single Firestore writeBatch commit)
export async function batchUpdatePlayersInRoom(
  roomId: string,
  updates: Array<{ id: string; fields: Partial<CharacterState> }>
): Promise<void> {
  if (!roomId || isDemoRoom(roomId) || !db || updates.length === 0) return;

  try {
    const batch = writeBatch(db);
    const denormalizedDmId = roomDmIdCache.get(roomId);

    for (const update of updates) {
      if (!update.id || isDemoCharacterId(update.id)) continue;
      const playerRef = doc(db, "rooms", roomId, "players", update.id);
      const cleaned = cleanFirebaseData({
        ...update.fields,
        ...(denormalizedDmId ? { dmId: denormalizedDmId } : {}),
        lastSeen: Date.now()
      });
      batch.update(playerRef, cleaned);
    }

    useStore.getState().setSyncState?.('saving');
    await withRetry(() => batch.commit(), { context: 'batchUpdatePlayersInRoom' });
    useStore.getState().setSyncState?.('synced');
  } catch (err: any) {
    logError(err, 'batchUpdatePlayersInRoom', 'WARNING');
    useStore.getState().setSyncState?.('offline');
  }
}

// 6.2 Update specific character fields in room (Granular field updates)
export const updatePlayerFieldsInRoom = async (
  roomId: string,
  playerId: string,
  fields: Partial<CharacterState>
): Promise<void> => {
  if (!roomId || !playerId || isDemoRoom(roomId) || isDemoCharacterId(playerId) || !db) return;

  const denormalizedDmId = roomDmIdCache.get(roomId);
  const playerRef = doc(db, "rooms", roomId, "players", playerId);

  const cleanedFields = cleanFirebaseData({
    ...fields,
    ...(denormalizedDmId ? { dmId: denormalizedDmId } : {}),
    lastSeen: Date.now()
  });

  useStore.getState().setSyncState?.('saving');

  try {
    await withRetry(
      () => updateDoc(playerRef, cleanedFields),
      { context: 'updatePlayerFieldsInRoom', maxRetries: 2 }
    );
    useStore.getState().setSyncState?.('synced');
  } catch (err: any) {
    logError(err, 'updatePlayerFieldsInRoom', 'WARNING');
    useStore.getState().setSyncState?.('offline');
  }
};

// 6.3 Lightweight presence tracking with RTDB
export const updatePlayerPresence = async (roomId: string, playerId: string, isOnline: boolean) => {
  if (!roomId || !playerId || isDemoRoom(roomId) || isDemoCharacterId(playerId)) return;
  
  if (rtdb) {
    try {
      const now = Date.now();
      const presenceRef = ref(rtdb, `rooms/${roomId}/presence/${playerId}`);
      await rtdbUpdate(presenceRef, { online: isOnline, lastSeen: now });
      const currentUid = auth?.currentUser?.uid;
      if (currentUid && currentUid !== playerId) {
        await rtdbUpdate(ref(rtdb, `rooms/${roomId}/presence/${currentUid}`), { online: isOnline, lastSeen: now });
      }
      return;
    } catch (e) {}
  }

  // Fallback to Firestore if RTDB is unavailable
  if (!db) return;
  try {
    const playerRef = doc(db, "rooms", roomId, "players", playerId);
    await withRetry(
      () => updateDoc(playerRef, { isOnline, lastSeen: Date.now() }),
      { context: 'updatePlayerPresence', maxRetries: 1 }
    );
  } catch (err) {}
};

// 6.4 Delete Player Character from Campaign Room (Permanent deletion + cache invalidation)
export const deletePlayerFromRoom = async (roomId: string, playerId: string) => {
  if (!roomId || !playerId || isDemoRoom(roomId) || isDemoCharacterId(playerId)) return;
  
  if (rtdb) {
    try {
      await rtdbRemove(ref(rtdb, `rooms/${roomId}/presence/${playerId}`));
    } catch (e) {}
  }

  if (!db) return;
  const playerRef = doc(db, "rooms", roomId, "players", playerId);

  try {
    await withRetry(
      () => deleteDoc(playerRef),
      { context: 'deletePlayerFromRoom' }
    );
    invalidateUserCharactersCache();
  } catch (err: any) {
    logError(err, 'deletePlayerFromRoom', 'WARNING');
  }
};

// 6.5 Memory cache for User Characters Across Rooms (5-minute TTL)
const userCharactersCache = new Map<string, { data: CharacterState[]; timestamp: number }>();
const USER_CHARS_CACHE_TTL_MS = 5 * 60 * 1000;

export const invalidateUserCharactersCache = (uid?: string) => {
  if (uid) {
    userCharactersCache.delete(uid);
  } else {
    userCharactersCache.clear();
  }
};

export const fetchUserCharactersAcrossRooms = async (
  userId: string, 
  roomIds: string[] = [], 
  forceRefresh: boolean = false
): Promise<CharacterState[]> => {
  if (!db || !userId) return [];

  const now = Date.now();
  if (!forceRefresh) {
    const cached = userCharactersCache.get(userId);
    if (cached && (now - cached.timestamp < USER_CHARS_CACHE_TTL_MS)) {
      return cached.data;
    }
  }

  const seenMap = new Map<string, CharacterState>();

  try {
    const cgQuery = query(
      collectionGroup(db, "players"),
      where("ownerId", "==", userId)
    );
    const snap = await withRetry(
      () => getDocs(cgQuery),
      { context: 'fetchUserCharactersAcrossRooms_collectionGroup', maxRetries: 1 }
    );

    snap.forEach(docSnap => {
      const data = docSnap.data() as CharacterState;
      const parentRoomId = data?.roomId || docSnap.ref.parent.parent?.id || "";
      if (!parentRoomId || isDemoRoom(parentRoomId) || isDemoCharacterId(docSnap.id) || (data as any)?.kicked) {
        return;
      }
      const dedupeKey = `${parentRoomId}_${docSnap.id}`;
      if (!seenMap.has(dedupeKey)) {
        seenMap.set(dedupeKey, {
          ...data,
          id: docSnap.id,
          roomId: parentRoomId
        });
      }
    });

    const results = Array.from(seenMap.values());
    userCharactersCache.set(userId, { data: results, timestamp: now });
    return results;
  } catch (cgErr: any) {
    logError(cgErr, 'fetchUserCharactersAcrossRooms_collectionGroup_fallback', 'WARNING');

    if (roomIds && roomIds.length > 0) {
      const validRoomIds = roomIds.filter(rid => rid && !isDemoRoom(rid));
      try {
        const results = await Promise.all(
          validRoomIds.map(async (rid) => {
            try {
              const q = query(
                collection(db!, "rooms", rid, "players"),
                where("ownerId", "==", userId)
              );
              const snap = await withRetry(
                () => getDocs(q),
                { context: `fetchUserCharactersAcrossRooms_fallback_${rid}`, maxRetries: 1 }
              );
              const chars: CharacterState[] = [];
              snap.forEach(docSnap => {
                const data = docSnap.data() as CharacterState;
                if (data && !(data as any).kicked && !isDemoCharacterId(docSnap.id)) {
                  chars.push({
                    ...data,
                    id: docSnap.id,
                    roomId: data.roomId || rid
                  });
                }
              });
              return chars;
            } catch (err) {
              logError(err, `fetchUserCharactersAcrossRooms_fallback_${rid}`, 'WARNING');
              return [];
            }
          })
        );
        const flattened = results.flat();
        userCharactersCache.set(userId, { data: flattened, timestamp: now });
        return flattened;
      } catch (err) {
        logError(err, 'fetchUserCharactersAcrossRooms_parallel_fallback', 'WARNING');
      }
    }

    return [];
  }
};

// 7. Kick Player from Campaign (DM Only: Instant RTDB notification + Physical Firestore deleteDoc)
export const kickPlayerFromRoom = async (roomId: string, playerId: string, playerName?: string) => {
  if (!roomId || !playerId || isDemoRoom(roomId) || isDemoCharacterId(playerId)) return;
  
  if (rtdb) {
    try {
      await rtdbUpdate(ref(rtdb, `rooms/${roomId}/presence/${playerId}`), { kicked: true, online: false });
    } catch (e) {}
  }

  if (!db) return;
  try {
    const playerRef = doc(db, "rooms", roomId, "players", playerId);
    await withRetry(
      () => deleteDoc(playerRef),
      { context: 'kickPlayerFromRoom_deleteDoc' }
    );
    invalidateUserCharactersCache();
    if (playerName) {
      await addRoomLog(roomId, `El DM ha retirado a ${playerName} de la campaña.`);
    }
  } catch (err: any) {
    logError(err, 'kickPlayerFromRoom', 'WARNING');
  }
};

// 8. Update Room/Campaign Settings (DM Only)
export const updateCampaignDetails = async (roomId: string, updates: Partial<Room>) => {
  if (!roomId || isDemoRoom(roomId) || !db) return;
  try {
    if (updates.name) {
      updates.nameLower = updates.name.trim().toLowerCase();
    }
    const roomRef = doc(db, "rooms", roomId);
    await withRetry(
      () => updateDoc(roomRef, cleanFirebaseData(updates)),
      { context: 'updateCampaignDetails' }
    );
    await addRoomLog(roomId, `El DM actualizó los ajustes de la campaña.`);
  } catch (err: any) {
    logError(err, 'updateCampaignDetails', 'WARNING');
  }
};

// 9. Update Room State (Separates RTDB Combat State from Firestore Metadata)
export const updateRoomState = async (roomId: string, updates: Partial<Room> & { inCombat?: boolean; round?: number }) => {
  if (!roomId || isDemoRoom(roomId)) return;

  const { 
    isCombatMode, inCombat, currentTurnIndex, round, combatMonsters, lastTurnEvent, initiativeOrder, 
    ...firestoreMetadata 
  } = updates as any;

  const combatUpdates: Record<string, any> = {};
  if (isCombatMode !== undefined) combatUpdates.isCombatMode = isCombatMode;
  if (inCombat !== undefined) {
    combatUpdates.inCombat = inCombat;
    if (combatUpdates.isCombatMode === undefined) combatUpdates.isCombatMode = inCombat;
  }
  if (currentTurnIndex !== undefined) combatUpdates.currentTurnIndex = currentTurnIndex;
  if (round !== undefined) combatUpdates.round = round;
  if (combatMonsters !== undefined) combatUpdates.combatMonsters = combatMonsters;
  if (lastTurnEvent !== undefined) combatUpdates.lastTurnEvent = lastTurnEvent;
  if (initiativeOrder !== undefined) combatUpdates.initiativeOrder = initiativeOrder;

  // Persist combat in RTDB
  if (rtdb && Object.keys(combatUpdates).length > 0) {
    try {
      await rtdbUpdate(ref(rtdb, `rooms/${roomId}/combat`), cleanFirebaseData(combatUpdates));
    } catch (rtdbErr) {
      console.warn("[updateRoomState] RTDB combat update failed:", rtdbErr);
    }
  }

  // Persist metadata in Firestore
  if (db && Object.keys(firestoreMetadata).length > 0) {
    try {
      const roomRef = doc(db, "rooms", roomId);
      await withRetry(
        () => updateDoc(roomRef, cleanFirebaseData(firestoreMetadata)),
        { context: 'updateRoomState_firestore' }
      );
    } catch (err: any) {
      logError(err, 'updateRoomState_firestore', 'WARNING');
    }
  }

  // Fallback: If RTDB was unavailable, write combat updates to Firestore
  if (!rtdb && db && Object.keys(combatUpdates).length > 0) {
    try {
      const roomRef = doc(db, "rooms", roomId);
      await withRetry(
        () => updateDoc(roomRef, cleanFirebaseData(combatUpdates)),
        { context: 'updateRoomState_combatFallback' }
      );
    } catch (err) {}
  }
};

// 9.5 Atomic Turn Advance via RTDB runTransaction (Zero Firestore Reads/Writes)
export const advanceRoomTurnAtomic = async (
  roomId: string,
  event: { id: string; timestamp: number },
  fallbackNextIndex?: number
): Promise<number> => {
  if (!roomId || isDemoRoom(roomId)) {
    return fallbackNextIndex ?? 0;
  }

  if (rtdb) {
    try {
      const combatRef = ref(rtdb, `rooms/${roomId}/combat`);
      let calculatedIndex = fallbackNextIndex ?? 0;

      await rtdbRunTransaction(combatRef, (currentCombat) => {
        const combat = currentCombat || {};
        const order = combat.initiativeOrder || [];
        const curIdx = combat.currentTurnIndex || 0;
        calculatedIndex = order.length > 0 ? (curIdx + 1) % order.length : 0;
        return {
          ...combat,
          currentTurnIndex: calculatedIndex,
          lastTurnEvent: event
        };
      });

      return calculatedIndex;
    } catch (err) {
      console.warn("[advanceRoomTurnAtomic] RTDB transaction failed, using fallback:", err);
    }
  }

  // Fallback to Firestore transaction
  if (!db) return fallbackNextIndex ?? 0;
  return await withRetry(async () => {
    return await runTransaction(db!, async (tx) => {
      const roomRef = doc(db!, "rooms", roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) {
        throw new Error(`La sala ${roomId} no existe.`);
      }
      const data = roomSnap.data() as Room;
      const order = data.initiativeOrder || [];
      const nextIdx = order.length > 0 ? ((data.currentTurnIndex || 0) + 1) % order.length : 0;

      tx.update(roomRef, {
        currentTurnIndex: nextIdx,
        lastTurnEvent: cleanFirebaseData(event)
      });

      return nextIdx;
    });
  }, { context: 'advanceRoomTurnAtomic_firestoreFallback' });
};

// 10. Add Action Log to Room (RTDB with pruning, zero Firestore writes)
const lastLogTimeMap = new Map<string, { message: string; timestamp: number }>();
const MIN_LOG_INTERVAL_MS = 600;

export const addRoomLog = async (
  roomId: string, 
  messageOrEntry: string | Omit<RoomLogEntry, 'id' | 'timestamp'>
) => {
  if (!roomId || isDemoRoom(roomId)) return;

  const message = typeof messageOrEntry === 'string' ? messageOrEntry : messageOrEntry.message;
  const now = Date.now();
  const lastLog = lastLogTimeMap.get(roomId);
  if (lastLog) {
    if (lastLog.message === message && (now - lastLog.timestamp < 1000)) {
      return;
    }
    if (now - lastLog.timestamp < MIN_LOG_INTERVAL_MS) {
      return;
    }
  }
  lastLogTimeMap.set(roomId, { message, timestamp: now });

  if (rtdb) {
    try {
      const activeRtdb = rtdb;
      const logsRef = ref(activeRtdb, `rooms/${roomId}/logs`);
      const newLogRef = rtdbPush(logsRef);
      const logKey = newLogRef.key || (Date.now().toString() + Math.random().toString());
      const entry: RoomLogEntry = {
        id: logKey,
        message,
        timestamp: Date.now()
      };
      await rtdbSet(newLogRef, entry);

      // Increment insert counter for the room
      const curCount = (roomLogInsertCounter.get(roomId) || 0) + 1;
      roomLogInsertCounter.set(roomId, curCount);

      // In-memory zero-download pruning
      const activeKeys = roomActiveLogKeys.get(roomId);
      if (activeKeys) {
        activeKeys.push({ key: logKey, timestamp: entry.timestamp });
        if (activeKeys.length > 45) {
          const excess = activeKeys.length - 40;
          const toRemove = activeKeys.splice(0, excess);
          for (const item of toRemove) {
            rtdbRemove(ref(activeRtdb, `rooms/${roomId}/logs/${item.key}`)).catch(() => {});
          }
        }
      } else if (curCount % 10 === 0) {
        // Fallback pruning only every 10 inserts if roomActiveLogKeys is not populated
        const countSnap = await rtdbGet(rtdbQuery(logsRef, limitToLast(60)));
        if (countSnap.exists()) {
          const val = countSnap.val();
          const keys = Object.keys(val);
          if (keys.length > 45) {
            const sorted = keys.map(k => ({ key: k, timestamp: val[k].timestamp || 0 }))
              .sort((a, b) => a.timestamp - b.timestamp);
            const excess = keys.length - 40;
            for (let i = 0; i < excess; i++) {
              rtdbRemove(ref(activeRtdb, `rooms/${roomId}/logs/${sorted[i].key}`)).catch(() => {});
            }
          }
        }
      }
      return;
    } catch (rtdbErr) {
      console.warn("[addRoomLog] RTDB push failed, fallback to Firestore:", rtdbErr);
    }
  }

  // Fallback to Firestore
  if (!db) return;
  try {
    await withRetry(async () => {
      const logsRef = collection(db!, "rooms", roomId, "logs");
      await addDoc(logsRef, {
        id: Date.now().toString() + Math.random(),
        message,
        timestamp: Date.now()
      });
    }, { context: 'addRoomLog' });
  } catch (err: any) {
    logError(err, 'addRoomLog', 'INFO');
  }
};

// 10.2 Clear Room Logs
export const clearRoomLogs = async (roomId: string) => {
  if (!roomId || isDemoRoom(roomId)) return;
  if (rtdb) {
    try {
      await rtdbRemove(ref(rtdb, `rooms/${roomId}/logs`));
      return;
    } catch (e) {
      console.warn("[clearRoomLogs] RTDB remove error, fallback to firestore:", e);
    }
  }
  if (!db) return;
  try {
    const logsRef = collection(db, "rooms", roomId, "logs");
    const snap = await getDocs(query(logsRef, limit(100)));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    logError(err, 'clearRoomLogs', 'WARNING');
  }
};

// 10.5 Subscribe to Room Whispers (RTDB /rooms/{roomId}/whispers/{playerUid})
export function subscribeRoomWhispers(
  roomId: string,
  optionsOrUid: { isDM?: boolean; senderUid?: string; characterId?: string } | string,
  callbackOrIsDM?: ((messages: DirectMessage[]) => void) | boolean,
  callbackArg?: (whispers: DirectMessage[]) => void
): () => void {
  if (!roomId) {
    if (typeof callbackOrIsDM === 'function') callbackOrIsDM([]);
    if (typeof callbackArg === 'function') callbackArg([]);
    return () => {};
  }

  let isDM = false;
  let uid = '';
  let characterId: string | undefined;
  let callback: (messages: DirectMessage[]) => void = () => {};

  if (typeof optionsOrUid === 'string') {
    uid = optionsOrUid;
    isDM = Boolean(callbackOrIsDM);
    callback = callbackArg || (() => {});
  } else {
    isDM = Boolean(optionsOrUid?.isDM);
    uid = optionsOrUid?.senderUid || auth?.currentUser?.uid || '';
    characterId = optionsOrUid?.characterId;
    callback = (callbackOrIsDM as (messages: DirectMessage[]) => void) || (() => {});
  }

  if (isDemoRoom(roomId)) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dnd_demo_direct_messages');
      if (stored) {
        try {
          let msgs: DirectMessage[] = JSON.parse(stored);
          if (!isDM && characterId) {
            msgs = msgs.filter(m => 
              m.senderId === characterId || 
              m.recipientCharacterId === characterId ||
              (m.isFromDM && (m.characterName === characterId || m.recipientCharacterId === characterId))
            );
          }
          msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          callback(msgs);
          return () => {};
        } catch (e) {}
      }
    }
    callback(DEMO_INITIAL_MESSAGES);
    return () => {};
  }

  // Subscribe using RTDB
  if (rtdb) {
    try {
      if (isDM) {
        // DM listens to all whisper threads under /rooms/{roomId}/whispers
        const whispersRef = ref(rtdb, `rooms/${roomId}/whispers`);
        const cb = (snapshot: any) => {
          const val = snapshot.val();
          const msgs: DirectMessage[] = [];
          if (val) {
            Object.entries(val).forEach(([pUid, thread]: [string, any]) => {
              if (thread && typeof thread === 'object') {
                Object.values(thread).forEach((m: any) => {
                  if (m && m.id) {
                    const playerUid = m.playerUid || pUid;
                    whisperMsgThreadMap.set(`${roomId}_${m.id}`, playerUid);
                    msgs.push({ ...m, playerUid } as DirectMessage);
                  }
                });
              }
            });
          }
          msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          callback(msgs);
        };
        onValue(whispersRef, cb);
        return () => off(whispersRef, 'value', cb);
      } else {
        // Player listens only to their thread (/rooms/{roomId}/whispers/{uid})
        if (!uid) {
          callback([]);
          return () => {};
        }
        const threadRef = ref(rtdb, `rooms/${roomId}/whispers/${uid}`);
        const cb = (snapshot: any) => {
          const val = snapshot.val();
          let msgs: DirectMessage[] = [];
          if (val) {
            Object.values(val).forEach((m: any) => {
              if (m && m.id) {
                const playerUid = m.playerUid || uid;
                whisperMsgThreadMap.set(`${roomId}_${m.id}`, playerUid);
                msgs.push({ ...m, playerUid } as DirectMessage);
              }
            });
          }
          if (characterId) {
            msgs = msgs.filter(m => 
              m.senderId === characterId || 
              m.recipientCharacterId === characterId ||
              (m.isFromDM && (m.characterName === characterId || m.recipientCharacterId === characterId))
            );
          }
          msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          callback(msgs);
        };
        onValue(threadRef, cb);
        return () => off(threadRef, 'value', cb);
      }
    } catch (e) {
      console.warn("[subscribeRoomWhispers] RTDB listener error, falling back to Firestore:", e);
    }
  }

  // Fallback to Firestore
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const whispersRef = collection(db, "rooms", roomId, "whispers");

    if (isDM) {
      return onSnapshot(whispersRef, (snapshot) => {
        const msgs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as DirectMessage[];
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        callback(msgs);
      }, (err) => {
        logError(err, 'subscribeRoomWhispers (DM)', 'WARNING');
        callback([]);
      });
    } else {
      if (!uid) {
        callback([]);
        return () => {};
      }

      const msgsMap = new Map<string, DirectMessage>();

      const emitCombined = () => {
        let allMsgs = Array.from(msgsMap.values());
        if (characterId) {
          allMsgs = allMsgs.filter(m => 
            m.senderId === characterId || 
            m.recipientCharacterId === characterId ||
            (m.isFromDM && (m.characterName === characterId || m.recipientCharacterId === characterId))
          );
        }
        allMsgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        callback(allMsgs);
      };

      const qSender = query(whispersRef, where("senderUid", "==", uid));
      const qPlayer = query(whispersRef, where("playerUid", "==", uid));

      const unsubSender = onSnapshot(qSender, (snapshot) => {
        snapshot.docs.forEach(d => {
          msgsMap.set(d.id, { id: d.id, ...d.data() } as DirectMessage);
        });
        const currentIds = new Set(snapshot.docs.map(d => d.id));
        for (const [id, msg] of msgsMap.entries()) {
          if (msg.senderUid === uid && !currentIds.has(id)) {
            msgsMap.delete(id);
          }
        }
        emitCombined();
      }, (err) => {
        logError(err, 'subscribeRoomWhispers (qSender)', 'WARNING');
      });

      const unsubPlayer = onSnapshot(qPlayer, (snapshot) => {
        snapshot.docs.forEach(d => {
          msgsMap.set(d.id, { id: d.id, ...d.data() } as DirectMessage);
        });
        const currentIds = new Set(snapshot.docs.map(d => d.id));
        for (const [id, msg] of msgsMap.entries()) {
          if (msg.playerUid === uid && !currentIds.has(id)) {
            msgsMap.delete(id);
          }
        }
        emitCombined();
      }, (err) => {
        logError(err, 'subscribeRoomWhispers (qPlayer)', 'WARNING');
      });

      return () => {
        unsubSender();
        unsubPlayer();
      };
    }
  } catch (err) {
    logError(err, 'subscribeRoomWhispers', 'WARNING');
    callback([]);
    return () => {};
  }
}

// 11. Direct Messages to DM (RTDB whispers thread with auto-pruning to 15 messages)
export const sendDirectMessageToDM = async (roomId: string, message: Omit<DirectMessage, 'id' | 'timestamp'>) => {
  if (!roomId) return;

  if (isDemoRoom(roomId)) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dnd_demo_direct_messages');
      const currentMsgs: DirectMessage[] = stored ? JSON.parse(stored) : [...DEMO_INITIAL_MESSAGES];
      const newMsg: DirectMessage = {
        ...message,
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        isFromDM: false,
        timestamp: Date.now(),
        read: false
      };
      const userMsgs = currentMsgs.filter(m => m.senderId === message.senderId);
      let filteredCurrentMsgs = currentMsgs;

      if (userMsgs.length >= 5) {
        const sortedUserMsgs = [...userMsgs].sort((a, b) => a.timestamp - b.timestamp);
        const excessCount = userMsgs.length - 4;
        const msgsToRemove = sortedUserMsgs.slice(0, excessCount);
        const removeIds = new Set(msgsToRemove.map(m => m.id));
        filteredCurrentMsgs = currentMsgs.filter(m => !removeIds.has(m.id));
      }

      const updated = [...filteredCurrentMsgs, newMsg];
      localStorage.setItem('dnd_demo_direct_messages', JSON.stringify(updated));
    }
    return;
  }

  const senderUid = auth?.currentUser?.uid || message.senderUid || message.senderId;
  const playerUid = auth?.currentUser?.uid || message.playerUid || message.senderUid || message.senderId;
  const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  const newMsg: DirectMessage = {
    ...message,
    id: msgId,
    senderUid,
    playerUid,
    isFromDM: false,
    timestamp: Date.now(),
    read: false
  };

  // Persist to RTDB (/rooms/{roomId}/whispers/{playerUid})
  if (rtdb) {
    try {
      const threadRef = ref(rtdb, `rooms/${roomId}/whispers/${playerUid}`);
      const newMsgRef = ref(rtdb, `rooms/${roomId}/whispers/${playerUid}/${msgId}`);
      await rtdbSet(newMsgRef, cleanFirebaseData(newMsg));

      // Prune if thread > 15 messages in RTDB
      const snap = await rtdbGet(threadRef);
      if (snap.exists()) {
        const msgsObj = snap.val();
        const keys = Object.keys(msgsObj);
        if (keys.length > 15) {
          const sorted = keys.map(k => ({ key: k, timestamp: msgsObj[k].timestamp || 0 }))
            .sort((a, b) => a.timestamp - b.timestamp);
          const excess = keys.length - 15;
          for (let i = 0; i < excess; i++) {
            rtdbRemove(ref(rtdb, `rooms/${roomId}/whispers/${playerUid}/${sorted[i].key}`)).catch(() => {});
          }
        }
      }
      return;
    } catch (e) {
      console.warn("[sendDirectMessageToDM] RTDB push failed, falling back to Firestore:", e);
    }
  }

  // Fallback to Firestore
  if (!db) return;
  try {
    await withRetry(async () => {
      const whispersRef = collection(db!, "rooms", roomId, "whispers");
      const q = query(whispersRef, where("senderUid", "==", senderUid));
      const snap = await getDocs(q);
      const existingMsgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as DirectMessage))
        .filter(m => m.senderId === message.senderId || (m.characterName && m.characterName === message.characterName));

      const batch = writeBatch(db!);
      const whisperRef = doc(db!, "rooms", roomId, "whispers", msgId);
      batch.set(whisperRef, cleanFirebaseData(newMsg));

      if (existingMsgs.length >= 5) {
        const sortedExisting = [...existingMsgs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const excessCount = existingMsgs.length - 4;
        const toDelete = sortedExisting.slice(0, excessCount);
        for (const oldMsg of toDelete) {
          batch.delete(doc(db!, "rooms", roomId, "whispers", oldMsg.id));
        }
      }

      await batch.commit();
    }, { context: 'sendDirectMessageToDM' });
  } catch (err: any) {
    logError(err, 'sendDirectMessageToDM', 'WARNING');
  }
};

// 11.2 DM Whisper Reply to Player (RTDB whispers thread with auto-pruning to 15 messages)
export const sendWhisperFromDM = async (
  roomId: string,
  whisper: {
    recipientCharacterId: string;
    recipientCharacterName: string;
    playerUid?: string;
    content: string;
  }
) => {
  if (!roomId) return;

  const playerUid = whisper.playerUid || whisper.recipientCharacterId;
  const msgId = 'whisper_dm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const newMsg: DirectMessage = {
    id: msgId,
    senderId: 'dm',
    senderUid: auth?.currentUser?.uid || 'dm',
    playerUid: playerUid,
    senderName: 'Dungeon Master',
    characterName: whisper.recipientCharacterName,
    recipientCharacterId: whisper.recipientCharacterId,
    recipientCharacterName: whisper.recipientCharacterName,
    content: whisper.content.trim(),
    isFromDM: true,
    timestamp: Date.now(),
    read: false
  };

  if (isDemoRoom(roomId)) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dnd_demo_direct_messages');
      const msgs: DirectMessage[] = stored ? JSON.parse(stored) : [...DEMO_INITIAL_MESSAGES];
      msgs.push(newMsg);
      localStorage.setItem('dnd_demo_direct_messages', JSON.stringify(msgs));
    }
    return;
  }

  // Persist to RTDB (/rooms/{roomId}/whispers/{playerUid})
  if (rtdb) {
    try {
      const threadRef = ref(rtdb, `rooms/${roomId}/whispers/${playerUid}`);
      const msgRef = ref(rtdb, `rooms/${roomId}/whispers/${playerUid}/${msgId}`);
      await rtdbSet(msgRef, cleanFirebaseData(newMsg));

      // Prune if thread > 15 messages in RTDB
      const snap = await rtdbGet(threadRef);
      if (snap.exists()) {
        const msgsObj = snap.val();
        const keys = Object.keys(msgsObj);
        if (keys.length > 15) {
          const sorted = keys.map(k => ({ key: k, timestamp: msgsObj[k].timestamp || 0 }))
            .sort((a, b) => a.timestamp - b.timestamp);
          const excess = keys.length - 15;
          for (let i = 0; i < excess; i++) {
            rtdbRemove(ref(rtdb, `rooms/${roomId}/whispers/${playerUid}/${sorted[i].key}`)).catch(() => {});
          }
        }
      }
      return;
    } catch (e) {
      console.warn("[sendWhisperFromDM] RTDB write failed, falling back to Firestore:", e);
    }
  }

  // Fallback to Firestore
  if (!db) return;
  try {
    await withRetry(async () => {
      const whisperRef = doc(db!, "rooms", roomId, "whispers", msgId);
      await setDoc(whisperRef, cleanFirebaseData(newMsg));
    }, { context: 'sendWhisperFromDM' });
  } catch (err: any) {
    logError(err, 'sendWhisperFromDM', 'WARNING');
  }
};

export const deleteDirectMessage = async (roomId: string, messageId: string, playerUid?: string) => {
  if (!roomId || !messageId) return;

  if (isDemoRoom(roomId)) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dnd_demo_direct_messages');
      const msgs: DirectMessage[] = stored ? JSON.parse(stored) : [...DEMO_INITIAL_MESSAGES];
      const updated = msgs.filter(m => m.id !== messageId);
      localStorage.setItem('dnd_demo_direct_messages', JSON.stringify(updated));
    }
    return;
  }

  if (rtdb) {
    try {
      const targetUid = playerUid || whisperMsgThreadMap.get(`${roomId}_${messageId}`) || auth?.currentUser?.uid;
      if (targetUid) {
        await rtdbRemove(ref(rtdb, `rooms/${roomId}/whispers/${targetUid}/${messageId}`));
      }
      return;
    } catch (e) {
      console.warn("[deleteDirectMessage] RTDB remove error, fallback:", e);
    }
  }

  if (!db) return;
  try {
    const whisperRef = doc(db, "rooms", roomId, "whispers", messageId);
    await withRetry(
      () => deleteDoc(whisperRef),
      { context: 'deleteDirectMessage' }
    );
  } catch (err: any) {
    logError(err, 'deleteDirectMessage', 'WARNING');
  }
};

export const markDirectMessageAsRead = async (roomId: string, messageId: string, playerUid?: string) => {
  if (!roomId || !messageId) return;

  if (isDemoRoom(roomId)) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dnd_demo_direct_messages');
      const msgs: DirectMessage[] = stored ? JSON.parse(stored) : [...DEMO_INITIAL_MESSAGES];
      const updated = msgs.map(m => m.id === messageId ? { ...m, read: true } : m);
      localStorage.setItem('dnd_demo_direct_messages', JSON.stringify(updated));
    }
    return;
  }

  if (rtdb) {
    try {
      const targetUid = playerUid || whisperMsgThreadMap.get(`${roomId}_${messageId}`) || auth?.currentUser?.uid;
      if (targetUid) {
        await rtdbUpdate(ref(rtdb, `rooms/${roomId}/whispers/${targetUid}/${messageId}`), { read: true });
        return;
      }
    } catch (e) {
      console.warn("[markDirectMessageAsRead] RTDB error, fallback:", e);
    }
  }

  if (!db) return;
  try {
    const whisperRef = doc(db, "rooms", roomId, "whispers", messageId);
    await withRetry(
      () => updateDoc(whisperRef, { read: true }),
      { context: 'markDirectMessageAsRead' }
    );
  } catch (err: any) {
    logError(err, 'markDirectMessageAsRead', 'WARNING');
  }
};

export const markAllDirectMessagesAsRead = async (roomId: string, senderFilter?: string, playerUid?: string) => {
  if (!roomId) return;

  if (isDemoRoom(roomId)) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dnd_demo_direct_messages');
      const msgs: DirectMessage[] = stored ? JSON.parse(stored) : [...DEMO_INITIAL_MESSAGES];
      const updated = msgs.map(m => {
        if (!senderFilter || senderFilter === 'all' || m.senderId === senderFilter || (m.characterName || m.senderName) === senderFilter) {
          return { ...m, read: true };
        }
        return m;
      });
      localStorage.setItem('dnd_demo_direct_messages', JSON.stringify(updated));
    }
    return;
  }

  if (rtdb) {
    try {
      const currentUid = auth?.currentUser?.uid;
      const isDMUser = Boolean(currentUid && roomDmIdCache.get(roomId) === currentUid);

      if (playerUid) {
        const threadRef = ref(rtdb, `rooms/${roomId}/whispers/${playerUid}`);
        const snap = await rtdbGet(threadRef);
        if (snap.exists()) {
          const thread = snap.val();
          const updates: Record<string, boolean> = {};
          const isAll = !senderFilter || senderFilter === 'all';
          Object.keys(thread).forEach(msgId => {
            const m = thread[msgId];
            if (m && !m.read && (isAll || m.senderId === senderFilter || (m.characterName || m.senderName) === senderFilter)) {
              updates[`${msgId}/read`] = true;
            }
          });
          if (Object.keys(updates).length > 0) {
            await rtdbUpdate(threadRef, updates);
            return;
          }
        }
      } else if (isDMUser) {
        const whispersRef = ref(rtdb, `rooms/${roomId}/whispers`);
        const snap = await rtdbGet(whispersRef);
        if (snap.exists()) {
          const allThreads = snap.val();
          const updates: Record<string, boolean> = {};
          const isAll = !senderFilter || senderFilter === 'all';
          Object.keys(allThreads).forEach(pUid => {
            const thread = allThreads[pUid];
            if (thread && typeof thread === 'object') {
              Object.keys(thread).forEach(msgId => {
                const m = thread[msgId];
                if (m && !m.read && (isAll || m.senderId === senderFilter || (m.characterName || m.senderName) === senderFilter)) {
                  updates[`${pUid}/${msgId}/read`] = true;
                }
              });
            }
          });
          if (Object.keys(updates).length > 0) {
            await rtdbUpdate(whispersRef, updates);
            return;
          }
        }
      } else if (currentUid) {
        const threadRef = ref(rtdb, `rooms/${roomId}/whispers/${currentUid}`);
        const snap = await rtdbGet(threadRef);
        if (snap.exists()) {
          const thread = snap.val();
          const updates: Record<string, boolean> = {};
          const isAll = !senderFilter || senderFilter === 'all';
          Object.keys(thread).forEach(msgId => {
            const m = thread[msgId];
            if (m && !m.read && (isAll || m.senderId === senderFilter || (m.characterName || m.senderName) === senderFilter)) {
              updates[`${msgId}/read`] = true;
            }
          });
          if (Object.keys(updates).length > 0) {
            await rtdbUpdate(threadRef, updates);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("[markAllDirectMessagesAsRead] RTDB error, fallback:", e);
    }
  }

  if (!db) return;
  try {
    await withRetry(async () => {
      const whispersRef = collection(db!, "rooms", roomId, "whispers");
      const q = query(whispersRef, where("read", "==", false));
      const snap = await getDocs(q);

      if (snap.empty) return;

      const batch = writeBatch(db!);
      const isAll = !senderFilter || senderFilter === 'all';
      let updateCount = 0;

      for (const d of snap.docs) {
        const data = d.data() as DirectMessage;
        if (isAll || data.senderId === senderFilter || (data.characterName || data.senderName) === senderFilter) {
          batch.update(doc(db!, "rooms", roomId, "whispers", d.id), { read: true });
          updateCount++;
        }
      }

      if (updateCount > 0) {
        await batch.commit();
      }
    }, { context: 'markAllDirectMessagesAsRead' });
  } catch (err: any) {
    logError(err, 'markAllDirectMessagesAsRead', 'WARNING');
  }
};

// 12. Delete Entire Room / Campaign (DM Creator Action: RTDB Clean + Firestore deleteDoc)
export const deleteRoom = async (roomId: string) => {
  if (!roomId || isDemoRoom(roomId)) return;

  if (rtdb) {
    try {
      await rtdbRemove(ref(rtdb, `rooms/${roomId}`));
    } catch (rtdbErr) {
      console.warn("[deleteRoom] RTDB cleanup error:", rtdbErr);
    }
  }

  if (!db) return;
  try {
    const roomRef = doc(db, "rooms", roomId);
    await withRetry(
      () => deleteDoc(roomRef),
      { context: 'deleteRoom' }
    );
  } catch (err: any) {
    logError(err, 'deleteRoom', 'CRITICAL');
    throw err;
  }
};
