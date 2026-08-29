import * as React from 'react';
export interface NoteIconProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "Note". */
  text1?: string;
}
export declare const NoteIcon: React.FC<NoteIconProps>;
export default NoteIcon;
