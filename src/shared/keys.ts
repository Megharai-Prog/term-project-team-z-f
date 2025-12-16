export const GLOBAL_ROOM = "room:global";
export const CHAT_MESSAGE = "chat:message";
export const CHAT_LISTING = "chat:listing";

export const GAME_LISTING = "games:listing";
export const GAME_CREATE = "games:created";

export const GAME_JOIN = "game:join";
export const gameRoom = (gameId: number) => `room:game:${gameId}`;
