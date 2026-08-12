import { getCurrentUserId,supabaseRequest } from "@/lib/supabase-rest";

export type DocumentExpiryNotification = { id:string; documentId:string; participantId:string; reminderStage:"30_days"|"14_days"|"expired"|"overdue"; expiryDate:string; title:string; message:string; emailSentAt:string; acknowledgedAt:string; createdAt:string };
type Row = { id:string; document_id:string; participant_id:string; reminder_stage:DocumentExpiryNotification["reminderStage"]; expiry_date:string; title:string; message:string; email_sent_at:string|null; acknowledged_at:string|null; created_at:string };

export async function getDocumentExpiryNotifications() {
  const result=await supabaseRequest<Row[]>("document_expiry_notifications",{query:"select=id,document_id,participant_id,reminder_stage,expiry_date,title,message,email_sent_at,acknowledged_at,created_at&order=created_at.desc"});
  return (result.data||[]).map((row):DocumentExpiryNotification=>({id:row.id,documentId:row.document_id,participantId:row.participant_id,reminderStage:row.reminder_stage,expiryDate:row.expiry_date,title:row.title,message:row.message,emailSentAt:row.email_sent_at||"",acknowledgedAt:row.acknowledged_at||"",createdAt:row.created_at}));
}

export async function acknowledgeDocumentExpiryNotification(id:string) {
  const result=await supabaseRequest<Array<{id:string}>>("document_expiry_notifications",{method:"PATCH",query:`id=eq.${encodeURIComponent(id)}&select=id`,prefer:"return=representation",body:{acknowledged_at:new Date().toISOString(),acknowledged_by:getCurrentUserId()}});
  return {saved:Boolean(result.data?.length&&!result.error),error:result.error||""};
}
