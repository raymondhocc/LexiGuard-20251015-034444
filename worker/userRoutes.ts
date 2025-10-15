import { Hono, type Context } from "hono";
import { getAgentByName } from 'agents';
import { ChatAgent } from './agent';
import { DocumentStore } from './document-store';
import { AuditLog } from './audit-log';
import { CaseManagement } from './case-management';
import { API_RESPONSES } from './config';
import { Env, getAppController, registerSession, unregisterSession } from "./core-utils";
import { MODELS } from './chat';
import type { AISuggestion, Document } from './types';
import type { DurableObjectStub } from "@cloudflare/workers-types";
// Add Durable Objects to exports for wrangler
export { DocumentStore, AuditLog, CaseManagement };
/**
 * DO NOT MODIFY THIS FUNCTION. Only for your reference.
 */
export function coreRoutes(app: Hono<{ Bindings: Env }>) {
    // Use this API for conversations. **DO NOT MODIFY**
    app.all('/api/chat/:sessionId/*', async (c) => {
        try {
        const sessionId = c.req.param('sessionId');
        const agent = await getAgentByName<Env, ChatAgent>(c.env.CHAT_AGENT as any, sessionId); // Get existing agent or create a new one if it doesn't exist, with sessionId as the name
        const url = new URL(c.req.url);
        url.pathname = url.pathname.replace(`/api/chat/${sessionId}`, '');
        return agent.fetch(new Request(url.toString(), {
            method: c.req.method,
            headers: c.req.header(),
            body: c.req.method === 'GET' || c.req.method === 'DELETE' ? undefined : c.req.raw.body
        }));
        } catch (error) {
        console.error('Agent routing error:', error);
        return c.json({
            success: false,
            error: API_RESPONSES.AGENT_ROUTING_FAILED
        }, { status: 500 });
        }
    });
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // AI Models Route
    app.get('/api/models', (c) => {
        return c.json({ success: true, data: MODELS });
    });
    // Mock Authentication Routes
    app.post('/api/auth/login', async (c) => {
        const { username, password } = await c.req.json();
        if (username === 'user' && password === 'password') {
            return c.json({ success: true, token: `mock-token-${Date.now()}` });
        }
        return c.json({ success: false, error: 'Invalid credentials' }, 401);
    });
    app.post('/api/auth/logout', (c) => {
        return c.json({ success: true });
    });
    // Document Management Routes
    app.post('/api/documents', async (c) => {
        const docData = await c.req.json();
        const controller = getAppController(c.env);
        const newDoc = await controller.createDocument(docData);
        return c.json({ success: true, data: newDoc });
    });
    app.get('/api/documents', async (c) => {
        const controller = getAppController(c.env);
        const docs = await controller.listDocuments();
        return c.json({ success: true, data: docs });
    });
    app.get('/api/documents/:id', async (c) => {
        const { id } = c.req.param();
        const controller = getAppController(c.env);
        const doc = await controller.getDocument(id);
        if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);
        return c.json({ success: true, data: doc });
    });
    app.put('/api/documents/:id', async (c) => {
        const { id } = c.req.param();
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updatedDoc = await controller.updateDocument(id, updates);
        if (!updatedDoc) return c.json({ success: false, error: 'Document not found' }, 404);
        return c.json({ success: true, data: updatedDoc });
    });
    app.delete('/api/documents/:id', async (c) => {
        const { id } = c.req.param();
        const controller = getAppController(c.env);
        const success = await controller.deleteDocument(id);
        if (!success) return c.json({ success: false, error: 'Document not found' }, 404);
        return c.json({ success: true });
    });
    // Document Versioning Routes
    app.get('/api/documents/:id/versions', async (c) => {
        const { id } = c.req.param();
        const controller = getAppController(c.env);
        const versions = await controller.getDocumentVersions(id);
        if (!versions) return c.json({ success: false, error: 'Document not found' }, 404);
        return c.json({ success: true, data: versions });
    });
    app.get('/api/documents/:id/versions/:version', async (c) => {
        const { id, version } = c.req.param();
        const controller = getAppController(c.env);
        const versionData = await controller.getDocumentVersion(id, parseInt(version, 10));
        if (!versionData) return c.json({ success: false, error: 'Version not found' }, 404);
        return c.json({ success: true, data: versionData });
    });
    // AI Suggestion Route
    app.put('/api/documents/:id/apply-suggestion', async (c) => {
        const { id } = c.req.param();
        const { suggestion } = await c.req.json<{ suggestion: AISuggestion }>();
        const controller = getAppController(c.env);
        const updatedDoc = await controller.applyAISuggestion(id, suggestion);
        if (!updatedDoc) return c.json({ success: false, error: 'Document not found' }, 404);
        return c.json({ success: true, data: updatedDoc });
    });
    // Audit Log Routes
    app.post('/api/audit', async (c) => {
        const logData = await c.req.json();
        const controller = getAppController(c.env);
        const newLog = await controller.addLogEntry(logData);
        return c.json({ success: true, data: newLog });
    });
    app.get('/api/audit', async (c) => {
        const controller = getAppController(c.env);
        const logs = await controller.listLogEntries();
        return c.json({ success: true, data: logs });
    });
    // Case Management Routes
    app.post('/api/cases', async (c) => {
        const caseData = await c.req.json();
        const controller = getAppController(c.env);
        const newCase = await controller.createCase(caseData);
        return c.json({ success: true, data: newCase });
    });
    app.get('/api/cases', async (c) => {
        const controller = getAppController(c.env);
        const cases = await controller.listCases();
        return c.json({ success: true, data: cases });
    });
    app.get('/api/cases/:id', async (c) => {
        const { id } = c.req.param();
        const controller = getAppController(c.env);
        const caseData = await controller.getCase(id);
        if (!caseData) return c.json({ success: false, error: 'Case not found' }, 404);
        return c.json({ success: true, data: caseData });
    });
    app.put('/api/cases/:id', async (c) => {
        const { id } = c.req.param();
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updatedCase = await controller.updateCase(id, updates);
        if (!updatedCase) return c.json({ success: false, error: 'Case not found' }, 404);
        return c.json({ success: true, data: updatedCase });
    });
    app.delete('/api/cases/:id', async (c) => {
        const { id } = c.req.param();
        const controller = getAppController(c.env);
        const success = await controller.deleteCase(id);
        if (!success) return c.json({ success: false, error: 'Case not found' }, 404);
        return c.json({ success: true });
    });
    // Case Tasks Routes
    app.post('/api/cases/:id/tasks', async (c) => {
        const { id } = c.req.param();
        const taskData = await c.req.json();
        const controller = getAppController(c.env);
        const updatedCase = await controller.addTaskToCase(id, taskData);
        if (!updatedCase) return c.json({ success: false, error: 'Case not found' }, 404);
        return c.json({ success: true, data: updatedCase });
    });
    app.put('/api/cases/:id/tasks/:taskId', async (c) => {
        const { id, taskId } = c.req.param();
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updatedCase = await controller.updateCaseTask(id, taskId, updates);
        if (!updatedCase) return c.json({ success: false, error: 'Case or Task not found' }, 404);
        return c.json({ success: true, data: updatedCase });
    });
    app.delete('/api/cases/:id/tasks/:taskId', async (c) => {
        const { id, taskId } = c.req.param();
        const controller = getAppController(c.env);
        const updatedCase = await controller.deleteCaseTask(id, taskId);
        if (!updatedCase) return c.json({ success: false, error: 'Case or Task not found' }, 404);
        return c.json({ success: true, data: updatedCase });
    });
    // Case Comments Routes
    app.post('/api/cases/:id/comments', async (c) => {
        const { id } = c.req.param();
        const commentData = await c.req.json();
        const controller = getAppController(c.env);
        const updatedCase = await controller.addCommentToCase(id, commentData);
        if (!updatedCase) return c.json({ success: false, error: 'Case not found' }, 404);
        return c.json({ success: true, data: updatedCase });
    });
    // Session Management Routes
    app.get('/api/sessions', async (c) => {
        try {
            const controller = getAppController(c.env);
            const sessions = await controller.listSessions();
            return c.json({ success: true, data: sessions });
        } catch (error) {
            console.error('Failed to list sessions:', error);
            return c.json({ success: false, error: 'Failed to retrieve sessions' }, { status: 500 });
        }
    });
    app.post('/api/sessions', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const { title, sessionId: providedSessionId, firstMessage } = body;
            const sessionId = providedSessionId || crypto.randomUUID();
            let sessionTitle = title;
            if (!sessionTitle) {
                const now = new Date();
                const dateTime = now.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                if (firstMessage && firstMessage.trim()) {
                    const cleanMessage = firstMessage.trim().replace(/\s+/g, ' ');
                    const truncated = cleanMessage.length > 40 ? cleanMessage.slice(0, 37) + '...' : cleanMessage;
                    sessionTitle = `${truncated} • ${dateTime}`;
                } else {
                    sessionTitle = `Chat ${dateTime}`;
                }
            }
            await registerSession(c.env, sessionId, sessionTitle);
            return c.json({ success: true, data: { sessionId, title: sessionTitle } });
        } catch (error) {
            console.error('Failed to create session:', error);
            return c.json({ success: false, error: 'Failed to create session' }, { status: 500 });
        }
    });
    app.delete('/api/sessions/:sessionId', async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const deleted = await unregisterSession(c.env, sessionId);
            if (!deleted) return c.json({ success: false, error: 'Session not found' }, { status: 404 });
            return c.json({ success: true, data: { deleted: true } });
        } catch (error) {
            console.error('Failed to delete session:', error);
            return c.json({ success: false, error: 'Failed to delete session' }, { status: 500 });
        }
    });
    app.put('/api/sessions/:sessionId/title', async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const { title } = await c.req.json();
            if (!title || typeof title !== 'string') return c.json({ success: false, error: 'Title is required' }, { status: 400 });
            const controller = getAppController(c.env);
            const updated = await controller.updateSessionTitle(sessionId, title);
            if (!updated) return c.json({ success: false, error: 'Session not found' }, { status: 404 });
            return c.json({ success: true, data: { title } });
        } catch (error) {
            console.error('Failed to update session title:', error);
            return c.json({ success: false, error: 'Failed to update session title' }, { status: 500 });
        }
    });
    app.get('/api/sessions/stats', async (c) => {
        try {
            const controller = getAppController(c.env);
            const count = await controller.getSessionCount();
            return c.json({ success: true, data: { totalSessions: count } });
        } catch (error) {
            console.error('Failed to get session stats:', error);
            return c.json({ success: false, error: 'Failed to retrieve session stats' }, { status: 500 });
        }
    });
    app.delete('/api/sessions', async (c) => {
        try {
            const controller = getAppController(c.env);
            const deletedCount = await controller.clearAllSessions();
            return c.json({ success: true, data: { deletedCount } });
        } catch (error) {
            console.error('Failed to clear all sessions:', error);
            return c.json({ success: false, error: 'Failed to clear all sessions' }, { status: 500 });
        }
    });
}