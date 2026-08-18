import * as React from 'react';
export interface NoteDetailsProps {
  className?: string;
  style?: React.CSSProperties;
  number?: string;
  showTitle?: boolean;
  title?: string;
  additionalDetails?: string;
  includeCode?: boolean;
  code?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}
export declare const NoteDetails: React.FC<NoteDetailsProps>;
export default NoteDetails;
