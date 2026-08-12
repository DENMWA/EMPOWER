import { HandoverWorkspace } from "@/components/handover/HandoverWorkspace";
import { PageHeader, Section, StatusBadge } from "@/components/ui";
export default function HandoverPage(){return <><PageHeader eyebrow="Shift continuity" title="Handover" description="Important updates from the last 24 hours." actions={<StatusBadge label="House scoped" tone="green"/>}/><Section><HandoverWorkspace/></Section></>;}
