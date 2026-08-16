import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "EmpowerNotes Australian NDIS documentation software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3faf8", color: "#16252e", padding: "74px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", width: "100%", flexDirection: "column", justifyContent: "space-between", border: "2px solid #b8d9d2", background: "white", padding: "58px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div style={{ display: "flex", width: "72px", height: "72px", alignItems: "center", justifyContent: "center", borderRadius: "12px", background: "#087f73", color: "white", fontSize: "36px", fontWeight: 700 }}>E</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "38px", fontWeight: 700 }}>EmpowerNotes</span>
            <span style={{ marginTop: "7px", color: "#52646e", fontSize: "22px" }}>Australian disability support software</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ maxWidth: "900px", fontSize: "66px", lineHeight: 1.08, fontWeight: 700 }}>Care delivered. Clearly recorded.</span>
          <span style={{ marginTop: "24px", color: "#52646e", fontSize: "27px" }}>Notes / incidents / rosters / invoices</span>
        </div>
      </div>
    </div>,
    size
  );
}
