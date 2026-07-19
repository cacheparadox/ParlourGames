import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Shield, Play } from 'lucide-react';
import { subscribeToRoom, updateRoom } from '../firebase/db';
import { getGameConfig } from '../games/registry';
import { useAppStore } from '../stores/useAppStore';
import { Tabletop } from '../common/Tabletop';
import { audio } from '../utils/audio';

export const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { playerUid, playerName, initializeUser } = useAppStore();

  const [roomData, setRoomData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Local Pass & Play names state
  const [namesConfirmed, setNamesConfirmed] = useState(false);
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('Chamber Companion');

  // Sync state name with store name on load
  useEffect(() => {
    if (playerName && !p1Name) {
      setP1Name(playerName);
    }
  }, [playerName]);

  // Authenticate user on load if not already done
  useEffect(() => {
    initializeUser();
  }, []);

  const isLocal = roomId?.startsWith('local-');
  const localGameId = isLocal ? roomId?.replace('local-', '') : null;
  const gameConfig = getGameConfig(isLocal ? localGameId || '' : roomData?.gameType || '');

  // Subscribing to Room updates (Online only)
  useEffect(() => {
    if (isLocal || !roomId || !playerUid) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToRoom(roomId, (data) => {
      setIsLoading(false);
      if (!data) {
        setError("Room does not exist or has been deleted.");
        return;
      }
      setRoomData(data);
    });

    return () => unsubscribe();
  }, [roomId, playerUid, isLocal]);

  if (isLoading) {
    return (
      <Tabletop title="PARLOUR" onReturnHome={() => navigate('/')}>
        <div className="flex flex-col items-center justify-center flex-1 text-brass font-serif">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brass mb-4"></div>
          Connecting to Room...
        </div>
      </Tabletop>
    );
  }

  if (error || (!isLocal && !roomData)) {
    return (
      <Tabletop title="PARLOUR" onReturnHome={() => navigate('/')}>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <div className="text-red-500 text-3xl">⚠️</div>
          <h2 className="font-serif font-bold text-xl text-brass">Room Connection Failed</h2>
          <p className="text-xs text-ivory/60 max-w-xs mx-auto leading-relaxed">
            {error || "The room code you entered could not be resolved."}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 px-6 py-2 bg-brass text-walnut font-serif font-bold rounded shadow-lg active:scale-95 cursor-pointer uppercase text-xs tracking-wider"
          >
            Return to Parlour
          </button>
        </div>
      </Tabletop>
    );
  }

  // --- Local Pass & Play Match ---
  if (isLocal) {
    if (!gameConfig) {
      return (
        <Tabletop title="PARLOUR" onReturnHome={() => navigate('/')}>
          <div className="text-center text-brass py-12">Game config not found.</div>
        </Tabletop>
      );
    }

    if (!namesConfirmed) {
      return (
        <Tabletop
          title={gameConfig.name}
          feltColor={gameConfig.id === 'black-card' ? 'green' : 'burgundy'}
          onReturnHome={() => navigate('/')}
        >
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="wood-panel border-4 border-brass rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
              {/* Ornate corner brass accents */}
              <div className="absolute top-1.5 left-1.5 w-3 h-3 rounded-full bg-brass opacity-60"></div>
              <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-brass opacity-60"></div>
              <div className="absolute bottom-1.5 left-1.5 w-3 h-3 rounded-full bg-brass opacity-60"></div>
              <div className="absolute bottom-1.5 right-1.5 w-3 h-3 rounded-full bg-brass opacity-60"></div>

              <h3 className="font-serif font-extrabold text-xl text-brass mb-2 uppercase tracking-widest">
                Pass & Play Setup
              </h3>
              <p className="text-xs text-ivory/60 mb-6 leading-relaxed font-sans">
                Input the monikers of the players who will sit at this parlor table.
              </p>

              <div className="flex flex-col gap-4 mb-6 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-brass font-bold uppercase tracking-wider">
                    Player 1 Name
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                    className="bg-[#120a06]/70 border border-brass/30 rounded px-3 py-2 text-brass font-bold text-sm focus:outline-none focus:border-brass"
                    placeholder="Player 1"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-brass font-bold uppercase tracking-wider">
                    Player 2 Name
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    className="bg-[#120a06]/70 border border-brass/30 rounded px-3 py-2 text-brass font-bold text-sm focus:outline-none focus:border-brass"
                    placeholder="Player 2"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  audio.playCoinClink();
                  setNamesConfirmed(true);
                }}
                className="w-full py-2.5 bg-brass hover:bg-[#d4b473] text-walnut font-serif font-extrabold text-sm rounded border border-brass/40 cursor-pointer shadow-lg active:scale-95 transition uppercase tracking-wider"
              >
                Begin Match
              </button>
            </div>
          </div>
        </Tabletop>
      );
    }

    const localPlayers = {
      player1: { uid: 'player1', name: p1Name || 'Player 1', isHost: true, ready: true },
      player2: { uid: 'player2', name: p2Name || 'Player 2', isHost: false, ready: true },
    };

    const GameComponent = gameConfig.component;

    return (
      <Tabletop
        title={gameConfig.name}
        feltColor={gameConfig.id === 'black-card' ? 'green' : 'burgundy'}
        onReturnHome={() => navigate('/')}
      >
        <GameComponent
          playerId="player1"
          players={localPlayers}
          onReturnHome={() => navigate('/')}
        />
      </Tabletop>
    );
  }

  // --- Online Multiplayer Match ---
  const roomPlayers = roomData.players || {};
  const pIds = Object.keys(roomPlayers);
  const isHost = roomData.hostId === playerUid;
  const myPlayerData = roomPlayers[playerUid];
  const isReady = myPlayerData?.ready || false;

  const opponentId = pIds.find((id) => id !== playerUid);

  const handleToggleReady = async () => {
    audio.playCoinClink();
    const nextPlayers = {
      ...roomPlayers,
      [playerUid]: {
        ...myPlayerData,
        ready: !isReady,
      },
    };
    await updateRoom(roomId!, { players: nextPlayers });
  };

  const handleStartGame = async () => {
    if (!gameConfig) return;
    audio.playWoodKnock();

    const initialGameState = gameConfig.initializeState(pIds);
    await updateRoom(roomId!, {
      status: 'playing',
      game: initialGameState,
    });
  };

  const handleUpdateGameState = async (nextGameState: any) => {
    await updateRoom(roomId!, { game: nextGameState });
  };

  const handleReturnHome = () => {
    audio.playWoodKnock();
    navigate('/');
  };

  // 1. Waiting/Lobby Screen
  if (roomData.status === 'waiting') {
    const allReady = pIds.length === 2 && pIds.every((id) => roomPlayers[id].ready);

    return (
      <Tabletop title="Lobby Room" onReturnHome={handleReturnHome}>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="wood-panel border-4 border-brass rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col gap-6 text-center">
            
            {/* Room Code Plate */}
            <div>
              <span className="text-[10px] text-brass/70 uppercase font-serif tracking-widest block mb-1">
                Lobby Code
              </span>
              <div className="bg-[#120a06]/80 px-6 py-3 rounded-lg border-2 border-brass/50 inline-block shadow-inner">
                <h2 className="font-serif font-black text-3xl sm:text-4xl text-brass tracking-widest select-all">
                  {roomId}
                </h2>
              </div>
              <span className="text-[9px] text-ivory/50 block mt-2">
                Share this code with your opponent.
              </span>
            </div>

            {/* Players Clipboard list */}
            <div className="flex flex-col gap-3 bg-black/20 p-4 rounded-xl border border-brass/10 text-left">
              <span className="text-[10px] font-bold text-brass uppercase tracking-wider flex items-center gap-1">
                <Users size={12} /> Guest Register ({pIds.length}/2)
              </span>
              
              <div className="flex flex-col gap-2 mt-1">
                {pIds.map((pId) => {
                  const p = roomPlayers[pId];
                  return (
                    <div
                      key={pId}
                      className="flex items-center justify-between p-2 rounded bg-walnut/40 border border-brass/10 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {p.isHost ? (
                          <Shield size={12} className="text-brass flex-shrink-0" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-brass/35 flex-shrink-0"></div>
                        )}
                        <span className="font-bold text-white truncate">{p.name}</span>
                        {pId === playerUid && (
                          <span className="text-[9px] text-brass font-bold">(You)</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.ready 
                            ? 'bg-brass text-walnut' 
                            : 'bg-black/30 text-ivory/40'
                        }`}>
                          {p.ready ? 'READY' : 'WAITING'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {pIds.length < 2 && (
                  <div className="text-center p-3 text-[10px] text-ivory/40 italic animate-pulse">
                    Waiting for opponent to join...
                  </div>
                )}
              </div>
            </div>

            {/* Player Lobby Control buttons */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={handleToggleReady}
                className={`w-full py-3 font-serif font-bold text-xs uppercase tracking-wider rounded-lg border transition active:scale-95 cursor-pointer shadow-md ${
                  isReady
                    ? 'bg-walnut border-brass/40 text-brass hover:bg-oak'
                    : 'bg-brass border-brass/80 text-walnut hover:bg-[#d4b473]'
                }`}
              >
                {isReady ? '✓ You Are Ready' : 'Confirm Ready'}
              </button>

              {isHost && (
                <button
                  disabled={!allReady}
                  onClick={handleStartGame}
                  className={`w-full py-2.5 font-serif font-bold text-xs uppercase tracking-wider rounded border shadow flex items-center justify-center gap-1.5 transition ${
                    allReady
                      ? 'bg-brass text-walnut border-brass/80 hover:bg-[#d4b473] active:scale-95 cursor-pointer'
                      : 'bg-walnut/50 border-white/5 text-brass/30 cursor-not-allowed'
                  }`}
                >
                  <Play size={12} /> Start Match
                </button>
              )}
            </div>

          </div>
        </div>
      </Tabletop>
    );
  }

  // 2. Playing Screen
  if (roomData.status === 'playing' && gameConfig) {
    const GameComponent = gameConfig.component;
    return (
      <Tabletop
        title={gameConfig.name}
        feltColor={gameConfig.id === 'black-card' ? 'green' : 'burgundy'}
        onReturnHome={handleReturnHome}
        extraHeaderActions={
          <div className="text-[10px] text-brass/70 bg-walnut/60 py-1.5 px-3 rounded border border-brass/15 select-all hidden sm:block">
            ROOM: {roomId}
          </div>
        }
      >
        <GameComponent
          roomId={roomId}
          isMultiplayer={true}
          isHost={isHost}
          playerId={playerUid}
          opponentId={opponentId}
          gameState={roomData.game}
          updateGameState={handleUpdateGameState}
          players={roomPlayers}
          onReturnHome={handleReturnHome}
        />
      </Tabletop>
    );
  }

  // 3. Finished / Terminated state
  return (
    <Tabletop title="Match Over" onReturnHome={handleReturnHome}>
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <div className="wood-panel border-4 border-brass rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col gap-4">
          <h2 className="font-serif font-bold text-xl text-brass">Match Concluded</h2>
          <p className="text-xs text-ivory/60 leading-relaxed">
            The game session has ended or a player disconnected.
          </p>
          <button
            onClick={handleReturnHome}
            className="mt-2 w-full py-3 bg-brass text-walnut font-serif font-bold rounded-lg border border-brass/40 shadow-lg active:scale-95 cursor-pointer uppercase text-xs tracking-wider"
          >
            Return to Parlour
          </button>
        </div>
      </div>
    </Tabletop>
  );
};
