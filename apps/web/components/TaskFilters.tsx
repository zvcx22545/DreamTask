'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { cn } from '@/lib/utils';

interface TaskFiltersProps {
  onFilter: (params: Record<string, string>) => void;
  isLoading?: boolean;
}

export function TaskFilters({ onFilter, isLoading: externalLoading }: TaskFiltersProps) {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search for API/Meilisearch
  useEffect(() => {
    if (!search) {
      onFilter({ status, priority });
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      apply({ search });
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  function apply(overrides: Record<string, string> = {}) {
    const params: Record<string, string> = {};
    const s = overrides.status ?? status;
    const p = overrides.priority ?? priority;
    const q = overrides.search ?? search;
    
    if (s) params.status = s;
    if (p) params.priority = p;
    if (q) params.q = q;
    
    onFilter(params);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Search (visual only — extend API to support title search as needed) */}
      {/* Search Input */}
      <div className="relative group min-w-[240px]">
        <div className={cn(
          "absolute -inset-0.5 bg-gradient-to-r from-dream-cyan to-dream-violet rounded-lg blur opacity-0 group-focus-within:opacity-20 transition duration-500",
          (isSearching || externalLoading) && "opacity-30 animate-pulse"
        )}></div>
        <div className="relative flex items-center">
          <Search className={cn(
            "absolute left-3 h-4 w-4 transition-colors",
            search ? "text-dream-cyan" : "text-muted-foreground"
          )} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหางาน..."
            className="w-full h-10 rounded-lg border border-border bg-card/50 backdrop-blur-sm pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-dream-cyan/50 transition-all"
          />
          {(isSearching || externalLoading) && (
            <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-dream-cyan" />
          )}
        </div>
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
