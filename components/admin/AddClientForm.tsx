"use client";

import { FilePlus2, Palette, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourOptions } from "@/lib/client-colours";
import { createClientId, saveTenantClient } from "@/lib/client-records";
import { getTenantHouses, saveTenantHouse, type HouseRecord } from "@/lib/house-records";
import { isRealModeEnabled } from "@/lib/presentation-mode";
import { sampleGoals, users } from "@/lib/sample-data";
import { getTenantStaffInvites, type StaffRecord } from "@/lib/staff-records";
import { markTrialStepComplete } from "@/lib/trial-run";
import { cn } from "@/lib/utils";

export function AddClientForm() {
  const colourOptions = getClientColourOptions();
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [ndisNumber, setNdisNumber] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [diagnoses, setDiagnoses] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [behaviourSupportNotes, setBehaviourSupportNotes] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [keyWorkerId, setKeyWorkerId] = useState("");
  const [supportNeeds, setSupportNeeds] = useState("");
  const [communication, setCommunication] = useState("");
  const [riskAlerts, setRiskAlerts] = useState("");
  const [selectedGoals, setSelectedGoals] = useState(sampleGoals.slice(0, 2));
  const [storedStaff, setStoredStaff] = useState<StaffRecord[]>([]);
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [realMode, setRealMode] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);
  const [primaryHouseId, setPrimaryHouseId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [colourSchemeId, setColourSchemeId] = useState(colourOptions[0]?.id ?? "sky");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [pendingClientId, setPendingClientId] = useState("");
  const [message, setMessage] = useState("");
  const allStaff = useMemo(() => storedStaff.length ? storedStaff : realMode ? [] : users, [storedStaff, realMode]);

  useEffect(() => {
    getTenantStaffInvites().then(setStoredStaff).catch(() => setStoredStaff([]));
    getTenantHouses().then(setHouses).catch(() => setHouses([]));
  }, []);

  useEffect(() => {
    function syncDataMode() {
      setRealMode(isRealModeEnabled());
    }

    syncDataMode();
    window.addEventListener("empowernotes:data-mode-updated", syncDataMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncDataMode);
  }, []);

  useEffect(() => {
    if (allStaff.length && !assignedWorkers.some((workerId) => allStaff.some((staff) => staff.id === workerId))) {
      setAssignedWorkers([allStaff[0].id]);
      return;
    }

    if (!allStaff.length && assignedWorkers.length) {
      setAssignedWorkers([]);
    }
  }, [allStaff, assignedWorkers]);

  function toggleGoal(goal: string) {
    setSelectedGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]);
  }

  function toggleWorker(userId: string) {
    setAssignedWorkers((current) => current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]);
  }

  async function saveClient() {
    const cleanName = name.trim();
    if (!cleanName) {
      setSaved(false);
      setMessage("Add the client's full name before saving.");
      return;
    }
    if (!primaryHouseId) {
      setSaved(false);
      setSaveFailed(true);
      setMessage(houses.length ? "Select the client's house or service before saving." : "Add a house or service location before adding this client.");
      return;
    }

    setSaving(true);
    setSaveFailed(false);
    setMessage("Saving client to this organisation...");
    const clientId = pendingClientId || createClientId(cleanName);
    if (!pendingClientId) setPendingClientId(clientId);
    const selectedHouse = houses.find((house) => house.id === primaryHouseId);
    const result = await saveTenantClient({
      primaryHouseId,
      primaryHouseName: selectedHouse?.name,
      serviceName: serviceName.trim(),
      id: clientId,
      name: cleanName,
      ndisNumber: ndisNumber.trim(),
      preferredName: preferredName.trim(),
      dateOfBirth: dateOfBirth || undefined,
      pronouns: pronouns.trim(),
      address: address.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      diagnoses: toLines(diagnoses),
      medicalConditions: toLines(medicalConditions),
      allergies: toLines(allergies),
      medications: toLines(medications),
      behaviourSupportNotes: behaviourSupportNotes.trim(),
      emergencyContacts: emergencyContactName.trim() || emergencyContactPhone.trim() ? [{
        name: emergencyContactName.trim(),
        relationship: emergencyContactRelationship.trim(),
        phone: emergencyContactPhone.trim()
      }] : [],
      keyWorkerId: keyWorkerId || undefined,
      initials: (initials.trim() || cleanName.split(/\s+/).map((part) => part[0]).join("")).slice(0, 4).toUpperCase(),
      supportNeeds: supportNeeds.trim() || "Support needs to be added.",
      communication: communication.trim() || "Communication preferences to be added.",
      goals: selectedGoals,
      riskAlerts: riskAlerts.split("\n").map((item) => item.trim()).filter(Boolean),
      assignedWorkers,
      documents: [],
      colourSchemeId,
      createdAt: new Date().toISOString()
    });

    if (result.error && result.error.includes("allows")) {
      setSaved(false);
      setSaving(false);
      setSaveFailed(true);
      setMessage(result.error);
      return;
    }

    if (!result.savedToCloud) {
      setSaved(false);
      setSaving(false);
      setSaveFailed(true);
      setMessage(`Cloud save failed. The client details remain here for retry. ${result.error || "Try again."}`);
      return;
    }

    const savedClientId = result.clientId || clientId;
    if (selectedHouse && !selectedHouse.clientIds.includes(savedClientId)) {
      const houseResult = await saveTenantHouse({
        ...selectedHouse,
        clientIds: [...selectedHouse.clientIds, savedClientId]
      });
      if (!houseResult.savedToCloud) {
        setSaved(false);
        setSaving(false);
        setSaveFailed(true);
        setMessage(`The client was saved, but the house assignment failed. Retry to complete it. ${houseResult.error || ""}`);
        return;
      }
    }

    setSaved(true);
    setSaving(false);
    setSaveFailed(false);
    setPendingClientId("");
    markTrialStepComplete("add-client");
    setMessage(`${cleanName} saved to this organisation.`);
    setName("");
    setInitials("");
    setNdisNumber("");
    setPreferredName("");
    setDateOfBirth("");
    setPronouns("");
    setAddress("");
    setContactPhone("");
    setContactEmail("");
    setDiagnoses("");
    setMedicalConditions("");
    setAllergies("");
    setMedications("");
    setBehaviourSupportNotes("");
    setEmergencyContactName("");
    setEmergencyContactRelationship("");
    setEmergencyContactPhone("");
    setKeyWorkerId("");
    setSupportNeeds("");
    setCommunication("");
    setRiskAlerts("");
    setServiceName("");
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Client intake</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Add a client profile</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Capture the client details that shape worker notes, roster planning, risk reporting, document evidence, and admin dashboards.</p>
        </div>
        <StatusBadge label={saved ? "Client saved" : "Real client record"} tone={saved ? "green" : "blue"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Client full name
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="e.g. Grace M." value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Initials
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="e.g. GM" maxLength={4} value={initials} onChange={(event) => setInitials(event.target.value.toUpperCase())} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Preferred name
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={preferredName} onChange={(event) => setPreferredName(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Date of birth
          <input type="date" className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Pronouns
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="e.g. she/her" value={pronouns} onChange={(event) => setPronouns(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Participant NDIS number
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={ndisNumber} onChange={(event) => setNdisNumber(event.target.value)} inputMode="numeric" autoComplete="off" />
        </label>
        <div className="rounded-md border border-teal-200 bg-teal-50/60 p-4 lg:col-span-2">
          <h3 className="font-semibold text-ink">House and service assignment</h3>
          <p className="mt-1 text-sm text-slate-600">Required so shift notes, incidents, rostering and reports use the correct service context.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Primary house/service
              <select required className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={primaryHouseId} onChange={(event) => setPrimaryHouseId(event.target.value)}>
                <option value="">Select house or service</option>
                {houses.map((house) => <option key={house.id} value={house.id}>{house.name} - {house.serviceType}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Service name
              <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="e.g. SIL weekday support" value={serviceName} onChange={(event) => setServiceName(event.target.value)} />
            </label>
          </div>
          {!houses.length ? <p className="mt-3 text-sm font-semibold text-amber-800">Create a house or service location in Admin Settings before saving this client.</p> : null}
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Client phone
          <input type="tel" className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Client email
          <input type="email" className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Address
          <textarea className="mt-2 min-h-20 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Support needs
          <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="Daily living, community access, behaviour support, communication support..." value={supportNeeds} onChange={(event) => setSupportNeeds(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Communication preferences
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="Preferred prompts, processing time, consent notes, communication aids..." value={communication} onChange={(event) => setCommunication(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Risk alerts
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="Known triggers, escalation instructions, medication prompts, falls risk..." value={riskAlerts} onChange={(event) => setRiskAlerts(event.target.value)} />
        </label>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-ink">Health and support profile</h3>
        <p className="mt-1 text-sm text-slate-600">Enter one item per line. Record only information relevant to safe service delivery.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <MultiLineField label="Diagnoses" value={diagnoses} onChange={setDiagnoses} placeholder="Known diagnoses" />
          <MultiLineField label="Medical conditions" value={medicalConditions} onChange={setMedicalConditions} placeholder="Diabetes, epilepsy, asthma..." />
          <MultiLineField label="Allergies" value={allergies} onChange={setAllergies} placeholder="Allergen and known response" />
          <MultiLineField label="Medications" value={medications} onChange={setMedications} placeholder="Medication name and relevant support note" />
          <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
            Behaviour support notes
            <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="Known strategies, triggers, regulated practices, and plan references" value={behaviourSupportNotes} onChange={(event) => setBehaviourSupportNotes(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-ink">Emergency contact and key worker</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Emergency contact name
            <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Relationship
            <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={emergencyContactRelationship} onChange={(event) => setEmergencyContactRelationship(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Emergency contact phone
            <input type="tel" className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Designated key worker
            <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={keyWorkerId} onChange={(event) => setKeyWorkerId(event.target.value)}>
              <option value="">No key worker assigned</option>
              {allStaff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name} - {staff.roleLabel}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-700">Assigned goals</p>
          <div className="mt-3 grid gap-3">
            {sampleGoals.slice(0, 5).map((goal) => (
              <label key={goal} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={selectedGoals.includes(goal)} onChange={() => toggleGoal(goal)} />
                <span className="font-medium text-ink">{goal}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700">Assign staff access</p>
          <div className="mt-3 grid gap-3">
            {!allStaff.length ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                Add staff later or return here after creating your first team member.
              </div>
            ) : null}
            {allStaff.map((user) => (
              <label key={user.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={assignedWorkers.includes(user.id)} onChange={() => toggleWorker(user.id)} />
                <span>
                  <span className="block font-semibold text-ink">{user.name}</span>
                  <span className="block text-slate-600">{user.roleLabel}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-teal-700" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-700">Client reporting colour</p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {colourOptions.map((colour) => (
            <label key={colour.id} className={cn("flex items-center gap-3 rounded-md border p-3 text-sm", colour.border, colour.panel)}>
              <input type="radio" name="client-colour" className="h-4 w-4 accent-teal-700" checked={colourSchemeId === colour.id} onChange={() => setColourSchemeId(colour.id)} />
              <span className={cn("h-6 w-6 rounded-md", colour.bar)} />
              <span className={cn("font-semibold", colour.text)}>{colour.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={saveClient} disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
          <Save size={18} aria-hidden="true" />
          {saving ? "Saving..." : saveFailed ? "Retry save" : "Save client"}
        </button>
        <a href="/documents" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-teal-400">
          <FilePlus2 size={18} aria-hidden="true" />
          Add document later
        </a>
      </div>
      {message ? <p aria-live="polite" className={cn("mt-3 rounded-md px-3 py-2 text-sm font-semibold", saved ? "bg-emerald-50 text-emerald-700" : saveFailed ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700")}>{message}</p> : null}
    </Card>
  );
}

function MultiLineField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function toLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}
