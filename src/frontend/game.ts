import io from "socket.io-client";
import { GAME_JOIN } from "../shared/keys";

/* -------------------- Types -------------------- */

type DbCard = {
  id: number;
  kind: string;
  color: string | null;
  number_value: number | null;
};

/* -------------------- Setup -------------------- */

const socket = io({
  transports: ["websocket", "polling"], // explicit transports
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});



const gameId = Number(document.body.dataset.gameId);
let lastTurnPlayerId: number | null = null;

const topCardEl = document.getElementById("top-card")!;
const handEl = document.getElementById("hand")!;
const statusEl = document.getElementById("status-line")!;
const turnEl = document.getElementById("turn-indicator")!;
const drawBtn = document.getElementById("draw-btn") as HTMLButtonElement;
const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
const playerListEl = document.getElementById("dynamic-player-list")!;
// Build a map of known userId -> username from server-side rendered list
const userIdToName: Record<string, string> = {};
document.querySelectorAll('#dynamic-player-list li[data-user-id]').forEach(li => {
  const id = li.getAttribute('data-user-id');
  if (id) userIdToName[id] = li.textContent?.trim() || `User #${id}`;
});
let myUserId: number | null = null;
let myHand: DbCard[] = [];
let topDiscard: DbCard | null = null;

// Add at the top of game.ts, after socket initialization
console.log("🔄 Initializing socket connection...");
console.log("Game ID from dataset:", gameId);
console.log("DOM Elements found:", {
  topCardEl: !!topCardEl,
  handEl: !!handEl,
  statusEl: !!statusEl,
  turnEl: !!turnEl,
  drawBtn: !!drawBtn,
  startBtn: !!startBtn
});

// Add a refresh button visible to all players
const refreshBtn = document.createElement("button");
refreshBtn.id = "refresh";
refreshBtn.textContent = "🔄 Refresh Game";
refreshBtn.style.margin = "10px";
refreshBtn.onclick = () => {
  console.log("🔄 Manual refresh");
  socket.emit("uno:sync", { gameId });
};
document.querySelector("section.card")?.appendChild(refreshBtn);



/* -------------------- Turn State Management -------------------- */
function updatePlayerList(playerIds: number[]): void {
  console.log("🔄 Updating player list with IDs:", playerIds);

  playerListEl.innerHTML = "";

  if (playerIds.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No one has joined this game yet.";
    playerListEl.appendChild(li);
    return;
  }

  playerIds.forEach(userId => {
    const li = document.createElement("li");
    li.dataset.userId = userId.toString();
    const name = userIdToName[userId.toString()];
    li.textContent = name || `User #${userId}`;
    playerListEl.appendChild(li);
  });

}

function updateTurnUI() {
  if (myUserId === null || lastTurnPlayerId === null) return;

  const isMyTurn = lastTurnPlayerId === myUserId;
  console.log("am updating turn boy");
  turnEl.textContent = isMyTurn ? "🟢 Your turn" : "⏳ Opponent's turn";
  drawBtn.disabled = !isMyTurn;

  handEl.querySelectorAll("button").forEach((btn) => {
    (btn as HTMLButtonElement).disabled = !isMyTurn;
  });
}

/* -------------------- Rendering -------------------- */

function renderDb() {
  handEl.innerHTML = "";

  for (const c of myHand) {
    const btn = document.createElement("button");
    btn.className = "card-slot";
    
    // Add data attributes for styling
    btn.dataset.color = c.color || "";
    btn.dataset.kind = c.kind;
    btn.dataset.value = c.number_value?.toString() || c.kind;
    
    // Text content (fallback)
    btn.textContent = c.kind === "Number" 
      ? `${c.color} ${c.number_value}`
      : `${c.color ?? ""} ${c.kind}`.trim();

    btn.onclick = () => {
      if (c.kind === "Wild" || c.kind === "WildDrawFour") {
        const color = prompt("Choose a color: red, blue, green, yellow")?.trim().toLowerCase();
        if (!["red","blue","green","yellow"].includes(color!)) {
          alert("Invalid color. Choose red, blue, green or yellow.");
          return;
        }
        socket.emit("uno:playCard", {
          gameId,
          cardId: c.id,
          chosenColor: color
        });
      } else {
        socket.emit("uno:playCard", {
          gameId,
          cardId: c.id
        });
      }
    };

    if (myUserId !== null && lastTurnPlayerId !== null) {
      const isMyTurn = lastTurnPlayerId === myUserId;
      btn.disabled = !isMyTurn;
    }

    handEl.appendChild(btn);
  }

  // Style the top card
  if (topDiscard) {
    topCardEl.className = "card-slot";
    topCardEl.dataset.color = topDiscard.color || "";
    topCardEl.dataset.kind = topDiscard.kind;
    topCardEl.dataset.value = topDiscard.number_value?.toString() || topDiscard.kind;
    
    topCardEl.textContent = topDiscard.kind === "Number"
      ? `${topDiscard.color} ${topDiscard.number_value}`
      : `${topDiscard.color ?? ""} ${topDiscard.kind}`.trim();
  } else {
    topCardEl.className = "";
    topCardEl.textContent = "Top Card: (not started)";
  }

  updateTurnUI();
}
/* -------------------- Socket Events -------------------- */


