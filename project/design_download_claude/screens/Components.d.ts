// Components.d.ts — the complete catalog of the 11 component(s) in
// Components.bundle.js. READ THIS FILE BEFORE USING THE BUNDLE: component
// names are derived from Figma layer names (sanitized to PascalCase,
// deduplicated) and may differ from what the design calls them — the
// "figma layer" comment above each interface maps them back.
// After the bundle <script> loads, every component is a window global
// (e.g. window.Dashboard) and usable directly in JSX.
import * as React from 'react';

// figma layer: "Dashboard" (node 356:1140)
export interface DashboardProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Dashboard" (node 356:1438)
export interface Dashboard2Props {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Desktop - 34" (node 492:27221)
export interface Desktop34Props {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Desktop - 46" (node 558:34276)
export interface Desktop46Props {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Desktop - 50" (node 641:44848)
export interface Desktop50Props {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Dmegographics Tab" (node 405:8338)
export interface DmegographicsTabProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Guest (Data Sheet)" (node 414:12476)
export interface GuestDataSheetProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Guest - Overview Tab" (node 453:22532)
export interface GuestOverviewTabProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "icon / outline / arrow-left-short" (node 50:4348)
export interface IconOutlineArrowLeftShortProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "icon / outline / arrow-right-short" (node 50:5662)
export interface IconOutlineArrowRightShortProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Initial Conversation Tab" (node 405:8819)
export interface InitialConversationTabProps {
  className?: string;
  style?: React.CSSProperties;
}

declare const Dashboard: React.FC<DashboardProps>;
declare const Dashboard2: React.FC<Dashboard2Props>;
declare const Desktop34: React.FC<Desktop34Props>;
declare const Desktop46: React.FC<Desktop46Props>;
declare const Desktop50: React.FC<Desktop50Props>;
declare const DmegographicsTab: React.FC<DmegographicsTabProps>;
declare const GuestDataSheet: React.FC<GuestDataSheetProps>;
declare const GuestOverviewTab: React.FC<GuestOverviewTabProps>;
declare const IconOutlineArrowLeftShort: React.FC<IconOutlineArrowLeftShortProps>;
declare const IconOutlineArrowRightShort: React.FC<IconOutlineArrowRightShortProps>;
declare const InitialConversationTab: React.FC<InitialConversationTabProps>;
declare global {
  interface Window {
    Dashboard: React.FC<DashboardProps>;
    Dashboard2: React.FC<Dashboard2Props>;
    Desktop34: React.FC<Desktop34Props>;
    Desktop46: React.FC<Desktop46Props>;
    Desktop50: React.FC<Desktop50Props>;
    DmegographicsTab: React.FC<DmegographicsTabProps>;
    GuestDataSheet: React.FC<GuestDataSheetProps>;
    GuestOverviewTab: React.FC<GuestOverviewTabProps>;
    IconOutlineArrowLeftShort: React.FC<IconOutlineArrowLeftShortProps>;
    IconOutlineArrowRightShort: React.FC<IconOutlineArrowRightShortProps>;
    InitialConversationTab: React.FC<InitialConversationTabProps>;
  }
}
