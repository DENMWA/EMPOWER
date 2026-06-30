export type ClientColourScheme = {
  id: string;
  label: string;
  avatar: string;
  border: string;
  panel: string;
  badge: string;
  bar: string;
  text: string;
};

const clientColourSchemes: Record<string, ClientColourScheme> = {
  sky: {
    id: "sky",
    label: "Sky",
    avatar: "bg-sky-100 text-sky-900",
    border: "border-sky-300",
    panel: "bg-sky-50",
    badge: "bg-sky-100 text-sky-800",
    bar: "bg-sky-500",
    text: "text-sky-900"
  },
  teal: {
    id: "teal",
    label: "Teal",
    avatar: "bg-teal-100 text-teal-900",
    border: "border-teal-300",
    panel: "bg-teal-50",
    badge: "bg-teal-100 text-teal-800",
    bar: "bg-teal-600",
    text: "text-teal-900"
  },
  indigo: {
    id: "indigo",
    label: "Indigo",
    avatar: "bg-indigo-100 text-indigo-900",
    border: "border-indigo-300",
    panel: "bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-800",
    bar: "bg-indigo-500",
    text: "text-indigo-900"
  },
  rose: {
    id: "rose",
    label: "Rose",
    avatar: "bg-rose-100 text-rose-900",
    border: "border-rose-300",
    panel: "bg-rose-50",
    badge: "bg-rose-100 text-rose-800",
    bar: "bg-rose-500",
    text: "text-rose-900"
  },
  amber: {
    id: "amber",
    label: "Amber",
    avatar: "bg-amber-100 text-amber-900",
    border: "border-amber-300",
    panel: "bg-amber-50",
    badge: "bg-amber-100 text-amber-900",
    bar: "bg-amber-500",
    text: "text-amber-900"
  },
  emerald: {
    id: "emerald",
    label: "Emerald",
    avatar: "bg-emerald-100 text-emerald-900",
    border: "border-emerald-300",
    panel: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-900",
    bar: "bg-emerald-500",
    text: "text-emerald-900"
  },
  violet: {
    id: "violet",
    label: "Violet",
    avatar: "bg-violet-100 text-violet-900",
    border: "border-violet-300",
    panel: "bg-violet-50",
    badge: "bg-violet-100 text-violet-900",
    bar: "bg-violet-500",
    text: "text-violet-900"
  },
  "amelia-r": {
    id: "amelia-r",
    label: "Sky",
    avatar: "bg-sky-100 text-sky-900",
    border: "border-sky-300",
    panel: "bg-sky-50",
    badge: "bg-sky-100 text-sky-800",
    bar: "bg-sky-500",
    text: "text-sky-900"
  },
  "joseph-k": {
    id: "joseph-k",
    label: "Teal",
    avatar: "bg-teal-100 text-teal-900",
    border: "border-teal-300",
    panel: "bg-teal-50",
    badge: "bg-teal-100 text-teal-800",
    bar: "bg-teal-600",
    text: "text-teal-900"
  },
  "daniel-m": {
    id: "daniel-m",
    label: "Indigo",
    avatar: "bg-indigo-100 text-indigo-900",
    border: "border-indigo-300",
    panel: "bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-800",
    bar: "bg-indigo-500",
    text: "text-indigo-900"
  },
  "sarah-t": {
    id: "sarah-t",
    label: "Rose",
    avatar: "bg-rose-100 text-rose-900",
    border: "border-rose-300",
    panel: "bg-rose-50",
    badge: "bg-rose-100 text-rose-800",
    bar: "bg-rose-500",
    text: "text-rose-900"
  },
  default: {
    id: "default",
    label: "Slate",
    avatar: "bg-slate-100 text-slate-800",
    border: "border-slate-300",
    panel: "bg-slate-50",
    badge: "bg-slate-100 text-slate-700",
    bar: "bg-slate-500",
    text: "text-slate-800"
  }
};

const selectableColourIds = ["sky", "teal", "indigo", "rose", "amber", "emerald", "violet"];

function getStableColourId(clientId: string) {
  const index = [...clientId].reduce((total, char) => total + char.charCodeAt(0), 0) % selectableColourIds.length;
  return selectableColourIds[index];
}

export function getClientColourScheme(clientId: string, colourSchemeId?: string) {
  if (colourSchemeId && clientColourSchemes[colourSchemeId]) return clientColourSchemes[colourSchemeId];
  if (clientColourSchemes[clientId]) return clientColourSchemes[clientId];
  return clientColourSchemes[getStableColourId(clientId)] ?? clientColourSchemes.default;
}

export function getClientColourOptions() {
  return selectableColourIds.map((id) => clientColourSchemes[id]);
}
