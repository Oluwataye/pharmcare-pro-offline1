import { useState, useEffect } from 'react';
import { db } from "@/lib/db-client";
import { subDays, subMonths, subYears, isWithinInterval } from 'date-fns';

export interface DiscountRecord {
    id: string;
    date: string;
    time: string;
    itemName: string;
    originalPrice: number;
    discountPercentage: number;
    finalPrice: number;
    appliedBy: string;
}

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

export const useDiscountHistory = () => {
    const [discounts, setDiscounts] = useState<DiscountRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDiscountHistory = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch sales with discounts > 0
            const { data: sales, error: salesError } = await db
                .from('sales')
                .select('*')
                .gt('discount', 0)
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;

            if (!sales || sales.length === 0) {
                setDiscounts([]);
                setIsLoading(false);
                return;
            }

            // Fetch sales items for all discounted sales
            const saleIds = sales.map(s => s.id);
            const { data: items, error: itemsError } = await db
                .from('sales_items')
                .select('*')
                .in('sale_id', saleIds);

            if (itemsError) throw itemsError;

            // Transform data to discount records
            const records: DiscountRecord[] = [];

            for (const sale of sales) {
                const saleItems = items?.filter(item => item.sale_id === sale.id) || [];
                const discountPercent = Number(sale.discount) || 0;

                // Create a record for each item in the sale
                for (const item of saleItems) {
                    const itemTotal = Number(item.total) || 0;
                    const originalPrice = itemTotal / (1 - discountPercent / 100);

                    records.push({
                        id: `${sale.id}-${item.id}`,
                        date: sale.created_at,
                        time: new Date(sale.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        }),
                        itemName: item.product_name || 'Unknown Item',
                        originalPrice: Math.round(originalPrice * 100) / 100,
                        discountPercentage: discountPercent,
                        finalPrice: itemTotal,
                        appliedBy: sale.cashier_name || 'Unknown',
                    });
                }
            }

            setDiscounts(records);
        } catch (err) {
            console.error('Error fetching discount history:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch discount history');
            setDiscounts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterByPeriod = (period: TimePeriod): DiscountRecord[] => {
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'daily':
                startDate = subDays(now, 1);
                break;
            case 'weekly':
                startDate = subDays(now, 7);
                break;
            case 'monthly':
                startDate = subMonths(now, 1);
                break;
            case 'yearly':
                startDate = subYears(now, 1);
                break;
            default:
                return discounts;
        }

        return discounts.filter((record) =>
            isWithinInterval(new Date(record.date), {
                start: startDate,
                end: now,
            })
        );
    };

    useEffect(() => {
        fetchDiscountHistory();
    }, []);

    return {
        discounts,
        isLoading,
        error,
        filterByPeriod,
        refetch: fetchDiscountHistory,
    };
};
