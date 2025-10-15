import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseTask } from '../../../worker/types';
interface CaseTaskCardProps {
  task: CaseTask;
  onUpdateTask: (taskId: string, updates: Partial<CaseTask>) => void;
  onDeleteTask: (taskId: string) => void;
}
export function CaseTaskCard({ task, onUpdateTask, onDeleteTask }: CaseTaskCardProps) {
  const handleStatusChange = (checked: boolean) => {
    onUpdateTask(task.id, { status: checked ? 'COMPLETED' : 'PENDING' });
  };
  return (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <Checkbox
          id={`task-${task.id}`}
          checked={task.status === 'COMPLETED'}
          onCheckedChange={handleStatusChange}
        />
        <label
          htmlFor={`task-${task.id}`}
          className={cn(
            "text-sm font-medium leading-none",
            task.status === 'COMPLETED' && "line-through text-muted-foreground"
          )}
        >
          {task.description}
        </label>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteTask(task.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}