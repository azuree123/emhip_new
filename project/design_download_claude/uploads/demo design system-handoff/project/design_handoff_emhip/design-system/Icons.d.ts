import * as React from 'react';
export interface IconsProps {
  className?: string;
  style?: React.CSSProperties;
  name?: "bell" | "chevron" | "edit" | "chat" | "search" | "settings" | "trash" | "home" | "grid" | "layers" | "user" | "check" | "pie chart" | "arrow-narrow-up" | "upload-cloud-01" | "filter-lines" | "x-close" | "dots-vertical" | "plus" | "arrow-narrow-down" | "check-verified-02" | "check filled";
  color?: "default" | "primary";
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}
export declare const Icons: React.FC<IconsProps>;
export default Icons;
