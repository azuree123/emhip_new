import * as React from 'react';
export interface ChipProps {
  className?: string;
  style?: React.CSSProperties;
  instance?: React.ReactNode;
  text?: "customer" | "churned";
  showIcons?: boolean;
  /** Text content; defaults to "Churned". */
  text1?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}
export declare const Chip: React.FC<ChipProps>;
export default Chip;
