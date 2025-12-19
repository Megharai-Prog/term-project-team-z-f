import { Game } from "../../types/types";

const gameListing = document.querySelector<HTMLDivElement>("#game-list")!;
const gameItemTemplate = document.querySelector<HTMLTemplateElement>("#game-listing-template")!;

export const loadGames = () => {
  fetch("/games", { credentials: "include" });
};

const createGameElement = (game: Game) => {
  const gameItem = gameItemTemplate.content.cloneNode(true) as HTMLDivElement;
  const host = game.host_username ?? `User #${game.room_id}`;
  const displayName = game.name && game.name.trim().length ? game.name.trim() : `${host}'s game`;

  gameItem.querySelector(".game-id")!.textContent = `${game.id}`;
  gameItem.querySelector(".game-name")!.textContent = displayName;
  gameItem.querySelector(".game-created-by")!.textContent = host;
  gameItem.querySelector(".game-state")!.textContent = game.status.toString();
  const playerCountEl = gameItem.querySelector(".player-count");
  if (playerCountEl) playerCountEl.textContent = `${Number(game.player_count ?? 0)}`;
  gameItem.querySelector(".max-players")!.textContent = `${game.maxplayers}`;
  gameItem.querySelector(".created-at")!.textContent = new Date(
    game.created_at,
  ).toLocaleDateString();

  const link = gameItem.querySelector(".game-link") as HTMLAnchorElement | null;
  if (link) {
    link.href = `/games/${game.id}`;
  }

  return gameItem;
};

export const renderGames = (games: Game[]) => {
  gameListing.replaceChildren(...games.map(createGameElement));
};

export const appendGame = (game: Game) => {
  gameListing.appendChild(createGameElement(game));
};
