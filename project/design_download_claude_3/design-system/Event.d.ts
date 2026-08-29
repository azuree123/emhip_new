import * as React from 'react';
export interface EventProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "8:00". */
  text1?: string;
  /** Text content; defaults to "AM". */
  text2?: string;
  /** Text content; defaults to "Monday Wake-Up Hour". */
  text3?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}
export declare const Event: React.FC<EventProps>;
export default Event;
