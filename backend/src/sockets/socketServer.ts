import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

let io: SocketIOServer | null = null;

export interface SocketUserPayload {
  _id: string;
  name: string;
  email: string;
  role: string;
  clinicId?: string;
}

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [config.FRONTEND_URL, 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware for Socket Handshakes
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      (socket.handshake.headers.cookie
        ? socket.handshake.headers.cookie
            .split(';')
            .find((c) => c.trim().startsWith('token='))
            ?.split('=')[1]
        : null);

    if (!token) {
      // Allow unauthenticated connection for public read-only events (e.g. public queue boards)
      // but without private rooms
      socket.data.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as SocketUserPayload;
      socket.data.user = decoded;
      return next();
    } catch (err) {
      console.warn('[Socket Auth] Invalid token provided:', (err as any).message);
      socket.data.user = null;
      return next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user: SocketUserPayload | null = socket.data.user;

    if (user) {
      // Automatically join personal room
      socket.join(`user:${user._id}`);

      // Role-based room joining
      if (user.role === 'doctor') {
        socket.join(`doctor:${user._id}`);
      }

      if (user.clinicId) {
        socket.join(`clinic:${user.clinicId}`);
      }
    }

    // Client requests to join a clinic room (e.g. receptionist or public waiting board)
    socket.on('join:clinic', (clinicId: string) => {
      if (clinicId) {
        socket.join(`clinic:${clinicId}`);
      }
    });

    // Client requests to join a doctor room (for public queue display or receptionist)
    socket.on('join:doctor', (doctorId: string) => {
      if (doctorId) {
        socket.join(`doctor:${doctorId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  console.log('[Socket.IO] Server initialized successfully.');
  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

export const emitToRoom = (room: string, event: string, payload: any): void => {
  if (io) {
    io.to(room).emit(event, payload);
  }
};
