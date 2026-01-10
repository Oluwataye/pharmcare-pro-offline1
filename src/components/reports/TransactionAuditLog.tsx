import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { db } from "@/lib/db-client";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TransactionAuditLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        // Fetch logs related to Sales, Inventory, or Refunds
        const { data, error } = await db
          .from("audit_logs")
          .select("*")
          .in("resource_type", ["sales", "inventory", "refunds"])
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error("Error fetching transaction audit logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Audit Log</CardTitle>
        <CardDescription>History of sales, inventory changes, and refunds</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No transaction logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {format(new Date(log.created_at), "MMM dd, HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{log.user_email || "System"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase mb-1">
                      {log.event_type?.replace(/_/g, " ")}
                    </Badge>
                    <div className="text-xs font-medium">{log.action}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={JSON.stringify(log.details)}>
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TransactionAuditLog;
