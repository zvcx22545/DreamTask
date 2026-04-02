'use client';

import { useWebSocket } from '@/hooks/useWebSocket';
import { useTasks } from '@/hooks/useTasks';
import { useTaskStore } from '@/store/taskStore';
import { useTeamStore } from '@/store/teamStore';
import { KanbanBoard } from '@/components/Kanban/Board';
import { MetricsBar } from '@/components/MetricsBar';
import { TaskFormDialog } from '@/components/TaskFormDialog';
import { TaskFilters } from '@/components/TaskFilters';
import { useState } from 'react';

export default function DashboardPage() {
  // ดึงสถานะการเชื่อมต่อ WebSocket (Real-time updates)
  const { connected } = useWebSocket();
  
  // ดึงข้อมูลทีมปัจจุบันที่ User เลือกอยู่ (จาก Zustand Store)
  const currentTeam = useTeamStore((s) => s.currentTeam);
  
  // ใช้ React Query Custom Hook เพื่อดึงรายการงานทั้งหมดของทีมนี้
  const { isLoading, isError } = useTasks(currentTeam?.id);
  
  // ดึงรายการงาน (Tasks) ที่ถูกเก็บไว้ใน Global State (Zustand) หลังจากการดึง API สำเร็จ
  const tasks = useTaskStore((s) => s.tasks);
  
  // State สำหรับเก็บเงื่อนไขการกรองงาน (เช่น ค้นหาชื่อ, กรองแค่สถานะ DONE)
  const [filters, setFilters] = useState<Record<string, string>>({});

  // คำนวณตัวเลขสถิติเพื่อไปโชว์ใน MetricsBar
  const total = tasks.length;
  // กรองเฉพาะงานที่มีสถานะ DONE (เสร็จแล้ว)
  const completed = tasks.filter((t) => t.status === 'DONE').length;
  // งานที่เหลือที่ไม่ใช่ DONE (รอดำเนินการ + กำลังทำ)
  const pending = tasks.filter((t) => t.status !== 'DONE').length;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">กระดานงาน: {currentTeam ? currentTeam.name : '...'}</h1>
          <p className="mt-1 text-muted-foreground">จัดการงานทั้งหมดของทีม</p>
        </div>
        <div className="flex items-center gap-4">
          {/* WebSocket status indicator */}
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
            <div
              className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 ws-indicator-live' : 'bg-muted'
                }`}
            />
            <span className="text-muted-foreground">
              {connected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}
            </span>
          </div>
          <TaskFormDialog />
        </div>
      </div>

      {!currentTeam ? (
        <div className="flex h-64 flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-card/30 p-8 text-center mt-8">
          <h3 className="text-lg font-semibold text-foreground">ยังไม่มีทีมที่เลือก</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            โปรดเลือกทีมจากเมนูด้านซ้าย หรือสร้างทีมใหม่เพื่อเริ่มต้นใช้งาน
          </p>
        </div>
      ) : (
        <>
          {/* Metrics */}
      <MetricsBar total={total} completed={completed} pending={pending} />

      {/* Filters */}
      <TaskFilters onFilter={setFilters} />

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : isError ? (
        <div className="flex h-64 items-center justify-center text-destructive">
          เกิดข้อผิดพลาดในการโหลดงาน
        </div>
      ) : (
        <KanbanBoard tasks={tasks} />
      )}
        </>
      )}
    </div>
  );
}
