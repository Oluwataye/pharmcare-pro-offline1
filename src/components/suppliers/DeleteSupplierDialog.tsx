
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
import { useSuppliers } from "@/hooks/useSuppliers";
import { Supplier } from "@/types/supplier";

interface DeleteSupplierDialogProps {
    supplier: Supplier;
    onSupplierDeleted?: () => void;
}

export const DeleteSupplierDialog = ({ supplier, onSupplierDeleted }: DeleteSupplierDialogProps) => {
    const { deleteSupplier } = useSuppliers();

    const handleDelete = async () => {
        const success = await deleteSupplier(supplier.id);
        if (success && onSupplierDeleted) {
            onSupplierDeleted();
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <strong>{supplier.name}</strong>? This action cannot be undone and may fail if there are linked inventory items.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
