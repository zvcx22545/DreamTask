'use client';

import { CheckCircle, Clock, ListTodo } from 'lucide-react';

interface MetricsBarProps {
  total: number;
  completed: number;
  pending: number;
}

export function MetricsBar({ total, completed, pending }: MetricsBarProps) {
  const metrics = [
    {
      label: 'งานทั้งหมด',
      value: total,
      icon: ListTodo,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'เสร็จแล้ว',
      value: completed,
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'รอดำเนินการ',
      value: pending,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className={`mt-1 text-3xl font-bold ${m.color}`}>{m.value}</p>
            </div>
            <div className={`rounded-lg p-3 ${m.bg}`}>
              <m.icon className={`h-6 w-6 ${m.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
