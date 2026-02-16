
import { useState, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface StaffShift {
    id: string;
    user_id: string;
    start_time: string;
    end_time?: string;
    status: 'open' | 'closed';
    opening_balance: number;
    closing_balance?: number;
    total_sales: number;
    total_expenses: number;
    expected_cash: number;
    actual_cash?: number;
    notes?: string;
    created_at: string;
}

export const useShift = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeShift, setActiveShift] = useState<StaffShift | null>(null);
    const [activeStaffShifts, setActiveStaffShifts] = useState<StaffShift[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchActiveShift = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetch('/api/shifts/active', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setActiveShift(data);
            }
        } catch (error) {
            console.error('[useShift] Error fetching active shift:', error);
        }
    }, [user]);

    const fetchAllActiveShifts = useCallback(async () => {
        const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
        if (!isAdmin) return;
        try {
            const response = await fetch('/api/shifts?status=eq.open', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setActiveStaffShifts(data);
            }
        } catch (error) {
            console.error('[useShift] Error fetching all active shifts:', error);
        }
    }, [user]);

    const startShift = async (openingBalance: number, notes?: string) => {
        try {
            const response = await fetch('/api/shifts/open', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ opening_balance: openingBalance, notes })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to start shift');
            }

            toast({ title: "Shift Started", description: "You are now on duty." });
            await fetchActiveShift();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const endShift = async (actualCash: number, notes?: string) => {
        if (!activeShift) return;
        try {
            const response = await fetch(`/api/shifts/close/${activeShift.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ actual_cash: actualCash, notes })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to end shift');
            }

            toast({ title: "Shift Ended", description: "Your shift has been reconciled and closed." });
            setActiveShift(null);
            await fetchAllActiveShifts();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    // Admin helpers (Mocks for now, can be expanded)
    const adminEndShift = async (shiftId: string, actualCash: number, staffId: string, startTime: string, notes?: string) => {
        try {
            const response = await fetch(`/api/shifts/close/${shiftId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ actual_cash: actualCash, notes: notes || "Administrative closure" })
            });

            if (!response.ok) throw new Error('Failed to force end shift');

            toast({ title: "Shift Force Ended", description: "The staff shift has been closed." });
            await fetchAllActiveShifts();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const adminPauseShift = async (shiftId: string) => { console.warn("Pause not yet implemented in offline mode"); };
    const adminResumeShift = async (shiftId: string) => { console.warn("Resume not yet implemented in offline mode"); };
    const refreshShifts = useCallback(() => Promise.all([fetchActiveShift(), fetchAllActiveShifts()]), [fetchActiveShift, fetchAllActiveShifts]);

    useEffect(() => {
        if (user) {
            refreshShifts();
        }
    }, [user, refreshShifts]);

    return {
        activeShift,
        activeStaffShifts,
        isLoading,
        startShift,
        endShift,
        adminEndShift,
        adminPauseShift,
        adminResumeShift,
        refreshShifts
    };
};
