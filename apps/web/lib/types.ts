export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  assigneeId?: string;
  teamId: string;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;
