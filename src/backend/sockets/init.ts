import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { GLOBAL_ROOM } from "../../shared/keys";
import { User } from "../../types/types";
import { sessionMiddleware } from "../config/session";
import logger from "../lib/logger";
import { GAME_JOIN, gameRoom } from "../../shared/keys";
import { registerUnoHandlers } from "./uno/handlers";
import { addPlayer, removePlayer, getPlayers,getPresenceEntries  } from "./uno/presence";
import { registerQuickPlayHandlers } from "./quick-play";



export const initSockets = (httpServer: HTTPServer) => {
  const io = new Server(httpServer);

  io.engine.use(sessionMiddleware);

  io.on("connection", (socket) => {
    // @ts-ignore
    const session = socket.request.session as { id: string; user: User };
    registerUnoHandlers(io, socket);
    registerQuickPlayHandlers(io, socket);

    logger.info(`socket for user ${session.user.username} established`);

    socket.join(session.id);
    socket.join(GLOBAL_ROOM);

    socket.on(GAME_JOIN, ({ game_id }: { game_id: number }) => {
      console.log(`🎮 [GAME_JOIN] User ${session.user.id} joining game ${game_id}`);
      
      if (!Number.isInteger(game_id)) {
        console.error(`❌ Invalid game_id: ${game_id}`);
        return;
      }

      socket.join(gameRoom(game_id));
      console.log(`✅ Socket ${socket.id} joined room ${gameRoom(game_id)}`);

      const userId = session.user.id;
      addPlayer(game_id, userId);

      const players = getPlayers(game_id);

      logger.info(`[UNO PRESENCE] game=${game_id} players=${players.join(",")}`);

      io.to(gameRoom(game_id)).emit("uno:players", { players });

       io.to(gameRoom(game_id)).emit("uno:sync", { gameId: game_id });
    });

    socket.on("disconnect", () => {
      const userId = session.user.id;

      for (const [gameId, players] of getPresenceEntries()) {
        if (players.has(userId)) {
          removePlayer(gameId, userId);

          io.to(gameRoom(gameId)).emit("uno:players", {
            players: getPlayers(gameId),
          });
        }
      }

      logger.info(`socket for user ${session.user.username} disconnected`);
    });

  });

  return io;
};

