
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import {
    Download,
    Filter,
    Search,
    TrendingDown,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Clock
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useReconciliation } from "@/hooks/useReconciliation";
import { useDebounce } from "@/hooks/useDebounce";

const CashReconciliation = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState("7");

    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const { shifts, isLoading } = useReconciliation({
        dateRange,
        status: statusFilter,
        searchTerm: debouncedSearchQuery
    });

    const metrics = useMemo(() => {
        const totalVariance = shifts.reduce((acc, s) => acc + s.variance, 0);
        const totalExpectedCash = shifts.reduce((acc, s) => acc + (s.expected_cash_total || 0), 0);
        const totalActualCounted = shifts.reduce((acc, s) => acc + (s.actual_cash_counted || 0), 0);

        const shiftsWithVariance = shifts.filter(s => Math.abs(s.variance) > 0).length;
        const closedShifts = shifts.filter(s => s.status === 'closed').length;
        const auditAlerts = shifts.filter(s => Math.abs(s.variance) > 1000).length;

        return {
            totalVariance,
            totalExpectedCash,
            totalActualCounted,
            shiftsWithVariance,
            closedShifts,
            auditAlerts
        };
    }, [shifts]);

    return (
        <div className="p-4 md:p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                        Cash Reconciliation
                    </h1>
                    <p className="text-muted-foreground">Audit financial performance and shift variances (Offline)</p>
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" /> Export CSV
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    title="Net Variance"
                    value={`₦${metrics.totalVariance.toLocaleString()}`}
                    icon={metrics.totalVariance >= 0 ? TrendingUp : TrendingDown}
                    description="Total over/shortage for period"
                    colorScheme={metrics.totalVariance >= 0 ? "success" : "danger"}
                />
                <MetricCard
                    title="Reconciled Shifts"
                    value={metrics.closedShifts.toString()}
                    icon={CheckCircle2}
                    description={`${metrics.shiftsWithVariance} shifts with variances detected`}
                    colorScheme="primary"
                />
                <MetricCard
                    title="Audit Alerts"
                    value={metrics.auditAlerts.toString()}
                    icon={AlertCircle}
                    description="Significant variances (> ₦1,000)"
                    colorScheme="warning"
                />
            </div>

            <Card className="shadow-sm border-primary/10">
                <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Audit Log
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search notes..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger className="w-[140px]">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Date Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Last 24 Hours</SelectItem>
                                    <SelectItem value="7">Last 7 Days</SelectItem>
                                    <SelectItem value="30">Last 30 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64 p-8">
                            Loading...
                        </div>
                    ) : shifts.length === 0 ? (
                        <div className="text-center py-20 bg-muted/5">
                            <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-20" />
                            <p className="text-muted-foreground font-medium">No recorded shifts found.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/5">
                                    <TableHead>Date</TableHead>
                                    <TableHead>Staff Member</TableHead>
                                    <TableHead className="text-right">Expected Cash</TableHead>
                                    <TableHead className="text-right">Actual Counted</TableHead>
                                    <TableHead className="text-right">Variance</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shifts.map((shift) => (
                                    <TableRow key={shift.id} className="hover:bg-muted/5 transition-colors group">
                                        <TableCell>
                                            {format(new Date(shift.created_at), 'dd MMM yyyy, HH:mm')}
                                        </TableCell>
                                        <TableCell>
                                            User ID: {shift.user_id.slice(0, 8)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            ₦{(shift.expected_cash_total || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold">
                                            ₦{(shift.actual_cash_counted || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge
                                                variant={shift.variance === 0 ? "outline" : shift.variance > 0 ? "secondary" : "destructive"}
                                            >
                                                {shift.variance >= 0 ? "+" : ""}
                                                ₦{shift.variance.toLocaleString()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={shift.status === 'closed' ? "default" : "outline"} className="capitalize">
                                                {shift.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CashReconciliation;
