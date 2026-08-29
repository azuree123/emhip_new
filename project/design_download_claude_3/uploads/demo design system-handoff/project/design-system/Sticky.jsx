import { Priority } from './Priority.jsx';
import { Tags } from './Tags.jsx';

// figma node: 242:2233 Sticky (3 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "property1=" + __venc(p.property1);

export function Sticky(_p = {}) {
  const props = { ..._p, property1: _p.property1 ?? "query sticky" };
  const __body0 = () => (
    <div className={props.className} style={{
      width: 390,
      backgroundColor: "rgb(255,253,193)",
      boxShadow: "6px 6px 12px 0px rgba(0,0,0,0.15)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        backgroundColor: "rgba(109,48,22,0.05)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        padding: "16px 16px 16px 16px",
        alignItems: "center",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 40,
          whiteSpace: "nowrap",
          lineHeight: "100%",
          color: "rgb(0,0,0)",
          flexShrink: 0,
        }}>{props.text1 ?? "✋"}</span>
        <span style={{
          position: "relative",
          fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 24,
          lineHeight: "100%",
          color: "rgb(33,33,33)",
          flexGrow: 1,
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "Query to Product/Devs"}</span>
      </div>
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 36,
        padding: "24px 24px 24px 24px",
        alignItems: "flex-start",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 16,
          lineHeight: 1.5,
          color: "rgb(33,33,33)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.text3 ?? "Use this sticky to raise queries with the concerned team or individuals"}</span>
        <Tags
          style={{ position: "relative", width: 207, flexShrink: 0 }}
          tagText={"Press ‘C’ to add comment"}
          tagText2={"Press ‘C’ to add comment"}
          property1={"type 1"}
        />
      </div>
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: 390,
      backgroundColor: "rgb(195,223,255)",
      boxShadow: "6px 6px 12px 0px rgba(0,0,0,0.15)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        backgroundColor: "rgba(109,48,22,0.05)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        padding: "16px 16px 16px 16px",
        alignItems: "center",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 32,
          whiteSpace: "nowrap",
          lineHeight: "100%",
          color: "rgb(0,0,0)",
          flexShrink: 0,
        }}>{props.text1 ?? "📝"}</span>
        <span style={{
          position: "relative",
          fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 24,
          lineHeight: "100%",
          color: "rgb(33,33,33)",
          flexGrow: 1,
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "Product/Dev Note "}</span>
      </div>
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 36,
        padding: "24px 24px 24px 24px",
        alignItems: "flex-start",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 16,
          lineHeight: 1.5,
          color: "rgb(33,33,33)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.text3 ?? "Use this sticky to add annotations or information notes for the concerned team or individuals."}</span>
      </div>
    </div>
  );
  const __body2 = () => (
    <div className={props.className} style={{
      width: 390,
      backgroundColor: "rgb(255,205,205)",
      boxShadow: "6px 6px 12px 0px rgba(0,0,0,0.15)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        backgroundColor: "rgba(255,0,0,0.1)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        padding: "16px 16px 16px 16px",
        alignItems: "center",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 32,
          whiteSpace: "nowrap",
          lineHeight: "100%",
          color: "rgb(0,0,0)",
          flexShrink: 0,
        }}>{props.text1 ?? "🐞"}</span>
        <span style={{
          position: "relative",
          fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 24,
          lineHeight: "100%",
          color: "rgb(33,33,33)",
          flexGrow: 1,
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "UI/Usability bugs "}</span>
        <div style={{ position: "relative", flexShrink: 0 }}>{props.icon1 ?? <Priority property1={"high"} />}</div>
      </div>
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "24px 24px 24px 24px",
        alignItems: "flex-start",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 16,
          lineHeight: 1.5,
          color: "rgb(33,33,33)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.text3 ?? "Use this sticky to detail the design issues encountered during the review. Be specific about the problems related to task flow, interactions, layout, content, components, UI design, consistency, error prevention/handling, and system feedback."}</span>
        <div style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          gap: 8,
          alignItems: "flex-start",
          flexWrap: "wrap",
          alignContent: "space-between",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>
          <Tags
            style={{ position: "relative", width: 126, flexShrink: 0 }}
            tagText={"# inconsistency"}
            property1={"type 1"}
          />
          <Tags
            style={{ position: "relative", width: 126, flexShrink: 0 }}
            tagText={"# inconsistency"}
            property1={"type 1"}
          />
          <Tags
            style={{ position: "relative", width: 178, flexShrink: 0 }}
            tagText={"# no system feedback"}
            property1={"type 1"}
          />
        </div>
      </div>
    </div>
  );
  const __impls = {
    // figma: Property 1=Query sticky
    "property1=query sticky": __body0,
    // figma: Property 1=Info sticky
    "property1=info sticky": __body1,
    // figma: Property 1=Issues
    "property1=issues": __body2,
  };
  return (__impls[__vkey(props)] ?? __body0)();
}
export default Sticky;
