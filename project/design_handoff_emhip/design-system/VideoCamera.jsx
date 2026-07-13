// figma node: 916:11268 video-camera
export function VideoCamera(_p = {}) {
  const props = _p;
  return (
    <div className={props.className} style={{
      width: 20,
      height: 20,
      overflow: "hidden",
      position: "relative",
      color: "rgb(63,63,70)",
      ...props.style,
    }}>
      <svg width={16} height={12} viewBox="0 0 16 12" fill="none" style={{
        position: "absolute",
        left: 2,
        top: 4,
        width: 16,
        height: 12,
      }}>
        <path d={"M 0 2 C 0 1.47 0.211 0.961 0.586 0.586 C 0.961 0.211 1.47 0 2 0 L 8 0 C 8.53 0 9.039 0.211 9.414 0.586 C 9.789 0.961 10 1.47 10 2 L 10 10 C 10 10.53 9.789 11.039 9.414 11.414 C 9.039 11.789 8.53 12 8 12 L 2 12 C 1.47 12 0.961 11.789 0.586 11.414 C 0.211 11.039 0 10.53 0 10 L 0 2 Z M 12.553 3.106 C 12.387 3.189 12.247 3.317 12.15 3.474 C 12.052 3.632 12 3.814 12 4 L 12 8 C 12 8.186 12.052 8.368 12.15 8.526 C 12.247 8.683 12.387 8.811 12.553 8.894 L 14.553 9.894 C 14.705 9.97 14.875 10.006 15.045 9.998 C 15.215 9.991 15.381 9.94 15.526 9.85 C 15.671 9.761 15.79 9.636 15.873 9.487 C 15.956 9.338 16 9.17 16 9 L 16 3 C 16 2.83 15.956 2.662 15.873 2.513 C 15.79 2.364 15.671 2.239 15.526 2.15 C 15.381 2.06 15.215 2.009 15.045 2.002 C 14.875 1.994 14.705 2.03 14.553 2.106 L 12.553 3.106 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default VideoCamera;
