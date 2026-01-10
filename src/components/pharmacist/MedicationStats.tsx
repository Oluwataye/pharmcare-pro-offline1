import { TestTube, AlertTriangle, Calendar, LucideIcon } from "lucide-react";
import { EnhancedStatCard } from "@/components/admin/EnhancedStatCard";

interface MedicationStatsProps {
  totalMedications: number;
  lowStockCount: number;
  criticalStockCount: number;
  expiringSoonCount: number;
  refundPendingCount?: number;
  onCardClick?: (route: string) => void;
}

export const MedicationStats = ({
  totalMedications,
  lowStockCount,
  criticalStockCount,
  expiringSoonCount,
  refundPendingCount,
  onCardClick,
}: MedicationStatsProps) => {
  const handleClick = (route: string) => {
    if (onCardClick) {
      onCardClick(route);
    }
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {refundPendingCount !== undefined && (
        <EnhancedStatCard
          title="Refund Requests"
          value={refundPendingCount.toString()}
          icon={Calendar} // Using Calendar as placeholder, or import RefreshCcw
          trend={`${refundPendingCount} pending`}
          trendUp={refundPendingCount === 0}
          route="/receipts"
          onClick={handleClick}
          colorScheme={refundPendingCount > 0 ? "warning" : "primary"}
          comparisonLabel="Pending approval"
        />
      )}
      <EnhancedStatCard
        title="Total Medications"
        value={totalMedications.toString()}
        icon={TestTube}
        trend=""
        trendUp={true}
        route="/inventory"
        onClick={handleClick}
        colorScheme="primary"
        comparisonLabel="Total inventory items"
      />
      <EnhancedStatCard
        title="Low Stock"
        value={lowStockCount.toString()}
        icon={AlertTriangle}
        trend=""
        trendUp={false}
        route="/inventory"
        onClick={handleClick}
        colorScheme="warning"
        comparisonLabel="Need attention soon"
      />
      <EnhancedStatCard
        title="Critical Stock"
        value={criticalStockCount.toString()}
        icon={AlertTriangle}
        trend=""
        trendUp={false}
        route="/inventory"
        onClick={handleClick}
        colorScheme="danger"
        comparisonLabel="Require immediate restock"
      />
      {/* Moved Expiring Soon to be consistent if 5 cards, or just let it flow */}
      <EnhancedStatCard
        title="Expiring Soon"
        value={expiringSoonCount.toString()}
        icon={Calendar}
        trend=""
        trendUp={false}
        route="/inventory"
        onClick={handleClick}
        colorScheme="success"
        comparisonLabel="Within next 30 days"
      />
    </div>
  );
};
