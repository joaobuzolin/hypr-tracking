import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactNumber(value: number | string, options?: { decimals?: number }): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (abs < 1000) {
    return sign + abs.toString();
  }
  
  const units = [
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'k' }
  ];
  
  for (const unit of units) {
    if (abs >= unit.value) {
      const decimals = options?.decimals ?? 1;
      const formatted = (abs / unit.value).toFixed(decimals);
      // Remove trailing zeros and decimal point if not needed
      const cleaned = formatted.replace(/\.?0+$/, '');
      return sign + cleaned + unit.suffix;
    }
  }
  
  return sign + abs.toString();
}
