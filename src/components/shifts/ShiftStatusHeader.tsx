import { cn } from "@/lib/utils";
import { memo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useShift } from "@/hooks/useShift";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock, LogIn, Pause, Play } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Wallet, CreditCard, Landmark, ShoppingBag } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const ShiftStatusHeader = memo(() => {
    const { activeShift, startShift, endShift, isLoading, fetchShiftTotals } = useShift();
    const [isOpening, setIsOpening] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isFetchingTotals, setIsFetchingTotals] = useState(false);
    const [cash, setCash] = useState("");
    const [notes, setNotes] = useState("");
    const [expectedSummary, setExpectedSummary] = useState<{ cash: number, pos: number, transfer: number, total: number } | null>(null);

    // Debug log to verify code version and state
    useEffect(() => {
        if (isClosing) {
            console.log('[ShiftStatusHeader] Modal Opened. State:', {
                isFetchingTotals,
                hasSummary: !!expectedSummary,
                expectedSummary
            });
        }
    }, [isClosing, isFetchingTotals, expectedSummary]);

    // Load totals but KEEP previous data if we are just re-fetching (stability)
    useEffect(() => {
        let isMounted = true;
        const loadTotals = async () => {
            if (isClosing && activeShift) {
                // Only show spinner if we don't have data yet to avoid flicker
                if (!expectedSummary) setIsFetchingTotals(true);

                try {
                    const totals = await fetchShiftTotals(activeShift.id);
                    if (isMounted) {
                        setExpectedSummary(totals);
                    }
                } finally {
                    if (isMounted) {
                        setIsFetchingTotals(false);
                    }
                }
            } else if (!isClosing) {
                // Force reset when modal is not closing
                setIsFetchingTotals(false);
            }
        };
        loadTotals();
        return () => { isMounted = false; };
    }, [isClosing, activeShift?.id]); // Removed fetchShiftTotals from deps to avoid re-triggering unnecessarily if it somehow changes

    // Calculate variance
    const expectedCashInDrawer = Number(activeShift?.opening_balance || 0) + (expectedSummary?.cash || 0);
    const variance = (parseFloat(cash) || 0) - expectedCashInDrawer;

    const handleStart = async () => {
        await startShift(parseFloat(cash) || 0);
        setIsOpening(false);
        setCash("");
    };

    const handleEnd = async () => {
        await endShift(parseFloat(cash) || 0, notes);
        setIsClosing(false);
        setCash("");
        setNotes("");
        setExpectedSummary(null);
    };

    if (isLoading) return <div className="h-8 w-24" />; // Placeholder to keep layout stable

    return (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-muted/30 rounded-full border shadow-sm hover:bg-muted/50 transition-none">
            {activeShift ? (
                <>
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider leading-none">
                                Active Duty
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-mono font-bold text-foreground leading-none">
                                    {new Date(activeShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-border mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsClosing(true)}
                        className="h-7 px-3 text-destructive hover:text-white hover:bg-destructive rounded-full text-xs font-bold"
                    >
                        <Lock className="h-3.5 w-3.5 mr-1.5" />
                        End Shift
                    </Button>
                </>
            ) : (
                <>
                    <span className="text-xs text-muted-foreground font-medium pr-1">No active shift detected</span>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setIsOpening(true)}
                        className="h-8 shadow-md rounded-full px-4 bg-primary hover:bg-primary/90 font-bold"
                    >
                        <Play className="h-3.5 w-3.5 mr-2" />
                        Start Shift
                    </Button>
                </>
            )}

            {/* Start Shift Modal */}
            <Dialog open={isOpening} onOpenChange={setIsOpening}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Start Duty Shift</DialogTitle>
                        <DialogDescription>
                            Enter your opening cash balance to begin your work session.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Opening Cash in Drawer (₦)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={cash}
                                onChange={(e) => setCash(e.target.value)}
                                className="text-lg font-mono h-12"
                                autoFocus
                            />
                            <p className="text-xs text-muted-foreground">Record the starting balance in your cash drawer.</p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsOpening(false)} className="flex-1">Cancel</Button>
                        <Button onClick={handleStart} className="flex-1 font-bold">Begin Shift</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* End Shift Modal */}
            <Dialog open={isClosing} onOpenChange={setIsClosing}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <DialogTitle className="text-2xl font-bold text-destructive">Close Duty Shift</DialogTitle>
                        <DialogDescription>
                            Reconcile your cash drawer and end your duty session.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-custom space-y-6">
                        <div className="py-2 space-y-5">
                            <div className="bg-muted/50 p-4 rounded-xl border-2 border-dashed space-y-3 relative h-[210px] overflow-hidden">
                                {isFetchingTotals === true && !expectedSummary && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50 rounded-xl">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="relative">
                                                <Clock className="h-10 w-10 animate-spin text-primary opacity-20" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                                </div>
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary animate-pulse">Calculating Totals</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Wallet className="h-4 w-4" /> Opening Balance:
                                    </span>
                                    <span className="font-mono font-bold text-base">₦{(activeShift?.opening_balance || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <ShoppingBag className="h-4 w-4" /> Shift Cash Sales:
                                    </span>
                                    <span className="text-primary font-mono font-bold text-base">₦{(expectedSummary?.cash || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center opacity-60">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" /> Expected POS:
                                    </span>
                                    <span className="font-mono font-bold">₦{(expectedSummary?.pos || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center opacity-60">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Landmark className="h-4 w-4" /> Expected Transfer:
                                    </span>
                                    <span className="font-mono font-bold">₦{(expectedSummary?.transfer || 0).toLocaleString()}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between text-base font-extrabold bg-primary/10 p-3 rounded-lg border border-primary/20">
                                    <span className="text-primary">Total Cash Expected:</span>
                                    <span className="text-primary font-mono">₦{expectedCashInDrawer.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="actual-cash" className="text-sm font-bold">Actual Cash Counted In Drawer (₦)</Label>
                                <Input
                                    id="actual-cash"
                                    type="number"
                                    placeholder="0.00"
                                    value={cash}
                                    onChange={(e) => setCash(e.target.value)}
                                    disabled={isFetchingTotals && !expectedSummary}
                                    className={cn(
                                        "text-xl font-mono h-14",
                                        !(isFetchingTotals && !expectedSummary) && cash !== "" && Math.abs(variance) > 1000 ? "border-red-500 ring-2 ring-red-500/20" : ""
                                    )}
                                />
                            </div>

                            <div className="h-[95px] overflow-hidden">
                                {!(isFetchingTotals && !expectedSummary) && expectedSummary && cash !== "" && (
                                    <div className={cn(
                                        "p-4 rounded-xl border shadow-sm flex items-start gap-4",
                                        variance === 0 ? "bg-green-50 border-green-200 text-green-900" :
                                            variance > 0 ? "bg-blue-50 border-blue-200 text-blue-900" :
                                                "bg-red-50 border-red-200 text-red-900"
                                    )}>
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                            variance === 0 ? "bg-green-100" : variance > 0 ? "bg-blue-100" : "bg-red-100"
                                        )}>
                                            {variance === 0 ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black uppercase tracking-tight">Variance: ₦{variance.toLocaleString()}</p>
                                            <p className="text-xs font-medium mt-1 leading-tight opacity-80 overflow-hidden text-ellipsis">
                                                {variance === 0 ? "Perfect! Your cash drawer matches exactly." :
                                                    variance > 0 ? "Surplus: You have more cash than expected." :
                                                        "Shortage: Please explain why cash is missing."}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="closure-notes" className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
                                    Optional Notes / Reason for Discrepancy
                                </Label>
                                <Textarea
                                    id="closure-notes"
                                    placeholder="Ex: Kept change in drawer, or reason for cash shortage..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="min-h-[85px] text-sm resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 border-t gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsClosing(false)} className="flex-1">Cancel</Button>
                        <Button variant="destructive" onClick={handleEnd} className="flex-1 font-bold">End Shift & Reconcile</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});
