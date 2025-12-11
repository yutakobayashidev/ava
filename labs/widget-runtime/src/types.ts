/**
 * Widget asset configuration
 */
export interface WidgetAsset {
  /** Inline CSS content */
  css?: string;
  /** Inline JS content */
  js?: string;
  /** External script source URL */
  scriptSrc?: string;
}

/**
 * Widget shell props
 */
export interface WidgetShellProps {
  widgetName: string;
  css?: string;
  inlineJs?: string;
  scriptSrc?: string;
}
