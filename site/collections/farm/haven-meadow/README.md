# Haven meadow

Twelve original low-poly props built for the route between Haven and the beach in Brackenwake. Each GLB is textureless, uses matte vertex colors, and needs no external decoder. The pack contains 15,044 triangles across its twelve unique models and 1,373,408 bytes of GLBs.

Open the playground's **Farm** tab and choose **Haven meadow** in the collection filter. The windmill and kite animate in the preview unless reduced motion is enabled. Downloads retain authored geometry, origins and pivots.

| Models | Reuse |
| --- | --- |
| Windmill and kite | Meadow landmarks and village approaches |
| Picnic arbor and fishing awning | Rest areas, gardens and shoreline shelters |
| Orchard cart and wooden skiff | Markets, farms and beaches |
| Chalk wall and boulders | Field boundaries, path edges and shoreline dressing |
| Lavender, daisies, buttercups and grasses | Planting patches and transitions between paths and grass |

## Place a model

GLBs use metres and Y up. Preserve the authored ground-level origin rather than centering the model's geometry. Posts, footings and stems extend below zero so they can sit in the ground without floating. Place foliage against the terrain surface; keep structures upright and check their foundations on sloping ground.

[metadata.json](metadata.json) lists stable catalog IDs, Brackenwake model IDs, placement envelopes, mesh costs, motion nodes and the collision boxes used by the game. Envelopes are placement guidance, not precise mesh bounds. Collision boxes use local `[x, z, width, depth, height, bottom]` coordinates. Transform them with the model's position, yaw and scale in your collision system.

An empty collision array means pass-through foliage. A `null` array means this pack has no custom collision boxes for that model; choose an appropriate collider in the consuming game. Shelter boxes cover posts, furniture and the roof separately to keep walkable gaps open. Windmill collision covers its body rather than its moving sails.

Copy only the models you need into your game's assets. Cache loaded prototypes and clone them for placements. Reuse geometry and materials, and bind motion separately on each clone. Instance repeated static foliage when your renderer supports it; keep animated pivots as separate scene nodes.

## Animate the windmill and kite

Motion is described by `bwMotion` node extras, not embedded glTF animation clips. Copy [runtime/motion.js](runtime/motion.js) with these models. It has no imports or additional dependencies.

```js
import { bindPropMotion } from './runtime/motion.js';

const { scene: prototype } = await loader.loadAsync('/assets/meadow_windmill.glb');
const windmill = prototype.clone(true);
scene.add(windmill);
const updateWindmill = bindPropMotion(windmill);

// Inside your existing render loop, using delta time in seconds:
updateWindmill?.(deltaSeconds);
```

Remove the update callback when removing a placement. Dispose shared geometry and materials only after their last instance is gone. The helper does not create timers, attach listeners or own a render loop.

## Edit and export

Editable Blender scenes, the shared geometry builder, prop factories and a standalone exporter are in [sources/farm/haven-meadow](../../../../sources/farm/haven-meadow). The source was authored with Blender 5.2.0 LTS. `kite-meadow.blend` includes one scene per asset and a landscape composition scene. Use the asset scenes for individual exports; the landscape is a composition reference.

From the repository root, rebuild into a directory of your choice:

```sh
blender --background --factory-startup --python sources/farm/haven-meadow/export.py -- /tmp/haven-meadow-export
```

The exporter does not read the game repository or require the terrain layout. After changing published GLBs, update their byte sizes and SHA-256 checksums in the main catalog and review their geometry and collision metadata.

Code and original assets use the repository's [MIT license](../../../../LICENSE). Keep the license notice with copies or substantial portions.
