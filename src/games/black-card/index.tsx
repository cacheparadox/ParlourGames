import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Sparkles, Check, EyeOff } from 'lucide-react';
import type { Card, CardSuit, BlackCardState } from './types';
import { SUITS, SUIT_SYMBOLS, SUIT_NAMES, initializeBlackCardState } from './utils';
import { DevicePassShield } from '../../common/DevicePassShield';
import { audio } from '../../utils/audio';

import cardBack from '../../assets/card-back.png';
import devilImg from '../../assets/devil.png';
import heartImg from '../../assets/heart.png';
import spadeImg from '../../assets/spade.png';
import diamondImg from '../../assets/diamond-suit.png';
import clubImg from '../../assets/club.png';

const renderSuitSymbol = (suit: CardSuit, className: string = "w-[1em] h-[1em]") => {
  if (suit === 'devil') {
    return (
      <svg viewBox="0 0 24 24" className={`${className} inline-block fill-current align-middle -mt-0.5`}>
        <path d="M12 2C11.5 3.5 10 5 9 5.5s-1 1.5-.5 3c.5.5 1 .5 2 0s1.5-1.5 2-3c.5-1.5.5-2.5.5-3.5zm0 0c.5 1.5 2 3 3 3.5s1 1.5.5 3c-.5.5-1 .5-2 0s-1.5-1.5-2-3c-.5-1.5-.5-2.5-.5-3.5zM12 8c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm-3 8c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm6 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm-3 4c-2.2 0-4-1.8-4-4h8c0 2.2-1.8 4-4 4z" />
      </svg>
    );
  }
  return <span>{SUIT_SYMBOLS[suit]}</span>;
};


interface BlackCardGameProps {
  roomId?: string;
  isMultiplayer?: boolean;
  isHost?: boolean;
  playerId: string; // Current user's player ID ('player1'/'player2' for local, UID for online)
  opponentId?: string;
  gameState?: BlackCardState;
  updateGameState?: (newState: BlackCardState) => Promise<void>;
  players: Record<string, { uid: string; name: string; isHost: boolean; ready: boolean }>;
  onReturnHome: () => void;
}

