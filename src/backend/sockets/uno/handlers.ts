import type { Server, Socket } from "socket.io";
import { activeGames } from "./state";
import { UnoStatus } from "./types";
import { getPlayers as getPresentPlayers } from "./presence";
import * as GameCards from "../../db/game-cards";
import { getPlayers as getGameUsers } from "../../db/games";




/* -------------------- Helpers -------------------- */

function getUserId(socket: Socket): number {
  const req: any = socket.request;
  const userId = req?.session?.user?.id ?? req?.session?.user_id;
  if (!userId) throw new Error("No user id in session");
  return Number(userId);
}

export function gameRoom(gameId: number) {
  return `game:${gameId}`;
}

function nextTurn(game: { currentTurnIndex: number; players: number[] }) {
  game.currentTurnIndex =
    (game.currentTurnIndex + 1) % game.players.length;
}

function advanceTurn(game: any, steps = 1) {
  const n = game.players.length;
  game.currentTurnIndex = ((game.currentTurnIndex + (game.direction || 1) * steps) % n + n) % n;
}

async function drawMultiple(gameId: number, userId: number, n: number) {
  const drawn: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = await GameCards.drawCard(gameId, userId);
    if (!c) break;
    drawn.push(c.id);
  }
  return drawn;
}

/* -------------------- Handlers -------------------- */

export function registerUnoHandlers(io: Server, socket: Socket) {
  console.log("[UNO] handlers registered for socket", socket.id);

  console.log("[UNO] Registering handlers for:", [
    "uno:whoami",
    "uno:sync", 
    "uno:startGame",
    "uno:playCard",
    "uno:drawCard"
  ].join(", "));

   // Simple test handler
  socket.on("test-echo", (data: any) => {
    console.log("📨 Received test-echo:", data);
    socket.emit("test-echo-response", { 
      original: data, 
      timestamp: Date.now(),
      socketId: socket.id 
    });
  });
 socket.onAny((eventName: string, ...args: any[]) => {
    console.log(`📨 [ANY EVENT on socket ${socket.id}] ${eventName}:`, args);
 });
  
  // Wrap the emit method for this specific socket
  const originalEmit = socket.emit.bind(socket);
  socket.emit = (event: string, ...args: any[]) => {
    console.log(`📤 [SOCKET EMIT from ${socket.id}] ${event}:`, args);
    return originalEmit(event, ...args);
  };


  const originalOn = socket.on.bind(socket);
  socket.on = (event: string, listener: any) => {
    return originalOn(event, (...args: any[]) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`❌ Error in ${event} handler:`, error);
        socket.emit("uno:error", { message: "Internal server error" });
      }
    });
  };

  /* ---------- identity ---------- */

  socket.on("uno:whoami", () => {
    socket.emit("uno:me", { userId: getUserId(socket) });
  });

  /* ---------- sync ---------- */

  socket.on("uno:sync", async ({ gameId }: { gameId: number }) => {
    const userId = getUserId(socket);

    const hand = await GameCards.getCardsByOwner(gameId, userId);
    const topDiscard = await GameCards.getTopDiscard(gameId);

    socket.emit("uno:syncState", { hand, topDiscard });
  });

  /* ---------- start game ---------- */

//   socket.on("uno:startGame", async ({ gameId }: { gameId: number }) => {
//     const userId = getUserId(socket);

//     const present = getPresentPlayers(gameId);
//     if (present.length < 2) {
//       socket.emit("uno:invalidMove", { message: "Need at least 2 players" });
//       return;
//     }

//     const gameUsers = await getGameUsers(gameId);
//     if (!gameUsers.length) {
//       socket.emit("uno:invalidMove", { message: "No players in game" });
//       return;
//     }

//     const hostId = gameUsers[0].id;
//     if (userId !== hostId) {
//       socket.emit("uno:invalidMove", { message: "Only host can start" });
//       return;
//     }

//     if (activeGames.has(gameId)) {
//       socket.emit("uno:invalidMove", { message: "Game already started" });
//       return;
//     }

//     /* ----- DB setup ----- */

//     await GameCards.createDeck(gameId);

//     const totalCards = gameUsers.length * 7;
//     const cards = await GameCards.getCardsFromDeck(gameId, totalCards);

//     let idx = 0;
//     for (const p of gameUsers) {
//       const slice = cards.slice(idx, idx + 7);
//       await GameCards.dealCards(slice.map(c => c.id), p.id);
//       idx += 7;
//     }

//     // initial discard
//     const [first] = await GameCards.getCardsFromDeck(gameId, 1);
//     if (!first) {
//       socket.emit("uno:invalidMove", { message: "Deck empty" });
//       return;
//     }
//     await GameCards.playCard(first.id);

