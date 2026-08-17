// figma node: 227:2365 Tile
export function Tile(_p = {}) {
  const props = _p;
  return (
    <div className={props.className} style={{
      width: "fit-content",
      borderRadius: 16,
      backgroundColor: "rgb(36,36,36)",
      boxShadow: "inset 0 0 0 4px rgb(118,118,118)",
      display: "flex",
      flexDirection: "column",
      gap: 32,
      padding: "40px 40px 40px 40px",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        flexWrap: "nowrap",
        flexShrink: 0,
      }}>
        <div style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 4,
          backgroundColor: "rgb(208,37,55)",
          display: "flex",
          flexDirection: "row",
          gap: 10,
          padding: "4px 8px 4px 8px",
          alignItems: "flex-start",
          flexWrap: "nowrap",
          boxSizing: "border-box",
          flexShrink: 0,
        }}>
          <span style={{
            position: "relative",
            fontFamily: "\"SF Pro Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
            fontWeight: 400,
            fontSize: 16,
            textAlign: "right",
            whiteSpace: "nowrap",
            lineHeight: "100%",
            color: "rgb(255,255,255)",
            flexShrink: 0,
          }}>Development</span>
        </div>
      </div>
      <span style={{
        position: "relative",
        fontFamily: "\"SF Pro Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 600,
        fontSize: 60,
        whiteSpace: "nowrap",
        lineHeight: "100%",
        color: "rgb(0,0,0)",
        flexShrink: 0,
      }}>{props.text1 ?? "⛺"}</span>
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "flex-start",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Geist, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 48,
          whiteSpace: "nowrap",
          lineHeight: "100%",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.text2 ?? "Section 5.1-Service-level dashboard reporting"}</span>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Geist, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 24,
          lineHeight: "100%",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.text3 ?? "Covers total active, new, and on-hold guest counts, urgent case monitoring, pathway distribution, caseload per CMHW, guests seen today/week/month, and activity feed. The spec required all of these as named dashboard elements. Included because hub managers need a single morning view to understand the state of the service without opening individual records."}</span>
      </div>
    </div>
  );
}
export default Tile;
