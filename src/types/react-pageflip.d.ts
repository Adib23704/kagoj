declare module "react-pageflip" {
  import { Component, type CSSProperties, type ReactNode } from "react";

  export interface FlipEvent {
    data: number;
  }

  interface PageFlipProps {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    onFlip?: (e: { data: number }) => void;
    onChangeOrientation?: (e: { data: string }) => void;
    onChangeState?: (e: { data: string }) => void;
    className?: string;
    style?: CSSProperties;
    startPage?: number;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    renderOnlyPageLengthChange?: boolean;
    children: ReactNode;
  }

  export default class HTMLFlipBook extends Component<PageFlipProps> {
    pageFlip(): {
      flip(pageNum: number): void;
      flipNext(): void;
      flipPrev(): void;
      getCurrentPageIndex(): number;
      getPageCount(): number;
    };
  }
}
