
import { SaleItem } from "@/types/sales";

export interface StoreSettings {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  print_show_logo: boolean;
  print_show_address: boolean;
  print_show_email: boolean;
  print_show_phone: boolean;
  print_show_footer: boolean;
}

export interface PrintReceiptProps {
  items: SaleItem[];
  discount?: number;
  manualDiscount?: number;
  date?: Date;
  cashierName?: string;
  cashierEmail?: string;
  customerName?: string;
  customerPhone?: string;
  businessName?: string;
  businessAddress?: string;
  saleType?: 'retail' | 'wholesale';
  cashierId?: string;
  saleId?: string;
  storeSettings: StoreSettings;
}

export enum PrintError {
  POPUP_BLOCKED = 'POPUP_BLOCKED',
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  PRINT_CANCELLED = 'PRINT_CANCELLED',
  WINDOW_LOAD_FAILED = 'WINDOW_LOAD_FAILED',
  UNKNOWN = 'UNKNOWN',
}

class PrintReceiptError extends Error {
  constructor(public type: PrintError, message: string) {
    super(message);
    this.name = 'PrintReceiptError';
  }
}

// Preload image with timeout
const preloadImage = (url: string, timeout = 3000): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      resolve(null);
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      resolve(url);
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = url;
  });
};

/**
 * Stage 1: Opens a blank window immediately to capture user gesture.
 * MUST be called directly in the onClick handler.
 */
