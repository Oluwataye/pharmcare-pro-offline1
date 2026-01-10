import { useState, useEffect } from 'react';
import { db } from "@/lib/db-client";
import { useAuth } from '@/contexts/AuthContext';

export interface RefundAnalytics {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalRefundedAmount: number;
    myPendingCount: number; // For cashiers/pharmacists
    myApprovedAmount: number; // For cashiers/pharmacists
}

export const useRefundAnalytics = () => {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<RefundAnalytics>({
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalRefundedAmount: 0,
        myPendingCount: 0,
        myApprovedAmount: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            // Fetch all refunds
            const { data: allRefunds, error } = await db
                .from('refunds')
                .select('*');

            if (error) throw error;

            const refunds = allRefunds || [];

            // Calculate overall stats
            const pending = refunds.filter(r => r.status === 'pending');
            const approved = refunds.filter(r => r.status === 'approved');
            const rejected = refunds.filter(r => r.status === 'rejected');
            const totalRefunded = approved.reduce((sum, r) => sum + (r.refund_amount || 0), 0);

            // Calculate user-specific stats (for cashiers/pharmacists)
            const myPending = user ? pending.filter(r => r.initiated_by === user.id) : [];
            const myApproved = user ? approved.filter(r => r.initiated_by === user.id) : [];
            const myApprovedAmount = myApproved.reduce((sum, r) => sum + (r.refund_amount || 0), 0);

            setAnalytics({
                pendingCount: pending.length,
                approvedCount: approved.length,
                rejectedCount: rejected.length,
                totalRefundedAmount: totalRefunded,
                myPendingCount: myPending.length,
                myApprovedAmount: myApprovedAmount,
            });
        } catch (error) {
            console.error('Error fetching refund analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [user]);

    return {
        analytics,
        isLoading,
        refetchAnalytics: fetchAnalytics,
    };
};
