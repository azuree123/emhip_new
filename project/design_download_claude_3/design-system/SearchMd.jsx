// figma node: 4:1320 search-md
export function SearchMd(_p = {}) {
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
      <svg width={18} height={18} viewBox="0 0 18 18" fill="none" style={{
        position: "absolute",
        left: 3,
        top: 3,
        width: 18,
        height: 18,
      }}>
        <path d={"M 16 8 C 16 12.418 12.418 16 8 16 M 8 0 C 12.418 0 16 3.582 16 8 M 0 8 C 0 3.582 3.582 0 8 0 M 8 16 C 3.582 16 0 12.418 0 8 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default SearchMd;
