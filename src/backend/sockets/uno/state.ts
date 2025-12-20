// backend/sockets/uno/state.ts
import { GameState } from "./types";

export const activeGames = new Map<number, GameState>();
