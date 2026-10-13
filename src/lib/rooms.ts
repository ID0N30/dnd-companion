import { db, auth } from "./firebase";
import { 
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, 
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  runTransaction, writeBatch 
} from "firebase/firestore";
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
        .filter(doc => !isDemoRoom(doc.id))
        .map(doc => {
          const data = doc.data() as Room;
          // SECURITY FIX: Strip plaintext password from public room streams so client browsers never receive it!
          const { password, id: _dataId, ...safeRoom } = data;
          return {
            id: doc.id,
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

// 2. Create a New Campaign (DM Only)
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
    // Check for duplicate campaign names (case-insensitive) using indexed query with limit(1)
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
    await addRoomLog(roomRef.id, `Campaña creada por el DM ${data.dmName}.`);
    return roomRef.id;
  } catch (err: any) {
    logError(err, 'createRoom', 'CRITICAL');
    throw err;
  }
};

// 3. Subscribe to Single Room Realtime State
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
    const roomRef = doc(db, "rooms", roomId);
    return onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Room);
      } else {
        callback(null);
      }
    }, (err) => {
      logError(err, 'subscribeRoom', 'WARNING');
      callback(null);
    });
  } catch (err) {
    logError(err, 'subscribeRoom', 'WARNING');
    return () => {};
  }
};

// 4. Subscribe to Room Players (Characters)
export const subscribeRoomPlayers = (roomId: string, callback: (players: CharacterState[]) => void) => {
  if (!roomId) return () => {};
  if (isDemoRoom(roomId)) {
    callback(getFactoryDemoParty());
    return () => {};
  }
  if (!db) return () => {};
  try {
    const playersRef = collection(db, "rooms", roomId, "players");
    return onSnapshot(playersRef, (snapshot) => {
      const players = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          roomId: data.roomId || roomId
        };
      }) as CharacterState[];
      callback(players);
    }, (err) => {
      logError(err, 'subscribeRoomPlayers', 'WARNING');
    });
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

