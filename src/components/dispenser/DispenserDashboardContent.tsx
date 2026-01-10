
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { DispenserHeader } from "./DispenserHeader";
import { DispenserStatsCards } from "./DispenserStatsCards";
import { EnhancedTransactionsCard } from "@/components/admin/EnhancedTransactionsCard";
import { EnhancedLowStockCard } from "@/components/admin/EnhancedLowStockCard";
import { TransactionsTable } from "./TransactionsTable";
import { NewSaleForm } from "./NewSaleForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRefundAnalytics } from "@/hooks/sales/useRefundAnalytics";
import { AlertTriangle, DollarSign, Receipt, RefreshCcw } from "lucide-react";
import { db } from "@/lib/db-client";
import { useAuth } from "@/contexts/AuthContext";

interface Transaction {
    id: string;
    customer: string;
    items: number;
    amount: number;
    time: string;
    date: string;
    status: string;
}

interface LowStockItem {
    id: string;
    product: string;
    category: string;
    quantity: number;
    reorderLevel: number;
}

export const DispenserDashboardContent = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const { analytics: refundStats } = useRefundAnalytics();
    const [showNewSaleForm, setShowNewSaleForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Real data states
    const [todaysSales, setTodaysSales] = useState(0);
    const [todaysTxCount, setTodaysTxCount] = useState(0);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch real data
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            setIsLoading(true);
            try {
                const now = new Date();
                const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();

                // 1. Fetch Today's Sales & Count for current user
                const { data: salesToday } = await db
                    .from('sales')
                    .select('total')
                    .eq('cashier_id', user.id)
                    .gte('created_at', startOfDay);

                const totalSales = salesToday?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
                setTodaysSales(totalSales);
                setTodaysTxCount(salesToday?.length || 0);

                // 2. Fetch Recent Transactions (Personal Only)
                let transactionsQuery = db
                    .from('sales')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                // Strict filtering for Dispenser Dashboard - always show own sales
                if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
                    transactionsQuery = transactionsQuery.eq('cashier_id', user.id);
                }

                const { data: recentSales } = await transactionsQuery;

                const mappedTransactions: Transaction[] = (recentSales || []).map((sale: any) => ({
                    id: sale.id,
                    customer: sale.customer_name || "Walk-in Customer",
                    items: 1, // Simplified
                    amount: Number(sale.total),
                    time: new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    date: new Date(sale.created_at).toLocaleDateString(),
                    status: sale.status || "Completed"
                }));
                setRecentTransactions(mappedTransactions);

                // 3. Fetch Low Stock Items (Global - Shared Inventory)
                const { data: inventory } = await db
                    .from('inventory')
                    .select('*')
                    .lte('quantity', 15) // Simple filter first
                    .limit(5); // Just top 5 for dashboard

                const mappedLowStock: LowStockItem[] = (inventory || [])
                    .filter((item: any) => item.quantity <= (item.low_stock_threshold || 10))
                    .map((item: any) => ({
                        id: item.id,
                        product: item.name,
                        category: item.category || 'General',
                        quantity: item.quantity,
                        reorderLevel: item.low_stock_threshold || 10
                    }));
                setLowStockItems(mappedLowStock);

            } catch (error) {
                console.error("Error fetching dispenser dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const filteredTransactions = recentTransactions.filter(
        transaction =>
            transaction.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transaction.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleNewSale = () => {
        setShowNewSaleForm(true);
    };

    const handleSaleComplete = () => {
        toast({
            title: "Sale Completed",
            description: "The transaction was processed successfully",
        });
        setShowNewSaleForm(false);
    };

    const handleCardClick = (route: string) => {
        navigate(route);
    };

    const handleItemClick = (route: string, id: number | string) => {
        navigate(route);
    };

    const statsCards = [
        {
            title: "Today's Sales",
            value: `₦${todaysSales.toLocaleString()}`,
            icon: DollarSign,
            description: "For this shift",
            iconColor: "text-primary",
            route: "/sales"
        },
        {
            title: "Transactions",
            value: todaysTxCount.toString(),
            icon: Receipt,
            description: "Processed today",
            iconColor: "text-primary",
            route: "/sales"
        },
        {
            title: "My Refunds",
            value: refundStats.myPendingCount.toString(),
            icon: RefreshCcw,
            description: `${refundStats.myPendingCount} pending requests`,
            iconColor: refundStats.myPendingCount > 0 ? "text-amber-500" : "text-primary",
            route: "/receipts"
        },
        {
            title: "Low Stock Items",
            value: lowStockItems.length.toString(),
            icon: AlertTriangle,
            description: "Needs attention",
            iconColor: "text-amber-500",
            route: "/inventory"
        }
    ];

    if (isLoading) {
        return <div className="p-8 text-center">Loading Dashboard...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in px-2 md:px-0">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Dispenser Dashboard</h1>
            </div>

            <DispenserHeader
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleNewSale={handleNewSale}
            />

            {showNewSaleForm ? (
                <Card className="border-2 border-primary/10">
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="text-xl md:text-2xl">New Sale</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                        <NewSaleForm onComplete={handleSaleComplete} onCancel={() => setShowNewSaleForm(false)} />
                    </CardContent>
                </Card>
            ) : (
                <>
                    <DispenserStatsCards
                        statsCards={statsCards}
                        handleCardClick={handleCardClick}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                        <EnhancedTransactionsCard
                            transactions={filteredTransactions.slice(0, 5).map(t => ({
                                id: t.id,
                                product: `${t.items} items`,
                                customer: t.customer,
                                amount: t.amount,
                                date: `Today, ${t.time}`
                            }))}
                            onItemClick={handleItemClick}
                            onViewAllClick={handleCardClick}
                        />

                        <EnhancedLowStockCard
                            items={lowStockItems}
                            onItemClick={handleItemClick}
                            onViewAllClick={handleCardClick}
                        />
                    </div>

                    <TransactionsTable
                        filteredTransactions={filteredTransactions}
                        handleItemClick={handleItemClick}
                    />
                </>
            )}
        </div>
    );
};
