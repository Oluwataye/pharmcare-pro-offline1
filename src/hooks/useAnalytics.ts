
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db-client';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, subDays, startOfMonth, startOfYear } from 'date-fns';

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ChartType = 'bar' | 'line' | 'donut';

export interface AnalyticsSummary {
    totalRevenue: number;
    totalProfit: number;
    totalExpenses: number;
    netProfit: number;
    margin: number;
    totalSales: number;
}

export interface ChartData {
    date: string;
    revenue: number;
    profit: number;
    expenses: number;
    netProfit: number;
}

export interface CategoryData {
    name: string;
    value: number;
}

export interface ProductData {
    name: string;
    revenue: number;
    profit: number;
    quantity: number;
}

export interface AnalyticsData {
    salesOverTime: ChartData[];
    topProducts: ProductData[];
    expenseCategories: CategoryData[];
    summary: AnalyticsSummary;
}

export function useAnalytics(period: Period) {
    const { toast } = useToast();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['analytics', period],
        queryFn: async () => {
            console.log(`[useAnalytics] Fetching data for period: ${period}`);
            const now = new Date();
            let startDate: Date;

            switch (period) {
                case 'daily':
                    startDate = startOfDay(now);
                    break;
                case 'weekly':
                    startDate = subDays(now, 7);
                    break;
                case 'monthly':
                    startDate = subDays(now, 30);
                    break;
                case 'yearly':
                    startDate = subDays(now, 365);
                    break;
                default:
                    startDate = startOfDay(now);
            }

            const startDateIso = startDate.toISOString();

            // 1. Parallel Data Fetching from Local DB
            const [salesResponse, expensesResponse] = await Promise.all([
                db.from('sales').select('*').gte('created_at', startDateIso),
                db.from('expenses').select('*').gte('date', startDateIso.split('T')[0])
            ]);

            if (salesResponse.error) throw salesResponse.error;

            const sales = salesResponse.data || [];
            const expenses = expensesResponse.data || [];

            // 2. Fetch Sales Items (Only if we have sales)
            let relevantItems: any[] = [];
            if (sales.length > 0) {
                const saleIds = sales.map(s => s.id);
                // In offline mode, we don't need to worry about param limits as much, but let's keep it simple
                const { data: items, error: itemsError } = await db
                    .from('sales_items')
                    .select('*')
                    .in('sale_id', saleIds);

                if (itemsError) throw itemsError;
                relevantItems = items || [];
            }

            // 3. Process Data
            const itemsBySaleId = new Map<string, any[]>();
            relevantItems.forEach(item => {
                const list = itemsBySaleId.get(item.sale_id) || [];
                list.push(item);
                itemsBySaleId.set(item.sale_id, list);
            });

            const timeSeriesMap = new Map<string, ChartData>();
            let totalRevenue = 0;
            let totalGrossProfit = 0;

            sales.forEach(sale => {
                const saleItems = itemsBySaleId.get(sale.id) || [];
                const saleRevenue = Number(sale.total);

                let saleProfit = 0;
                saleItems.forEach(item => {
                    const cost = Number(item.cost_price || 0) * item.quantity;
                    const revenue = Number(item.total);
                    saleProfit += (revenue - cost);
                });

                totalRevenue += saleRevenue;
                totalGrossProfit += saleProfit;

                const dateKey = new Date(sale.created_at).toLocaleDateString();
                if (!timeSeriesMap.has(dateKey)) {
                    timeSeriesMap.set(dateKey, {
                        date: dateKey, revenue: 0, profit: 0, expenses: 0, netProfit: 0
                    });
                }
                const dayData = timeSeriesMap.get(dateKey)!;
                dayData.revenue += saleRevenue;
                dayData.profit += saleProfit;
            });

            let totalExpenses = 0;
            const expenseCatMap = new Map<string, number>();

            expenses.forEach((expense: any) => {
                const amount = Number(expense.amount);
                totalExpenses += amount;

                const currentCatTotal = expenseCatMap.get(expense.category) || 0;
                expenseCatMap.set(expense.category, currentCatTotal + amount);

                const dateKey = new Date(expense.date).toLocaleDateString();
                if (!timeSeriesMap.has(dateKey)) {
                    timeSeriesMap.set(dateKey, {
                        date: dateKey, revenue: 0, profit: 0, expenses: 0, netProfit: 0
                    });
                }
                const dayData = timeSeriesMap.get(dateKey)!;
                dayData.expenses += amount;
            });

            const timeSeries = Array.from(timeSeriesMap.values()).map(day => ({
                ...day,
                netProfit: day.profit - day.expenses
            })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const productMap = new Map<string, ProductData>();
            relevantItems.forEach(item => {
                if (!productMap.has(item.product_name)) {
                    productMap.set(item.product_name, {
                        name: item.product_name,
                        revenue: 0,
                        profit: 0,
                        quantity: 0
                    });
                }
                const prod = productMap.get(item.product_name)!;
                const cost = Number(item.cost_price || 0) * item.quantity;
                prod.revenue += Number(item.total);
                prod.profit += (Number(item.total) - cost);
                prod.quantity += item.quantity;
            });

            const topProducts = Array.from(productMap.values())
                .sort((a, b) => b.profit - a.profit)
                .slice(0, 5);

            const expenseCategories = Array.from(expenseCatMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            const netProfit = totalGrossProfit - totalExpenses;

            return {
                salesOverTime: timeSeries,
                topProducts,
                expenseCategories,
                summary: {
                    totalRevenue,
                    totalProfit: totalGrossProfit,
                    totalExpenses,
                    netProfit,
                    margin: totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0,
                    totalSales: sales.length
                }
            } as AnalyticsData;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        retry: 1
    });

    if (error) {
        console.error("Analytics Error:", error);
    }

    return {
        data: data || {
            salesOverTime: [],
            topProducts: [],
            expenseCategories: [],
            summary: {
                totalRevenue: 0, totalProfit: 0, totalExpenses: 0, netProfit: 0, margin: 0, totalSales: 0
            }
        },
        isLoading,
        error,
        refetch
    };
}
