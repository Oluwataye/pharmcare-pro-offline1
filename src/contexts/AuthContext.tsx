import * as React from 'react';
import { AuthState, User as AppUser, UserRole } from '@/lib/types';
import { db } from '@/lib/db-client';
import { Session } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { checkLoginRateLimit, clearLoginRateLimit } from '@/lib/rateLimiting';
import { logSuccessfulLogin, logFailedLogin, logLogout } from '@/lib/auditLog';
import { secureStorage } from '@/lib/secureStorage';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  session: Session | null;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = React.useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [session, setSession] = React.useState<Session | null>(null);
  // Track explicit login in progress so onAuthStateChange doesn't fire a
  // redundant isLoading cycle that causes the white-blank-page flash.
  const isLoggingInRef = React.useRef(false);
  const { toast } = useToast();

  // Fetch user profile and role from the dedicated /api/auth/me endpoint.
  // This avoids the RBAC block on reading user_roles directly for non-admin users.
  const fetchUserProfile = async (userId: string): Promise<AppUser | null> => {
    const isOfflineMode = import.meta.env.VITE_APP_MODE === 'offline';

    try {
      const token = localStorage.getItem('offline_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const API_URL = `${window.location.origin}/api`;
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        // If the dedicated endpoint fails, fall back to generic offline profile
        throw new Error(`/api/auth/me returned ${res.status}`);
      }

      const me = await res.json();

      return {
        id: userId,
        email: me.email || '',
        name: me.name,
        username: me.username || undefined,
        role: me.role as UserRole,
      };
    } catch (error) {
      console.error('Error fetching user profile details:', error);

      if (isOfflineMode) {
        // Last-resort fallback only when API is genuinely unreachable
        return {
          id: userId,
          email: 'user@pharmcare.local',
          name: 'Offline User',
          username: 'user',
          role: 'CASHIER',
        };
      }
      return null;
    }
  };

  // Initialize auth state and session security
  React.useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = db.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (session?.user) {
          // Skip if login() is already handling auth state — prevents the
          // double-setState that causes a blank page flash on first login.
          if (isLoggingInRef.current) return;

          const userProfile = await fetchUserProfile(session.user.id);
          setAuthState({
            user: userProfile,
            isAuthenticated: !!userProfile,
            isLoading: false,
          });
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    );

    // Check for existing session
    db.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        const isAuthenticated = !!userProfile;

        setAuthState({
          user: userProfile,
          isAuthenticated,
          isLoading: false,
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });


    // NOTE: We intentionally do NOT clear auth on beforeunload because
    // that event fires on page refresh too, not only on tab close.
    // Auth tokens are stored in localStorage and are cleared only on explicit logout.

    // Periodic session validity check (every 5 minutes)
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session } } = await db.auth.getSession();
      if (!session) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        setSession(null);
      }
    }, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, []);

  const login = async (email: string, password: string) => {
    // Signal to onAuthStateChange that we are handling auth state here.
    isLoggingInRef.current = true;
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Check rate limit before attempting login
      const rateLimit = await checkLoginRateLimit(email);

      if (!rateLimit.allowed) {
        const resetTime = rateLimit.resetTime
          ? new Date(rateLimit.resetTime).toLocaleTimeString()
          : 'soon';
        throw new Error(`Too many login attempts. Please try again at ${resetTime}`);
      }

      const { data, error } = await db.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Clear rate limit on successful login
        clearLoginRateLimit(email);

        const userProfile = await fetchUserProfile(data.user.id);

        if (!userProfile) {
          throw new Error('Unable to load user profile');
        }

        // Log successful login
        logSuccessfulLogin(data.user.id, email, userProfile.role);

        // Set authenticated state BEFORE navigate() is called by the Login page.
        // isLoggingInRef prevents onAuthStateChange from overwriting this.
        setAuthState({
          user: userProfile,
          isAuthenticated: true,
          isLoading: false,
        });

        toast({
          title: 'Login successful',
          description: `Welcome back, ${userProfile.name}!`,
        });
      }
    } catch (error: any) {
      // Log failed login attempt
      logFailedLogin(email, error.message || 'Unknown error');

      setAuthState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
      throw error;
    } finally {
      // Release the lock so future auth events (e.g. token refresh) are handled.
      isLoggingInRef.current = false;
    }
  };

  const logout = async () => {
    const currentUser = authState.user;
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Log logout event before clearing session
      if (currentUser) {
        logLogout(currentUser.id, currentUser.email, currentUser.role);
      }

      // Clear all sensitive session data
      secureStorage.clear();
      localStorage.removeItem('offline_token');
      localStorage.removeItem('offline_user');

      await db.auth.signOut();

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
      });
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      session,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
