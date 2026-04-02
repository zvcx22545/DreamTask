'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useTeamStore } from '@/store/teamStore';
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

export function TeamSwitcher() {
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
    <div className="flex flex-col gap-2 w-full p-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        ทีมของคุณ
      </div>
      
      {isLoading ? (
        <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> โหลดทีม...
        </div>
      ) : (
        <Select
          value={currentTeam?.id || ''}
          onValueChange={(id) => {
            const team = teams.find((t) => t.id === id);
            if (team) setCurrentTeam(team);
          }}
        >
          <SelectTrigger className="w-full bg-background border-none shadow-none font-medium h-10">
            <div className="flex items-center gap-2 truncate">
              <Building className="h-4 w-4 text-primary" />
              <SelectValue placeholder="เลือกทีม..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id} className="cursor-pointer">
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground mt-2" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            สร้างทีมใหม่
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
