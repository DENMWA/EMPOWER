export type AccountingProviderName = "xero" | "myob" | "quickbooks" | "custom" | "native";

export type AccountingInvoiceInput = {
  invoiceId: string;
  invoiceNumber: string;
  recipientName: string;
  totalAmount: number;
  lineCount: number;
};

export type AccountingInvoiceResult = {
  ok: boolean;
  externalInvoiceId?: string;
  message: string;
};

export type AccountingPaymentStatus = {
  invoiceId: string;
  status: "unpaid" | "part_paid" | "paid" | "overdue" | "unknown";
  syncedAt: string;
};
