export interface RecentRoom {
  id: string;
  name: string;
  dmName: string;
  lastVisited: number;
  hasPassword?: boolean;
}

const STORAGE_KEY = 'dnd_recent_campaigns';
const MAX_RECENT_ROOMS = 4;

export const getRecentRooms = (): RecentRoom[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0)).slice(0, MAX_RECENT_ROOMS);
    }
    return [];
  } catch (e) {
    return [];
  }
};

export const recordRecentRoom = (room: { id: string; name: string; dmName: string; hasPassword?: boolean }) => {
  if (typeof window === 'undefined' || !room.id) return;
  try {
    const current = getRecentRooms();
    const filtered = current.filter(r => r.id !== room.id);
    const updated: RecentRoom[] = [
      {
        id: room.id,
        name: room.name,
        dmName: room.dmName,
        hasPassword: Boolean(room.hasPassword),
        lastVisited: Date.now()
      },
      ...filtered
    ].slice(0, MAX_RECENT_ROOMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // Ignore storage quota errors
  }
};

export const removeRecentRoom = (roomId: string): RecentRoom[] => {
  if (typeof window === 'undefined') return [];
  try {
    const current = getRecentRooms();
    const updated = current.filter(r => r.id !== roomId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
};
