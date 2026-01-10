
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit } from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Supplier } from "@/types/supplier";

interface EditSupplierDialogProps {
    supplier: Supplier;
    onSupplierUpdated?: () => void;
}

export const EditSupplierDialog = ({ supplier, onSupplierUpdated }: EditSupplierDialogProps) => {
    const [open, setOpen] = useState(false);
    const { updateSupplier } = useSuppliers();
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<Supplier>>({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
    });

    useEffect(() => {
        if (open) {
            setFormData({
                name: supplier.name,
                contact_person: supplier.contact_person || "",
                phone: supplier.phone || "",
                email: supplier.email || "",
                address: supplier.address || "",
                notes: supplier.notes || "",
            });
        }
    }, [open, supplier]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast({
                title: "Name is required",
                variant: "destructive",
            });
            return;
        }

        const success = await updateSupplier(supplier.id, formData);
        if (success) {
            setOpen(false);
            if (onSupplierUpdated) onSupplierUpdated();
        }
    };

    return (
        <>
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
                <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Supplier</DialogTitle>
                        <DialogDescription>
                            Update the details of the supplier.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Supplier Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. PharmaCorp Ltd."
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-contact">Contact Person</Label>
                                <Input
                                    id="edit-contact"
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Phone Number</Label>
                                <Input
                                    id="edit-phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+234..."
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email Address</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="supplier@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-address">Address</Label>
                            <Input
                                id="edit-address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Physical address"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Textarea
                                id="edit-notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional information..."
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Update Supplier</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};
