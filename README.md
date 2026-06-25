# AutoAcordes

![Release](https://img.shields.io/github/v/release/Xadow0/obsidian-autoacordes?display_name=tag)
![License](https://img.shields.io/github/license/Xadow0/obsidian-autoacordes)
![Obsidian](https://img.shields.io/badge/Obsidian-plugin-7c3aed)

**AutoAcordes** is an [Obsidian](https://obsidian.md) plugin for building a personal
**songbook** (lyrics + chords) to learn guitar. Paste a chord sheet from a website,
press **Save**, and it stores a clean note in your vault — organized by artist, with both
a **mobile** view (chords inline in the lyrics) and a **desktop** view (chords above the
lyrics).

It understands both **Spanish** (`DO RE MI FA SOL LA SI`) and **English** (`A B C D E F G`)
chord notation, including slash chords (`B/F#`) and alternates (`SI7*`).

> Why two views? On a phone, chords written *above* the lyrics wrap and misalign. AutoAcordes
> keeps a phone-friendly inline version **and** the classic chords-above version in the same note.

## Screenshot

<!-- Add a screenshot of the "Add song" modal here, e.g. assets/screenshot.png -->
<!-- ![AutoAcordes modal](assets/screenshot.png) -->

## Features

- 📋 **Paste & clean** — paste a chord sheet copied from a website; the plugin strips the
  page clutter (ratings, "submitted by", menus, fingering diagrams, IDs…).
- 🧠 **Auto-detect metadata** — fills in **Artist**, **Song**, and **Key/Capo/Genre** when
  present (from markdown links or, in plain text, the first two lines).
- 🎸 **Two layouts from one paste**:
  - *Mobile*: inline chords — `**[C]** Lyrics **[G]** here`
  - *Desktop*: chords above the lyrics (kept verbatim in a code block).
- 🗂️ **Auto-organized** — creates `Acordes/<Artist>/<Song>.md` and links each song to its
  artist and to a central **hub note** (great with the Dataview plugin).
- 🔁 **Format reconstruction** — handles chords written *above* the lyrics **and** chords
  written on the *same line* as the lyrics (a common copy artifact), realigning them.
- 🌍 **Spanish & English** chord notation, slash chords and alternates.
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
formato: inline
---
# 🎵 A la luz del Lorenzo – [[Los Delinquentes]]

[[Música]]

## 🎶 Letra + Acordes (versión móvil)

**[LA7]** To el mundo va del **[SI7]** cuento de yo me lo pago...

## 🎶 Letra + [[Acordes]]
```
LA7                    SI7
To el mundo va del cuento de yo me lo pago...
```
````

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Base folder | `Acordes` | Where artist folders are created. |
| Hub note | `Música` | Note every song links to (leave empty to disable). |
| Mobile version on top | `on` | Put the inline (mobile) version before the desktop one. |

## How it works

The core is a small parser that turns *chords-above-lyrics* into *inline chords*:

1. Each text line is classified as **chords**, **lyric**, **section label**, **tab** or
   **blank** (chord tokens are matched with a notation-aware regex).
2. A chord line is paired with the lyric line below it; each chord is placed at the start
   of the word sitting under its column. The first chord of a line opens the line.
3. Pasted sheets where chords and lyrics share a line are split back into two lines first.
4. Unicode spaces (`&nbsp;`, etc.) are normalized so columns line up.

## Development

This plugin is intentionally dependency-free: the shipped `main.js` is the source — there is
no bundler or transpile step. To work on it, edit `main.js` and reload Obsidian (`Ctrl/Cmd+R`).

```
main.js         # plugin code (parser + UI)
styles.css      # modal styles
manifest.json   # plugin metadata
versions.json   # plugin version -> minimum Obsidian version
```

## License

[MIT](LICENSE) © Xadow0
