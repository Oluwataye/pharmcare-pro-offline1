
import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStockAdjustments } from "@/hooks/useStockAdjustments";
import { format } from "date-fns";
import {
    TrendingUp,
    TrendingDown,
    Search,
    Calendar as CalendarIcon,
    Download,
    AlertCircle
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { NairaSign } from "@/components/icons/NairaSign";

const StockAdjustmentReport = () => {
    const [startDate, setStartDate] = useState(
        format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd")
    );
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [searchTerm, setSearchTerm] = useState("");

    const { adjustments, isLoading, error } = useStockAdjustments(startDate, endDate);

    const filteredAdjustments = adjustments.filter(adj =>
        adj.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.product?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totals = filteredAdjustments.reduce((acc, curr) => {
        const diff = curr.quantity_after - curr.quantity_before;
        acc.costImpact += diff * curr.cost_price_at_time;
        acc.sellingImpact += diff * curr.selling_price_at_time;
        return acc;
    }, { costImpact: 0, sellingImpact: 0 });

    if (error) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        <p>Error loading adjustments: {error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-primary shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Total Cost Impact
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold flex items-center">
                                <NairaSign className="h-5 w-5 mr-1" />
                                {totals.costImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {totals.costImpact >= 0 ? (
                                <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : (
                                <TrendingDown className="h-5 w-5 text-red-500" />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            For selected date range
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Total Selling Value Impact
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold flex items-center">
                                <NairaSign className="h-5 w-5 mr-1" />
                                {totals.sellingImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {totals.sellingImpact >= 0 ? (
                                <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : (
                                <TrendingDown className="h-5 w-5 text-red-500" />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Potential revenue change
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Net Profit Potential Diff
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center">
                            <NairaSign className="h-5 w-5 mr-1" />
                            {(totals.sellingImpact - totals.costImpact).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Selling Impact - Cost Impact
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Adjustments Count
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredAdjustments.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Events in selected range
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-smooth border-white/20 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            Stock Adjustments History
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="start-date" className="sr-only">Start Date</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-40 h-9 text-sm"
                                />
                            </div>
                            <span className="text-muted-foreground">to</span>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="end-date" className="sr-only">End Date</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-40 h-9 text-sm"
                                />
                            </div>
                            <Button size="sm" variant="outline" className="h-9 gap-2">
                                <Download className="h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by product name, SKU, or reason..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-10 w-full"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <Spinner size="lg" />
                            <p className="text-muted-foreground animate-pulse">Fetching adjustment logs...</p>
                        </div>
                    ) : filteredAdjustments.length === 0 ? (
                        <div className="text-center p-20">
                            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground font-medium">No stock adjustments found for this period.</p>
                            <p className="text-xs text-muted-foreground mt-1">Try broadening your search or date range.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[180px]">Date & Time</TableHead>
                                        <TableHead>Product / SKU</TableHead>
                                        <TableHead className="text-center">Type</TableHead>
                                        <TableHead className="text-right">Before</TableHead>
                                        <TableHead className="text-right">After</TableHead>
                                        <TableHead className="text-right text-primary font-bold">Diff</TableHead>
                                        <TableHead className="text-right">Cost Impact</TableHead>
                                        <TableHead className="text-right font-medium">Selling Impact</TableHead>
                                        <TableHead>Reason / User</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAdjustments.map((adj) => {
                                        const diff = adj.quantity_after - adj.quantity_before;
                                        const costImpact = diff * adj.cost_price_at_time;
                                        const sellingImpact = diff * adj.selling_price_at_time;

                                        return (
                                            <TableRow key={adj.id} className="hover:bg-muted/20 transition-colors">
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(adj.created_at), "MMM dd, yyyy HH:mm")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{adj.product?.name || "Unknown Product"}</div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">{adj.product?.sku || "N/A"}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant={adj.adjustment_type === 'Increase' ? "default" : "destructive"}
                                                        className={`text-[10px] py-0 h-4 ${adj.adjustment_type === 'Increase' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' : 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200'}`}
                                                    >
                                                        {adj.adjustment_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-xs">{adj.quantity_before}</TableCell>
                                                <TableCell className="text-right text-xs">{adj.quantity_after}</TableCell>
                                                <TableCell className={`text-right font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </TableCell>
                                                <TableCell className="text-right text-xs">
                                                    <div className="flex items-center justify-end font-medium">
                                                        <NairaSign className="h-3 w-3 mr-0.5" />
                                                        {costImpact.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground font-mono">
                                                        @{adj.cost_price_at_time}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-xs">
                                                    <div className="flex items-center justify-end font-bold text-blue-600">
                                                        <NairaSign className="h-3 w-3 mr-0.5" />
                                                        {sellingImpact.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground font-mono">
                                                        @{adj.selling_price_at_time}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs line-clamp-1 italic text-muted-foreground" title={adj.reason}>
                                                        {adj.reason || "No reason provided"}
                                                    </div>
                                                    <div className="text-[10px] font-medium text-indigo-600">
                                                        By: {adj.user?.name || "System"}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default StockAdjustmentReport;
