import axios from 'axios';
import NProgress from 'nprogress';
import { useAuthStore } from '@/store/authStore';
import { startLoading, stopLoading } from '@/store/loadingStore';
import { config } from '@/config';

export const api = axios.create({
  baseURL: config.api.url,
  withCredentials: true, // send HttpOnly refresh token cookie
});

declare module 'axios' {
  export interface AxiosRequestConfig {
    hideLoading?: boolean;
  }
}

// ── Request interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use((reqConfig) => {
  if (!reqConfig.hideLoading) {
    NProgress.start();
    startLoading();
  }
  const token = useAuthStore.getState().accessToken;
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// ── Response interceptor: token refresh on 401 ───────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => {
    if (!res.config.hideLoading) {
      NProgress.done();
      stopLoading();
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    const shouldLoad = !original?.hideLoading;

    if (error.response?.status === 401 && !original._retry) {
      // ── ต้อง stopLoading() ของ request เดิมก่อน retry ──
      // เพราะ retry จะเรียก startLoading() ใหม่ผ่าน request interceptor
      // ถ้าไม่ stop ตัวเดิม → count จะไม่มีวันกลับเป็น 0
      if (shouldLoad) {
        stopLoading();
        NProgress.done();
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          `${config.api.url}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        useAuthStore.getState().setToken(data.accessToken);
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (shouldLoad) {
      NProgress.done();
      stopLoading();
    }
    return Promise.reject(error);
  },
);
