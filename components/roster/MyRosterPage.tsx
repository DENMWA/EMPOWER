"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, List, MapPin, PlayCircle } from "lucide-react";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { getActualShiftHours, getShiftDurationHours, getShiftSignOffStatus, type ShiftSignOffStatus } from "@/lib/roster";
import { getStoredAccessToken } from "@/lib/supabase-rest";
import { cn } from "@/lib/utils";

type Period = "week" | "fortnight" | "month";
type View = "calendar" | "list";
type PersonalShift = { id:string;participantId:string;participantName:string;supportType:string;location:string;shiftDate:string;startTime:string;endTime:string;shiftInstructions:string;staffingRatio:string;status:string;noteRequired:boolean;noteCompleted:boolean;actualStartTime?:string;actualEndTime?:string;shiftSignOffStatus?:ShiftSignOffStatus;shiftSignOffNote?:string };

export function MyRosterPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [view, setView] = useState<View>("calendar");
  const [anchor, setAnchor] = useState(todayKey());
  const [shifts, setShifts] = useState<PersonalShift[]>([]);
  const [signOffNotes, setSignOffNotes] = useState<Record<string, string>>({});
  const [savingShiftId, setSavingShiftId] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"loading"|"ready"|"error">("loading");
  const range = useMemo(() => periodRange(period, anchor), [period, anchor]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) { setState("error"); return; }
    setState("loading");
    fetch(`/api/roster/me?from=${range.from}&to=${range.to}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { shifts?: PersonalShift[] } }))
      .then(({ response, result }) => { if (!response.ok) throw new Error(); setShifts(result.shifts || []); setMessage(""); setState("ready"); })
      .catch(() => { setShifts([]); setState("error"); });
  }, [range.from, range.to]);

  const scheduledHours = shifts.filter((shift) => !["Cancelled", "No Show"].includes(shift.status)).reduce((total, shift) => total + getShiftDurationHours(shift.startTime, shift.endTime), 0);
  const actualHours = shifts.filter((shift) => shift.actualStartTime && shift.actualEndTime).reduce((total, shift) => total + getActualShiftHours(shift), 0);
  const days = dateKeys(range.from, range.to);

  async function signOffShift(shiftId: string, action: "start" | "finish") {
    const token = getStoredAccessToken();
    if (!token) { setMessage("Please sign in again before signing on or off a shift."); return; }
    setSavingShiftId(shiftId);
    setMessage(action === "start" ? "Starting shift..." : "Finishing shift...");
    try {
      const response = await fetch("/api/roster/signoff", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId, action, note: signOffNotes[shiftId] || "" }),
        cache: "no-store"
      });
      const result = await response.json().catch(() => ({})) as { error?: string; shift?: Partial<PersonalShift> };
      if (!response.ok) throw new Error(result.error || "Shift sign-off could not be saved.");
      setShifts((current) => current.map((shift) => shift.id === shiftId ? { ...shift, ...result.shift } : shift));
      setSignOffNotes((current) => ({ ...current, [shiftId]: "" }));
      setMessage(action === "start" ? "Shift started." : "Shift finished and ready for manager review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Shift sign-off could not be saved.");
    } finally {
      setSavingShiftId("");
    }
  }

  return <>
    <PageHeader eyebrow="My schedule" title="My Roster" description="Your assigned shifts, hours and service locations." actions={<StatusBadge label={`${shifts.length} shifts`} tone="blue" />} />
    <Section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 rounded-md bg-slate-100 p-1" aria-label="Roster period">
          <PeriodButton label="Week" active={period === "week"} onClick={() => setPeriod("week")} />
          <PeriodButton label="Fortnight" active={period === "fortnight"} onClick={() => setPeriod("fortnight")} />
          <PeriodButton label="Month" active={period === "month"} onClick={() => setPeriod("month")} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setAnchor(moveAnchor(anchor, period, -1))} className="grid h-10 w-10 place-items-center rounded-md border border-slate-300" aria-label={`Previous ${period}`}><ChevronLeft size={18}/></button>
          <p className="min-w-[190px] text-center text-sm font-semibold text-ink">{range.label}</p>
          <button type="button" onClick={() => setAnchor(moveAnchor(anchor, period, 1))} className="grid h-10 w-10 place-items-center rounded-md border border-slate-300" aria-label={`Next ${period}`}><ChevronRight size={18}/></button>
        </div>
        <div className="grid grid-cols-2 rounded-md border border-slate-300 p-1" aria-label="Roster display">
          <ViewButton label="Calendar" active={view === "calendar"} icon={<CalendarDays size={16}/>} onClick={() => setView("calendar")} />
          <ViewButton label="List" active={view === "list"} icon={<List size={16}/>} onClick={() => setView("list")} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Assigned shifts" value={String(shifts.length)} />
        <Metric label="Scheduled hours" value={`${scheduledHours.toFixed(1)}h`} />
        <Metric label="Actual signed hours" value={`${actualHours.toFixed(1)}h`} />
      </div>
      {message ? <Card className="border-teal-200 bg-teal-50 p-4"><p className="text-sm font-semibold text-teal-950" role="status">{message}</p></Card> : null}

      {state === "loading" ? <Card><p className="text-sm text-slate-600" role="status">Loading your roster...</p></Card> : null}
      {state === "error" ? <Card><p className="font-semibold text-red-700" role="alert">Your roster could not be loaded. Refresh the page or contact your manager.</p></Card> : null}
      {state === "ready" && !shifts.length ? <Card><p className="font-semibold text-ink">No shifts assigned for this period.</p><p className="mt-1 text-sm text-slate-600">Use the arrows to check another period.</p></Card> : null}

      {state === "ready" && shifts.length && view === "calendar" ? <div className={cn("grid gap-3", period === "week" ? "lg:grid-cols-7" : "sm:grid-cols-2 lg:grid-cols-4")}>
        {days.map((day) => <DayCard key={day} date={day} shifts={shifts.filter((shift) => shift.shiftDate === day)} signOffNotes={signOffNotes} savingShiftId={savingShiftId} onNoteChange={(shiftId, note) => setSignOffNotes((current) => ({ ...current, [shiftId]: note }))} onStart={(shiftId) => signOffShift(shiftId, "start")} onFinish={(shiftId) => signOffShift(shiftId, "finish")} />)}
      </div> : null}
      {state === "ready" && shifts.length && view === "list" ? <div className="space-y-3">{shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} showDate signOffNote={signOffNotes[shift.id] || ""} saving={savingShiftId === shift.id} onNoteChange={(note) => setSignOffNotes((current) => ({ ...current, [shift.id]: note }))} onStart={() => signOffShift(shift.id, "start")} onFinish={() => signOffShift(shift.id, "finish")} />)}</div> : null}
    </Section>
  </>;
}

function DayCard({date,shifts,signOffNotes,savingShiftId,onNoteChange,onStart,onFinish}:{date:string;shifts:PersonalShift[];signOffNotes:Record<string,string>;savingShiftId:string;onNoteChange:(shiftId:string,note:string)=>void;onStart:(shiftId:string)=>void;onFinish:(shiftId:string)=>void}) { return <section className="min-h-40 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><p className="font-bold text-ink">{new Date(`${date}T00:00:00`).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"})}</p><div className="mt-3 space-y-2">{shifts.map((shift)=><ShiftCard key={shift.id} shift={shift} signOffNote={signOffNotes[shift.id] || ""} saving={savingShiftId === shift.id} onNoteChange={(note)=>onNoteChange(shift.id,note)} onStart={()=>onStart(shift.id)} onFinish={()=>onFinish(shift.id)}/>)}</div></section>; }
function ShiftCard({shift,showDate=false,signOffNote="",saving=false,onNoteChange,onStart,onFinish}:{shift:PersonalShift;showDate?:boolean;signOffNote?:string;saving?:boolean;onNoteChange:(note:string)=>void;onStart:()=>void;onFinish:()=>void}) { const signOffStatus=getShiftSignOffStatus(shift); const canStart=!["Cancelled","No Show"].includes(shift.status)&&signOffStatus==="Not started"; const canFinish=signOffStatus==="Started"; return <article className="rounded-md border-l-4 border-teal-500 bg-teal-50 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div>{showDate?<p className="text-xs font-bold uppercase text-teal-800">{new Date(`${shift.shiftDate}T00:00:00`).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"})}</p>:null}<p className="mt-1 font-bold text-ink">{shift.startTime} - {shift.endTime}</p><p className="mt-1 text-sm font-semibold text-teal-950">{shift.participantName}</p></div><StatusBadge label={shift.status} tone={statusTone(shift.status)}/></div><p className="mt-2 text-sm text-slate-700">{shift.supportType}</p>{shift.location?<p className="mt-2 flex items-center gap-1 text-xs text-slate-600"><MapPin size={14}/>{shift.location}</p>:null}<p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-700"><Clock3 size={14}/>{getShiftDurationHours(shift.startTime,shift.endTime).toFixed(1)} scheduled hours</p><div className="mt-3 rounded-md border border-teal-200 bg-white/80 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase text-slate-500">Shift sign-off</p><StatusBadge label={signOffStatus} tone={signOffStatus==="Approved"||signOffStatus==="Finished"?"green":signOffStatus==="Started"?"blue":"slate"}/></div>{shift.actualStartTime?<p className="mt-2 text-xs font-semibold text-slate-700">Started {shift.actualStartTime}{shift.actualEndTime?` · Finished ${shift.actualEndTime}`:""}</p>:null}{shift.actualStartTime&&shift.actualEndTime?<p className="mt-1 text-xs font-semibold text-slate-700">Actual hours {getActualShiftHours(shift).toFixed(1)}h</p>:null}{canFinish?<textarea value={signOffNote} onChange={(event)=>onNoteChange(event.target.value)} rows={2} className="mt-3 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-ink outline-none focus:border-teal-500" placeholder="Brief handover or sign-off note" />:null}<div className="mt-3 flex flex-wrap gap-2">{canStart?<button type="button" onClick={onStart} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"><PlayCircle size={16}/>Start shift</button>:null}{canFinish?<button type="button" onClick={onFinish} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"><CheckCircle2 size={16}/>Finish shift</button>:null}{!canStart&&!canFinish?<p className="text-xs text-slate-600">{shift.shiftSignOffNote || "Actual shift record is visible to admin for review."}</p>:null}</div></div></article>; }
function Metric({label,value}:{label:string;value:string}) { return <Card className="p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold text-ink">{value}</p></Card>; }
function PeriodButton({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}) { return <button type="button" aria-pressed={active} onClick={onClick} className={cn("min-h-10 rounded-md px-3 text-sm font-semibold",active?"bg-white text-teal-800 shadow-sm":"text-slate-600")}>{label}</button>; }
function ViewButton({label,active,icon,onClick}:{label:string;active:boolean;icon:React.ReactNode;onClick:()=>void}) { return <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold",active?"bg-ink text-white":"text-slate-600")}>{icon}{label}</button>; }
function periodRange(period:Period,anchor:string){const date=new Date(`${anchor}T00:00:00`);if(period==="month"){const start=new Date(date.getFullYear(),date.getMonth(),1);const end=new Date(date.getFullYear(),date.getMonth()+1,0);return{from:key(start),to:key(end),label:start.toLocaleDateString("en-AU",{month:"long",year:"numeric"})};}const day=date.getDay();date.setDate(date.getDate()+(day===0?-6:1-day));const end=new Date(date);end.setDate(end.getDate()+(period==="fortnight"?13:6));return{from:key(date),to:key(end),label:`${date.toLocaleDateString("en-AU",{day:"numeric",month:"short"})} - ${end.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})}`};}
function moveAnchor(anchor:string,period:Period,direction:number){const date=new Date(`${anchor}T00:00:00`);if(period==="month")date.setMonth(date.getMonth()+direction);else date.setDate(date.getDate()+direction*(period==="fortnight"?14:7));return key(date);}
function dateKeys(from:string,to:string){const values:string[]=[];const date=new Date(`${from}T00:00:00`);const end=new Date(`${to}T00:00:00`);while(date<=end){values.push(key(date));date.setDate(date.getDate()+1);}return values;}
function key(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function todayKey(){return key(new Date());}
function statusTone(status:string):"slate"|"green"|"amber"|"red"|"blue"{if(status==="Cancelled"||status==="No Show")return"red";if(status==="Completed"||status==="Note Completed")return"green";if(status==="Note Required")return"amber";return"blue";}
