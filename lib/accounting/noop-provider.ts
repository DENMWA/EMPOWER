import type { AccountingIntegrationProvider } from "@/lib/accounting/integration-provider";

export const nativeAccountingProvider: AccountingIntegrationProvider = {
  name: "native",
  async createInvoice() {
    return {
      ok: true,
      message: "Native EmpowerNotes invoicing is active. Accounting sync is not configured."
    };
  },
  async syncPaymentStatus(invoiceId) {
    return {
      invoiceId,
      status: "unknown",
      syncedAt: new Date().toISOString()
    };
  }
};
