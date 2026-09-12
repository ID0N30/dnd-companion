import { db, auth } from "./firebase";
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, 
  query, where, orderBy, limit, onSnapshot, serverTimestamp 
} from "firebase/firestore";
import { useStore, CharacterState, LogEntry, syncAllLocalPlayersToStorage } from "@/store/useStore";
import { logError, saveOfflineCharacterBackup } from "./errorLogger";

export type DirectMessage = {
  id: string;
  senderId: string;
  senderName: string;
  characterName: string;
  content: string;
  timestamp: number;
  read?: boolean;
};

export type Room = {
  id: string;
  name: string;
  dmId: string;
  dmName: string;
  isPublic: boolean;
  hasPassword: boolean;
  password?: string;
  allowGuests: boolean;
  isCombatMode: boolean;
  initiativeOrder: string[];
  currentTurnIndex: number;
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
      const rooms = snapshot.docs.map(doc => {
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
  if (!db || !roomId) return false;
  try {
    const roomRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomRef);
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
    // Check for duplicate campaign names (case-insensitive) across existing rooms
    const existingRoomsSnap = await getDocs(collection(db, "rooms"));
    const isDuplicate = existingRoomsSnap.docs.some(d => {
      const roomData = d.data() as Room;
      return (roomData.name || "").trim().toLowerCase() === trimmedName.toLowerCase();
    });

    if (isDuplicate) {
      throw new Error(`Ya existe una campaña llamada "${trimmedName}". Por favor elige un nombre único para evitar confusiones.`);
    }

    const roomRef = doc(collection(db, "rooms"));
    const newRoom: Room = {
      id: roomRef.id,
      name: trimmedName,
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

    await setDoc(roomRef, cleanFirebaseData(newRoom));
    await addRoomLog(roomRef.id, `🏰 Campaña creada por el DM ${data.dmName}.`);
    return roomRef.id;
  } catch (err: any) {
    logError(err, 'createRoom', 'CRITICAL');
    throw err;
  }
};

// 3. Subscribe to Single Room Realtime State
export const subscribeRoom = (roomId: string, callback: (room: Room | null) => void) => {
  if (!db || !roomId) return () => {};
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
  if (!db || !roomId) return () => {};
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
  if (!db || !roomId) return () => {};
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
  if (!db || !roomId || !character || !character.id) return;
  
  // GUARD 1: Never write demo character to Firestore
  if (character.id === 'drizzt_dourden_demo') return;

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
    await setDoc(playerRef, cleanFirebaseData(characterToSave), { merge: true });
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
  if (!db || !roomId || !playerId || playerId === 'drizzt_dourden_demo') return;
  
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
    await updateDoc(playerRef, { isOnline, lastSeen: now });
  } catch (err) {
    // Non-critical, ignore presence write failures
  }
};

// 6.5 Delete Player Character from Campaign Room (Permanent Firestore deletion with auto token refresh)
export const deletePlayerFromRoom = async (roomId: string, playerId: string) => {
  if (!db || !roomId || !playerId) return;
  const playerRef = doc(db, "rooms", roomId, "players", playerId);

  try {
    await deleteDoc(playerRef);
  } catch (err: any) {
    // If permission was denied due to a stale token, attempt a fresh token retrieval and retry once
    if (err?.code === 'permission-denied' && auth?.currentUser) {
      try {
        await auth.currentUser.getIdToken(true); // Force token refresh
        await deleteDoc(playerRef);
        return; // Succeeded on retry!
      } catch (retryErr: any) {
        logError(retryErr, 'deletePlayerFromRoom', 'WARNING');
        return;
      }
    }
    logError(err, 'deletePlayerFromRoom', 'WARNING');
  }
};

// 6.6 Fetch all characters owned by a user across active campaign rooms (Cloud recovery)
export const fetchUserCharactersAcrossRooms = async (userId: string, roomIds: string[]): Promise<CharacterState[]> => {
  if (!db || !userId || !roomIds.length) return [];
  const foundCharacters: CharacterState[] = [];
  try {
    for (const rid of roomIds) {
      if (!rid) continue;
      const q = query(
        collection(db, "rooms", rid, "players"),
        where("ownerId", "==", userId)
      );
      const snap = await getDocs(q);
      snap.forEach(docSnap => {
        const data = docSnap.data() as CharacterState;
        if (data && !(data as any).kicked && docSnap.id !== 'drizzt_dourden_demo') {
          foundCharacters.push({
            ...data,
            id: docSnap.id,
            roomId: data.roomId || rid
          });
        }
      });
    }
  } catch (e) {
    logError(e, 'fetchUserCharactersAcrossRooms', 'WARNING');
  }
  return foundCharacters;
};

// 7. Kick Player from Campaign (DM Only)
export const kickPlayerFromRoom = async (roomId: string, playerId: string, playerName: string) => {
  if (!db || !roomId || !playerId) return;
  try {
    const playerRef = doc(db, "rooms", roomId, "players", playerId);
    await setDoc(playerRef, { kicked: true, isOnline: false }, { merge: true });
    await addRoomLog(roomId, `⚡ El DM ha retirado a ${playerName} de la campaña.`);
    setTimeout(async () => {
      try {
        await deleteDoc(playerRef);
      } catch (e) {}
    }, 2500);
  } catch (err: any) {
    logError(err, 'kickPlayerFromRoom', 'WARNING');
  }
};

// 8. Update Room/Campaign Settings (DM Only)
export const updateCampaignDetails = async (roomId: string, updates: Partial<Room>) => {
  if (!db || !roomId) return;
  try {
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, cleanFirebaseData(updates));
    await addRoomLog(roomId, `⚙️ El DM actualizó los ajustes de la campaña.`);
  } catch (err: any) {
    logError(err, 'updateCampaignDetails', 'WARNING');
  }
};

