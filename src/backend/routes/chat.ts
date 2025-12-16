import express from "express";
import { CHAT_LISTING, CHAT_MESSAGE, gameRoom, GLOBAL_ROOM } from "../../shared/keys";
import { Chat } from "../db";

const router = express.Router();

router.get("/", async (request, response) => {
  response.status(202).send();

  const sessionId = request.session.id;
  const raw = request.query.game_id as string | undefined;
  const gameId = raw ? Number(raw) : null;

  const messages = await Chat.list(50, Number.isFinite(gameId) ? gameId : null);

  const io = request.app.get("io");
  io.to(sessionId).emit(CHAT_LISTING, { messages });
});

router.post("/", async (request, response) => {

  const userId = request.session.user!.id;
  const { message, game_id } = request.body;

  const gameId = game_id === null || game_id === undefined || game_id === "" ? null : Number(game_id);

  const result = await Chat.create(userId, Number.isFinite(gameId as any) ? (gameId as number) : null, message);

  const io = request.app.get("io");
  if (result.game_id == null) {
    io.to(GLOBAL_ROOM).emit(CHAT_MESSAGE, result);
  } else {
    io.to(gameRoom(result.game_id)).emit(CHAT_MESSAGE, result);
  }

  return response.status(201).json(result);
});

export default router;
