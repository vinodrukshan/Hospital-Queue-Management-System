import { QueueEntry } from '../types/database';

export const hardwareService = {
  /**
   * Listens for keyboard-wedge barcode scanner inputs.
   * Barcode scanners typically send characters in rapid succession (< 50ms interval) terminated by 'Enter'.
   */
  attachScannerListener(onScan: (scannedText: string) => void): () => void {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea unless it is marked data-scanner-target
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Scanners send keys with very low latency (< 60ms between chars)
      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          onScan(buffer.trim());
          buffer = '';
        }
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > 100 && !isInput) {
          // Reset buffer if delay too long and not already typing
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Generates printable thermal token receipt HTML and opens standard browser print dialog
   */
  printTokenReceipt(token: QueueEntry, clinicName?: string, patientName?: string): void {
    const printWindow = window.open('', '_blank', 'width=380,height=550');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups to print queue tokens.');
      return;
    }

    const dateFormatted = new Date(token.checked_in_at || Date.now()).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date(token.checked_in_at || Date.now()).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Token Receipt - ${token.token_number}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            width: 72mm;
            margin: 0 auto;
            text-align: center;
            color: #000;
          }
          .hospital-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .hospital-sub {
            font-size: 11px;
            color: #555;
            margin-bottom: 12px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .token-title {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .token-number {
            font-size: 42px;
            font-weight: 900;
            line-height: 1.1;
            margin: 6px 0;
          }
          .clinic-name {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin: 3px 0;
            text-align: left;
          }
          .instructions {
            font-size: 11px;
            margin: 12px 0 6px 0;
            line-height: 1.3;
          }
          .barcode-mock {
            font-family: monospace;
            font-size: 24px;
            letter-spacing: 4px;
            margin-top: 8px;
          }
          .footer {
            font-size: 10px;
            color: #666;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="hospital-name">IDH / NIID Hospital</div>
        <div class="hospital-sub">National Institute of Infectious Diseases</div>
        <div class="divider"></div>
        <div class="token-title">Queue Priority Token</div>
        <div class="token-number">${token.token_number}</div>
        <div class="clinic-name">${clinicName || 'General Outpatient Clinic'}</div>
        <div>Room / Counter: ${token.counter_or_room || 'Room 101'}</div>
        <div class="divider"></div>
        <div class="details-row"><span>Date:</span> <span>${dateFormatted}</span></div>
        <div class="details-row"><span>Issued Time:</span> <span>${timeFormatted}</span></div>
        <div class="details-row"><span>Priority:</span> <span style="text-transform: capitalize; font-weight: bold;">${token.priority}</span></div>
        ${patientName ? `<div class="details-row"><span>Patient:</span> <span>${patientName}</span></div>` : ''}
        <div class="divider"></div>
        <div class="instructions">
          Please wait in the clinic waiting area until your number is announced on the digital display board.
        </div>
        <div class="barcode-mock">||| | |||| ||| |||</div>
        <div class="footer">Project G05 • Hospital Queue Management System</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 800);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  },
};
