'use client';

import { useWebSocket } from '@/hooks/useWebSocket';
import { useTasks } from '@/hooks/useTasks';
import { useSearch } from '@/hooks/useSearch';
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
  
  // ดึงรายการงาน (Tasks) จาก Global State (Zustand)
  const tasks = useTaskStore((s) => s.tasks);

  // ใช้ React Query Custom Hook เพื่อดึงรายการงานทั้งหมดของทีมนี้
  const { isLoading, isError } = useTasks(currentTeam?.id);

  // State สำหรับเก็บเงื่อนไขการกรองงาน (เช่น ค้นหาชื่อ, กรองแค่สถานะ DONE)
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 🔍 ค้นหาผ่าน Meilisearch (Global Search)
  const searchQuery = filters.q;
  const { data: searchResults, isLoading: isSearching } = useSearch(searchQuery, currentTeam?.id);

  // คำนวณรายการงานที่จะแสดงผล
  // ⚡ Logic: ถ้ามีการค้นหา ใช้ผลลัพธ์จาก Meilisearch, ถ้าไม่มี ใช้ข้อมูลจาก Cache ปกติ (Local Filter)
  const displayTasks = searchQuery 
    ? (searchResults || []) 
    : tasks.filter((t) => {
        if (filters.status && t.status !== filters.status) return false;
        if (filters.priority && t.priority !== filters.priority) return false;
        return true;
      });

  // คำนวณตัวเลขสถิติเพื่อไปโชว์ใน MetricsBar
  const total = tasks.length;
  // กรองเฉพาะงานที่มีสถานะ DONE (เสร็จแล้ว)
  const completed = tasks.filter((t) => t.status === 'DONE').length;
  // งานที่เหลือที่ไม่ใช่ DONE (รอดำเนินการ + กำลังทำ)
  const pending = tasks.filter((t) => t.status !== 'DONE').length;

  return (
    <div className="min-h-screen bg-transparent p-8">
      {/* Header Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black text-white tracking-tight">
              {currentTeam ? currentTeam.name.toUpperCase() : '...'}
            </h1>
            <div className="h-2 w-2 rounded-full bg-dream-cyan neon-glow-cyan animate-pulse" />
          </div>
          <p className="text-white/50 font-medium tracking-wide">
            CENTRAL INTELLIGENCE & TASK ORCHESTRATION
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Futuristic WebSocket Status */}
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all hover:bg-white/10">
            <div className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? 'bg-dream-cyan' : 'bg-red-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-dream-cyan neon-glow-cyan' : 'bg-red-500'}`}></span>
            </div>
            <span className={connected ? 'text-dream-cyan' : 'text-red-500'}>
              {connected ? 'SYSTEM LIVE' : 'OFFLINE'}
            </span>
          </div>
          <TaskFormDialog />
        </div>
      </div>

      {!currentTeam ? (
        <div className="flex h-96 flex-col items-center justify-center glass-panel rounded-3xl p-12 text-center mt-8 group">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/10">
             <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-dream-cyan to-dream-violet opacity-20 blur-xl animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">NO ACTIVE WORKSPACE</h3>
          <p className="mt-4 text-white/50 max-w-xs mx-auto leading-relaxed">
            Please select a team from the sidebar to initialize your command center.
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Metrics & Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
             <div className="lg:col-span-8">
                <MetricsBar total={total} completed={completed} pending={pending} />
             </div>
             <div className="lg:col-span-4">
                <TaskFilters onFilter={setFilters} isLoading={isSearching} />
             </div>
          </div>

          {/* Kanban Board Container */}
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-2">
            {isLoading ? (
              <div className="flex h-96 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-dream-cyan/20 border-t-dream-cyan neon-glow-cyan" />
              </div>
            ) : isError ? (
              <div className="flex h-96 items-center justify-center text-red-400 font-bold tracking-widest glass-panel rounded-3xl">
                DATA SYNCHRONIZATION ERROR
              </div>
            ) : (
              <KanbanBoard tasks={displayTasks} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
