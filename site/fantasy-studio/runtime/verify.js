import {verifyItemStudio} from './verify-items.js';

/** Backward-compatible URL entry point, using the current wiki catalog and slot model. */
export function verifyStudio(studio) {
  return verifyItemStudio(studio);
}
