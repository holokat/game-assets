# Publication review

The public release lives in this repository. Its static Cloudflare site is `site/`; the local authoring projects remain separate.

| Before | After |
| --- | --- |
| Individual armor lived only in an archive | Armor tab with 50 designs, every one of the 168 GLBs, body/grade variants, direct downloads, and original offsets preserved |
| Farm collections lived in another local project | Farm tab with all 97 canonical, 344 infrastructure, and 400 beach assets; collection filters, search, optimized/source variants, original checksums, and direct downloads |
| Ambient effects were a subcategory of Living world | Visual effects tab with its existing playback and preset export, plus a link to spell previews and source integration |
| Local studio header | Game assets header with the public GitHub link and MIT label |
| Tabs shared panels only implicitly | Explicit panel mappings, horizontal keyboard navigation, visible active-tab scrolling, and cancellation of pending GLB loads |
| Asset inspection assumed desktop columns | Grouped controls, 40-pixel or larger actions, portrait/landscape layouts, and corrected effects grid placement |
| Switching from a world asset to abilities retained its heading | Ability workspace restores the selected character heading |
| PNG and collection captures required a local upload endpoint | Browser-generated Blob downloads with temporary URLs revoked after use |
| Runtime depended on local Three.js and studio paths | Included licensed Three.js runtime, animation inputs, original effect atlases, source modules, and deployment configuration |
| No standalone public project | Public MIT-licensed repository, isolated Cloudflare Worker, integration guide, contribution guidance, third-party notices, and repeatable validation commands |

All 1,753 catalog GLBs passed checksum, container, and Three.js loader checks. Browser integration sampled 22 ambient effects, 77 abilities, and 36 motions, then verified armor variants, all farm collections, searches, cancellation, tab transitions, character GLB export, PNG capture, and the collection gallery. No runtime errors were recorded. See [the result](validation/publication.json).

The Armor, Farm, and Visual effects tabs passed layout checks in 390 × 844 and 844 × 390 Brave iframe viewports. Desktop armor and compact farm previews were visually reviewed. These are browser viewport checks; physical phone performance was not measured.

The new controls use sentence case and separate filtering, download, inspection, and integration sections with larger spacing. The final review found no uppercase styling or em dashes in the new interface copy.
