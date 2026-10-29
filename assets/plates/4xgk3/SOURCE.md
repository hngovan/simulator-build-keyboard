# Keyboard plate files collection

- Source: https://github.com/4xgk3/Keyboard-plate-files
- Snapshot commit: `36e09d1b2db5fa61f387f134ce27f89f71452e0a`
- Full snapshot (not stored in repo, re-download when needed): https://github.com/4xgk3/Keyboard-plate-files/archive/36e09d1b2db5fa61f387f134ce27f89f71452e0a.zip (82,183,688 bytes; SHA-256 `58f6c69284732093dccf45aa7bfc1caafc83c8c08c4bc60aa61739e59aaab902`).
- Only `60/typ60-full.dxf` is used by the game (standard 60% switch cutouts).

Selected files extracted from the snapshot for easier inspection:

| Local path | Type |
| --- | --- |
| `alice/alice-switch-plate.dwg` | Alice switch plate |
| `alice/alice.stp` | Alice CAD |
| `alice/dolice.step` | Dolice CAD |
| `alice/evalice.dxf` | Evalice plate |
| `alice/qk-alice-duo.dwg` | QK Alice Duo plate |
| `alice/lumos-alice.dwg` | Lumos Alice plate |
| `60/typ60-full.dxf` | 60% full plate |
| `60/typ60-half.dxf` | 60% half plate |
| `tkl/frog-full.dxf` | TKL full plate |

`60/typ60-full.dxf` is converted to `src/data/generated/plate60.ts` by `bun run convert:plates`. Other files are kept as CAD reference only; the rest of the collection is in the snapshot above.
