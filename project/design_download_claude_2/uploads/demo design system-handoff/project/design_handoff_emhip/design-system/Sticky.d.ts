import * as React from 'react';
export interface StickyProps {
  className?: string;
  style?: React.CSSProperties;
  property1?: "query sticky" | "info sticky" | "issues";
  /** Text content; defaults to "✋". */
  text1?: string;
  /** Text content; defaults to "Query to Product/Devs". */
  text2?: string;
  /** Text content; defaults to "Use this sticky to raise queries with the concerned team or individuals". */
  text3?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}
export declare const Sticky: React.FC<StickyProps>;
export default Sticky;
