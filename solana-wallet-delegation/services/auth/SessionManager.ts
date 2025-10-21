import type { Session, AuthResult } from '@/lib/types';
import { INDEXED_DB, SESSION_DEFAULTS } from '@/lib/constants';

export class SessionManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize IndexedDB for session storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(INDEXED_DB.NAME, INDEXED_DB.VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sessions store
        if (!db.objectStoreNames.contains(INDEXED_DB.STORES.SESSIONS)) {
          const sessionStore = db.createObjectStore(INDEXED_DB.STORES.SESSIONS, {
            keyPath: 'id'
          });
          sessionStore.createIndex('userId', 'userId', { unique: false });
          sessionStore.createIndex('organizationId', 'organizationId', { unique: false });
        }

        // Create keys store for unextractable keys
        if (!db.objectStoreNames.contains(INDEXED_DB.STORES.KEYS)) {
          const keyStore = db.createObjectStore(INDEXED_DB.STORES.KEYS, {
            keyPath: 'sessionId'
          });
        }

        // Create cache store
        if (!db.objectStoreNames.contains(INDEXED_DB.STORES.CACHE)) {
          db.createObjectStore(INDEXED_DB.STORES.CACHE, {
            keyPath: 'key'
          });
        }

        // Create audit logs store
        if (!db.objectStoreNames.contains(INDEXED_DB.STORES.AUDIT_LOGS)) {
          const auditStore = db.createObjectStore(INDEXED_DB.STORES.AUDIT_LOGS, {
            keyPath: 'id',
            autoIncrement: true
          });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
          auditStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
    });
  }

  /**
   * Creates a new session with unextractable keys
   */
  async createSession(
    userId: string,
    organizationId: string,
    duration?: number
  ): Promise<Session> {
    await this.initialize();

    // Generate unextractable P-256 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      false, // unextractable
      ['sign', 'verify']
    );

    // Export public key for storage
    const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));

    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const sessionDuration = duration || SESSION_DEFAULTS.DURATION;

    const session: Session = {
      id: sessionId,
      userId,
      organizationId,
      publicKey: publicKeyB64,
      createdAt: now,
      expiresAt: now + sessionDuration,
      isActive: true,
    };

    // Store session metadata
    await this.storeSession(session);

    // Store unextractable private key separately
    await this.storePrivateKey(sessionId, keyPair.privateKey);

    // Log session creation
    await this.logAuditEvent(sessionId, 'SESSION_CREATED', {
      userId,
      organizationId,
      duration: sessionDuration,
    });

    return { ...session, privateKey: keyPair.privateKey };
  }

  /**
   * Validates and retrieves an active session
   */
  async validateSession(sessionId: string): Promise<Session | null> {
    await this.initialize();

    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        await this.destroySession(sessionId);
        return null;
      }

      // Retrieve private key
      const privateKey = await this.getPrivateKey(sessionId);
      if (!privateKey) {
        await this.destroySession(sessionId);
        return null;
      }

      return { ...session, privateKey };
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  }

  /**
   * Refreshes a session's expiration time
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    await this.initialize();

    try {
      const session = await this.getSession(sessionId);
      if (!session || session.expiresAt < Date.now()) {
        return false;
      }

      // Extend expiration
      session.expiresAt = Date.now() + SESSION_DEFAULTS.DURATION;

      await this.storeSession(session);

      await this.logAuditEvent(sessionId, 'SESSION_REFRESHED', {
        newExpirationTime: session.expiresAt,
      });

      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }

  /**
   * Destroys a session and cleans up associated data
   */
  async destroySession(sessionId: string): Promise<boolean> {
    await this.initialize();

    try {
      // Remove session
      await this.removeSession(sessionId);

      // Remove private key
      await this.removePrivateKey(sessionId);

      await this.logAuditEvent(sessionId, 'SESSION_DESTROYED', {});

      return true;
    } catch (error) {
      console.error('Session destruction failed:', error);
      return false;
    }
  }

  /**
   * Destroys all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<number> {
    await this.initialize();

    const sessions = await this.getUserSessions(userId);
    let destroyed = 0;

    for (const session of sessions) {
      const success = await this.destroySession(session.id);
      if (success) destroyed++;
    }

    return destroyed;
  }

  /**
   * Gets all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([INDEXED_DB.STORES.SESSIONS], 'readonly');
      const store = transaction.objectStore(INDEXED_DB.STORES.SESSIONS);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const sessions = request.result.filter((session: Session) =>
          session.isActive && session.expiresAt > Date.now()
        );
        resolve(sessions);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Signs data with session's private key
   */
  async signWithSession(sessionId: string, data: Uint8Array): Promise<Uint8Array | null> {
    await this.initialize();

    try {
      const privateKey = await this.getPrivateKey(sessionId);
      if (!privateKey) {
        return null;
      }

      const signature = await crypto.subtle.sign(
        {
          name: 'ECDSA',
          hash: 'SHA-256',
        },
        privateKey,
        data.buffer as ArrayBuffer
      );

      return new Uint8Array(signature);
    } catch (error) {
      console.error('Signing failed:', error);
      return null;
    }
  }

  /**
   * Verifies a signature using session's public key
   */
  async verifySignature(
    sessionId: string,
    data: Uint8Array,
    signature: Uint8Array
  ): Promise<boolean> {
    await this.initialize();

    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      // Import public key from base64
      const publicKeyData = Uint8Array.from(atob(session.publicKey), c => c.charCodeAt(0));
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyData,
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        false,
        ['verify']
      );

      return await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-256',
        },
        publicKey,
        signature.buffer as ArrayBuffer,
        data.buffer as ArrayBuffer
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Cleans up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([INDEXED_DB.STORES.SESSIONS], 'readwrite');
      const store = transaction.objectStore(INDEXED_DB.STORES.SESSIONS);
      const request = store.getAll();

      request.onsuccess = async () => {
        const sessions = request.result;
        const now = Date.now();
        let cleaned = 0;

        for (const session of sessions) {
          if (session.expiresAt < now) {
            await this.destroySession(session.id);
            cleaned++;
          }
        }

        resolve(cleaned);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Private helper methods

  private async storeSession(session: Session): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([INDEXED_DB.STORES.SESSIONS], 'readwrite');
      const store = transaction.objectStore(INDEXED_DB.STORES.SESSIONS);
      const request = store.put(session);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getSession(sessionId: string): Promise<Session | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([INDEXED_DB.STORES.SESSIONS], 'readonly');
      const store = transaction.objectStore(INDEXED_DB.STORES.SESSIONS);
      const request = store.get(sessionId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async removeSession(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([INDEXED_DB.STORES.SESSIONS], 'readwrite');
      const store = transaction.objectStore(INDEXED_DB.STORES.SESSIONS);
      const request = store.delete(sessionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async storePrivateKey(sessionId: string, privateKey: CryptoKey): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([INDEXED_DB.STORES.KEYS], 'readwrite');
      const store = transaction.objectStore(INDEXED_DB.STORES.KEYS);
      const request = store.put({ sessionId, privateKey });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getPrivateKey(sessionId: string): Promise<CryptoKey | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([INDEXED_DB.STORES.KEYS], 'readonly');
      const store = transaction.objectStore(INDEXED_DB.STORES.KEYS);
      const request = store.get(sessionId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.privateKey : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async removePrivateKey(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([INDEXED_DB.STORES.KEYS], 'readwrite');
      const store = transaction.objectStore(INDEXED_DB.STORES.KEYS);
      const request = store.delete(sessionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async logAuditEvent(
    sessionId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const auditLog = {
        sessionId,
        action,
        details,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      };

      const transaction = this.db.transaction([INDEXED_DB.STORES.AUDIT_LOGS], 'readwrite');
      const store = transaction.objectStore(INDEXED_DB.STORES.AUDIT_LOGS);
      const request = store.add(auditLog);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}