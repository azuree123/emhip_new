import * as React from 'react';
export interface NoteStampProps {
  className?: string;
  style?: React.CSSProperties;
  showPin?: boolean;
  number?: string;
  stampPosition?: "left" | "right" | "above" | "below" | "center";
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}
export declare const NoteStamp: React.FC<NoteStampProps>;
export default NoteStamp;
