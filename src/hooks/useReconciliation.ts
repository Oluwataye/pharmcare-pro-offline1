
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, subDays } from 'date-fns';
import { apiFetch } from '@/lib/api-client';

export interface ReconciliationShift {
    id: string;
    user_id: string;
    shift_type: string;
    staff_name: string;
    staff_email: string;
    expected_cash_total: number;
    actual_cash_counted: number;
    expected_pos_total: number;
    expected_transfer_total: number;
    status: string;
    notes: string | null;
    created_at: string;
    variance: number;
}

export interface ReconciliationFilters {
    /** Number of days to look back (e.g. "7", "30", "90"). Ignored when customFrom/customTo are set. */
    dateRange?: string;
    status?: string;
    searchTerm?: string;
    /** ISO date string — start of custom range (inclusive). Overrides dateRange when both are provided. */
    customFrom?: string;
    /** ISO date string — end of custom range (inclusive, extended to end of day by API). */
    customTo?: string;
}

export function useReconciliation(filters?: ReconciliationFilters) {
    const { toast } = useToast();

    const { data: shifts = [], isLoading, error, refetch } = useQuery({
        queryKey: ['reconciliation', filters],
        queryFn: async () => {
            console.log('[useReconciliation] Fetching shifts with filters:', filters);

            const params = new URLSearchParams();

            // Custom date range takes precedence over the preset drop-down
            if (filters?.customFrom && filters?.customTo) {
                const fromDate = startOfDay(new Date(filters.customFrom)).toISOString();
                // Extend "to" to end-of-day so the last selected day is fully included
                const toDate = new Date(filters.customTo);
                toDate.setHours(23, 59, 59, 999);
                params.append('created_at', `gte.${fromDate}`);
                params.append('created_at_end', `lte.${toDate.toISOString()}`);
            } else {
                const days = parseInt(filters?.dateRange || '7', 10);
                const startDate = startOfDay(subDays(new Date(), days)).toISOString();
                params.append('created_at', `gte.${startDate}`);
            }

            if (filters?.status && filters.status !== 'all') {
                params.append('status', `eq.${filters.status}`);
            }

            const response = await apiFetch(`/api/shifts?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch reconciliation records');
            }

            const data = await response.json();

            // Client-side search filter (backend search would require a LIKE query extension)
            const searchTerm = filters?.searchTerm?.toLowerCase() ?? '';

            return (data as any[])
                .map((shift) => ({
                    ...shift,
                    staff_name: shift.staff_name || 'Staff Member',
                    staff_email: shift.staff_email || 'No Email',
                    expected_cash_total: Number(shift.expected_cash) || 0,
                    actual_cash_counted: Number(shift.actual_cash) || 0,
                    expected_pos_total: 0,
                    expected_transfer_total: 0,
                    variance: (Number(shift.actual_cash) || 0) - (Number(shift.expected_cash) || 0),
                }))
                .filter((shift) => {
                    if (!searchTerm) return true;
                    return (
                        shift.staff_email?.toLowerCase().includes(searchTerm) ||
                        shift.staff_name?.toLowerCase().includes(searchTerm) ||
                        shift.notes?.toLowerCase().includes(searchTerm)
                    );
                }) as ReconciliationShift[];
        },
    });

    if (error) {
        toast({
            title: 'Error',
            description: 'Failed to load reconciliation records.',
            variant: 'destructive',
        });
    }

    return { shifts, isLoading, error, refetch };
}
