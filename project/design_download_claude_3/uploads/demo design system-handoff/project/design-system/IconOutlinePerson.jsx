// figma node: 50:4356 icon / outline / person
export function IconOutlinePerson(_p = {}) {
  const props = _p;
  return (
    <div className={props.className} style={{
      width: 24,
      height: 24,
      overflow: "hidden",
      position: "relative",
      color: "var(--surface-default-main-reversed)",
      ...props.style,
    }}>
      <svg width={18} height={18} viewBox="0 0 18 18" fill="none" style={{
        position: "absolute",
        left: 3,
        top: 3,
        width: 18,
        height: 18,
      }}>
        <path d={"M 9 9 C 10.193 9 11.338 8.526 12.182 7.682 C 13.026 6.838 13.5 5.693 13.5 4.5 C 13.5 3.307 13.026 2.162 12.182 1.318 C 11.338 0.474 10.193 0 9 0 C 7.807 0 6.662 0.474 5.818 1.318 C 4.974 2.162 4.5 3.307 4.5 4.5 C 4.5 5.693 4.974 6.838 5.818 7.682 C 6.662 8.526 7.807 9 9 9 Z M 12 4.5 C 12 5.296 11.684 6.059 11.121 6.621 C 10.559 7.184 9.796 7.5 9 7.5 C 8.204 7.5 7.441 7.184 6.879 6.621 C 6.316 6.059 6 5.296 6 4.5 C 6 3.704 6.316 2.941 6.879 2.379 C 7.441 1.816 8.204 1.5 9 1.5 C 9.796 1.5 10.559 1.816 11.121 2.379 C 11.684 2.941 12 3.704 12 4.5 Z M 18 16.5 C 18 18 16.5 18 16.5 18 L 1.5 18 C 1.5 18 0 18 0 16.5 C 0 15 1.5 10.5 9 10.5 C 16.5 10.5 18 15 18 16.5 Z M 16.5 16.494 C 16.498 16.125 16.269 15.015 15.252 13.998 C 14.274 13.02 12.434 12 9 12 C 5.566 12 3.726 13.02 2.748 13.998 C 1.731 15.015 1.503 16.125 1.5 16.494 L 16.5 16.494 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default IconOutlinePerson;
