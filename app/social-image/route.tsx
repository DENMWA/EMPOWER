import { ImageResponse } from "next/og";

export const runtime = "edge";

const sizes = {
  square: { width: 1080, height: 1080 },
  wide: { width: 1200, height: 627 }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "EmpowerNotes").slice(0, 60);
  const line = (searchParams.get("line") || "").slice(0, 140);
  const ratio = searchParams.get("ratio") === "wide" ? "wide" : "square";
  const size = sizes[ratio];
  const isSquare = ratio === "square";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3faf8", color: "#16252e", padding: isSquare ? "64px" : "58px", fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", justifyContent: "space-between", border: "2px solid #b8d9d2", background: "white", padding: isSquare ? "56px" : "50px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div style={{ display: "flex", width: "58px", height: "58px", alignItems: "center", justifyContent: "center", borderRadius: "12px", background: "#087f73", color: "white", fontSize: "30px", fontWeight: 700 }}>E</div>
            <span style={{ fontSize: "28px", fontWeight: 700 }}>EmpowerNotes</span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", background: "#e1f5ee", color: "#085041", fontSize: "20px", fontWeight: 700, padding: "8px 18px", borderRadius: "24px" }}>NDIS software</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ maxWidth: isSquare ? "820px" : "900px", fontSize: isSquare ? "64px" : "58px", lineHeight: 1.1, fontWeight: 700 }}>{title}</span>
            {line ? <span style={{ marginTop: "22px", maxWidth: "820px", color: "#52646e", fontSize: isSquare ? "28px" : "26px", lineHeight: 1.4 }}>{line}</span> : null}
          </div>
          <span style={{ color: "#52646e", fontSize: "22px" }}>empowernotes.org</span>
        </div>
      </div>
    ),
    size
  );
}
