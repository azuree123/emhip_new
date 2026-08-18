// figma node: 4:1314 chevron-selector-vertical
export function ChevronSelectorVertical(_p = {}) {
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
      <svg width={10} height={16} viewBox="0 0 10 16" fill="none" style={{
        position: "absolute",
        left: 7,
        top: 4,
        width: 10,
        height: 16,
      }}>
        <path d={"M 0 11 L 5 16 L 10 11 Z"} fill="currentColor" fillRule="evenodd" />
        <path d={"M 0 5 L 5 0 L 10 5 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default ChevronSelectorVertical;
