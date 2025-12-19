import express from "express";
import { Server } from "socket.io";
import { GAME_CREATE, GAME_LISTING } from "../../shared/keys";
import { Games } from "../db";
import logger from "../lib/logger";

const router = express.Router();
const gameNameCache = new Map<number, string>();

router.get("/", async (request, response) => {
  const sessionId = request.session.id;

  response.status(202).send();

  const games = await Games.list();
  const gamesWithNames = games.map((g: any) => ({
    ...g,
    name: gameNameCache.get(g.id) ?? null,
  }));

  const io = request.app.get("io") as Server;
  io.to(sessionId).emit(GAME_LISTING, gamesWithNames);
});

router.post("/", async (request, response) => {
  try {
    const { id } = request.session.user!;
    const { name, max_players } = request.body;

    const game = await Games.create(id, name, max_players);

    try { 
      await Games.join(game.id, id);
    } catch {}

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (trimmedName) gameNameCache.set(game.id, trimmedName);

    const io = request.app.get("io") as Server;
    io.emit(GAME_CREATE, { ...game, name: gameNameCache.get(game.id) ?? null });

    response.redirect(`/games/${game.id}`);
  } catch (error: any) {
    response.redirect("/lobby");
  }
});

router.get("/:id", async (request, response) => {
  const { id } = request.params;
  const game = await Games.get(parseInt(id));
  const players = await Games.getPlayers(parseInt(id));
  const { user } = request.session;

  response.render("games/game", { ...game, players, user });
});

router.post("/:game_id/join", async (request, response) => {
  const { id } = request.session.user!;
  const { game_id } = request.params;

  await Games.join(parseInt(game_id), id);

  response.redirect(`/games/${game_id}`);
});

export default router;
