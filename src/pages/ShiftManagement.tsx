
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, History, Shield, Power, Play, Pause, WifiOff, AlertTriangle } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useShift } from "@/hooks/useShift";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ShiftStatusHeader } from "@/components/shifts/ShiftStatusHeader";

const ShiftManagement = () => {
    const { isAdmin } = usePermissions();
    const { activeShift, activeStaffShifts, adminEndShift, refreshShifts, isLoading: isShiftLoading } = useShift();
    const { user } = useAuth();
    const { toast } = useToast();

    const [shifts, setShifts] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [closingShift, setClosingShift] = useState<any>(null);
    const [cash, setCash] = useState("");

    const fetchShiftHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch('/api/shifts/history', {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('offline_token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setShifts(data);
            }
        } catch (error) {
            console.error('Failed to fetch shift history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        refreshShifts();
        fetchShiftHistory();
    }, [refreshShifts, fetchShiftHistory]);

    const handleForceEnd = async () => {
        if (!closingShift) return;
        try {
            await adminEndShift(
                closingShift.id,
                Number(cash),
                closingShift.user_id,
                closingShift.start_time,
                "Administrative force closure"
            );
            setClosingShift(null);
            setCash("");
            fetchShiftHistory();
            refreshShifts();
        } catch (error) {
            console.error("Force end failed", error);
        }
    };

    const activeCount = activeStaffShifts.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Active</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Personnel currently on duty</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Paused Sessions</CardTitle>
                        <Pause className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground mt-1">Staff on break (N/A Offline)</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Power className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">OFFLINE</div>
                        <p className="text-xs text-muted-foreground mt-1">Local database active</p>
                    </CardContent>
                </Card>
            </div>

            {/* Live Monitoring Table (Admins Only View) */}
            <Card className="border-none shadow-md overflow-hidden bg-card">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Live Shift Monitoring
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Manage and coordinate current duty sessions</p>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                                <TableHead className="font-semibold">Staff Member</TableHead>
                                <TableHead className="font-semibold">Started At</TableHead>
                                <TableHead className="font-semibold">Opening Bal.</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeStaffShifts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users className="h-8 w-8 opacity-20" />
                                            No active staff shifts found
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeStaffShifts.map((s) => (
                                    <TableRow key={s.id} className="hover:bg-muted/10 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-primary">
                                                        {s.user_id.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="font-medium">User: {s.user_id.slice(0, 8)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(s.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </TableCell>
                                        <TableCell className="font-mono">₦{Number(s.opening_balance).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            {isAdmin && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-8 shadow-sm"
                                                    onClick={() => setClosingShift(s)}
                                                >
                                                    <Power className="h-4 w-4 mr-1" /> End Shift
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Audit History Table */}
            <Card className="border-none shadow-md bg-card overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <History className="h-5 w-5 text-muted-foreground" />
                        Shift Audit History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/5">
                                <TableHead>Staff</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Expected Cash</TableHead>
                                <TableHead>Actual Counted</TableHead>
                                <TableHead className="text-right">Variance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingHistory ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Loading audit history...
                                    </TableCell>
                                </TableRow>
                            ) : shifts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No shift history records found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                shifts.map((shift) => {
                                    const diff = (shift.actual_cash || 0) - (shift.expected_cash || 0);
                                    return (
                                        <TableRow key={shift.id} className="hover:bg-muted/5">
                                            <TableCell className="font-medium">{shift.staff_name || 'System User'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{new Date(shift.start_time).toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                        {shift.end_time ? new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono">₦{(shift.expected_cash || 0).toLocaleString()}</TableCell>
                                            <TableCell className="font-mono font-bold">₦{(shift.actual_cash || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={diff === 0 ? "outline" : diff > 0 ? "default" : "destructive"} className={cn(
                                                    diff === 0 ? "text-green-600 border-green-200 bg-green-50" : ""
                                                )}>
                                                    {diff > 0 ? "+" : ""}{diff.toLocaleString()}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Force End Dialog */}
            <Dialog open={!!closingShift} onOpenChange={() => setClosingShift(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Force End Shift
                        </DialogTitle>
                        <DialogDescription>
                            Administrative action to finalize this staff member's duty session and reconcile cash drawer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Staff Member:</span>
                                <span className="font-bold">User {closingShift?.user_id.slice(0, 8)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Started At:</span>
                                <span className="font-bold">{closingShift && new Date(closingShift.start_time).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="cash" className="text-sm font-bold">Actual Cash Counted In Drawer (₦)</Label>
                            <Input
                                id="cash"
                                type="number"
                                value={cash}
                                onChange={(e) => setCash(e.target.value)}
                                className="text-lg font-mono h-12"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setClosingShift(null)} className="flex-1">Cancel</Button>
                        <Button variant="destructive" onClick={handleForceEnd} className="flex-1 font-bold shadow-lg">End & Reconcile</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ShiftManagement;
