import { Icons } from './Icons.jsx';

// figma node: 4:1434 Chip (2 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "text=" + __venc(p.text);

export function Chip(_p = {}) {
  const props = { ..._p, text: _p.text ?? "customer", showIcons: _p.showIcons ?? true };
  const __body0 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      borderRadius: 200,
      backgroundColor: "rgb(238,241,247)",
      display: "flex",
      flexDirection: "row",
      gap: 10,
      padding: "4px 8px 4px 8px",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "relative",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 500,
        fontSize: 12,
        textAlign: "center",
        whiteSpace: "nowrap",
        lineHeight: "16px",
        color: "rgb(56,64,73)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.text1 ?? "Churned"}</span>
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      borderRadius: 200,
      backgroundColor: "rgb(234,253,238)",
      display: "flex",
      flexDirection: "row",
      gap: 2,
      padding: "4px 8px 4px 8px",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.showIcons && (
      <div style={{
          position: "relative",
          width: 16,
          flexShrink: 0,
          alignSelf: "stretch",
          height: "auto",
        }}>{props.icon1 ?? <Icons name={"arrow-narrow-up"} color={"default"} />}</div>
      )}
      <span style={{
        position: "relative",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 500,
        fontSize: 12,
        textAlign: "center",
        whiteSpace: "nowrap",
        lineHeight: "16px",
        color: "rgb(20,113,41)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.text1 ?? "Customer"}</span>
    </div>
  );
  const __impls = {
    // figma: Text=Churned
    "text=churned": __body0,
    // figma: Text=Customer
    "text=customer": __body1,
  };
  return (__impls[__vkey(props)] ?? __body1)();
}
export default Chip;
