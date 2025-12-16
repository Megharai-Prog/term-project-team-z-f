import socketIo from "socket.io-client";
import * as chatKeys from "../shared/keys";
import type { ChatMessage } from "../types/types";

const socket = socketIo();

const listing = document.querySelector<HTMLDivElement>("#message-listing")!;
const input = document.querySelector<HTMLInputElement>("#message-submit input")!;
const button = document.querySelector<HTMLButtonElement>("#message-submit button")!;
const messageTemplate = document.querySelector<HTMLTemplateElement>("#template-chat-message")!;

const gameIdRaw = document.body.dataset.gameId;
const currentGameId = gameIdRaw ? Number(gameIdRaw) : null;
const form = document.querySelector<HTMLFormElement>("#message-submit")!;
let sending = false;

const inThisChat = (msg: any) => {
  const msgGameId = msg.game_id ?? null;
  return msgGameId === currentGameId;
};

const appendMessage = ({ id, username, created_at, message }: ChatMessage) => {
  const clone = messageTemplate.content.cloneNode(true) as DocumentFragment;

  const timeSpan = clone.querySelector(".message-time");
  const time = new Date(created_at);
  timeSpan!.textContent = time.toLocaleDateString();
  console.log(time, timeSpan);

  const usernameSpan = clone.querySelector(".message-username");
  usernameSpan!.textContent = username;
  console.log(username, usernameSpan);

  const msgSpan = clone.querySelector(".message-text");
  msgSpan!.textContent = message;
  console.log(message, msgSpan);

  listing.appendChild(clone);
  listing.scrollTop = listing.scrollHeight;
};

socket.on(chatKeys.CHAT_LISTING, ({ messages }: { messages: ChatMessage[] }) => {
  listing.innerHTML = "";
  messages.filter(inThisChat).forEach(appendMessage);
});

socket.on(chatKeys.CHAT_MESSAGE, (message: ChatMessage) => {
  if (inThisChat(message)) {
    appendMessage(message);
  }
});

socket.on("connect", () => {
  if (currentGameId != null) socket.emit(chatKeys.GAME_JOIN, { game_id: currentGameId });

  const url = currentGameId == null ? "/chat/" : `/chat/?game_id=${currentGameId}`;
  fetch(url, {
    method: "get",
    credentials: "include"
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (sending) return;

  const text = input.value.trim();
  if (!text) return;

  sending = true;
  try {
    await fetch("/chat/", {
      method: "post",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, game_id: currentGameId }),
    });

    input.value = "";
  } finally {
    sending = false;
  }
});