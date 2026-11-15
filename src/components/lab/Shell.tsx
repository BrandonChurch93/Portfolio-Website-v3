import { forwardRef, type HTMLAttributes } from 'react';

// What a section's page stands in: the page's main element when it is the page, and a plain block when the section
// is one of several on a page that has its own.
export const Shell = forwardRef<HTMLElement, HTMLAttributes<HTMLElement> & { 'data-embed'?: string; 'data-wide'?: boolean }>(function Shell(props, ref) {
  return props['data-embed'] === undefined ? <main ref={ref} {...props} /> : <div ref={ref as React.Ref<HTMLDivElement>} {...props} />;
});
