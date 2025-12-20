// backend/sockets/uno/deck.ts
import crypto from "crypto";
import { Card, CardColor } from "./types";

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createDeck(): Card[] {
  const colors: CardColor[] = ["red", "blue", "green", "yellow"];
  const deck: Card[] = [];

  // Minimal UNO deck: 4 colors x values 0-9 (one of each)
  for (const color of colors) {
    for (let value = 0; value <= 9; value++) {
      deck.push({
        id: crypto.randomUUID(),
        color,
        value,
      });
    }
  }

  return shuffle(deck);
}

export function isPlayable(card: Card, top: Card): boolean {
  return card.color === top.color || card.value === top.value;
}