// 5. Subscribe to Room Logs (Real-time Action Log Tracker with limit protection)
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
  if (!db) return () => {};
  try {
    const logsRef = collection(db, "rooms", roomId, "logs");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(35));
    
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LogEntry[];
      callback(logs);
    }, (_err) => {
      // Fallback if index error occurs
      const qSimple = query(logsRef, limit(35));
      return onSnapshot(qSimple, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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

// 6. Save/Update Player Character in Room (Rate-limited + Deduplicated + Offline fallback + Strict Isolation)
const lastSavedDataMap = new Map<string, string>();
const pendingWriteTimers = new Map<string, NodeJS.Timeout>();

export const savePlayerInRoom = async (roomId: string, character: CharacterState, forceWrite: boolean = false) => {
  if (!roomId || !character || !character.id) return;
  
  // GUARD 1: Never write demo character or demo room characters to Firestore
  if (isDemoRoom(roomId) || isDemoCharacter(character)) return;

  if (!db) return;

  // GUARD 2: Strict Campaign Isolation!
  // If character has a roomId and it doesn't match target roomId, abort to prevent cross-contamination
  if (character.roomId && character.roomId !== roomId) {
    console.warn(`[savePlayerInRoom] Blocked cross-room leak: "${character.name}" (assigned to ${character.roomId}) cannot be saved into "${roomId}".`);
    return;
  }

  const currentUser = auth?.currentUser;
  const characterToSave: CharacterState = {
    ...character,
    roomId: roomId,
    ownerId: character.ownerId || currentUser?.uid,
    ownerName: character.ownerName || currentUser?.displayName || currentUser?.email || (currentUser?.isAnonymous ? 'Invitado' : 'Jugador')
  };

  const writeKey = `${roomId}_${character.id}`;

  // If this write is forced (e.g. explicit user edit, DM action, HP change), clear any pending deferred flush
  if (forceWrite && pendingWriteTimers.has(writeKey)) {
    clearTimeout(pendingWriteTimers.get(writeKey)!);
    pendingWriteTimers.delete(writeKey);
  }
  
  if (!forceWrite && isWriteRateLimited(writeKey)) {
    saveOfflineCharacterBackup(characterToSave);
    syncAllLocalPlayersToStorage([characterToSave]);

    // GUARANTEED FLUSH: Coalesce rapid updates and ensure trailing write is NEVER dropped
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

  // Deduplicate write: if character state (excluding lastSeen) hasn't changed, skip setDoc
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
    await withRetry(
      () => setDoc(playerRef, cleanFirebaseData(characterToSave), { merge: true }),
      { context: 'savePlayerInRoom' }
    );
    saveOfflineCharacterBackup(characterToSave);
    syncAllLocalPlayersToStorage([characterToSave]);
  } catch (err: any) {
    logError(err, 'savePlayerInRoom', 'CRITICAL');
    saveOfflineCharacterBackup(characterToSave);
    syncAllLocalPlayersToStorage([characterToSave]);
  }
};

// 6.2 Lightweight presence tracking with strict deduplication & rate limiting
const lastPresenceMap = new Map<string, { isOnline: boolean; timestamp: number }>();

export const updatePlayerPresence = async (roomId: string, playerId: string, isOnline: boolean) => {
  if (!roomId || !playerId || isDemoRoom(roomId) || isDemoCharacterId(playerId) || !db) return;
  
  const key = `${roomId}_${playerId}`;
  const now = Date.now();
  const cached = lastPresenceMap.get(key);

  // Rate-limiting: If online status is the same and last write was less than 30 seconds ago, skip write
  if (cached && cached.isOnline === isOnline && (now - cached.timestamp < 30000)) {
    return;
  }

  // Throttle duplicate offline writes within 5 seconds
  if (cached && cached.isOnline === false && isOnline === false && (now - cached.timestamp < 5000)) {
    return;
  }

  lastPresenceMap.set(key, { isOnline, timestamp: now });

  try {
    const playerRef = doc(db, "rooms", roomId, "players", playerId);
    await withRetry(
      () => updateDoc(playerRef, { isOnline, lastSeen: now }),
      { context: 'updatePlayerPresence', maxRetries: 1 }
    );
  } catch (err) {
    // Non-critical, ignore presence write failures
  }
};

// 6.5 Delete Player Character from Campaign Room (Permanent Firestore deletion with withRetry)
export const deletePlayerFromRoom = async (roomId: string, playerId: string) => {
  if (!roomId || !playerId || isDemoRoom(roomId) || isDemoCharacterId(playerId) || !db) return;
  const playerRef = doc(db, "rooms", roomId, "players", playerId);

  try {
    await withRetry(
      () => deleteDoc(playerRef),
      { context: 'deletePlayerFromRoom' }
    );
  } catch (err: any) {
    logError(err, 'deletePlayerFromRoom', 'WARNING');
  }
};

// 6.6 Fetch all characters owned by a user across active campaign rooms (Cloud recovery)
export const fetchUserCharactersAcrossRooms = async (userId: string, roomIds: string[] = []): Promise<CharacterState[]> => {
  if (!db || !userId) return [];
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

    return Array.from(seenMap.values());
  } catch (cgErr: any) {
    logError(cgErr, 'fetchUserCharactersAcrossRooms_collectionGroup_fallback', 'WARNING');

    // Fallback resiliente en paralelo si collectionGroup falla (por ejemplo índice aún desplegándose)
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
        return results.flat();
      } catch (err) {
        logError(err, 'fetchUserCharactersAcrossRooms_parallel_fallback', 'WARNING');
      }
    }

    return [];
  }
};

// 7. Kick Player from Campaign (DM Only)
export const kickPlayerFromRoom = async (roomId: string, playerId: string, playerName: string) => {
  if (!roomId || !playerId || isDemoRoom(roomId) || isDemoCharacterId(playerId) || !db) return;
  try {
    const playerRef = doc(db, "rooms", roomId, "players", playerId);
    await withRetry(
      () => setDoc(playerRef, { kicked: true, isOnline: false }, { merge: true }),
      { context: 'kickPlayerFromRoom_setDoc' }
    );
    await addRoomLog(roomId, `El DM ha retirado a ${playerName} de la campaña.`);
    setTimeout(async () => {
      try {
        await withRetry(
          () => deleteDoc(playerRef),
          { context: 'kickPlayerFromRoom_deleteDoc' }
        );
      } catch (e) {}
    }, 2500);
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

// 9. Update Room State (DM / Turn advance / Combat Mode)
export const updateRoomState = async (roomId: string, updates: Partial<Room>) => {
  if (!roomId || isDemoRoom(roomId) || !db) return;
  try {
    const roomRef = doc(db, "rooms", roomId);
    await withRetry(
      () => updateDoc(roomRef, cleanFirebaseData(updates)),
      { context: 'updateRoomState' }
    );
  } catch (err: any) {
    logError(err, 'updateRoomState', 'WARNING');
  }
};

// 9.5 Atomic Turn Advance (Race Condition Shield via runTransaction)
export const advanceRoomTurnAtomic = async (
  roomId: string,
  event: { id: string; timestamp: number },
  fallbackNextIndex?: number
): Promise<number> => {
  if (!roomId || isDemoRoom(roomId) || !db) {
    return fallbackNextIndex ?? 0;
  }

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
  }, { context: 'advanceRoomTurnAtomic' });
};

