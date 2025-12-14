import express from "express";
import { CHAT_LISTING, CHAT_MESSAGE, GLOBAL_ROOM } from "../../shared/keys";
import { Chat } from "../db";

const router = express.Router();

router.get("/", async (request, response) => {
  response.status(202).send();

  const { id } = request.session;
  const messages = await Chat.list(50, null);

  const io = request.app.get("io");
  io.to(id).emit(CHAT_LISTING, { messages });
});

router.post("/", async (request, response) => {
  response.status(202).send();

  const { id: userId } = request.session.user!;
  const { message } = request.body;

  const result = await Chat.create(userId, null, message);

  const io = request.app.get("io");
  io.to(GLOBAL_ROOM).emit(CHAT_MESSAGE, result);
});

export default router;
