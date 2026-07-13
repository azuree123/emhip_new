import { NoteIcon } from './NoteIcon.jsx';

// figma node: 1034:7790 Note Stamp (5 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "showPin=" + __venc(p.showPin) + '|' + "stampPosition=" + __venc(p.stampPosition);

export function NoteStamp(_p = {}) {
  const props = { ..._p, showPin: _p.showPin ?? true, number: _p.number ?? "1", stampPosition: _p.stampPosition ?? "left" };
  const __body0 = () => (
    <div className={props.className} style={{
      width: 120,
      boxShadow: "0px 4px 4px 0px rgba(0,0,0,0.25)",
      display: "flex",
      flexDirection: "row",
      padding: "0px 1px 0px 0px",
      alignItems: "center",
      flexWrap: "nowrap",
      isolation: "isolate",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        borderRadius: 60,
        backgroundColor: "rgb(49,119,129)",
        boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        display: "flex",
        flexDirection: "row",
        gap: 6,
        padding: "8px 12px 8px 12px",
        alignItems: "center",
        flexWrap: "nowrap",
        boxSizing: "border-box",
        zIndex: 2,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Arial, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 14,
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1,
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.number}</span>
        <div style={{
            position: "relative",
            flexShrink: 0,
            alignSelf: "stretch",
            height: "auto",
          }}>{props.icon1 ?? <NoteIcon />}</div>
      </div>
      <div style={{
        position: "relative",
        height: 2,
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        flexWrap: "nowrap",
        zIndex: 1,
        flexGrow: 1,
      }}>
        <div style={{
          position: "relative",
          backgroundColor: "rgb(255,255,255)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "nowrap",
          flexGrow: 1,
          alignSelf: "stretch",
        }}>
          <svg height={1} viewBox="0 -0.500 20 1" fill="none" style={{
            position: "relative",
            height: 1,
            flexShrink: 0,
            alignSelf: "stretch",
          }}>
            <path d={"M 0 -0.5 L -0.5 -0.5 L -0.5 0.5 L 0 0.5 L 0 0 L 0 -0.5 Z M 1.667 0.5 L 2.167 0.5 L 2.167 -0.5 L 1.667 -0.5 L 1.667 0 L 1.667 0.5 Z M 5 -0.5 L 4.5 -0.5 L 4.5 0.5 L 5 0.5 L 5 0 L 5 -0.5 Z M 8.333 0.5 L 8.833 0.5 L 8.833 -0.5 L 8.333 -0.5 L 8.333 0 L 8.333 0.5 Z M 11.667 -0.5 L 11.167 -0.5 L 11.167 0.5 L 11.667 0.5 L 11.667 0 L 11.667 -0.5 Z M 15 0.5 L 15.5 0.5 L 15.5 -0.5 L 15 -0.5 L 15 0 L 15 0.5 Z M 18.333 -0.5 L 17.833 -0.5 L 17.833 0.5 L 18.333 0.5 L 18.333 0 L 18.333 -0.5 Z M 0 0 L 0 0.5 L 1.667 0.5 L 1.667 0 L 1.667 -0.5 L 0 -0.5 L 0 0 Z M 5 0 L 5 0.5 L 8.333 0.5 L 8.333 0 L 8.333 -0.5 L 5 -0.5 L 5 0 Z M 11.667 0 L 11.667 0.5 L 15 0.5 L 15 0 L 15 -0.5 L 11.667 -0.5 L 11.667 0 Z M 18.333 0 L 18.333 0.5 L 20 0.5 L 20 0 L 20 -0.5 L 18.333 -0.5 L 18.333 0 Z M 0 -0.5 L -0.5 -0.5 L -0.5 0.5 L 0 0.5 L 0 0 L 0 -0.5 Z M 1.667 0.5 L 2.167 0.5 L 2.167 -0.5 L 1.667 -0.5 L 1.667 0 L 1.667 0.5 Z M 5 -0.5 L 4.5 -0.5 L 4.5 0.5 L 5 0.5 L 5 0 L 5 -0.5 Z M 8.333 0.5 L 8.833 0.5 L 8.833 -0.5 L 8.333 -0.5 L 8.333 0 L 8.333 0.5 Z M 11.667 -0.5 L 11.167 -0.5 L 11.167 0.5 L 11.667 0.5 L 11.667 0 L 11.667 -0.5 Z M 15 0.5 L 15.5 0.5 L 15.5 -0.5 L 15 -0.5 L 15 0 L 15 0.5 Z M 18.333 -0.5 L 17.833 -0.5 L 17.833 0.5 L 18.333 0.5 L 18.333 0 L 18.333 -0.5 Z M 0 0 L 0 0.5 L 1.667 0.5 L 1.667 0 L 1.667 -0.5 L 0 -0.5 L 0 0 Z M 5 0 L 5 0.5 L 8.333 0.5 L 8.333 0 L 8.333 -0.5 L 5 -0.5 L 5 0 Z M 11.667 0 L 11.667 0.5 L 15 0.5 L 15 0 L 15 -0.5 L 11.667 -0.5 L 11.667 0 Z M 18.333 0 L 18.333 0.5 L 20 0.5 L 20 0 L 20 -0.5 L 18.333 -0.5 L 18.333 0 Z"} fill="currentColor" fillRule="nonzero" />
          </svg>
        </div>
        <div style={{
          position: "relative",
          width: 11,
          height: 11,
          borderRadius: "50%",
          backgroundColor: "rgb(49,119,129)",
          boxShadow: "0 0 0 1px rgb(255,255,255)",
          flexShrink: 0,
        }} />
      </div>
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: 120,
      boxShadow: "0px 4px 4px 0px rgba(0,0,0,0.25)",
      display: "flex",
      flexDirection: "row",
      padding: "0px 1px 0px 1px",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 2,
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        flexWrap: "nowrap",
        isolation: "isolate",
        flexGrow: 1,
      }}>
        <div style={{
          position: "relative",
          width: 11,
          height: 11,
          borderRadius: "50%",
          backgroundColor: "rgb(49,119,129)",
          boxShadow: "0 0 0 1px rgb(255,255,255)",
          zIndex: 2,
          flexShrink: 0,
        }} />
        <div style={{
          position: "relative",
          backgroundColor: "rgb(255,255,255)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "nowrap",
          zIndex: 1,
          flexGrow: 1,
          alignSelf: "stretch",
        }}>
          <svg height={1} viewBox="0 -0.500 20 1" fill="none" style={{
            position: "relative",
            height: 1,
            flexShrink: 0,
            alignSelf: "stretch",
          }}>
            <path d={"M 0 -0.5 L -0.5 -0.5 L -0.5 0.5 L 0 0.5 L 0 0 L 0 -0.5 Z M 1.667 0.5 L 2.167 0.5 L 2.167 -0.5 L 1.667 -0.5 L 1.667 0 L 1.667 0.5 Z M 5 -0.5 L 4.5 -0.5 L 4.5 0.5 L 5 0.5 L 5 0 L 5 -0.5 Z M 8.333 0.5 L 8.833 0.5 L 8.833 -0.5 L 8.333 -0.5 L 8.333 0 L 8.333 0.5 Z M 11.667 -0.5 L 11.167 -0.5 L 11.167 0.5 L 11.667 0.5 L 11.667 0 L 11.667 -0.5 Z M 15 0.5 L 15.5 0.5 L 15.5 -0.5 L 15 -0.5 L 15 0 L 15 0.5 Z M 18.333 -0.5 L 17.833 -0.5 L 17.833 0.5 L 18.333 0.5 L 18.333 0 L 18.333 -0.5 Z M 0 0 L 0 0.5 L 1.667 0.5 L 1.667 0 L 1.667 -0.5 L 0 -0.5 L 0 0 Z M 5 0 L 5 0.5 L 8.333 0.5 L 8.333 0 L 8.333 -0.5 L 5 -0.5 L 5 0 Z M 11.667 0 L 11.667 0.5 L 15 0.5 L 15 0 L 15 -0.5 L 11.667 -0.5 L 11.667 0 Z M 18.333 0 L 18.333 0.5 L 20 0.5 L 20 0 L 20 -0.5 L 18.333 -0.5 L 18.333 0 Z M 0 -0.5 L -0.5 -0.5 L -0.5 0.5 L 0 0.5 L 0 0 L 0 -0.5 Z M 1.667 0.5 L 2.167 0.5 L 2.167 -0.5 L 1.667 -0.5 L 1.667 0 L 1.667 0.5 Z M 5 -0.5 L 4.5 -0.5 L 4.5 0.5 L 5 0.5 L 5 0 L 5 -0.5 Z M 8.333 0.5 L 8.833 0.5 L 8.833 -0.5 L 8.333 -0.5 L 8.333 0 L 8.333 0.5 Z M 11.667 -0.5 L 11.167 -0.5 L 11.167 0.5 L 11.667 0.5 L 11.667 0 L 11.667 -0.5 Z M 15 0.5 L 15.5 0.5 L 15.5 -0.5 L 15 -0.5 L 15 0 L 15 0.5 Z M 18.333 -0.5 L 17.833 -0.5 L 17.833 0.5 L 18.333 0.5 L 18.333 0 L 18.333 -0.5 Z M 0 0 L 0 0.5 L 1.667 0.5 L 1.667 0 L 1.667 -0.5 L 0 -0.5 L 0 0 Z M 5 0 L 5 0.5 L 8.333 0.5 L 8.333 0 L 8.333 -0.5 L 5 -0.5 L 5 0 Z M 11.667 0 L 11.667 0.5 L 15 0.5 L 15 0 L 15 -0.5 L 11.667 -0.5 L 11.667 0 Z M 18.333 0 L 18.333 0.5 L 20 0.5 L 20 0 L 20 -0.5 L 18.333 -0.5 L 18.333 0 Z"} fill="currentColor" fillRule="nonzero" />
          </svg>
        </div>
      </div>
      <div style={{
        position: "relative",
        borderRadius: 60,
        backgroundColor: "rgb(49,119,129)",
        boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        display: "flex",
        flexDirection: "row",
        gap: 6,
        padding: "8px 12px 8px 12px",
        alignItems: "center",
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
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1,
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.number}</span>
        <div style={{
            position: "relative",
            flexShrink: 0,
            alignSelf: "stretch",
            height: "auto",
          }}>{props.icon1 ?? <NoteIcon />}</div>
      </div>
    </div>
  );
  const __body2 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      height: 63,
      boxShadow: "0px 4px 4px 0px rgba(0,0,0,0.25)",
      display: "flex",
      flexDirection: "column",
      padding: "0px 0px 1px 0px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        borderRadius: 60,
        backgroundColor: "rgb(49,119,129)",
        boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        display: "flex",
        flexDirection: "row",
        gap: 6,
        padding: "8px 12px 8px 12px",
        alignItems: "center",
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
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1,
          color: "rgb(255,255,255)",
          flexShrink: 0,
        }}>{props.number}</span>
        <div style={{ position: "relative", height: 14, flexShrink: 0 }}>{props.icon1 ?? <NoteIcon />}</div>
      </div>
      <div style={{
        position: "relative",
        width: 31,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexGrow: 1,
      }}>
        <div style={{
          position: "relative",
          width: 2,
          backgroundColor: "rgb(255,255,255)",
          display: "flex",
          flexDirection: "column",
          padding: "0px 1px 0px 1px",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "nowrap",
          boxSizing: "border-box",
          flexGrow: 1,
        }}>
          <svg width={21} height={1} viewBox="0 -0.500 21 1" fill="none" style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: "matrix(0,-1,1,0,1,21)",
            transformOrigin: "0 0",
            width: 21,
            height: 1,
          }}>
            <path d={"M 0 -0.5 L -0.5 -0.5 L -0.5 0.5 L 0 0.5 L 0 0 L 0 -0.5 Z M 1.75 0.5 L 2.25 0.5 L 2.25 -0.5 L 1.75 -0.5 L 1.75 0 L 1.75 0.5 Z M 5.25 -0.5 L 4.75 -0.5 L 4.75 0.5 L 5.25 0.5 L 5.25 0 L 5.25 -0.5 Z M 8.75 0.5 L 9.25 0.5 L 9.25 -0.5 L 8.75 -0.5 L 8.75 0 L 8.75 0.5 Z M 12.25 -0.5 L 11.75 -0.5 L 11.75 0.5 L 12.25 0.5 L 12.25 0 L 12.25 -0.5 Z M 15.75 0.5 L 16.25 0.5 L 16.25 -0.5 L 15.75 -0.5 L 15.75 0 L 15.75 0.5 Z M 19.25 -0.5 L 18.75 -0.5 L 18.75 0.5 L 19.25 0.5 L 19.25 0 L 19.25 -0.5 Z M 0 0 L 0 0.5 L 1.75 0.5 L 1.75 0 L 1.75 -0.5 L 0 -0.5 L 0 0 Z M 5.25 0 L 5.25 0.5 L 8.75 0.5 L 8.75 0 L 8.75 -0.5 L 5.25 -0.5 L 5.25 0 Z M 12.25 0 L 12.25 0.5 L 15.75 0.5 L 15.75 0 L 15.75 -0.5 L 12.25 -0.5 L 12.25 0 Z M 19.25 0 L 19.25 0.5 L 21 0.5 L 21 0 L 21 -0.5 L 19.25 -0.5 L 19.25 0 Z M 0 -0.5 L -0.5 -0.5 L -0.5 0.5 L 0 0.5 L 0 0 L 0 -0.5 Z M 1.75 0.5 L 2.25 0.5 L 2.25 -0.5 L 1.75 -0.5 L 1.75 0 L 1.75 0.5 Z M 5.25 -0.5 L 4.75 -0.5 L 4.75 0.5 L 5.25 0.5 L 5.25 0 L 5.25 -0.5 Z M 8.75 0.5 L 9.25 0.5 L 9.25 -0.5 L 8.75 -0.5 L 8.75 0 L 8.75 0.5 Z M 12.25 -0.5 L 11.75 -0.5 L 11.75 0.5 L 12.25 0.5 L 12.25 0 L 12.25 -0.5 Z M 15.75 0.5 L 16.25 0.5 L 16.25 -0.5 L 15.75 -0.5 L 15.75 0 L 15.75 0.5 Z M 19.25 -0.5 L 18.75 -0.5 L 18.75 0.5 L 19.25 0.5 L 19.25 0 L 19.25 -0.5 Z M 0 0 L 0 0.5 L 1.75 0.5 L 1.75 0 L 1.75 -0.5 L 0 -0.5 L 0 0 Z M 5.25 0 L 5.25 0.5 L 8.75 0.5 L 8.75 0 L 8.75 -0.5 L 5.25 -0.5 L 5.25 0 Z M 12.25 0 L 12.25 0.5 L 15.75 0.5 L 15.75 0 L 15.75 -0.5 L 12.25 -0.5 L 12.25 0 Z M 19.25 0 L 19.25 0.5 L 21 0.5 L 21 0 L 21 -0.5 L 19.25 -0.5 L 19.25 0 Z"} fill="currentColor" fillRule="nonzero" />
          </svg>
        </div>
        <div style={{
          position: "relative",
          width: 11,
          height: 11,
          borderRadius: "50%",
          backgroundColor: "rgb(49,119,129)",
          boxShadow: "0 0 0 1px rgb(255,255,255)",
          flexShrink: 0,
        }} />
      </div>
    </div>
  );
  const __body3 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      height: 63,
      boxShadow: "0px 4px 4px 0px rgba(0,0,0,0.25)",
      display: "flex",
      flexDirection: "column",
      padding: "1px 0px 1px 0px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        width: 31,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        isolation: "isolate",
        flexGrow: 1,
      }}>
        <div style={{
          position: "relative",
          width: 11,
          height: 11,
          borderRadius: "50%",
          backgroundColor: "rgb(49,119,129)",
          boxShadow: "0 0 0 1px rgb(255,255,255)",
          zIndex: 2,
          flexShrink: 0,
        }} />
        <div style={{
          position: "relative",
          width: 2,
          backgroundColor: "rgb(255,255,255)",
          display: "flex",
          flexDirection: "column",
          padding: "0px 1px 0px 1px",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "nowrap",
          boxSizing: "border-box",
          zIndex: 1,
          flexGrow: 1,
        }}>
          <svg width={21} height={1} viewBox="0 -0.500 21 1" fill="none" style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: "matrix(0,-1,1,0,1,21)",
            transformOrigin: "0 0",
            width: 21,
            height: 1,
          }}>
            <path d={"M 0 -0.5 L -0.5 -0.5 L -0.5 0.5 L 0 0.5 L 0 0 L 0 -0.5 Z M 1.75 0.5 L 2.25 0.5 L 2.25 -0.5 L 1.75 -0.5 L 1.75 0 L 1.75 0.5 Z M 5.25 -0.5 L 4.75 -0.5 L 4.75 0.5 L 5.25 0.5 L 5.25 0 L 5.25 -0.5 Z M 8.75 0.5 L 9.25 0.5 L 9.25 -0.5 L 8.75 -0.5 L 8.75 0 L 8.75 0.5 Z M 12.25 -0.5 L 11.75 -0.5 L 11.75 0.5 L 12.25 0.5 L 12.25 0 L 12.25 -0.5 Z M 15.75 0.5 L 16.25 0.5 L 16.25 -0.5 L 15.75 -0.5 L 15.75 0 L 15.75 0.5 Z M 19.25 -0.5 L 18.75 -0.5 L 18.75 0.5 L 19.25 0.5 L 19.25 0 L 19.25 -0.5 Z M 0 0 L 0 0.5 L 1.75 0.5 L 1.75 0 L 1.75 -0.5 L 0 -0.5 L 0 0 Z M 5.25 0 L 5.25 0.5 L 8.75 0.5 L 8.75 0 L 8.75 -0.5 L 5.25 -0.5 L 5.25 0 Z M 12.25 0 L 12.25 0.5 L 15.75 0.5 L 15.75 0 L 15.75 -0.5 L 12.25 -0.5 L 12.25 0 Z M 19.25 0 L 19.25 0.5 L 21 0.5 L 21 0 L 21 -0.5 L 19.25 -0.5 L 19.25 0 Z M 0 -0.5 L -0.5 -0.5 L -0.5 0.5 L 0 0.5 L 0 0 L 0 -0.5 Z M 1.75 0.5 L 2.25 0.5 L 2.25 -0.5 L 1.75 -0.5 L 1.75 0 L 1.75 0.5 Z M 5.25 -0.5 L 4.75 -0.5 L 4.75 0.5 L 5.25 0.5 L 5.25 0 L 5.25 -0.5 Z M 8.75 0.5 L 9.25 0.5 L 9.25 -0.5 L 8.75 -0.5 L 8.75 0 L 8.75 0.5 Z M 12.25 -0.5 L 11.75 -0.5 L 11.75 0.5 L 12.25 0.5 L 12.25 0 L 12.25 -0.5 Z M 15.75 0.5 L 16.25 0.5 L 16.25 -0.5 L 15.75 -0.5 L 15.75 0 L 15.75 0.5 Z M 19.25 -0.5 L 18.75 -0.5 L 18.75 0.5 L 19.25 0.5 L 19.25 0 L 19.25 -0.5 Z M 0 0 L 0 0.5 L 1.75 0.5 L 1.75 0 L 1.75 -0.5 L 0 -0.5 L 0 0 Z M 5.25 0 L 5.25 0.5 L 8.75 0.5 L 8.75 0 L 8.75 -0.5 L 5.25 -0.5 L 5.25 0 Z M 12.25 0 L 12.25 0.5 L 15.75 0.5 L 15.75 0 L 15.75 -0.5 L 12.25 -0.5 L 12.25 0 Z M 19.25 0 L 19.25 0.5 L 21 0.5 L 21 0 L 21 -0.5 L 19.25 -0.5 L 19.25 0 Z"} fill="currentColor" fillRule="nonzero" />
          </svg>
        </div>
      </div>
      <div style={{
        position: "relative",
        borderRadius: 60,
        backgroundColor: "rgb(49,119,129)",
        boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        display: "flex",
        flexDirection: "row",
        gap: 6,
        padding: "8px 12px 8px 12px",
        alignItems: "center",
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
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1,
          color: "rgb(255,255,255)",
          flexShrink: 0,
        }}>{props.number}</span>
        <div style={{ position: "relative", height: 14, flexShrink: 0 }}>{props.icon1 ?? <NoteIcon />}</div>
      </div>
    </div>
  );
  const __body4 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      boxShadow: "0px 4px 4px 0px rgba(0,0,0,0.25)",
      display: "flex",
      flexDirection: "row",
      gap: 2,
      padding: "0px 1px 0px 0px",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        borderRadius: 60,
        backgroundColor: "rgb(49,119,129)",
        boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        display: "flex",
        flexDirection: "row",
        gap: 6,
        padding: "8px 12px 8px 12px",
        alignItems: "center",
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
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1,
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.number}</span>
        <div style={{
            position: "relative",
            flexShrink: 0,
            alignSelf: "stretch",
            height: "auto",
          }}>{props.icon1 ?? <NoteIcon />}</div>
      </div>
    </div>
  );
  const __impls = {
    // figma: Show pin=true, Stamp position=left
    "showPin=true|stampPosition=left": __body0,
    // figma: Show pin=true, Stamp position=right
    "showPin=true|stampPosition=right": __body1,
    // figma: Show pin=true, Stamp position=above
    "showPin=true|stampPosition=above": __body2,
    // figma: Show pin=true, Stamp position=below
    "showPin=true|stampPosition=below": __body3,
    // figma: Show pin=false, Stamp position=center
    "showPin=false|stampPosition=center": __body4,
  };
  return (__impls[__vkey(props)] ?? __body0)();
}
export default NoteStamp;