socket.on("connect", () => {
  console.log("✅ Socket connected with ID:", socket.id);
  socket.emit("uno:whoami");
  
  if (!Number.isNaN(gameId)) {
    console.log("🎮 Joining game room:", gameId);
    socket.emit(GAME_JOIN, { game_id: gameId });
    socket.emit("uno:sync", { gameId });
  }
});

socket.on("uno:me", ({ userId }: { userId: number }) => {
  myUserId = userId;
  updateTurnUI();
});


socket.on("uno:invalidMove", ({ message }: { message: string }) => {
  statusEl.textContent = message;
});

socket.on("uno:ended", ({ winnerUserId }: { winnerUserId: number }) => {
  statusEl.textContent =
    winnerUserId === myUserId ? "🎉 You win!" : "Game over";
  drawBtn.disabled = true;
  startBtn.disabled = true;
});

socket.on("connect_error", (error: Error) => {
  console.error("❌ Socket connection error:", error);
  statusEl.textContent = "Connection error. Reconnecting...";
});

socket.on("disconnect", (reason: string) => {
  console.log("🔌 Socket disconnected:", reason);
  statusEl.textContent = "Disconnected. Reconnecting...";
});

socket.on("reconnect", (attemptNumber: number) => {
  console.log("🔄 Reconnected after", attemptNumber, "attempts");
  statusEl.textContent = "Reconnected!";
  // Re-join game after reconnect
  if (!Number.isNaN(gameId)) {
    socket.emit(GAME_JOIN, { game_id: gameId });
    socket.emit("uno:sync", { gameId });
  }
});
socket.on("uno:players", ({ players }: { players: number[] }) => {
  console.log("👥 Players in game:", players);
   updatePlayerList(players);
});

// /* server → client → server sync trigger */
// server → client → server sync trigger: when server broadcasts a room-level
// "uno:sync" we re-emit it for this socket so the server can send this
// socket its personalized `uno:syncState` (hand + top discard).


socket.on("uno:sync", ({ gameId: syncGameId }: { gameId: number }) => {
  console.log("🔄 [BROADCAST RECEIVED] uno:sync for game:", syncGameId);
  console.log("📤 Re-emitting for personal syncState");
  socket.emit("uno:sync", { gameId: syncGameId });
});

socket.on("uno:syncState", ({ hand, topDiscard: td }: { hand: DbCard[]; topDiscard: DbCard | null }) => {
  console.log("🃏 [FRONTEND] uno:syncState received!", { 
    handCount: hand.length, 
    topDiscard: td,
    hand: hand // Log the actual cards
  });
  myHand = hand;
  topDiscard = td;  

  
  renderDb();
});

socket.on("uno:turn", ({ currentPlayerId }: { currentPlayerId: number }) => {
  console.log("🔄 [FRONTEND] uno:turn received:", { 
    currentPlayerId, 
    myUserId, 
    isMyTurn: currentPlayerId === myUserId 
  });
  lastTurnPlayerId = currentPlayerId;
  updateTurnUI();
});

socket.on("uno:gameStarted", (data: any) => {
  console.log("🎮 Game started successfully:", data);
  statusEl.textContent = "Game started!";
  startBtn.disabled = true;
});

socket.on("uno:gameStartFailed", (data: { message: string }) => {
  console.error("❌ Failed to start game:", data.message);
  statusEl.textContent = `Cannot start: ${data.message}`;
});



/* -------------------- UI Actions -------------------- */

startBtn.addEventListener("click", (event: MouseEvent) => {
  event.preventDefault();
  console.log("🚀 Attempting to start game:", gameId);
  console.log("📤 Emitting uno:startGame with:", { gameId });
  socket.emit("uno:startGame", { gameId });
   setTimeout(() => {
    console.log("🔄 Manually syncing after game start");
    socket.emit("uno:sync", { gameId });
  }, 1000);
});

drawBtn.onclick = () => {
  socket.emit("uno:drawCard", { gameId });
};

setTimeout(() => {
  console.log("🧪 Testing socket echo...");
  socket.emit("test-echo", { 
    gameId, 
    test: "Can you hear me backend?" 
  });
}, 1000);

socket.on("test-echo-response", (data: any) => {
  console.log("✅ Backend echo response:", data);
});

// expose socket for console testing
(window as any)._unoSocket = socket;