import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Server } from "socket.io";

/**
 * Servidor de Socket.io independiente.
 * Ejecuta con: pnpm run socket
 * - Chat en vivo (salas por conversación)
 * - Actualizaciones del dashboard (salas por usuario y rol)
 */
const PORT = Number(process.env.SOCKET_PORT ?? 3001);
const SOCKET_SECRET = process.env.SOCKET_INTERNAL_SECRET;
if (!SOCKET_SECRET) {
  console.error(
    "[socket] SOCKET_INTERNAL_SECRET no configurado. Establece esta variable en producción.",
  );
  if (process.env.NODE_ENV === "production") process.exit(1);
}

const httpServer = createServer(handleHttpRequest);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXTAUTH_URL ?? "https://nutricion-phi.vercel.app",
    methods: ["GET", "POST"],
  },
});

function userRoom(userId: string) {
  return `user:${userId}`;
}

function roleRoom(role: string) {
  return `role:${role}`;
}

function handleHttpRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "POST" && req.url === "/internal/emit") {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${SOCKET_SECRET}`) {
      res.writeHead(401);
      res.end("Unauthorized");
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body) as {
          event: string;
          data?: unknown;
          userIds?: string[];
          roles?: string[];
        };

        const rooms = new Set<string>();
        for (const id of parsed.userIds ?? []) rooms.add(userRoom(id));
        for (const role of parsed.roles ?? []) rooms.add(roleRoom(role));

        for (const room of rooms) {
          io.to(room).emit(parsed.event, parsed.data ?? {});
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, rooms: [...rooms] }));
      } catch {
        res.writeHead(400);
        res.end("Bad request");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
}

io.on("connection", (socket) => {
  socket.on("join_user", (payload: { userId: string; role: string }) => {
    if (!payload?.userId) return;
    socket.join(userRoom(payload.userId));
    if (payload.role) socket.join(roleRoom(payload.role));
  });

  socket.on("join", (conversationId: string) => {
    socket.join(conversationId);
  });

  socket.on(
    "message",
    (payload: { conversationId: string; [k: string]: unknown }) => {
      io.to(payload.conversationId).emit("message", payload);
    },
  );

  socket.on("typing", (payload: { conversationId: string; userId: string }) => {
    socket.to(payload.conversationId).emit("typing", payload);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket.io escuchando en puerto ${PORT}`);
});
