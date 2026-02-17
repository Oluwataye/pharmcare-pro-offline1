
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCell as TableCellComponent } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, History, Shield, Power, Play, Pause, WifiOff } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useShift } from "@/hooks/useShift";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ShiftManagement = () => {
    const { isAdmin } = usePermissions();
    const { activeShift, activeStaffShifts, startShift, endShift, adminEndShift, refreshShifts, isLoading } = useShift();
    const { user } = useAuth();
    const { toast } = useToast();

    const [closingShift, setClosingShift] = useState<any>(null);
    const [cash, setCash] = useState("");
    const [openingBalance, setOpeningBalance] = useState("");
    const [isOpeningShift, setIsOpeningShift] = useState(false);

    useEffect(() => {
        refreshShifts();
    }, [refreshShifts]);

    const handleStartShift = async () => {
        await startShift(Number(openingBalance));
        setIsOpeningShift(false);
        setOpeningBalance("");
    };

    const handleEndShift = async () => {
        if (closingShift.user_id === user?.id) {
            await endShift(Number(cash));
        } else if (isAdmin) {
            await adminEndShift(closingShift.id, Number(cash), closingShift.user_id, closingShift.start_time);
        }
        setClosingShift(null);
        setCash("");
    };

    if (!activeShift && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 container">
                <div className="p-8 bg-card rounded-2xl shadow-xl border flex flex-col items-center text-center space-y-4 max-w-md w-full">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold">Shift Not Started</h2>
                    <p className="text-muted-foreground">You must start your duty shift before you can process sales or manage inventory transactions.</p>
                    <Button size="lg" className="w-full font-bold shadow-lg" onClick={() => setIsOpeningShift(true)}>
                        <Play className="mr-2 h-5 w-5" /> Start New Shift
                    </Button>
                </div>

                <Dialog open={isOpeningShift} onOpenChange={setIsOpeningShift}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Start Duty Shift</DialogTitle>
                            <DialogDescription>Record your opening cash balance to begin your session.</DialogDescription>
                        </DialogHeader>
                        <div className="py-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Opening Cash in Drawer (₦)</Label>
                                <Input
                                    type="number"
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    placeholder="0.00"
                                    className="text-lg font-mono"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setIsOpeningShift(false)}>Cancel</Button>
                            <Button className="font-bold flex-1" onClick={handleStartShift}>Open Shift</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    const activeCount = activeStaffShifts.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
                        <History className="h-8 w-8 text-primary" />
                        Shift Management
                    </h1>
                    <p className="text-muted-foreground mt-1">Monitor and coordinate staff duty sessions.</p>
                </div>

                <div className="flex items-center gap-3">
                    {!activeShift ? (
                        <Button
                            variant="default"
                            className="font-bold shadow-md bg-green-600 hover:bg-green-700"
                            onClick={() => setIsOpeningShift(true)}
                        >
                            <Play className="h-4 w-4 mr-2" />
                            Start My Shift
                        </Button>
                    ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1.5 px-4 shadow-sm animate-in fade-in zoom-in duration-300">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                            <span className="font-semibold mr-2">Shift Active:</span>
                            {new Date(activeShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                    )}
                </div>
            </div>

            <Dialog open={isOpeningShift} onOpenChange={setIsOpeningShift}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Start Your Shift</DialogTitle>
                        <DialogDescription>Enter your opening cash balance to proceed with sales activity.</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Opening Cash in Drawer (₦)</Label>
                            <Input
                                type="number"
                                value={openingBalance}
                                onChange={(e) => setOpeningBalance(e.target.value)}
                                placeholder="0.00"
                                className="text-lg font-mono"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsOpeningShift(false)}>Cancel</Button>
                        <Button className="font-bold flex-1" onClick={handleStartShift}>Begin Shift</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Personnel currently on duty</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Power className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">OFFLINE MODE</div>
                        <p className="text-xs text-muted-foreground mt-1">Local database connected</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-md overflow-hidden bg-card">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Live Shift Monitor</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Real-time status of on-duty staff</p>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20">
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Started At</TableHead>
                                <TableHead>Opening Balance</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeStaffShifts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        No active staff shifts found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeStaffShifts.map((s) => (
                                    <TableRow key={s.id} className="hover:bg-muted/10 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-primary">
                                                        U
                                                    </span>
                                                </div>
                                                <span className="font-medium">User ID: {s.user_id.slice(0, 8)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(s.start_time).toLocaleString()}
                                        </TableCell>
                                        <TableCell>₦{Number(s.opening_balance).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => setClosingShift(s)}
                                            >
                                                <Power className="h-4 w-4 mr-1" /> End Shift
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!closingShift} onOpenChange={() => setClosingShift(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Close Shift</DialogTitle>
                        <DialogDescription>Enter the final cash amount counted to reconcile and end the shift.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Actual Cash Counted (₦)</Label>
                            <Input
                                type="number"
                                value={cash}
                                onChange={(e) => setCash(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setClosingShift(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleEndShift}>Reconcile & Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ShiftManagement;
