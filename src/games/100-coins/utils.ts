import type { GamePiece } from './types';

// Ranks representing base strengths
// commoner = 0, soldier = 1, knight = 2, general = 3, king = 4
export const PIECE_RANKS: Record<GamePiece, number> = {
  commoner: 0,
  soldier: 1,
  knight: 2,
  general: 3,
  king: 4,
};

export const PIECE_NAMES: Record<GamePiece, string> = {
  commoner: 'Commoner',
  soldier: 'Soldier',
  knight: 'Knight',
  general: 'General',
  king: 'King',
};

export interface CombatResult {
  winner: 'A' | 'B' | 'tie';
  resolvedA: string;
  resolvedB: string;
  description: string;
}

export function resolveUpgradedPiece(piece: GamePiece, upgrade: boolean): string {
  if (!upgrade) return piece;
  if (piece === 'king') return 'king_lv2';
  if (piece === 'commoner') return 'commoner_lv2';
  if (piece === 'soldier') return 'knight';
  if (piece === 'knight') return 'general';
  if (piece === 'general') return 'king';
  return piece;
}

export function resolveCombat(
  pieceA: GamePiece,
  upgradeA: boolean,
  pieceB: GamePiece,
  upgradeB: boolean
): CombatResult {
  const resolvedA = resolveUpgradedPiece(pieceA, upgradeA);
  const resolvedB = resolveUpgradedPiece(pieceB, upgradeB);

  const nameA = upgradeA && pieceA === 'king' ? 'King Lv2' : upgradeA && pieceA === 'commoner' ? 'Commoner Lv2' : `${PIECE_NAMES[pieceA]}${upgradeA ? ' (Upgraded)' : ''}`;
  const nameB = upgradeB && pieceB === 'king' ? 'King Lv2' : upgradeB && pieceB === 'commoner' ? 'Commoner Lv2' : `${PIECE_NAMES[pieceB]}${upgradeB ? ' (Upgraded)' : ''}`;

  // 1. Check identical resolved pieces (Ties)
  if (resolvedA === resolvedB) {
    return {
      winner: 'tie',
      resolvedA,
      resolvedB,
      description: `Both players played ${nameA}. It's a draw!`
    };
  }

  // 2. Special King Lv2 cases
  if (resolvedA === 'king_lv2') {
    if (resolvedB === 'commoner_lv2') {
      return {
        winner: 'B',
        resolvedA,
        resolvedB,
        description: `Commoner Lv2 defeats King Lv2! Player 2 wins!`
      };
    } else {
      return {
        winner: 'A',
        resolvedA,
        resolvedB,
        description: `King Lv2 crushes ${nameB}! Player 1 wins!`
      };
    }
  }

  if (resolvedB === 'king_lv2') {
    if (resolvedA === 'commoner_lv2') {
      return {
        winner: 'A',
        resolvedA,
        resolvedB,
        description: `Commoner Lv2 defeats King Lv2! Player 1 wins!`
      };
    } else {
      return {
        winner: 'B',
        resolvedA,
        resolvedB,
        description: `King Lv2 crushes ${nameA}! Player 2 wins!`
      };
    }
  }

  // 3. Special Commoner Lv2 cases
  if (resolvedA === 'commoner_lv2') {
    if (resolvedB === 'king') {
      return {
        winner: 'A',
        resolvedA,
        resolvedB,
        description: `Commoner Lv2 defeats King! Player 1 wins!`
      };
    }
    if (resolvedB === 'commoner') {
      return {
        winner: 'A',
        resolvedA,
        resolvedB,
        description: `Commoner Lv2 beats Commoner! Player 1 wins!`
      };
    }
    // Against soldier, knight, general: it behaves as commoner, so it loses
    return {
      winner: 'B',
      resolvedA,
      resolvedB,
      description: `${nameB} defeats Commoner Lv2! Player 2 wins!`
    };
  }

  if (resolvedB === 'commoner_lv2') {
    if (resolvedA === 'king') {
      return {
        winner: 'B',
        resolvedA,
        resolvedB,
        description: `Commoner Lv2 defeats King! Player 2 wins!`
      };
    }
    if (resolvedA === 'commoner') {
      return {
        winner: 'B',
        resolvedA,
        resolvedB,
        description: `Commoner Lv2 beats Commoner! Player 2 wins!`
      };
    }
    // Against soldier, knight, general: it behaves as commoner, so it loses
    return {
      winner: 'A',
      resolvedA,
      resolvedB,
      description: `${nameA} defeats Commoner Lv2! Player 1 wins!`
    };
  }

  // 4. Base Rank circular hierarchy resolver
  // Map resolved pieces to their standard ranks (0 to 4)
  const getRankValue = (pName: string): number => {
    if (pName === 'commoner') return 0;
    if (pName === 'soldier') return 1;
    if (pName === 'knight') return 2;
    if (pName === 'general') return 3;
    if (pName === 'king') return 4;
    return 0;
  };

  const rankA = getRankValue(resolvedA);
  const rankB = getRankValue(resolvedB);

  // Commoner (0) beats King (4)
  if (rankA === 0 && rankB === 4) {
    return {
      winner: 'A',
      resolvedA,
      resolvedB,
      description: `Commoner defeats King! Player 1 wins!`
    };
  }
  if (rankB === 0 && rankA === 4) {
    return {
      winner: 'B',
      resolvedA,
      resolvedB,
      description: `Commoner defeats King! Player 2 wins!`
    };
  }

  // Otherwise higher rank wins
  if (rankA > rankB) {
    return {
      winner: 'A',
      resolvedA,
      resolvedB,
      description: `${nameA} defeats ${nameB}! Player 1 wins!`
    };
  } else {
    return {
      winner: 'B',
      resolvedA,
      resolvedB,
      description: `${nameB} defeats ${nameA}! Player 2 wins!`
    };
  }
}

export function generateWager(remainingPot: number): number {
  const minVal = 10;
  const maxVal = Math.min(30, remainingPot);
  if (maxVal <= minVal) return maxVal;
  return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
}

export function initializeHundredCoinsState(players: string[]): any {
  const initialPot = 100;
  const firstWager = generateWager(initialPot);
  
  const remainingPieces: Record<string, GamePiece[]> = {};
  const hasDiamond: Record<string, boolean> = {};
  const coins: Record<string, number> = {};
  const lockedPiece: Record<string, GamePiece | null> = {};
  const lockedUpgrade: Record<string, boolean | null> = {};

  players.forEach((pId) => {
    remainingPieces[pId] = ['king', 'general', 'knight', 'soldier', 'commoner'];
    hasDiamond[pId] = true;
    coins[pId] = 0;
    lockedPiece[pId] = null;
    lockedUpgrade[pId] = null;
  });

  return {
    pot: initialPot,
    wager: firstWager,
    remainingPieces,
    hasDiamond,
    coins,
    lockedPiece,
    lockedUpgrade,
    round: 1,
    history: [`Match started. Round 1 wager set to ${firstWager} Coins.`],
    winnerId: null,
  };
}
