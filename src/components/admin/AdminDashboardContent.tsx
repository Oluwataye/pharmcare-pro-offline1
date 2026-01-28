import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Package, AlertTriangle, Activity } from "lucide-react";
import { NairaSign } from "../icons/NairaSign";
import { WelcomeBanner } from "./WelcomeBanner";
import { EnhancedStatCard } from "./EnhancedStatCard";
import { EnhancedTransactionsCard } from "./EnhancedTransactionsCard";
import { EnhancedLowStockCard } from "./EnhancedLowStockCard";
import { db } from "@/lib/db-client";

import { useRefundAnalytics } from "@/hooks/sales/useRefundAnalytics";
import { RefreshCcw } from "lucide-react";

const AdminDashboardContent = () => {
  const navigate = useNavigate();
  const { analytics: refundStats } = useRefundAnalytics();
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [mtdRevenue, setMtdRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch Recent Transactions
        const { data: salesData } = await db
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        const mappedTransactions = await Promise.all((salesData || []).map(async (sale: any) => {
          const { data: items } = await db
            .from('sales_items')
            .select('product_name')
            .eq('sale_id', sale.id)
            .limit(1);

          return {
            id: sale.id,
            product: items?.[0]?.product_name || "Multiple Items",
            customer: sale.customer_name || "Walk-in Customer",
            amount: Number(sale.total),
            date: new Date(sale.created_at).toLocaleString('en-US', {
              hour: 'numeric', minute: 'numeric', hour12: true,
              weekday: 'short'
            })
          };
        }));
        setRecentTransactions(mappedTransactions);

        // 2. Fetch Low Stock & Total Products
        const { data: inventory } = await db.from('inventory').select('*');
        if (inventory) {
          const lowStock = inventory.filter((item: any) => item.quantity <= (item.reorderLevel || 10));
          setLowStockItems(lowStock.map(item => ({
            id: item.id,
            product: item.name,
            category: item.category,
            quantity: item.quantity,
            reorderLevel: item.reorderLevel || 10
          })));
          setTotalProducts(inventory.length);
        }

        // 3. Calculate Stats
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data: todaySalesData } = await db
          .from('sales')
          .select('total')
          .gte('created_at', startOfDay);

        const { data: monthSalesData } = await db
          .from('sales')
          .select('total')
          .gte('created_at', startOfMonth);

        setTodaySales(todaySalesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0);
        setMtdRevenue(monthSalesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0);

      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // 4. Subscribe to Realtime Updates
    const salesChannel = db
      .channel('dashboard-sales-changes')
      .on('postgres_changes', { event: '*', table: 'sales' }, () => {
        console.log('[Dashboard] Sales changed, refreshing...');
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      db.removeChannel(salesChannel);
    };
  }, []);

  const handleCardClick = (route: string) => {
    navigate(route);
  };

  const handleItemClick = (route: string, id: string | number) => {
    navigate(route);
  };

  const stats = [
    {
      title: "Today's Sales",
      value: `₦${todaySales.toLocaleString()}`,
      icon: NairaSign,
      trend: "Current",
      trendUp: true,
      route: "/sales",
      colorScheme: 'primary' as const,
      size: 'large' as const,
      comparisonLabel: "Real-time updates"
    },
    {
      title: "Low Stock Items",
      value: lowStockItems.length.toString(),
      icon: AlertTriangle,
      trend: lowStockItems.length > 0 ? "Action Required" : "All Healthy",
      trendUp: false,
      route: "/inventory",
      colorScheme: lowStockItems.length > 0 ? 'warning' as const : 'success' as const,
      comparisonLabel: "from database"
    },
    {
      title: "Total Products",
      value: totalProducts.toLocaleString(),
      icon: Package,
      trend: "Inventory",
      trendUp: true,
      route: "/inventory",
      colorScheme: 'primary' as const,
      comparisonLabel: "in stock"
    },
    {
      title: "Refund Requests",
      value: refundStats.pendingCount.toString(),
      icon: RefreshCcw,
      trend: `${refundStats.approvedCount} approved this month`,
      trendUp: refundStats.pendingCount === 0,
      route: "/refunds", // Correct route for refund approval
      colorScheme: (refundStats.pendingCount > 0 ? "warning" : "primary") as "warning" | "primary",
      comparisonLabel: "Pending Actions"
    },
    {
      title: "Revenue (MTD)",
      value: `₦${mtdRevenue.toLocaleString()}`,
      icon: NairaSign,
      trend: "Monthly",
      trendUp: true,
      route: "/reports",
      colorScheme: 'success' as const,
      comparisonLabel: "this month"
    },
    {
      title: "Live Analytics",
      value: "View Data",
      icon: Activity,
      trend: "Real-time",
      trendUp: true,
      route: "/analytics",
      colorScheme: 'primary' as const,
      comparisonLabel: "performance"
    },
  ];

  if (isLoading) return <div className="p-8 text-center">Loading Dashboard...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
      </div>

      <WelcomeBanner
        lowStockCount={lowStockItems.length}
        onQuickAction={() => handleCardClick('/inventory')}
      />

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <EnhancedStatCard
            key={stat.title}
            {...stat}
            onClick={handleCardClick}
          />
        ))}
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        <EnhancedTransactionsCard
          transactions={recentTransactions}
          onItemClick={handleItemClick}
          onViewAllClick={handleCardClick}
        />

        <EnhancedLowStockCard
          items={lowStockItems}
          onItemClick={handleItemClick}
          onViewAllClick={handleCardClick}
        />
      </div>
    </div>
  );
};

export default AdminDashboardContent;

