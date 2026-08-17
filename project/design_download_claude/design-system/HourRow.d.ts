import * as React from 'react';
export interface HourRowProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "7 AM". */
  text1?: string;
  /** Text content; defaults to "7 AM". */
  text2?: string;
}
export declare const HourRow: React.FC<HourRowProps>;
export default HourRow;
