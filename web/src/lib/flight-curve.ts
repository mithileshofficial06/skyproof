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

/** where the Two Truths group sits: on the floor, a little ahead of the drone, so the wide shot looks down on it
 * (spec Section 8 put it at u 0.38, 2 units below the route; tuned so it fills the frame) */
export const TRUTHS_U = 0.44;
const at = storyCurve.getPointAt(TRUTHS_U);
export const truthsAnchor = new THREE.Vector3(at.x + 2.5, -1.5, at.z); // +x: clear of the text card on the left
/** what the camera looks at while Two Truths is on screen */
export const truthsFocus = truthsAnchor.clone().add(new THREE.Vector3(0, 1.6, 0));
/** scroll range over which the camera turns to the group and back */
export const TRUTHS_RANGE: [number, number, number, number] = [0.25, 0.31, 0.47, 0.53];
