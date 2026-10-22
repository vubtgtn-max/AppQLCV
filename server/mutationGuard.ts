import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * PHASE 2C-FIX-2: Backend Mutation Safety & Idempotency Engine
 * 
 * Provides:
 * 1. Request Identity & Deterministic Fingerprinting (Header or canonical body hash)
 * 2. In-Flight Request Deduplication (Prevents concurrent duplicate executions)
 * 3. Completed Response Caching (Safely serves identical response on client retry)
 * 4. Error Safety (Failed requests are not cached; allows clean retry)
 * 5. Distinct handling for legitimate user duplicates vs identical retries
 */

export interface CachedMutationResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  cachedAt: number;
  expiresAt: number;
}

// In-flight active requests (fingerprint -> Promise<CachedMutationResponse>)
const inFlightRequests = new Map<string, Promise<CachedMutationResponse>>();

// Completed mutation cache (fingerprint -> CachedMutationResponse)
const completedResponses = new Map<string, CachedMutationResponse>();

// Pruning timer
const PRUNE_INTERVAL_MS = 30 * 1000;
const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, val] of completedResponses.entries()) {
    if (val.expiresAt <= now) {
      completedResponses.delete(key);
    }
  }
  // Hard cap to prevent memory leak
  if (completedResponses.size > 3000) {
    const keys = Array.from(completedResponses.keys()).slice(0, 500);
    keys.forEach((k) => completedResponses.delete(k));
  }
}, PRUNE_INTERVAL_MS);

if (pruneTimer && typeof pruneTimer.unref === 'function') {
  pruneTimer.unref();
}

/**
 * Produce canonical JSON string with sorted keys recursively
 */
export function canonicalJson(obj: any): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k]));
  return '{' + pairs.join(',') + '}';
}

/**
 * Determine if request is a mutation that requires idempotency / deduplication
 */
export function isProtectedMutation(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return false;
  }

  const path = req.path || '';

  // Auth login is a credential verification check, not a state-creation mutation
  if (path === '/auth/login') return false;

  // Test channel is an ephemeral test without DB changes
  if (path === '/alerts/test-channel') return false;

  // Sync snapshot and events are read-only
  if (path.startsWith('/sync/')) return false;

  // File uploads are handled by multer disk storage; allow raw streaming
  if (path === '/files/upload') return false;

  return true;
}

/**
 * Determine TTL based on mutation risk and payload size
 */
export function getTtlForRequest(req: Request): number {
  const path = req.path || '';

  // High-risk external dispatch: keep dedup for 60 seconds
  if (path === '/alerts/send-direct') {
    return 60 * 1000;
  }

  // Large batch imports: keep dedup for 60 seconds
  if (path.includes('/batch') || path === '/migration/import') {
    return 60 * 1000;
  }

  // Automated or manual full scan: 30 seconds
  if (path === '/alerts/scan-now') {
    return 30 * 1000;
  }

  // Standard entity creation, updates, deletes, toggles, resets: 20 seconds
  return 20 * 1000;
}

/**
 * Generate request fingerprint
 */
export function generateRequestFingerprint(req: Request): string {
  // 1. Explicit client idempotency header
  const explicitKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;
  if (explicitKey && typeof explicitKey === 'string' && explicitKey.trim().length > 0) {
    return `key:${explicitKey.trim()}`;
  }

  // 2. Deterministic fingerprint based on method, path, query, user, and canonical body
  const method = req.method.toUpperCase();
  const normalizedPath = (req.baseUrl || '') + (req.path || '');
  const userId = (req.headers['x-user-id'] || 'anon') as string;

  let queryStr = '';
  if (req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0) {
    queryStr = canonicalJson(req.query);
  }

  let bodyStr = '';
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    bodyStr = canonicalJson(req.body);
  }

  const hash = crypto.createHash('sha256').update(`${queryStr}|${bodyStr}`).digest('hex').slice(0, 32);
  return `fp:${method}:${normalizedPath}:${userId}:${hash}`;
}

