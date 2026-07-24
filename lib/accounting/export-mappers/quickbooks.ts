import type { AccountingInvoiceInput } from "@/lib/accounting/types";

export function mapNativeInvoiceToQuickBooksExport(input: AccountingInvoiceInput) {
  return {
    source: "EmpowerNotes native invoice",
    provider: "quickbooks",
    configured: false,
    invoiceNumber: input.invoiceNumber,
    message: "QuickBooks export mapping placeholder only. Native invoicing does not require QuickBooks."
  };
}
