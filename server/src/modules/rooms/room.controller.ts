import type { Request, Response } from 'express';
import { roomService } from './room.service.js';
import { getRealtimeServer } from '../realtime/realtime.gateway.js';
import type {
  CreateRoomInput,
  JoinRoomInput,
  UpdateRoomSettingsInput,
  RoomCodeParam,
  TransferHostInput,
} from './room.validation.js';

export const createRoomHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const body = req.body as CreateRoomInput;
  const result = await roomService.createRoom(userId, body);

  res.status(201).json({
    success: true,
    data: result,
  });
};

export const getRoomHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { code } = req.params as RoomCodeParam;
  const result = await roomService.getRoomByCode(code, userId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const joinRoomHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { code } = req.params as RoomCodeParam;
  const body = req.body as JoinRoomInput;
  const result = await roomService.joinRoom(userId, code, body);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const leaveRoomHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const userName = req.user?.name;
  const { code } = req.params as RoomCodeParam;
  const result = await roomService.leaveRoom(userId, code, userName);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const updateSettingsHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { code } = req.params as RoomCodeParam;
  const body = req.body as UpdateRoomSettingsInput;
  const result = await roomService.updateRoomSettings(userId, code, body);

  try {
    const io = getRealtimeServer();
    io.in(`room:${code}`).emit('room:settings-updated', result);
  } catch {
  }

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const endRoomHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { code } = req.params as RoomCodeParam;
  const result = await roomService.endRoom(userId, code);

  try {
    const io = getRealtimeServer();
    io.in(`room:${code}`).emit('room:ended', { message: 'The host has ended this space.' });
  } catch {
  }

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const heartbeatHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { code } = req.params as RoomCodeParam;
  const result = await roomService.heartbeat(userId, code);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const listMyRoomsHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const type = req.query.type as 'meet' | 'audio' | undefined;
  const result = await roomService.listMyRooms(userId, type);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const transferHostHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { code } = req.params as RoomCodeParam;
  const { newHostUserId } = req.body as TransferHostInput;

  const result = await roomService.transferHost(userId, code, newHostUserId);

  try {
    const io = getRealtimeServer();
    io.in(`room:${code}`).emit('room:host-transferred', {
      previousHostId: userId,
      newHostId: newHostUserId,
      newHostName: 'Participant',
    });
  } catch {
  }

  res.status(200).json({
    success: true,
    data: result,
  });
};

