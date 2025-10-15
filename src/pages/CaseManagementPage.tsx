import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, PlusCircle, Loader2, ListTodo, MessageSquare } from "lucide-react";
import { format } from 'date-fns';
import { caseService, type Case, type CaseStatus, type CaseTask, type CaseComment } from '@/lib/case-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { CaseTaskCard } from '@/components/ui/case-task-card';
import { CaseCommentCard } from '@/components/ui/case-comment-card';
const caseStatuses: CaseStatus[] = ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'CLOSED', 'ARCHIVED'];
export function CaseManagementPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Partial<Case> | null>(null);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newComment, setNewComment] = useState('');
  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    const res = await caseService.getCases();
    if (res.success && res.data) {
      setCases(res.data);
    } else {
      toast.error("Failed to fetch cases.");
    }
    setIsLoading(false);
  }, []);
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);
  const handleNewCase = () => {
    setEditingCase({ title: '', description: '', status: 'OPEN', assignedTo: 'user-001', documents: [], logs: [], tasks: [], comments: [] });
    setIsDialogOpen(true);
  };
  const handleEditCase = (caseItem: Case) => {
    setEditingCase(caseItem);
    setIsDialogOpen(true);
  };
  const handleDeleteCase = async (id: string) => {
    const res = await caseService.deleteCase(id);
    if (res.success) {
      toast.success("Case deleted successfully.");
      fetchCases();
    } else {
      toast.error("Failed to delete case.");
    }
  };
  const handleSaveCase = async () => {
    if (!editingCase) return;
    const caseData = {
      title: editingCase.title || '',
      description: editingCase.description || '',
      status: editingCase.status || 'OPEN',
      assignedTo: editingCase.assignedTo || 'unassigned',
      documents: editingCase.documents || [],
      logs: editingCase.logs || [],
      tasks: editingCase.tasks || [],
      comments: editingCase.comments || [],
    };
    let res;
    if (editingCase.id) {
      res = await caseService.updateCase(editingCase.id, caseData);
    } else {
      res = await caseService.createCase(caseData);
    }
    if (res.success) {
      toast.success(`Case ${editingCase.id ? 'updated' : 'created'} successfully.`);
      setIsDialogOpen(false);
      setEditingCase(null);
      fetchCases();
    } else {
      toast.error(`Failed to ${editingCase.id ? 'update' : 'create'} case.`);
    }
  };
  const handleAddTask = async () => {
    if (!editingCase?.id || !newTaskDesc.trim()) return;
    const res = await caseService.addTask(editingCase.id, { description: newTaskDesc, assignedTo: 'user-001', status: 'PENDING', dueDate: null });
    if (res.success && res.data) {
      setEditingCase(res.data);
      setNewTaskDesc('');
      toast.success("Task added.");
    } else {
      toast.error("Failed to add task.");
    }
  };
  const handleUpdateTask = async (taskId: string, updates: Partial<CaseTask>) => {
    if (!editingCase?.id) return;
    const res = await caseService.updateTask(editingCase.id, taskId, updates);
    if (res.success && res.data) {
      setEditingCase(res.data);
      toast.success("Task updated.");
    } else {
      toast.error("Failed to update task.");
    }
  };
  const handleDeleteTask = async (taskId: string) => {
    if (!editingCase?.id) return;
    const res = await caseService.deleteTask(editingCase.id, taskId);
    if (res.success && res.data) {
      setEditingCase(res.data);
      toast.success("Task deleted.");
    } else {
      toast.error("Failed to delete task.");
    }
  };
  const handleAddComment = async () => {
    if (!editingCase?.id || !newComment.trim()) return;
    const res = await caseService.addComment(editingCase.id, { userId: 'user-001', content: newComment });
    if (res.success && res.data) {
      setEditingCase(res.data);
      setNewComment('');
      toast.success("Comment added.");
    } else {
      toast.error("Failed to add comment.");
    }
  };
  const getStatusBadgeClass = (status: CaseStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700';
      case 'PENDING_REVIEW': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700';
      case 'CLOSED': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <div className="space-y-8">
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="space-y-2">
              <h1 className="text-4xl font-bold font-display">Case Management</h1>
              <p className="text-lg text-muted-foreground">
                Oversee legal investigations, assign tasks, and track progress.
              </p>
            </div>
            <Button size="lg" onClick={handleNewCase}><PlusCircle className="mr-2 h-5 w-5" /> New Case</Button>
          </motion.header>
          <Card>
            <CardHeader>
              <CardTitle>Active Cases</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Last Modified</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cases.map((caseItem) => (
                        <TableRow key={caseItem.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{caseItem.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("font-semibold", getStatusBadgeClass(caseItem.status))}>{caseItem.status.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell>{caseItem.assignedTo}</TableCell>
                          <TableCell>{format(new Date(caseItem.lastModified), 'PPp')}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditCase(caseItem)}>Edit Case</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDeleteCase(caseItem.id)}>Delete Case</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingCase?.id ? 'Edit Case' : 'Create New Case'}</DialogTitle>
            <DialogDescription>
              {editingCase?.id ? 'Update the details for this case.' : 'Fill in the details to create a new case.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="title">Title</Label><Input id="title" value={editingCase?.title || ''} onChange={(e) => setEditingCase(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label htmlFor="status">Status</Label><Select value={editingCase?.status || 'OPEN'} onValueChange={(v) => setEditingCase(p => ({ ...p, status: v as CaseStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{caseStatuses.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label htmlFor="description">Description</Label><Textarea id="description" value={editingCase?.description || ''} onChange={(e) => setEditingCase(p => ({ ...p, description: e.target.value }))} /></div>
            {editingCase?.id && (
              <>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><ListTodo className="h-5 w-5" /> Tasks</h3>
                  <div className="space-y-2">
                    {editingCase.tasks?.map(task => <CaseTaskCard key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />)}
                  </div>
                  <div className="flex gap-2 mt-2"><Input placeholder="New task description..." value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} /><Button onClick={handleAddTask}>Add Task</Button></div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Comments</h3>
                  <div className="space-y-4">
                    {editingCase.comments?.map(comment => <CaseCommentCard key={comment.id} comment={comment} />)}
                  </div>
                  <div className="flex gap-2 mt-4"><Textarea placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} /><Button onClick={handleAddComment}>Post</Button></div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveCase}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}