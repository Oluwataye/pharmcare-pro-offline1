import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ComposedChart, Line, Legend, Bar } from "recharts";
import { db } from "@/lib/db-client";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

const SalesReport = () => {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [avgMargin, setAvgMargin] = useState(0);
  const [growth, setGrowth] = useState(0);

  useEffect(() => {
    const fetchSalesData = async () => {
      setIsLoading(true);
      try {
        const endDate = new Date();
        const startDate = subMonths(new Date(), 5);

        const { data: sales, error } = await db
          .from("sales")
          .select("id, total, created_at")
          .gte("created_at", startOfMonth(startDate).toISOString())
          .lte("created_at", endOfMonth(endDate).toISOString());

        if (error) throw error;

        // Fetch sales items to calculate profit
        const { data: allItems } = await db
          .from("sales_items")
          .select("sale_id, quantity, cost_price, total");

        const itemsBySale = (allItems || []).reduce((acc: any, item) => {
          if (!acc[item.sale_id]) acc[item.sale_id] = [];
          acc[item.sale_id].push(item);
          return acc;
        }, {});

        // Process data
        let totalRev = 0;
        let totalProf = 0;

        const monthlyData = eachMonthOfInterval({
          start: startOfMonth(startDate),
          end: endOfMonth(endDate),
        }).map((date) => {
          const monthLabel = format(date, "MMM");
          const monthStart = startOfMonth(date);
          const monthEnd = endOfMonth(date);

          const relevantSales = (sales || []).filter((sale) => {
            const saleDate = new Date(sale.created_at);
            return saleDate >= monthStart && saleDate <= monthEnd;
          });

          const monthlySales = relevantSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);

          let monthlyProfit = 0;
          relevantSales.forEach(sale => {
            const saleItems = itemsBySale[sale.id] || [];
            const saleCost = saleItems.reduce((sum: number, item: any) => sum + (Number(item.cost_price || 0) * item.quantity), 0);
            monthlyProfit += (Number(sale.total) - saleCost);
          });

          totalRev += monthlySales;
          totalProf += monthlyProfit;

          return {
            month: monthLabel,
            sales: monthlySales,
            profit: monthlyProfit,
          };
        });

        setSalesData(monthlyData);
        setTotalRevenue(totalRev);
        setTotalProfit(totalProf);
        setAvgMargin(totalRev > 0 ? (totalProf / totalRev) * 100 : 0);

        // Calculate Growth (Last month vs Previous month)
        if (monthlyData.length >= 2) {
          const lastMonth = monthlyData[monthlyData.length - 1].sales;
          const prevMonth = monthlyData[monthlyData.length - 2].sales;
          if (prevMonth > 0) {
            setGrowth(((lastMonth - prevMonth) / prevMonth) * 100);
          } else if (lastMonth > 0) {
            setGrowth(100);
          } else {
            setGrowth(0);
          }
        }
      } catch (error) {
        console.error("Error fetching sales report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  const chartConfig = {
    sales: { label: "Revenue", color: "#2563eb" },
    profit: { label: "Profit", color: "#10b981" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={`₦${totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          desc="Last 6 months combined"
          loading={isLoading}
          colorScheme="primary"
        />
        <MetricCard
          title="Gross Profit"
          value={`₦${totalProfit.toLocaleString()}`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          desc="Total margin earned"
          loading={isLoading}
          colorScheme="success"
        />
        <MetricCard
          title="Avg. Margin"
          value={`${avgMargin.toFixed(1)}%`}
          icon={<Percent className="h-4 w-4 text-amber-600" />}
          desc="Profitability ratio"
          loading={isLoading}
          colorScheme="warning"
        />
        <MetricCard
          title="Growth Rate"
          value={`${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
          icon={growth >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          desc="Vs. previous month"
          loading={isLoading}
          colorScheme={growth >= 0 ? "success" : "danger"}
        />
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>Comparison of revenue and profit across the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} tickMargin={10} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `₦${v / 1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="sales" name="Revenue" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard = ({ title, value, icon, desc, loading, highlight, colorScheme = 'primary' }: any) => {
  const colorClasses: any = {
    primary: 'border-l-blue-500',
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500'
  };

  const bgColors: any = {
    primary: 'bg-blue-50/50',
    success: 'bg-emerald-50/50',
    warning: 'bg-amber-50/50',
    danger: 'bg-red-50/50'
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer border-l-4 group bg-white ${colorClasses[colorScheme]}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
            <div className={`text-2xl font-bold tracking-tight text-slate-900 group-hover:scale-105 transition-transform`}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </div>
          <div className={`p-3 rounded-xl ${bgColors[colorScheme]} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesReport;
