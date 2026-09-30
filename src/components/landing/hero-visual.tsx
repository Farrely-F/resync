import { HeroFallback } from "./hero-fallback";

/**
 * The hero picture: a resume page, the posting's requirements checked against
 * it, and the score. It is drawn in CSS, so it paints with the first HTML and
 * needs no JavaScript or WebGL, and it plays its own short story on load.
 */
export function HeroVisual() {
  return (
    <div
      aria-label="A resume page with the line the match rests on, checked against the posting's requirements and scored 70 percent in this example."
      className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-card via-card to-accent shadow-(--shadow-float) ring-1 ring-foreground/[0.06] md:aspect-[5/4]"
      role="img"
    >
      <HeroFallback />
    </div>
  );
}
