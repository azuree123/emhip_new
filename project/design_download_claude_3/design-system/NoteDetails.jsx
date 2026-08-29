import { NoteIcon } from './NoteIcon.jsx';

// figma node: 1034:7828 Note Details
export function NoteDetails(_p = {}) {
  const props = { ..._p, number: _p.number ?? "1", showTitle: _p.showTitle ?? true, title: _p.title ?? "Note Title", additionalDetails: _p.additionalDetails ?? "[add more details]", includeCode: _p.includeCode ?? false, code: _p.code ?? "[insert code snippet]" };
  return (
    <div className={props.className} style={{
      width: 300,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(255,255,255)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "row",
        gap: 6,
        padding: "0px 4px 0px 0px",
        alignItems: "center",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
          position: "relative",
          borderRadius: "6px 100px 6px 100px",
          backgroundColor: "rgb(49,119,129)",
          display: "flex",
          flexDirection: "row",
          gap: 4,
          padding: "8px 8px 8px 8px",
          justifyContent: "center",
          alignItems: "flex-start",
          flexWrap: "nowrap",
          boxSizing: "border-box",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>
          <span style={{
            position: "relative",
            fontFamily: "Arial, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
            fontWeight: 700,
            fontSize: 14,
            whiteSpace: "nowrap",
            lineHeight: 1,
            color: "rgb(255,255,255)",
            flexShrink: 0,
            alignSelf: "stretch",
          }}>{props.number}</span>
          <div style={{
              position: "relative",
              width: 14,
              flexShrink: 0,
              alignSelf: "stretch",
              height: "auto",
            }}>{props.icon1 ?? <NoteIcon />}</div>
        </div>
        {props.showTitle && (
        <span style={{
          position: "relative",
          fontFamily: "Arial, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 18,
          lineHeight: 1.2999999523162842,
          color: "rgb(34,34,34)",
          flexGrow: 1,
        }}>{props.title}</span>
        )}
      </div>
      <div style={{
        position: "relative",
        borderTop: "1px solid rgb(49,119,129)",
        borderRight: "1px solid rgb(49,119,129)",
        borderBottom: "1px solid rgb(49,119,129)",
        borderLeft: "2px solid rgb(49,119,129)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 16px 14px 16px",
        alignItems: "flex-start",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "flex-start",
          flexWrap: "nowrap",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>
          <span style={{
            position: "relative",
            fontFamily: "Arial, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
            fontWeight: 400,
            fontSize: 16,
            lineHeight: 1.5,
            color: "rgb(34,34,34)",
            flexShrink: 0,
            alignSelf: "stretch",
          }}>{props.additionalDetails}</span>
          {props.includeCode && (
          <div style={{
            position: "relative",
            borderRadius: 6,
            backgroundColor: "var(--code-background)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "10px 10px 10px 10px",
            alignItems: "flex-start",
            flexWrap: "nowrap",
            boxSizing: "border-box",
            flexShrink: 0,
            alignSelf: "stretch",
          }}>
            <span style={{
              position: "relative",
              fontFamily: "\"Roboto Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace",
              fontWeight: 400,
              fontSize: 16,
              lineHeight: 1.5,
              letterSpacing: "-0.030em",
              color: "rgb(34,34,34)",
              flexShrink: 0,
              alignSelf: "stretch",
            }}>{props.code}</span>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default NoteDetails;
