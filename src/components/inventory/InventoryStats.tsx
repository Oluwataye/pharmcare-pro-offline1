import { Package, PackageOpen, TrendingUp } from "lucide-react";
import { EnhancedStatCard } from "@/components/admin/EnhancedStatCard";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  reorderLevel: number;
}

interface InventoryStatsProps {
  inventory: InventoryItem[];
}

export const InventoryStats = ({ inventory }: InventoryStatsProps) => {
  const lowStockCount = inventory.filter(
    (item) => item.quantity <= item.reorderLevel
  ).length;

  const totalValue = inventory.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const handleCardClick = (route: string) => {
    // Navigate logic or just do nothing if only for stats
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      <EnhancedStatCard
        title="Total Products"
        value={inventory.length.toString()}
        icon={Package}
        trend=""
        trendUp={true}
        route="/inventory"
        onClick={handleCardClick}
        colorScheme="primary"
        comparisonLabel="Total items"
      />
      <EnhancedStatCard
        title="Low Stock"
        value={lowStockCount.toString()}
        icon={PackageOpen}
        trend=""
        trendUp={false}
        route="/inventory"
        onClick={handleCardClick}
        colorScheme="warning"
        comparisonLabel="Action needed"
      />
      <EnhancedStatCard
        title="Total Cost"
        value={`₦${inventory.reduce((acc, item) => acc + (item.cost_price || 0) * item.quantity, 0).toLocaleString()}`}
        icon={TrendingUp} // Use a relevant icon
        trend=""
        trendUp={true}
        route="/inventory"
        onClick={handleCardClick}
        colorScheme="primary" // Different shade maybe?
        comparisonLabel="Inventory cost"
      />
      <EnhancedStatCard
        title="Est. Profit"
        value={`₦${(totalValue - inventory.reduce((acc, item) => acc + (item.cost_price || 0) * item.quantity, 0)).toLocaleString()}`}
        icon={TrendingUp}
        trend=""
        trendUp={true}
        route="/inventory"
        onClick={handleCardClick}
        colorScheme="success"
        comparisonLabel="Potential margin"
      />
      <EnhancedStatCard
        title="Retail Value"
        value={`₦${totalValue.toLocaleString()}`}
        icon={Package}
        trend=""
        trendUp={true}
        route="/inventory"
        onClick={handleCardClick}
        colorScheme="primary"
        comparisonLabel="Sales value"
      />
    </div>
  );
};
