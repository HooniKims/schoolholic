'use client';

import { CSSProperties, TextareaHTMLAttributes, useEffect, useRef } from 'react';

type TouchScrollableTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function TouchScrollableTextarea({
  style,
  ...props
}: TouchScrollableTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const touchStateRef = useRef({ startY: 0, lastY: 0, startScrollTop: 0 });

  useEffect(() => {
    const element = textareaRef.current;

    if (!element) {
      return;
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }

      const maxScrollTop = element.scrollHeight - element.clientHeight;
      if (maxScrollTop > 0) {
        if (element.scrollTop <= 0) {
          element.scrollTop = 1;
        } else if (element.scrollTop >= maxScrollTop) {
          element.scrollTop = Math.max(maxScrollTop - 1, 1);
        }
      }

      touchStateRef.current.startY = event.touches[0].clientY;
      touchStateRef.current.lastY = event.touches[0].clientY;
      touchStateRef.current.startScrollTop = element.scrollTop;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 || element.scrollHeight <= element.clientHeight) {
        return;
      }

      const currentY = event.touches[0].clientY;
      const deltaY = touchStateRef.current.startY - currentY;
      const maxScrollTop = element.scrollHeight - element.clientHeight;
      const nextScrollTop = Math.min(
        Math.max(touchStateRef.current.startScrollTop + deltaY, 0),
        maxScrollTop,
      );

      if (element.scrollTop !== nextScrollTop) {
        element.scrollTop = nextScrollTop;
      }

      touchStateRef.current.lastY = currentY;
      event.stopPropagation();
      event.preventDefault();
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const scrollStyle: CSSProperties = {
    ...style,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    overscrollBehaviorY: 'contain',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
  };

  return <textarea ref={textareaRef} style={scrollStyle} {...props} />;
}
