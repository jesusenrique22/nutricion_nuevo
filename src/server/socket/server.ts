import { createServer } from "node:http";
import { Server } from "socket.io";

/**
 * Servidor de Socket.io independiente (Módulo 3 — chat en vivo).
 * Ejecuta con: npm run socket
 * El frontend se conecta vía NEXT_PUBLIC_SOCKET_URL.
 */
const PORT = Number(process.env.SOCKET_PORT ?? 3001);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // El cliente se une a la sala de su conversación
  socket.on("join", (conversationId: string) => {
    socket.join(conversationId);
  });

  // Reenvía el mensaje a la sala. La persistencia en MongoDB
  // se hace vía Server Action antes de emitir, o aquí mismo.
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
