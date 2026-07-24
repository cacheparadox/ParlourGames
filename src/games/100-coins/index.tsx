import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HelpCircle, Sparkles, Coins, CheckSquare } from 'lucide-react';
import type { GamePiece, HundredCoinsState } from './types';
import { resolveCombat, generateWager, initializeHundredCoinsState } from './utils';
import { DevicePassShield } from '../../common/DevicePassShield';
import { audio } from '../../utils/audio';

import kingImg from '../../assets/king.png';
import generalImg from '../../assets/general.png';
import knightImg from '../../assets/knight.png';
import soldierImg from '../../assets/soldier.png';
import commonerImg from '../../assets/commoner.png';
import diamondImg from '../../assets/diamond.png';


interface HundredCoinsGameProps {
  roomId?: string;
  isMultiplayer?: boolean;
  isHost?: boolean;
  playerId: string;
  opponentId?: string;
  gameState?: HundredCoinsState;
  updateGameState?: (newState: HundredCoinsState) => Promise<void>;
  players: Record<string, { uid: string; name: string; isHost: boolean; ready: boolean }>;
  onReturnHome: () => void;
}

const PIECE_ICONS: Record<GamePiece, string> = {
  king: '👑',
  general: '🎖️',
  knight: '🛡️',
  soldier: '⚔️',
  commoner: '🌾',
};

const PIECE_DESCRIPTIONS: Record<GamePiece, string> = {
  king: 'Beats General. Loses to Commoner.',
  general: 'Beats Knight. Loses to King.',
  knight: 'Beats Soldier. Loses to General.',
  soldier: 'Beats Commoner. Loses to Knight.',
  commoner: 'Beats King. Loses to Soldier.',
};

const renderDiamondSVG = (active: boolean, size: number = 14) => {
  return (
    <img 
      src={diamondImg} 
      alt="Diamond" 
      style={{ width: size, height: size }}
      className={`inline-block transition align-middle ${
        active 
          ? 'filter drop-shadow-[0_0_4px_rgba(34,211,238,0.85)] animate-pulse opacity-100' 
          : 'opacity-15'
      }`}
    />
  );
};


const renderPieceFallbackSVG = (piece: GamePiece, size: 'sm' | 'md' | 'lg' = 'md') => {
  const w = size === 'sm' ? 20 : size === 'lg' ? 44 : 32;
  const h = size === 'sm' ? 20 : size === 'lg' ? 44 : 32;
  
  if (piece === 'knight') {
    return (
      <svg viewBox="0 0 24 24" width={w} height={h} className="text-brass fill-current filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 19.9C8.25 19.78 5 15.22 5 11V6.3l7-3.11 7 3.11V11c0 4.22-3.25 8.78-7 9.9z" />
      </svg>
    );
  }
  if (piece === 'soldier') {
    return (
      <svg viewBox="0 0 24 24" width={w} height={h} className="text-brass fill-current filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
        <path d="M20.24 3.76a1 1 0 00-1.41 0l-4.5 4.5-1.83-1.83-1.41 1.41 2.34 2.34-6.86 6.87a2 2 0 00-.54 1.04l-.5 2.5a1 1 0 001.2 1.2l2.5-.5a2 2 0 001.04-.54l6.87-6.86 2.34 2.34 1.41-1.41-1.83-1.84 4.5-4.5a1 1 0 000-1.41zm-11.9 13.9l-1.4-.28.28-1.4 6.22-6.22 1.4 1.4-6.22 6.22z" />
      </svg>
    );
  }
  if (piece === 'commoner') {
    return (
      <svg viewBox="0 0 24 24" width={w} height={h} className="text-brass fill-current filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
        <path d="M12 2C11.5 3.5 10 5 9 6.5s-1 3.5-.5 5c.5.5 1 1 2 .5s1.5-1.5 2-3c.5-1.5.5-3 .5-4.5s-.5-2-1-2.5zm0 10c-.5 1.5-2 3-3 4.5s-1 3.5-.5 5c.5.5 1 1 2 .5s1.5-1.5 2-3c.5-1.5.5-3 .5-4.5s-.5-2-1-2.5zm5-6c-.5 1.5-2 3-3 4.5s-1 3.5-.5 5c.5.5 1 1 2 .5s1.5-1.5 2-3c.5-1.5.5-3 .5-4.5S17.5 6 17 6zM7 6c-.5 1.5-2 3-3 4.5s-1 3.5-.5 5c.5.5 1 1 2 .5s1.5-1.5 2-3c.5-1.5.5-3 .5-4.5S7.5 6 7 6z" />
      </svg>
    );
  }
  return <span className="text-xl">{PIECE_ICONS[piece]}</span>;
};


