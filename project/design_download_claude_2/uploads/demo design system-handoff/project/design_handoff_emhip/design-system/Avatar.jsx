import { BadgeNumberDot } from './BadgeNumberDot.jsx';
import { Face01 } from './Face01.jsx';
import { IconOutlinePerson } from './IconOutlinePerson.jsx';

// figma node: 50:5489 Avatar (36 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "content=" + __venc(p.content) + '|' + "size=" + __venc(p.size) + '|' + "circle=" + __venc(p.circle);

export function Avatar(_p = {}) {
  const props = { ..._p, content: _p.content ?? "initials", initials: _p.initials ?? "JD", size: _p.size ?? "xl", badgeBottom: _p.badgeBottom ?? true, badgeTop: _p.badgeTop ?? true, circle: _p.circle ?? false };
  const __body0 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 64,
        borderRadius: 8,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 20,
          whiteSpace: "nowrap",
          lineHeight: "30px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.initials}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 48,
          top: -4,
          height: 20,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 52,
          top: 52,
          width: 16,
          height: 16,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"m"} />}</div>
      )}
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 48,
        borderRadius: 8,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 18,
          whiteSpace: "nowrap",
          lineHeight: "28px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.initials}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 36,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 39,
          top: 39,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body2 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 40,
        borderRadius: 8,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 16,
          whiteSpace: "nowrap",
          lineHeight: "24px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.initials}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 28,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 30,
          top: 30,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body3 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 32,
        borderRadius: 4,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 14,
          whiteSpace: "nowrap",
          lineHeight: "20px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.initials}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 20,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 26,
          top: 26,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body4 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 24,
        borderRadius: 2,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 12,
          whiteSpace: "nowrap",
          lineHeight: "16px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.text1 ?? "J"}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 15,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 18,
          top: 18,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body5 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: "calc(var(--size-4) * 1px)",
        borderRadius: 2,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 10,
          whiteSpace: "nowrap",
          lineHeight: "14px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.text1 ?? "J"}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 11,
          top: -3,
          width: 8,
          height: 8,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 13,
          top: 13,
          width: 4,
          height: 4,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xxs"} />}</div>
      )}
    </div>
  );
  const __body6 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 64,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 20,
          whiteSpace: "nowrap",
          lineHeight: "30px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.initials}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 44,
          top: 0,
          height: 20,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 48,
          top: 48,
          width: 16,
          height: 16,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"m"} />}</div>
      )}
    </div>
  );
  const __body7 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 48,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 18,
          whiteSpace: "nowrap",
          lineHeight: "28px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.initials}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 33,
          top: -1,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 36,
          top: 36,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body8 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 40,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 16,
          whiteSpace: "nowrap",
          lineHeight: "24px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.initials}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 20,
          top: -2,
          height: 16,
          width: 22,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 28,
          top: 28,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body9 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 32,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 14,
          whiteSpace: "nowrap",
          lineHeight: "20px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.initials}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 20,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 24,
          top: 24,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body10 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 24,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 12,
          whiteSpace: "nowrap",
          lineHeight: "16px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
        }}>{props.text1 ?? "J"}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 14,
          top: -6,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 16,
          top: 16,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body11 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: "calc(var(--size-4) * 1px)",
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <span style={{
          position: "relative",
          opacity: 0.6,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 700,
          fontSize: 10,
          whiteSpace: "nowrap",
          lineHeight: "14px",
          letterSpacing: "0.005em",
          color: "var(--text-brand-solid)",
          flexShrink: 0,
          alignSelf: "stretch",
        }}>{props.text1 ?? "J"}</span>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 11,
          top: -3,
          width: 8,
          height: 8,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 4,
          height: 4,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xxs"} />}</div>
      )}
    </div>
  );
  const __body12 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 64,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 48,
          top: -4,
          height: 20,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 52,
          top: 52,
          width: 16,
          height: 16,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"m"} />}</div>
      )}
    </div>
  );
  const __body13 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 48,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 36,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 39,
          top: 39,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body14 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 40,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 28,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 30,
          top: 30,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body15 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 32,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 20,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 26,
          top: 26,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body16 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 24,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 15,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 18,
          top: 18,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body17 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 16,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 11,
          top: -3,
          width: 8,
          height: 8,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 13,
          top: 13,
          width: 4,
          height: 4,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xxs"} />}</div>
      )}
    </div>
  );
  const __body18 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 64,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 42,
          top: 0,
          height: 20,
          width: 28,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 48,
          top: 48,
          width: 16,
          height: 16,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"m"} />}</div>
      )}
    </div>
  );
  const __body19 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 48,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 33,
          top: -1,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 36,
          top: 36,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body20 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 40,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 26,
          top: -2,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 28,
          top: 28,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body21 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 32,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 20,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 24,
          top: 24,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body22 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 24,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 14,
          top: -6,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 16,
          top: 16,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body23 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
          position: "relative",
          height: 16,
          flexShrink: 0,
          alignSelf: "stretch",
          width: "auto",
        }}>{props.face ?? <Face01 />}</div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 11,
          top: -3,
          width: 8,
          height: 8,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 4,
          height: 4,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xxs"} />}</div>
      )}
    </div>
  );
  const __body24 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 64,
        borderRadius: 8,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 32,
            height: 32,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(1.333, 1.333)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 40,
          top: -4,
          height: 20,
          width: 28,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 52,
          top: 53,
          width: 16,
          height: 16,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"m"} />}</div>
      )}
    </div>
  );
  const __body25 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 48,
        borderRadius: 8,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 24,
            height: 24,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 36,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 39,
          top: 39,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body26 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 40,
        borderRadius: 8,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 20,
            height: 20,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(0.833, 0.833)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 28,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 30,
          top: 30,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body27 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 32,
        borderRadius: 4,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 18,
            height: 18,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(0.750, 0.750)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 20,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 26,
          top: 26,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body28 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 24,
        borderRadius: 2,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 16,
            height: 16,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(0.667, 0.667)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 15,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 18,
          top: 18,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body29 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: "calc(var(--size-4) * 1px)",
        borderRadius: 2,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 12,
            height: 12,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(0.500, 0.500)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 11,
          top: -3,
          width: 8,
          height: 8,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 13,
          top: 13,
          width: 4,
          height: 4,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xxs"} />}</div>
      )}
    </div>
  );
  const __body30 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 64,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 32,
            height: 32,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(1.333, 1.333)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 44,
          top: 0,
          height: 20,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 48,
          top: 48,
          width: 16,
          height: 16,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"m"} />}</div>
      )}
    </div>
  );
  const __body31 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 48,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 24,
            height: 24,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 33,
          top: -1,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 36,
          top: 36,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body32 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 40,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 20,
            height: 20,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(0.833, 0.833)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 26,
          top: -2,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 28,
          top: 28,
          width: 12,
          height: 12,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"s"} />}</div>
      )}
    </div>
  );
  const __body33 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 32,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 18,
            height: 18,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(0.750, 0.750)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 20,
          top: -4,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 24,
          top: 24,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body34 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: 24,
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 16,
            height: 16,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(0.667, 0.667)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 14,
          top: -6,
          height: 16,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"number"} size={"xxs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 16,
          top: 16,
          width: 8,
          height: 8,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
    </div>
  );
  const __body35 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "relative",
        height: "calc(var(--size-4) * 1px)",
        borderRadius: 9999,
        backgroundColor: "var(--surface-brand-light)",
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <div style={{
            position: "relative",
            width: 12,
            height: 12,
            flexShrink: 0,
            color: "rgb(99,102,241)",
          }}>{props.icon ?? <IconOutlinePerson style={{ transform: "scale(0.500, 0.500)", transformOrigin: "0 0" }} />}</div>
      </div>
      {props.badgeTop && (
      <div style={{
          position: "absolute",
          left: 11,
          top: -3,
          width: 8,
          height: 8,
        }}>{props.icon1 ?? <BadgeNumberDot color={"danger"} style2={"filled - solid"} type={"dot"} size={"xs"} />}</div>
      )}
      {props.badgeBottom && (
      <div style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 4,
          height: 4,
        }}>{props.icon2 ?? <BadgeNumberDot number={"9"} color={"success"} style2={"filled - solid"} type={"dot"} size={"xxs"} />}</div>
      )}
    </div>
  );
  const __impls = {
    // figma: Content=Initials, Size=XL, Circle=False
    "content=initials|size=xl|circle=false": __body0,
    // figma: Content=Initials, Size=L, Circle=False
    "content=initials|size=l|circle=false": __body1,
    // figma: Content=Initials, Size=M, Circle=False
    "content=initials|size=m|circle=false": __body2,
    // figma: Content=Initials, Size=S, Circle=False
    "content=initials|size=s|circle=false": __body3,
    // figma: Content=Initials, Size=XS, Circle=False
    "content=initials|size=xs|circle=false": __body4,
    // figma: Content=Initials, Size=XXS, Circle=False
    "content=initials|size=xxs|circle=false": __body5,
    // figma: Content=Initials, Size=XL, Circle=True
    "content=initials|size=xl|circle=true": __body6,
    // figma: Content=Initials, Size=L, Circle=True
    "content=initials|size=l|circle=true": __body7,
    // figma: Content=Initials, Size=M, Circle=True
    "content=initials|size=m|circle=true": __body8,
    // figma: Content=Initials, Size=S, Circle=True
    "content=initials|size=s|circle=true": __body9,
    // figma: Content=Initials, Size=XS, Circle=True
    "content=initials|size=xs|circle=true": __body10,
    // figma: Content=Initials, Size=XXS, Circle=True
    "content=initials|size=xxs|circle=true": __body11,
    // figma: Content=Image, Size=XL, Circle=False
    "content=image|size=xl|circle=false": __body12,
    // figma: Content=Image, Size=L, Circle=False
    "content=image|size=l|circle=false": __body13,
    // figma: Content=Image, Size=M, Circle=False
    "content=image|size=m|circle=false": __body14,
    // figma: Content=Image, Size=S, Circle=False
    "content=image|size=s|circle=false": __body15,
    // figma: Content=Image, Size=XS, Circle=False
    "content=image|size=xs|circle=false": __body16,
    // figma: Content=Image, Size=XXS, Circle=False
    "content=image|size=xxs|circle=false": __body17,
    // figma: Content=Image, Size=XL, Circle=True
    "content=image|size=xl|circle=true": __body18,
    // figma: Content=Image, Size=L, Circle=True
    "content=image|size=l|circle=true": __body19,
    // figma: Content=Image, Size=M, Circle=True
    "content=image|size=m|circle=true": __body20,
    // figma: Content=Image, Size=S, Circle=True
    "content=image|size=s|circle=true": __body21,
    // figma: Content=Image, Size=XS, Circle=True
    "content=image|size=xs|circle=true": __body22,
    // figma: Content=Image, Size=XXS, Circle=True
    "content=image|size=xxs|circle=true": __body23,
    // figma: Content=Icon, Size=XL, Circle=False
    "content=icon|size=xl|circle=false": __body24,
    // figma: Content=Icon, Size=L, Circle=False
    "content=icon|size=l|circle=false": __body25,
    // figma: Content=Icon, Size=M, Circle=False
    "content=icon|size=m|circle=false": __body26,
    // figma: Content=Icon, Size=S, Circle=False
    "content=icon|size=s|circle=false": __body27,
    // figma: Content=Icon, Size=XS, Circle=False
    "content=icon|size=xs|circle=false": __body28,
    // figma: Content=Icon, Size=XXS, Circle=False
    "content=icon|size=xxs|circle=false": __body29,
    // figma: Content=Icon, Size=XL, Circle=True
    "content=icon|size=xl|circle=true": __body30,
    // figma: Content=Icon, Size=L, Circle=True
    "content=icon|size=l|circle=true": __body31,
    // figma: Content=Icon, Size=M, Circle=True
    "content=icon|size=m|circle=true": __body32,
    // figma: Content=Icon, Size=S, Circle=True
    "content=icon|size=s|circle=true": __body33,
    // figma: Content=Icon, Size=XS, Circle=True
    "content=icon|size=xs|circle=true": __body34,
    // figma: Content=Icon, Size=XXS, Circle=True
    "content=icon|size=xxs|circle=true": __body35,
  };
  return (__impls[__vkey(props)] ?? __body0)();
}
export default Avatar;
