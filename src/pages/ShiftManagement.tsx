
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

    if (!isAdmin && !activeShift) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Clock className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Shift Not Started</h2>
                <p className="text-muted-foreground">You must start your shift to begin processing sales.</p>
                <Button onClick={() => setIsOpeningShift(true)}>Start New Shift</Button>

                <Dialog open={isOpeningShift} onOpenChange={setIsOpeningShift}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Start New Shift</DialogTitle>
                            <DialogDescription>Enter your opening cash balance to begin.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Opening Balance (₦)</Label>
                                <Input
                                    type="number"
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpeningShift(false)}>Cancel</Button>
                            <Button onClick={handleStartShift}>Open Shift</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    const activeCount = activeStaffShifts.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <History className="h-6 w-6 text-primary" />
                    Shift Management
                </h1>
                {activeShift && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1 px-3">
                        <Clock className="h-4 w-4 mr-2" />
                        Shift Active: {new Date(activeShift.start_time).toLocaleTimeString()}
                    </Badge>
                )}
            </div>

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