// 10. Add Action Log to Room (Rate-limited & Deduplicated to prevent burst spam)
const lastLogTimeMap = new Map<string, { message: string; timestamp: number }>();
const MIN_LOG_INTERVAL_MS = 600;

export const addRoomLog = async (roomId: string, message: string) => {
  if (!roomId || isDemoRoom(roomId) || !db) return;

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

// 10.5 Subscribe to Room Whispers (Direct Messages Subcollection with Bidirectional Support)
export const subscribeRoomWhispers = (
  roomId: string,
  options: { isDM?: boolean; senderUid?: string; characterId?: string },
  callback: (messages: DirectMessage[]) => void
) => {
  if (!roomId) {
    callback([]);
    return () => {};
  }

  if (isDemoRoom(roomId)) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dnd_demo_direct_messages');
      if (stored) {
        try {
          let msgs: DirectMessage[] = JSON.parse(stored);
          if (!options.isDM && options.characterId) {
            msgs = msgs.filter(m => 
              m.senderId === options.characterId || 
              m.recipientCharacterId === options.characterId ||
              (m.isFromDM && (m.characterName === options.characterId || m.recipientCharacterId === options.characterId))
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

  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const whispersRef = collection(db, "rooms", roomId, "whispers");

    if (options.isDM) {
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
      const uid = options.senderUid || auth?.currentUser?.uid;
      if (!uid) {
        callback([]);
        return () => {};
      }

      // Bidirectional subscription: messages sent by the player (senderUid == uid)
      // and messages addressed to the player by the DM (playerUid == uid)
      const msgsMap = new Map<string, DirectMessage>();

      const emitCombined = () => {
        let allMsgs = Array.from(msgsMap.values());
        if (options.characterId) {
          allMsgs = allMsgs.filter(m => 
            m.senderId === options.characterId || 
            m.recipientCharacterId === options.characterId ||
            (m.isFromDM && (m.characterName === options.characterId || m.recipientCharacterId === options.characterId))
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
};

// 11. Direct Messages to DM (Atomic WriteBatch Prune + withRetry)
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

  if (!db) return;

  try {
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

    await addRoomLog(roomId, `El personaje ${message.characterName} ha enviado un mensaje privado / trasfondo al DM.`);
  } catch (err: any) {
    logError(err, 'sendDirectMessageToDM', 'WARNING');
  }
};

// 11.2 DM Whisper Reply to Player (Bidirectional Channel)
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

  const msgId = 'whisper_dm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const newMsg: DirectMessage = {
    id: msgId,
    senderId: 'dm',
    senderUid: auth?.currentUser?.uid || 'dm',
    playerUid: whisper.playerUid || whisper.recipientCharacterId,
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

  if (!db) return;

  try {
    await withRetry(async () => {
      const whisperRef = doc(db!, "rooms", roomId, "whispers", msgId);
      await setDoc(whisperRef, cleanFirebaseData(newMsg));
    }, { context: 'sendWhisperFromDM' });

    await addRoomLog(roomId, `El DM ha enviado una respuesta o susurro secreto a ${whisper.recipientCharacterName}.`);
  } catch (err: any) {
    logError(err, 'sendWhisperFromDM', 'WARNING');
  }
};

export const deleteDirectMessage = async (roomId: string, messageId: string) => {
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

export const markDirectMessageAsRead = async (roomId: string, messageId: string) => {
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

export const markAllDirectMessagesAsRead = async (roomId: string, senderFilter?: string) => {
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

// 12. Delete Entire Room / Campaign (DM Creator Action)
export const deleteRoom = async (roomId: string) => {
  if (!roomId || isDemoRoom(roomId) || !db) return;
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
