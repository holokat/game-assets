/** Bind GLB bwMotion extras after cloning a model. Call the result with delta seconds. */
export function bindPropMotion(root) {
  const nodes = [];
  root.traverse(node => {
    const motion = node.userData.bwMotion;
    if (!motion || !['spin', 'sway'].includes(motion.kind) || !['x', 'y', 'z'].includes(motion.axis)
      || !Number.isFinite(motion.speed)) return;
    if (motion.kind === 'sway' && !Number.isFinite(motion.amplitude)) return;
    nodes.push({node, motion, base: node.rotation[motion.axis]});
  });
  if (!nodes.length) return null;
  let elapsed = 0;
  return deltaSeconds => {
    elapsed += Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    for (const {node, motion: m, base} of nodes) {
      node.rotation[m.axis] = base + (m.kind === 'sway'
        ? Math.sin(elapsed * m.speed) * m.amplitude : elapsed * m.speed);
    }
  };
}
