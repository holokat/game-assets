import * as THREE from 'three';

type GripSide = 'Left' | 'Right';

const CONTACT_X = 0.055;
const CONTACT_Y = 0.035;
const CONTACT_Z = -0.025;

/**
 * Places the rig's weapon contact inside the closed finger hook.
 *
 * The source sockets sit on the wrist centerline. In the loaded warrior mesh,
 * the four closed finger roots span local X=0.027..0.082 m while their inner
 * skinned surfaces surround Y=0.035, Z=-0.025 m. Keep the source quaternion:
 * together with the sword socket it correctly maps the handle onto that
 * index-to-pinky axis.
 */
export function calibrateWeaponGripContact(hand: THREE.Object3D, side: GripSide): THREE.Object3D {
  const socketName = `Socket_Weapon_${side}`;
  const socket = hand.getObjectByName(socketName);
  if (!socket) return hand;
  socket.position.set(side === 'Right' ? -CONTACT_X : CONTACT_X, CONTACT_Y, CONTACT_Z);
  socket.updateMatrix();
  return socket;
}