// 9. Update Room State (DM / Turn advance / Combat Mode)
export const updateRoomState = async (roomId: string, updates: Partial<Room>) => {
  if (!db || !roomId) return;
  try {
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, cleanFirebaseData(updates));
  } catch (err: any) {
    logError(err, 'updateRoomState', 'WARNING');
  }
};

// 10. Add Action Log to Room
export const addRoomLog = async (roomId: string, message: string) => {
  if (!db || !roomId) return;
  try {
    const logsRef = collection(db, "rooms", roomId, "logs");
    await addDoc(logsRef, {
      id: Date.now().toString() + Math.random(),
      message,
      timestamp: Date.now()
    });
  } catch (err: any) {
    logError(err, 'addRoomLog', 'INFO');
  }
};

// 11. Direct Messages to DM
export const sendDirectMessageToDM = async (roomId: string, message: Omit<DirectMessage, 'id' | 'timestamp'>) => {
  if (!db || !roomId) return;
  try {
    const roomRef = doc(db, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const data = roomSnap.data() as Room;
    const currentMsgs = data.directMessages || [];
    
    const newMsg: DirectMessage = {
      ...message,
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      read: false
    };

    // FIFO Sliding Window: Retain at most 4 previous messages from this sender so that with the new one, total is at most 5
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
    await updateDoc(roomRef, { directMessages: cleanFirebaseData(updated) });
    await addRoomLog(roomId, `✉️ ${message.characterName} ha enviado un mensaje privado / trasfondo al DM.`);
  } catch (err: any) {
    logError(err, 'sendDirectMessageToDM', 'WARNING');
  }
};

export const deleteDirectMessage = async (roomId: string, messageId: string) => {
  if (!db || !roomId) return;
  try {
    const roomRef = doc(db, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const data = roomSnap.data() as Room;
    const currentMsgs = data.directMessages || [];
    const updated = currentMsgs.filter(m => m.id !== messageId);
    await updateDoc(roomRef, { directMessages: cleanFirebaseData(updated) });
  } catch (err: any) {
    logError(err, 'deleteDirectMessage', 'WARNING');
  }
};

export const markDirectMessageAsRead = async (roomId: string, messageId: string) => {
  if (!db || !roomId || !messageId) return;
  try {
    const roomRef = doc(db, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const data = roomSnap.data() as Room;
    const currentMsgs = data.directMessages || [];
    
    const targetMsg = currentMsgs.find(m => m.id === messageId);
    if (!targetMsg || targetMsg.read === true) return;

    const updated = currentMsgs.map(m => m.id === messageId ? { ...m, read: true } : m);
    await updateDoc(roomRef, { directMessages: cleanFirebaseData(updated) });
  } catch (err: any) {
    logError(err, 'markDirectMessageAsRead', 'WARNING');
  }
};

export const markAllDirectMessagesAsRead = async (roomId: string, senderId?: string) => {
  if (!db || !roomId) return;
  try {
    const roomRef = doc(db, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const data = roomSnap.data() as Room;
    const currentMsgs = data.directMessages || [];
    
    const hasUnread = currentMsgs.some(m => (!senderId || m.senderId === senderId || (m.characterName || m.senderName) === senderId) && !m.read);
    if (!hasUnread) return;

    const updated = currentMsgs.map(m => {
      if (!senderId || m.senderId === senderId || (m.characterName || m.senderName) === senderId) {
        return { ...m, read: true };
      }
      return m;
    });
    await updateDoc(roomRef, { directMessages: cleanFirebaseData(updated) });
  } catch (err: any) {
    logError(err, 'markAllDirectMessagesAsRead', 'WARNING');
  }
};

// 12. Delete Entire Room / Campaign (DM Creator Action)
export const deleteRoom = async (roomId: string) => {
  if (!db || !roomId) return;
  try {
    const roomRef = doc(db, "rooms", roomId);
    await deleteDoc(roomRef);
  } catch (err: any) {
    logError(err, 'deleteRoom', 'CRITICAL');
    throw err;
  }
};
