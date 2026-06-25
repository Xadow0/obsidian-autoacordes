# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

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
