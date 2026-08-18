import * as React from 'react';
export interface PriorityProps {
  className?: string;
  style?: React.CSSProperties;
  high?: string;
  property1?: "high" | "medium" | "low";
  medium?: string;
  low?: string;
}
export declare const Priority: React.FC<PriorityProps>;
export default Priority;
