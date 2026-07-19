export type GamePiece = 'king' | 'general' | 'knight' | 'soldier' | 'commoner';
export type UpgradedGamePiece = GamePiece | 'king_lv2' | 'commoner_lv2';

export interface HundredCoinsState {
  pot: number;
  wager: number;
  remainingPieces: Record<string, GamePiece[]>; // playerUid -> remaining pieces
  hasDiamond: Record<string, boolean>; // playerUid -> true if they still have it
  coins: Record<string, number>; // playerUid -> coins won
  lockedPiece: Record<string, GamePiece | null>; // playerUid -> selected piece this round
  lockedUpgrade: Record<string, boolean | null>; // playerUid -> upgraded selected piece (null = undecided, false = no, true = yes)
  round: number; // 1 to 5
  history: string[];
  winnerId: string | null;
}
