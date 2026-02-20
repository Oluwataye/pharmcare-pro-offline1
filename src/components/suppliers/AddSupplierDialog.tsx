
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AddSupplierForm } from "./AddSupplierForm";

interface AddSupplierDialogProps {
    onSupplierAdded?: () => void;
}

export const AddSupplierDialog = ({ onSupplierAdded }: AddSupplierDialogProps) => {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Add Supplier
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add New Supplier</DialogTitle>
                    <DialogDescription>
                        Enter the details of the new supplier.
                    </DialogDescription>
                </DialogHeader>
                <AddSupplierForm
                    onSuccess={() => {
                        setOpen(false);
                        if (onSupplierAdded) onSupplierAdded();
                    }}
                    onCancel={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
};
