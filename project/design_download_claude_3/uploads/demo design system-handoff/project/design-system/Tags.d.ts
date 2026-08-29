import * as React from 'react';
export interface TagsProps {
  className?: string;
  style?: React.CSSProperties;
  tagText?: string;
  property1?: "type 1" | "type 2";
  tagText2?: string;
}
export declare const Tags: React.FC<TagsProps>;
export default Tags;
