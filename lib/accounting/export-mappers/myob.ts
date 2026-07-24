import type { AccountingInvoiceInput } from "@/lib/accounting/types";

export function mapNativeInvoiceToMyobExport(input: AccountingInvoiceInput) {
  return {
    source: "EmpowerNotes native invoice",
    provider: "myob",
    configured: false,
    invoiceNumber: input.invoiceNumber,
    message: "MYOB export mapping placeholder only. Native invoicing does not require MYOB."
  };
}
