/**
 * Shared Tailwind utility chains for repeated motion patterns.
 * Keeping them here avoids duplicating long arbitrary-variant strings.
 */

/** Staggered reveal for card grids and lists. */
export const STAGGER = [
  '[&>*]:animate-fade-up',
  '[&>*:nth-child(1)]:[animation-delay:0ms]',
  '[&>*:nth-child(2)]:[animation-delay:50ms]',
  '[&>*:nth-child(3)]:[animation-delay:100ms]',
  '[&>*:nth-child(4)]:[animation-delay:150ms]',
  '[&>*:nth-child(5)]:[animation-delay:200ms]',
  '[&>*:nth-child(6)]:[animation-delay:250ms]',
  '[&>*:nth-child(7)]:[animation-delay:300ms]',
  '[&>*:nth-child(8)]:[animation-delay:350ms]',
  '[&>*:nth-child(n+9)]:[animation-delay:400ms]',
].join(' ');

/** Soft hover lift for cards and tiles. */
export const LIFT =
  'transition-[transform,box-shadow,border-color] duration-[240ms] ease-out-expo hover:-translate-y-[3px] hover:shadow-[0_14px_30px_-12px_#0f172a38]';

/** Opt-in press feedback for primary actions. */
export const PRESSABLE =
  'transition-[transform,box-shadow,background-color] duration-150 ease-out-expo active:scale-[0.97]';
