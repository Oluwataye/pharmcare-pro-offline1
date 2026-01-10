import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { db } from "@/lib/db-client";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { Loader2 } from "lucide-react";

const TransactionsReport = () => {
  const [dailyData, setDailyData] = useState<{ date: string; transactions: number }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        // Fetch last 30 days of sales
        const endDate = new Date();
        const startDate = subDays(new Date(), 30);

        const { data: sales, error } = await db
          .from("sales")
          .select("created_at")
          .gte("created_at", startOfDay(startDate).toISOString())
          .lte("created_at", endOfDay(endDate).toISOString());

        if (error) throw error;

        // 1. Process Daily Transactions
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyStats = days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const count = sales?.filter(s => format(new Date(s.created_at), "yyyy-MM-dd") === dateStr).length || 0;
          return {
            date: format(day, "MMM dd"),
            transactions: count,
            rawDate: day
          };
        });
        setDailyData(dailyStats);

        // 2. Process Hourly Distribution (Overall)
        const hourCounts = new Array(24).fill(0);
        sales?.forEach(sale => {
          const hour = new Date(sale.created_at).getHours();
          hourCounts[hour]++;
        });

        const hourlyStats = hourCounts.map((count, hour) => ({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          count
        }));
        // Filter to show only active hours range (e.g., 8am to 8pm) if desired, or all
        // For now, let's just show all to see the full curve
        setHourlyData(hourlyStats);

      } catch (error) {
        console.error("Error fetching transaction report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const dailyConfig = {
    transactions: {
      label: "Transactions",
      color: "hsl(var(--primary))",
    },
  };

  const hourlyConfig = {
    count: {
      label: "Volume",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily Transaction Volume (Last 30 Days)</CardTitle>
          <CardDescription>Number of sales completed per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ChartContainer config={dailyConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={30} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="transactions"
                      stroke="var(--color-transactions)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peak Transaction Hours</CardTitle>
          <CardDescription>Aggregate sales volume by hour of day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ChartContainer config={hourlyConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={10} interval={2} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsReport;
