import type { AccountingInvoiceInput } from "@/lib/accounting/types";

export function mapNativeInvoiceToXeroExport(input: AccountingInvoiceInput) {
  return {
    source: "EmpowerNotes native invoice",
    provider: "xero",
    configured: false,
    invoiceNumber: input.invoiceNumber,
    message: "Xero export mapping placeholder only. Native invoicing does not require Xero."
  };
}
