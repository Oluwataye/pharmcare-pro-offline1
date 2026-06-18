import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal, Trash2, X, User, FileText } from 'lucide-react';
import ProductSearchSection from '@/components/sales/ProductSearchSection';
import { useDispensaryQueue } from '../hooks/useDispensaryQueue';
import { DispensaryQueueItem } from '../types/dispensary';
import { DispensaryQueueSlip } from './DispensaryQueueSlip';
import { useToast } from '@/hooks/use-toast';

interface DispensaryFormProps {
  onCancel: () => void;
}

export const DispensaryForm = ({ onCancel }: DispensaryFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createQueueEntry, isSubmitting, error } = useDispensaryQueue();

  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DispensaryQueueItem[]>([]);
  const [createdEntry, setCreatedEntry] = useState<any | null>(null);
  const [showSlip, setShowSlip] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleAddProduct = (product: any, quantity: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku || '',
          quantity,
          price: product.price,
          unit: product.unit,
        },
      ];
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateQty = (id: string, qty: number) => {
    if (qty <= 0) return handleRemoveItem(id);
    setItems(prev => prev.map(i => (i.id === id ? { ...i, quantity: qty } : i)));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast({ title: 'No items', description: 'Add at least one product.', variant: 'destructive' });
      return;
    }
    const entry = await createQueueEntry({
      patient_name: patientName.trim() || undefined,
      items,
      subtotal,
      notes: notes.trim() || undefined,
    });

    if (entry) {
      setCreatedEntry(entry);
      setShowSlip(true);
      toast({
        title: `Queue Ticket Created`,
        description: `Ticket ${entry.queue_number} sent to Cashier queue.`,
      });
    } else {
      toast({ title: 'Error', description: error || 'Failed to create ticket', variant: 'destructive' });
    }
  };

  if (showSlip && createdEntry) {
    return (
      <div className="space-y-4">
        <DispensaryQueueSlip entry={createdEntry} />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => {
            setItems([]);
            setPatientName('');
            setNotes('');
            setCreatedEntry(null);
            setShowSlip(false);
          }}>
            New Ticket
          </Button>
          <Button onClick={onCancel}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Patient Information (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="patient-name">Patient Name</Label>
            <Input
              id="patient-name"
              placeholder="Enter patient name..."
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="disp-notes">Notes / Prescriptions</Label>
            <Textarea
              id="disp-notes"
              placeholder="Doctor's notes, allergies, special instructions..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Medications / Products</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductSearchSection
            onAddProduct={handleAddProduct}
            isWholesale={false}
          />
        </CardContent>
      </Card>

      {/* Items List */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Dispensing List
              </span>
              <Badge variant="secondary">{items.length} item{items.length > 1 ? 's' : ''}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.sku} • ₦{item.price.toLocaleString()} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => handleUpdateQty(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <span className="text-sm font-semibold w-24 text-right">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-3 border-t font-semibold">
                <span>Subtotal</span>
                <span className="text-lg text-primary">₦{subtotal.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || items.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <SendHorizonal className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Sending...' : 'Send to Cashier Queue'}
        </Button>
      </div>
    </div>
  );
};