//     activeGames.set(gameId, {
//       gameId,
//       status: UnoStatus.IN_MATCH,
//       players: gameUsers.map(p => p.id),
//       currentTurnIndex: 0,
//     });

//     io.to(gameRoom(gameId)).emit("uno:turn", {
//       currentPlayerId: gameUsers[0].id,
//     });

//     io.to(gameRoom(gameId)).emit("uno:sync", { gameId });
//   });

// In handlers.ts, update the uno:startGame handler with detailed logging
socket.on("uno:startGame", async ({ gameId }: { gameId: number }) => {
  console.log("🚀 [uno:startGame] Received for game:", gameId);
  const userId = getUserId(socket);
  console.log("👤 Request from user:", userId);
  try {
    const present = getPresentPlayers(gameId);
    console.log("👥 Present players:", present);
    
    if (present.length < 2) {
      console.log("❌ Not enough players:", present.length);
      socket.emit("uno:gameStartFailed", { message: "Need at least 2 players" });
      return;
    }

    const gameUsers = await getGameUsers(gameId);
    console.log("📋 Game users from DB:", gameUsers);
    
    if (!gameUsers.length) {
      console.log("❌ No players in game DB");
      socket.emit("uno:gameStartFailed", { message: "No players in game" });
      return;
    }

    const hostId = gameUsers[0].id;
    console.log("👑 Host ID:", hostId, "Requestor ID:", userId);
    
    if (userId !== hostId) {
      console.log("❌ Not host - permission denied");
      socket.emit("uno:gameStartFailed", { message: "Only host can start" });
      return;
    }

    if (activeGames.has(gameId)) {
      console.log("❌ Game already active");
      socket.emit("uno:gameStartFailed", { message: "Game already started" });
      return;
    }

    console.log("✅ All checks passed, starting game...");
    
    /* ----- DB setup ----- */
    await GameCards.createDeck(gameId);
    console.log("🃏 Deck created");

    const totalCards = gameUsers.length * 7;
    const cards = await GameCards.getCardsFromDeck(gameId, totalCards);
    console.log(`🎴 Drawing ${totalCards} cards for ${gameUsers.length} players`);

    let idx = 0;
    for (const p of gameUsers) {
      const slice = cards.slice(idx, idx + 7);
      console.log(`🤝 Dealing 7 cards to user ${p.id}`);
      await GameCards.dealCards(slice.map(c => c.id), p.id);
      idx += 7;
    }

    // initial discard
    const [first] = await GameCards.getCardsFromDeck(gameId, 1);
    if (!first) {
      console.log("❌ No cards in deck for initial discard");
      socket.emit("uno:gameStartFailed", { message: "Deck empty" });
      return;
    }
    console.log("⬆️ Initial discard card:", first);
    await GameCards.playCard(first.id);

    activeGames.set(gameId, {
      gameId,
      status: UnoStatus.IN_MATCH,
      players: gameUsers.map(p => p.id),
      currentTurnIndex: 0,
      direction: 1,
      pendingDraw: 0,
      lastWild: null,
      unoCalled: {},
    });
    
    console.log("✅ Game state saved to activeGames");

    io.to(gameRoom(gameId)).emit("uno:turn", {
      currentPlayerId: gameUsers[0].id,
    });
    console.log(`📤 Emitted uno:turn for player ${gameUsers[0].id}`);

    io.to(gameRoom(gameId)).emit("uno:sync", { gameId });
    console.log(`📤 Emitted uno:sync to room ${gameRoom(gameId)}`);
    
    // Also emit a success event
    io.to(gameRoom(gameId)).emit("uno:gameStarted", {
      gameId,
      startingPlayer: gameUsers[0].id,
      playerCount: gameUsers.length
    });
    
    console.log("🎉 Game started successfully!");
    
  } catch (error) {
    console.error("💥 Error in uno:startGame:", error);
    socket.emit("uno:gameStartFailed", { 
      message: "Internal server error starting game" 
    });
  }
});


  /* ---------- play card ---------- */

  socket.on("uno:playCard", async ({ gameId, cardId, chosenColor }: { gameId: number; cardId: number; chosenColor?: string }) => {
    const userId = getUserId(socket);
    const game = activeGames.get(gameId);

    if (!game) {
      socket.emit("uno:invalidMove", { message: "Game not started" });
      return;
    }

    if (game.players[game.currentTurnIndex] !== userId) {
      socket.emit("uno:invalidMove", { message: "Not your turn" });
      return;
    }

    const hand = await GameCards.getCardsByOwner(gameId, userId);
    const card = hand.find(c => c.id === cardId);
    if (!card) {
      socket.emit("uno:invalidMove", { message: "Card not in hand" });
      return;
    }

    const top = await GameCards.getTopDiscard(gameId);
    // determine the active color: if a wild chose a color previously, use that, otherwise use top.color
    const activeColor = (game.lastWild && game.lastWild.chosenColor) || top?.color || null;

    // playability rules
    function isPlayable(card: any) {
      if (card.kind === "Wild" || card.kind === "WildDrawFour") return true;
      if (!top) return true; // nothing to compare against
      if (card.kind === "Number" && top.kind === "Number") {
        return card.number_value === top.number_value || (card.color && card.color === activeColor);
      }
      // action cards match by color or same kind
      if (card.color && card.color === activeColor) return true;
      if (top.kind === card.kind) return true;
      return false;
    }

    if (!isPlayable(card)) {
      socket.emit("uno:invalidMove", { message: "Card does not match" });
      return;
    }

    // Handler for different kinds
    if (card.kind === "Wild") {
      if (!chosenColor) {
        socket.emit("uno:invalidMove", { message: "Must choose a color for Wild" });
        return;
      }
      await GameCards.playCard(cardId);
      // set current declared color
      game.lastWild = {
        playedBy: userId,
        previousColor: activeColor,
        chosenColor: chosenColor as any,
      };
      // advance to next player
      advanceTurn(game, 1);
    } else if (card.kind === "WildDrawFour") {
      // determine if the play was legal (player had no matching color)
      const hadMatching = hand.some((c: any) => c.id !== cardId && c.color && c.color === activeColor && c.kind !== "Wild" && c.kind !== "WildDrawFour");
      const wasLegal = !hadMatching;

      await GameCards.playCard(cardId);

      //minimal: check UNO state if this was the player's last card before proceeding with challenge flow
      const { count: afterCount } = await GameCards.countByOwner(gameId, userId);
      game.unoCalled = game.unoCalled || {};
      if (afterCount === 1) {
        game.unoCalled[userId] = false;
        socket.emit("uno:needCall", { message: "You must call UNO before your next play" });
      }
      if (afterCount === 0) {
        const called = game.unoCalled?.[userId];
        if (!called) {
          // penalty: force draw 2 instead of winning
          await drawMultiple(gameId, userId, 2);
          io.to(gameRoom(gameId)).emit("uno:penalty", { userId, reason: "Failed to call UNO - drew 2 cards" });
          // continue with WDF resolution (no immediate win)
        } else {
          game.status = UnoStatus.CLOSED;
          io.to(gameRoom(gameId)).emit("uno:ended", { winnerUserId: userId });
          return;
        }
      }

      game.lastWild = {
        playedBy: userId,
        previousColor: activeColor,
        chosenColor: (chosenColor || null) as any,
        wasLegalWDF: wasLegal,
      };

      // set pending draw and allow next player to challenge within a short window
      game.pendingDraw = 4;
      game.awaitingChallenge = true;

      // advance to the next player (the one who may be affected or challenge)
      advanceTurn(game, 1);

      // set a short timeout to auto-apply draw if no challenge
      if (game.lastWild && game.lastWild.timeoutId) clearTimeout(game.lastWild.timeoutId);
      game.lastWild.timeoutId = setTimeout(async () => {
        if (!game.awaitingChallenge) return;
        const target = game.players[game.currentTurnIndex];
        await drawMultiple(gameId, target, 4);
        game.awaitingChallenge = false;
        game.pendingDraw = 0;
        // after they draw, skip their turn
        advanceTurn(game, 1);
        io.to(gameRoom(gameId)).emit("uno:sync", { gameId });
        io.to(gameRoom(gameId)).emit("uno:turn", { currentPlayerId: game.players[game.currentTurnIndex] });
      }, 5000);

      // inform room that a WDF was played and challenger can respond
      io.to(gameRoom(gameId)).emit("uno:wildDrawFourPlayed", { by: userId });
      io.to(gameRoom(gameId)).emit("uno:sync", { gameId });
      return;
    } else if (card.kind === "Skip") {
      await GameCards.playCard(cardId);
      // skip next player
      advanceTurn(game, 1);
      advanceTurn(game, 1);
    } else if (card.kind === "Reverse") {
      await GameCards.playCard(cardId);
      if (game.players.length === 2) {
        // reverse acts like skip with two players
        advanceTurn(game, 1);
        advanceTurn(game, 1);
      } else {
        game.direction = (game.direction || 1) * -1 as 1 | -1;
        // after reversing, move to next in new direction
        advanceTurn(game, 1);
      }
    } else if (card.kind === "DrawTwo") {
      await GameCards.playCard(cardId);
      // next player draws two and is skipped
      advanceTurn(game, 1);
      const target = game.players[game.currentTurnIndex];
      await drawMultiple(gameId, target, 2);
      // skip them
      advanceTurn(game, 1);
    } else {
      // Number and default action: simply play and advance one
      await GameCards.playCard(cardId);
      advanceTurn(game, 1);
    }

    // After playing, check counts and UNO call state
    const { count } = await GameCards.countByOwner(gameId, userId);

    // If player now has one card, they must call UNO
    game.unoCalled = game.unoCalled || {};
    if (count === 1) {
      game.unoCalled[userId] = false;
      socket.emit("uno:needCall", { message: "You must call UNO before your next play" });
    }

    // If player attempted to play last card
    if (count === 0) {
      const called = game.unoCalled?.[userId];
      if (!called) {
        // penalty: force draw 2 instead of winning
        await drawMultiple(gameId, userId, 2);
        io.to(gameRoom(gameId)).emit("uno:penalty", { userId, reason: "Failed to call UNO - drew 2 cards" });
        // set their count after penalty
        const afterPenalty = await GameCards.countByOwner(gameId, userId);
        game.unoCalled[userId] = false;
        // continue game; current turn index already points to next player
      } else {
        game.status = UnoStatus.CLOSED;
        io.to(gameRoom(gameId)).emit("uno:ended", { winnerUserId: userId });
        return;
      }
    }

    // clear any lastWild waiting state (if unrelated)
    if (game.lastWild && game.lastWild.timeoutId) {
      clearTimeout(game.lastWild.timeoutId);
      game.lastWild.timeoutId = undefined;
      game.awaitingChallenge = false;
      game.pendingDraw = 0;
    }

    io.to(gameRoom(gameId)).emit("uno:turn", {
      currentPlayerId: game.players[game.currentTurnIndex],
    });

    io.to(gameRoom(gameId)).emit("uno:sync", { gameId });
  });

  /* ---------- draw card ---------- */

  socket.on("uno:drawCard", async ({ gameId }: { gameId: number }) => {
    const userId = getUserId(socket);
    const game = activeGames.get(gameId);
    if (!game) return;

    if (game.players[game.currentTurnIndex] !== userId) {
      socket.emit("uno:invalidMove", { message: "Not your turn" });
      return;
    }

    const card = await GameCards.drawCard(gameId, userId);
    if (!card) {
      socket.emit("uno:invalidMove", { message: "Deck empty" });
      return;
    }

    advanceTurn(game, 1);

    io.to(gameRoom(gameId)).emit("uno:turn", {
      currentPlayerId: game.players[game.currentTurnIndex],
    });

    io.to(gameRoom(gameId)).emit("uno:sync", { gameId });
  });

  /* ---------- UNO call ---------- */
  socket.on("uno:call", ({ gameId }: { gameId: number }) => {
    const userId = getUserId(socket);
    const game = activeGames.get(gameId);
    if (!game) return;
    game.unoCalled = game.unoCalled || {};
    game.unoCalled[userId] = true;
    io.to(gameRoom(gameId)).emit("uno:called", { userId });
  });

  /* ---------- challenge WildDrawFour ---------- */
  socket.on("uno:challenge", async ({ gameId }: { gameId: number }) => {
    const userId = getUserId(socket);
    const game: any = activeGames.get(gameId);
    if (!game || !game.awaitingChallenge || !game.lastWild) {
      socket.emit("uno:invalidMove", { message: "No challengeable play" });
      return;
    }

    const challenger = game.players[game.currentTurnIndex];
    if (challenger !== userId) {
      socket.emit("uno:invalidMove", { message: "Only the next player can challenge" });
      return;
    }

    // clear timeout
    if (game.lastWild.timeoutId) {
      clearTimeout(game.lastWild.timeoutId);
      game.lastWild.timeoutId = undefined;
    }

    const wasLegal = !!game.lastWild.wasLegalWDF;
    const playedBy = game.lastWild.playedBy;

    if (!wasLegal) {
      // challenge successful: the player who played WDF had a matching color -> they must draw 4
      await drawMultiple(gameId, playedBy, 4);
      game.awaitingChallenge = false;
      game.pendingDraw = 0;
      game.lastWild = null;
      // challenger now takes their turn (no skip)
      io.to(gameRoom(gameId)).emit("uno:challengeResolved", { result: "successful", drew: 4, target: playedBy });
      io.to(gameRoom(gameId)).emit("uno:sync", { gameId });
      io.to(gameRoom(gameId)).emit("uno:turn", { currentPlayerId: challenger });
      return;
    } else {
      // challenge failed: challenger must draw 6 and is skipped
      await drawMultiple(gameId, challenger, 6);
      game.awaitingChallenge = false;
      game.pendingDraw = 0;
      game.lastWild = null;
      // skip challenger
      advanceTurn(game, 1);
      io.to(gameRoom(gameId)).emit("uno:challengeResolved", { result: "failed", drew: 6, target: challenger });
      io.to(gameRoom(gameId)).emit("uno:sync", { gameId });
      io.to(gameRoom(gameId)).emit("uno:turn", { currentPlayerId: game.players[game.currentTurnIndex] });
      return;
    }
  });
}