export const BlackCardGame: React.FC<BlackCardGameProps> = ({
  roomId: _roomId,
  isMultiplayer = false,
  isHost: _isHost = false,
  playerId,
  opponentId,
  gameState: syncedGameState,
  updateGameState,
  players,
  onReturnHome,
}) => {
  // Local state for Pass & Play
  const [localGameState, setLocalGameState] = useState<BlackCardState | null>(null);
  const [showRules, setShowRules] = useState(false);
  
  // Selection for first-turn reveal
  const [selectedCards, setSelectedCards] = useState<Record<string, boolean>>({});
  
  // Pass & Play device swap shield state
  const [isPassingDevice, setIsPassingDevice] = useState(false);
  const [pendingNextPlayer, setPendingNextPlayer] = useState<string | null>(null);
  const [showCurrentPlayerHand, setShowCurrentPlayerHand] = useState(true);

  // Initialize Local game state
  useEffect(() => {
    if (!isMultiplayer) {
      const playerIds = Object.keys(players);
      const initialState = initializeBlackCardState(playerIds);
      setLocalGameState(initialState);
      audio.playWoodKnock();
    }
  }, [isMultiplayer, players]);

  // Read current active state
  const state = isMultiplayer ? syncedGameState : localGameState;

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-brass font-serif">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brass mb-4"></div>
        Loading Tabletop...
      </div>
    );
  }

  const pKeys = Object.keys(players);
  const activePlayerId = state.turnPlayerId;
  const activePlayerName = players[activePlayerId]?.name || 'Unknown';
  
  // For Pass & Play, we check if the user viewing the screen is the active player.
  // In online mode, playerId is always the local user.
  const isMyTurn = isMultiplayer ? (playerId === activePlayerId) : true;
  const currentHand = state.hands[activePlayerId] || [];

  const handleStateChange = async (nextState: BlackCardState) => {
    if (isMultiplayer && updateGameState) {
      await updateGameState(nextState);
    } else {
      setLocalGameState(nextState);
    }
  };

  // Toggle card selection for first turn action
  const toggleSelectCard = (cardId: string) => {
    if (state.firstTurnSwapped[activePlayerId]) return;
    audio.playCardSlide();
    setSelectedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Confirm reveal action
  const handleSwapReveal = async () => {
    const hand = state.hands[activePlayerId] || [];
    const cardsToReveal = hand.filter((c) => selectedCards[c.id]);
    const remainingHand = hand.filter((c) => !selectedCards[c.id]);

    const deck = [...(state as any).deck];
    const replacements: Card[] = [];
    
    // Draw replacements
    for (let i = 0; i < cardsToReveal.length; i++) {
      if (deck.length > 0) {
        replacements.push(deck.pop()!);
      }
    }

    const updatedRevealed = [
      ...state.revealedCards,
      ...cardsToReveal.map((c) => ({ ...c, ownerName: activePlayerName })),
    ];
    const updatedHand = [...remainingHand, ...replacements];

    const nextHands = {
      ...state.hands,
      [activePlayerId]: updatedHand,
    };

    const nextSwapped = {
      ...state.firstTurnSwapped,
      [activePlayerId]: true,
    };

    const actionText = cardsToReveal.length > 0 
      ? `${activePlayerName} swap-revealed ${cardsToReveal.length} cards (${cardsToReveal.map(c => SUIT_SYMBOLS[c.suit]).join(', ')})`
      : `${activePlayerName} kept all cards hidden.`;

    const updatedHistory = [...state.history, actionText];

    const nextState: BlackCardState = {
      ...state,
      deck,
      deckSize: deck.length,
      hands: nextHands,
      revealedCards: updatedRevealed as any,
      firstTurnSwapped: nextSwapped,
      history: updatedHistory,
    };

    setSelectedCards({});
    audio.playWoodKnock();
    await handleStateChange(nextState);
  };

  // Handle suit guess
  const handleGuessSuit = async (suit: CardSuit) => {
    if (state.winnerId) return;

    audio.playCoinClink();
    
    // Check if correct
    const isCorrect = (state as any).blackCardSuit === suit;

    if (isCorrect) {
      const nextState: BlackCardState = {
        ...state,
        winnerId: activePlayerId,
        history: [...state.history, `🎉 ${activePlayerName} correctly identified the Black Card as ${SUIT_NAMES[suit]} ${SUIT_SYMBOLS[suit]}!`],
      };
      await handleStateChange(nextState);
    } else {
      // Eliminate suit
      const nextEliminated = [...state.eliminatedSuits, suit];
      const nextHistory = [...state.history, `❌ ${activePlayerName} guessed ${SUIT_NAMES[suit]} ${SUIT_SYMBOLS[suit]} (Incorrect - Suit Eliminated)`];

      // Determine next player
      const activeIdx = pKeys.indexOf(activePlayerId);
      const nextPlayerId = pKeys[(activeIdx + 1) % pKeys.length];

      const nextState: BlackCardState = {
        ...state,
        eliminatedSuits: nextEliminated,
        history: nextHistory,
        turnPlayerId: nextPlayerId,
      };

      if (!isMultiplayer) {
        // Trigger pass screen
        setPendingNextPlayer(nextPlayerId);
        setIsPassingDevice(true);
        setShowCurrentPlayerHand(false);
      }
      
      await handleStateChange(nextState);
    }
  };

  const handleRematch = async () => {
    audio.playWoodKnock();
    const nextState = initializeBlackCardState(pKeys);
    await handleStateChange(nextState);
    setShowCurrentPlayerHand(true);
    setIsPassingDevice(false);
    setPendingNextPlayer(null);
  };

  const renderCardFace = (suit: CardSuit) => {
    const suitImages: Record<CardSuit, string> = {
      heart: heartImg,
      spade: spadeImg,
      diamond: diamondImg,
      club: clubImg,
      devil: devilImg,
    };

    return (
      <div className="w-full h-full bg-gradient-to-b from-[#141211] to-[#0c0a09] rounded-xl flex flex-col justify-between p-2 sm:p-3 border-2 border-brass/75 shadow-[inset_0_2px_8px_rgba(0,0,0,0.85)] relative text-left">
        {/* Ornate corner indices */}
        <div className="flex justify-between items-start leading-none font-serif text-sm text-brass">
          <div className="flex flex-col items-center">
            <span className="text-xs sm:text-sm">{renderSuitSymbol(suit, "w-3 h-3 sm:w-3.5 sm:h-3.5")}</span>
          </div>
          <div className="text-[10px] text-brass/80 font-bold opacity-30 select-none">P</div>
        </div>

        {/* Center art */}
        <div className="flex-1 flex items-center justify-center p-1 overflow-hidden">
          <img 
            src={suitImages[suit]} 
            alt={suit} 
            className="max-h-16 sm:max-h-24 w-auto object-contain opacity-95 rounded-md filter drop-shadow-[0_0_8px_rgba(212,180,115,0.35)]"
          />
        </div>

        {/* Bottom Index */}
        <div className="flex justify-between items-end leading-none font-serif text-sm rotate-180 text-brass">
          <div className="flex flex-col items-center font-bold">
            <span className="text-xs sm:text-sm">{renderSuitSymbol(suit, "w-3 h-3 sm:w-3.5 sm:h-3.5")}</span>
          </div>
          <div className="text-[10px] text-brass/80 font-bold opacity-30 select-none">P</div>
        </div>
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
              setShowCurrentPlayerHand(true);
              setPendingNextPlayer(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Grid: Info/History (Left) | Play Area (Center) | Control Panel (Right) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
        
        {/* Left Side: Game Info & Log History */}
        <div className="wood-panel p-4 rounded-xl flex flex-col justify-between border-2 border-oak/50 shadow-lg min-h-[160px] md:min-h-0">
          <div>
            <div className="flex items-center justify-between text-brass border-b border-brass/20 pb-2 mb-3">
              <span className="font-serif font-bold text-sm tracking-wide">MATCH HISTORY</span>
              <HelpCircle 
                size={16} 
                className="cursor-pointer hover:text-white" 
                onClick={() => setShowRules(!showRules)}
              />
            </div>
            
            <div className="overflow-y-auto max-h-32 md:max-h-[300px] flex flex-col gap-2 pr-1 text-xs font-sans text-ivory/80">
              {state.history.map((log, idx) => (
                <div key={idx} className="bg-black/20 p-2 rounded border border-brass/5 leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 bg-[#120a06]/40 p-2.5 rounded border border-brass/10 text-xs">
            <span className="font-bold text-brass block mb-1">DECK SIZE</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-7 bg-brass/25 rounded border border-brass/45 flex items-center justify-center font-bold text-brass">
                {state.deckSize}
              </div>
              <span className="text-ivory/60">cards remaining</span>
            </div>
          </div>
        </div>

        {/* Center: Tabletop Playing Felt */}
        <div className="md:col-span-2 flex flex-col justify-between gap-6 py-2 px-1 relative">
          
          {/* Top: Opponent Card Outline */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-brass font-bold uppercase tracking-wider bg-black/30 px-3 py-1 rounded-full border border-brass/15">
              {isMultiplayer ? (players[opponentId || '']?.name || 'Opponent') : 'Opponent Hands'}
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-16 h-24 sm:w-20 sm:h-30 rounded-xl overflow-hidden shadow-lg border border-black/40 relative bg-[#1c1008]"
                  initial={{ rotateY: 0 }}
                >
                  <img src={cardBack} alt="Card Back" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/10"></div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Center: Revealed Swap Pile & Eliminated Suits */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4 min-h-[160px] bg-black/10 rounded-2xl border border-brass/5">
            <div className="text-center">
              <span className="text-xs font-serif text-brass/70 tracking-widest uppercase block mb-2">
                Revealed Cards
              </span>
              {state.revealedCards.length === 0 ? (
                <p className="text-ivory/40 text-xs italic">No cards revealed yet</p>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  {state.revealedCards.map((c: any, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-14 h-20 sm:w-16 sm:h-24">
                        {renderCardFace(c.suit)}
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-walnut text-[9px] text-brass px-1 rounded shadow border border-brass/20 scale-90 select-none whitespace-nowrap">
                        {c.ownerName ? c.ownerName.split(' ')[0] : 'Revealed'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full max-w-xs border-t border-brass/10 pt-3 text-center">
              <span className="text-xs font-serif text-brass/70 tracking-widest uppercase block mb-2">
                Eliminated Suits
              </span>
              <div className="flex justify-center gap-3">
                {SUITS.map((suit) => {
                  const isEliminated = state.eliminatedSuits.includes(suit);
                  return (
                    <div
                      key={suit}
                      className={`text-xl sm:text-2xl w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition relative ${
                        isEliminated
                          ? 'bg-black/40 border-red-900/30 text-red-700 opacity-40 line-through'
                          : 'bg-brass/5 border-brass/25 text-brass'
                      }`}
                    >
                      {renderSuitSymbol(suit, "w-5 h-5")}
                      {isEliminated && (
                        <div className="absolute inset-0 flex items-center justify-center text-red-600 font-bold text-lg">
                          ✕
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom: Player Hand */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-brass font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="bg-black/30 px-3 py-1 rounded-full border border-brass/15">
                {isMyTurn ? `Your Hand: ${activePlayerName}` : `Spectating: ${activePlayerName}`}
              </span>
            </div>

            <div className="flex justify-center gap-3">
              {showCurrentPlayerHand ? (
                currentHand.map((card) => {
                  const isSelected = selectedCards[card.id];
                  const hasSwapped = state.firstTurnSwapped[activePlayerId];
                  return (
                    <motion.div
                      key={card.id}
                      onClick={() => !hasSwapped && isMyTurn && toggleSelectCard(card.id)}
                      className={`w-20 h-30 sm:w-24 sm:h-36 rounded-xl cursor-pointer shadow-xl relative overflow-hidden transition ${
                        isSelected ? 'ring-4 ring-brass -translate-y-3' : 'hover:-translate-y-1'
                      } ${hasSwapped ? 'cursor-default' : 'active:scale-95'}`}
                      whileHover={!hasSwapped && isMyTurn ? { scale: 1.05 } : {}}
                    >
                      {renderCardFace(card.suit)}
                      {!hasSwapped && isMyTurn && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full border border-brass/40 flex items-center justify-center bg-black/40 text-brass">
                          {isSelected ? <Check size={12} className="stroke-[3]" /> : null}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                // Screen hidden placeholders during devices passing
                [0, 1, 2].map((i) => (
                  <div key={i} className="w-20 h-30 sm:w-24 sm:h-36 rounded-xl border border-brass/25 bg-[#120a06] flex items-center justify-center text-brass/20">
                    <EyeOff size={24} />
                  </div>
                ))
              )}
            </div>
            
            {/* Show Action Prompt for First Turn Special Action */}
            {!state.firstTurnSwapped[activePlayerId] && isMyTurn && (
              <div className="mt-3 flex flex-col items-center gap-2 bg-black/30 p-3 rounded-lg border border-brass/20 max-w-sm text-center">
                <span className="text-xs text-brass font-bold flex items-center gap-1">
                  <Sparkles size={12} /> FIRST TURN ACTION: SWAP & REVEAL
                </span>
                <p className="text-[10px] text-ivory/70 leading-normal">
                  Select 0 to 3 cards to permanently reveal on the table and replace with hidden cards. Can only be done once.
                </p>
                <button
                  onClick={handleSwapReveal}
                  className="px-4 py-1.5 bg-brass hover:bg-[#d4b473] text-walnut font-bold text-xs rounded border border-brass/50 transition cursor-pointer"
                >
                  Confirm (Swap {Object.values(selectedCards).filter(Boolean).length})
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Guess Panel & Actions */}
        <div className="wood-panel p-4 rounded-xl flex flex-col justify-between border-2 border-oak/50 shadow-lg">
          <div>
            <div className="text-brass border-b border-brass/20 pb-2 mb-3 text-center">
              <span className="font-serif font-bold text-sm tracking-wide uppercase">GUESS THE BLACK CARD</span>
            </div>

            {/* Turn Status Alert */}
            {!state.winnerId && (
              <div className={`p-2 rounded text-center text-xs font-semibold mb-4 border ${
                isMyTurn 
                  ? 'bg-brass/10 border-brass/20 text-brass animate-pulse' 
                  : 'bg-black/30 border-white/5 text-ivory/50'
              }`}>
                {isMyTurn ? "Your Turn: Make a Guess" : `Waiting for ${activePlayerName}...`}
              </div>
            )}

            {/* Guess suit buttons */}
            <div className="flex flex-col gap-2">
              {SUITS.map((suit) => {
                const isEliminated = state.eliminatedSuits.includes(suit);
                const disabled = isEliminated || !isMyTurn || !!state.winnerId || (isMyTurn && !state.firstTurnSwapped[activePlayerId]);
                
                return (
                  <button
                    key={suit}
                    disabled={disabled}
                    onClick={() => handleGuessSuit(suit)}
                    className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-between border font-serif tracking-wider transition ${
                      isEliminated
                        ? 'bg-black/50 border-red-950/20 text-red-800 line-through opacity-30 cursor-not-allowed'
                        : !isMyTurn || !!state.winnerId
                        ? 'bg-[#26170d] border-brass/10 text-brass/40 cursor-not-allowed'
                        : !state.firstTurnSwapped[activePlayerId]
                        ? 'bg-[#26170d] border-brass/10 text-brass/40 cursor-not-allowed'
                        : 'bg-[#402213] border-brass/40 hover:bg-brass hover:text-walnut text-brass cursor-pointer hover:shadow-md active:scale-95'
                    }`}
                  >
                    <span className="text-xs uppercase">{SUIT_NAMES[suit]}</span>
                    <span className="text-lg leading-none">{SUIT_SYMBOLS[suit]}</span>
                  </button>
                );
              })}
            </div>
            
            {!state.firstTurnSwapped[activePlayerId] && isMyTurn && (
              <p className="text-[10px] text-red-500/80 leading-normal text-center mt-2.5">
                * You must resolve your First Turn Swap Action before making a guess.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {state.winnerId ? (
              <div className="bg-[#120a06]/80 border-2 border-brass/60 rounded-lg p-3 text-center shadow-lg">
                <span className="text-brass font-serif font-bold text-sm tracking-wider uppercase block mb-1">
                  Winner Declared!
                </span>
                <p className="text-xs font-semibold text-white mb-2.5">
                  {players[state.winnerId]?.name} Wins
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
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="wood-panel border-4 border-brass rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="font-serif font-bold text-lg text-brass uppercase border-b border-brass/20 pb-2 mb-3">
              Black Card Rules
            </h3>
            <ul className="text-xs leading-relaxed text-ivory/80 flex flex-col gap-2 list-disc pl-4 mb-4">
              <li>Determine the suit of the hidden <strong>Black Card</strong> before your opponent.</li>
              <li>The deck starts with <strong>15 cards</strong> (3 of each: Hearts ♥, Spades ♠, Diamonds ♦, Clubs ♣, Devils 😈).</li>
              <li>One card is randomly removed as the secret <strong>Black Card</strong>. Hand deals contain 3 hidden cards.</li>
              <li><strong>First Turn Only</strong>: You can select cards to permanently reveal on the table and replace with hidden deck draws.</li>
              <li>On your turn, make a suit guess. If correct, you win! If incorrect, that suit is permanently eliminated and turn passes.</li>
            </ul>
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
