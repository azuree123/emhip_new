import { VideoCamera } from './VideoCamera.jsx';

// figma node: 916:12222 Event
export function Event(_p = {}) {
  const props = _p;
  return (
    <div className={props.className} style={{
      width: 143,
      height: 68,
      overflow: "hidden",
      borderRadius: 4,
      backgroundColor: "rgba(14,165,233,0.1)",
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        width: 3,
        backgroundColor: "rgb(14,165,233)",
        flexShrink: 0,
        alignSelf: "stretch",
      }} />
      <div style={{
        position: "relative",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        padding: "6px 6px 6px 6px",
        alignItems: "flex-start",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        flexGrow: 1,
        alignSelf: "stretch",
      }}>
        <div style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          gap: 4,
          alignItems: "center",
          flexWrap: "nowrap",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>
          <span style={{
            position: "relative",
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
            fontWeight: 400,
            fontSize: 12,
            whiteSpace: "nowrap",
            lineHeight: "16px",
            color: "rgb(3,105,161)",
            flexShrink: 0,
          }}>{props.text1 ?? "8:00"}</span>
          <span style={{
            position: "relative",
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
            fontWeight: 400,
            fontSize: 12,
            whiteSpace: "nowrap",
            lineHeight: "16px",
            color: "rgb(3,105,161)",
            flexShrink: 0,
          }}>{props.text2 ?? "AM"}</span>
          <div style={{
            position: "relative",
            borderRadius: 100,
            backgroundColor: "rgb(3,105,161)",
            display: "flex",
            flexDirection: "row",
            gap: 10,
            padding: "2px 2px 2px 2px",
            alignItems: "flex-start",
            flexWrap: "nowrap",
            boxSizing: "border-box",
            flexShrink: 0,
          }}>
            <div style={{
                position: "relative",
                width: 8,
                height: 8,
                flexShrink: 0,
              }}>{props.icon1 ?? <VideoCamera style={{ transform: "scale(0.400, 0.400)", transformOrigin: "0 0" }} />}</div>
          </div>
        </div>
        <span style={{
          position: "relative",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 12,
          lineHeight: "16px",
          color: "rgb(3,105,161)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text3 ?? "Monday Wake-Up Hour"}</span>
      </div>
    </div>
  );
}
export default Event;
