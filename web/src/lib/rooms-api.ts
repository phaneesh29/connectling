const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface RoomSettingsData {
  id: string;
  roomId: string;
  micForAll: boolean;
  videoForAll: boolean;
  screenShareForAll: boolean;
  allowChat: boolean;
  allowRaiseHand: boolean;
  maxParticipants: number;
  isPrivate: boolean;
  passcode?: string | null;
  hasPasscode?: boolean;
}

export interface HostData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface RoomData {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: 'meet' | 'audio';
  status: 'active' | 'ended' | 'scheduled';
  hostId: string;
  expiresAt: string;
  startedAt: string;
  endedAt?: string | null;
  settings: RoomSettingsData | null;
  host?: HostData;
  activeParticipantsCount?: number;
}

export interface ParticipantData {
  id: string;
  roomId: string;
  userId: string;
  role: 'host' | 'co_host' | 'speaker' | 'listener' | 'participant';
  status: 'active' | 'left' | 'kicked';
  isMuted: boolean;
  isVideoOn: boolean;
  isHandRaised: boolean;
  joinedAt: string;
  leftAt?: string | null;
}

export interface CreateRoomPayload {
  title: string;
  description?: string;
  type: 'meet' | 'audio';
  settings?: {
    micForAll?: boolean;
    videoForAll?: boolean;
    screenShareForAll?: boolean;
    allowChat?: boolean;
    allowRaiseHand?: boolean;
    isPrivate?: boolean;
    passcode?: string;
  };
}

export interface JoinRoomPayload {
  passcode?: string;
}

export interface UpdateRoomSettingsPayload {
  micForAll?: boolean;
  videoForAll?: boolean;
  screenShareForAll?: boolean;
  allowChat?: boolean;
  allowRaiseHand?: boolean;
  isPrivate?: boolean;
  passcode?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = await response.json().catch(() => ({
    success: false,
    message: `Server returned status ${response.status}`,
  }));

  if (!response.ok) {
    throw new Error(json.message || json.error || `HTTP error ${response.status}`);
  }

  return json;
}

export const roomsApi = {
  createRoom: (payload: CreateRoomPayload) => {
    return request<{ room: RoomData; settings: RoomSettingsData }>('/api/v1/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getRoom: (code: string) => {
    return request<RoomData>(`/api/v1/rooms/${encodeURIComponent(code)}`, {
      method: 'GET',
    });
  },

  joinRoom: (code: string, payload: JoinRoomPayload = {}) => {
    return request<{ room: RoomData; settings: RoomSettingsData; participant: ParticipantData }>(
      `/api/v1/rooms/${encodeURIComponent(code)}/join`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  sendHeartbeat: (code: string) => {
    return request<{ success: boolean; ttl: number }>(
      `/api/v1/rooms/${encodeURIComponent(code)}/heartbeat`,
      {
        method: 'POST',
      }
    );
  },

  leaveRoom: (code: string) => {
    return request<{ success: boolean }>(`/api/v1/rooms/${encodeURIComponent(code)}/leave`, {
      method: 'POST',
    });
  },

  updateSettings: (code: string, payload: UpdateRoomSettingsPayload) => {
    return request<RoomSettingsData>(
      `/api/v1/rooms/${encodeURIComponent(code)}/settings`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  endRoom: (code: string) => {
    return request<{ success: boolean; message: string }>(
      `/api/v1/rooms/${encodeURIComponent(code)}/end`,
      {
        method: 'POST',
      }
    );
  },

  getMyPresence: () => {
    return request<{ isActive: boolean; activeRoom: RoomData | null }>('/api/v1/rooms/my/presence', {
      method: 'GET',
    });
  },
};
