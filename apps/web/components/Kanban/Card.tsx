'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dayjs from '@/lib/dayjs';
import { CalendarIcon, GripVertical, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/store/taskStore';
import { TaskDetailModal } from './TaskDetailModal';

const PRIORITY_COLORS = {
  LOW: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  HIGH: 'text-red-400',
};

const PRIORITY_LABELS = {
  LOW: 'ต่ำ',
  MEDIUM: 'ปานกลาง',
  HIGH: 'สูง',
};

interface KanbanCardProps {
  task: Task;
  isDragging?: boolean;
}

export function KanbanCard({ task, isDragging }: KanbanCardProps) {
  // State: ควบคุมการเปิด/ปิด Task Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'fade-in group relative rounded-lg border border-border bg-card shadow-sm',
          'hover:border-primary/50 hover:shadow-md transition-all duration-200',
          (isDragging || isSortableDragging) && 'opacity-50 shadow-xl scale-105 rotate-1',
        )}
      >
        {/* ── Drag Handle (เฉพาะส่วนนี้เท่านั้นที่ใช้สำหรับลาก) ──────────── */}
        {/* แยก listeners ออกมาใส่แค่ที่ handle อย่างเดียว
            ทำให้ส่วนอื่นของการ์ดสามารถรับ onClick ได้ปกติ */}
        <div
          {...attributes}
          {...listeners}
          className="absolute right-2 top-2 z-10 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* ── Card Body (คลิกเพื่อดูรายละเอียด) ──────────────────────────── */}
        <button
          type="button"
          onClick={() => setIsDetailOpen(true)}
          className="w-full text-left p-4 focus:outline-none"
        >
          {/* Title */}
          <h3 className="pr-6 text-sm font-medium text-foreground line-clamp-2">{task.title}</h3>

          {/* Description */}
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between gap-2">
            {/* Priority */}
            <div className="flex items-center gap-1">
              <Flag className={cn('h-3 w-3', PRIORITY_COLORS[task.priority])} />
              <span className={cn('text-xs', PRIORITY_COLORS[task.priority])}>
                {PRIORITY_LABELS[task.priority]}
              </span>
            </div>

            {/* Due date */}
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                <span>{dayjs(task.dueDate).format('D MMM')}</span>
              </div>
            )}

            {/* Assignee avatar */}
            {task.assignee && (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
                title={task.assignee.name}
              >
                {task.assignee.name[0].toUpperCase()}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Task Detail Modal (render ด้วย Portal ตรง document.body) */}
      {isDetailOpen && (
        <TaskDetailModal task={task} onClose={() => setIsDetailOpen(false)} />
      )}
    </>
  );
}
