// frontend/quick-play.ts
import io from "socket.io-client";

type QuickCard = {
  id: string;
  kind: string;
  color: string | null;
  value: number | null;
};

type QuickPlayer = {
  userId: number;
  username: string;
  handSize: number;
  isHost: boolean;
  isReady: boolean;
};

// Socket connection for quick play
const quickSocket = io("/quick-play", {
  transports: ["websocket", "polling"],
  reconnection: true,
});

// DOM Elements
const userId = parseInt(document.body.dataset.userId || "0");
const username = document.body.dataset.username || "Player";

const createQuickGameBtn = document.getElementById("create-quick-game")!;
const joinWithCodeBtn = document.getElementById("join-with-code")!;
const startQuickGameBtn = document.getElementById("start-quick-game")!;
const quickDrawBtn = document.getElementById("quick-draw-btn") as HTMLButtonElement;
const quickTopCardEl = document.getElementById("quick-top-card")!;
const quickHandEl = document.getElementById("quick-hand")!;
const quickTurnEl = document.getElementById("quick-turn-indicator")!;
const quickStatusEl = document.getElementById("quick-status")!;
const playerListEl = document.getElementById("player-list")!;
const playerCountEl = document.getElementById("player-count")!;
const handCountEl = document.getElementById("hand-count")!;

// Game State
let quickGameId: string | null = null;
let isHost = false;
let myQuickHand: QuickCard[] = [];
let currentTurnPlayerId: number | null = null;
let gameDirection = 1;
let players: QuickPlayer[] = [];

// Initialize
console.log("🚀 Quick Play initialized for user:", username);

/* -------------------- Socket Events -------------------- */

quickSocket.on("connect", () => {
  console.log("✅ Quick Play socket connected:", quickSocket.id);
  quickSocket.emit("quick:register", { userId, username });
});

// Create or join quick game
createQuickGameBtn.addEventListener("click", () => {
  console.log("🎮 Creating quick game...");
  quickSocket.emit("quick:create", { userId, username });
});

joinWithCodeBtn.addEventListener("click", () => {
  const codeInput = document.getElementById("game-code-input") as HTMLInputElement;
  const code = codeInput.value.trim();
  if (code) {
    console.log("🎮 Joining quick game with code:", code);
    quickSocket.emit("quick:join", { code, userId, username });
  }
});

// Game created
quickSocket.on("quick:created", ({ gameId, code }: { gameId: string; code: string }) => {
  console.log("🎮 Quick game created:", gameId, "Code:", code);
  quickGameId = gameId;
  isHost = true;
  
  // Update UI
  document.getElementById("quick-game-info")!.classList.remove("hidden");
  document.getElementById("join-quick-game")!.classList.add("hidden");
  document.getElementById("host-controls")!.classList.remove("hidden");
  document.getElementById("player-waiting")!.classList.add("hidden");
  
  document.getElementById("quick-game-id")!.textContent = gameId;
  document.getElementById("share-code")!.textContent = code;
  
  // Update status
  quickStatusEl.textContent = "Room created! Share the code with friends.";
});

// Joined game
quickSocket.on("quick:joined", ({ gameId, players: initialPlayers }: { gameId: string; players: QuickPlayer[] }) => {
  console.log("🎮 Joined quick game:", gameId);
  quickGameId = gameId;
  isHost = false;
  
  // Update UI
  document.getElementById("quick-game-info")!.classList.add("hidden");
  document.getElementById("join-quick-game")!.classList.add("hidden");
  document.getElementById("host-controls")!.classList.add("hidden");
  document.getElementById("player-waiting")!.classList.remove("hidden");
  
  updatePlayerList(initialPlayers);
});

// Player list updated
quickSocket.on("quick:players", ({ players: updatedPlayers }: { players: QuickPlayer[] }) => {
  console.log("👥 Players updated:", updatedPlayers);
  updatePlayerList(updatedPlayers);
});

// Game started
quickSocket.on("quick:started", ({ firstPlayer, topCard }: { firstPlayer: number; topCard: QuickCard }) => {
  console.log("🎮 Quick game started! First player:", firstPlayer);
  
  // Show game controls
  document.getElementById("quick-game-controls")!.classList.remove("hidden");
  document.getElementById("waiting-room")!.classList.add("hidden");
  
  // Update top card
  updateTopCard(topCard);
  currentTurnPlayerId = firstPlayer;
  updateTurnUI();
  
  quickStatusEl.textContent = "Game started!";
});

