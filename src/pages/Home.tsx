import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, User, Sparkles, AlertCircle } from 'lucide-react';
import { gamesRegistry } from '../games/registry';
import { createRoom, joinRoom } from '../firebase/db';
import { useAppStore } from '../stores/useAppStore';
import { audio } from '../utils/audio';
import { isFirebaseConfigured } from '../firebase/config';

import logoImg from '../assets/logo.png';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { soundEnabled, toggleSound, playerName, setPlayerName, playerUid, initializeUser } = useAppStore();

  const [openedGameId, setOpenedGameId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);

  useEffect(() => {
    initializeUser();
  }, []);

  const handleToggleSound = () => {
    toggleSound();
    audio.playCoinClink();
  };

  const handleBoxClick = (gameId: string) => {
    audio.playWoodKnock();
    setOpenedGameId(openedGameId === gameId ? null : gameId);
    setJoinError(null);
    setJoinCode('');
  };

  const handlePassPlay = (gameId: string) => {
    audio.playCardSlide();
    // In local Pass & Play, we route to a special local room ID
    navigate(`/room/local-${gameId}`);
  };

  const handleCreateRoom = async (gameId: string) => {
    try {
      audio.playWoodKnock();
      const newRoomId = await createRoom(gameId, playerUid, playerName);
      navigate(`/room/${newRoomId}`);
    } catch (e) {
      console.error("Room creation error", e);
      setJoinError("Failed to create room.");
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !openedGameId) return;

    setIsJoining(true);
    setJoinError(null);
    audio.playCardSlide();

    try {
      const code = joinCode.toUpperCase().trim();
      const success = await joinRoom(code, playerUid, playerName);
      if (success) {
        navigate(`/room/${code}`);
      } else {
        setJoinError("Invalid Room Code or Room Full.");
      }
    } catch (e) {
      console.error("Join room error", e);
      setJoinError("Error connecting to room.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleSaveSettings = () => {
    audio.playCoinClink();
    setPlayerName(nameInput);
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#120a06] flex flex-col items-center py-6 px-4 select-none bg-leather text-ivory">
      
      {/* Brand Header */}
      <header className="w-full max-w-4xl flex flex-col items-center justify-center text-center mt-4 mb-8">
        <motion.img 
          src={logoImg} 
          alt="PARLOUR Logo" 
          className="h-20 sm:h-28 object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        />
        <motion.p 
          className="font-serif tracking-[0.25em] text-brass text-[10px] sm:text-xs uppercase mt-2 opacity-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Premium Multiplayer Strategy Collection
        </motion.p>
      </header>

      {/* Main Board Container */}
      <main className="w-full max-w-4xl flex flex-col gap-6 items-center">
        
        {/* Dashboard bar */}
        <div className="w-full wood-panel p-3.5 rounded-xl border border-brass/10 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                audio.playWoodKnock();
                setShowSettings(true);
              }}
              className="px-3.5 py-1.5 rounded bg-walnut hover:bg-oak border border-brass/35 text-brass transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <User size={15} />
              <span className="font-bold truncate max-w-[120px]">{playerName}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!isFirebaseConfigured && (
              <span className="text-[10px] sm:text-xs text-brass/70 font-semibold bg-walnut/60 py-1.5 px-3 rounded border border-brass/15 flex items-center gap-1">
                <Sparkles size={11} className="text-brass animate-pulse" /> MOCK MULTIPLAYER Fallback
              </span>
            )}
            
            <button
              onClick={handleToggleSound}
              className="p-2 rounded bg-walnut hover:bg-oak border border-brass/35 text-brass transition cursor-pointer shadow-md"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* Board Games Shelf Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start mt-2">
          {gamesRegistry.map((game) => {
            const isOpened = openedGameId === game.id;
            return (
              <div 
                key={game.id}
                className="flex flex-col relative group"
              >
                {/* 3D Wood Container Frame */}
                <div className="wood-board p-2 rounded-2xl relative overflow-hidden flex flex-col items-center">
                  
                  {/* Ornate corner hardware decoration */}
                  <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-brass opacity-60"></div>
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brass opacity-60"></div>
                  <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-brass opacity-60"></div>
                  <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-brass opacity-60"></div>

                  <div className="w-full aspect-[4/3] rounded-lg overflow-hidden relative cursor-pointer group-hover:shadow-2xl transition border border-black/45">
                    
                    {/* The wooden lid sliding cover */}
                    <motion.div
                      className="absolute inset-0 z-20"
                      initial={{ y: 0 }}
                      animate={{ y: isOpened ? '-100%' : '0%' }}
                      transition={{ type: 'spring', damping: 20, stiffness: 80 }}
                      onClick={() => handleBoxClick(game.id)}
                    >
                      <img 
                        src={game.thumbnail} 
                        alt={game.name} 
                        className="w-full h-full object-cover" 
                      />
                      
                      {/* Brass Lock clasp plate */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-b from-brass via-[#d4b473] to-[#8d692a] p-1 border border-black/40 shadow-md rounded flex items-center justify-center z-30">
                        <div className="w-6 h-6 rounded-full border border-black/35 flex items-center justify-center text-[9px] text-walnut font-serif font-bold">
                          ⚜️
                        </div>
                      </div>
                    </motion.div>

                    {/* Inside Velvet Game Felt (Visible once lid is slid open) */}
                    <div className="absolute inset-0 bg-[#120a06] flex flex-col justify-between p-4 velvet-felt-burgundy relative">
                      <div className="flex flex-col gap-1.5">
                        <h3 className="font-serif font-bold text-lg text-brass border-b border-brass/25 pb-1 select-text">
                          {game.name}
                        </h3>
                        <p className="text-[11px] leading-relaxed text-ivory/80 select-text">
                          {game.description}
                        </p>
                      </div>

                      {/* Summary rules snippet */}
                      <div className="bg-black/30 p-2 rounded border border-brass/10 text-[9px] text-ivory/60 flex flex-col gap-0.5 select-text">
                        <span className="font-bold text-brass uppercase text-[8px] tracking-wide block mb-0.5">Quick Rules</span>
                        {game.rules.slice(0, 3).map((r, i) => (
                          <div key={i} className="truncate">• {r}</div>
                        ))}
                      </div>
                      
                      {/* Fake bottom padding spacing */}
                      <div className="h-2"></div>
                    </div>
                  </div>
                </div>

                {/* Submenu Drawer popping down when lid is opened */}
                <AnimatePresence>
                  {isOpened && (
                    <motion.div
                      className="wood-panel border-2 border-brass/30 border-t-0 p-4 rounded-b-xl flex flex-col gap-3 shadow-2xl relative z-10 -mt-2.5 bg-[#2c1a11]"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex flex-col gap-2">
                        {/* Pass & Play mode */}
                        <button
                          onClick={() => handlePassPlay(game.id)}
                          className="w-full py-2.5 bg-brass hover:bg-[#d4b473] text-walnut font-serif font-bold rounded-lg border border-brass/50 transition active:scale-95 cursor-pointer uppercase text-xs tracking-wider shadow-lg flex items-center justify-center gap-1.5"
                        >
                          ⚔️ Pass & Play (Local Device)
                        </button>
                        
                        <div className="relative flex py-1 items-center">
                          <div className="flex-grow border-t border-brass/10"></div>
                          <span className="flex-shrink mx-3 text-[9px] text-brass/50 uppercase tracking-widest font-serif font-bold">Or Online</span>
                          <div className="flex-grow border-t border-brass/10"></div>
                        </div>

                        {/* Create Room mode */}
                        <button
                          onClick={() => handleCreateRoom(game.id)}
                          className="w-full py-2 bg-walnut hover:bg-oak text-brass font-serif font-bold rounded border border-brass/25 transition active:scale-95 cursor-pointer uppercase text-[10px] tracking-wide shadow"
                        >
                          Create Online Room
                        </button>

                        {/* Join Room mode */}
                        <form onSubmit={handleJoinRoom} className="flex gap-2 mt-1">
                          <input
                            type="text"
                            maxLength={5}
                            required
                            placeholder="CODE"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            className="flex-1 bg-[#120a06]/60 border border-brass/35 rounded px-3 py-1.5 text-center text-sm font-bold tracking-widest text-brass focus:outline-none focus:border-brass placeholder:text-brass/25 placeholder:tracking-normal uppercase"
                          />
                          <button
                            type="submit"
                            disabled={isJoining}
                            className="px-4 py-1.5 bg-[#3d2314] hover:bg-[#5c3a21] border border-brass/35 text-brass text-xs font-serif font-bold rounded cursor-pointer transition active:scale-95"
                          >
                            {isJoining ? '...' : 'Join'}
                          </button>
                        </form>
                      </div>

                      {joinError && (
                        <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-semibold bg-black/35 p-2 rounded border border-red-900/30">
                          <AlertCircle size={12} />
                          <span>{joinError}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </main>

      {/* Settings Dialog Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
            <div className="wood-panel border-4 border-brass rounded-xl p-6 max-w-sm w-full shadow-2xl relative">
              <h3 className="font-serif font-bold text-lg text-brass border-b border-brass/20 pb-2 mb-4 uppercase tracking-widest">
                Edit Player Settings
              </h3>
              
              <div className="flex flex-col gap-4 mb-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-brass font-bold uppercase tracking-wider">
                    Your Persona Name
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="bg-[#120a06]/70 border border-brass/35 rounded px-3 py-2 text-brass font-bold text-sm focus:outline-none focus:border-brass"
                  />
                  <span className="text-[9px] text-ivory/50">
                    This moniker represents you at the gaming tables.
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 py-2 bg-brass hover:bg-[#d4b473] text-walnut font-serif font-bold text-xs rounded border border-brass/40 cursor-pointer transition active:scale-95"
                >
                  Save Persona
                </button>
                <button
                  onClick={() => {
                    audio.playWoodKnock();
                    setNameInput(playerName);
                    setShowSettings(false);
                  }}
                  className="flex-1 py-2 bg-walnut hover:bg-oak text-brass/70 font-serif font-bold text-xs rounded border border-brass/15 cursor-pointer transition active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
