import * as React from 'react';
export interface BaseLabelProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "Label". */
  text1?: string;
}
export declare const BaseLabel: React.FC<BaseLabelProps>;
export default BaseLabel;
