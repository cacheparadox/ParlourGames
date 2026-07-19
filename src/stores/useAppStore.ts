import { create } from 'zustand';
import { authenticateUser } from '../firebase/db';
import { audio } from '../utils/audio';

interface AppState {
  soundEnabled: boolean;
  playerUid: string;
  playerName: string;
  isAuthenticating: boolean;
  toggleSound: () => void;
  setPlayerName: (name: string) => void;
  initializeUser: () => Promise<void>;
}

const adjectives = ["Velvet", "Brass", "Walnut", "Ivory", "Oak", "Ebony", "Burgundy", "Amber", "Cobalt", "Sable"];
const nouns = ["Gamer", "Player", "Bluffer", "Deductor", "Wagerer", "Strategist", "General", "Knight", "Commoner", "King"];

function generateRandomName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

export const useAppStore = create<AppState>((set, get) => {
  const savedSound = localStorage.getItem('parlour_sound_enabled');
  const soundEnabled = savedSound !== 'false';
  audio.setEnabled(soundEnabled);

  let savedName = localStorage.getItem('parlour_player_name');
  if (!savedName) {
    savedName = generateRandomName();
    localStorage.setItem('parlour_player_name', savedName);
  }

  return {
    soundEnabled,
    playerUid: '',
    playerName: savedName,
    isAuthenticating: false,
    toggleSound: () => {
      const nextVal = !get().soundEnabled;
      localStorage.setItem('parlour_sound_enabled', String(nextVal));
      audio.setEnabled(nextVal);
      set({ soundEnabled: nextVal });
    },
    setPlayerName: (name: string) => {
      const cleanName = name.trim().substring(0, 20) || generateRandomName();
      localStorage.setItem('parlour_player_name', cleanName);
      set({ playerName: cleanName });
    },
    initializeUser: async () => {
      if (get().playerUid) return;
      set({ isAuthenticating: true });
      try {
        const uid = await authenticateUser();
        set({ playerUid: uid, isAuthenticating: false });
      } catch (e) {
        console.error("Auth error during store init", e);
        set({ isAuthenticating: false });
      }
    }
  };
});
