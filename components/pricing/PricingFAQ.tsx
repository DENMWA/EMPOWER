import { Card } from "@/components/ui";

const faqs = [
  ["Does EmpowerNotes replace professional judgement?", "No. EmpowerNotes assists with quality, wording, prompts, and evidence organisation only."],
  ["Is payment processing live?", "No. Stripe checkout is intentionally left as a production integration point."],
  ["Can workers see billing?", "No. Billing display is restricted to owner, admin, and service manager roles."],
  ["Are documents public?", "No. Production storage should use private buckets and server-side processing only."]
];

export function PricingFAQ() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {faqs.map(([question, answer]) => (
        <Card key={question}>
          <h3 className="font-semibold text-ink">{question}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{answer}</p>
        </Card>
      ))}
    </div>
  );
}
