
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

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

interface ShiftContextType {
    activeShift: StaffShift | null;
    activeStaffShifts: StaffShift[];
    isLoading: boolean;
    refreshShifts: () => void;
    startShift: (openingBalance: number, notes?: string) => Promise<void>;
    endShift: (actualCash: number, notes?: string) => Promise<void>;
    adminEndShift: (shiftId: string, actualCash: number, staffId: string, startTime: string, notes?: string) => Promise<void>;
    fetchShiftTotals: (shiftId: string) => Promise<{ cash: number, pos: number, transfer: number, total: number }>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeShift, setActiveShift] = useState<StaffShift | null>(null);
    const [activeStaffShifts, setActiveStaffShifts] = useState<StaffShift[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchActiveShift = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetch('/api/shifts/active', {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('offline_token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setActiveShift(data);
            }
        } catch (error) {
            console.error('[ShiftProvider] Error fetching active shift:', error);
        }
    }, [user]);

    const fetchAllActiveShifts = useCallback(async () => {
        const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
        if (!isAdmin) return;
        try {
            const response = await fetch('/api/shifts?status=eq.open', {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('offline_token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setActiveStaffShifts(data);
            }
        } catch (error) {
            console.error('[ShiftProvider] Error fetching all active shifts:', error);
        }
    }, [user]);

    const refreshShifts = useCallback(() => {
        setIsLoading(true);
        Promise.all([fetchActiveShift(), fetchAllActiveShifts()]).finally(() => setIsLoading(false));
    }, [fetchActiveShift, fetchAllActiveShifts]);

    useEffect(() => {
        if (user) {
            refreshShifts();
        } else {
            setActiveShift(null);
            setActiveStaffShifts([]);
        }
    }, [user, refreshShifts]);

    const startShift = useCallback(async (openingBalance: number, notes?: string) => {
        try {
            const response = await fetch('/api/shifts/open', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('offline_token')}`
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
    }, [fetchActiveShift, toast]);

    const endShift = useCallback(async (actualCash: number, notes?: string) => {
        if (!activeShift) return;
        try {
            const response = await fetch(`/api/shifts/close/${activeShift.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('offline_token')}`
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
    }, [activeShift, fetchAllActiveShifts, toast]);

    const adminEndShift = useCallback(async (shiftId: string, actualCash: number, staffId: string, startTime: string, notes?: string) => {
        try {
            const response = await fetch(`/api/shifts/close/${shiftId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('offline_token')}`
                },
                body: JSON.stringify({ actual_cash: actualCash, notes: notes || "Administrative closure" })
            });

            if (!response.ok) throw new Error('Failed to force end shift');

            toast({ title: "Shift Force Ended", description: "The staff shift has been closed." });
            await fetchAllActiveShifts();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    }, [fetchAllActiveShifts, toast]);

    const fetchShiftTotals = useCallback(async (shiftId: string) => {
        try {
            const response = await fetch(`/api/shifts/totals/${shiftId}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('offline_token')}` }
            });
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Failed to fetch shift totals');
        } catch (error) {
            console.error('[ShiftProvider] Error fetching shift totals:', error);
            return { cash: 0, pos: 0, transfer: 0, total: 0 };
        }
    }, []);

    return (
        <ShiftContext.Provider value={{
            activeShift,
            activeStaffShifts,
            isLoading,
            refreshShifts,
            startShift,
            endShift,
            adminEndShift,
            fetchShiftTotals
        }}>
            {children}
        </ShiftContext.Provider>
    );
};

export const useShiftContext = () => {
    const context = useContext(ShiftContext);
    if (context === undefined) {
        throw new Error('useShiftContext must be used within a ShiftProvider');
    }
    return context;
};
