import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineData } from "@/hooks/useOfflineData";
import { InventoryItem } from "@/types/inventory";
import { validateInventoryItem, saveInventoryToLocalStorage } from "@/utils/inventoryUtils";
import { useInventoryCore } from "@/hooks/inventory/useInventoryCore";
import { db } from "@/lib/db-client";

export const useInventoryCRUD = () => {
  const { inventory, setInventory } = useInventoryCore();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const { createOfflineItem, updateOfflineItem, deleteOfflineItem } = useOfflineData();

  const addItem = async (newItem: Omit<InventoryItem, "id" | "lastUpdatedBy" | "lastUpdatedAt">) => {
    try {
      // Validate the item before adding
      const validation = validateInventoryItem(newItem);
      if (!validation.valid) {
        toast({
          title: "Validation Error",
          description: validation.message,
          variant: "destructive",
        });
        return;
      }

      // If online, save to Local DB
      if (isOnline && user) {
        // Use a transaction if possible, but for simplicity here we do sequential
        const { data, error } = await db
          .from('inventory')
          .insert({
            name: newItem.name,
            sku: newItem.sku,
            category: newItem.category,
            quantity: newItem.quantity,
            unit: newItem.unit,
            price: newItem.price,
            reorder_level: newItem.reorderLevel,
            expiry_date: newItem.expiryDate || null,
            manufacturer: newItem.manufacturer || null,
            batch_number: newItem.batchNumber || null,
            last_updated_by: user.id,
            user_id: user.id,
            cost_price: (newItem as any).cost_price || 0,
            supplier_id: (newItem as any).supplier_id || null,
            restock_invoice_number: (newItem as any).restock_invoice_number || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Log Initial Stock Movement
        await db.from('stock_movements').insert({
          product_id: data.id,
          quantity_change: data.quantity,
          previous_quantity: 0,
          new_quantity: data.quantity,
          type: 'INITIAL',
          reason: 'Initial stock entry',
          created_by: user.id,
          batch_number: data.batch_number,
          cost_price_at_time: Number(data.cost_price),
          unit_price_at_time: Number(data.price)
        });

        // Convert database format to app format
        const item: InventoryItem = {
          id: data.id,
          name: data.name,
          sku: data.sku,
          category: data.category,
          quantity: data.quantity,
          unit: data.unit,
          price: Number(data.price),
          reorderLevel: data.reorder_level,
          expiryDate: data.expiry_date || undefined,
          manufacturer: data.manufacturer || undefined,
          batchNumber: data.batch_number || undefined,
          lastUpdatedBy: user.username || user.name,
          lastUpdatedAt: data.last_updated_at,
          cost_price: Number(data.cost_price),
          supplier_id: data.supplier_id || undefined,
          restock_invoice_number: data.restock_invoice_number || undefined,
        };

        const updatedInventory = [...inventory, item];
        setInventory(updatedInventory);
        saveInventoryToLocalStorage(updatedInventory);
      } else {
        // Offline mode - use local storage
        const item = {
          ...newItem,
          id: Math.random().toString(36).substr(2, 9),
          lastUpdatedBy: user ? user.username || user.name : 'Unknown',
          lastUpdatedAt: new Date().toISOString(),
          user_id: user ? user.id : undefined,
        };

        createOfflineItem('inventory', item);

        const updatedInventory = [...inventory, item];
        setInventory(updatedInventory);
        saveInventoryToLocalStorage(updatedInventory);
      }

      toast({
        title: "Success",
        description: isOnline
          ? "Product added successfully"
          : "Product added successfully (offline mode)",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add product",
        variant: "destructive",
      });
    }
  };

  const updateItem = async (id: string, updatedItem: InventoryItem) => {
    try {
      // Validate the item before updating
      const validation = validateInventoryItem(updatedItem);
      if (!validation.valid) {
        toast({
          title: "Validation Error",
          description: validation.message,
          variant: "destructive",
        });
        return;
      }

      // If online, update in Local DB
      if (isOnline && user) {
        const { error } = await db
          .from('inventory')
          .update({
            name: updatedItem.name,
            sku: updatedItem.sku,
            category: updatedItem.category,
            quantity: updatedItem.quantity,
            unit: updatedItem.unit,
            price: updatedItem.price,
            reorder_level: updatedItem.reorderLevel,
            expiry_date: updatedItem.expiryDate || null,
            manufacturer: updatedItem.manufacturer || null,
            batch_number: updatedItem.batchNumber || null,
            last_updated_by: user.id,
            user_id: user.id,
            cost_price: updatedItem.cost_price || 0,
            supplier_id: updatedItem.supplier_id || null,
            restock_invoice_number: updatedItem.restock_invoice_number || null,
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Offline mode
        updateOfflineItem('inventory', id, updatedItem);
      }

      const newInventory = inventory.map(item =>
        item.id === id ? {
          ...updatedItem,
          lastUpdatedBy: user ? user.username || user.name : 'Unknown',
          lastUpdatedAt: new Date().toISOString(),
          user_id: user ? user.id : undefined,
        } : item
      );

      setInventory(newInventory);
      saveInventoryToLocalStorage(newInventory);

      toast({
        title: "Success",
        description: isOnline
          ? "Product updated successfully"
          : "Product updated successfully (offline mode)",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      // If online, delete from Local DB
      if (isOnline) {
        const { error } = await db
          .from('inventory')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        // Offline mode
        deleteOfflineItem('inventory', id);
      }

      const newInventory = inventory.filter((item) => item.id !== id);
      setInventory(newInventory);
      saveInventoryToLocalStorage(newInventory);

      toast({
        title: "Success",
        description: isOnline
          ? "Product deleted successfully"
          : "Product deleted successfully (offline mode)",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const batchDelete = async (ids: string[]) => {
    try {
      // If online, delete from Local DB
      if (isOnline) {
        const { error } = await db
          .from('inventory')
          .delete()
          .in('id', ids);

        if (error) throw error;
      } else {
        // Offline mode
        ids.forEach(id => deleteOfflineItem('inventory', id));
      }

      const newInventory = inventory.filter((item) => !ids.includes(item.id));
      setInventory(newInventory);
      saveInventoryToLocalStorage(newInventory);

      toast({
        title: "Success",
        description: isOnline
          ? `${ids.length} products deleted successfully`
          : `${ids.length} products deleted successfully (offline mode)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete products",
        variant: "destructive",
      });
    }
  };

  const adjustStock = async (id: string, newQuantity: number, reason: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    try {
      // 1. Record the movement in the standardized stock_movements table if online
      if (isOnline && user) {
        const { error: movementError } = await db
          .from('stock_movements')
          .insert({
            product_id: id,
            quantity_change: newQuantity - item.quantity,
            previous_quantity: item.quantity,
            new_quantity: newQuantity,
            type: 'ADJUSTMENT',
            reason: reason,
            created_by: user.id,
            cost_price_at_time: item.cost_price || 0,
            unit_price_at_time: item.price,
            batch_number: item.batchNumber
          });

        if (movementError) {
          console.error("Failed to log stock movement:", movementError);
        }
      }

      // 2. Perform the actual stock update
      await updateItem(id, { ...item, quantity: newQuantity });
    } catch (error) {
      console.error("Error during stock adjustment:", error);
      toast({
        title: "Adjustment Error",
        description: "Failed to record or update stock adjustment.",
        variant: "destructive",
      });
    }
  };

  return {
    addItem,
    updateItem,
    deleteItem,
    batchDelete,
    adjustStock,
  };
};
