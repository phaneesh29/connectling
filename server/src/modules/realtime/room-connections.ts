interface RoomConnection {
  peerId: string;
  userId: string;
  socketId: string;
  timer?: ReturnType<typeof setTimeout>;
}


export function createRoomConnections() {
  const rooms = new Map<string, Map<string, RoomConnection>>();

  const get = (roomCode: string, peerId: string) => rooms.get(roomCode)?.get(peerId);

  const forUser = (roomCode: string, userId: string) =>
    Array.from(rooms.get(roomCode)?.values() ?? []).filter(connection => connection.userId === userId);

  const connect = (roomCode: string, peerId: string, userId: string, socketId: string) => {
    let room = rooms.get(roomCode);
    if (!room) { room = new Map(); rooms.set(roomCode, room); }
    const previous = room.get(peerId);
    if (previous?.timer) clearTimeout(previous.timer);
    room.set(peerId, { peerId, userId, socketId });
    return previous;
  };

  const remove = (roomCode: string, peerId: string, socketId?: string) => {
    const room = rooms.get(roomCode);
    const connection = room?.get(peerId);
    if (!room || !connection || (socketId && connection.socketId !== socketId)) return false;
    if (connection.timer) clearTimeout(connection.timer);
    room.delete(peerId);
    if (!room.size) rooms.delete(roomCode);
    return true;
  };

  const disconnect = (roomCode: string, peerId: string, socketId: string, onExpired: () => void) => {
    const connection = get(roomCode, peerId);
    if (!connection || connection.socketId !== socketId || connection.timer) return;
    connection.timer = setTimeout(() => {
      if (get(roomCode, peerId) !== connection) return;
      remove(roomCode, peerId, socketId);
      onExpired();
    }, 12_000);
    connection.timer.unref?.();
  };

  return { get, forUser, connect, remove, disconnect };
}
