import type { Card, CardSuit } from './types';

export const SUITS: CardSuit[] = ['heart', 'spade', 'diamond', 'club', 'devil'];

export const SUIT_SYMBOLS: Record<CardSuit, string> = {
  heart: '♥',
  spade: '♠',
  diamond: '♦',
  club: '♣',
  devil: '😈',
};

export const SUIT_NAMES: Record<CardSuit, string> = {
  heart: 'Hearts',
  spade: 'Spades',
  diamond: 'Diamonds',
  club: 'Clubs',
  devil: 'Devils',
};

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  let id = 1;
  SUITS.forEach((suit) => {
    for (let i = 0; i < 3; i++) {
      deck.push({ id: `${suit}_${id++}`, suit });
    }
  });
  return deck;
}

export function initializeBlackCardState(players: string[]): any {
  const fullDeck = shuffle(createDeck());
  
  // 1. Secretly remove the black card
  const blackCard = fullDeck.pop()!;
  
  // 2. Deal 3 cards to each player
  const hands: Record<string, Card[]> = {};
  players.forEach((pId) => {
    hands[pId] = [fullDeck.pop()!, fullDeck.pop()!, fullDeck.pop()!];
  });

  const firstPlayer = players[Math.floor(Math.random() * players.length)] || '';

  return {
    deck: fullDeck,
    deckSize: fullDeck.length,
    hands,
    revealedCards: [],
    blackCardSuit: blackCard.suit,
    eliminatedSuits: [],
    turnPlayerId: firstPlayer,
    firstTurnSwapped: players.reduce((acc, pId) => ({ ...acc, [pId]: false }), {}),
    winnerId: null,
    history: ['Match started. Secret Black Card selected. Hands dealt.']
  };
}
