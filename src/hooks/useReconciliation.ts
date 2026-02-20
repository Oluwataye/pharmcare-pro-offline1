
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, subDays } from 'date-fns';

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
    dateRange?: string;
    status?: string;
    searchTerm?: string;
}

export function useReconciliation(filters?: ReconciliationFilters) {
    const { toast } = useToast();

    const { data: shifts = [], isLoading, error, refetch } = useQuery({
        queryKey: ['reconciliation', filters],
        queryFn: async () => {
            console.log('[useReconciliation] Fetching shifts with filters:', filters);

            // Construct query parameters for local Express API
            const params = new URLSearchParams();

            // Handle date range
            const startDate = startOfDay(
                subDays(new Date(), parseInt(filters?.dateRange || '7'))
            ).toISOString();
            params.append('created_at', `gte.${startDate}`);

            // Apply status filter
            if (filters?.status && filters.status !== 'all') {
                params.append('status', `eq.${filters.status}`);
            }

            // Note: searchTerm handling would need backend support or client-side filtering
            // For now, we fetch the range and filter if needed or rely on basic queries

            const response = await fetch(`/api/shifts?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('offline_token')}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch reconciliation records');
            }

            const data = await response.json();

            // Transform data as expected by the UI
            // Note: Since we use 'shifts' table which maps to 'staff_shifts' conceptually
            return data.map((shift: any) => ({
                ...shift,
                staff_name: shift.staff_name || 'Staff Member', // Real name would come from JOIN eventually
                expected_cash_total: Number(shift.expected_cash) || 0,
                actual_cash_counted: Number(shift.actual_cash) || 0,
                expected_pos_total: 0, // Placeholder
                expected_transfer_total: 0, // Placeholder
                variance: (Number(shift.actual_cash) || 0) - (Number(shift.expected_cash) || 0)
            })) as ReconciliationShift[];
        }
    });

    if (error) {
        toast({
            title: 'Error',
            description: 'Failed to load reconciliation records.',
            variant: 'destructive'
        });
    }

    return {
        shifts,
        isLoading,
        error,
        refetch
    };
}
