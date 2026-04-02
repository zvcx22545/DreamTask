'use client';

// ============================================================================
// TaskDetailModal - โชว์รายละเอียดงาน / แก้ไขงาน
// ============================================================================
// Component นี้จะเปิดขึ้นมาเมื่อผู้ใช้คลิกที่การ์ดงานใน Kanban Board
// แสดงข้อมูลทั้งหมดของงาน และมีฟีเจอร์แก้ไข / ลบ

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Pencil, Trash2, Flag, Calendar, User, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dayjs';
import type { Task, TaskStatus, Priority } from '@/store/taskStore';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { openDialog } from '@/store/uiStore';
import { toast } from '@/store/uiStore';
import DOMPurify from 'dompurify';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { useComments, useAddComment, useDeleteComment } from '@/hooks/useComments';
import { Send, Trash } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// ── ค่า Map สำหรับแสดงผล (แทนที่โค้ดแบบ Hardcode) ────────────────────────
const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'รอดำเนินการ',
  IN_PROGRESS: 'กำลังดำเนินการ',
  DONE: 'เสร็จแล้ว',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
  DONE: 'bg-green-500/20 text-green-400',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'ต่ำ',
  MEDIUM: 'ปานกลาง',
  HIGH: 'สูง',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  HIGH: 'text-red-400',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // isEditing: true = อยู่ในโหมดแก้ไข, false = แค่ดูข้อมูล
  const [isEditing, setIsEditing] = useState(false);

  // editForm: เก็บค่าที่กำลังแก้ไขอยู่ (clone จาก task ตั้งต้น)
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
  });

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // ── Handlers ──────────────────────────────────────────────────────────────

  // ฟังก์ชันบันทึกการแก้ไข
  const handleSave = () => {
    updateTask.mutate(
      { id: task.id, ...editForm },
      {
        onSuccess: () => {
          toast({ title: 'บันทึกสำเร็จ', variant: 'success' });
          setIsEditing(false);
          onClose();
        },
        onError: () => {
          toast({ title: 'เกิดข้อผิดพลาด ไม่สามารถบันทึกได้', variant: 'error' });
        },
      }
    );
  };

  // ฟังก์ชันยืนยันก่อนลบ (ใช้ Dialog จาก uiStore)
  const handleDelete = () => {
    openDialog({
      title: 'ลบงานนี้?',
      description: `คุณต้องการลบงาน "${task.title}" ใช่หรือไม่? ไม่สามารถยกเลิกได้`,
      variant: 'destructive',
      confirmLabel: 'ลบ',
      onConfirm: () => {
        deleteTask.mutate(task.id, {
          onSuccess: () => {
            toast({ title: 'ลบงานสำเร็จ', variant: 'success' });
            onClose();
          },
        });
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!mounted) return null;

  // ใช้ createPortal เพื่อ render ตรง document.body
  // ป้องกันปัญหา Z-index / stacking context จาก parent component
  return createPortal(
    <AnimatePresence>
      {/* Backdrop - พื้นหลังมืด คลิกเพื่อปิด */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        // fixed + translate เพื่อให้อยู่กลางจอเสมอ
        className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()} // ป้องกัน click ทะลุ backdrop
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-5 border-b border-border bg-background/50">
            <div className="flex-1 min-w-0 pr-4">
              {isEditing ? (
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full text-base font-semibold bg-background border border-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <h2 className="text-base font-semibold text-foreground">{task.title}</h2>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* ปุ่ม Edit / Save */}
              {isEditing ? (
                <button
                  onClick={handleSave}
                  disabled={updateTask.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {updateTask.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  บันทึก
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {/* ปุ่ม Delete */}
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {/* ปุ่มปิด */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className="p-5 space-y-4">
            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                รายละเอียด
              </label>
              {isEditing ? (
                <div className="mt-1">
                  <BlockEditor
                    content={editForm.description}
                    onChange={(val) => setEditForm((f) => ({ ...f, description: val }))}
                  />
                </div>
              ) : (
                <div
                  className="mt-1.5 text-sm text-foreground/90 prose dark:prose-invert max-w-none break-words"
                  dangerouslySetInnerHTML={{
                    __html: task.description && task.description.trim() !== '' && task.description !== '<p></p>'
                      ? DOMPurify.sanitize(task.description)
                      : '<span class="text-muted-foreground italic">ไม่มีรายละเอียด</span>'
                  }}
                />
              )}
            </div>

            {/* Grid: Status + Priority */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  สถานะ
                </label>
                {isEditing ? (
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                    className="mt-1.5 w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="TODO">รอดำเนินการ</option>
                    <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                    <option value="DONE">เสร็จแล้ว</option>
                  </select>
                ) : (
                  <span className={cn('mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[task.status])}>
                    {STATUS_LABELS[task.status]}
                  </span>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  ความสำคัญ
                </label>
                {isEditing ? (
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                    className="mt-1.5 w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="LOW">ต่ำ</option>
                    <option value="MEDIUM">ปานกลาง</option>
                    <option value="HIGH">สูง</option>
                  </select>
                ) : (
                  <div className={cn('mt-1.5 flex items-center gap-1.5 text-sm font-medium', PRIORITY_COLORS[task.priority])}>
                    <Flag className="h-3.5 w-3.5" />
                    {PRIORITY_LABELS[task.priority]}
                  </div>
                )}
              </div>
            </div>

            {/* Grid: Assignee + Date */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
              {/* Assignee */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3" /> ผู้รับผิดชอบ
                </label>
                <p className="mt-1.5 text-sm text-foreground/80">
                  {task.assignee?.name ?? <span className="text-muted-foreground italic">ไม่ได้กำหนด</span>}
                </p>
              </div>

              {/* Due Date */}
              {task.dueDate && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> กำหนดส่ง
                  </label>
                  <p className="mt-1.5 text-sm text-foreground/80">
                    {dayjs(task.dueDate).format('D MMMM YYYY')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer: timestamps ─────────────────────────────────────── */}
          <div className="px-5 pb-4 flex items-center justify-between text-xs text-muted-foreground/60 border-t border-border/50 pt-3">
            <span>สร้างเมื่อ: {dayjs(task.createdAt).fromNow()}</span>
            <span>แก้ไขล่าสุด: {dayjs(task.updatedAt).fromNow()}</span>
          </div>

          {/* ── Comment Section ────────────────────────────────────────── */}
          <CommentSection taskId={task.id} />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

/**
 * ── CommentSection ───────────────────────────────────────────────────────────
 * ส่วนแสดงผลและจัดการคอมเมนต์ของงาน
 * รองรับการดึงข้อมูล, เพิ่ม และลบคอมเมนต์
 */
function CommentSection({ taskId }: { taskId: string }) {
  const { data: comments, isLoading } = useComments(taskId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const currentUser = useAuthStore((s) => s.user);
  const [content, setContent] = useState('');

  // ฟังก์ชันส่งคอมเมนต์
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || addComment.isPending) return;

    addComment.mutate(
      { taskId, content },
      {
        onSuccess: () => {
          setContent('');
          toast({ title: 'เพิ่มคอมเมนต์แล้ว', variant: 'success' });
        },
      }
    );
  };

  // ฟังก์ชันลบคอมเมนต์
  const handleDelete = (commentId: string) => {
    deleteComment.mutate({ taskId, commentId }, {
      onSuccess: () => toast({ title: 'ลบคอมเมนต์แล้ว', variant: 'success' })
    });
  };

  return (
    <div className="border-t border-border/50 bg-white/[0.02]">
      <div className="p-5">
        <h3 className="text-xs font-black tracking-widest text-muted-foreground uppercase mb-4">
          COMMENTS ({comments?.length ?? 0})
        </h3>

        {/* Comment List */}
        <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-dream-cyan" />
            </div>
          ) : comments?.length === 0 ? (
            <p className="text-sm text-muted-foreground/50 italic text-center py-4">
              ยังไม่มีความคิดเห็น... เริ่มแชร์ไอเดียกันเลย!
            </p>
          ) : (
            comments?.map((c) => (
              <div key={c.id} className="group relative flex gap-3">
                <div className="relative flex-shrink-0">
                  <div className="absolute -inset-0.5 bg-gradient-to-tr from-dream-cyan to-dream-violet rounded-full blur opacity-20 group-hover/profile:opacity-50 transition duration-500"></div>
                  {currentUser?.id === c.userId && (
                    currentUser.avatar ? (
                      <Image
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        width={40}
                        height={40}
                        className="relative h-10 w-10 rounded-full object-cover border border-white/20"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-dream-indigo to-dream-purple flex items-center justify-center text-sm font-bold text-white">
                        {currentUser.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white/90">{c.user.name}</span>
                    <span className="text-[10px] text-muted-foreground/60">{dayjs(c.createdAt).fromNow()}</span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed break-words">{c.content}</p>
                </div>

                {/* Delete Button (Visible for owner) */}
                {currentUser?.id === c.userId && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                    title="ลบคอมเมนต์"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="เขียนความคิดเห็นของคุณ..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-dream-cyan/50 placeholder:text-white/20 transition-all"
          />
          <button
            type="submit"
            disabled={!content.trim() || addComment.isPending}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-dream-cyan text-dream-indigo hover:bg-dream-cyan/90 disabled:opacity-50 disabled:grayscale transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)]"
          >
            {addComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