export const openPrintWindow = (): Window | null => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Preparing Receipt...</title>
          <style>
            body { 
              font-family: sans-serif; 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              background: #f8f9fa;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #3498db;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 2s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .text { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <div class="text">Preparing your receipt...</div>
        </body>
      </html>
    `);
  }
  return printWindow;
};

/**
 * Stage 2: Populates the captured window with receipt data and triggers print.
 */
export const printReceipt = async (props: PrintReceiptProps, existingWindow?: Window | null): Promise<boolean> => {
  console.log("Printing receipt via Stage 2 Window", props);

  const printWindow = existingWindow || openPrintWindow();

  if (!printWindow) {
    throw new PrintReceiptError(
      PrintError.POPUP_BLOCKED,
      "Print window was blocked. Please allow popups for this site and try again."
    );
  }

  return new Promise(async (resolve, reject) => {
    // Safety timeout to prevent hanging the whole app if window events fail
    const safetyTimeout = setTimeout(() => {
      console.warn('printReceipt: Safety timeout triggered');
      resolve(true); // Resolve anyway to unblock the UI
    }, 15000); // 15 seconds is plenty for user to see the dialog

    try {
      // Preload logo image if present
      let logoUrl = props.storeSettings.logo_url;
      if (logoUrl && props.storeSettings.print_show_logo) {
        const preloadedLogo = await preloadImage(logoUrl);
        if (!preloadedLogo) {
          console.warn('Logo failed to load, continuing without logo');
          logoUrl = null;
        }
      }

      // Generate receipt HTML content
      const receiptContent = generateReceiptHTML({ ...props, storeSettings: { ...props.storeSettings, logo_url: logoUrl } });

      // Write content to the window
      printWindow.document.open();
      printWindow.document.write(receiptContent);
      printWindow.document.close();

      // Wait for content and trigger print
      const triggerPrint = async () => {
        try {
          console.log('[receiptPrinter] Content loaded, waiting for layout...');

          // Use setTimeout instead of requestAnimationFrame as the latter 
          // can hang if the window/tab is not focused.
          await new Promise(resolve => setTimeout(resolve, 500));

          console.log('[receiptPrinter] Triggering print dialog');

          // 2. Resolve the promise EARLIER if it's a direct print.
          // This allows the parent window's logic (like logPrintAnalytics) to continue 
          // even while the print dialog is still open (which can be blocking).
          const isDirectPrint = true; // For now we assume we want to unblock

          printWindow.focus();

          // In some browsers, print() is blocking. In others it's not.
          // To be safe, we resolve after a tiny delay AFTER focus but likely BEFORE/DURING print.
          setTimeout(() => {
            clearTimeout(safetyTimeout);
            resolve(true);
          }, 100);

          printWindow.print();

          // Also set up the standard events just in case
          printWindow.onafterprint = () => {
            clearTimeout(safetyTimeout);
            resolve(true);
          };

        } catch (err) {
          console.error('[receiptPrinter] triggerPrint Error:', err);
          clearTimeout(safetyTimeout);
          // Don't close window immediately, user might see the error content
          reject(new PrintReceiptError(
            PrintError.UNKNOWN,
            "Failed to trigger print dialog."
          ));
        }
      };

      if (printWindow.document.readyState === 'complete') {
        triggerPrint();
      } else {
        printWindow.onload = triggerPrint;
      }

    } catch (error) {
      clearTimeout(safetyTimeout);
      if (!printWindow.closed) printWindow.close();
      reject(new PrintReceiptError(
        PrintError.UNKNOWN,
        error instanceof Error ? error.message : "An unknown error occurred while printing."
      ));
    }
  });
};

// Helper function to generate receipt HTML
function generateReceiptHTML(props: PrintReceiptProps): string {
  const {
    items,
    discount = 0,
    manualDiscount = 0,
    date = new Date(),
    cashierName,
    customerName,
    customerPhone,
    businessName,
    businessAddress,
    saleType = 'retail',
    storeSettings
  } = props;

  const storeName = storeSettings.name || 'PharmCare Pro';
  const storeAddress = storeSettings.address || '123 Main Street, Lagos';
  const storeEmail = storeSettings.email;
  const storePhone = storeSettings.phone;
  const logo = storeSettings.logo_url;

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const percentDiscountAmount = subtotal * (discount / 100);
  const itemDiscountsAmount = items.reduce((sum, item) =>
    sum + (item.price * item.quantity * ((item.discount || 0) / 100)), 0);

  const totalDiscount = percentDiscountAmount + itemDiscountsAmount + (manualDiscount || 0);
  const total = Math.max(0, subtotal - totalDiscount);

  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Courier New', monospace;
          margin: 0;
          padding: 20px;
          max-width: 300px;
          font-size: 12px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 10px;
        }
        .logo {
          max-width: 150px;
          max-height: 80px;
          margin: 0 auto 10px;
          display: block;
        }
        .business-name {
          font-size: 16px;
          font-weight: bold;
        }
        .info {
          margin-bottom: 10px;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          text-align: left;
          padding: 3px 0;
        }
        .amount {
          text-align: right;
        }
        .total {
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 10px;
        }
        .print-btn {
          display: block;
          width: 100%;
          padding: 10px;
          margin-top: 20px;
          background: #2563eb;
          color: white;
          text-align: center;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        @media print {
          .print-btn { display: none; }
          body {
            margin: 0;
            padding: 10px;
          }
          @page {
            margin: 0;
            size: 80mm 297mm;
          }
        }
      </style>
    </head>
    <body onload="window.focus();">
      <div class="header">
        ${storeSettings.print_show_logo && logo ? `<img src="${logo}" alt="Store Logo" class="logo" />` : ''}
        <div class="business-name">${storeName}</div>
        ${storeSettings.print_show_address && storeAddress ? `<div>${storeAddress}</div>` : ''}
        ${storeSettings.print_show_email && storeEmail ? `<div>${storeEmail}</div>` : ''}
        ${storeSettings.print_show_phone && storePhone ? `<div>${storePhone}</div>` : ''}
        <div>${saleType.toUpperCase()} RECEIPT</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="info">
        <div>Date: ${formattedDate}</div>
        <div>Time: ${formattedTime}</div>
        ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
        ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ''}
        ${businessName ? `<div>Business: ${businessName}</div>` : ''}
        ${businessAddress ? `<div>Address: ${businessAddress}</div>` : ''}
        ${cashierName ? `<div>Dispenser: ${cashierName}</div>` : ''}
      </div>
      
      <div class="divider"></div>
      
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>₦${item.price.toLocaleString()}</td>
              <td class="amount">₦${(item.price * item.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="divider"></div>
      
      <table>
        <tr>
          <td>Subtotal:</td>
          <td class="amount">₦${subtotal.toLocaleString()}</td>
        </tr>
        ${discount > 0 ? `
        <tr>
          <td>Discount (${discount}%):</td>
          <td class="amount">-₦${percentDiscountAmount.toLocaleString()}</td>
        </tr>
        ` : ''}
        ${itemDiscountsAmount > 0 ? `
        <tr>
          <td>Item Discounts:</td>
          <td class="amount">-₦${itemDiscountsAmount.toLocaleString()}</td>
        </tr>
        ` : ''}
        ${manualDiscount && manualDiscount > 0 ? `
        <tr>
          <td>Manual Discount:</td>
          <td class="amount">-₦${manualDiscount.toLocaleString()}</td>
        </tr>
        ` : ''}
        <tr class="total">
          <td>Total:</td>
          <td class="amount">₦${total.toLocaleString()}</td>
        </tr>
      </table>
      
      <div class="divider"></div>
      
      ${storeSettings.print_show_footer ? `
      <div class="footer">
        Thank you for your patronage!<br>
        <strong>POWERED BY T-TECH SOLUTIONS</strong>
      </div>
      ` : ''}
      <button onclick="window.print()" class="print-btn">Print Receipt</button>
    </body>
    </html>
  `;
}
