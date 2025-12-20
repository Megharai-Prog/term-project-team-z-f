import socketIo from "socket.io-client";
import * as EVENTS from "../shared/keys";
import type { Game } from "../types/types";
import { appendGame, loadGames, renderGames } from "./lobby/load-games";

const socket = socketIo();

socket.on(EVENTS.GAME_LISTING, (games: Game[]) => {
  console.log(EVENTS.GAME_LISTING, games);

  renderGames(games);
});

socket.on(EVENTS.GAME_CREATE, (game: Game) => {
  console.log(EVENTS.GAME_CREATE, game);

  appendGame(game);
});

// Wait for socket connection before loading games to avoid race condition
socket.on("connect", () => {
  console.log("Socket connected, loading games...");
  loadGames();
});

document.addEventListener("click", async (e) => {
  const target = e.target as HTMLElement;

  if (!target.classList.contains("game-link")) return;

  e.preventDefault();

  const card = target.closest(".game-card");
  if (!card) return;

  const gameIdEl = card.querySelector(".game-id");
  if (!gameIdEl) return;

  const gameId = Number(gameIdEl.textContent);

  await fetch(`/games/${gameId}/join`, {
    method: "POST",
    credentials: "include",
  });

  //  navigate
  window.location.href = `/games/${gameId}`;
});