export const HundredCoinsGame: React.FC<HundredCoinsGameProps> = ({
  roomId: _roomId,
  isMultiplayer = false,
  isHost = false,
  playerId,
  opponentId,
  gameState: syncedGameState,
  updateGameState,
  players,
  onReturnHome,
}) => {
  const [localGameState, setLocalGameState] = useState<HundredCoinsState | null>(null);
  const [showRules, setShowRules] = useState(false);
  
  // Local state for Pass & Play turn flow
  const [isPassingDevice, setIsPassingDevice] = useState(false);
  const [pendingNextPlayer, setPendingNextPlayer] = useState<string | null>(null);
  const [activeViewingPlayer, setActiveViewingPlayer] = useState<string>('');

  // Animation lock to show reveal before resetting round
  const [isResolving, setIsResolving] = useState(false);
  const [showRevealResult, setShowRevealResult] = useState(false);
  const [roundResult, setRoundResult] = useState<any>(null);

  const pKeys = Object.keys(players);

  // Initialize local game
  useEffect(() => {
    if (!isMultiplayer) {
      const initialState = initializeHundredCoinsState(pKeys);
      setLocalGameState(initialState);
      setActiveViewingPlayer(pKeys[0]);
      audio.playWoodKnock();
    }
  }, [isMultiplayer]);

  const state = isMultiplayer ? syncedGameState : localGameState;

  useEffect(() => {
    if (isMultiplayer) {
      setActiveViewingPlayer(playerId);
    }
  }, [isMultiplayer, playerId]);

  // Sync round resolution & reveal results across both players in multiplayer
  useEffect(() => {
    if (!state) return;
    const keys = Object.keys(players);
    const p1 = keys[0];
    const p2 = keys[1];
    if (!p1 || !p2) return;

    const bothSelectedPieces = !!state.lockedPiece?.[p1] && !!state.lockedPiece?.[p2];
    const bothSelectedUpgrades = 
      state.lockedUpgrade?.[p1] !== undefined && state.lockedUpgrade?.[p1] !== null &&
      state.lockedUpgrade?.[p2] !== undefined && state.lockedUpgrade?.[p2] !== null;

    if (bothSelectedPieces && bothSelectedUpgrades) {
      const piece1 = state.lockedPiece[p1] as GamePiece;
      const upgrade1 = state.lockedUpgrade[p1] === true;
      
      const piece2 = state.lockedPiece[p2] as GamePiece;
      const upgrade2 = state.lockedUpgrade[p2] === true;

      const result = resolveCombat(piece1, upgrade1, piece2, upgrade2);
      
      let wagerWon = state.wager;
      if (result.winner === 'tie') {
        wagerWon = 0;
      }

      setRoundResult({
        piece1,
        upgrade1,
        name1: players[p1]?.name || 'Player 1',
        piece2,
        upgrade2,
        name2: players[p2]?.name || 'Player 2',
        winner: result.winner,
        resolvedA: result.resolvedA,
        resolvedB: result.resolvedB,
        description: result.description,
        wagerWon,
      });
      setShowRevealResult(true);
    } else {
      setShowRevealResult(false);
      setRoundResult(null);
      setIsResolving(false);
    }
  }, [state?.lockedPiece, state?.lockedUpgrade, state?.wager, players]);

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-brass font-serif">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brass mb-4"></div>
        Loading Tabletop...
      </div>
    );
  }

  const handleStateChange = async (nextState: HundredCoinsState) => {
    if (isMultiplayer && updateGameState) {
      await updateGameState(nextState);
    } else {
      setLocalGameState(nextState);
    }
  };

  const opponentKey = isMultiplayer ? (opponentId || '') : pKeys.find((id) => id !== activeViewingPlayer) || '';
  const currentRemainingPieces = (state.remainingPieces || {})[activeViewingPlayer] || [];
  const playerHasDiamond = !!(state.hasDiamond || {})[activeViewingPlayer];

  const lockedPieceState = state.lockedPiece || {};
  const lockedUpgradeState = state.lockedUpgrade || {};

  // Lock a piece selection
  const confirmPiece = async (piece: GamePiece) => {
    if (state.winnerId || isResolving) return;
    audio.playPiecePlace();
    
    const updatedLockedPiece = {
      ...lockedPieceState,
      [activeViewingPlayer]: piece,
    };
    
    const nextState: HundredCoinsState = {
      ...state,
      lockedPiece: updatedLockedPiece,
    };

    const p1 = pKeys[0];
    const p2 = pKeys[1];

    if (!isMultiplayer) {
      if (activeViewingPlayer === p1 && !updatedLockedPiece[p2]) {
        // Player 1 chose piece. Pass device to Player 2
        setPendingNextPlayer(p2);
        setIsPassingDevice(true);
        setActiveViewingPlayer(p2);
        await handleStateChange(nextState);
        return;
      }
      if (activeViewingPlayer === p2 && updatedLockedPiece[p1]) {
        // Both players chose their pieces!
        // Swap back to Player 1 to make the upgrade decision
        setPendingNextPlayer(p1);
        setIsPassingDevice(true);
        setActiveViewingPlayer(p1);
        await handleStateChange(nextState);
        return;
      }
    } else {
      await handleStateChange(nextState);
    }
  };

  // Lock upgrade decision and resolve if both are fully complete
  const confirmUpgrade = async (upgradeDecision: boolean) => {
    if (state.winnerId || isResolving) return;
    
    audio.playWoodKnock();
    
    const updatedLockedUpgrade = {
      ...lockedUpgradeState,
      [activeViewingPlayer]: upgradeDecision,
    };

    const nextState: HundredCoinsState = {
      ...state,
      lockedUpgrade: updatedLockedUpgrade,
    };

    const p1 = pKeys[0];
    const p2 = pKeys[1];

    if (!isMultiplayer) {
      if (activeViewingPlayer === p1 && (updatedLockedUpgrade[p2] === undefined || updatedLockedUpgrade[p2] === null)) {
        // Player 1 chose upgrade. Pass device to Player 2
        setPendingNextPlayer(p2);
        setIsPassingDevice(true);
        setActiveViewingPlayer(p2);
        await handleStateChange(nextState);
        return;
      }
    }

    const bothSelectedUpgrades = 
      updatedLockedUpgrade[p1] !== undefined && updatedLockedUpgrade[p1] !== null &&
      updatedLockedUpgrade[p2] !== undefined && updatedLockedUpgrade[p2] !== null;

    if (bothSelectedUpgrades) {
      // Both locked, resolve combat phase!
      setIsResolving(true);
      await resolveRoundCombat(nextState);
    } else {
      await handleStateChange(nextState);
    }
  };

  // Resolve combat, allocate coins, and schedule next round
  const resolveRoundCombat = async (currentState: HundredCoinsState) => {
    const p1 = pKeys[0];
    const p2 = pKeys[1];
    
    const currentLockedPiece = currentState.lockedPiece || {};
    const currentLockedUpgrade = currentState.lockedUpgrade || {};

    const piece1 = currentLockedPiece[p1] as GamePiece;
    const upgrade1 = currentLockedUpgrade[p1] === true;
    
    const piece2 = currentLockedPiece[p2] as GamePiece;
    const upgrade2 = currentLockedUpgrade[p2] === true;

    const result = resolveCombat(piece1, upgrade1, piece2, upgrade2);
    
    // Play sounds
    setTimeout(() => audio.playPiecePlace(), 200);
    setTimeout(() => audio.playCoinClink(), 700);

    const nextCoins = { ...(currentState.coins || {}) };
    let wagerWon = currentState.wager;
    let nextPot = currentState.pot;
    
    let roundText = '';

    if (result.winner === 'A') {
      nextCoins[p1] = (nextCoins[p1] || 0) + wagerWon;
      nextPot -= wagerWon;
      roundText = `Round ${currentState.round}: ${players[p1]?.name || 'Player 1'} played ${result.resolvedA.toUpperCase()}, defeating ${players[p2]?.name || 'Player 2'}'s ${result.resolvedB.toUpperCase()} to win ${wagerWon} Coins.`;
    } else if (result.winner === 'B') {
      nextCoins[p2] = (nextCoins[p2] || 0) + wagerWon;
      nextPot -= wagerWon;
      roundText = `Round ${currentState.round}: ${players[p2]?.name || 'Player 2'} played ${result.resolvedB.toUpperCase()}, defeating ${players[p1]?.name || 'Player 1'}'s ${result.resolvedA.toUpperCase()} to win ${wagerWon} Coins.`;
    } else {
      wagerWon = 0;
      roundText = `Round ${currentState.round}: Both players played ${result.resolvedA.toUpperCase()}. Tie - no coins awarded.`;
    }

    // Remove used pieces
    const currentPieces = currentState.remainingPieces || {};
    const nextPieces = {
      [p1]: (currentPieces[p1] || []).filter((p) => p !== piece1),
      [p2]: (currentPieces[p2] || []).filter((p) => p !== piece2),
    };

    // Spend Diamond if upgrade was true
    const currentDiamond = currentState.hasDiamond || {};
    const nextDiamond = {
      [p1]: upgrade1 ? false : !!currentDiamond[p1],
      [p2]: upgrade2 ? false : !!currentDiamond[p2],
    };

    // Capture results for display
    setRoundResult({
      piece1,
      upgrade1,
      name1: players[p1]?.name || 'Player 1',
      piece2,
      upgrade2,
      name2: players[p2]?.name || 'Player 2',
      winner: result.winner,
      resolvedA: result.resolvedA,
      resolvedB: result.resolvedB,
      description: result.description,
      wagerWon,
    });
    
    setShowRevealResult(true);

    // Save temporary details in current state so opponents see the reveal in online multiplayer
    const nextStateWithReveal: HundredCoinsState = {
      ...currentState,
      pot: nextPot,
      coins: nextCoins,
      remainingPieces: nextPieces,
      hasDiamond: nextDiamond,
      history: [...(currentState.history || []), roundText],
    };

    await handleStateChange(nextStateWithReveal);
  };

  // Continue to the next round (called by user clicking "Continue")
  const proceedToNextRound = async () => {
    audio.playWoodKnock();
    setShowRevealResult(false);
    setIsResolving(false);
    
    const p1 = pKeys[0];
    const p2 = pKeys[1];
    
    const currentPieces = state.remainingPieces || {};
    const currentCoins = state.coins || {};
    const currentDiamond = state.hasDiamond || {};

    // Check game over
    const allPiecesUsed = (currentPieces[p1] || []).length === 0;
    const potEmpty = state.pot <= 0;

    if (allPiecesUsed || potEmpty) {
      // Determine winner
      let winnerId: string | null = null;
      const c1 = currentCoins[p1] || 0;
      const c2 = currentCoins[p2] || 0;

      if (c1 > c2) {
        winnerId = p1;
      } else if (c2 > c1) {
        winnerId = p2;
      } else {
        // Tie break: Player still holding Diamond wins
        const d1 = currentDiamond[p1];
        const d2 = currentDiamond[p2];
        if (d1 && !d2) {
          winnerId = p1;
        } else if (d2 && !d1) {
          winnerId = p2;
        } else {
          // Absolute tie -> Trigger Replay entire match
          winnerId = 'tie';
        }
      }

      const winMessage = winnerId === 'tie'
        ? `Game Over. Absolute Tie! Replay Match.`
        : `Game Over. Winner is ${players[winnerId!]?.name || 'Winner'} with ${currentCoins[winnerId!] || 0} Coins!`;

      const nextState: HundredCoinsState = {
        ...state,
        lockedPiece: { [p1]: null, [p2]: null },
        lockedUpgrade: { [p1]: null, [p2]: null },
        winnerId,
        history: [...(state.history || []), winMessage],
      };
      
      await handleStateChange(nextState);
    } else {
      // Set up next round
      const nextWager = generateWager(state.pot);
      const nextRound = state.round + 1;
      
      const nextState: HundredCoinsState = {
        ...state,
        wager: nextWager,
        lockedPiece: { [p1]: null, [p2]: null },
        lockedUpgrade: { [p1]: null, [p2]: null },
        round: nextRound,
        history: [...(state.history || []), `Round ${nextRound} wager set to ${nextWager} Coins.`],
      };

      if (!isMultiplayer) {
        // Local: reset view back to Player 1 for selection
        setActiveViewingPlayer(p1);
      }
      
      await handleStateChange(nextState);
    }
  };

  const handleRematch = async () => {
    audio.playWoodKnock();
    const nextState = initializeHundredCoinsState(pKeys);
    await handleStateChange(nextState);
    
    // Reset view
    if (!isMultiplayer) {
      setActiveViewingPlayer(pKeys[0]);
    }
    setShowRevealResult(false);
    setIsResolving(false);
    setRoundResult(null);
  };

  const renderFacedownToken = (locked: boolean) => {
    return (
      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-brass bg-oak flex items-center justify-center shadow-xl select-none relative ${
        locked ? 'gold-glow-box' : ''
      }`}>
        <div className="absolute inset-2 border border-dashed border-brass/30 rounded-full"></div>
        {locked ? (
          <div className="flex flex-col items-center text-brass">
            <span className="text-xl sm:text-2xl">🔒</span>
            <span className="text-[9px] uppercase tracking-wider font-bold">LOCKED</span>
          </div>
        ) : (
          <span className="text-brass/45 text-2xl font-serif">P</span>
        )}
      </div>
    );
  };

  const renderPieceToken = (piece: GamePiece, upgraded: boolean, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-12 h-12 text-sm' : size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl';
    
    const pieceImages: Record<string, string> = {
      king: kingImg,
      general: generalImg,
      knight: knightImg,
      soldier: soldierImg,
      commoner: commonerImg,
    };

    const hasImg = !!pieceImages[piece];

    return (
      <div className={`${sizeClass} rounded-full border-4 border-brass bg-[#402213] text-brass flex flex-col items-center justify-center font-serif shadow-lg relative select-none hover:bg-brass hover:text-walnut transition overflow-hidden`}>
        <div className="absolute inset-1 border border-brass/25 rounded-full z-10 pointer-events-none"></div>
        
        {hasImg ? (
          <img 
            src={pieceImages[piece]} 
            alt={piece} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            {renderPieceFallbackSVG(piece, size)}
            {size === 'lg' && (
              <span className="text-[9px] uppercase font-bold tracking-tight text-center truncate px-1 mt-1">
                {piece}
              </span>
            )}
          </div>
        )}
        
        {upgraded && (
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-brass text-walnut border border-brass/80 flex items-center justify-center text-[9px] font-bold shadow animate-pulse z-20">
            ★
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-4 relative">
      <AnimatePresence>
        {isPassingDevice && pendingNextPlayer && (
          <DevicePassShield
            nextPlayerName={players[pendingNextPlayer]?.name || 'Next Player'}
            onReveal={() => {
              setIsPassingDevice(false);
              setPendingNextPlayer(null);
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
        
        {/* Left Panel: Stats and Log */}
        <div className="wood-panel p-4 rounded-xl flex flex-col justify-between border-2 border-oak/50 shadow-lg min-h-[150px] md:min-h-0">
          <div>
            <div className="flex items-center justify-between text-brass border-b border-brass/20 pb-2 mb-3">
              <span className="font-serif font-bold text-sm tracking-wide">ROUND LOG</span>
              <HelpCircle 
                size={16} 
                className="cursor-pointer hover:text-white" 
                onClick={() => setShowRules(!showRules)}
              />
            </div>
            
            <div className="overflow-y-auto max-h-28 md:max-h-[300px] flex flex-col gap-2 pr-1 text-xs font-sans text-ivory/80">
              {state.history.map((log, idx) => (
                <div key={idx} className="bg-black/20 p-2 rounded border border-brass/5 leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-brass/10 pt-3">
            <div className="bg-[#120a06]/40 p-2.5 rounded border border-brass/10 flex justify-between items-center text-xs">
              <span className="text-brass font-bold">ROUND</span>
              <span className="text-white font-serif font-bold">{state.round} / 5</span>
            </div>
            <div className="bg-[#120a06]/40 p-2.5 rounded border border-brass/10 flex justify-between items-center text-xs">
              <span className="text-brass font-bold">REMAINING POT</span>
              <span className="text-brass font-serif font-bold flex items-center gap-1">
                <Coins size={12} /> {state.pot}
              </span>
            </div>
          </div>
        </div>

        {/* Center Panel: Velvet Arena & Pot */}
        <div className="md:col-span-2 flex flex-col justify-between gap-6 py-2 px-1 relative">
          
          {/* Top: Opponent Info Row */}
          <div className="flex justify-between items-center bg-black/30 px-4 py-2 rounded-xl border border-brass/15 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-brass font-bold uppercase">
                {isMultiplayer ? (players[opponentKey]?.name || 'Opponent') : 'Opponent'}
              </span>
              <span className="text-ivory/40">({(state.remainingPieces[opponentKey] || []).length} Pieces)</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Diamond Status */}
              <div className="flex items-center gap-1.5">
                <span className="text-brass/70">Diamond:</span>
                {renderDiamondSVG(state.hasDiamond[opponentKey], 15)}
              </div>
              
              {/* Coins won */}
              <div className="flex items-center gap-1 font-serif text-brass font-bold bg-walnut/60 px-2.5 py-0.5 rounded border border-brass/25">
                <Coins size={12} /> {state.coins[opponentKey]} Coins
              </div>
            </div>
          </div>

          {/* Center Arena */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black/15 rounded-2xl border border-brass/10 p-4">
            
            {/* The Pot & Active Wager Plate */}
            <div className="bg-gradient-to-b from-[#422516] to-[#27140b] border-2 border-brass/70 rounded-xl p-3 shadow-xl max-w-xs w-full text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brass text-walnut font-serif font-bold text-[10px] px-3 py-0.5 rounded-full border border-brass/50 shadow">
                ROUND WAGER
              </div>
              <span className="text-brass font-serif text-3xl font-extrabold flex items-center justify-center gap-1.5 mt-2 tracking-wide gold-glow">
                <Coins size={24} className="animate-bounce" /> {state.wager}
              </span>
              <span className="text-[10px] text-ivory/50 block mt-1 uppercase tracking-widest">
                Coins from 100 pot
              </span>
            </div>

            {/* Combat Mats */}
            <div className="grid grid-cols-2 gap-8 w-full max-w-sm justify-items-center mt-2 relative">
              
              {/* Divider */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-16 bg-brass/20"></div>

              {/* Player 1 Selection Mat */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-brass/70 uppercase font-serif tracking-widest block">
                  {players[pKeys[0]]?.name.split(' ')[0]}
                </span>
                
                <div className="w-24 h-24 rounded-full border border-dashed border-brass/20 flex items-center justify-center">
                  {showRevealResult ? (
                    renderPieceToken((lockedPieceState[pKeys[0]] as GamePiece), (lockedUpgradeState[pKeys[0]] === true), 'lg')
                  ) : (lockedPieceState[pKeys[0]] && lockedPieceState[pKeys[1]]) ? (
                    renderPieceToken((lockedPieceState[pKeys[0]] as GamePiece), false, 'lg')
                  ) : (
                    renderFacedownToken(!!lockedPieceState[pKeys[0]])
                  )}
                </div>
                {showRevealResult && lockedPieceState[pKeys[0]] && (
                  <span className="text-[9px] text-brass font-bold uppercase font-serif tracking-wider">
                    {lockedPieceState[pKeys[0]]} {lockedUpgradeState[pKeys[0]] ? 'Lv2' : ''}
                  </span>
                )}
                {!showRevealResult && (lockedPieceState[pKeys[0]] && lockedPieceState[pKeys[1]]) && (
                  <span className="text-[9px] text-brass/70 font-bold uppercase font-serif tracking-wider">
                    {lockedPieceState[pKeys[0]]}
                  </span>
                )}
              </div>

              {/* Player 2 Selection Mat */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-brass/70 uppercase font-serif tracking-widest block">
                  {players[pKeys[1]]?.name.split(' ')[0]}
                </span>

                <div className="w-24 h-24 rounded-full border border-dashed border-brass/20 flex items-center justify-center">
                  {showRevealResult ? (
                    renderPieceToken((lockedPieceState[pKeys[1]] as GamePiece), (lockedUpgradeState[pKeys[1]] === true), 'lg')
                  ) : (lockedPieceState[pKeys[0]] && lockedPieceState[pKeys[1]]) ? (
                    renderPieceToken((lockedPieceState[pKeys[1]] as GamePiece), false, 'lg')
                  ) : (
                    renderFacedownToken(!!lockedPieceState[pKeys[1]])
                  )}
                </div>
                {showRevealResult && lockedPieceState[pKeys[1]] && (
                  <span className="text-[9px] text-brass font-bold uppercase font-serif tracking-wider">
                    {lockedPieceState[pKeys[1]]} {lockedUpgradeState[pKeys[1]] ? 'Lv2' : ''}
                  </span>
                )}
                {!showRevealResult && (lockedPieceState[pKeys[0]] && lockedPieceState[pKeys[1]]) && (
                  <span className="text-[9px] text-brass/70 font-bold uppercase font-serif tracking-wider">
                    {lockedPieceState[pKeys[1]]}
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* Bottom Player Hand & Diamond Upgrade Interface */}
          <div className="flex flex-col items-center gap-2">
            
            {/* Player details */}
            <div className="flex justify-between items-center w-full bg-black/30 px-4 py-2 rounded-xl border border-brass/15 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-brass font-bold uppercase">
                  {activeViewingPlayer === playerId ? `Your Hand: ${players[activeViewingPlayer]?.name}` : `Spectating: ${players[activeViewingPlayer]?.name}`}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Diamond status */}
                <div className="flex items-center gap-1.5">
                  <span className="text-brass/70">Your Diamond:</span>
                  {renderDiamondSVG(playerHasDiamond, 15)}
                </div>
                
                {/* Score */}
                <div className="flex items-center gap-1 font-serif text-brass font-bold bg-walnut/60 px-2.5 py-0.5 rounded border border-brass/25">
                  <Coins size={12} /> {(state.coins || {})[activeViewingPlayer] || 0} Coins
                </div>
              </div>
            </div>

            {/* Pieces selection box */}
            {!state.winnerId && !showRevealResult && (
              <div className="flex flex-col items-center gap-3 w-full mt-1.5">
                
                {/* Stage 1: Choose Base Piece */}
                {!lockedPieceState[activeViewingPlayer] ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-brass font-serif tracking-widest uppercase">
                      Select A Piece To Wage
                    </span>
                    <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
                      {currentRemainingPieces.map((piece) => (
                        <button
                          key={piece}
                          onClick={() => confirmPiece(piece)}
                          className="flex flex-col items-center gap-1.5 active:scale-95 transition focus:outline-none cursor-pointer"
                          title={PIECE_DESCRIPTIONS[piece]}
                        >
                          {renderPieceToken(piece, false, 'md')}
                          <span className="text-[9px] text-brass/80 font-bold uppercase font-serif tracking-wider">
                            {piece}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (lockedPieceState[pKeys[0]] && lockedPieceState[pKeys[1]] && (lockedUpgradeState[activeViewingPlayer] === undefined || lockedUpgradeState[activeViewingPlayer] === null)) ? (
                  
                  /* Stage 2: Choose Diamond Upgrade Stage */
                  <div className="wood-panel border border-brass/40 p-4 rounded-xl max-w-sm w-full text-center flex flex-col items-center gap-3 animate-fade-in">
                    <span className="text-xs text-brass font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-brass animate-pulse" /> DIAMOND UPGRADE DECISION
                    </span>
                    <p className="text-[10px] text-ivory/70 leading-normal">
                      Upgrade <strong className="text-brass uppercase">{lockedPieceState[activeViewingPlayer]}</strong>?
                      {lockedPieceState[activeViewingPlayer] === 'king' 
                        ? ' King becomes King Lv2. Only Commoner Lv2 can defeat King Lv2!'
                        : ` Advances piece one tier higher in the hierarchy.`}
                    </p>
                    
                    {playerHasDiamond ? (
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={() => confirmUpgrade(true)}
                          className="flex-1 py-2 bg-brass hover:bg-[#d4b473] text-walnut font-serif font-bold text-xs rounded border border-brass/40 transition active:scale-95 cursor-pointer uppercase flex items-center justify-center gap-1"
                        >
                          Yes (Spend {renderDiamondSVG(true, 12)})
                        </button>
                        <button
                          onClick={() => confirmUpgrade(false)}
                          className="flex-1 py-2 bg-walnut hover:bg-oak text-brass font-serif font-bold text-xs rounded border border-brass/25 transition active:scale-95 cursor-pointer uppercase"
                        >
                          No (Keep Diamond)
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => confirmUpgrade(false)}
                        className="w-full py-2 bg-brass/15 border border-brass/40 text-brass font-serif font-bold text-xs rounded cursor-pointer uppercase"
                      >
                        Confirm Choice (No Diamond Available)
                      </button>
                    )}
                  </div>
                ) : (
                  /* Stage 3: Locked decision, waiting for opponent */
                  <div className="text-center py-4 text-brass font-serif text-xs animate-pulse">
                    Locked Selection & Upgrade Decision. Waiting for opponent...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Game Prompts and Results */}
        <div className="wood-panel p-4 rounded-xl flex flex-col justify-between border-2 border-oak/50 shadow-lg">
          <div>
            <div className="text-brass border-b border-brass/20 pb-2 mb-3 text-center">
              <span className="font-serif font-bold text-sm tracking-wide uppercase">COMBAT STATUS</span>
            </div>

            {/* Waiting status / locks indicators */}
            {!state.winnerId && !showRevealResult && (
              <div className="flex flex-col gap-3">
                {pKeys.map((pId) => {
                  const name = players[pId]?.name || 'Player';
                  const isLocked = !!lockedPieceState[pId];
                  return (
                    <div
                      key={pId}
                      className={`p-2.5 rounded border flex items-center justify-between text-xs font-semibold ${
                        isLocked
                          ? 'bg-brass/10 border-brass/20 text-brass'
                          : 'bg-black/35 border-white/5 text-ivory/55'
                      }`}
                    >
                      <span>{name}</span>
                      <span className="flex items-center gap-1">
                        {isLocked ? (
                          <>
                            <CheckSquare size={13} /> Locked
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-ivory/30 animate-ping"></div> Selecting
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reveal Result block */}
            {showRevealResult && roundResult && (
              <div className="bg-[#120a06]/85 border border-brass/50 rounded-xl p-3.5 shadow-2xl flex flex-col gap-3">
                <div className="text-center">
                  <span className="text-brass font-serif font-extrabold text-[11px] tracking-wider uppercase block mb-1">
                    Round Resolved!
                  </span>
                  <div className="w-12 h-0.5 bg-brass/35 mx-auto mb-2"></div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-ivory/80 leading-normal">
                  <div className="flex justify-between">
                    <span className="font-semibold text-brass/80 truncate max-w-[100px]">{roundResult.name1.split(' ')[0]}:</span>
                    <span className="uppercase text-right flex items-center gap-1">
                      {PIECE_ICONS[roundResult.piece1 as GamePiece]} {roundResult.piece1} {roundResult.upgrade1 ? renderDiamondSVG(true, 12) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-brass/80 truncate max-w-[100px]">{roundResult.name2.split(' ')[0]}:</span>
                    <span className="uppercase text-right flex items-center gap-1">
                      {PIECE_ICONS[roundResult.piece2 as GamePiece]} {roundResult.piece2} {roundResult.upgrade2 ? renderDiamondSVG(true, 12) : ''}
                    </span>
                  </div>
                </div>

                <div className="bg-black/30 p-2 rounded border border-brass/10 text-[10px] text-center text-ivory/85 leading-relaxed">
                  {roundResult.description}
                </div>

                {/* Confirm continue button */}
                {(!isMultiplayer || (isMultiplayer && isHost)) ? (
                  <button
                    onClick={proceedToNextRound}
                    className="w-full py-2 bg-brass hover:bg-[#d4b473] text-walnut font-serif font-bold text-xs rounded uppercase font-serif border border-brass/50 cursor-pointer shadow active:scale-95 transition"
                  >
                    Continue Match
                  </button>
                ) : (
                  <div className="text-center text-[10px] text-brass animate-pulse italic mt-1">
                    Waiting for host to continue...
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {state.winnerId ? (
              <div className="bg-[#120a06]/90 border-2 border-brass/70 rounded-lg p-3 text-center shadow-2xl">
                <span className="text-brass font-serif font-bold text-xs tracking-wider uppercase block mb-1">
                  Match Finished!
                </span>
                
                <p className="text-xs font-semibold text-white mb-2.5 leading-relaxed">
                  {state.winnerId === 'tie' ? (
                    "Absolute Draw! No coin/diamond tie-breaker settled."
                  ) : (
                    <>
                      🏆 {players[state.winnerId]?.name} Wins<br />
                      <span className="text-[10px] text-brass/75 font-normal">
                        ({(state.coins || {})[state.winnerId] || 0} Coins)
                      </span>
                    </>
                  )}
                </p>
                
                <button
                  onClick={handleRematch}
                  className="w-full py-2 bg-brass hover:bg-[#d4b473] text-walnut font-bold text-xs rounded uppercase tracking-wider font-serif border border-brass/40 cursor-pointer transition active:scale-95"
                >
                  Rematch
                </button>
              </div>
            ) : (
              <button
                onClick={onReturnHome}
                className="w-full py-2 bg-walnut hover:bg-oak text-brass/80 hover:text-brass text-xs rounded uppercase tracking-wider font-serif border border-brass/25 cursor-pointer transition active:scale-95"
              >
                Quit Match
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Rules overlay modal */}
      {showRules && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="wood-panel border-4 border-brass rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="font-serif font-bold text-lg text-brass uppercase border-b border-brass/20 pb-2 mb-3">
              100 Coins Rules
            </h3>
            
            <div className="overflow-y-auto max-h-60 text-xs leading-relaxed text-ivory/80 flex flex-col gap-3 mb-4 pr-1">
              <p>
                <strong>Goal:</strong> Complete the game with more coins than your opponent.
              </p>
              
              <div>
                <strong className="text-brass">Combat Order:</strong>
                <p className="mt-0.5 font-semibold text-white/95">
                  King 👑 &gt; General 🎖️ &gt; Knight 🛡️ &gt; Soldier ⚔️ &gt; Commoner 🌾 &gt; King 👑
                </p>
              </div>

              <div>
                <strong className="text-brass">Diamond Upgrades (Single Use):</strong>
                <ul className="list-disc pl-4 mt-0.5 flex flex-col gap-1">
                  <li>Upgraded King becomes King Lv2. Only Commoner Lv2 beats King Lv2!</li>
                  <li>Other pieces advance one tier: Commoner ➔ Commoner Lv2, Soldier ➔ Knight, Knight ➔ General, General ➔ King.</li>
                </ul>
              </div>

              <div>
                <strong className="text-brass">Rounds:</strong>
                <p className="mt-0.5">
                  Each round generates a random wager from 10 to Min(30, Pot). Selections are secret until revealed.
                </p>
              </div>

              <div>
                <strong className="text-brass">Tie Breaker:</strong>
                <p className="mt-0.5">
                  If coins are equal at the end of 5 rounds, the player who still possesses their Diamond wins.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full py-2 bg-brass hover:bg-[#d4b473] text-walnut font-bold text-xs rounded uppercase font-serif cursor-pointer"
            >
              Back to Table
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
