'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import type { Task } from '@/store/taskStore';
import { config } from '@/config';

interface WsEvent {
  type: 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DELETED' | 'CONNECTED';
  task?: Task;
  taskId?: string;
  userId?: string | null;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  // flag นี้ใช้บอกว่าให้ reconnect ไหม (false = logout จงใจปิด ไม่ต้อง reconnect)
  const shouldReconnectRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { upsertTask, removeTask } = useTaskStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = accessToken
      ? `${config.ws.url}/ws?token=${encodeURIComponent(accessToken)}`
      : `${config.ws.url}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WsEvent;
        switch (data.type) {
          case 'TASK_CREATED':
          case 'TASK_UPDATED':
            if (data.task) upsertTask(data.task);
            break;
          case 'TASK_DELETED':
            if (data.taskId) removeTask(data.taskId);
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect หลัง 3 วินาที เฉพาะกรณีที่เราไม่ได้ logout จงใจ
      if (shouldReconnectRef.current) {
        setTimeout(connect, 3_000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [accessToken, upsertTask, removeTask]);

  useEffect(() => {
    if (!accessToken) {
      // accessToken หายไป = logout → ปิด WS และหยุด reconnect
      shouldReconnectRef.current = false;
      wsRef.current?.close();
      return;
    }

    // มี token = เชื่อมต่อใหม่
    shouldReconnectRef.current = true;
    connect();

    return () => {
      // Cleanup: ตอน unmount หรือ token เปลี่ยน
      shouldReconnectRef.current = false;
      wsRef.current?.close();
    };
  }, [accessToken, connect]);

  return { connected };
}
