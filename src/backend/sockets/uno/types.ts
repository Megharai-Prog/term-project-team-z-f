// backend/sockets/uno/types.ts
export type CardColor = "red" | "blue" | "green" | "yellow";

export interface Card {
  id: string;        // unique per card instance (UNO has duplicates)
  color: CardColor;
  value: number;     // 0-9
}

export enum UnoStatus {
  OPEN = "open",
  IN_MATCH = "inMatch",
  CLOSED = "closed",
}

export interface GameState {
  gameId: number;
  status: UnoStatus;
  players: number[];
  currentTurnIndex: number;
  // 1 for clockwise, -1 for counter-clockwise
  direction: 1 | -1;
  // number of cards pending to be drawn by the next player
  pendingDraw?: number;
  // whether a WildDrawFour is awaiting a challenge
  awaitingChallenge?: boolean;
  // If a Wild / WildDrawFour was played and awaiting challenge, data is stored here
  lastWild?: {
    playedBy: number;
    previousColor: CardColor | null;
    chosenColor: CardColor | null;
    wasLegalWDF?: boolean;
    timeoutId?: any;
  } | null;
  // Track whether players have called UNO when they reach one card
  unoCalled?: Record<number, boolean>;
}

