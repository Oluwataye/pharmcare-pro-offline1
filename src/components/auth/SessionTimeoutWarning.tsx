import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes before expiry (Warn at 25 mins idle)
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes absolute idle limit

export function SessionTimeoutWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const { session, logout, isAuthenticated } = useAuth();
  const hasLoggedOut = useRef(false);

  const handleLogoutOnTimeout = useCallback(() => {
    if (!hasLoggedOut.current) {
      hasLoggedOut.current = true;
      logout();
    }
  }, [logout]);

  // Track activity to reset idle timer
  useEffect(() => {
    if (!isAuthenticated) return;

    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const updateActivity = () => setLastActivity(Date.now());

    activities.forEach(event => window.addEventListener(event, updateActivity));

    return () => {
      activities.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, [isAuthenticated]);

  useEffect(() => {
    // Reset logout flag when session changes
    if (session) {
      hasLoggedOut.current = false;
      setLastActivity(Date.now());
    }
  }, [session]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTimeout = () => {
      const now = Date.now();

      // Calculate remaining time based on IDLE timeout
      const idleTimePassed = now - lastActivity;
      const remainingIdle = IDLE_TIMEOUT_MS - idleTimePassed;

      // Also check session's own expiry if available
      const sessionExpiresAt = session?.expires_at ? session.expires_at * 1000 : Infinity;
      const sessionRemaining = sessionExpiresAt - now;

      const effectiveRemaining = Math.min(remainingIdle, sessionRemaining);

      // Show warning if less than 5 minutes remain
      if (effectiveRemaining <= WARNING_BEFORE_EXPIRY_MS && effectiveRemaining > 0) {
        setShowWarning(true);
        setTimeRemaining(Math.ceil(effectiveRemaining / 60000)); // Convert to minutes
      } else if (effectiveRemaining > WARNING_BEFORE_EXPIRY_MS) {
        setShowWarning(false);
      }

      // Auto logout when idle limit or session expiry is reached
      if (effectiveRemaining <= 0 && !hasLoggedOut.current) {
        handleLogoutOnTimeout();
      }
    };

    // Check immediately
    checkTimeout();

    // Check every 30 seconds for better responsiveness
    const interval = setInterval(checkTimeout, 30000);

    return () => clearInterval(interval);
  }, [session, isAuthenticated, lastActivity, handleLogoutOnTimeout]);

  const handleExtendSession = async () => {
    setShowWarning(false);
    // Session will be automatically extended by any activity through Local DB
    window.location.reload();
  };

  const handleLogout = () => {
    setShowWarning(false);
    handleLogoutOnTimeout();
  };

  if (!showWarning) return null;

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in approximately {timeRemaining} minutes.
            Would you like to extend your session or log out now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>
            Log Out Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession}>
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
