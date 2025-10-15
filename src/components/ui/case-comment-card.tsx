import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from 'date-fns';
import type { CaseComment } from '../../../worker/types';
interface CaseCommentCardProps {
  comment: CaseComment;
}
export function CaseCommentCard({ comment }: CaseCommentCardProps) {
  return (
    <div className="flex items-start gap-3 p-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback>{comment.userId.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{comment.userId}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(comment.timestamp), 'PPp')}</p>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
      </div>
    </div>
  );
}