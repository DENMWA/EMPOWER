"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { getStoredAccessToken } from "@/lib/supabase-rest";
import { getTenantHouses, type HouseRecord } from "@/lib/house-records";

export const activeHouseScopeEvent = "empowernotes:house-scope-updated";

export function HouseScopeSelector() {
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [activeHouseIds, setActiveHouseIds] = useState<string[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    Promise.all([
      getTenantHouses(),
      fetch("/api/access/context", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).then((response) => response.json())
    ]).then(([allHouses, context]: [HouseRecord[], { activeHouseIds?: string[] }]) => {
      setHouses(allHouses);
      setActiveHouseIds(context.activeHouseIds || []);
    }).catch(() => { setHouses([]); setActiveHouseIds([]); });
  }, []);

  const available = houses.filter((house) => activeHouseIds.includes(house.id));
  if (available.length < 2) return null;

  function switchHouse(houseId: string) {
    setSelected(houseId);
    window.sessionStorage.setItem("empowernotes:active-house-scope", houseId);
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.includes(":participant-search") || key.includes(":selected-participant") || key.includes(":house-query")) window.sessionStorage.removeItem(key);
    }
    window.dispatchEvent(new CustomEvent(activeHouseScopeEvent, { detail: { houseId } }));
  }

  return (
    <label className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
      <Building2 size={17} aria-hidden="true" />
      <span className="sr-only">House scope</span>
      <select value={selected} onChange={(event) => switchHouse(event.target.value)} className="bg-transparent pr-2 outline-none">
        <option value="">All my houses</option>
        {available.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}
      </select>
    </label>
  );
}
