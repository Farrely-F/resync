/**
 * Whether the live preview may compile on its own.
 *
 * A PDF is the honest preview of this document — it is the same engine and the
 * same LaTeX as the download — but compiling is the most expensive thing the app
 * does, so "live" has to mean something narrower than "on every keystroke". The
 * rule is deliberately small and stated once, here, because the ways to get it
 * wrong are all invisible: compiling while the reader types, compiling before the
 * engine has been consented to, or compiling forever because the result never
 * matches the text that produced it.
 *
 * The one input that is *not* here is "a compile is already running". The caller
 * re-runs this after a compile finishes, and the queue keeps the newest text, so
 * a change made mid-compile is picked up by the next pass rather than dropped.
 * Blocking on it would leave the preview permanently one edit behind.
 */

/** How long the reader has to stop before the document is compiled again. */
export const autoPreviewDelayMs = 1200;

export interface AutoPreviewInput {
  /** The reader's switch: off means the preview only follows an explicit compile. */
  enabled: boolean;
  /**
   * Consent recorded, assets already in Cache Storage, engine usable. False means
   * the preview must not compile: neither a download nor a consent prompt may
   * happen because a field changed.
   */
  engineReady: boolean;
  /** The source check found something the engine would stop on. */
  blocked: boolean;
  /** The text that produced the PDF currently on screen, if there is one. */
  compiledTex: string | null;
  /** The document as it stands. */
  tex: string;
}

export function shouldAutoCompile(input: AutoPreviewInput): boolean {
  if (!input.enabled || !input.engineReady || input.blocked) {
    return false;
  }

  return input.compiledTex !== input.tex;
}
