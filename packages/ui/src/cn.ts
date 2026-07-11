import clsx, { type ClassValue } from 'clsx';

/** Tiny class combiner (clsx passthrough). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
