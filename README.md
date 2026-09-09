# Game assets

An open source game asset library with a browser playground, downloadable GLBs, procedural Three.js models, animations, and visual effects.

[Open the playground](https://assets.brackenwake.com/) · [Download the repository](https://github.com/holokat/game-assets/archive/refs/heads/main.zip) · [MIT license](LICENSE)

## Collections

| Collection | Contents | Playground |
| --- | --- | --- |
| Armor archive | All 50 earlier designs, 168 GLBs covering both body fits and every archived hide variant | [Armor](https://assets.brackenwake.com/fantasy-studio/?workspace=armor) |
| Canonical farm | 97 farm buildings, fields, workshops, and props | [Farm](https://assets.brackenwake.com/fantasy-studio/?workspace=farm) |
| Infrastructure | 344 assets, each with optimized and hierarchy-preserving GLBs | [Farm](https://assets.brackenwake.com/fantasy-studio/?workspace=farm) |
| Beach farm | 400 assets, including 56 crop and tree growth stages across 14 families | [Farm](https://assets.brackenwake.com/fantasy-studio/?workspace=farm) |
| Haven meadow | 12 coastal meadow props, Blender source, motion helper and placement metadata | [Haven meadow](https://assets.brackenwake.com/fantasy-studio/?workspace=farm&asset=haven-meadow:windmill) |
| Characters and equipment | Procedural character outfits, appearance controls, weapons, shields, and GLB exports | [Characters](https://assets.brackenwake.com/fantasy-studio/?workspace=character) |
| Structures and living world | Procedural structures, creatures, forage, dressing, and available animation exports | [Living world](https://assets.brackenwake.com/fantasy-studio/?workspace=world) |
| Visual effects | 22 ambient effects, spell effects, weapon enchantments, and fire/smoke atlases | [Visual effects](https://assets.brackenwake.com/fantasy-studio/?workspace=effects) |
| Abilities and motions | 77 ability previews and 36 motions | [Abilities](https://assets.brackenwake.com/fantasy-studio/?workspace=abilities) |

The armor and farm catalog contains **903 assets and 1,765 downloadable GLB variants**. Characters, equipment, structures, and living-world models are generated and exported from the playground, so they are additional to that file count.

## Run locally

Use Node.js 22 or later. The playground's existing Three.js r169 runtime is included with its license. No package installation or build step is needed.

```sh
git clone https://github.com/holokat/game-assets.git
cd game-assets
npm run dev
```

Open [localhost:4192](http://127.0.0.1:4192/). Use `PORT=4200 npm run dev` to choose another port.

## Use the assets

Choose an asset in the Armor or Farm tab, choose a variant, then download the GLB. The preview recenters the model for inspection; downloads retain the original bytes and offsets.

The machine-readable [catalog](site/collections/catalog.json) contains every armor and farm asset, its variants, file sizes, and SHA-256 checksums. Paths are relative to the playground origin. The catalog is also [available from the live site](https://assets.brackenwake.com/collections/catalog.json).

Copy selected files into your game's own asset directory. For example, in a Three.js application that already uses `GLTFLoader`:

```js
const { scene: shed } = await loader.loadAsync('/assets/storage-shed.glb');
scene.add(shed);
```

- Armor GLBs use Y up and preserve their original wearable offsets. The historical male and female fits are separate from the current complete character outfits. They are not automatically fitted to arbitrary character rigs.
- Canonical farm GLBs are static, textureless, decoder-free, base-centered, and Y up. Some are significantly more detailed than the newer infrastructure models. Inspect their geometry cost before using them repeatedly.
- Infrastructure and beach assets have optimized GLBs for scenery and source GLBs for authored hierarchy. Use source GLBs with the included interaction controller when an asset needs live pivots. Each pack's `runtime/interaction-catalog.json` describes its available interactions and recommended model.
- Crop growth uses stage swaps. `site/collections/farm/beach/runtime/crop-progression.json` records stage order and replacement IDs.
- [Haven meadow](site/collections/farm/haven-meadow/README.md) includes twelve textureless props with authored ground origins, collision guidance and a dependency-free motion helper for the windmill and kite. Clone cached models for reuse and bind motion on each placement separately.
- Keep the MIT license notice with copies or substantial portions of the assets and project code.

Useful entry points:

| Path | Purpose |
| --- | --- |
| `site/collections/armor/models/` | All 168 archived armor exports |
| `sources/armor/models/armor/index.js` | Original `createArmorItem(id, {bodyType, materialId})` factory |
| `site/collections/farm/canonical/models/` | The 97 canonical production models |
| `site/collections/farm/infrastructure/` | Original infrastructure models and interaction runtime |
| `site/collections/farm/beach/` | Beach models, interaction runtime, vegetation sway, crop stages |
| `site/collections/farm/haven-meadow/` | Twelve meadow GLBs, placement and collision metadata, motion helper |
| `sources/farm/haven-meadow/` | Editable Blender source, prop factories and standalone GLB exporter |
| `sources/farm/infrastructure/` | Procedural infrastructure factories and authoring modules |
| `site/fantasy-studio/models/` | Character, equipment, creature, dressing, forage, and structure factories |
| `site/fantasy-studio/runtime/` | Motion, preview, and effect integration |
| `sources/animation/src/` | Unbundled source behind the shared motion and spell module |

The raw authoring modules are retained for editing and reference. The self-contained browser runtime is under `site/`; it does not depend on another local project or a symlink.

## Visual effects

The Visual effects tab previews ambient effects and exports JSON presets. **A preset is a configuration file, not a self-contained animation.** Use it with the included Three.js runtime:

```js
import { createEffectModel } from './fantasy-studio/runtime/world-effects/index.js';

const effect = await createEffectModel('fireflies', { intensity: 1 });
scene.add(effect.group);
// Call with elapsed seconds in your render loop.
effect.update(elapsedSeconds);
// When removing the effect:
effect.dispose();
```

Preserve the runtime's relative imports when copying it into another app. It uses Y-up coordinates. A complete list is in `site/fantasy-studio/data/effect-catalog.js`.

Choose **Browse spell effects** to open the ability workbench. Spells and weapon enchantments depend on their runtime and character sockets; a character GLB export does not include those particle systems. The source implementation is in `site/fantasy-studio/runtime/source-effects.js`, `site/fantasy-studio/runtime/enchantments/`, and `sources/animation/src/vfx/`. The bundled shared code is in `site/fantasy-studio/vendor/source-library.js`.

The original procedural fire and smoke atlases are in `site/studio/public/vfx/`. Both are 1536 × 1536 RGBA images, with a 6 × 6 grid of 256-pixel cells and 36 frames in row-major order. Their JSON metadata specifies timing and blending.

## License and attribution

Project-authored code and assets are released under [MIT](LICENSE), including the armor, farm GLBs, procedural models, and original effect atlases. The repository retains the following third-party licenses:

- Three.js r169: MIT. See [its license](licenses/Three.js-MIT.txt).
- Retargeted motions from Quaternius Universal Animation Libraries 1 and 2: CC0-1.0. See [library 1](licenses/UAL1-License.txt), [library 2](licenses/UAL2-License.txt), and the `sources` field in `site/studio/public/animations/quaternius-retargeted.json`.

The Quaternius source motions retain their CC0 status. Links to the Kaldera Codex identify the source of catalog names and descriptions. This release does not license the linked website or third-party trademarks.

## Validate and deploy

```sh
npm run check
npm run check:models
```

The first check verifies catalog counts, file hashes, GLB structure, local import paths, decoder independence, license presence, and static hosting size limits. The second reloads every catalog GLB through Three.js `GLTFLoader` and checks finite, nonempty bounds.

With the local server running, open `http://127.0.0.1:4192/fantasy-studio/?publication-check` in a browser to exercise collection variants, searches, tab transitions, ambient effects, abilities, and motions. Results are displayed in the page and written to the ignored `.local-reports/` directory.

Cloudflare serves `site/` directly. `wrangler.jsonc` targets the isolated `game-assets` Worker. To deploy to your own account, change its account ID and Worker name, authenticate your installed Wrangler CLI, then run:

```sh
wrangler deploy
```

No database, API keys, or Worker secrets are needed by the playground.
