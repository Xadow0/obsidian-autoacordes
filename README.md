# AutoAcordes

![Release](https://img.shields.io/github/v/release/Xadow0/obsidian-autoacordes?display_name=tag)
![License](https://img.shields.io/github/license/Xadow0/obsidian-autoacordes)
![Obsidian](https://img.shields.io/badge/Obsidian-plugin-7c3aed)

**AutoAcordes** is an [Obsidian](https://obsidian.md) plugin for building a personal
**songbook** (lyrics + chords) to learn guitar. Paste a chord sheet from a website,
press **Save**, and it stores a clean note in your vault — organized by artist and written
in **ChordPro**, ready to be read with the **Chord Sheets** plugin.

It understands both **Spanish** (`DO RE MI FA SOL LA SI`) and **English** (`A B C D E F G`)
chord notation on input, including slash chords (`SI7/FA#`) and alternates (`SI7*`), and
always writes **English notation** to the note.

> [!IMPORTANT]
> **AutoAcordes is a companion to [Chord Sheets](https://github.com/olvidalo/obsidian-chord-sheets),
> not a replacement for it.** AutoAcordes only *writes* the notes; Chord Sheets is what
> *renders* them — chord diagrams, transposition, auto-scroll. Without it installed you will
> see plain text with brackets. See [Setting up Chord Sheets](#setting-up-chord-sheets).

## Why ChordPro

Chords written *above* the lyrics only line up while the text is not re-wrapped — on a phone
they drift out of place and the sheet becomes unreadable. ChordPro instead anchors each chord
to the syllable it belongs to:

```
[C]Todo llega y todo [G]pasa como un espejismo
```

Chord Sheets renders that back as chords-above-lyrics on a wide screen, and re-flows it
correctly on a narrow one — one single source, both views.

## Setting up Chord Sheets

1. Install **Chord Sheets** (Settings → Community plugins → Browse → *Chord Sheets*).
2. Turn on **"Display inline/ChordPro-style chords over lyrics"** in its settings — this is
   what gives you the classic chords-above-lyrics look on desktop. Without it the notes render
   as text with brackets.
3. On **mobile**, read the notes in **Reading mode**; Live Preview does not re-flow them well.

## Features

- 📋 **Paste & clean** — paste a chord sheet copied from a website; the plugin strips the
  page clutter (ratings, "submitted by", menus, fingering diagrams, IDs…).
- 🧠 **Auto-detect metadata** — fills in **Artist**, **Song**, and **Key/Capo/Genre** when
  present (from markdown links or, in plain text, the first two lines).
- 🎼 **ChordPro output** — one ` ```chords ` block per song, chords anchored to the syllable.
- 🔤 **Notation conversion** — Spanish `DO RE MI…` is converted to English `C D E…`, which is
  what Chord Sheets needs to recognize chords and draw diagrams.
- 🗂️ **Auto-organized** — creates `Acordes/<Artist>/<Song>.md` and links each song to its
  artist and to a central **hub note** (great with the Dataview plugin).
- 🔁 **Format reconstruction** — handles chords written *above* the lyrics **and** chords
  written on the *same line* as the lyrics (a common copy artifact), realigning them.
- 🎸 **Tabs preserved** — tablature lines are kept verbatim, with their column alignment.
- 📱 Works on **desktop and mobile** Obsidian.
- 🪶 **Zero dependencies, no build step** — a single hand-written `main.js`.

## Installation

> **Status:** currently distributed through **BRAT**. A submission to the official Community
> Plugins directory is planned for a future version.

### Via BRAT (recommended)
1. Install the **BRAT** community plugin (Settings → Community plugins → Browse → *BRAT*).
2. Run **"BRAT: Add a beta plugin"** and enter `Xadow0/obsidian-autoacordes`.
3. Enable **AutoAcordes** in Settings → Community plugins. BRAT will keep it auto-updated.

### Manual
1. Download `main.js`, `manifest.json` and `styles.css` from the
   [latest release](https://github.com/Xadow0/obsidian-autoacordes/releases).
2. Copy them to `<your-vault>/.obsidian/plugins/autoacordes/`.
3. Reload Obsidian and enable the plugin in Settings → Community plugins.

Don't forget to install **Chord Sheets** as well — see
[Setting up Chord Sheets](#setting-up-chord-sheets).

## Usage

1. Click the 🎵 ribbon icon or run the command **"Añadir canción (acordes)"**.
2. Paste the chord sheet into the big text box. Artist/Song/Key/Capo are filled in
   automatically when detected (and stay editable).
3. Check the live **preview** and press **Guardar** (Save).

## Output format

A saved note looks like this (outer fence shown with four backticks so the inner code block
is visible):

````markdown
---
artista: "[[Los Delinquentes]]"
cancion: "[[A la luz del Lorenzo]]"
tono: Em
capo: 0
formato: chordpro
---
# 🎵 A la luz del Lorenzo – [[Los Delinquentes]]

[[Música]]

## 🎶 Letra + [[Acordes]]

```chords
[Estribillo]
[A7]To el mundo va del [B7]cuento de yo me lo pago...
```
````

### Format rules

These are the conventions AutoAcordes writes, and the ones to preserve if you edit a note
by hand:

| Rule | Why |
| --- | --- |
| Chords in **English** notation (`C`, `F#m`, `B7/F#`) | Chord Sheets parses with `tonal`, which does not know `DO/RE/MI`. Watch out: capitalized `Do` is silently read as *D diminished*. |
| A chord **alone on its line** is written **without** brackets (`G`, not `[G]`) | A line containing only `[…]` is read as a section header. Bare chords are still detected and get their diagram. |
| Section headers are a line containing only `[Estribillo]` | That is how Chord Sheets marks sections. |
| Tablature is left verbatim | Column alignment is meaningful there and must not be re-flowed. |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Base folder | `Acordes` | Where artist folders are created. |
| Hub note | `Música` | Note every song links to (leave empty to disable). |

## How it works

The core is a small parser that turns *chords-above-lyrics* into *inline ChordPro chords*:

1. Each text line is classified as **chords**, **lyric**, **section label**, **tab** or
   **blank** (chord tokens are matched with a notation-aware regex).
2. A chord line is paired with the lyric line below it; each chord is placed at the start
   of the word sitting under its column, and Spanish notation is converted to English.
3. Pasted sheets where chords and lyrics share a line are split back into two lines first.
4. Unicode spaces (`&nbsp;`, etc.) are normalized so columns line up.

<img width="1850" height="1024" alt="Captura de pantalla 2026-06-25 224847" src="https://github.com/user-attachments/assets/325fb3d3-35a0-4dca-8169-294fa3f4a34a" />

## Migrating from 1.x

Version 1.x wrote **two** sections per note: a "versión móvil" with `**[C]**` inline chords
and a desktop section with the raw chords-above-lyrics sheet in a plain code block.
Version 2 writes a single ` ```chords ` block instead — see [CHANGELOG](CHANGELOG.md).

Notes created with 1.x are **not** migrated automatically and keep working as plain text.
The 1.x code is preserved on the [`v1-legacy`](https://github.com/Xadow0/obsidian-autoacordes/tree/v1-legacy)
branch if you need to go back to it.

## Development

This plugin is intentionally dependency-free: the shipped `main.js` is the source — there is
no bundler or transpile step. To work on it, edit `main.js` and reload Obsidian (`Ctrl/Cmd+R`).
Check it still parses with `node --check main.js`.

```
main.js         # plugin code (parser + UI)
styles.css      # modal styles
manifest.json   # plugin metadata
versions.json   # plugin version -> minimum Obsidian version
```

## License

[MIT](LICENSE) © Xadow0