/**
 * Express Middleware for Mutation Guard & Idempotency
 */
export function mutationGuardMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isProtectedMutation(req)) {
    next();
    return;
  }

  const fingerprint = generateRequestFingerprint(req);
  const hasExplicitKey = fingerprint.startsWith('key:');
  const ttlMs = hasExplicitKey ? getTtlForRequest(req) : Math.min(getTtlForRequest(req), 1500);
  const now = Date.now();

  // A. Check if already completed and cached (Retry-After-Success / rapid double-click protection)
  const cached = completedResponses.get(fingerprint);
  if (cached && cached.expiresAt > now) {
    res.setHeader('X-Idempotent-Replay', 'true');
    res.setHeader('X-Idempotency-Fingerprint', fingerprint);
    for (const [hKey, hVal] of Object.entries(cached.headers || {})) {
      if (hKey.toLowerCase() !== 'content-length') {
        res.setHeader(hKey, hVal);
      }
    }
    res.status(cached.statusCode).json(cached.body);
    return;
  }

  // B. Check if currently executing (In-Flight Concurrency protection)
  const existingInFlight = inFlightRequests.get(fingerprint);
  if (existingInFlight) {
    existingInFlight
      .then((result) => {
        if (!res.headersSent) {
          res.setHeader('X-Idempotent-Replay', 'true');
          res.setHeader('X-Idempotency-Fingerprint', fingerprint);
          for (const [hKey, hVal] of Object.entries(result.headers || {})) {
            if (hKey.toLowerCase() !== 'content-length') {
              res.setHeader(hKey, hVal);
            }
          }
          res.status(result.statusCode).json(result.body);
        }
      })
      .catch((err) => {
        if (!res.headersSent) {
          res.status(500).json({ error: err.message || 'Lỗi khi xử lý yêu cầu đồng thời.' });
        }
      });
    return;
  }

  // C. This is the primary execution: set up In-Flight tracker
  let resolveInFlight!: (res: CachedMutationResponse) => void;
  let rejectInFlight!: (err: any) => void;
  const inFlightPromise = new Promise<CachedMutationResponse>((resolve, reject) => {
    resolveInFlight = resolve;
    rejectInFlight = reject;
  });
  // Prevent unhandledRejection if no secondary waiter is listening when rejected
  inFlightPromise.catch(() => {});
  inFlightRequests.set(fingerprint, inFlightPromise);

  // Hook into response methods to capture final output
  let capturedBody: any = null;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = (body: any) => {
    capturedBody = body;
    return originalJson(body);
  };

  res.send = (body: any) => {
    if (capturedBody === null) {
      capturedBody = body;
    }
    return originalSend(body);
  };

  res.on('finish', () => {
    inFlightRequests.delete(fingerprint);

    const statusCode = res.statusCode || 200;
    // Only cache successful mutations (2xx status codes)
    if (statusCode >= 200 && statusCode < 300 && capturedBody !== null) {
      if (req.method.toUpperCase() === 'DELETE' || req.path.includes('restore') || req.path.includes('reset')) {
        completedResponses.clear();
      }
      const responseEntry: CachedMutationResponse = {
        statusCode,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
        body: capturedBody,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttlMs,
      };

      completedResponses.set(fingerprint, responseEntry);
      resolveInFlight(responseEntry);
    } else {
      // Failure / Client error: do not cache, allow fresh retry
      rejectInFlight(new Error(`Request failed with status code ${statusCode}`));
    }
  });

  res.on('close', () => {
    if (inFlightRequests.has(fingerprint)) {
      inFlightRequests.delete(fingerprint);
      rejectInFlight(new Error('Connection closed before completion'));
    }
  });

  next();
}

/**
 * Utility for tests to clear deduplication cache
 */
export function clearMutationGuardCache(): void {
  completedResponses.clear();
  inFlightRequests.clear();
}
