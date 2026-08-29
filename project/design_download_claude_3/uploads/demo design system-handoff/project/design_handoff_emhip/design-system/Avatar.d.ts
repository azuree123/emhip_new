import * as React from 'react';
export interface AvatarProps {
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
  content?: "initials" | "image" | "icon";
  initials?: string;
  face?: React.ReactNode;
  size?: "xl" | "l" | "m" | "s" | "xs" | "xxs";
  badgeBottom?: boolean;
  badgeTop?: boolean;
  circle?: boolean;
  /** Text content; defaults to "J". */
  text1?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
  /** Swappable nested instance; defaults to the design's. */
  icon2?: React.ReactNode;
}
export declare const Avatar: React.FC<AvatarProps>;
export default Avatar;
