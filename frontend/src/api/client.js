// One place that sends every request to the backend.
// It turns server errors into a consistent shape the UI can display.

export class ApiError extends Error {
    constructor(status, body) {
        super(body?.error || 'Something went wrong');
        this.status = status;
        this.code = body?.code;
        this.fields = body?.fields || [];
        this.body = body;
    }
}

async function request(path, { method = 'GET', body } = {}) {
    let res;
    try {
        res = await fetch(`/api${path}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'include',
        });
    } catch {
        // The server could not be reached at all
        throw new ApiError(0, { error: 'Cannot reach the server. Check your connection and try again' });
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
}

export const api = {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
};