// Hand updated
quickSocket.on("quick:hand", ({ hand }: { hand: QuickCard[] }) => {
  console.log("🃏 Hand received:", hand.length, "cards");
  myQuickHand = hand;
  renderQuickHand();
  handCountEl.textContent = hand.length.toString();
});

// Turn updated
quickSocket.on("quick:turn", ({ playerId, topCard, direction }: { 
  playerId: number; 
  topCard?: QuickCard;
  direction?: number;
}) => {
  console.log("🔄 Turn changed to player:", playerId);
  currentTurnPlayerId = playerId;
  
  if (topCard) {
    updateTopCard(topCard);
  }
  
  if (direction) {
    gameDirection = direction;
    document.getElementById("game-direction")!.textContent = direction === 1 ? "↻" : "↺";
  }
  
  updateTurnUI();
});

// Card played
quickSocket.on("quick:cardPlayed", ({ playerId, card, nextPlayer }: { 
  playerId: number;
  card: QuickCard;
  nextPlayer: number;
}) => {
  console.log("🎴 Card played by", playerId, ":", card);
  updateTopCard(card);
  currentTurnPlayerId = nextPlayer;
  updateTurnUI();
  
  // If I played the card, my hand will be updated via quick:hand event
});

// Draw card
quickSocket.on("quick:cardDrawn", ({ playerId, card, nextPlayer }: {
  playerId: number;
  card: QuickCard;
  nextPlayer: number;
}) => {
  console.log("🎴 Card drawn by", playerId);
  
  if (playerId === userId) {
    // Add to my hand immediately for instant feedback
    myQuickHand.push(card);
    renderQuickHand();
    handCountEl.textContent = myQuickHand.length.toString();
  }
  
  currentTurnPlayerId = nextPlayer;
  updateTurnUI();
});

// Game error
quickSocket.on("quick:error", ({ message }: { message: string }) => {
  console.error("❌ Quick game error:", message);
  quickStatusEl.textContent = `Error: ${message}`;
});

// Game ended
quickSocket.on("quick:ended", ({ winnerId, winnerName }: { winnerId: number; winnerName: string }) => {
  console.log("🏆 Game ended! Winner:", winnerName);
  const isWinner = winnerId === userId;
  
  quickStatusEl.textContent = isWinner ? "🎉 You win!" : `Winner: ${winnerName}`;
  quickDrawBtn.disabled = true;
  
  // Show play again button
  setTimeout(() => {
    const playAgain = confirm(isWinner ? "You won! Play again?" : `${winnerName} won! Play again?`);
    if (playAgain) {
      location.reload();
    }
  }, 1500);
});

/* -------------------- UI Functions -------------------- */

function updatePlayerList(playersList: QuickPlayer[]): void {
  players = playersList;
  playerCountEl.textContent = players.length.toString();
  
  playerListEl.innerHTML = "";
  
  playersList.forEach(player => {
    const template = document.getElementById("player-item-template") as HTMLTemplateElement;
    const clone = template.content.cloneNode(true) as DocumentFragment;
    
    const nameEl = clone.querySelector(".player-name")!;
    const statusEl = clone.querySelector(".player-status")!;
    
    nameEl.textContent = player.username;
    if (player.userId === userId) {
      nameEl.textContent += " (You)";
    }
    
    if (player.isHost) {
      statusEl.textContent = "👑 Host";
    } else if (player.isReady) {
      statusEl.textContent = "✅ Ready";
    } else {
      statusEl.textContent = "⏳ Waiting";
    }
    
    playerListEl.appendChild(clone);
  });
}

