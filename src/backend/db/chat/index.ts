import { ChatMessage } from "../../../types/types";
import db from "../connection";
import { CREATE_MESSAGE, RECENT_MESSAGES } from "./sql";

const list = async (limit: number = 50, game_id: number | null = null) => {
  return await db.manyOrNone<ChatMessage>(RECENT_MESSAGES, [limit, game_id]);
};

const create = async (user_id: number, game_id: number | null, message: string) => {
  return await db.one<ChatMessage>(CREATE_MESSAGE, [user_id, game_id, message]);
};

export { create, list };
