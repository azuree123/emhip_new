import * as React from 'react';
export interface InputFieldProps {
  className?: string;
  style?: React.CSSProperties;
  type?: "contextual" | "input text" | "with label" | "otp" | "pin" | "selection" | "chat";
  state?: "empty" | "error state" | "filled" | "typing";
  subType?: "default" | "card";
  size?: "md" | "sm";
  /** Text content; defaults to "Input field filled". */
  text1?: string;
  /** Text content; defaults to "1 January 2021". */
  text2?: string;
  /** Text content; defaults to "1". */
  text3?: string;
  /** Text content; defaults to "1". */
  text4?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}
export declare const InputField: React.FC<InputFieldProps>;
export default InputField;
