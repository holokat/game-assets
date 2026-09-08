const WELL_BASE_ROPE_LENGTH = 0.44;
const WELL_LOWERED_ROPE_LENGTH = 0.76;
const WELL_AXLE_TRAVEL = 2.6;

function findByName(root, name) {
  return root.getObjectByName(name);
}

function prepareWellBucket(root) {
  const axle = findByName(root, 'well-windlass-axle');
  const rope = findByName(root, 'well-hanging-rope');
  const bail = findByName(root, 'well-bucket-bail');
  const bucket = findByName(root, 'well-bucket-assembly');
  if (!axle || !rope || !bail || !bucket) {
    throw new Error('The well interaction recipe requires the windlass axle, hanging rope, bucket bail and bucket assembly.');
  }

  const axleRest = axle.rotation.x;
  const ropeScaleRest = rope.scale.y;
  const bailRest = bail.rotation.x;
  const ropeScaleTravel = ropeScaleRest * (WELL_LOWERED_ROPE_LENGTH / WELL_BASE_ROPE_LENGTH - 1);

  return {
    id: 'lower-bucket',
    duration: 1.35,
    movingNodeNames: [axle.name, rope.name, bail.name, bucket.name],
    apply(progress) {
      axle.rotation.x = axleRest - WELL_AXLE_TRAVEL * progress;
      rope.scale.y = ropeScaleRest + ropeScaleTravel * progress;
      bail.rotation.x = bailRest + 0.1 * progress;
    },
    reset() {
      axle.rotation.x = axleRest;
      rope.scale.y = ropeScaleRest;
      bail.rotation.x = bailRest;
    },
  };
}

const recipes = new Map([
  ['well', prepareWellBucket],
]);

export function prepareInteractionRecipe(assetId, root) {
  return recipes.get(assetId)?.(root) ?? null;
}

export function hasInteractionRecipe(assetId) {
  return recipes.has(assetId);
}

export const interactionRecipeIds = Object.freeze([...recipes.keys()]);
