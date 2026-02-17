
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST' | 'CASHIER' | 'DISPENSER';

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string; // Add optional username property
  role: UserRole;
}

export interface Session {
  access_token: string;
  user: {
    id: string;
    email?: string;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Permission {
  action: 'create' | 'read' | 'update' | 'delete';
  resource: 'inventory' | 'sales' | 'users' | 'settings' | 'reports' | 'wholesale' | 'expenses' | 'credit' | 'analytics';
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    { action: 'create', resource: 'inventory' },
    { action: 'read', resource: 'inventory' },
    { action: 'update', resource: 'inventory' },
    { action: 'delete', resource: 'inventory' },
    { action: 'create', resource: 'sales' },
    { action: 'read', resource: 'sales' },
    { action: 'update', resource: 'sales' },
    { action: 'delete', resource: 'sales' },
    { action: 'create', resource: 'users' },
    { action: 'read', resource: 'users' },
    { action: 'update', resource: 'users' },
    { action: 'delete', resource: 'users' },
    { action: 'read', resource: 'reports' },
    { action: 'update', resource: 'settings' },
    { action: 'create', resource: 'wholesale' },
    { action: 'read', resource: 'wholesale' },
    { action: 'update', resource: 'wholesale' },
    { action: 'delete', resource: 'wholesale' },
    { action: 'read', resource: 'expenses' },
    { action: 'create', resource: 'expenses' },
    { action: 'delete', resource: 'expenses' },
    { action: 'read', resource: 'credit' },
    { action: 'create', resource: 'credit' },
    { action: 'read', resource: 'analytics' },
  ],
  ADMIN: [
    { action: 'create', resource: 'inventory' },
    { action: 'read', resource: 'inventory' },
    { action: 'update', resource: 'inventory' },
    { action: 'delete', resource: 'inventory' },
    { action: 'create', resource: 'sales' },
    { action: 'read', resource: 'sales' },
    { action: 'update', resource: 'sales' },
    { action: 'delete', resource: 'sales' },
    { action: 'create', resource: 'users' },
    { action: 'read', resource: 'users' },
    { action: 'update', resource: 'users' },
    { action: 'delete', resource: 'users' },
    { action: 'read', resource: 'reports' },
    { action: 'update', resource: 'settings' },
    { action: 'create', resource: 'wholesale' },
    { action: 'read', resource: 'wholesale' },
    { action: 'update', resource: 'wholesale' },
    { action: 'delete', resource: 'wholesale' },
    { action: 'read', resource: 'expenses' },
    { action: 'create', resource: 'expenses' },
    { action: 'delete', resource: 'expenses' },
    { action: 'read', resource: 'credit' },
    { action: 'create', resource: 'credit' },
    { action: 'read', resource: 'analytics' },
  ],
  PHARMACIST: [
    { action: 'create', resource: 'inventory' },
    { action: 'read', resource: 'inventory' },
    { action: 'update', resource: 'inventory' },
    { action: 'delete', resource: 'inventory' },
    { action: 'read', resource: 'sales' },
    { action: 'create', resource: 'sales' },
    { action: 'update', resource: 'sales' },
    { action: 'create', resource: 'wholesale' },
    { action: 'read', resource: 'wholesale' },
    { action: 'update', resource: 'wholesale' },
    { action: 'read', resource: 'credit' },
  ],
  CASHIER: [
    { action: 'create', resource: 'sales' },
    { action: 'read', resource: 'sales' },
    { action: 'read', resource: 'inventory' },
    { action: 'create', resource: 'wholesale' },
    { action: 'read', resource: 'wholesale' },
    { action: 'read', resource: 'credit' },
  ],
  DISPENSER: [
    { action: 'create', resource: 'sales' },
    { action: 'read', resource: 'sales' },
    { action: 'read', resource: 'inventory' },
    { action: 'create', resource: 'wholesale' },
    { action: 'read', resource: 'wholesale' },
    { action: 'read', resource: 'credit' },
  ],
};
