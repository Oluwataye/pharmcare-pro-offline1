import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { db } from "@/lib/db-client";
import { Loader2, Package, AlertTriangle } from "lucide-react";

const InventoryReport = () => {
  const [inventoryData, setInventoryData] = useState<{ category: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const { data: inventory, error } = await db
          .from("inventory")
          .select("*");

        if (error) throw error;

        // 1. Calculate Total Inventory Value
        const total = inventory?.reduce((sum, item) => {
          return sum + ((item.quantity || 0) * (item.unit_price || 0));
        }, 0) || 0;
        setTotalValue(total);

        // 2. Count Low Stock Items
        const lowStock = inventory?.filter(item => (item.quantity || 0) <= (item.low_stock_threshold || 10)).length || 0;
        setLowStockCount(lowStock);

        // 3. Group by Category for Chart
        const categoryMap: Record<string, number> = {};
        inventory?.forEach(item => {
          const cat = item.category || "Uncategorized";
          const val = (item.quantity || 0) * (item.unit_price || 0);
          categoryMap[cat] = (categoryMap[cat] || 0) + val;
        });

        const chartData = Object.entries(categoryMap).map(([category, value]) => ({
          category,
          value
        })).sort((a, b) => b.value - a.value); // Sort by value desc

        setInventoryData(chartData);

      } catch (error) {
        console.error("Error fetching inventory report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const chartConfig = {
    value: {
      label: "Stock Value (₦)",
      color: "hsl(var(--primary))",
    },
  };

  const MetricCard = ({ title, value, icon, subValue, colorScheme = 'primary' }: any) => {
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
              <div className="text-2xl font-bold tracking-tight text-slate-900 group-hover:scale-105 transition-transform">{value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {subValue}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${bgColors[colorScheme]} group-hover:scale-110 transition-transform`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Total Inventory Value"
          value={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `₦${totalValue.toLocaleString()}`}
          icon={<Package className="h-5 w-5 text-blue-600" />}
          subValue="Current asset value"
          colorScheme="primary"
        />
        <MetricCard
          title="Low Stock Items"
          value={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : lowStockCount}
          icon={<AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />}
          subValue="Items below threshold"
          colorScheme={lowStockCount > 0 ? 'warning' : 'success'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Value by Category</CardTitle>
          <CardDescription>
            Distribution of stock value across categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : inventoryData.length > 0 ? (
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={100}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]}>
                      {inventoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--primary))`} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No inventory data available.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryReport;
