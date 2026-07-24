import { ref, set, onValue, get, update, remove } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from './config';

// Define a subscriber callback type
type RoomCallback = (room: any) => void;

// Room Expiration Time (default: 24 hours)
export const ROOM_TTL_HOURS = 24;
export const ROOM_TTL_MS = ROOM_TTL_HOURS * 60 * 60 * 1000;

// Mock database registry for subscribers in mock mode
const mockSubscribers: Record<string, Set<RoomCallback>> = {};
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined') {
  broadcastChannel = new BroadcastChannel('parlour_sync_channel');
  broadcastChannel.onmessage = (event) => {
    const { type, roomId, data } = event.data;
    if (type === 'ROOM_UPDATE') {
      if (mockSubscribers[roomId]) {
        mockSubscribers[roomId].forEach((cb) => cb(data));
      }
    }
  };
}

// Helper to generate a 5-char code
export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Sweep and delete rooms older than ROOM_TTL_HOURS.
 * Runs passively on database interactions to keep the database clean automatically.
 */
export async function cleanupExpiredRooms(): Promise<void> {
  const now = Date.now();

  if (isFirebaseConfigured && db) {
    try {
      const roomsRef = ref(db, 'rooms');
      const snapshot = await get(roomsRef);
      if (snapshot.exists()) {
        const rooms = snapshot.val();
        const updates: Record<string, null> = {};
        let hasExpired = false;

        Object.entries(rooms).forEach(([roomId, room]: [string, any]) => {
          if (room && room.createdAt && (now - room.createdAt > ROOM_TTL_MS)) {
            updates[roomId] = null;
            hasExpired = true;
          }
        });

        if (hasExpired) {
          await update(roomsRef, updates);
        }
      }
    } catch (e) {
      console.error("Failed to clean up expired rooms:", e);
    }
  } else {
    // LocalStorage fallback cleanup
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('parlour_room_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const room = JSON.parse(raw);
            if (room.createdAt && (now - room.createdAt > ROOM_TTL_MS)) {
              localStorage.removeItem(key);
            }
          }
        } catch (_) { }
      }
    }
  }
}

// Authenticate user anonymously
export async function authenticateUser(): Promise<string> {
  if (isFirebaseConfigured && auth) {
    try {
      const cred = await signInAnonymously(auth);
      return cred.user.uid;
    } catch (e) {
      console.error("Anonymous authentication failed, using local storage id instead.", e);
    }
  }

  // Fallback to local storage ID if firebase is not configured
  let localUid = localStorage.getItem('parlour_local_uid');
  if (!localUid) {
    localUid = 'local_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('parlour_local_uid', localUid);
  }
  return localUid;
}

// Create a room
export async function createRoom(gameType: string, hostId: string, hostName: string): Promise<string> {
  // Trigger background cleanup of expired rooms
  cleanupExpiredRooms().catch(() => { });

  const roomId = generateRoomId();
  const initialRoom = {
    roomId,
    gameType,
    status: 'waiting',
    hostId,
    createdAt: Date.now(),
    players: {
      [hostId]: {
        uid: hostId,
        name: hostName,
        ready: false,
        isHost: true
      }
    },
    game: null,
    history: [`Room created by ${hostName}`]
  };

  if (isFirebaseConfigured && db) {
    await set(ref(db, `rooms/${roomId}`), initialRoom);
  } else {
    localStorage.setItem(`parlour_room_${roomId}`, JSON.stringify(initialRoom));
  }

  return roomId;
}

// Join a room
export async function joinRoom(roomId: string, playerUid: string, playerName: string): Promise<boolean> {
  const upperRoomId = roomId.toUpperCase().trim();

  // Trigger background cleanup of expired rooms
  cleanupExpiredRooms().catch(() => { });

  if (isFirebaseConfigured && db) {
    const roomRef = ref(db, `rooms/${upperRoomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return false;

    const roomData = snapshot.val();

    // Check if room has expired
    if (roomData.createdAt && (Date.now() - roomData.createdAt > ROOM_TTL_MS)) {
      await remove(roomRef);
      return false; // Room expired and deleted
    }

    if (Object.keys(roomData.players || {}).length >= 2 && !roomData.players[playerUid]) {
      return false; // Room full
    }

    // Add player
    await set(ref(db, `rooms/${upperRoomId}/players/${playerUid}`), {
      uid: playerUid,
      name: playerName,
      ready: false,
      isHost: false
    });

    const updatedHistory = [...(roomData.history || []), `${playerName} joined the room`];
    await update(roomRef, { history: updatedHistory });
    return true;
  } else {
    const raw = localStorage.getItem(`parlour_room_${upperRoomId}`);
    if (!raw) return false;

    const roomData = JSON.parse(raw);

    // Check if room has expired
    if (roomData.createdAt && (Date.now() - roomData.createdAt > ROOM_TTL_MS)) {
      localStorage.removeItem(`parlour_room_${upperRoomId}`);
      return false;
    }

    if (Object.keys(roomData.players || {}).length >= 2 && !roomData.players[playerUid]) {
      return false; // Room full
    }

    roomData.players[playerUid] = {
      uid: playerUid,
      name: playerName,
      ready: false,
      isHost: false
    };
    roomData.history.push(`${playerName} joined the room`);

    localStorage.setItem(`parlour_room_${upperRoomId}`, JSON.stringify(roomData));

    // Sync via broadcast
    broadcastChannel?.postMessage({
      type: 'ROOM_UPDATE',
      roomId: upperRoomId,
      data: roomData
    });

    return true;
  }
}

// Update the room state
export async function updateRoom(roomId: string, updates: Partial<any>): Promise<void> {
  if (isFirebaseConfigured && db) {
    await update(ref(db, `rooms/${roomId}`), updates);
  } else {
    const raw = localStorage.getItem(`parlour_room_${roomId}`);
    if (!raw) return;
    const roomData = JSON.parse(raw);

    const merged = { ...roomData, ...updates };
    localStorage.setItem(`parlour_room_${roomId}`, JSON.stringify(merged));

    broadcastChannel?.postMessage({
      type: 'ROOM_UPDATE',
      roomId,
      data: merged
    });

    if (mockSubscribers[roomId]) {
      mockSubscribers[roomId].forEach((cb) => cb(merged));
    }
  }
}

// Subscribe to room changes
export function subscribeToRoom(roomId: string, callback: RoomCallback): () => void {
  const upperRoomId = roomId.toUpperCase().trim();
  if (isFirebaseConfigured && db) {
    const roomRef = ref(db, `rooms/${upperRoomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomData = snapshot.val();
        if (roomData.createdAt && (Date.now() - roomData.createdAt > ROOM_TTL_MS)) {
          // Room expired - delete it and notify subscriber
          remove(roomRef).catch(() => { });
          callback(null);
        } else {
          callback(roomData);
        }
      } else {
        callback(null);
      }
    });
    return () => unsubscribe();
  } else {
    if (!mockSubscribers[upperRoomId]) {
      mockSubscribers[upperRoomId] = new Set();
    }
    mockSubscribers[upperRoomId].add(callback);

    const raw = localStorage.getItem(`parlour_room_${upperRoomId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.createdAt && (Date.now() - parsed.createdAt > ROOM_TTL_MS)) {
        localStorage.removeItem(`parlour_room_${upperRoomId}`);
        setTimeout(() => callback(null), 0);
      } else {
        setTimeout(() => callback(parsed), 0);
      }
    }

    return () => {
      mockSubscribers[upperRoomId]?.delete(callback);
      if (mockSubscribers[upperRoomId]?.size === 0) {
        delete mockSubscribers[upperRoomId];
      }
    };
  }
}
