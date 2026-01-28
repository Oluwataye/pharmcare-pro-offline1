
import { useState, useEffect } from "react";
import { db } from "@/lib/db-client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";

export interface StockAdjustment {
    id: string;
    product_id: string;
    quantity_before: number;
    quantity_after: number;
    cost_price_at_time: number;
    selling_price_at_time: number;
    adjustment_type: 'Increase' | 'Decrease';
    reason: string;
    adjusted_by: string;
    created_at: string;
    product?: {
        name: string;
        sku: string;
    };
    user?: {
        name: string;
    };
}

export const useStockAdjustments = (startDate?: string, endDate?: string) => {
    const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isOnline } = useOffline();
    const { user } = useAuth();

    const fetchAdjustments = async () => {
        if (!isOnline || !user) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            let query = db
                .from('stock_adjustments')
                .select(`
          *,
          product:inventory(name, sku),
          user:profiles(name)
        `)
                .order('created_at', { ascending: false });

            if (startDate) {
                query = query.gte('created_at', startDate);
            }

            if (endDate) {
                // Add 23:59:59 to end date to include the whole day
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                query = query.lte('created_at', endDateTime.toISOString());
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            setAdjustments(data || []);
        } catch (err: any) {
            console.error("Error fetching adjustments:", err);
            setError(err.message || "Failed to fetch adjustments");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAdjustments();
    }, [startDate, endDate, isOnline, user]);

    return { adjustments, isLoading, error, refresh: fetchAdjustments };
};
