// figma node: 50:5677 Icon/Eye-Show
export function IconEyeShow(_p = {}) {
  const props = _p;
  return (
    <div className={props.className} style={{
      width: 24,
      height: 24,
      overflow: "hidden",
      position: "relative",
      color: "rgb(255,153,0)",
      ...props.style,
    }}>
      <svg width={22} height={16} viewBox="0 0 22 16" fill="none" style={{
        position: "absolute",
        left: 1,
        top: 4,
        width: 22,
        height: 16,
      }}>
        <path d={"M 11 0 C 3 0 0 8 0 8 C 0 8 3 16 11 16 C 19 16 22 8 22 8 C 22 8 19 0 11 0 Z M 11 3 C 13.761 3 16 5.239 16 8 C 16 10.761 13.761 13 11 13 C 8.239 13 6 10.761 6 8 C 6 5.239 8.239 3 11 3 Z M 11 5 C 10.204 5 9.441 5.316 8.879 5.879 C 8.316 6.441 8 7.204 8 8 C 8 8.796 8.316 9.559 8.879 10.121 C 9.441 10.684 10.204 11 11 11 C 11.796 11 12.559 10.684 13.121 10.121 C 13.684 9.559 14 8.796 14 8 C 14 7.204 13.684 6.441 13.121 5.879 C 12.559 5.316 11.796 5 11 5 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default IconEyeShow;
