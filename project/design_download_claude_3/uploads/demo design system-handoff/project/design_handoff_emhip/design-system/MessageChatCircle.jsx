// figma node: 4:1310 message-chat-circle
export function MessageChatCircle(_p = {}) {
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
      <svg width={20.105} height={20} viewBox="0 0 20.105 20" fill="none" style={{
        position: "absolute",
        left: 2,
        top: 2,
        width: 20.105,
        height: 20,
      }}>
        <path d={"M 5.632 20 C 8.596 20 11 17.538 11 14.5 M 3.882 19.701 C 4.431 19.895 5.019 20 5.632 20 M 3.882 19.701 C 3.674 19.628 3.57 19.591 3.5 19.577 C 3.426 19.563 3.387 19.559 3.311 19.558 C 3.24 19.558 3.158 19.569 2.995 19.591 L 0 20 L 0.611 17.238 C 0.651 17.057 0.671 16.967 0.676 16.887 C 0.681 16.803 0.679 16.757 0.666 16.674 C 0.653 16.595 0.615 16.479 0.54 16.247 C 0.36 15.698 0.263 15.111 0.263 14.5 C 0.263 11.462 2.667 9 5.632 9 C 8.596 9 11 11.462 11 14.5 Z"} fill="currentColor" fillRule="evenodd" />
      </svg>
    </div>
  );
}
export default MessageChatCircle;
