import * as React from 'react';
export interface TileProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "⛺". */
  text1?: string;
  /** Text content; defaults to "Section 5.1-Service-level dashboard reporting". */
  text2?: string;
  /** Text content; defaults to "Covers total active, new, and on-hold guest counts, urgent case monitoring, pathway distribution, caseload per CMHW, guests seen today/week/month, and activity feed. The spec required all of these as named dashboard elements. Included because hub managers need a single morning view to understand the state of the service without opening individual records.". */
  text3?: string;
}
export declare const Tile: React.FC<TileProps>;
export default Tile;
