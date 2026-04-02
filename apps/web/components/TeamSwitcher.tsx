'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useTeamStore } from '@/store/teamStore';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Team {
  id: string;
  name: string;
}

interface TeamSwitcherProps {
  collapsed?: boolean;
}

export function TeamSwitcher({ collapsed }: TeamSwitcherProps) {
  const { currentTeam, setCurrentTeam } = useTeamStore();
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const { data, isLoading } = useQuery<{ teams: Team[] }>({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then((res) => res.data),
  });

  const teams = data?.teams || [];

  // Auto-select first team if none selected and teams exist
  useEffect(() => {
    if (!currentTeam && teams.length > 0) {
      setCurrentTeam(teams[0]);
    }
  }, [teams, currentTeam, setCurrentTeam]);

  const createTeamMutation = useMutation({
    mutationFn: (name: string) => api.post<{ team: Team }>('/teams', { name }).then((r) => r.data.team),
    onSuccess: (newTeam) => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      setCurrentTeam(newTeam);
      setIsDialogOpen(false);
      setNewTeamName('');
    },
  });

  return (
    <div className="flex flex-col gap-2 w-full p-1">
      {!collapsed && (
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1 px-2 opacity-50">
          ทีมของคุณ
        </div>
      )}
      
      {isLoading ? (
        <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-dream-cyan" /> 
          {!collapsed && "โหลดทีม..."}
        </div>
      ) : (
        <Select
          value={currentTeam?.id || ''}
          onValueChange={(id) => {
            const team = teams.find((t) => t.id === id);
            if (team) setCurrentTeam(team);
          }}
        >
          <SelectTrigger className={cn(
            "w-full bg-white/5 border-white/10 shadow-none font-medium h-12 rounded-xl hover:bg-white/10 transition-all",
            collapsed && "px-0 justify-center"
          )}>
            <div className="flex items-center gap-2 truncate">
              <Building className="h-4 w-4 text-dream-cyan" />
              {!collapsed && <SelectValue placeholder="เลือกทีม..." />}
            </div>
          </SelectTrigger>
          <SelectContent className="bg-dream-indigo border-white/10 text-white outline-none">
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 outline-none">
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all",
              collapsed && "px-0 justify-center"
            )} 
            size="sm"
          >
            <Plus className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && "สร้างทีมใหม่"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างทีมใหม่</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <Input
              placeholder="ชื่อทีมของคุณ..."
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              disabled={createTeamMutation.isPending}
            />
            <Button
              onClick={() => {
                if (newTeamName.trim()) {
                  createTeamMutation.mutate(newTeamName.trim());
                }
              }}
              disabled={!newTeamName.trim() || createTeamMutation.isPending}
            >
              {createTeamMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ยืนยันสร้างทีม
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
