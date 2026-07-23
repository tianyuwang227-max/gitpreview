export interface ScreenshotOptions {
  url: string;
  width?: number;
  height?: number;
  fullPage?: boolean;
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp';
}

export interface ScreenshotResult {
  success: boolean;
  imagePath: string;
  url: string;
  timestamp: Date;
  metadata: {
    width: number;
    height: number;
    format: string;
    fileSize: number;
  };
}

export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}
