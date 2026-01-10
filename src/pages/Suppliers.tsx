
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, Building2, Phone, Mail, MapPin } from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { AddSupplierDialog } from "@/components/suppliers/AddSupplierDialog";
import { EditSupplierDialog } from "@/components/suppliers/EditSupplierDialog";
import { DeleteSupplierDialog } from "@/components/suppliers/DeleteSupplierDialog";
import { EnhancedStatCard } from "@/components/admin/EnhancedStatCard";
import { EnhancedCard } from "@/components/ui/EnhancedCard";

const Suppliers = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const { suppliers, isLoading, fetchSuppliers } = useSuppliers();

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const filteredSuppliers = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-4 md:p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary">Supplier Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">Manage your product suppliers and vendors</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search suppliers..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <AddSupplierDialog onSupplierAdded={fetchSuppliers} />
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <EnhancedStatCard
                    title="Total Suppliers"
                    value={suppliers.length.toString()}
                    icon={Building2}
                    trend=""
                    trendUp={true}
                    route="/suppliers"
                    onClick={() => { }}
                    colorScheme="primary"
                    comparisonLabel="Registered vendors"
                />
            </div>

            <EnhancedCard colorScheme="primary">
                <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-lg">Supplier List</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading suppliers...</div>
                    ) : (
                        <div className="responsive-table">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supplier Name</TableHead>
                                        <TableHead>Contact Person</TableHead>
                                        <TableHead>Contact Info</TableHead>
                                        <TableHead className="hidden lg:table-cell">Address</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSuppliers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No suppliers found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSuppliers.map((supplier) => (
                                            <TableRow key={supplier.id} className="hover:bg-muted/50">
                                                <TableCell className="font-semibold">{supplier.name}</TableCell>
                                                <TableCell>{supplier.contact_person || "-"}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {supplier.phone && (
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Phone className="h-3 w-3" /> {supplier.phone}
                                                            </div>
                                                        )}
                                                        {supplier.email && (
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Mail className="h-3 w-3" /> {supplier.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    {supplier.address ? (
                                                        <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-[200px] truncate">
                                                            <MapPin className="h-3 w-3 mt-0.5" /> {supplier.address}
                                                        </div>
                                                    ) : "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <EditSupplierDialog supplier={supplier} onSupplierUpdated={fetchSuppliers} />
                                                        <DeleteSupplierDialog supplier={supplier} onSupplierDeleted={fetchSuppliers} />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </EnhancedCard>
        </div>
    );
};

export default Suppliers;
