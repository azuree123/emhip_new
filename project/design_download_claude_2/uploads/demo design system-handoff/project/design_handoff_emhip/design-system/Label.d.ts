import * as React from 'react';
export interface LabelProps {
  className?: string;
  style?: React.CSSProperties;
  property1?: "archive" | "development" | "design";
}
export declare const Label: React.FC<LabelProps>;
export default Label;
