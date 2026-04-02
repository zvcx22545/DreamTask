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

// ── กำหนดข้อมูลของแต่ละคอลัมน์ ─────────────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string; borderColor: string; countColor: string }[] = [
  { id: 'TODO',        label: 'รอดำเนินการ',     borderColor: 'border-muted-foreground/30', countColor: 'text-muted-foreground' },
  { id: 'IN_PROGRESS', label: 'กำลังดำเนินการ',  borderColor: 'border-blue-500/50',         countColor: 'text-blue-400' },
  { id: 'DONE',        label: 'เสร็จแล้ว',        borderColor: 'border-green-500/50',        countColor: 'text-green-400' },
];

// ============================================================================
// KanbanColumn - คอลัมน์แต่ละอัน (ถูก register เป็น Droppable Zone)
// ============================================================================
function KanbanColumn({
  id,
  label,
  borderColor,
  countColor,
  tasks,
}: {
  id: TaskStatus;
  label: string;
  borderColor: string;
  countColor: string;
  tasks: Task[];
}) {
  // useDroppable: ลงทะเบียนว่า div นี้คือโซนรับการวาง
  // ถ้าไม่มีตัวนี้ DnD ไม่รู้ว่าคอลัมน์ไหนรับการวางได้
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`kanban-column flex flex-col rounded-xl border-t-4 ${borderColor}
        bg-card/60 shadow-sm overflow-hidden min-w-[300px] snap-center md:min-w-0
        transition-colors duration-200 ${isOver ? 'bg-accent/30' : ''}`}
    >
      {/* Header ของคอลัมน์ */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/50">
        <h2 className={`font-bold text-sm tracking-wide uppercase ${countColor}`}>{label}</h2>
        <span className="rounded-full bg-background border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground shadow-sm">
          {tasks.length}
        </span>
      </div>

      {/* Droppable body: พื้นที่วางการ์ด */}
      <div ref={setNodeRef} className="p-3 flex-1 min-h-[500px]">
        {/* SortableContext บอก DnD ว่า list นี้เรียงแนวตั้ง */}
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          id={id}
        >
          <div className="space-y-3 h-full">
            {tasks.map((task) => (
              <KanbanCard key={task.id} task={task} />
            ))}

            {/* Empty state */}
            {tasks.length === 0 && (
              <div className={`h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-xs transition-colors ${isOver ? 'border-primary/50 text-primary/50' : 'border-border/50 text-muted-foreground/50'}`}>
                ลากงานมาวางที่นี่
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
            borderColor={col.borderColor}
            countColor={col.countColor}
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
