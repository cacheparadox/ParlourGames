import { ref, set, onValue, get, update } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from './config';

// Define a subscriber callback type
type RoomCallback = (room: any) => void;

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
  if (isFirebaseConfigured && db) {
    const roomRef = ref(db, `rooms/${upperRoomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return false;
    
    const roomData = snapshot.val();
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
  if (isFirebaseConfigured && db) {
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });
    return () => unsubscribe();
  } else {
    if (!mockSubscribers[roomId]) {
      mockSubscribers[roomId] = new Set();
    }
    mockSubscribers[roomId].add(callback);
    
    const raw = localStorage.getItem(`parlour_room_${roomId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      setTimeout(() => callback(parsed), 0);
    }

    return () => {
      mockSubscribers[roomId]?.delete(callback);
      if (mockSubscribers[roomId]?.size === 0) {
        delete mockSubscribers[roomId];
      }
    };
  }
}
