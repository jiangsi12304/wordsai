declare module "react-signature-pad" {
  import { Component } from "react";

  export interface SignaturePadProps {
    canvasProps?: React.HTMLAttributes<HTMLCanvasElement>;
    onBegin?: () => void;
    onEnd?: () => void;
    width?: number | string;
    height?: number | string;
    clearOnResize?: boolean;
  }

  export default class SignaturePad extends Component<SignaturePadProps> {
    toDataURL(): string;
    fromDataURL(dataUrl: string): void;
    clear(): void;
    isEmpty(): boolean;
    penColor: string;
    minWidth: number;
    maxWidth: number;
    velocityFilterWeight: number;
  }
}
