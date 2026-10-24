/**
 * BrandGuard AI — Unified API Service connecting React frontend to FastAPI + MongoDB backend.
 * Provides transparent fallback if backend is offline.
 */

const API_BASE_URL = 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'brandguard_auth_token';
const USER_KEY = 'brandguard_auth_user';

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
  database: {
    type: string;
    connected: boolean;
    database_name: string;
  };
  auth: {
    type: string;
    roles: string[];
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'brand_manager' | 'creator' | 'approver' | 'admin';
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

class ApiService {
  private token: string | null = null;
  private currentUser: AuthUser | null = null;
  private isBackendOnline: boolean = false;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
        } catch {
          this.currentUser = null;
        }
      }
    }
  }

  getAuthToken(): string | null {
    return this.token;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getIsBackendOnline(): boolean {
    return this.isBackendOnline;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Ping backend health endpoint.
   */
  async checkHealth(): Promise<BackendHealth | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        this.isBackendOnline = false;
        return null;
      }
      const data: BackendHealth = await res.json();
      this.isBackendOnline = true;
      return data;
    } catch {
      this.isBackendOnline = false;
      return null;
    }
  }

  /**
   * Authenticate user with server-side JWT.
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Login failed');
    }

    const data: LoginResponse = await res.json();
    this.token = data.access_token;
    this.currentUser = data.user;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data;
  }

  /**
   * Register a new user account with real role permissions.
   */
  async register(email: string, password: string, name: string, role: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }

    const data: LoginResponse = await res.json();
    this.token = data.access_token;
    this.currentUser = data.user;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data;
  }

  logout(): void {
    this.token = null;
    this.currentUser = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Server-Side Compliance Evaluation
   */
  async evaluateContentOnServer(title: string, text: string, channel: string, brandProfileId?: string) {
    const res = await fetch(`${API_BASE_URL}/evaluations/evaluate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title, text, channel, brandProfileId })
    });
    if (!res.ok) {
      throw new Error('Server evaluation failed');
    }
    return await res.json();
  }

  /**
   * Server-Side Approval Decision
   */
  async submitApprovalDecision(decisionData: {
    brandId: string;
    brandName: string;
    contentId: string;
    contentTitle: string;
    contentVersionId: string;
    versionNumber: string;
    contentHash: string;
    decision: string;
    reason?: string;
    comment?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/approvals/decision`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(decisionData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Approval submission failed' }));
      throw new Error(err.detail || 'Approval submission failed');
    }
    return await res.json();
  }

  /**
   * Server-Side Audit Trail
   */
  async fetchAuditEvents() {
    const res = await fetch(`${API_BASE_URL}/audit`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch audit events from server');
    return await res.json();
  }

  /**
   * Server-Side Audit Hash Verification
   */
  async verifyServerAuditLedger() {
    const res = await fetch(`${API_BASE_URL}/audit/verify`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to verify audit ledger on server');
    return await res.json();
  }
}

export const apiService = new ApiService();
