import * as T from 'three';

const POSTURE_TRACKS = new Set([
  'Spine2.quaternion',
  'LeftShoulder.quaternion', 'RightShoulder.quaternion',
  'LeftArm.quaternion', 'RightArm.quaternion',
  'LeftForeArm.quaternion', 'RightForeArm.quaternion',
  'LeftHand.quaternion', 'RightHand.quaternion',
]);

/** Add a little arm-to-body clearance to the default idle, including its fallback. */
export function widenRelaxedIdleArms(clip: T.AnimationClip): T.AnimationClip {
  const spread = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), T.MathUtils.degToRad(9));
  const pose = new T.Quaternion();
  for (const track of clip.tracks) {
    if (!/^(Left|Right)Arm\.quaternion$/.test(track.name)) continue;
    for (let key = 0; key < track.values.length; key += 4) {
      pose.fromArray(track.values, key).multiply(spread).normalize().toArray(track.values, key);
    }
  }
  return clip;
}

/**
 * The retargeted source idle retracts the shoulder girdle and leaves the elbows
 * behind the torso. Rebase only its upper-body posture onto this rig's calibrated
 * relaxed pose, retaining source timing and small motion around that posture.
 * Done once when clips are assembled, so normal mixer cross-fades own transitions.
 */
export function correctRelaxedIdlePosture(source: T.AnimationClip, relaxed: T.AnimationClip): T.AnimationClip {
  const corrected = source.clone();
  const reference = new Map(relaxed.tracks.map(track => [track.name, track]));
  const anchorInverse = new T.Quaternion(), rest = new T.Quaternion(), motion = new T.Quaternion();
  const subdued = new T.Quaternion(), result = new T.Quaternion();
  const localForward = new T.Quaternion(), bendAxis = new T.Vector3(0, 0, 1);
  for (const track of corrected.tracks) {
    if (!POSTURE_TRACKS.has(track.name)) continue;
    const calibration = reference.get(track.name);
    if (!calibration || track.getValueSize() !== 4 || calibration.getValueSize() !== 4) continue;
    anchorInverse.fromArray(track.values, 0).normalize().invert();
    rest.fromArray(calibration.values, 0).normalize();
    // The source retains a slight whole-body lean. Counter it at the humerus so
    // the arms hang with gravity instead of following the torso backward.
    if (track.name === 'LeftArm.quaternion' || track.name === 'RightArm.quaternion') {
      localForward.setFromAxisAngle(bendAxis, T.MathUtils.degToRad(track.name === 'LeftArm.quaternion' ? -10 : 10));
      rest.multiply(localForward);
    }
    for (let key = 0; key < track.values.length; key += 4) {
      motion.fromArray(track.values, key).premultiply(anchorInverse).normalize();
      subdued.identity().slerp(motion, .55);
      result.copy(rest).multiply(subdued).normalize().toArray(track.values, key);
    }
  }
  return corrected;
}
