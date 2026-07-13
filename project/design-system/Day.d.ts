import * as React from 'react';
export interface DayProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "SUN". */
  text1?: string;
  /** Text content; defaults to "21". */
  text2?: string;
}
export declare const Day: React.FC<DayProps>;
export default Day;
