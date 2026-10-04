import { User, Placement, Entry, EntryDay } from '../types/index.ts';

const TOKEN_KEY = 'logbook_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred.';
    try {
      const errorData = await response.json();
      if (errorData?.error) {
        errorMsg = errorData.error;
      }
    } catch {
      errorMsg = `Server error (${response.status})`;
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  async signup(data: {
    name: string;
    email: string;
    password: string;
    matric_no: string;
    institution: string;
    department: string;
  }): Promise<{ token: string; user: User; placement: Placement | null }> {
    const res = await request<{ token: string; user: User; placement: Placement | null }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: User; placement: Placement | null }> {
    const res = await request<{ token: string; user: User; placement: Placement | null }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async loginDemo(): Promise<{ token: string; user: User; placement: Placement | null }> {
    const res = await request<{ token: string; user: User; placement: Placement | null }>('/api/auth/demo', {
      method: 'POST',
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User; placement: Placement | null }> {
    return request<{ user: User; placement: Placement | null }>('/api/auth/me');
  },

  logout(): void {
    removeStoredToken();
  },

  async savePlacement(data: {
    host_organization: string;
    start_date: string;
    duration_weeks: number;
  }): Promise<{ placement: Placement }> {
    return request<{ placement: Placement }>('/api/placements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPlacement(): Promise<{ placement: Placement | null }> {
    return request<{ placement: Placement | null }>('/api/placements');
  },

  async getEntries(): Promise<{ entries: Entry[] }> {
    return request<{ entries: Entry[] }>('/api/entries');
  },

  async getEntryByWeek(weekNumber: number): Promise<{ entry: Entry | null }> {
    return request<{ entry: Entry | null }>(`/api/entries/${weekNumber}`);
  },

  async deleteEntry(weekNumber: number): Promise<{ success: boolean; weekNumber: number }> {
    return request<{ success: boolean; weekNumber: number }>(`/api/entries/${weekNumber}`, {
      method: 'DELETE',
    });
  },

  async saveEntry(data: {
    week_number: number;
    date_range: string;
    raw_notes: string;
    summary: string;
    days: EntryDay[];
  }): Promise<{ entry: Entry }> {
    return request<{ entry: Entry }>('/api/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async generateEntry(data: {
    weekNumber: number;
    dateRange: string;
    rawNotes: string;
  }): Promise<{ summary: string; days: { day: string; text: string }[] }> {
    return request<{ summary: string; days: { day: string; text: string }[] }>('/api/entries/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async exportLogbookPdf(): Promise<void> {
    const token = getStoredToken();
    const response = await fetch('/api/entries/export', {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to download PDF' }));
      throw new Error(err.error || 'Failed to download logbook PDF.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Get filename from header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'SIWES_LogBook.pdf';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
