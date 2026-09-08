# Contributing

Keep new assets within a named collection and include the files needed to use them. Submit only work you can release under this repository's MIT license, and preserve any required third-party notices.

For a new GLB, add its catalog entry with a unique ID, readable name, category, variant path, byte size, and SHA-256 checksum. Preserve a stable coordinate convention and document any rig or runtime requirements. Add variants to the existing asset entry when they represent the same design.

Run `npm run check` and `npm run check:models`. Review the asset in the playground, including orbit, framing, variant selection, and download. If you change the UI or runtime, also run the browser publication checks described in the README.

Use sentence case in the interface, group related controls together, and give separate sections more whitespace. Keep code in focused modules and reuse the existing workspace and presentation contracts.

Do not commit credentials, dependencies, caches, generated review media, or copies of unrelated projects. Include a short description of the change and the checks you ran in the pull request.
