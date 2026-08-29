// figma node: 4:1318 trash-01
export function Trash01(_p = {}) {
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
      <svg width={18} height={20} viewBox="0 0 18 20" fill="none" style={{
        position: "absolute",
        left: 3,
        top: 2,
        width: 18,
        height: 20,
      }}>
        <path d={"M 0 4 L 18 4 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default Trash01;
