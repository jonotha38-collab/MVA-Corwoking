import React, { useEffect, useRef, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  className?: string;
  speed?: number;       // ms per character
  delay?: number;       // ms before starting
  cursor?: boolean;     // show blinking cursor
  cursorChar?: string;
}

/**
 * TypewriterText – Spell UI inspired typing animation.
 * Animates text being "typed" one character at a time.
 */
export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  className = '',
  speed = 45,
  delay = 0,
  cursor = true,
  cursorChar = '|',
}) => {
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(cursor);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset on text change
    setDisplayed('');
    indexRef.current = 0;
    setShowCursor(cursor);

    if (timerRef.current) clearTimeout(timerRef.current);

    const start = () => {
      const type = () => {
        if (indexRef.current < text.length) {
          indexRef.current += 1;
          setDisplayed(text.slice(0, indexRef.current));
          timerRef.current = setTimeout(type, speed);
        } else {
          // Hide cursor after typing is done (optional)
          // setShowCursor(false);
        }
      };
      timerRef.current = setTimeout(type, speed);
    };

    timerRef.current = setTimeout(start, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed, delay, cursor]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{displayed}</span>
      {showCursor && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            marginLeft: '1px',
            animation: 'tw-blink 0.9s step-end infinite',
          }}
        >
          {cursorChar}
        </span>
      )}
      <style>{`
        @keyframes tw-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  );
};
