import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserX, UserCheck } from "lucide-react";
import { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db-client";

interface DeactivateUserDialogProps {
  user: User & { is_active?: boolean };
  onUserDeactivated: (userId: string, isActive: boolean) => void;
}

export function DeactivateUserDialog({ user, onUserDeactivated }: DeactivateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const isActive = user.is_active !== false; // default to active if undefined
  const action = isActive ? "deactivate" : "activate";

  const handleToggle = async () => {
    setIsProcessing(true);

    try {
      const functionName = isActive ? "deactivate-user" : "activate-user";
      const { error } = await db.functions.invoke(functionName, {
        body: { userId: user.id },
      });

      if (error) throw new Error(error.message || `Failed to ${action} user`);

      onUserDeactivated(user.id, !isActive);
      toast({
        title: isActive ? "User Deactivated" : "User Activated",
        description: isActive
          ? `${user.name}'s account has been deactivated. Their data is preserved.`
          : `${user.name}'s account has been reactivated.`,
      });
      setOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${action} user. Please try again.`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isActive ? (
          <Button
            variant="ghost"
            size="sm"
            title="Deactivate User"
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <UserX className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            title="Activate User"
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <UserCheck className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isActive ? "Deactivate User" : "Reactivate User"}</DialogTitle>
          <DialogDescription>
            {isActive ? (
              <>
                Deactivating <strong>{user.name}</strong> will block them from logging in.
                All their sales records and data will be preserved and can be reactivated at any time.
              </>
            ) : (
              <>
                Reactivating <strong>{user.name}</strong> will restore their access to the system.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={isActive ? "destructive" : "default"}
            onClick={handleToggle}
            disabled={isProcessing}
          >
            {isProcessing
              ? isActive ? "Deactivating..." : "Activating..."
              : isActive ? "Deactivate User" : "Reactivate User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
