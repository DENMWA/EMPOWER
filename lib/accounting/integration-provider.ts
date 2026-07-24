import type { AccountingInvoiceInput, AccountingInvoiceResult, AccountingPaymentStatus, AccountingProviderName } from "@/lib/accounting/types";

export interface AccountingIntegrationProvider {
  name: AccountingProviderName;
  createInvoice(input: AccountingInvoiceInput): Promise<AccountingInvoiceResult>;
  syncPaymentStatus?(invoiceId: string): Promise<AccountingPaymentStatus>;
}
