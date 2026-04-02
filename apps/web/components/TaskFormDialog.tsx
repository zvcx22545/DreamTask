'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { useCreateTask } from '@/hooks/useTasks';
import { useTeamStore } from '@/store/teamStore';
import { cn } from '@/lib/utils';
import { BlockEditor } from '@/components/editor/BlockEditor';

const schema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่องาน').max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function TaskFormDialog() {
  const [open, setOpen] = useState(false);
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const createTask = useCreateTask();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    if (!currentTeam) {
      alert("กรุณาเลือกทีมก่อนสร้างงาน");
      return;
    }
    
    await createTask.mutateAsync({
      ...data,
      teamId: currentTeam.id,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        สร้างงานใหม่
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="fade-in w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">สร้างงานใหม่</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">ชื่องาน *</label>
                <input
                  {...register('title')}
                  className={cn(
                    'w-full rounded-lg border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                    errors.title ? 'border-destructive' : 'border-border',
                  )}
                  placeholder="เช่น ออกแบบหน้า Landing Page"
                />
                {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">รายละเอียด</label>
                <BlockEditor 
                  content={watch('description')} 
                  onChange={(val) => setValue('description', val)} 
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">สถานะ</label>
                  <select {...register('status')} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="TODO">รอดำเนินการ</option>
                    <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                    <option value="DONE">เสร็จแล้ว</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">ความสำคัญ</label>
                  <select {...register('priority')} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="LOW">ต่ำ</option>
                    <option value="MEDIUM">ปานกลาง</option>
                    <option value="HIGH">สูง</option>
                  </select>
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">วันครบกำหนด</label>
                <input
                  type="date"
                  {...register('dueDate')}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'กำลังสร้าง...' : 'สร้างงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
