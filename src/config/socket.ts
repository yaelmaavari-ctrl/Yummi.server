import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { JwtPayload } from '../types';
import { Rooms } from '../sockets/events';

let io: Server | null = null;

/**
 * Initializes the Socket.IO server, wiring up JWT-based handshake auth
 * and joining clients into role/user rooms for targeted emits.
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  // Optional auth: clients may pass a token in the handshake auth payload.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next();
    }
    try {
      const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
      socket.data.user = payload;
    } catch {
      // Ignore invalid tokens; socket stays unauthenticated.
    }
    return next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as JwtPayload | undefined;
    if (user) {
      socket.join(Rooms.user(user.userId));
      socket.join(`role:${user.activeRole.toLowerCase()}`);
    }

    socket.on('disconnect', () => {
      // No-op for now; placeholder for presence tracking.
    });
  });

  console.log('[socket] Socket.IO initialized');
  return io;
}

/**
 * Returns the initialized Socket.IO server instance.
 * Throws if accessed before {@link initSocket} has run.
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocket() first.');
  }
  return io;
}
