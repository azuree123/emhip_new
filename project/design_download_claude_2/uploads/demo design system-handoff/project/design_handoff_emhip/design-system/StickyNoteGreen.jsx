// figma node: 1033:7594 Sticky Note / Green
export function StickyNoteGreen(_p = {}) {
  const props = _p;
  return (
    <div className={props.className} style={{
      width: "fit-content",
      borderRadius: 6,
      backgroundColor: "rgb(194,234,170)",
      boxShadow: "4px 10px 14px 0px rgba(63,63,63,0.15)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "14px 16px 14px 16px",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "relative",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        lineHeight: "100%",
        color: "rgb(0,0,0)",
        flexShrink: 0,
        alignSelf: "stretch",
        whiteSpace: "nowrap",
      }}>{props.text1 ?? "add your findings here"}</span>
    </div>
  );
}
export default StickyNoteGreen;
