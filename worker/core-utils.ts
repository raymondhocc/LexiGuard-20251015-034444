/**
 * Core utilities for the Cloudflare Agents template
 * STRICTLY DO NOT MODIFY THIS FILE - Hidden from AI to prevent breaking core functionality
 */
import type { Context } from 'hono';
import type { DurableObjectNamespace, DurableObjectStub } from '@cloudflare/workers-types';
import type { AppController } from './app-controller';
import type { ChatAgent } from './agent';
import type { DocumentStore } from './document-store';
import type { AuditLog } from './audit-log';
import type { CaseManagement } from './case-management';
export interface Env {
    CF_AI_BASE_URL: string;
    CF_AI_API_KEY: string;
    SERPAPI_KEY: string;
    OPENROUTER_API_KEY: string;
    CHAT_AGENT: DurableObjectNamespace<ChatAgent>;
    APP_CONTROLLER: DurableObjectNamespace<AppController>;
    DOCUMENT_STORE: DurableObjectNamespace<DocumentStore>;
    AUDIT_LOG: DurableObjectNamespace<AuditLog>;
    CASE_MANAGEMENT: DurableObjectNamespace<CaseManagement>;
}
/**
 * Get AppController stub for session management
 * Uses a singleton pattern with fixed ID for consistent routing
 */
export function getAppController(env: Env): DurableObjectStub<AppController> {
  const id = env.APP_CONTROLLER.idFromName("controller");
  return env.APP_CONTROLLER.get(id) as DurableObjectStub<AppController>;
}
/**
 * Register a new chat session with the control plane
 * Called automatically when a new ChatAgent is created
 */
export async function registerSession(env: Env, sessionId: string, title?: string): Promise<void> {
  try {
    const controller = getAppController(env);
    await controller.addSession(sessionId, title);
  } catch (error) {
    console.error('Failed to register session:', error);
    // Don't throw - session should work even if registration fails
  }
}
/**
 * Update session activity timestamp
 * Called when a session receives messages
 */
export async function updateSessionActivity(env: Env, sessionId: string): Promise<void> {
  try {
    const controller = getAppController(env);
    await controller.updateSessionActivity(sessionId);
  } catch (error) {
    console.error('Failed to update session activity:', error);
    // Don't throw - this is non-critical
  }
}
/**
 * Unregister a session from the control plane
 * Called when a session is explicitly deleted
 */
export async function unregisterSession(env: Env, sessionId: string): Promise<boolean> {
  try {
    const controller = getAppController(env);
    return await controller.removeSession(sessionId);
  } catch (error) {
    console.error('Failed to unregister session:', error);
    return false;
  }
}