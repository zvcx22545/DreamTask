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
  LOW: 'text-dream-cyan',
  MEDIUM: 'text-yellow-400',
  HIGH: 'text-rose-400',
};

const PRIORITY_GLOWS = {
  LOW: 'border-dream-cyan/20 bg-dream-cyan/5',
  MEDIUM: 'border-yellow-400/20 bg-yellow-400/5',
  HIGH: 'border-rose-400/40 bg-rose-400/10 neon-glow-violet',
} as const;

interface KanbanCardProps {
  task: Task;
  isDragging?: boolean;
}

export function KanbanCard({ task, isDragging }: KanbanCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActuallyDragging = isDragging || isSortableDragging;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'glass-card group relative p-4 cursor-default border border-white/5',
          PRIORITY_GLOWS[task.priority as keyof typeof PRIORITY_GLOWS],
          isActuallyDragging && 'z-50 scale-105 rotate-2 shadow-2xl opacity-90 border-dream-cyan/50',
        )}
      >
        {/* ── Drag Handle ────────────────────────────────────────────────── */}
        <div
          {...attributes}
          {...listeners}
          className="absolute right-3 top-3 z-20 cursor-grab opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg bg-white/5 border border-white/10"
        >
          <GripVertical className="h-4 w-4 text-white/40" />
        </div>

        {/* ── Card Body ──────────────────────────────────────────────────── */}
        <div
          onClick={() => setIsDetailOpen(true)}
          className="cursor-pointer space-y-3"
        >
          {/* Priority Indicator Dot */}
          <div className="flex items-center gap-2">
             <div className={cn('h-1.5 w-1.5 rounded-full animate-pulse', 
                 task.priority === 'HIGH' ? 'bg-rose-400 neon-glow-violet' : 
                 task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-dream-cyan'
             )} />
             <span className={cn('text-[10px] font-black uppercase tracking-[0.2em]', PRIORITY_COLORS[task.priority])}>
                {task.priority} PHASE
             </span>
          </div>

          <h3 className="text-sm font-bold text-white/90 leading-snug group-hover:text-dream-cyan transition-colors">
            {task.title}
          </h3>

          {task.description && (
            <p className="text-xs text-white/40 line-clamp-2 leading-relaxed font-medium">
              {task.description}
            </p>
          )}

          {/* Footer Metadata */}
          <div className="pt-2 flex items-center justify-between border-t border-white/5">
            <div className="flex items-center gap-4">
              {task.dueDate && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>{dayjs(task.dueDate).format('MMM D')}</span>
                </div>
              )}
            </div>

            {task.assignee && (
              <div className="flex -space-x-2">
                 <div className="h-6 w-6 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-[10px] font-bold text-dream-cyan backdrop-blur-sm">
                    {task.assignee.name[0].toUpperCase()}
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Modal (render ด้วย Portal ตรง document.body) */}
      {isDetailOpen && (
        <TaskDetailModal task={task} onClose={() => setIsDetailOpen(false)} />
      )}
    </>
  );
}
