// The story path the drone flies as the page scrolls (specs/05-uiux.md 7.3). A camera route, not flight data:
// the real sealed flight is drawn by the Two Truths group (UI-5).
import * as THREE from "three";

export const storyPoints = [
  [0, 0, 0],
  [3, 1, -14],
  [-2, 2.5, -30],
  [-6, 4, -52],
  [0, 3, -76],
  [6, 2, -98],
  [2, 1.5, -120],
  [0, 1, -136],
].map(([x, y, z]) => new THREE.Vector3(x, y, z));

export const storyCurve = new THREE.CatmullRomCurve3(storyPoints, false, "centripetal");
export const STORY_LENGTH = storyCurve.getLength();

/** where the Two Truths group sits: on the route, a little below it (spec Section 8) */
export const TRUTHS_U = 0.38;
export const truthsAnchor = storyCurve.getPointAt(TRUTHS_U).add(new THREE.Vector3(0, -2, 0));
