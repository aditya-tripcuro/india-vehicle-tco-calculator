import { ReactNode } from 'react';
import { formatNumber } from '../engine/format';

interface NumberInputProps {
  value: number;
  onChange: (n: number) => void;
  /** Displayed and edited as a percentage (value stored as fraction). */
  percent?: boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  placeholder?: string;
}

const trim = (x: number) => String(Math.round(x * 10000) / 10000);

export function NumberInput({
  value,
  onChange,
  percent = false,
  min,
  max,
  step,
  suffix,
  disabled,
  placeholder,
}: NumberInputProps) {
  const display = percent ? trim(value * 100) : trim(value);

  function commit(text: string) {
    const raw = parseFloat(text);
    if (!Number.isFinite(raw)) return;
    let v = percent ? raw / 100 : raw;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    onChange(v);
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type="number"
        value={display}
        step={step ?? (percent ? 0.1 : 1)}
        min={min}
        max={max}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => commit(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        style={suffix ? { paddingRight: 30 } : undefined}
      />
      {suffix && (
        <span
          style={{
            position: 'absolute',
            right: 8,
            color: 'var(--muted)',
            fontSize: 12,
            pointerEvents: 'none',
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="inline-note">{hint}</span>}
    </div>
  );
}

export function MoneyText({ value, decimals = 0 }: { value: number; decimals?: number }) {
  return <>{formatNumber(value, decimals)}</>;
}
