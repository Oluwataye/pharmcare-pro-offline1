
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { EditInventoryDialog } from "./EditInventoryDialog";
import { InventoryItem } from "@/hooks/useInventory";
import { StockStatusCell } from "./table/StockStatusCell";
import { ExpiryDateCell } from "./table/ExpiryDateCell";
import { TableActions } from "./table/TableActions";
import { BatchDeleteBar } from "./table/BatchDeleteBar";
import { InventoryTableHead } from "./table/InventoryTableHead";
import { EmptyTableRow } from "./table/EmptyTableRow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { StockAdjustmentDialog } from "./dialog/StockAdjustmentDialog";

interface InventoryTableProps {
  inventory: InventoryItem[];
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, updatedItem: InventoryItem) => void;
  onBatchDelete?: (ids: string[]) => void;
  onAdjustStock?: (id: string, newQuantity: number, reason: string) => void;
}

export const InventoryTable = ({
  inventory,
  onDeleteItem,
  onUpdateItem,
  onBatchDelete,
  onAdjustStock
}: InventoryTableProps) => {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= 0) return { color: "text-red-600" };
    if (item.quantity <= item.reorderLevel) return { color: "text-yellow-600" };
    return { color: "text-green-600" };
  };

  const handleEdit = (itemId: string) => {
    const item = inventory.find(item => item.id === itemId);
    if (item) setEditingItem(item);
  };

  const handleAdjust = (itemId: string) => {
    const item = inventory.find(item => item.id === itemId);
    if (item) setAdjustingItem(item);
  };

  const handleAdjustSave = (id: string, newQuantity: number, reason: string) => {
    if (onAdjustStock) {
      onAdjustStock(id, newQuantity, reason);
    }
    setAdjustingItem(null);
  };

  const handleSave = (updatedItem: InventoryItem) => {
    onUpdateItem(updatedItem.id, updatedItem);
    setEditingItem(null);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(inventory.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const toggleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleBatchDelete = () => {
    if (selectedItems.length > 0 && onBatchDelete) {
      onBatchDelete(selectedItems);
      setSelectedItems([]);
    }
  };

  const colSpan = onBatchDelete ? 11 : 10;

  return (
    <>
      {selectedItems.length > 0 && (
        <BatchDeleteBar
          selectedCount={selectedItems.length}
          onBatchDelete={() => setBatchDeleteConfirm(true)}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <InventoryTableHead
            showBatchActions={!!onBatchDelete}
            hasItems={inventory.length > 0}
            allSelected={inventory.length > 0 && selectedItems.length === inventory.length}
            onSelectAll={toggleSelectAll}
          />
          <TableBody>
            {inventory.length === 0 ? (
              <EmptyTableRow colSpan={colSpan} />
            ) : (
              inventory.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <TableRow key={item.id}>
                    {onBatchDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => toggleSelectItem(item.id, !!checked)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <StockStatusCell item={item} />
                    </TableCell>
                    <TableCell>
                      <ExpiryDateCell expiryDate={item.expiryDate} />
                    </TableCell>
                    <TableCell className={`text-right ${stockStatus.color}`}>
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{(item.cost_price || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium text-green-600">
                          ₦{(item.price - (item.cost_price || 0)).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.price > 0
                            ? Math.round(((item.price - (item.cost_price || 0)) / item.price) * 100)
                            : 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{item.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <TableActions
                        itemId={item.id}
                        onEdit={() => handleEdit(item.id)}
                        onDelete={() => setDeleteConfirmId(item.id)}
                        onAdjust={onAdjustStock ? () => handleAdjust(item.id) : undefined}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {editingItem && (
        <EditInventoryDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          item={editingItem}
          onSave={handleSave}
        />
      )}

      {adjustingItem && (
        <StockAdjustmentDialog
          open={!!adjustingItem}
          onOpenChange={(open) => !open && setAdjustingItem(null)}
          item={adjustingItem}
          onSave={handleAdjustSave}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onDeleteItem(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteConfirm} onOpenChange={setBatchDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Products?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {selectedItems.length} products. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleBatchDelete();
                setBatchDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
