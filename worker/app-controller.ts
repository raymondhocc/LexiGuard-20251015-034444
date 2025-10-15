import { DurableObject } from 'cloudflare:workers';
import type { SessionInfo, Document, DocumentMetadata, DocumentVersion, AuditLogEntry, Case, AISuggestion, CaseTask, CaseComment } from './types';
import type { Env } from './core-utils';
export class AppController extends DurableObject<Env> {
  private sessions = new Map<string, SessionInfo>();
  private documents = new Map<string, Document>();
  private auditLogs = new Map<string, AuditLogEntry>();
  private cases = new Map<string, Case>();
  private loaded = false;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      const stored = await this.ctx.storage.get<Record<string, any>>([
        'sessions', 'documents', 'auditLogs', 'cases'
      ]);
      this.sessions = new Map(Object.entries(stored.get('sessions') || {}));
      this.documents = new Map(Object.entries(stored.get('documents') || {}));
      this.auditLogs = new Map(Object.entries(stored.get('auditLogs') || {}));
      this.cases = new Map(Object.entries(stored.get('cases') || {}));
      this.loaded = true;
    }
  }
  private async persist(): Promise<void> {
    await this.ctx.storage.put({
      sessions: Object.fromEntries(this.sessions),
      documents: Object.fromEntries(this.documents),
      auditLogs: Object.fromEntries(this.auditLogs),
      cases: Object.fromEntries(this.cases),
    });
  }
  // Session Management
  async addSession(sessionId: string, title?: string): Promise<void> {
    await this.ensureLoaded();
    const now = Date.now();
    this.sessions.set(sessionId, { id: sessionId, title: title || `Chat ${new Date(now).toLocaleDateString()}`, createdAt: now, lastActive: now });
    await this.persist();
  }
  async removeSession(sessionId: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = this.sessions.delete(sessionId);
    if (deleted) await this.persist();
    return deleted;
  }
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = Date.now();
      await this.persist();
    }
  }
  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.title = title;
      await this.persist();
      return true;
    }
    return false;
  }
  async listSessions(): Promise<SessionInfo[]> {
    await this.ensureLoaded();
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActive - a.lastActive);
  }
  async getSessionCount(): Promise<number> {
    await this.ensureLoaded();
    return this.sessions.size;
  }
  async clearAllSessions(): Promise<number> {
    await this.ensureLoaded();
    const count = this.sessions.size;
    this.sessions.clear();
    await this.persist();
    return count;
  }
  // Document Management
  async createDocument(doc: Omit<Document, 'id' | 'createdAt' | 'lastModified' | 'versions'>): Promise<Document> {
    await this.ensureLoaded();
    const id = crypto.randomUUID();
    const now = Date.now();
    const initialVersion: DocumentVersion = { version: 1, timestamp: now, userId: doc.ownerId || 'system', changesSummary: 'Initial document creation.', documentContent: doc.content };
    const newDoc: Document = { ...doc, id, createdAt: now, lastModified: now, versions: [initialVersion] };
    this.documents.set(id, newDoc);
    await this.persist();
    return newDoc;
  }
  async getDocument(id: string): Promise<Document | undefined> {
    await this.ensureLoaded();
    return this.documents.get(id);
  }
  async updateDocument(id: string, updates: Partial<Omit<Document, 'id' | 'createdAt' | 'versions'>>): Promise<Document | undefined> {
    await this.ensureLoaded();
    const doc = this.documents.get(id);
    if (!doc) return undefined;
    const now = Date.now();
    const newVersionNumber = (doc.versions?.length || 0) + 1;
    const newVersion: DocumentVersion = { version: newVersionNumber, timestamp: now, userId: 'mock-user', changesSummary: updates.content !== doc.content ? 'Content updated.' : 'Metadata updated.', documentContent: doc.content };
    const updatedDoc: Document = { ...doc, ...updates, lastModified: now, versions: [...(doc.versions || []), newVersion] };
    this.documents.set(id, updatedDoc);
    await this.persist();
    return updatedDoc;
  }
  async deleteDocument(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = this.documents.delete(id);
    if (deleted) await this.persist();
    return deleted;
  }
  async listDocuments(): Promise<DocumentMetadata[]> {
    await this.ensureLoaded();
    const metadata: DocumentMetadata[] = [];
    for (const doc of this.documents.values()) {
      const { content, versions, ...meta } = doc;
      metadata.push(meta);
    }
    return metadata.sort((a, b) => b.lastModified - a.lastModified);
  }
  async getDocumentVersions(id: string): Promise<DocumentVersion[] | undefined> {
    await this.ensureLoaded();
    const doc = this.documents.get(id);
    return doc?.versions;
  }
  async getDocumentVersion(id: string, version: number): Promise<DocumentVersion | undefined> {
    await this.ensureLoaded();
    const doc = this.documents.get(id);
    return doc?.versions?.find(v => v.version === version);
  }
  async applyAISuggestion(documentId: string, suggestion: AISuggestion): Promise<Document | undefined> {
    await this.ensureLoaded();
    const doc = await this.getDocument(documentId);
    if (!doc) return undefined;
    let newContent = doc.content;
    if (suggestion.type === 'REPLACEMENT' && suggestion.originalContent) {
        newContent = newContent.replace(suggestion.originalContent, suggestion.content);
    } else if (suggestion.type === 'ADDITION') {
        newContent += `\n\n${suggestion.content}`;
    } else if (suggestion.type === 'REMOVAL') {
        newContent = newContent.replace(suggestion.content, '');
    }
    return this.updateDocument(documentId, { content: newContent });
  }
  // Audit Log Management
  async addLogEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    await this.ensureLoaded();
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const newEntry: AuditLogEntry = { ...entry, id, timestamp };
    this.auditLogs.set(id, newEntry);
    await this.persist();
    return newEntry;
  }
  async listLogEntries(): Promise<AuditLogEntry[]> {
    await this.ensureLoaded();
    return Array.from(this.auditLogs.values()).sort((a, b) => b.timestamp - a.timestamp);
  }
  // Case Management
  async createCase(caseData: Omit<Case, 'id' | 'createdAt' | 'lastModified' | 'tasks' | 'comments'>): Promise<Case> {
    await this.ensureLoaded();
    const id = crypto.randomUUID();
    const now = Date.now();
    const newCase: Case = { ...caseData, id, createdAt: now, lastModified: now, tasks: [], comments: [] };
    this.cases.set(id, newCase);
    await this.persist();
    return newCase;
  }
  async getCase(id: string): Promise<Case | undefined> {
    await this.ensureLoaded();
    return this.cases.get(id);
  }
  async updateCase(id: string, updates: Partial<Omit<Case, 'id' | 'createdAt'>>): Promise<Case | undefined> {
    await this.ensureLoaded();
    const caseData = this.cases.get(id);
    if (!caseData) return undefined;
    const updatedCase: Case = { ...caseData, ...updates, lastModified: Date.now() };
    this.cases.set(id, updatedCase);
    await this.persist();
    return updatedCase;
  }
  async deleteCase(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = this.cases.delete(id);
    if (deleted) await this.persist();
    return deleted;
  }
  async listCases(): Promise<Case[]> {
    await this.ensureLoaded();
    return Array.from(this.cases.values()).sort((a, b) => b.lastModified - a.lastModified);
  }
  async addTaskToCase(caseId: string, task: Omit<CaseTask, 'id' | 'createdAt'>): Promise<Case | undefined> {
    await this.ensureLoaded();
    const caseData = this.cases.get(caseId);
    if (!caseData) return undefined;
    const newTask: CaseTask = { ...task, id: crypto.randomUUID(), createdAt: Date.now() };
    caseData.tasks.push(newTask);
    caseData.lastModified = Date.now();
    await this.persist();
    return caseData;
  }
  async addCommentToCase(caseId: string, comment: Omit<CaseComment, 'id' | 'timestamp'>): Promise<Case | undefined> {
    await this.ensureLoaded();
    const caseData = this.cases.get(caseId);
    if (!caseData) return undefined;
    const newComment: CaseComment = { ...comment, id: crypto.randomUUID(), timestamp: Date.now() };
    caseData.comments.push(newComment);
    caseData.lastModified = Date.now();
    await this.persist();
    return caseData;
  }
  async updateCaseTask(caseId: string, taskId: string, updates: Partial<CaseTask>): Promise<Case | undefined> {
    await this.ensureLoaded();
    const caseData = this.cases.get(caseId);
    if (!caseData) return undefined;
    const taskIndex = caseData.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return undefined;
    caseData.tasks[taskIndex] = { ...caseData.tasks[taskIndex], ...updates };
    caseData.lastModified = Date.now();
    await this.persist();
    return caseData;
  }
  async deleteCaseTask(caseId: string, taskId: string): Promise<Case | undefined> {
    await this.ensureLoaded();
    const caseData = this.cases.get(caseId);
    if (!caseData) return undefined;
    caseData.tasks = caseData.tasks.filter(t => t.id !== taskId);
    caseData.lastModified = Date.now();
    await this.persist();
    return caseData;
  }
}