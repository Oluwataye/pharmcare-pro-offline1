import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db-client";
import { format } from "date-fns";
import { Loader2, User, Award, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const UserAuditReport = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [userPerformance, setUserPerformance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Sales for Performance Metrics
        const { data: sales, error: salesError } = await db
          .from("sales")
          .select("cashier_name, total");

        if (salesError) throw salesError;

        // Group by Dispenser
        const performanceMap: Record<string, { count: number; revenue: number }> = {};
        sales?.forEach(sale => {
          const cashier = sale.cashier_name || "Unknown";
          if (!performanceMap[cashier]) {
            performanceMap[cashier] = { count: 0, revenue: 0 };
          }
          performanceMap[cashier].count++;
          performanceMap[cashier].revenue += (Number(sale.total) || 0);
        });

        const performanceData = Object.entries(performanceMap)
          .map(([name, stats]) => ({
            name,
            ...stats
          }))
          .sort((a, b) => b.revenue - a.revenue);

        setUserPerformance(performanceData);


        // 2. Fetch Recent Audit Logs
        const { data: logs, error: logsError } = await db
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (logsError) throw logsError;
        setAuditLogs(logs || []);

      } catch (error) {
        console.error("Error fetching user audit report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const MetricCard = ({ title, value, icon, subValue, colorScheme = 'primary', isTopPerformer }: any) => {
    const colorClasses: any = {
      primary: 'border-l-blue-500',
      warning: 'border-l-amber-500',
      slate: 'border-l-slate-400'
    };

    const bgColors: any = {
      primary: 'bg-blue-50/50',
      warning: 'bg-amber-50/50',
      slate: 'bg-slate-50/50'
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
      {/* Dispenser Performance Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Dispenser Performance</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full h-20 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userPerformance.length > 0 ? (
            userPerformance.map((user, index) => (
              <MetricCard
                key={user.name}
                title={user.name}
                value={`₦${user.revenue.toLocaleString()}`}
                icon={index === 0 ? <Award className="h-5 w-5 text-amber-600" /> : <User className="h-5 w-5 text-slate-600" />}
                subValue={`${user.count} Transactions`}
                colorScheme={index === 0 ? 'warning' : 'slate'}
              />
            ))
          ) : (
            <div className="col-span-full p-4 text-center text-muted-foreground">No sales performance data found.</div>
          )}
        </div>
      </div>

      {/* Recent System Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <CardDescription>Latest actions performed by users</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {format(new Date(log.created_at), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell>{log.user_email || "System"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {log.event_type?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={log.action}>
                      {log.action}
                    </TableCell>
                    <TableCell>
                      <span className={log.status === 'success' ? 'text-green-600 font-medium text-xs' : 'text-red-600 font-medium text-xs'}>
                        {log.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserAuditReport;
