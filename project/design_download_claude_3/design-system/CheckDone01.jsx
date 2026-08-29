// figma node: 4:1302 check-done-01
export function CheckDone01(_p = {}) {
  const props = _p;
  return (
    <div className={props.className} style={{
      width: 24,
      height: 24,
      overflow: "hidden",
      position: "relative",
      color: "rgb(0,0,0)",
      ...props.style,
    }}>
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{
        position: "absolute",
        left: 2,
        top: 2,
        width: 20,
        height: 20,
      }}>
        <path d={"M 0 9.2 C 0 8.08 0 7.52 0.218 7.092 C 0.41 6.716 0.716 6.41 1.092 6.218 C 1.52 6 2.08 6 3.2 6 L 10.8 6 C 11.92 6 12.48 6 12.908 6.218 C 13.284 6.41 13.59 6.716 13.782 7.092 C 14 7.52 14 8.08 14 9.2 L 14 16.8 C 14 17.92 14 18.48 13.782 18.908 C 13.59 19.284 13.284 19.59 12.908 19.782 C 12.48 20 11.92 20 10.8 20 L 3.2 20 C 2.08 20 1.52 20 1.092 19.782 C 0.716 19.59 0.41 19.284 0.218 18.908 C 0 18.48 0 17.92 0 16.8 L 0 9.2 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default CheckDone01;
