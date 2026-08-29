// figma node: 242:2212 Tags (2 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "property1=" + __venc(p.property1);

export function Tags(_p = {}) {
  const props = { ..._p, tagText: _p.tagText ?? "Tag 1", property1: _p.property1 ?? "type 1", tagText2: _p.tagText2 ?? "tag 2" };
  const __body0 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      borderRadius: 4,
      backgroundColor: "rgb(76,76,76)",
      display: "flex",
      flexDirection: "row",
      gap: 10,
      padding: "4px 12px 4px 12px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "relative",
        fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        whiteSpace: "nowrap",
        lineHeight: 1.2999999523162842,
        color: "rgb(246,246,246)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.tagText}</span>
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      borderRadius: 100,
      backgroundColor: "rgb(243,243,243)",
      display: "flex",
      flexDirection: "row",
      gap: 10,
      padding: "4px 12px 4px 12px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "relative",
        fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        whiteSpace: "nowrap",
        lineHeight: 1.2999999523162842,
        color: "rgb(98,98,98)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.tagText2}</span>
    </div>
  );
  const __impls = {
    // figma: Property 1=type 1
    "property1=type 1": __body0,
    // figma: Property 1=type 2
    "property1=type 2": __body1,
  };
  return (__impls[__vkey(props)] ?? __body0)();
}
export default Tags;
