// figma node: 1034:7780 _Note Icon
export function NoteIcon(_p = {}) {
  const props = _p;
  return (
    <div className={props.className} style={{
      width: "fit-content",
      height: 14,
      display: "flex",
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      flexWrap: "nowrap",
      position: "relative",
      color: "rgb(255,255,255)",
      ...props.style,
    }}>
      <svg width={14} viewBox="0 0 14 14" fill="none" style={{
        position: "relative",
        width: 14,
        flexShrink: 0,
        alignSelf: "stretch",
      }}>
        <path d={"M 4.083 7.583 C 3.761 7.583 3.5 7.322 3.5 7 C 3.5 6.678 3.761 6.417 4.083 6.417 L 9.917 6.417 C 10.239 6.417 10.5 6.678 10.5 7 C 10.5 7.322 10.239 7.583 9.917 7.583 L 4.083 7.583 Z"} fill="currentColor" fillRule="evenodd" />
        <path d={"M 4.083 10.5 L 6.417 10.5 C 6.739 10.5 7 10.239 7 9.917 C 7 9.595 6.739 9.333 6.417 9.333 L 4.083 9.333 C 3.761 9.333 3.5 9.595 3.5 9.917 C 3.5 10.239 3.761 10.5 4.083 10.5 Z"} fill="currentColor" fillRule="evenodd" />
        <path d={"M 4.083 4.667 C 3.761 4.667 3.5 4.405 3.5 4.083 C 3.5 3.761 3.761 3.5 4.083 3.5 L 9.917 3.5 C 10.239 3.5 10.5 3.761 10.5 4.083 C 10.5 4.405 10.239 4.667 9.917 4.667 L 4.083 4.667 Z"} fill="currentColor" fillRule="evenodd" />
        <path d={"M 2.1 0 L 11.9 0 C 12.457 0.001 12.99 0.222 13.384 0.616 C 13.778 1.01 13.999 1.543 14 2.1 L 14 9.8 C 13.999 10.914 13.556 11.981 12.768 12.768 C 11.981 13.556 10.914 13.999 9.8 14 L 2.1 14 C 1.543 13.999 1.01 13.778 0.616 13.384 C 0.222 12.991 0.001 12.457 0 11.9 L 0 2.1 C 0.001 1.543 0.222 1.01 0.616 0.616 C 1.01 0.222 1.543 0.001 2.1 0 Z M 1.179 2.1 L 1.179 11.9 C 1.179 12.086 1.327 12.41 1.458 12.542 C 1.59 12.673 1.914 12.833 2.1 12.833 L 9.333 12.833 L 9.333 11.2 C 9.334 10.643 9.523 10.31 9.917 9.917 C 10.31 9.523 10.818 9.334 11.375 9.333 L 12.833 9.333 L 12.833 2.1 C 12.833 1.914 12.673 1.59 12.542 1.458 C 12.41 1.327 12.086 1.167 11.9 1.167 L 2.1 1.167 C 1.914 1.167 1.59 1.327 1.458 1.458 C 1.327 1.59 1.179 1.914 1.179 2.1 Z M 10.5 11.2 L 10.5 12.833 C 10.984 12.707 11.605 12.312 11.958 11.958 C 12.312 11.605 12.707 10.984 12.833 10.5 L 11.2 10.5 C 11.014 10.5 10.836 10.574 10.705 10.705 C 10.574 10.836 10.5 11.014 10.5 11.2 Z"} fill="currentColor" fillRule="nonzero" />
      </svg>
      <span style={{
        position: "relative",
        fontFamily: "Arial, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 400,
        fontSize: 14,
        whiteSpace: "nowrap",
        lineHeight: 1,
        color: "rgb(255,255,255)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.text1 ?? "Note"}</span>
    </div>
  );
}
export default NoteIcon;
