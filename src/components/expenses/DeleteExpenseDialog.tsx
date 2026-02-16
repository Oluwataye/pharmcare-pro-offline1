
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useExpenses, Expense } from "@/hooks/useExpenses";

interface DeleteExpenseDialogProps {
    expense: Expense;
    onExpenseDeleted?: () => void;
}

export const DeleteExpenseDialog = ({ expense, onExpenseDeleted }: DeleteExpenseDialogProps) => {
    const { deleteExpense, isDeleting } = useExpenses();

    const handleDelete = () => {
        deleteExpense(expense.id, {
            onSuccess: () => {
                if (onExpenseDeleted) onExpenseDeleted();
            }
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will permanently delete the expense record for
                        <span className="font-semibold text-foreground mx-1">
                            {expense.category} (₦{expense.amount.toLocaleString()})
                        </span>
                        from {new Date(expense.date).toLocaleDateString()}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? "Deleting..." : "Delete Expense"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
