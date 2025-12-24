import { supabase } from '@/integrations/supabase/client';

const SESSION_STORAGE_KEY = 'app_session_id';
const SESSION_START_KEY = 'app_session_start';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface SessionData {
  id: string;
  startedAt: Date;
  userId: string;
}

// Detect device type
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Detect browser
function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

// Improved OS detection
function getOS(): string {
  const ua = navigator.userAgent;
  // Check iOS first (iPhone, iPad, iPod)
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  // Check Android
  if (/Android/.test(ua)) return 'Android';
  // Check Windows
  if (/Windows/.test(ua)) return 'Windows';
  // Check macOS (but not iOS which also has Mac in UA)
  if (/Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad|iPod/.test(ua)) return 'macOS';
  // Check Linux (but not Android)
  if (/Linux/.test(ua) && !/Android/.test(ua)) return 'Linux';
  return 'Other';
}

class SessionManager {
  private static instance: SessionManager;
  private currentSession: SessionData | null = null;
  private lastActivity: number = Date.now();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    // Setup visibility and unload handlers
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('beforeunload', this.handleUnload);
      window.addEventListener('pagehide', this.handleUnload);
    }
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async initialize(userId: string): Promise<string> {
    // If already initializing, wait for it
    if (this.initPromise) {
      await this.initPromise;
      return this.currentSession?.id || '';
    }

    // If already initialized for this user, return current session
    if (this.initialized && this.currentSession?.userId === userId) {
      return this.currentSession.id;
    }

    this.initPromise = this._doInitialize(userId);
    await this.initPromise;
    this.initPromise = null;
    
    return this.currentSession?.id || '';
  }

  private async _doInitialize(userId: string): Promise<void> {
    // Check localStorage for existing session
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    const storedStartTime = localStorage.getItem(SESSION_START_KEY);
    
    if (storedSessionId && storedStartTime) {
      const startTime = parseInt(storedStartTime, 10);
      const elapsed = Date.now() - this.lastActivity;
      
      // If session exists and not timed out, reuse it
      if (elapsed < SESSION_TIMEOUT_MS) {
        this.currentSession = {
          id: storedSessionId,
          startedAt: new Date(startTime),
          userId
        };
        this.initialized = true;
        this.lastActivity = Date.now();
        return;
      }
      
      // Session timed out, end it and create new
      await this.endSession(storedSessionId, new Date(startTime));
    }

    // Create new session
    await this.createSession(userId);
    this.initialized = true;
  }

  private async createSession(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          device_type: getDeviceType(),
          browser: getBrowser(),
          os: getOS(),
          screen_width: window.innerWidth,
          screen_height: window.innerHeight,
        })
        .select('id')
        .single();

      if (error) {
        console.debug('Session creation error:', error);
        return;
      }

      const now = Date.now();
      this.currentSession = {
        id: data.id,
        startedAt: new Date(now),
        userId
      };
      this.lastActivity = now;

      // Persist to localStorage
      localStorage.setItem(SESSION_STORAGE_KEY, data.id);
      localStorage.setItem(SESSION_START_KEY, now.toString());
    } catch (error) {
      console.debug('Session creation failed:', error);
    }
  }

  private async endSession(sessionId: string, startedAt: Date): Promise<void> {
    const durationSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
    
    try {
      await supabase
        .from('user_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', sessionId);
    } catch (error) {
      console.debug('Session end failed:', error);
    }

    // Clear localStorage
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_START_KEY);
  }

  private handleVisibilityChange = async () => {
    if (document.visibilityState === 'hidden') {
      // Page is hidden - update session with sendBeacon
      this.sendEndSessionBeacon();
    } else if (document.visibilityState === 'visible') {
      // Page is visible again - check timeout
      const elapsed = Date.now() - this.lastActivity;
      if (elapsed > SESSION_TIMEOUT_MS && this.currentSession) {
        // Session timed out, create new one
        await this.endSession(this.currentSession.id, this.currentSession.startedAt);
        this.currentSession = null;
        this.initialized = false;
        
        // Re-initialize if we have user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await this.initialize(user.id);
        }
      }
      this.lastActivity = Date.now();
    }
  };

  private handleUnload = () => {
    this.sendEndSessionBeacon();
  };

  private sendEndSessionBeacon(): void {
    if (!this.currentSession) return;

    const durationSeconds = Math.round((Date.now() - this.currentSession.startedAt.getTime()) / 1000);
    
    const payload = JSON.stringify({
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    });

    // Use sendBeacon for reliability on page unload
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (supabaseUrl && supabaseKey && navigator.sendBeacon) {
      const url = `${supabaseUrl}/rest/v1/user_sessions?id=eq.${this.currentSession.id}`;
      const blob = new Blob([payload], { type: 'application/json' });
      
      // sendBeacon doesn't support custom headers well, so we use fetch with keepalive as fallback
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: payload,
        keepalive: true
      }).catch(() => {
        // Fallback to sendBeacon (less reliable but works)
        navigator.sendBeacon(url, blob);
      });
    }
  }

  getSessionId(): string | null {
    this.lastActivity = Date.now();
    return this.currentSession?.id || localStorage.getItem(SESSION_STORAGE_KEY);
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async waitForSession(): Promise<string | null> {
    // Wait up to 3 seconds for session to be ready
    const maxWait = 3000;
    const interval = 100;
    let waited = 0;

    while (!this.currentSession && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, interval));
      waited += interval;
    }

    return this.getSessionId();
  }

  // Export utility functions for use elsewhere
  static getDeviceType = getDeviceType;
  static getBrowser = getBrowser;
  static getOS = getOS;
}

export const sessionManager = SessionManager.getInstance();
export { getDeviceType, getBrowser, getOS };
