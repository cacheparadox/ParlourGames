import type { GameConfig } from './types';
import blackCardBox from '../assets/black-card-box.png';
import hundredCoinsBox from '../assets/100-coins-box.png';

// Import game components
import { BlackCardGame } from './black-card';
import { initializeBlackCardState } from './black-card/utils';

import { HundredCoinsGame } from './100-coins';
import { initializeHundredCoinsState } from './100-coins/utils';

export const gamesRegistry: GameConfig[] = [
  {
    id: 'black-card',
    name: 'Black Card',
    description: 'A game of deduction and psychology. Determine the suit of the hidden Black Card before your opponent.',
    thumbnail: blackCardBox,
    rules: [
      "Determine the suit of the hidden Black Card before your opponent.",
      "The Deck: 15 cards total (3 Hearts, 3 Spades, 3 Diamonds, 3 Clubs, 3 Devils).",
      "Setup: 1 card is secretly removed (the Black Card). Each player gets 3 cards.",
      "First Turn Action: You can choose to swap-reveal 0 to 3 cards to draw replacement cards. These cards are permanently visible.",
      "A Turn: Guess one suit (Heart, Spade, Diamond, Club, Devil).",
      "Correct guess wins. Incorrect guess eliminates the suit for all players."
    ],
    component: BlackCardGame,
    initializeState: initializeBlackCardState,
  },
  {
    id: '100-coins',
    name: '100 Coins',
    description: 'A game of hidden wagers. Win coins, spend diamonds, and out-bluff your opponent in circular combat.',
    thumbnail: hundredCoinsBox,
    rules: [
      "Finish the game with more coins.",
      "Pot & Wager: Pot starts at 100. Each round generates a random wager between 10 and min(30, remaining pot).",
      "Your Pieces: King, General, Knight, Soldier, Commoner (all single use).",
      "Combat Order: King > General > Knight > Soldier > Commoner > King.",
      "Diamond Upgrades (Single use): King becomes King Lv2 (only defeated by Commoner Lv2). Other pieces advance one tier.",
      "End Game: Pot reaches zero OR 5 rounds completed. Higher coin total wins. Diamond possession breaks ties."
    ],
    component: HundredCoinsGame,
    initializeState: initializeHundredCoinsState,
  }
];

export function getGameConfig(id: string): GameConfig | undefined {
  return gamesRegistry.find((game) => game.id === id);
}
