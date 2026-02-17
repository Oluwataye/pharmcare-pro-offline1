
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet, History, ArrowDownLeft, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";

export default function CreditManagement() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [repayAmount, setRepayAmount] = useState("");
    const [repayNote, setRepayNote] = useState("");

    // Fetch Customers with outstanding balance
    const { data: debtors, isLoading } = useQuery({
        queryKey: ['debtors'],
        queryFn: async () => {
            const { data, error } = await db
                .from('customers')
                .select('*')
                .gt('credit_balance', 0)
                .order('credit_balance', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    // Fetch Ledger for selected customer
    const { data: ledger, isLoading: isLoadingLedger } = useQuery({
        queryKey: ['customer_ledger', selectedCustomer?.id],
        queryFn: async () => {
            if (!selectedCustomer?.id) return [];
            const { data, error } = await db
                .from('customer_transactions')
                .select('*')
                .eq('customer_id', selectedCustomer.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!selectedCustomer?.id && isHistoryModalOpen
    });

    // Repayment Mutation
    const repayMutation = useMutation({
        mutationFn: async (values: { customerId: string, amount: number, note: string }) => {
            // 1. Get current balance
            const { data: cust, error: fetchErr } = await db.from('customers').select('*').eq('id', values.customerId).single();
            if (fetchErr) throw fetchErr;

            const currentBalance = Number(cust?.credit_balance) || 0;
            const newBalance = currentBalance - values.amount;

            // 2. Insert Credited Transaction
            const { data: transaction, error: ledgerError } = await db
                .from('customer_transactions')
                .insert({
                    customer_id: values.customerId,
                    type: 'CREDIT',
                    amount: values.amount,
                    description: values.note || 'Debt Repayment',
                    balance_before: currentBalance,
                    balance_after: newBalance,
                    created_by: user?.id
                });

            if (ledgerError) throw ledgerError;

            // 3. Update Customer Balance (In offline mode, we need to update the customer record too)
            const { error: updateErr } = await db.from('customers').update({
                credit_balance: newBalance
            }).eq('id', values.customerId);

            if (updateErr) throw updateErr;

            return transaction;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['debtors'] });
            queryClient.invalidateQueries({ queryKey: ['customer_ledger'] });
            setIsRepayModalOpen(false);
            setSelectedCustomer(null);
            setRepayAmount("");
            setRepayNote("");
            toast({ title: "Success", description: "Payment recorded successfully" });
        },
        onError: (error: any) => {
            console.error(error);
            toast({ title: "Error", description: error.message || "Failed to record payment", variant: "destructive" });
        }
    });

    const handleRepaySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || !repayAmount) return;
        repayMutation.mutate({
            customerId: selectedCustomer.id,
            amount: parseFloat(repayAmount),
            note: repayNote
        });
    };

    const filteredDebtors = debtors?.filter((d: any) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone?.includes(searchTerm)
    );

    const totalOutstanding = debtors?.reduce((sum: number, d: any) => sum + Number(d.credit_balance), 0) || 0;

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-primary">
                        <Wallet className="h-8 w-8 text-blue-600" />
                        Credit Management
                    </h1>
                    <p className="text-muted-foreground">Manage customer debts and outstanding balances</p>
                </div>
                <Card className="w-full md:w-[300px] border-l-4 border-red-500 shadow-md">
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Outstanding</div>
                        <div className="text-2xl font-bold text-red-600">₦{totalOutstanding.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center space-x-2 bg-card p-2 rounded-lg border shadow-sm max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                    className="border-none shadow-none focus-visible:ring-0"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <Card className="shadow-lg border-none">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg">Debtors List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20">
                                <TableHead>Customer</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Outstanding Balance</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Spinner className="mx-auto" /></TableCell></TableRow>
                            ) : filteredDebtors?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No outstanding debts found.</TableCell></TableRow>
                            ) : (
                                filteredDebtors?.map((customer: any) => (
                                    <TableRow key={customer.id} className="hover:bg-muted/5 transition-colors">
                                        <TableCell className="font-semibold">{customer.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{customer.phone || 'N/A'}</TableCell>
                                        <TableCell className="font-bold text-red-600">₦{Number(customer.credit_balance).toLocaleString()}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{customer.updated_at ? format(new Date(customer.updated_at), 'MMM dd, yyyy') : '-'}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                onClick={() => {
                                                    setSelectedCustomer(customer);
                                                    setIsHistoryModalOpen(true);
                                                }}
                                            >
                                                <History className="h-4 w-4 mr-1" />
                                                History
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 shadow-sm"
                                                onClick={() => {
                                                    setSelectedCustomer(customer);
                                                    setIsRepayModalOpen(true);
                                                }}
                                            >
                                                <ArrowDownLeft className="h-4 w-4 mr-1" />
                                                Repay
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Repayment Modal */}
            <Dialog open={isRepayModalOpen} onOpenChange={setIsRepayModalOpen}>
                <DialogContent>
                    <CardHeader className="p-0 mb-4">
                        <DialogTitle className="text-xl">Record Payment for {selectedCustomer?.name}</DialogTitle>
                    </CardHeader>
                    <form onSubmit={handleRepaySubmit} className="space-y-6">
                        <div className="p-4 bg-muted/30 rounded-lg border flex justify-between items-center">
                            <Label className="text-muted-foreground">Current Balance</Label>
                            <div className="text-2xl font-bold text-red-600">
                                ₦{Number(selectedCustomer?.credit_balance || 0).toLocaleString()}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount" className="font-semibold">Amount to Repay (₦)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={selectedCustomer?.credit_balance}
                                required
                                value={repayAmount}
                                onChange={(e) => setRepayAmount(e.target.value)}
                                className="h-12 text-lg font-bold text-green-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="note" className="text-sm font-medium">Note / Reference</Label>
                            <Input
                                id="note"
                                placeholder="e.g. Cash payment, Bank Transfer Ref"
                                value={repayNote}
                                onChange={(e) => setRepayNote(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsRepayModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="flex-1 bg-primary" disabled={repayMutation.isPending}>
                                {repayMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* History Modal */}
            <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
                        <DialogTitle className="text-xl mr-4 text-primary">Transaction History - {selectedCustomer?.name}</DialogTitle>
                        <Badge variant="outline" className="font-mono">ID: {selectedCustomer?.id?.substring(0, 8)}</Badge>
                    </CardHeader>
                    <div className="flex-1 overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Balance After</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingLedger ? (
                                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Spinner className="mx-auto" /></TableCell></TableRow>
                                ) : ledger?.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No transactions found.</TableCell></TableRow>
                                ) : ledger?.map((tx: any) => (
                                    <TableRow key={tx.id} className="hover:bg-muted/5">
                                        <TableCell className="text-xs">{format(new Date(tx.created_at), 'MMM dd, HH:mm')}</TableCell>
                                        <TableCell>
                                            {tx.type === 'DEBIT' ? (
                                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px] uppercase font-bold tracking-tighter">Sale (Credit)</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] uppercase font-bold tracking-tighter">Payment</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{tx.description}</TableCell>
                                        <TableCell className={`text-right font-bold ${tx.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                                            {tx.type === 'DEBIT' ? '+' : '-'}₦{Number(tx.amount).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">₦{Number(tx.balance_after).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
