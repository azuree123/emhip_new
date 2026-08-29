import * as React from 'react';
export interface StickyNoteGreenProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "add your findings here". */
  text1?: string;
}
export declare const StickyNoteGreen: React.FC<StickyNoteGreenProps>;
export default StickyNoteGreen;
