// backend/sockets/quick-play.ts
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";

interface QuickPlayer {
  userId: number;
  username: string;
  socketId: string;
  isHost: boolean;
  isReady: boolean;
  handSize: number;
}

interface QuickGame {
  id: string;
  code: string; // Short code for joining
  players: QuickPlayer[];
  hostId: number;
  status: "waiting" | "playing" | "finished";
  createdAt: number;
}

// In-memory storage for quick games
const quickGames = new Map<string, QuickGame>();
const playerToGame = new Map<number, string>(); // userId -> gameId

// Generate a 6-character game code
function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function registerQuickPlayHandlers(io: Server, socket: Socket): void {
  console.log("[QUICK PLAY] Handler registered for socket:", socket.id);

  // Get user from session
  function getUser(): { id: number; username: string } | null {
    const req: any = socket.request;
    const user = req?.session?.user;
    if (!user?.id || !user?.username) return null;
    return { id: user.id, username: user.username };
  }

  /* -------------------- Event Handlers -------------------- */

  // Register player for quick play
  socket.on("quick:register", ({ userId, username }: { userId: number; username: string }) => {
    console.log(`[QUICK] Player registered: ${username} (${userId})`);
    // Just acknowledge registration
    socket.emit("quick:registered", { success: true });
  });

  // Create a new quick game
  socket.on("quick:create", ({ userId, username }: { userId: number; username: string }) => {
    console.log(`[QUICK] Creating game for: ${username} (${userId})`);
    
    // Generate unique game ID and code
    const gameId = uuidv4();
    const code = generateGameCode();
    
    // Create game
    const game: QuickGame = {
      id: gameId,
      code,
      players: [{
        userId,
        username,
        socketId: socket.id,
        isHost: true,
        isReady: true,
        handSize: 0
      }],
      hostId: userId,
      status: "waiting",
      createdAt: Date.now()
    };
    
    // Store game
    quickGames.set(gameId, game);
    playerToGame.set(userId, gameId);
    
    // Join socket room
    socket.join(`quick:${gameId}`);
    
    console.log(`[QUICK] Game created: ${gameId} (Code: ${code})`);
    
    // Send response to creator
    socket.emit("quick:created", {
      gameId,
      code,
      players: game.players
    });
  });

  // Join existing game with code
  socket.on("quick:join", ({ code, userId, username }: { code: string; userId: number; username: string }) => {
    console.log(`[QUICK] ${username} trying to join with code: ${code}`);
    
    // Find game by code
    let targetGame: QuickGame | undefined;
    for (const game of quickGames.values()) {
      if (game.code === code && game.status === "waiting") {
        targetGame = game;
        break;
      }
    }
    
    if (!targetGame) {
      socket.emit("quick:error", { message: "Game not found or already started" });
      return;
    }
    
    // Check if already in game
    if (targetGame.players.some(p => p.userId === userId)) {
      socket.emit("quick:error", { message: "You're already in this game" });
      return;
    }
    
    // Check max players (4 for UNO)
    if (targetGame.players.length >= 4) {
      socket.emit("quick:error", { message: "Game is full (max 4 players)" });
      return;
    }
    
    // Add player to game
    const newPlayer: QuickPlayer = {
      userId,
      username,
      socketId: socket.id,
      isHost: false,
      isReady: true,
      handSize: 0
    };
    
    targetGame.players.push(newPlayer);
    playerToGame.set(userId, targetGame.id);
    
    // Join socket room
    socket.join(`quick:${targetGame.id}`);
    
    console.log(`[QUICK] ${username} joined game ${targetGame.id}`);
    
    // Notify all players in the game
    io.to(`quick:${targetGame.id}`).emit("quick:players", {
      players: targetGame.players
    });
    
    // Send welcome to new player
    socket.emit("quick:joined", {
      gameId: targetGame.id,
      players: targetGame.players
    });
  });

  // Start the quick game
  socket.on("quick:startGame", ({ gameId }: { gameId: string }) => {
    const game = quickGames.get(gameId);
    if (!game) {
      socket.emit("quick:error", { message: "Game not found" });
      return;
    }
    
    // Check if user is host
    const player = game.players.find(p => p.socketId === socket.id);
    if (!player || !player.isHost) {
      socket.emit("quick:error", { message: "Only host can start the game" });
      return;
    }
    
    // Check minimum players
    if (game.players.length < 2) {
      socket.emit("quick:error", { message: "Need at least 2 players" });
      return;
    }
    
    // Update game status
    game.status = "playing";
    
    console.log(`[QUICK] Game ${gameId} started with ${game.players.length} players`);
    
    // TODO: Add actual UNO game logic here
    // For now, just notify players
    
    // Notify all players
    io.to(`quick:${gameId}`).emit("quick:started", {
      firstPlayer: game.players[0].userId,
      message: "Game started! Actual gameplay coming soon..."
    });
    
    // Send placeholder hand to each player
    game.players.forEach(player => {
      io.to(player.socketId).emit("quick:hand", {
        hand: [
          { id: "temp1", kind: "Number", color: "Red", value: 5 },
          { id: "temp2", kind: "Skip", color: "Blue", value: null },
          { id: "temp3", kind: "Wild", color: null, value: null }
        ]
      });
    });
  });

  // Player leaves game
  socket.on("quick:leave", () => {
    const user = getUser();
    if (!user) return;
    
    const gameId = playerToGame.get(user.id);
    if (!gameId) return;
    
    const game = quickGames.get(gameId);
    if (!game) return;
    
    console.log(`[QUICK] ${user.username} leaving game ${gameId}`);
    
    // Remove player from game
    const playerIndex = game.players.findIndex(p => p.userId === user.id);
    if (playerIndex !== -1) {
      const wasHost = game.players[playerIndex].isHost;
      game.players.splice(playerIndex, 1);
      
      // If host left and there are other players, assign new host
      if (wasHost && game.players.length > 0) {
        game.players[0].isHost = true;
        game.hostId = game.players[0].userId;
      }
      
      // Remove from playerToGame map
      playerToGame.delete(user.id);
      
      // Leave socket room
      socket.leave(`quick:${gameId}`);
      
      // If no players left, remove game
      if (game.players.length === 0) {
        quickGames.delete(gameId);
        console.log(`[QUICK] Game ${gameId} removed (no players)`);
      } else {
        // Notify remaining players
        io.to(`quick:${gameId}`).emit("quick:players", {
          players: game.players
        });
      }
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const user = getUser();
    if (!user) return;
    
    const gameId = playerToGame.get(user.id);
    if (!gameId) return;
    
    // Player disconnected, treat as leaving
    const game = quickGames.get(gameId);
    if (!game) return;
    
    console.log(`[QUICK] ${user.username} disconnected from game ${gameId}`);
    
    // Same logic as quick:leave
    const playerIndex = game.players.findIndex(p => p.userId === user.id);
    if (playerIndex !== -1) {
      const wasHost = game.players[playerIndex].isHost;
      game.players.splice(playerIndex, 1);
      
      if (wasHost && game.players.length > 0) {
        game.players[0].isHost = true;
        game.hostId = game.players[0].userId;
      }
      
      playerToGame.delete(user.id);
      
      if (game.players.length === 0) {
        quickGames.delete(gameId);
      } else {
        io.to(`quick:${gameId}`).emit("quick:players", {
          players: game.players
        });
      }
    }
  });

  // Placeholder for gameplay events (to be implemented)
  socket.on("quick:playCard", (data: any) => {
    console.log("[QUICK] Card played (placeholder):", data);
    // TODO: Implement actual gameplay
    socket.emit("quick:error", { message: "Gameplay not implemented yet" });
  });

  socket.on("quick:drawCard", (data: any) => {
    console.log("[QUICK] Card drawn (placeholder):", data);
    // TODO: Implement actual gameplay
    socket.emit("quick:error", { message: "Gameplay not implemented yet" });
  });

  socket.on("quick:callUno", (data: any) => {
    console.log("[QUICK] UNO called (placeholder):", data);
    // TODO: Implement
    socket.emit("quick:ack", { message: "UNO called (not implemented)" });
  });
}