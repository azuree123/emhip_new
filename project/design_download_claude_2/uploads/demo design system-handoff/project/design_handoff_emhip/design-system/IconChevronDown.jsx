// figma node: 50:5683 Icon/Chevron/Down
export function IconChevronDown(_p = {}) {
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
      <svg width={11.263} height={6.718} viewBox="0 0 11.263 6.718" fill="none" style={{
        position: "absolute",
        left: 6.368,
        top: 9.939,
        width: 11.263,
        height: 6.718,
      }}>
        <path d={"M 5.632 4.132 L 1.811 0.31 C 1.397 -0.104 0.725 -0.104 0.31 0.31 C -0.104 0.725 -0.104 1.397 0.31 1.811 L 4.925 6.425 C 5.316 6.816 5.949 6.816 6.339 6.425 L 10.952 1.811 C 11.366 1.397 11.366 0.725 10.952 0.31 C 10.538 -0.104 9.867 -0.104 9.453 0.31 L 5.632 4.132 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default IconChevronDown;
