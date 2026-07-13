// figma node: 916:11937 Day 
export function Day(_p = {}) {
  const props = _p;
  return (
    <div className={props.className} style={{
      width: 144.571,
      backgroundColor: "rgb(250,250,250)",
      boxShadow: "inset -1px -1px 0px 0px rgb(224,224,224)",
      display: "flex",
      flexDirection: "column",
      padding: "4px 8px 16px 8px",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "relative",
        fontFamily: "\"Plus Jakarta Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 10,
        lineHeight: "12px",
        color: "rgb(140,140,140)",
        flexShrink: 0,
        alignSelf: "stretch",
        whiteSpace: "nowrap",
      }}>{props.text1 ?? "SUN"}</span>
      <span style={{
        position: "relative",
        fontFamily: "\"Plus Jakarta Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 500,
        fontSize: 22,
        lineHeight: "32px",
        color: "rgb(42,42,42)",
        flexShrink: 0,
        alignSelf: "stretch",
        whiteSpace: "nowrap",
      }}>{props.text2 ?? "21"}</span>
    </div>
  );
}
export default Day;
