// Payment reconciliation logic
// sovittu_hinta = agreed price (stored as `hinta` in DB)
// maksettu_summa = total amount paid so far

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'incomplete';

export function calculatePaymentStatus(
  sovittuHinta: number,
  maksettuSumma: number,
  hasRequiredFields: boolean = true
): PaymentStatus {
  if (!hasRequiredFields) return 'incomplete';
  if (maksettuSumma >= sovittuHinta && sovittuHinta > 0) return 'paid';
  if (maksettuSumma > 0 && maksettuSumma < sovittuHinta) return 'partial';
  if (maksettuSumma === 0) return 'unpaid';
  return 'incomplete';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'paid': return '#22c55e';       // green
    case 'unpaid': return '#3b82f6';     // blue (invoiced)
    case 'partial':
    case 'incomplete':
    case 'failed': return '#ef4444';     // red
    default: return '#6b7280';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'paid': return 'Paid';
    case 'unpaid': return 'Invoiced';
    case 'partial': return 'Partial';
    case 'incomplete':
    case 'failed': return 'Incomplete';
    default: return status;
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-700';
    case 'unpaid': return 'bg-blue-100 text-blue-700';
    case 'partial':
    case 'incomplete':
    case 'failed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

// Check if order has all required fields
export function hasRequiredOrderFields(order: {
  nimi?: string;
  osoite?: string;
  kaupunginosa?: string;
  kaupunki?: string;
  puhelin?: string;
  aika?: string;
  hinta?: number;
}): boolean {
  return !!(
    order.nimi &&
    order.osoite &&
    order.kaupunginosa &&
    order.kaupunki &&
    order.puhelin &&
    order.aika &&
    order.hinta && order.hinta > 0
  );
}
