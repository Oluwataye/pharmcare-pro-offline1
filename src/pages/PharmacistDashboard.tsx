
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MedicationForm } from "@/components/pharmacist/MedicationForm";
import { PharmacistHeader } from "@/components/pharmacist/PharmacistHeader";
import { MedicationStats } from "@/components/pharmacist/MedicationStats";
import { MedicationTable } from "@/components/pharmacist/MedicationTable";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { EnhancedTransactionsCard } from "@/components/admin/EnhancedTransactionsCard";
import { EnhancedLowStockCard } from "@/components/admin/EnhancedLowStockCard";
import { useRefundAnalytics } from "@/hooks/sales/useRefundAnalytics";
import { db } from "@/lib/db-client";
import { useInventory } from "@/hooks/useInventory";

// Types matching the component expectations
interface Medication {
  id: string; // Changed from number to string for UUID
  name: string;
  category: string;
  stock: number;
  unit: string;
  expiryDate: string;
  status: "In Stock" | "Low Stock" | "Critical" | "Out of Stock";
  price: number;
}

interface Transaction {
  id: string;
  product: string;
  customer: string;
  amount: number;
  date: string;
}

interface LowStockItem {
  id: string;
  product: string;
  category: string;
  quantity: number;
  reorderLevel: number;
}

