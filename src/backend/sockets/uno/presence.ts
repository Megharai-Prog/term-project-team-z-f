// backend/sockets/uno/presence.ts
const gamePresence = new Map<number, Set<number>>();

export function addPlayer(gameId: number, userId: number) {
  if (!gamePresence.has(gameId)) {
    gamePresence.set(gameId, new Set());
  }
  gamePresence.get(gameId)!.add(userId);
}

export function removePlayer(gameId: number, userId: number) {
  gamePresence.get(gameId)?.delete(userId);
}

export function getPlayers(gameId: number): number[] {
  return Array.from(gamePresence.get(gameId) ?? []);
}
export function getPresenceEntries() {
  return gamePresence.entries();
}
