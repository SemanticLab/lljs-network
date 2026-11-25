# Linking Lost Jazz Shrines

Open [index.html](index.html) directly in a browser. The graph, portraits, and small maps are bundled locally. The full network opens first. Scroll over the graph to zoom around the pointer and drag to pan. Shrine and person names reflow into the available space. Focus view adds relationship names to the edges. Select any shrine in the list below the graph to open its direct connections, including shrines with no qualifying edges. Search accepts names, shrine aliases, and Semantic Lab QIDs.

Select a relationship to read the cited transcript text in the details panel. When several blocks support the same statement, use the passage selector to switch between them. Each passage links to its own Wikibase block. The snapshot contains the complete text of all 500 cited blocks. One directed statement has no block citation and links to its Wikibase statement.

## Data

This iteration uses the 24 November 2026 Brooklyn atlas snapshot. It contains 26 interviewees, 97 jazz shrines, and 188 additional musicians. There are 677 distinct person–shrine pairs and 1,022 distinct subject–property–object relationships.

- Shrines are entries in the atlas with `shrine` among their kinds.
- Interviewees come from the transcript interviewee property (P13) of the 27 processed LLJS interview documents. Each person retains one identity across interviews and shrines. Interviewees take precedence over the musician display class.
- Other musicians must be a person with a direct Wikibase relationship to a shrine. Musician evidence comes from a linked Wikidata jazz musician occupation, a jazz genre plus an instrument or performing occupation, a jazz musician description, or combined LLJS evidence of performing at a shrine and playing with others. The rule can omit people with sparse biographical records.
- Edges preserve predicate and direction from the Wikibase statements in the shrine dossiers. Repeated triples share one relationship and retain distinct sets of qualifier text. Transcript block links are matched by directed triple, so they support the relationship as a whole. The graph does not derive relationships from co-mentions.
- The inspector links to the project records, source blocks, individual portrait sources, and live SPARQL statements for each pair. Historical map details use the georeferenced 1950 Gross map from the atlas.

## Rebuilding the snapshot

The supplied snapshot is sufficient to run the explorer. To rebuild with the atlas and ingest checkouts available as siblings, use Python 3.9+ with Pillow 9.1+ and run:

```sh
python3 scripts/build_network.py
```

Use `--atlas PATH` and `--project PATH` for alternate checkout locations. The builder reads `linked-jazz-lljs-map/data` and its bundled portraits, plus the Wikibase dossiers, entity caches, reconciliation results, and transcript block mappings and full block texts in `linked-jazz-lljs`. It generates `assets/network.js`, portrait copies, and map excerpts. Refresh the underlying exports before rebuilding to pick up subsequent Wikibase edits.

The map projection is adapted from the Semantic Lab atlas under the [MIT license](scripts/atlas-license.txt). The 1950 map is held by the [American Geographical Society Library](https://collections.lib.uwm.edu/digital/collection/agdm/id/29508). Images retain their source-specific credits.
