# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-08-19

Output format switched to **ChordPro**, to be read with the
[Chord Sheets](https://github.com/olvidalo/obsidian-chord-sheets) plugin.

### Changed
- **BREAKING:** notes are now written as a single ` ```chords ` block in ChordPro format,
  replacing the previous two sections ("versión móvil" with `**[C]**` chords + a desktop
  section with the raw chords-above-lyrics sheet).
- **BREAKING:** chords are converted to **English** notation (`DO RE MI` -> `C D E`).
  Chord Sheets parses with `tonal`, which does not understand Spanish notation.
- Chords are written as `[C]` anchored to the syllable, without markdown bold — `**` would
  show up literally inside a code block.
- Section labels become their own `[Section]` header line.
- A chord alone on its line is written without brackets, so Chord Sheets does not mistake
  it for a section header.
- `formato:` front matter is now `chordpro` (was `inline`).
- An unknown key is left empty instead of the `{{tono}}` placeholder.

### Removed
- **BREAKING:** the "Versión móvil arriba" setting — there is only one version now.

### Migration
Notes created with 1.x are not migrated automatically; they keep working as plain text.
The 1.x code is preserved on the `v1-legacy` branch.

## [1.0.0] - 2026-06-25

### Added
- Initial release.
- "Add song" command and ribbon icon with a paste box and live preview.
- Paste-and-clean import: strips website clutter (ratings, "submitted by", menus,
  fingering diagrams, IDs).
- Auto-detection of Artist, Song, Key, Capo and Genre (from markdown links or plain text).
- Conversion engine: chords-above-lyrics → inline chords, with support for chord sheets
  that put chords and lyrics on the same line.
- Spanish (DO RE MI…) and English (A B C…) notation, slash chords and alternates.
- Notes organized as `Acordes/<Artist>/<Song>.md` with mobile and desktop versions, an
  artist link and a configurable hub note.
- Settings: base folder, hub note, mobile-version-on-top.
