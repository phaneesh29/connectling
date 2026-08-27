import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../auth.js';
import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './realtime.types.js';

export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export const socketAuthMiddleware = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const headers = socket.request.headers;
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });

    if (!sessionData || !sessionData.user) {
      return next(new Error('Unauthorized: No valid session found'));
    }

    socket.data.user = {
      id: sessionData.user.id,
      name: sessionData.user.name,
      email: sessionData.user.email,
      image: sessionData.user.image,
    };

    next();
  } catch (error) {
    next(new Error('Unauthorized: Authentication failed'));
  }
};
