// PharmCare Pro Offline Database Client
// Redirects calls to local Express API

const API_URL = `${window.location.origin}/api`;
const APP_MODE = import.meta.env.VITE_APP_MODE;

console.log(`[DB Client] Initialized. Mode: ${APP_MODE}. API Root: ${API_URL}`);

// --- ROBUST UUID GENERATOR ---
const generateUUID = () => {
    try {
        return crypto.randomUUID();
    } catch (e) {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

type QueryAction = 'select' | 'insert' | 'update' | 'delete';

// --- SIMPLE EVENT BUS FOR LIVE UPDATES ---
class LocalEventBus extends EventTarget {
    emit(table: string, payload: any) {
        console.log(`[DB EventBus] Broadcast: ${table}_change`, payload);
        this.dispatchEvent(new CustomEvent(`${table}_change`, { detail: payload }));
        this.dispatchEvent(new CustomEvent(`*_change`, { detail: payload }));
    }
}
const eventBus = new LocalEventBus();

class QueryBuilder {
    private table: string;
    private filters: Record<string, any>;
    private action: QueryAction = 'select';
    private columns: string = '*';
    private data: any = null;
    private isSingle: boolean = false;
    private orderCol: string | null = null;
    private ascending: boolean = true;
    private limitCount: number | null = null;

    constructor(table: string) {
        this.table = table;
        this.filters = {};
    }

    select(columns = '*') {
        if (this.action === 'select') {
            this.action = 'select';
        }
        this.columns = columns;
        return this;
    }

    insert(data: any) {
        this.action = 'insert';
        this.data = data;
        return this;
    }

    update(data: any) {
        this.action = 'update';
        this.data = data;
        return this;
    }

    delete() {
        this.action = 'delete';
        return this;
    }

    eq(column: string, value: any) {
        this.filters[column] = value;
        return this;
    }

    single() {
        this.isSingle = true;
        return this;
    }

    gt(column: string, value: any) {
        this.filters[column] = `gt.${value}`;
        return this;
    }

    gte(column: string, value: any) {
        this.filters[column] = `gte.${value}`;
        return this;
    }

    lt(column: string, value: any) {
        this.filters[column] = `lt.${value}`;
        return this;
    }

    lte(column: string, value: any) {
        this.filters[column] = `lte.${value}`;
        return this;
    }

    neq(column: string, value: any) {
        this.filters[column] = `neq.${value}`;
        return this;
    }

    like(column: string, value: any) {
        this.filters[column] = `like.${value}`;
        return this;
    }

    ilike(column: string, value: any) {
        this.filters[column] = `ilike.${value}`;
        return this;
    }

    in(column: string, values: any[]) {
        this.filters[column] = `in.(${values.join(',')})`;
        return this;
    }

    order(column: string, { ascending = true } = {}) {
        this.orderCol = column;
        this.ascending = ascending;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    url() { return this; }
    csv() { return this; }
    abortSignal() { return this; }
    returns() { return this; }
    maybeSingle() { return this.single(); }

    async then(resolve: (value: any) => void) {
        try {
            let endpoint = `${API_URL}/${this.table}`;
            const token = localStorage.getItem('offline_token') || '';
            let options: RequestInit = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            if (this.action === 'select') {
                const params = new URLSearchParams();
                Object.entries(this.filters).forEach(([k, v]) => {
                    const valueStr = String(v);
                    const finalValue = valueStr.includes('.') ? valueStr : `eq.${v}`;
                    params.append(k, finalValue);
                });
                if (this.limitCount) params.append('limit', this.limitCount.toString());
                if (this.orderCol) params.append('order', `${this.orderCol}.${this.ascending ? 'asc' : 'desc'}`);
                if (params.toString()) endpoint += `?${params.toString()}`;

                console.log(`[DB Client] Calling: GET ${endpoint}`);
                const response = await fetch(endpoint, options);
                if (!response.ok) {
                    const error = await response.json().catch(() => ({ message: 'Network request failed' }));
                    return resolve({ data: null, error });
                }
                let data = await response.json();
                if (this.isSingle) {
                    resolve({ data: data[0] || null, error: null });
                } else {
                    resolve({ data, error: null });
                }

            } else if (this.action === 'insert' || this.action === 'update' || this.action === 'delete') {
                if (this.action === 'insert') options.method = 'POST';
                else if (this.action === 'update') options.method = 'PATCH';
                else options.method = 'DELETE';

                if (this.action === 'insert' && !this.data.id) {
                    this.data.id = generateUUID();
                }
                if (this.data) {
                    options.body = JSON.stringify(this.data);
                }

                if ((this.action === 'update' || this.action === 'delete') && Object.keys(this.filters).length > 0) {
                    const params = new URLSearchParams();
                    Object.entries(this.filters).forEach(([k, v]) => {
                        const valueStr = String(v);
                        const finalValue = valueStr.includes('.') ? valueStr : `eq.${v}`;
                        params.append(k, finalValue);
                    });
                    endpoint += `?${params.toString()}`;
                }

                console.log(`[DB Client] Calling: ${options.method} ${endpoint}`);
                const response = await fetch(endpoint, options);
                if (!response.ok) {
                    const error = await response.json().catch(() => ({ message: 'Save failed' }));
                    return resolve({ data: null, error });
                }
                const result = await response.json();
                eventBus.emit(this.table, {
                    schema: 'public',
                    table: this.table,
                    commit_timestamp: new Date().toISOString(),
                    eventType: this.action === 'insert' ? 'INSERT' : (this.action === 'update' ? 'UPDATE' : 'DELETE'),
                    new: result
                });
                resolve({ data: result, error: null });
            }
        } catch (error: any) {
            console.error('[DB Client] Crash Detected:', error);
            resolve({ data: null, error: { message: error.message || 'Offline Connection Error' } });
        }
    }
}

export const db = {
    from: (table: string) => new QueryBuilder(table),
    auth: {
        signInWithPassword: async ({ email, password }: any) => {
            try {
                console.log('[DB Client] Auth: Logging in...', email);
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Invalid username or password');

                localStorage.setItem('offline_token', data.access_token);
                localStorage.setItem('offline_user', JSON.stringify(data.user));
                return { data: { user: data.user, session: { access_token: data.access_token } }, error: null };
            } catch (error: any) {
                return { data: { user: null }, error: { message: error.message } };
            }
        },
        signOut: async () => {
            localStorage.removeItem('offline_token');
            localStorage.removeItem('offline_user');
            return { error: null };
        },
        getSession: async () => {
            const token = localStorage.getItem('offline_token');
            const userJson = localStorage.getItem('offline_user');
            if (!token) return { data: { session: null }, error: null };
            const user = userJson ? JSON.parse(userJson) : null;
            return { data: { session: { access_token: token, user } }, error: null };
        },
        getUser: async () => {
            const userJson = localStorage.getItem('offline_user');
            if (!userJson) return { data: { user: null }, error: null };
            return { data: { user: JSON.parse(userJson) }, error: null };
        },
        onAuthStateChange: (callback: any) => {
            return { data: { subscription: { unsubscribe: () => { } } } };
        }
    },
    channel: (name: string) => {
        const handlers: Array<{ filter: any, callback: any }> = [];
        const channelObj = {
            on: (type: string, filter: any, callback: any) => {
                if (type === 'postgres_changes') {
                    handlers.push({ filter, callback });
                }
                return channelObj;
            },
            subscribe: (statusCallback?: any) => {
                handlers.forEach(({ filter, callback }) => {
                    const listener = (event: any) => {
                        const payload = event.detail;
                        if (filter.table === '*' || filter.table === payload.table) {
                            callback(payload);
                        }
                    };
                    eventBus.addEventListener(`${filter.table}_change`, listener as any);
                    if (filter.table !== '*') {
                        eventBus.addEventListener(`*_change`, listener as any);
                    }
                });
                if (statusCallback) statusCallback('SUBSCRIBED');
                return { unsubscribe: () => { } };
            }
        };
        return channelObj;
    },
    removeChannel: (channel: any) => ({ error: null }),
    removeAllChannels: () => ({ error: null }),
    functions: {
        invoke: async (name: string, options: any) => {
            try {
                const res = await fetch(`${API_URL}/functions/${name}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('offline_token') || ''}`
                    },
                    body: JSON.stringify(options.body)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.details || data.message || data.error || 'Function call failed');
                if (name === 'complete-sale') {
                    eventBus.emit('sales', { eventType: 'INSERT', new: data });
                    eventBus.emit('inventory', { eventType: 'UPDATE' });
                }
                return { data, error: null };
            } catch (error: any) {
                return { data: null, error: { message: error.message } };
            }
        }
    },
    rpc: async (funcName: string, args: any) => {
        try {
            const res = await fetch(`${API_URL}/rpc/${funcName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('offline_token') || ''}`
                },
                body: JSON.stringify(args)
            });
            const data = await res.json();
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: { message: error.message } };
        }
    }
};
