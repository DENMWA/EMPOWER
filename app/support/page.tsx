import { PageHeader, Section } from "@/components/ui";
import { SupportIssueForm } from "@/components/support/SupportIssueForm";

export default function SupportPage() {
  return <><PageHeader eyebrow="Support" title="Report an issue" description="Tell us what stopped working." /><Section><SupportIssueForm /></Section></>;
}
