import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DiscountSettings } from "@/components/admin/DiscountSettings";
import { DiscountHistory } from "@/components/admin/DiscountHistory";
import { DiscountConfig } from "@/types/sales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreSettings, invalidateStoreSettingsCache } from "@/hooks/useStoreSettings";
import { db } from "@/lib/db-client";
import { useAuth } from "@/contexts/AuthContext";

export const DiscountManagement = () => {
  const { settings, isLoading: settingsLoading } = useStoreSettings();
  const { user } = useAuth();
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (settings) {
      if (settings.discount_config) {
        setDiscountConfig(settings.discount_config);
      } else {
        // Fallback to defaults if no config exists yet
        setDiscountConfig({
          defaultDiscount: 5,
          maxDiscount: 20,
          enabled: true,
          manualAmountEnabled: false
        });
      }
    }
  }, [settings]);

  const handleSaveDiscountConfig = async (config: DiscountConfig) => {
    if (!user || !settings) return;

    try {
      setDiscountConfig(config);

      const { error } = await db
        .from('store_settings')
        .update({
          discount_config: config,
          updated_by: user.id
        })
        .eq('id', settings.id);

      if (error) throw error;

      invalidateStoreSettingsCache();

      toast({
        title: "Success",
        description: "Discount settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save discount settings",
        variant: "destructive",
      });
    }
  };

  if (settingsLoading || !discountConfig) {
    return <div className="p-4 text-center">Loading settings...</div>;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Discount Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">Discount History</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <DiscountSettings
              initialConfig={discountConfig}
              onSave={handleSaveDiscountConfig}
            />
          </TabsContent>

          <TabsContent value="history">
            <DiscountHistory />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
