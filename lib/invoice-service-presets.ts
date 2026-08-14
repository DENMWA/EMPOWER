export type InvoiceServicePreset = {
  id: string;
  label: string;
  group: "Daily support" | "Health support" | "Capacity building" | "Travel and claims";
  catalogueTerms: string[];
  clinicalContext?: boolean;
};

export const invoiceServicePresets: InvoiceServicePreset[] = [
  preset("personal-care", "Personal care and self-care", "Daily support", ["assistance with self-care activities", "daily personal activities", "personal care"]),
  preset("high-intensity-care", "High-intensity personal activities", "Daily support", ["high intensity daily personal activities", "complex support needs"]),
  preset("community-access", "Community and social participation", "Daily support", ["participation in community social and civic activities", "social and community participation", "community access"]),
  preset("group-activities", "Group and centre-based activities", "Daily support", ["group and centre based activities", "group activities"]),
  preset("shared-living", "Supported independent living and shared support", "Daily support", ["shared living", "supported independent living", "daily life tasks in a group"]),
  preset("household-tasks", "Household tasks and domestic assistance", "Daily support", ["household tasks", "domestic assistance", "cleaning"]),
  preset("meal-nutrition", "Meal preparation and nutrition support", "Daily support", ["meal preparation", "nutrition support", "assistance with daily life"]),

  preset("dysphagia", "Dysphagia-related eating and drinking assistance", "Health support", ["dysphagia", "eating and drinking", "mealtime management", "high intensity daily personal activities"], true),
  preset("continence", "Continence support", "Health support", ["continence", "bowel care", "catheter", "high intensity daily personal activities"], true),
  preset("diabetes", "Diabetes management", "Health support", ["diabetes management", "subcutaneous injections", "high intensity daily personal activities"], true),
  preset("wound-pressure", "Wound and pressure care", "Health support", ["wound care", "pressure care", "community nursing care"], true),
  preset("respiratory", "Respiratory support", "Health support", ["respiratory support", "ventilation", "high intensity daily personal activities"], true),
  preset("seizure", "Seizure monitoring and support", "Health support", ["seizure management", "monitoring", "high intensity daily personal activities"], true),
  preset("medication", "Medication assistance", "Health support", ["medication assistance", "daily personal activities", "community nursing care"], true),
  preset("community-nursing", "Community nursing", "Health support", ["community nursing care", "nursing support"]),

  preset("behaviour", "Behaviour support", "Capacity building", ["specialist positive behaviour support", "behaviour support", "behaviour support plan"]),
  preset("support-coordination", "Support coordination", "Capacity building", ["support coordination", "coordination of supports", "specialist support coordination"]),
  preset("daily-living-skills", "Daily living and independence skills", "Capacity building", ["development of daily living and life skills", "training for independence"]),
  preset("employment-education", "Employment and education support", "Capacity building", ["employment support", "higher education", "school leaver employment supports"]),
  preset("occupational-therapy", "Occupational therapy", "Capacity building", ["occupational therapy", "therapeutic supports"]),
  preset("physiotherapy", "Physiotherapy", "Capacity building", ["physiotherapy", "therapeutic supports"]),
  preset("speech-pathology", "Speech pathology", "Capacity building", ["speech pathology", "therapeutic supports"]),
  preset("psychology", "Psychology", "Capacity building", ["psychology", "therapeutic supports"]),
  preset("reports-assessments", "Reports and assessments", "Capacity building", ["assessment", "report writing", "therapeutic supports"]),

  preset("transport", "Participant transport", "Travel and claims", ["transport", "travel transport arrangements"]),
  preset("provider-travel", "Provider travel and kilometres", "Travel and claims", ["provider travel", "activity based transport", "kilometres"]),
  preset("non-face-to-face", "Non-face-to-face support", "Travel and claims", ["non face to face", "non-face-to-face"]),
  preset("cancellation", "Short-notice cancellation", "Travel and claims", ["short notice cancellation", "cancellation"])
];

export function getInvoiceServicePreset(id: string) {
  return invoiceServicePresets.find((item) => item.id === id);
}

export function inferInvoiceServicePreset(serviceText: string) {
  const service = normalise(serviceText);
  const serviceTokens = new Set(service.split(" ").filter((word) => word.length > 2));
  const ranked = invoiceServicePresets.map((item) => {
    const phrases = [item.label, ...item.catalogueTerms].map(normalise);
    const phraseScore = phrases.reduce((score, phrase) => score + (service.includes(phrase) || phrase.includes(service) ? 8 : 0), 0);
    const tokenScore = phrases.flatMap((phrase) => phrase.split(" ")).filter((word) => word.length > 2 && serviceTokens.has(word)).length;
    return { item, score: phraseScore + tokenScore };
  }).sort((left, right) => right.score - left.score);
  return ranked[0]?.score ? ranked[0].item : invoiceServicePresets[0];
}

function preset(id: string, label: string, group: InvoiceServicePreset["group"], catalogueTerms: string[], clinicalContext = false): InvoiceServicePreset {
  return { id, label, group, catalogueTerms, clinicalContext };
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
