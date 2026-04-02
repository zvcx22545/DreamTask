'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface TaskFiltersProps {
  onFilter: (params: Record<string, string>) => void;
}

export function TaskFilters({ onFilter }: TaskFiltersProps) {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');

  function apply(overrides: Record<string, string> = {}) {
    const params: Record<string, string> = {};
    const s = overrides.status ?? status;
    const p = overrides.priority ?? priority;
    if (s) params.status = s;
    if (p) params.priority = p;
    onFilter(params);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Search (visual only — extend API to support title search as needed) */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหางาน..."
          className="h-9 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Status filter */}
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          apply({ status: e.target.value });
        }}
        className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">สถานะทั้งหมด</option>
        <option value="TODO">รอดำเนินการ</option>
        <option value="IN_PROGRESS">กำลังดำเนินการ</option>
        <option value="DONE">เสร็จแล้ว</option>
      </select>

      {/* Priority filter */}
      <select
        value={priority}
        onChange={(e) => {
          setPriority(e.target.value);
          apply({ priority: e.target.value });
        }}
        className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">ความสำคัญทั้งหมด</option>
        <option value="HIGH">สูง</option>
        <option value="MEDIUM">ปานกลาง</option>
        <option value="LOW">ต่ำ</option>
      </select>
    </div>
  );
}
