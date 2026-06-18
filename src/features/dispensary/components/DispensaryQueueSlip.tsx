import { Button } from '@/components/ui/button';
import { Printer, Ticket } from 'lucide-react';
import { DispensaryQueueEntry } from '../types/dispensary';

interface DispensaryQueueSlipProps {
  entry: DispensaryQueueEntry;
}

export const DispensaryQueueSlip = ({ entry }: DispensaryQueueSlipProps) => {
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;

    const itemRows = entry.items
      .map(
        item => `
      <tr>
        <td style="padding:4px 8px;">${item.name}</td>
        <td style="padding:4px 8px;text-align:center;">${item.quantity} ${item.unit || ''}</td>
        <td style="padding:4px 8px;text-align:right;">₦${(item.price * item.quantity).toLocaleString()}</td>
      </tr>`
      )
      .join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Queue Slip — ${entry.queue_number}</title>
        <style>
          body { font-family: monospace; font-size: 13px; margin: 0; padding: 20px; }
          h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
          .ticket { text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px;
                    border: 3px dashed #333; padding: 12px; margin: 12px 0; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th { background: #eee; text-align: left; padding: 4px 8px; }
          td { border-top: 1px solid #ddd; }
          .total { font-weight: bold; font-size: 15px; text-align: right; padding: 8px; border-top: 2px solid #333; }
          .meta { font-size: 11px; color: #555; margin-top: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>PharmCare Pro</h1>
        <p class="meta" style="text-align:center;">Dispensary Queue Slip</p>
        <div class="ticket">${entry.queue_number}</div>
        ${entry.patient_name ? `<p><strong>Patient:</strong> ${entry.patient_name}</p>` : ''}
        ${entry.notes ? `<p><strong>Notes:</strong> ${entry.notes}</p>` : ''}
        <p class="meta">Prepared by: ${entry.dispenser_name}</p>
        <p class="meta">Time: ${new Date(entry.created_at).toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div class="total">Subtotal: ₦${entry.subtotal.toLocaleString()}</div>
        <p class="meta" style="text-align:center;margin-top:16px;">
          Please proceed to the cashier with this slip.
        </p>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 bg-primary/5 space-y-4">
      <div className="text-center space-y-1">
        <div className="flex justify-center">
          <Ticket className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-widest text-primary">
          {entry.queue_number}
        </h2>
        <p className="text-sm text-muted-foreground">Queue Ticket Created Successfully</p>
      </div>

      {entry.patient_name && (
        <div className="text-sm">
          <span className="font-medium">Patient: </span>{entry.patient_name}
        </div>
      )}

      <div className="border rounded-lg divide-y bg-background">
        <div className="px-3 py-2 font-medium text-sm bg-muted/50">Items</div>
        {entry.items.map(item => (
          <div key={item.id} className="flex justify-between px-3 py-2 text-sm">
            <span>{item.name} × {item.quantity}</span>
            <span className="text-muted-foreground">₦{(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between px-3 py-2 font-semibold text-sm">
          <span>Subtotal</span>
          <span>₦{entry.subtotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Prepared by: <span className="font-medium">{entry.dispenser_name}</span></p>
        <p>Time: {new Date(entry.created_at).toLocaleString()}</p>
      </div>

      <Button onClick={handlePrint} className="w-full" variant="outline">
        <Printer className="mr-2 h-4 w-4" />
        Print Queue Slip
      </Button>
    </div>
  );
};