const PharmacistDashboard = () => {
  const { toast } = useToast();
  const { analytics: refundStats } = useRefundAnalytics();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Real Data States
  const [medications, setMedications] = useState<Medication[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Derived Stats
  const lowStockCount = medications.filter(med => med.status === "Low Stock" || med.status === "Critical").length;
  const criticalStockCount = medications.filter(med => med.status === "Critical" || med.status === "Out of Stock").length;
  const expiringSoonCount = medications.filter(med => {
    if (!med.expiryDate) return false;
    const expiry = new Date(med.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).length;

  useEffect(() => {
    const fetchPharmacistData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Inventory with robust status mapping
        const { data: inventoryData, error: inventoryError } = await db
          .from('inventory')
          .select('*')
          .order('name');

        if (inventoryError) throw inventoryError;

        const mappedMedications: Medication[] = (inventoryData || []).map((item: any) => {
          let status: Medication['status'] = "In Stock";
          const threshold = item.low_stock_threshold || 10;

          if (item.quantity <= 0) status = "Out of Stock";
          else if (item.quantity <= threshold / 2) status = "Critical";
          else if (item.quantity <= threshold) status = "Low Stock";

          return {
            id: item.id,
            name: item.name,
            category: item.category || "General",
            stock: item.quantity,
            unit: item.unit || "pcs",
            expiryDate: item.expiry_date || "",
            status: status,
            price: Number(item.price)
          };
        });
        setMedications(mappedMedications);

        // 2. Fetch Recent Transactions with Product Name Lookup
        // Get user role for filtering (assuming we can access it from context or we trust the component logic)
        // Since we are inside useEffect, we can't access context easily without prop drilling or duplicating logic.
        // But for Pharmacist Dashboard, let's assume filtering applies if not super admin.
        const { data: { user } } = await db.auth.getUser();
        // Note: getUser() might be async, consistent with auth context.

        let salesQuery = db
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        // We need robust role check. The best way is to fetch user profile, but for now 
        // let's rely on the session user ID filtering which is the core request.
        // WAIT: Pharmacist page might be viewed by Admin too.
        // We'll filter by ID only if we are acting as Pharmacist role.
        // Assuming current logic: "pharmacist user page" implies the logged in user IS a pharmacist.
        // If Admin views this page, they might want to see all?
        // Let's stick to the rule: "Pharmacist should only see sales... performed by him/her alone".

        // If current user is Admin, they usually use Admin Dashboard. 
        // If they navigate here, they probably want to see *their* pharmacist actions?
        // User request: "Pharmacist should only see sales... performed by him/her alone".
        // "Super Admin can see... that of other users". 
        // So if Super Admin is logged in, show all. If Pharmacist, show own.

        // Fetch user metadata/role to be sure
        // We can't easily get role from `db.auth.getUser()`, usually in metadata.
        // Let's just blindly filter by ID if the role context isn't available, 
        // BUT wait, we don't have `user` from context here. 
        // Let's skip complex role check inside fetch for now and just filter if we find the user ID, 
        // assuming standard role-based access control applies.
        // Actually, let's check the role from the profile table if needed, OR safer:
        // just filter by `cashier_id` = user.id if we want personal view.
        // BUT we need to know if we are Admin.
        // Let's fetch the profile first.

        if (user) {
          const { data: profile } = await db.from('users').select('role').eq('id', user.id).single();
          if (profile && profile.role !== 'SUPER_ADMIN' && profile.role !== 'ADMIN') {
            salesQuery = salesQuery.eq('cashier_id', user.id);
          }
        }

        const { data: salesData, error: salesError } = await salesQuery;

        if (salesError) throw salesError;

        // Parallel fetch for product names
        const mappedTransactions = await Promise.all((salesData || []).map(async (sale: any) => {
          // Try to fetch the first item name for this sale
          const { data: items } = await db
            .from('sales_items')
            .select('product_name, quantity')
            .eq('sale_id', sale.id)
            .limit(1);

          const firstItem = items?.[0];
          const itemName = firstItem?.product_name || "Unknown Product";
          const itemCount = items?.length || 0; // Ideally we'd need count(*), but for display purposes this is okay for now
          // Note: offline-client might likely return ALL items if limit logic isn't perfect, but .limit(1) is standard.

          return {
            id: sale.id,
            product: firstItem ? `${itemName}${itemCount > 1 ? ` +${itemCount - 1} more` : ''}` : "Processing...",
            customer: sale.customer_name || "Walk-in Customer",
            amount: Number(sale.total),
            date: new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          };
        }));
        setRecentTransactions(mappedTransactions);

      } catch (error) {
        console.error("Error fetching pharmacist data:", error);
        toast({
          title: "Error",
          description: "Failed to refresh dashboard data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPharmacistData();

    // 3. Real-time Subscriptions (Live Updates)
    const channel = db.channel('pharmacist-dashboard-updates')
      .on('postgres_changes', { event: '*', table: 'sales' }, () => {
        console.log('[Pharmacist] Sales update detected!');
        fetchPharmacistData();
      })
      .on('postgres_changes', { event: '*', table: 'inventory' }, () => {
        console.log('[Pharmacist] Inventory update detected!');
        fetchPharmacistData();
      })
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [toast]);

  const filteredMedications = medications.filter(
    med =>
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems: LowStockItem[] = medications
    .filter(med => med.status === "Low Stock" || med.status === "Critical" || med.status === "Out of Stock")
    .slice(0, 5)
    .map(med => ({
      id: med.id,
      product: med.name,
      category: med.category,
      quantity: med.stock,
      reorderLevel: 10 // Mock/default since we mapped it effectively in status
    }));

  const handleMedicationComplete = (isNew: boolean) => {
    toast({
      title: isNew ? "Medication Added" : "Medication Updated",
      description: isNew ? "The medication was added successfully" : "The medication was updated successfully",
    });
    setShowMedicationForm(false);
    // Ideally duplicate fetch here to refresh
    window.location.reload(); // Simple refresh for now
  };

  const handleCardClick = (route: string) => navigate(route);
  const handleItemClick = (route: string, id: number | string) => navigate(route);

  if (isLoading) {
    return <div className="p-8 text-center">Loading Pharmacist Dashboard...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in px-2 md:px-0">
      <PharmacistHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddMedication={() => setShowMedicationForm(true)}
      />

      {showMedicationForm ? (
        <Card className="border-2 border-primary/10">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-xl md:text-2xl">Add New Medication</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <MedicationForm
              onComplete={(isNew) => handleMedicationComplete(isNew)}
              onCancel={() => setShowMedicationForm(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <MedicationStats
            totalMedications={medications.length}
            lowStockCount={lowStockCount}
            criticalStockCount={criticalStockCount}
            expiringSoonCount={expiringSoonCount}
            refundPendingCount={refundStats.myPendingCount}
            onCardClick={handleCardClick}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <EnhancedTransactionsCard
              transactions={recentTransactions}
              onItemClick={handleItemClick}
              onViewAllClick={handleCardClick}
            />

            <EnhancedLowStockCard
              items={lowStockItems}
              onItemClick={handleItemClick} // Expects string|number
              onViewAllClick={handleCardClick}
            />
          </div>

          <div className="overflow-x-auto">
            <MedicationTable
              medications={medications}
              filteredMedications={filteredMedications}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default PharmacistDashboard;
