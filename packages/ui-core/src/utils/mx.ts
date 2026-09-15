import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Join class names (clsx semantics) and resolve conflicting Tailwind utilities (last wins). */
export const mx = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
