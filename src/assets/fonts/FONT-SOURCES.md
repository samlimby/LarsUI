# Font sources

## Paper Mono

- Author: Paper Design / Paper Mono Project Authors
- Version: 1.000
- Official release: https://github.com/paper-design/paper-mono/releases/tag/v1.000
- Original file: https://raw.githubusercontent.com/paper-design/paper-mono/v1.000/fonts/webfonts/PaperMono%5Bwght%5D.woff2
- Stored as `paper-mono/PaperMono.woff2`, without modifying the font contents.
- SHA-256: `34bf2cb064a77b2b966063b17887e50d71f9fb61481af67444eaf91561cf6327`
- Variable weight axis: 100–800; default 400.
- License: SIL Open Font License 1.1; original copyright and license in `paper-mono/OFL.txt`.

## Inter

- Author: The Inter Project Authors
- Original project: https://github.com/rsms/inter
- Source: `@fontsource-variable/inter` (version recorded in `package-lock.json`).
- File: `inter-latin-wght-normal.woff2` from that package.
- Variable weight axis: 100–900.
- License: SIL Open Font License 1.1; original copyright and license in `inter/OFL.txt`.

`fonts.css` loads both families for the UI library and site. The build copies the original copyright notices, full licenses, and this provenance into `FONT-LICENSES.txt` in both `dist/` and `site-dist/`, so the notices accompany the redistributed fonts even when CSS minification strips comments.
