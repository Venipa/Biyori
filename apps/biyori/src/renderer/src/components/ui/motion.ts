// Interruptible CSS transitions on Base UI starting/ending styles; strong ease-out, exit quicker than enter.
const easeOut = "ease-[cubic-bezier(0.23,1,0.32,1)]";

/** Anchored popups: scale from the trigger via Base UI's --transform-origin. */
export const popupMotion = `origin-(--transform-origin) transition-[opacity,scale] duration-150 ${easeOut} data-starting-style:scale-97 data-starting-style:opacity-0 data-ending-style:scale-97 data-ending-style:opacity-0 data-ending-style:duration-100 motion-reduce:transition-opacity`;

/** Centered dialogs scale from their middle (modals are not trigger-anchored). */
export const dialogMotion = `transition-[opacity,scale] duration-200 ${easeOut} data-starting-style:scale-96 data-starting-style:opacity-0 data-ending-style:scale-96 data-ending-style:opacity-0 data-ending-style:duration-150 motion-reduce:transition-opacity`;

export const backdropMotion = `transition-opacity duration-200 ${easeOut} data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-150`;
