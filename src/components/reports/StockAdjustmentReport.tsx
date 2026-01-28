
import { useState, useEffect } from "react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowUpRight, ArrowDownRight, RefreshCcw, Search, Calendar as CalendarIcon, TrendingDown, TrendingUp, User, Info } from "lucide-react";
import { NairaSign } from "@/components/icons/NairaSign";
import { useStockAdjustments } from "@/hooks/useStockAdjustments";

const StockAdjustmentReport = () => {
    const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState("");

    const { adjustments, isLoading, error } = useStockAdjustments(
        startOfDay(new Date(fromDate)).toISOString(),
        endOfDay(new Date(toDate)).toISOString()
    );

    const filteredData = adjustments.filter(item =>
        (item.inventory?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.inventory?.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.reason && item.reason.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const stats = filteredData.reduce((acc, curr) => {
        const qtyChange = curr.quantity_change;
        const costPrice = curr.cost_price_at_time || 0;
        const sellPrice = curr.unit_price_at_time || 0;

        const costImpact = qtyChange * costPrice;
        const sellImpact = qtyChange * sellPrice;

        acc.totalCostImpact += costImpact;
        acc.totalSellImpact += sellImpact;
        if (qtyChange > 0) acc.increases += 1;
        else acc.decreases += 1;

        return acc;
    }, { totalCostImpact: 0, totalSellImpact: 0, increases: 0, decreases: 0 });

    const getTypeBadge = (type: string, qtyChange: number) => {
        const isPositive = qtyChange > 0;

        switch (type) {
            case 'ADDITION':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> Addition</Badge>;
            case 'ADJUSTMENT':
                return isPositive
                    ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"><RefreshCcw className="h-3 w-3" /> Adjustment (+)</Badge>
                    : <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1"><RefreshCcw className="h-3 w-3" /> Adjustment (-)</Badge>;
            case 'INITIAL':
                return <Badge variant="secondary" className="flex items-center gap-1"><Info className="h-3 w-3" /> Initial</Badge>;
            case 'RETURN':
                return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1"><ArrowDownRight className="h-3 w-3" /> Return</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(amount).replace('NGN', '₦');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-50/50 p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full md:w-auto">
                    <div className="space-y-2">
                        <Label htmlFor="from" className="text-xs font-semibold uppercase tracking-wider text-slate-500">From Date</Label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="from"
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="pl-10 h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-100 transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="to" className="text-xs font-semibold uppercase tracking-wider text-slate-500">To Date</Label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="to"
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="pl-10 h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-100 transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Search Product/Reason</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="search"
                                placeholder="Search inventory or reason..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-100 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Adjustments</p>
                                <h3 className="text-3xl font-bold text-slate-900 mt-1">{filteredData.length}</h3>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl">
                                <RefreshCcw className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 font-medium">
                            <span className="text-blue-600">{stats.increases} Inc</span> / <span className="text-orange-600">{stats.decreases} Dec</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost Impact</p>
                                <h3 className={`text-2xl font-bold mt-1 ${stats.totalCostImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(stats.totalCostImpact)}
                                </h3>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-xl">
                                <TrendingDown className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 italic">Historical cost value diff</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selling Impact</p>
                                <h3 className={`text-2xl font-bold mt-1 ${stats.totalSellImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(stats.totalSellImpact)}
                                </h3>
                            </div>
                            <div className="bg-emerald-50 p-3 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 italic">Potential revenue diff</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-600 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Value Diff</p>
                                <h3 className={`text-2xl font-bold mt-1 ${stats.totalSellImpact - stats.totalCostImpact >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                                    {formatCurrency(stats.totalSellImpact - stats.totalCostImpact)}
                                </h3>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-xl">
                                <NairaSign className="h-6 w-6 text-indigo-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 italic">Profit/Loss potential</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <p className="text-slate-500 font-medium">Fetching adjustment records...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-24">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-slate-300" />
                            </div>
                            <h4 className="text-slate-900 font-semibold">No adjustments found</h4>
                            <p className="text-slate-500 text-sm mt-1">Try adjusting your date range or search criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[150px] text-xs font-bold uppercase text-slate-600">Date & Time</TableHead>
                                        <TableHead className="text-xs font-bold uppercase text-slate-600">Product (SKU)</TableHead>
                                        <TableHead className="text-xs font-bold uppercase text-slate-600">Type</TableHead>
                                        <TableHead className="text-right text-xs font-bold uppercase text-slate-600">Qty Diff</TableHead>
                                        <TableHead className="text-right text-xs font-bold uppercase text-slate-600">Before/After</TableHead>
                                        <TableHead className="text-right text-xs font-bold uppercase text-slate-600">Cost Impact</TableHead>
                                        <TableHead className="text-right text-xs font-bold uppercase text-slate-600">Sell Impact</TableHead>
                                        <TableHead className="text-xs font-bold uppercase text-slate-600">User</TableHead>
                                        <TableHead className="max-w-[200px] text-xs font-bold uppercase text-slate-600">Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.map((record) => {
                                        const qtyDiff = record.quantity_change;
                                        const costImpact = qtyDiff * (record.cost_price_at_time || 0);
                                        const sellImpact = qtyDiff * (record.unit_price_at_time || 0);

                                        return (
                                            <TableRow key={record.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">
                                                    {format(new Date(record.created_at), 'MMM dd, yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 leading-tight">{record.inventory?.name || 'Unknown Product'}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter mt-0.5">{record.inventory?.sku || 'NO-SKU'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getTypeBadge(record.type, qtyDiff)}
                                                </TableCell>
                                                <TableCell className={`text-right font-black ${qtyDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {qtyDiff > 0 ? '+' : ''}{qtyDiff}
                                                </TableCell>
                                                <TableCell className="text-right text-xs font-medium text-slate-500">
                                                    {record.previous_quantity} → {record.new_quantity}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className={`text-sm font-bold ${costImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(costImpact)}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 font-medium">
                                                        @{formatCurrency(record.cost_price_at_time || 0)}/unit
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className={`text-sm font-bold ${sellImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(sellImpact)}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 font-medium">
                                                        @{formatCurrency(record.unit_price_at_time || 0)}/unit
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                                                        <div className="bg-slate-100 p-1 rounded-full"><User className="h-3 w-3 text-slate-500" /></div>
                                                        {record.profiles?.name || 'System'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 max-w-[200px] truncate italic group-hover:whitespace-normal group-hover:overflow-visible transition-all" title={record.reason || ''}>
                                                    {record.reason || '-'}
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
