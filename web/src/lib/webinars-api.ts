import { SERVER_URL } from './config';
import type { WebinarData } from '@/stores/webinar-store';

const API_BASE_URL = SERVER_URL;

export interface CreateWebinarPayload {
  title: string;
  description?: string;
  youtubeVideoId?: string;
  scheduledAt?: string | null;
  allowChat?: boolean;
  allowQa?: boolean;
  allowWhiteboard?: boolean;
  allowReactions?: boolean;
}

export interface UpdateWebinarPayload {
  title?: string;
  description?: string;
  youtubeVideoId?: string | null;
  scheduledAt?: string | null;
  allowChat?: boolean;
  allowQa?: boolean;
  allowWhiteboard?: boolean;
  allowReactions?: boolean;
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

export const webinarsApi = {
  createWebinar: (payload: CreateWebinarPayload) => {
    return request<WebinarData>('/api/v1/webinars', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getWebinar: (code: string) => {
    return request<WebinarData>(`/api/v1/webinars/${encodeURIComponent(code)}`, {
      method: 'GET',
    });
  },

  updateWebinar: (code: string, payload: UpdateWebinarPayload) => {
    return request<WebinarData>(`/api/v1/webinars/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateStatus: (code: string, status: 'scheduled' | 'live' | 'ended') => {
    return request<WebinarData>(`/api/v1/webinars/${encodeURIComponent(code)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  listMyWebinars: () => {
    return request<WebinarData[]>('/api/v1/webinars/me', {
      method: 'GET',
    });
  },

  listUpcomingWebinars: () => {
    return request<WebinarData[]>('/api/v1/webinars', {
      method: 'GET',
    });
  },
};
