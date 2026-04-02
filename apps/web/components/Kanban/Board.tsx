'use client';

// ============================================================================
// Kanban Board - เวอร์ชันแก้ไข Drag & Drop ด้วย useDroppable
// ============================================================================
// ปัญหาเดิม: Column div ไม่ได้ Register เป็น "Droppable Zone" กับ DnD Context
// วิธีแก้: สร้าง KanbanColumn component แยกที่ใช้ useDroppable hook

import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import { useUpdateTask } from '@/hooks/useTasks';
import { useTaskStore, type Task, type TaskStatus } from '@/store/taskStore';
import { KanbanCard } from './Card';
import { cn } from '@/lib/utils';

// ── กำหนดข้อมูลของแต่ละคอลัมน์ ─────────────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string; accentColor: string; shadowColor: string }[] = [
  { id: 'TODO',        label: 'TODO',        accentColor: 'bg-dream-cyan',    shadowColor: 'neon-glow-cyan' },
  { id: 'IN_PROGRESS', label: 'IN PROGRESS', accentColor: 'bg-yellow-400',  shadowColor: 'shadow-yellow-400/20' },
  { id: 'DONE',        label: 'COMPLETED',   accentColor: 'bg-dream-violet', shadowColor: 'neon-glow-violet' },
];

function KanbanColumn({
  id,
  label,
  accentColor,
  shadowColor,
  tasks,
}: {
  id: TaskStatus;
  label: string;
  accentColor: string;
  shadowColor: string;
  tasks: Task[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl glass-panel overflow-hidden min-w-[320px] snap-center md:min-w-0 transition-all duration-500",
        isOver ? "bg-white/10 scale-[1.02] border-white/20" : "bg-white/[0.03]"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
           <div className={cn("h-2 w-2 rounded-full", accentColor, shadowColor)} />
           <h2 className="font-black text-xs tracking-[0.2em] text-white/90">{label}</h2>
        </div>
        <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/50">
          {tasks.length}
        </div>
      </div>

      {/* Droppable Stage Area */}
      <div 
        ref={setNodeRef} 
        className="p-4 flex-1 min-h-[600px] bg-gradient-to-b from-transparent to-white/[0.01]"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          id={id}
        >
          <div className="space-y-4 h-full">
            {tasks.map((task) => (
              <KanbanCard key={task.id} task={task} />
            ))}

            {/* Empty Terminal State */}
            {tasks.length === 0 && (
              <div className={cn(
                "h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-500",
                isOver ? "border-dream-cyan/40 bg-dream-cyan/5" : "border-white/5 text-white/20"
              )}>
                <div className="text-[10px] font-black tracking-widest leading-none">NO ACTIVE TASKS</div>
                <div className="text-[9px] font-medium opacity-50 uppercase">Drop fragment here</div>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// ============================================================================
// KanbanBoard - กระดานหลัก
// ============================================================================
export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  // เก็บการ์ดที่กำลังลากอยู่ เพื่อโชว์ DragOverlay
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Hook สำหรับ Optimistic Update: อัปเดต UI ก่อน แล้วค่อย call API
  const updateTask = useUpdateTask();
  const { upsertTask } = useTaskStore();

  // กำหนด Sensors สำหรับ Drag & Drop
  const sensors = useSensors(
    // PointerSensor: ต้องลากอย่างน้อย 8px ก่อนจะถือว่าเริ่มลาก (กันการเผลอคลิก)
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // KeyboardSensor: สนับสนุน Accessibility (ใช้คีย์บอร์ดลากได้)
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // เมื่อเริ่มลาก: บันทึกการ์ดที่กำลังลาก
  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  // เมื่อปล่อยเมาส์: ตรวจสอบว่าลากข้ามคอลัมน์หรือไม่ แล้วอัปเดต
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return; // ปล่อยนอกโซน = ยกเลิก

    // หาสถานะปลายทาง
    let targetStatus: TaskStatus | undefined;

    // กรณีที่ 1: ไปปล่อยตรง Column โดยตรง
    if (COLUMNS.some((col) => col.id === over.id)) {
      targetStatus = over.id as TaskStatus;
    } else {
      // กรณีที่ 2: ไปปล่อยทับการ์ดงานอื่น → ใช้สถานะของการ์ดนั้น
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

    const activeTaskData = tasks.find((t) => t.id === active.id);
    if (!activeTaskData || activeTaskData.status === targetStatus) return; // ไม่มีการเปลี่ยน → ข้าม

    // ── Optimistic Update ────────────────────────────────────────────────
    // 1. อัปเดต UI ทันที (ไม่รอ API) ทำให้การ์ดย้ายคอลัมน์แบบ Real-time
    const optimisticTask = { ...activeTaskData, status: targetStatus };
    upsertTask(optimisticTask);

    // 2. เรียก API ไปอัปเดตใน Database
    updateTask.mutate(
      { id: active.id as string, status: targetStatus },
      {
        onError: () => {
          // ถ้า API ล้มเหลว → Rollback กลับสถานะเดิม
          upsertTask(activeTaskData);
        },
      }
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Grid คอลัมน์ (มือถือเลื่อนแนวนอน, Desktop เป็น Grid 3 คอลัมน์) */}
      <div className="mt-6 flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 md:grid md:grid-cols-3 md:overflow-visible md:snap-none">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            accentColor={col.accentColor}
            shadowColor={col.shadowColor}
            tasks={tasks.filter((t) => t.status === col.id)}
          />
        ))}
      </div>

      {/* DragOverlay: การ์ดเงาที่ลอยตามเมาส์ตอนกำลังลาก */}
      <DragOverlay>
        {activeTask && <KanbanCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
