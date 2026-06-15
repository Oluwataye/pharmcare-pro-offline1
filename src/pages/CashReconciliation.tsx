
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Clock,
    ShieldCheck,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useReconciliation } from "@/hooks/useReconciliation";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";

/** Preset options available to all users */
const BASE_PRESETS = [
    { label: "Last 24 Hours", value: "1" },
    { label: "Last 7 Days",   value: "7" },
    { label: "Last 30 Days",  value: "30" },
];

/** Additional presets unlocked for admin roles */
const ADMIN_PRESETS = [
    { label: "Last 90 Days",  value: "90" },
    { label: "Last 6 Months", value: "180" },
    { label: "Last 1 Year",   value: "365" },
    { label: "Custom Range",  value: "custom" },
];

const isAdminRole = (role?: string) => {
    if (!role) return false;
    const r = role.toUpperCase();
    return r === "ADMIN" || r === "SUPER_ADMIN";
};

const CashReconciliation = () => {
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);

    const [searchQuery, setSearchQuery]   = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange]       = useState("7");

    // Custom range state — only relevant when dateRange === "custom"
    const today = format(new Date(), "yyyy-MM-dd");
    const [customFrom, setCustomFrom] = useState(today);
    const [customTo,   setCustomTo]   = useState(today);

    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const isCustom = dateRange === "custom";

    const { shifts, isLoading } = useReconciliation({
        dateRange:   isCustom ? undefined : dateRange,
        status:      statusFilter,
        searchTerm:  debouncedSearchQuery,
        customFrom:  isCustom ? customFrom : undefined,
        customTo:    isCustom ? customTo   : undefined,
    });

    const metrics = useMemo(() => {
        const totalVariance        = shifts.reduce((acc, s) => acc + s.variance, 0);
        const totalExpectedCash    = shifts.reduce((acc, s) => acc + (s.expected_cash_total || 0), 0);
        const totalActualCounted   = shifts.reduce((acc, s) => acc + (s.actual_cash_counted || 0), 0);
        const shiftsWithVariance   = shifts.filter(s => Math.abs(s.variance) > 0).length;
        const closedShifts         = shifts.filter(s => s.status === "closed").length;
        const auditAlerts          = shifts.filter(s => Math.abs(s.variance) > 1000).length;

        return { totalVariance, totalExpectedCash, totalActualCounted, shiftsWithVariance, closedShifts, auditAlerts };
    }, [shifts]);

    // CSV export helper
    const handleExportCSV = () => {
        if (shifts.length === 0) return;
        const headers = ["Date", "Staff Email", "Expected Cash (₦)", "Actual Counted (₦)", "Variance (₦)", "Status"];
        const rows = shifts.map(s => [
            format(new Date(s.created_at), "dd MMM yyyy HH:mm"),
            s.staff_email,
            s.expected_cash_total,
            s.actual_cash_counted,
            s.variance,
            s.status,
        ]);
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `cash_reconciliation_${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const allPresets = isAdmin ? [...BASE_PRESETS, ...ADMIN_PRESETS] : BASE_PRESETS;

    return (
        <div className="p-4 md:p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                        Cash Reconciliation
                    </h1>
                    <p className="text-muted-foreground">
                        Audit financial performance and shift variances
                        {isAdmin && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                                <ShieldCheck className="h-3 w-3" />
                                Admin — Extended date access enabled
                            </span>
                        )}
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleExportCSV}
                    disabled={shifts.length === 0}
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Metric Cards */}
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

            {/* Audit Log Table */}
            <Card className="shadow-sm border-primary/10">
                <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex flex-col gap-4">
                        {/* Row 1: Title + quick filters */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Audit Log
                                <Badge variant="secondary" className="ml-1 font-normal">
                                    {shifts.length} record{shifts.length !== 1 ? "s" : ""}
                                </Badge>
                            </CardTitle>

                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                {/* Search */}
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="reconciliation-search"
                                        placeholder="Search staff or notes..."
                                        className="pl-8"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                {/* Status filter */}
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[130px]" id="reconciliation-status">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Date range preset */}
                                <Select value={dateRange} onValueChange={(v) => setDateRange(v)}>
                                    <SelectTrigger className="w-[155px]" id="reconciliation-date-range">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        <SelectValue placeholder="Date Range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BASE_PRESETS.map((p) => (
                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                        ))}
                                        {isAdmin && (
                                            <>
                                                <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-t mt-1 pt-2">
                                                    Admin Extended
                                                </div>
                                                {ADMIN_PRESETS.map((p) => (
                                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2: Custom date inputs — shown only when admin selects "Custom Range" */}
                        {isAdmin && isCustom && (
                            <div className="flex flex-wrap items-end gap-4 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                                <ShieldCheck className="h-4 w-4 text-amber-600 mt-6 shrink-0" />
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="custom-from" className="text-xs font-medium text-muted-foreground">From</Label>
                                    <Input
                                        id="custom-from"
                                        type="date"
                                        className="w-[160px] h-9 text-sm"
                                        value={customFrom}
                                        max={customTo}
                                        onChange={(e) => setCustomFrom(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="custom-to" className="text-xs font-medium text-muted-foreground">To</Label>
                                    <Input
                                        id="custom-to"
                                        type="date"
                                        className="w-[160px] h-9 text-sm"
                                        value={customTo}
                                        min={customFrom}
                                        max={today}
                                        onChange={(e) => setCustomTo(e.target.value)}
                                    />
                                </div>
                                <p className="text-xs text-amber-700 dark:text-amber-400 self-end pb-1.5">
                                    Showing results from {format(new Date(customFrom), "dd MMM yyyy")} to {format(new Date(customTo), "dd MMM yyyy")}
                                </p>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64 p-8 text-muted-foreground">
                            <Clock className="h-5 w-5 animate-spin mr-2" /> Loading records…
                        </div>
                    ) : shifts.length === 0 ? (
                        <div className="text-center py-20 bg-muted/5">
                            <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-20" />
                            <p className="text-muted-foreground font-medium">No recorded shifts found for this period.</p>
                            {isAdmin && !isCustom && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Try selecting a longer range or use <strong>Custom Range</strong>.
                                </p>
                            )}
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
                                            {format(new Date(shift.created_at), "dd MMM yyyy, HH:mm")}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {shift.staff_email}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            ₦{(shift.expected_cash_total || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold">
                                            ₦{(shift.actual_cash_counted || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge
                                                variant={
                                                    shift.variance === 0
                                                        ? "outline"
                                                        : shift.variance > 0
                                                        ? "secondary"
                                                        : "destructive"
                                                }
                                            >
                                                {shift.variance >= 0 ? "+" : ""}
                                                ₦{shift.variance.toLocaleString()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={shift.status === "closed" ? "default" : "outline"}
                                                className="capitalize"
                                            >
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
