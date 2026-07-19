export type CardSuit = 'heart' | 'spade' | 'diamond' | 'club' | 'devil';

export interface Card {
  id: string;
  suit: CardSuit;
}

export interface BlackCardState {
  deck: Card[];
  deckSize: number;
  hands: Record<string, Card[]>; // playerUid -> Card[]
  revealedCards: Card[]; // Cards revealed publicly during first turn swap
  eliminatedSuits: CardSuit[];
  turnPlayerId: string;
  firstTurnSwapped: Record<string, boolean>; // playerUid -> true if swap was performed
  winnerId: string | null;
  history: string[];
}
