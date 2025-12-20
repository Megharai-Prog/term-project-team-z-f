export interface User {
  id: number;
  username: string;
  email: string;
  created_at: Date;          
}

export type CardColor = "red" | "blue" | "green" | "yellow";

export interface Card {
  id: string;        // unique per card instance (not DB id)
  color: CardColor;
  value: number;     
}

export interface SecureUser extends User {
  password: string;
}

export interface DbChatMessage {
  id: number;
  user_id: number;
  game_id: number | null;
  message: string;
  created_at: Date;
}

export interface ChatMessage extends DbChatMessage {
  username: string;
  email: string;
}

export enum GameStatus {
  OPEN = "open",
  IN_MATCH = "inMatch",
  CLOSED = "closed",
}

export enum GamePrivacy {
  PUBLIC = "public",
  PRIVATE = "private",
  FRIENDS = "friends",
}

export type Game = {
  id: number;
  room_id: number;
  owner_id: number;
  name?: string;
  maxplayers: number;
  status: GameStatus;
  privacy: GamePrivacy;
  created_at: Date;
};

export interface GameState {
  gameId: number;
  status: GameStatus;
  players: number[];
  currentTurnIndex: number;

  hands: Record<number, Card[]>;
  drawPile: Card[];
  discardPile: Card[];
}
