/**
 * Landing-page hero image: the single place to swap the photograph and tune its framing.
 *
 * TODAY: a reference photo supplied for design review only. Its rights are not cleared
 * (unknown photographer, identifiable people, a hotel logo on a jacket), so the file lives
 * in public/experience/local/, which is git-ignored and never deployed. Without the file the
 * hero falls back to the plain backdrop colour; no other image is substituted.
 *
 * TO REPLACE: put a licensed photograph (≥ 2400 px wide, with model and property releases)
 * in public/experience/, point `src` at it and adjust `focus` so the chef stays in frame.
 */
export const HERO_IMAGE = {
  src: "/experience/local/hero-reference.jpg",
  alt: "An executive chef finishing a plate at the pass of a hotel kitchen, with the brigade cooking behind",
  /** CSS background-position: which part of the photo stays visible when it is cropped. */
  focus: { desktop: "58% 50%", mobile: "50% 42%" },
  /** Opacity (0–1) of the shade behind the text column; keep it as light as legibility allows. */
  shade: 0.94,
  rightsCleared: false,
};
