'use client';

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

export function AutoResizeTextarea({ style, rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resize = () => {
      textarea.style.height = 'auto';
      const borderHeight = textarea.offsetHeight - textarea.clientHeight;
      textarea.style.height = `${textarea.scrollHeight + borderHeight}px`;
    };
    resize();

    let width = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === width) return;
      width = textarea.clientWidth;
      resize();
    });
    observer.observe(textarea);
    textarea.addEventListener('input', resize);

    let resetFrame = 0;
    const reset = () => {
      cancelAnimationFrame(resetFrame);
      resetFrame = requestAnimationFrame(resize);
    };
    const form = textarea.form;
    form?.addEventListener('reset', reset);

    return () => {
      observer.disconnect();
      textarea.removeEventListener('input', resize);
      form?.removeEventListener('reset', reset);
      cancelAnimationFrame(resetFrame);
    };
  }, [props.value, props.defaultValue, rows]);

  return <textarea {...props} ref={textareaRef} rows={rows} style={{ ...style, boxSizing: 'border-box', overflow: 'hidden', resize: 'none' }} />;
}