function renderQuickHand(): void {
  quickHandEl.innerHTML = "";
  
  myQuickHand.forEach(card => {
    const btn = document.createElement("button");
    btn.className = "card-slot";
    
    // Set data attributes for styling
    if (card.color) {
      btn.dataset.color = card.color;
    }
    btn.dataset.kind = card.kind;
    btn.dataset.value = card.value?.toString() || card.kind;
    
    // Card content
    const valueDiv = document.createElement("div");
    valueDiv.className = "card-value";
    valueDiv.style.fontSize = "20px";
    valueDiv.style.fontWeight = "bold";
    
    if (card.kind === "Number") {
      valueDiv.textContent = card.value?.toString() || "";
    } else if (card.kind === "Reverse") {
      valueDiv.textContent = "↻";
    } else if (card.kind === "Skip") {
      valueDiv.textContent = "⏸";
    } else if (card.kind === "DrawTwo") {
      valueDiv.textContent = "+2";
    } else if (card.kind === "Wild") {
      valueDiv.textContent = "W";
    } else if (card.kind === "WildDrawFour") {
      valueDiv.textContent = "+4";
    }
    
    const colorDiv = document.createElement("div");
    colorDiv.className = "card-color";
    colorDiv.style.fontSize = "12px";
    colorDiv.textContent = card.color || "Wild";
    
    btn.appendChild(valueDiv);
    btn.appendChild(colorDiv);
    
    // Click handler
    btn.addEventListener("click", () => {
      if (currentTurnPlayerId === userId) {
        console.log("🎴 Playing card:", card.id);
        quickSocket.emit("quick:playCard", { 
          gameId: quickGameId, 
          cardId: card.id 
        });
      }
    });
    
    // Disable if not player's turn
    btn.disabled = currentTurnPlayerId !== userId;
    
    quickHandEl.appendChild(btn);
  });
}

function updateTopCard(card: QuickCard): void {
  quickTopCardEl.className = "card-slot";
  
  // Set data attributes
  if (card.color) {
    quickTopCardEl.dataset.color = card.color;
  }
  quickTopCardEl.dataset.kind = card.kind;
  quickTopCardEl.dataset.value = card.value?.toString() || card.kind;
  
  // Update content
  quickTopCardEl.innerHTML = "";
  
  const valueDiv = document.createElement("div");
  valueDiv.style.fontSize = "24px";
  valueDiv.style.fontWeight = "bold";
  
  if (card.kind === "Number") {
    valueDiv.textContent = card.value?.toString() || "";
  } else if (card.kind === "Reverse") {
    valueDiv.textContent = "↻";
  } else if (card.kind === "Skip") {
    valueDiv.textContent = "⏸";
  } else if (card.kind === "DrawTwo") {
    valueDiv.textContent = "+2";
  } else if (card.kind === "Wild") {
    valueDiv.textContent = "W";
  } else if (card.kind === "WildDrawFour") {
    valueDiv.textContent = "+4";
  }
  
  const colorDiv = document.createElement("div");
  colorDiv.style.fontSize = "14px";
  colorDiv.textContent = card.color || "Wild";
  
  quickTopCardEl.appendChild(valueDiv);
  quickTopCardEl.appendChild(colorDiv);
}

function updateTurnUI(): void {
  if (!currentTurnPlayerId) {
    quickTurnEl.textContent = "Turn: —";
    quickDrawBtn.disabled = true;
    return;
  }
  
  const isMyTurn = currentTurnPlayerId === userId;
  const currentPlayer = players.find(p => p.userId === currentTurnPlayerId);
  const playerName = currentPlayer ? currentPlayer.username : "Unknown";
  
  quickTurnEl.textContent = isMyTurn 
    ? `🟢 Your turn (${playerName})` 
    : `⏳ ${playerName}'s turn`;
  
  quickDrawBtn.disabled = !isMyTurn;
  
  // Update card buttons
  quickHandEl.querySelectorAll("button").forEach(btn => {
    btn.disabled = !isMyTurn;
  });
}

/* -------------------- Button Handlers -------------------- */

startQuickGameBtn.addEventListener("click", () => {
  if (isHost && quickGameId) {
    console.log("🚀 Starting quick game...");
    quickSocket.emit("quick:startGame", { gameId: quickGameId });
  }
});

quickDrawBtn.addEventListener("click", () => {
  if (quickGameId && currentTurnPlayerId === userId) {
    console.log("🎴 Drawing card...");
    quickSocket.emit("quick:drawCard", { gameId: quickGameId });
  }
});

// Copy invite link
document.getElementById("copy-invite")?.addEventListener("click", () => {
  const code = document.getElementById("share-code")!.textContent;
  const inviteUrl = `${window.location.origin}/quick-play?join=${code}`;
  
  navigator.clipboard.writeText(inviteUrl).then(() => {
    alert("Invite link copied to clipboard!");
  });
});

// Call UNO
document.getElementById("call-uno")?.addEventListener("click", () => {
  if (quickGameId) {
    quickSocket.emit("quick:callUno", { gameId: quickGameId });
  }
});