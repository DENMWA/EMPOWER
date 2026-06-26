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

export function getClientColourScheme(clientId: string) {
  return clientColourSchemes[clientId] ?? clientColourSchemes.default;
}

export function getClientColourOptions() {
  return Object.values(clientColourSchemes).filter((scheme) => scheme.id !== "default");
}
