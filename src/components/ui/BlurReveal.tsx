import React, { useEffect, useRef, useState } from 'react';

interface BlurRevealProps {
  text: string;
  className?: string;
  delay?: number;       // ms before animation starts
  duration?: number;    // ms per character
  stagger?: number;     // ms between characters
}

/**
 * BlurReveal – Spell UI inspired text animation.
 * Each character fades in + unblurs with a staggered delay.
 */
export const BlurReveal: React.FC<BlurRevealProps> = ({
  text,
  className = '',
  delay = 0,
  duration = 400,
  stagger = 30,
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [delay, text]);

  // Reset when text changes (tab switch)
  useEffect(() => {
    setVisible(false);
    timerRef.current = setTimeout(() => setVisible(true), delay + 20);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={className} aria-label={text}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            marginRight: char === ' ' ? '0.25em' : undefined,
            opacity: visible ? 1 : 0,
            filter: visible ? 'blur(0px)' : 'blur(10px)',
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: visible
              ? `opacity ${duration}ms ease, filter ${duration}ms ease, transform ${duration}ms ease`
              : 'none',
            transitionDelay: visible ? `${i * stagger}ms` : '0ms',
            whiteSpace: char === ' ' ? 'pre' : undefined,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};
