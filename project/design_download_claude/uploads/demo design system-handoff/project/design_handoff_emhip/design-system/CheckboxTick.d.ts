import * as React from 'react';
export interface CheckboxTickProps {
  className?: string;
  style?: React.CSSProperties;
  state?: "inactive" | "active";
  hover?: "off" | "on";
}
export declare const CheckboxTick: React.FC<CheckboxTickProps>;
export default CheckboxTick;
