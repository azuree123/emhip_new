// figma node: 242:2217 Priority (3 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "property1=" + __venc(p.property1);

export function Priority(_p = {}) {
  const props = { ..._p, high: _p.high ?? "High", property1: _p.property1 ?? "high", medium: _p.medium ?? "Moderate ", low: _p.low ?? "Low " };
  const __body0 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      color: "rgb(229,64,64)",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        width: 24,
        height: 24,
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 24,
          height: 24,
          clipPath: "inset(0px 0px 0px 0px)",
        }}>
          <svg width={14} height={20} viewBox="0 0 14 20" fill="none" style={{
            position: "absolute",
            left: 5,
            top: 2,
            width: 14,
            height: 20,
          }}>
            <path d={"M 6 3.825 L 1.4 8.4 L 0 7 L 7 0 L 14 7 L 12.6 8.425 L 8 3.825 L 8 11 L 6 11 L 6 3.825 Z M 6 16 L 6 13 L 8 13 L 8 16 L 6 16 Z M 6 20 L 6 18 L 8 18 L 8 20 L 6 20 Z"} fill="currentColor" fillRule="nonzero" />
          </svg>
        </div>
      </div>
      <span style={{
        position: "relative",
        fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        textAlign: "right",
        whiteSpace: "nowrap",
        lineHeight: 1.7999999523162842,
        color: "rgb(65,65,65)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.high}</span>
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      color: "rgb(244,193,15)",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        width: 24,
        height: 24,
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 24,
          height: 24,
          clipPath: "inset(0px 0px 0px 0px)",
        }}>
          <svg width={20} height={16} viewBox="0 0 20 16" fill="none" style={{
            position: "absolute",
            left: 2,
            top: 4,
            width: 20,
            height: 16,
          }}>
            <path d={"M 6 16 L 4.6 14.575 L 7.175 12 L 0 12 L 0 10 L 7.175 10 L 4.6 7.425 L 6 6 L 11 11 L 6 16 Z M 14 10 L 9 5 L 14 0 L 15.4 1.425 L 12.825 4 L 20 4 L 20 6 L 12.825 6 L 15.4 8.575 L 14 10 Z"} fill="currentColor" fillRule="nonzero" />
          </svg>
        </div>
      </div>
      <span style={{
        position: "relative",
        fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        textAlign: "right",
        whiteSpace: "nowrap",
        lineHeight: 1.7999999523162842,
        color: "rgb(65,65,65)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.medium}</span>
    </div>
  );
  const __body2 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      color: "rgb(47,130,255)",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        width: 24,
        height: 24,
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 24,
          height: 24,
          clipPath: "inset(0px 0px 0px 0px)",
        }}>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{
            position: "absolute",
            left: 4,
            top: 4,
            width: 16,
            height: 16,
          }}>
            <path d={"M 7 0 L 7 12.175 L 1.4 6.575 L 0 8 L 8 16 L 16 8 L 14.6 6.575 L 9 12.175 L 9 0 L 7 0 Z"} fill="currentColor" fillRule="nonzero" />
          </svg>
        </div>
      </div>
      <span style={{
        position: "relative",
        fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        textAlign: "right",
        whiteSpace: "nowrap",
        lineHeight: 1.7999999523162842,
        color: "rgb(65,65,65)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.low}</span>
    </div>
  );
  const __impls = {
    // figma: Property 1=high
    "property1=high": __body0,
    // figma: Property 1=medium
    "property1=medium": __body1,
    // figma: Property 1=Low
    "property1=low": __body2,
  };
  return (__impls[__vkey(props)] ?? __body0)();
}
export default Priority;
