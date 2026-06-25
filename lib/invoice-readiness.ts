import { checkInvoiceReadiness, generateInvoiceSummary } from "@/lib/ai-mock";

export function getInvoiceReadinessDemo() {
  return checkInvoiceReadiness(68, false, false, true);
}

export function getInvoiceSummaryDemo() {
  return generateInvoiceSummary();
}
