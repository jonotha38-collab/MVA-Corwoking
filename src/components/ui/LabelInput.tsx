import React, { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type RingColor = 'orange' | 'navy' | 'blue' | 'muted';

const ringMap: Record<RingColor, string> = {
  orange: 'focus:ring-orange-500 focus:border-orange-400',
  navy:   'focus:ring-navy-700 focus:border-navy-500',
  blue:   'focus:ring-blue-600 focus:border-blue-400',
  muted:  'focus:ring-slate-400 focus:border-slate-400',
};

interface LabelInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string;
  ringColor?: RingColor;
  containerClassName?: string;
}

/**
 * LabelInput – Spell UI floating label input.
 * The label sits inside the field and floats to the top border on focus/fill.
 * Supports password type with eye-toggle.
 */
export const LabelInput = forwardRef<HTMLInputElement, LabelInputProps>(
  ({ label, type = 'text', ringColor = 'orange', containerClassName = '', className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [showPwd, setShowPwd] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPwd ? 'text' : 'password') : type;

    return (
      <div className={`group relative w-full ${containerClassName}`}>
        <input
          id={inputId}
          ref={ref}
          type={inputType}
          placeholder=" "
          className={[
            'peer block w-full outline-none',
            'px-3.5 pt-3.5 pb-2 text-sm rounded-lg border border-slate-200',
            'bg-slate-50/70 text-slate-800',
            'transition-all duration-150',
            'focus:ring-2 focus:bg-white',
            'autofill:shadow-[inset_0_0_0px_1000px_#f8fafc]',
            isPassword ? 'pr-9' : '',
            ringMap[ringColor],
            className,
          ].join(' ')}
          {...props}
        />

        {/* Floating label */}
        <label
          htmlFor={inputId}
          className={[
            'pointer-events-none absolute left-[11px] bg-white px-1',
            'text-xs text-slate-400 font-medium text-nowrap',
            'transition-all duration-200 origin-top-left will-change-transform',
            // When placeholder-shown (empty + not focused): label sits inside field
            'peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:top-[10px] peer-placeholder-shown:text-slate-400',
            // Floating state (focused or filled)
            '-translate-y-[19px] scale-[.82] top-[10px]',
            'peer-focus:-translate-y-[19px] peer-focus:scale-[.82] peer-focus:text-orange-500',
          ].join(' ')}
        >
          {label}
        </label>

        {/* Password toggle */}
        {isPassword && (
          <button
            type="button"
            aria-pressed={showPwd}
            aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={() => setShowPwd(v => !v)}
            className="absolute inset-y-0 right-0 flex h-full w-9 items-center justify-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
          >
            {showPwd
              ? <EyeOff className="w-4 h-4" aria-hidden />
              : <Eye className="w-4 h-4" aria-hidden />
            }
          </button>
        )}
      </div>
    );
  }
);

LabelInput.displayName = 'LabelInput';
