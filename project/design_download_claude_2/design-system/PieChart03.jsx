// figma node: 4:1304 pie-chart-03
export function PieChart03(_p = {}) {
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
        <path d={"M 10 0 C 11.313 0 12.614 0.259 13.827 0.761 C 15.04 1.264 16.142 2 17.071 2.929 C 18 3.858 18.736 4.96 19.239 6.173 C 19.741 7.386 20 8.687 20 10 L 10 10 L 10 0 Z"} fill="currentColor" fillRule="evenodd" />
        <path d={"M 20 10 C 20 11.578 19.627 13.134 18.91 14.54 C 18.194 15.946 17.155 17.163 15.878 18.09 L 10 10 L 20 10 Z"} fill="currentColor" fillRule="evenodd" />
        <path d={"M 20 10 C 20 15.523 15.523 20 10 20 C 4.477 20 0 15.523 0 10 C 0 4.477 4.477 0 10 0 C 15.523 0 20 4.477 20 10 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default PieChart03;
