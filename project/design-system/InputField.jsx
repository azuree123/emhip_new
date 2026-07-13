import { IconChevronDown } from './IconChevronDown.jsx';
import { IconEyeShow } from './IconEyeShow.jsx';
import { IconSearch } from './IconSearch.jsx';
import { InputField } from './InputField.jsx';

// figma node: 50:5686 Input Field (20 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "type=" + __venc(p.type) + '|' + "state=" + __venc(p.state) + '|' + "subType=" + __venc(p.subType) + '|' + "size=" + __venc(p.size);

export function InputField(_p = {}) {
  const props = { ..._p, type: _p.type ?? "contextual", state: _p.state ?? "empty", subType: _p.subType ?? "default", size: _p.size ?? "md" };
  const __body0 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 48,
      borderRadius: 8,
      backgroundColor: "rgb(249,249,249)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 16,
        top: 11,
        width: 259,
        height: 27,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 1.7000000476837158,
        color: "rgb(181,181,181)",
      }}>{props.text1 ?? "Input field filled"}</span>
      <div style={{
          position: "absolute",
          left: 287,
          top: 12,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconSearch />}</div>
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 48,
      borderRadius: 8,
      backgroundColor: "rgb(249,249,249)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 16,
        top: 11,
        width: 259,
        height: 27,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 1.7000000476837158,
        color: "rgb(181,181,181)",
        whiteSpace: "pre-wrap",
        display: "inline-block",
      }}>{"Infinite"}{" "}{"|"}</span>
      <div style={{
          position: "absolute",
          left: 287,
          top: 12,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconSearch />}</div>
    </div>
  );
  const __body2 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 48,
      borderRadius: 8,
      backgroundColor: "rgb(249,249,249)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 16,
        top: 11,
        width: 259,
        height: 27,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 1.7000000476837158,
        color: "rgb(0,0,0)",
      }}>{props.text1 ?? "Infinite"}</span>
      <div style={{
          position: "absolute",
          left: 287,
          top: 12,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconSearch />}</div>
    </div>
  );
  const __body3 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 48,
      borderRadius: 8,
      backgroundColor: "rgb(249,249,249)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 16,
        top: 11,
        width: 295,
        height: 27,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 1.7000000476837158,
        color: "rgb(181,181,181)",
      }}>{props.text1 ?? "Input Text"}</span>
    </div>
  );
  const __body4 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 48,
      borderRadius: 8,
      backgroundColor: "rgb(249,249,249)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 16,
        top: 11,
        width: 295,
        height: 27,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 1.7000000476837158,
        color: "rgb(181,181,181)",
        whiteSpace: "pre-wrap",
        display: "inline-block",
      }}>{"Input Text"}{" "}{"|"}</span>
    </div>
  );
  const __body5 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 72,
      position: "relative",
      ...props.style,
    }}>
      <InputField
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 327,
          height: 48,
        }}
        type={"input text"}
        state={"typing"}
        subType={"default"}
        size={"md"}
      />
      <span style={{
        position: "absolute",
        left: 0,
        top: 52,
        width: 327,
        height: 20,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 12,
        lineHeight: 1.7000000476837158,
        color: "rgb(255,68,68)",
      }}>{props.text1 ?? "The input must be filled"}</span>
    </div>
  );
  const __body6 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 48,
      borderRadius: 8,
      backgroundColor: "rgb(249,249,249)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 16,
        top: 11,
        width: 295,
        height: 27,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 1.7000000476837158,
        color: "rgb(0,0,0)",
      }}>{props.text1 ?? "Input Text"}</span>
    </div>
  );
  const __body7 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 60,
      borderRadius: 8,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(215,215,215)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 12,
        top: 18,
        width: 79,
        height: 24,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 14,
        whiteSpace: "nowrap",
        lineHeight: 1.7000000476837158,
        color: "rgb(181,181,181)",
      }}>{props.text1 ?? "Placeholder"}</span>
      <div style={{
          position: "absolute",
          left: 291,
          top: 18,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconEyeShow />}</div>
    </div>
  );
  const __body8 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 60,
      borderRadius: 8,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(215,215,215)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 12,
        top: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 12,
          whiteSpace: "nowrap",
          lineHeight: 1.7000000476837158,
          color: "rgb(181,181,181)",
          flexShrink: 0,
        }}>{props.text1 ?? "From"}</span>
        <span style={{
          position: "relative",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 14,
          whiteSpace: "nowrap",
          lineHeight: 1.7000000476837158,
          color: "rgb(0,0,0)",
          flexShrink: 0,
        }}>{props.text2 ?? "1 January 2021"}</span>
      </div>
      <div style={{
          position: "absolute",
          left: 291,
          top: 18,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconEyeShow />}</div>
    </div>
  );
  const __body9 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 60,
      borderRadius: 8,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(215,215,215)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 12,
        top: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 12,
          whiteSpace: "nowrap",
          lineHeight: 1.7000000476837158,
          color: "rgb(181,181,181)",
          flexShrink: 0,
        }}>{props.text1 ?? "From"}</span>
        <span style={{
          position: "relative",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 14,
          whiteSpace: "pre-wrap",
          lineHeight: 1.7000000476837158,
          color: "rgb(0,0,0)",
          flexShrink: 0,
        }}>{"Text "}{"|"}</span>
      </div>
      <div style={{
          position: "absolute",
          left: 291,
          top: 18,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconEyeShow />}</div>
    </div>
  );
  const __body10 = () => (
    <div className={props.className} style={{
      width: 300,
      height: 40,
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(0,74,215)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 52,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(0,74,215)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 104,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(0,74,215)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 156,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(0,74,215)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 208,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(0,74,215)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 260,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(0,74,215)",
        }} />
      </div>
    </div>
  );
  const __body11 = () => (
    <div className={props.className} style={{
      width: 300,
      height: 40,
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 52,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 104,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 156,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 208,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "absolute",
        left: 260,
        top: 0,
        width: 40,
        height: 40,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          opacity: 0,
        }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "rgb(255,255,255)",
        }} />
      </div>
    </div>
  );
  const __body12 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        width: 64,
        borderRadius: 8,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "absolute",
          left: 26,
          top: 14,
          width: 12,
          height: 36,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 24,
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1.5,
          color: "rgb(255,255,255)",
        }}>{props.text1 ?? "1"}</span>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 64,
          height: 64,
          opacity: 0.5,
          borderRadius: 16,
          boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "relative",
        width: 64,
        borderRadius: 8,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "absolute",
          left: 26,
          top: 14,
          width: 12,
          height: 36,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 24,
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1.5,
          color: "rgb(255,255,255)",
        }}>{props.text2 ?? "1"}</span>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 64,
          height: 64,
          opacity: 0.5,
          borderRadius: 16,
          boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "relative",
        width: 64,
        borderRadius: 8,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "absolute",
          left: 26,
          top: 14,
          width: 12,
          height: 36,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 24,
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1.5,
          color: "rgb(255,255,255)",
        }}>{props.text3 ?? "1"}</span>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 64,
          height: 64,
          opacity: 0.5,
          borderRadius: 16,
          boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "relative",
        width: 64,
        borderRadius: 8,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "absolute",
          left: 26,
          top: 14,
          width: 12,
          height: 36,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 24,
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1.5,
          color: "rgb(255,255,255)",
        }}>{props.text4 ?? "1"}</span>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 64,
          height: 64,
          opacity: 0.5,
          borderRadius: 16,
          boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        }} />
      </div>
    </div>
  );
  const __body13 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        width: 64,
        borderRadius: 8,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "absolute",
          left: 28,
          top: 14,
          width: 9,
          height: 36,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 600,
          fontSize: 24,
          textAlign: "center",
          whiteSpace: "nowrap",
          lineHeight: 1.5,
          color: "rgb(0,209,255)",
        }}>{props.text1 ?? "|"}</span>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 64,
          height: 64,
          opacity: 0.5,
          borderRadius: 16,
          boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "relative",
        width: 64,
        borderRadius: 8,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 64,
          height: 64,
          opacity: 0.5,
          borderRadius: 16,
          boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "relative",
        width: 64,
        borderRadius: 8,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 64,
          height: 64,
          opacity: 0.5,
          borderRadius: 16,
          boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        }} />
      </div>
      <div style={{
        position: "relative",
        width: 64,
        borderRadius: 8,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 64,
          height: 64,
          opacity: 0.5,
          borderRadius: 16,
          boxShadow: "inset 0 0 0 1px rgb(255,255,255)",
        }} />
      </div>
    </div>
  );
  const __body14 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 40,
      borderRadius: 8,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(215,215,215)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 12,
        top: 8,
        width: 275,
        height: 24,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 14,
        lineHeight: 1.7000000476837158,
        color: "rgb(0,0,0)",
      }}>{props.text1 ?? "Text"}</span>
      <div style={{
          position: "absolute",
          left: 295,
          top: 8,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconChevronDown />}</div>
    </div>
  );
  const __body15 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 78,
      borderRadius: 8,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(215,215,215)",
      position: "relative",
      ...props.style,
    }}>
      <div className="fig-asset-167e7e4dc9281399-06fa91cb" style={{
        position: "absolute",
        left: 16,
        top: 18,
        width: 56,
        height: 40,
      }} />
      <span style={{
        position: "absolute",
        left: 88,
        top: 16,
        width: 187,
        height: 20,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 12,
        lineHeight: 1.7000000476837158,
        color: "rgb(148,148,148)",
      }}>{props.text1 ?? "Top Up Method - Master Card"}</span>
      <span style={{
        position: "absolute",
        left: 88,
        top: 38,
        width: 187,
        height: 24,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 600,
        fontSize: 14,
        lineHeight: 1.7000000476837158,
        color: "rgb(0,0,0)",
      }}>{props.text2 ?? "4246 7515 4553 5246"}</span>
      <div style={{
          position: "absolute",
          left: 287,
          top: 27,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconChevronDown />}</div>
    </div>
  );
  const __body16 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 48,
      borderRadius: 8,
      backgroundColor: "rgb(249,249,249)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 16,
        top: 11,
        width: 259,
        height: 27,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 1.7000000476837158,
        color: "rgb(181,181,181)",
      }}>{props.text1 ?? "Select Category"}</span>
      <div style={{
          position: "absolute",
          left: 287,
          top: 12,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconChevronDown />}</div>
    </div>
  );
  const __body17 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 48,
      borderRadius: 8,
      backgroundColor: "rgb(249,249,249)",
      position: "relative",
      ...props.style,
    }}>
      <span style={{
        position: "absolute",
        left: 16,
        top: 11,
        width: 259,
        height: 27,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 16,
        lineHeight: 1.7000000476837158,
        color: "rgb(0,0,0)",
      }}>{props.text1 ?? "Food & Drink"}</span>
      <div style={{
          position: "absolute",
          left: 287,
          top: 12,
          width: 24,
          height: 24,
        }}>{props.icon1 ?? <IconChevronDown />}</div>
    </div>
  );
  const __body18 = () => (
    <div className={props.className} style={{
      width: 327,
      borderRadius: 24,
      backgroundColor: "rgb(249,249,249)",
      display: "flex",
      flexDirection: "row",
      gap: 10,
      padding: "12px 16px 12px 16px",
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
        fontSize: 14,
        whiteSpace: "nowrap",
        lineHeight: 1.7000000476837158,
        color: "rgb(181,181,181)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.text1 ?? "Type your message"}</span>
    </div>
  );
  const __body19 = () => (
    <div className={props.className} style={{
      width: 327,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgb(249,249,249)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 16,
        top: 12,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 14,
          whiteSpace: "nowrap",
          lineHeight: 1.7000000476837158,
          color: "rgb(0,0,0)",
          flexShrink: 0,
        }}>{props.text1 ?? "Type your message"}</span>
        <div style={{
          position: "relative",
          width: 1,
          height: 24,
          backgroundColor: "rgb(31,108,255)",
          flexShrink: 0,
        }} />
      </div>
    </div>
  );
  const __impls = {
    // figma: Type=Contextual, State=Empty, Size=Medium, Sub-Type=Default
    "type=contextual|state=empty|subType=default|size=md": __body0,
    // figma: Type=Contextual, State=Typing, Size=Medium, Sub-Type=Default
    "type=contextual|state=typing|subType=default|size=md": __body1,
    // figma: Type=Contextual, State=Filled, Size=Medium, Sub-Type=Default
    "type=contextual|state=filled|subType=default|size=md": __body2,
    // figma: Type=Input Text, State=Empty, Size=Medium, Sub-Type=Default
    "type=input text|state=empty|subType=default|size=md": __body3,
    // figma: Type=Input Text, State=Typing, Size=Medium, Sub-Type=Default
    "type=input text|state=typing|subType=default|size=md": __body4,
    // figma: Type=Input Text, State=Error State, Size=Medium, Sub-Type=Default
    "type=input text|state=error state|subType=default|size=md": __body5,
    // figma: Type=Input Text, State=Filled, Size=Medium, Sub-Type=Default
    "type=input text|state=filled|subType=default|size=md": __body6,
    // figma: Type=With Label, State=Empty, Size=Medium, Sub-Type=Default
    "type=with label|state=empty|subType=default|size=md": __body7,
    // figma: Type=With Label, State=Filled, Size=Medium, Sub-Type=Default
    "type=with label|state=filled|subType=default|size=md": __body8,
    // figma: Type=With Label, State=Typing, Size=Medium, Sub-Type=Default
    "type=with label|state=typing|subType=default|size=md": __body9,
    // figma: Type=OTP, State=Empty, Size=Medium, Sub-Type=Default
    "type=otp|state=empty|subType=default|size=md": __body10,
    // figma: Type=OTP, State=Filled, Size=Medium, Sub-Type=Default
    "type=otp|state=filled|subType=default|size=md": __body11,
    // figma: Type=Pin, State=Filled, Size=Medium, Sub-Type=Default
    "type=pin|state=filled|subType=default|size=md": __body12,
    // figma: Type=Pin, State=Empty, Sub-Type=Default, Size=Medium
    "type=pin|state=empty|subType=default|size=md": __body13,
    // figma: Type=Selection, State=Filled, Size=Small, Sub-Type=Default
    "type=selection|state=filled|subType=default|size=sm": __body14,
    // figma: Type=Selection, State=Filled, Size=Medium, Sub-Type=Card
    "type=selection|state=filled|subType=card|size=md": __body15,
    // figma: Sub-Type=Default, Type=Selection, State=Empty, Size=Medium
    "type=selection|state=empty|subType=default|size=md": __body16,
    // figma: Type=Selection, State=Filled, Size=Medium, Sub-Type=Default
    "type=selection|state=filled|subType=default|size=md": __body17,
    // figma: Type=Chat, State=Empty
    "type=chat|state=empty|subType=|size=": __body18,
    // figma: Type=Chat, State=Typing, Size=Medium, Sub-Type=Default
    "type=chat|state=typing|subType=default|size=md": __body19,
  };
  return (__impls[__vkey(props)] ?? __body0)();
}
export default InputField;
