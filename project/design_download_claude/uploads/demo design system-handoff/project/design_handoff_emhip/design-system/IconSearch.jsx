// figma node: 50:5668 Icon/Search
export function IconSearch(_p = {}) {
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
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{
        position: "absolute",
        left: 2,
        top: 2,
        width: 20,
        height: 20,
      }}>
        <path d={"M 7 0 C 3.146 0 0 3.146 0 7 C 0 10.854 3.146 14 7 14 C 8.748 14 10.345 13.348 11.574 12.281 L 12 12.707 L 12 14 L 18 20 L 20 18 L 14 12 L 12.707 12 L 12.281 11.574 C 13.348 10.345 14 8.748 14 7 C 14 3.146 10.854 0 7 0 Z M 7 2 C 9.773 2 12 4.227 12 7 C 12 9.773 9.773 12 7 12 C 4.227 12 2 9.773 2 7 C 2 4.227 4.227 2 7 2 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default IconSearch;
