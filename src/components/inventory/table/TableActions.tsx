
import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash, ClipboardCheck } from "lucide-react";

interface TableActionsProps {
  itemId: string;
  onEdit: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onAdjust?: (itemId: string) => void;
  canManage?: boolean;
}

export const TableActions = ({ itemId, onEdit, onDelete, onAdjust, canManage = true }: TableActionsProps) => {
  if (!canManage) {
    return (
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground italic px-2">View only</span>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      {onAdjust && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onAdjust(itemId)}
          title="Adjust Stock"
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <ClipboardCheck className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(itemId)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(itemId)}
        className="text-destructive hover:text-destructive"
      >
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  );
};
