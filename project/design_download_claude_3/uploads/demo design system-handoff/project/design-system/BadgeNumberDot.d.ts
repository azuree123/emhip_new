import * as React from 'react';
export interface BadgeNumberDotProps {
  className?: string;
  style?: React.CSSProperties;
  color?: "primary" | "secondary" | "success" | "danger" | "warning" | "orange" | "lime" | "teal" | "sky" | "blue" | "violet" | "purple" | "fuchsia" | "pink";
  number?: string;
  style2?: "filled - solid" | "filled - light" | "outlined - solid" | "outlined - light" | "outlined - grey";
  type?: "number" | "dot";
  size?: "xxs" | "xs" | "s" | "m";
}
export declare const BadgeNumberDot: React.FC<BadgeNumberDotProps>;
export default BadgeNumberDot;
