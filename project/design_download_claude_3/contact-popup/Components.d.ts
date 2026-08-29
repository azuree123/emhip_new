// Components.d.ts — the complete catalog of the 4 component(s) in
// Components.bundle.js. READ THIS FILE BEFORE USING THE BUNDLE: component
// names are derived from Figma layer names (sanitized to PascalCase,
// deduplicated) and may differ from what the design calls them — the
// "figma layer" comment above each interface maps them back.
// After the bundle <script> loads, every component is a window global
// (e.g. window.GuestOverviewTab) and usable directly in JSX.
import * as React from 'react';

// figma layer: "Guest - Overview Tab" (node 1:234)
export interface GuestOverviewTabProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Guest - Overview Tab" (node 1:450)
export interface GuestOverviewTab2Props {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Guest - Overview Tab" (node 1:707)
export interface GuestOverviewTab3Props {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Guest - Overview Tab" (node 1:1159)
export interface GuestOverviewTab4Props {
  className?: string;
  style?: React.CSSProperties;
}

declare const GuestOverviewTab: React.FC<GuestOverviewTabProps>;
declare const GuestOverviewTab2: React.FC<GuestOverviewTab2Props>;
declare const GuestOverviewTab3: React.FC<GuestOverviewTab3Props>;
declare const GuestOverviewTab4: React.FC<GuestOverviewTab4Props>;
declare global {
  interface Window {
    GuestOverviewTab: React.FC<GuestOverviewTabProps>;
    GuestOverviewTab2: React.FC<GuestOverviewTab2Props>;
    GuestOverviewTab3: React.FC<GuestOverviewTab3Props>;
    GuestOverviewTab4: React.FC<GuestOverviewTab4Props>;
  }
}
