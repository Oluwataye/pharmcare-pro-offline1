
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export interface Expense {
    id: string;
    category: string;
    amount: number;
    date: string;
    description: string | null;
    reference: string | null;
    created_at: string;
    updated_at: string;
    user_id: string;
}

export type NewExpense = Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

export interface ExpenseFilters {
    startDate?: string;
    endDate?: string;
    category?: string;
    searchTerm?: string;
}

export const useExpenses = (filters?: ExpenseFilters) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: expenses = [], isLoading, error, refetch } = useQuery({
        queryKey: ['expenses', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);
            if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
            if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm);

            const response = await fetch(`/api/expenses?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to fetch expenses');
            const data = await response.json();

            // Map created_at to date for UI compatibility if needed, though SQL has created_at
            return data.map((e: any) => ({
                ...e,
                date: e.created_at // Use created_at as the primary date
            })) as Expense[];
        },
    });

    const addExpenseMutation = useMutation({
        mutationFn: async (expense: NewExpense) => {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(expense)
            });

            if (!response.ok) throw new Error('Failed to record expense');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast({ title: 'Success', description: 'Expense recorded successfully' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    const deleteExpenseMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/expenses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to delete expense');
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast({ title: 'Success', description: 'Expense deleted successfully' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    return {
        expenses,
        isLoading,
        error,
        refetch,
        addExpense: addExpenseMutation.mutate,
        deleteExpense: deleteExpenseMutation.mutate,
        isAdding: addExpenseMutation.isPending,
        isDeleting: deleteExpenseMutation.isPending,
    };
};
