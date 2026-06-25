'use strict';
const { Plugin, Modal, Setting, Notice, PluginSettingTab, normalizePath } = require('obsidian');

/* =========================================================================
 *  Motor de conversión: acordes-sobre-letra  ->  acordes inline **[X]**
 *  (port a JS del script autoacordes/convert.py)
 * ========================================================================= */

const ROOT = '(?:DO|RE|MI|FA|SOL|LA|SI|[A-G])';
const QUAL = '(?:#|b)?(?:m|maj|min|dim|aug|sus|add|M)?\\d*(?:sus\\d|add\\d|maj\\d|dim\\d)?(?:/' + ROOT + '(?:#|b)?)?\\*?';
const CHORD = new RegExp('^' + ROOT + QUAL + '$');
const ANNOT = new RegExp('^\\(?[xX]\\d+\\)?$|^\\(?\\d+$|^compases\\)?\\.?$|^\\([^)]*\\)$|^\\d+\\)?$');
const LABELS = ['intro', 'introducci', 'solo', 'estrofa', 'estribillo', 'punteo',
  'puente', 'silencio', 'riff', 'final', 'coro', 'pre-estribillo',
  'interludio', 'outro', 'bis', 'estr.'];

// Normaliza espacios Unicode (NBSP, NEL, separadores, etc.) a espacio normal,
// 1 carácter por 1 para preservar la alineación de columnas. Imprescindible con
// texto pegado de webs, que suele traer &nbsp; ( ).
const SPACE_RE = new RegExp('[\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff\\u001c-\\u001f]', 'g');
function normalizeSpaces(s) { return s.replace(SPACE_RE, ' '); }

function isChordTok(t) { return CHORD.test(t); }

function parseMulti(tok) {
  if (isChordTok(tok)) return [tok];
  if (tok.indexOf('-') >= 0) {
    const parts = tok.split('-').filter(p => p);
    const subs = [];
    for (const p of parts) { const r = parseMulti(p); if (r === null) return null; subs.push(...r); }
    return subs.length ? subs : null;
  }
  const re = new RegExp(ROOT + QUAL, 'y');
  let pos = 0; const subs = [];
  while (pos < tok.length) {
    re.lastIndex = pos;
    const m = re.exec(tok);
    if (!m || re.lastIndex === pos) return null;
    subs.push(m[0]); pos = re.lastIndex;
  }
  return subs.length >= 1 ? subs : null;
}

function isLabelWord(tok) {
  const low = tok.toLowerCase().replace(/:+$/, '');
  return LABELS.some(l => low.startsWith(l));
}

function tokens(line) { return line.split(/\s+/).filter(x => x); }

function analyze(line) {
  // para clasificar, ignoramos comentarios entre paréntesis: así una línea
  // instrumental con nota tipo "LA SOL FA MI (x2) (Repetir...)" no cuenta como letra.
  const toks = tokens(line.replace(/\([^)]*\)/g, ' '));
  let li = 0;
  while (li < toks.length && !parseMulti(toks[li]) && (isLabelWord(toks[li]) || toks[li].endsWith(':'))) li++;
  const label = toks.slice(0, li);
  const rest = toks.slice(li);
  const chords = rest.filter(t => parseMulti(t));
  const words = rest.filter(t => !parseMulti(t) && !ANNOT.test(t));
  return { label, chords, words };
}

// Línea de tablatura tipo "e|---0---2---|" (no debe fusionarse con acordes)
function isTabLine(line) {
  const t = line.trim();
  if (t.indexOf('|') < 0) return false;
  return /^[_*]?[a-gA-G]?[_*]?\s*\|[-\dxXhpbsr~/\\| ._*]*$/.test(t) && (t.match(/-/g) || []).length >= 5;
}

function classify(line) {
  const s = line.replace(/\s+$/, '');
  if (!s.trim()) return 'blank';
  if (isTabLine(s) || isDiagramLine(s)) return 'tab';
  const { label, chords, words } = analyze(s);
  if (chords.length === 0) {
    if (label.length && words.length === 0) return 'label';
    return 'lyric';
  }
  if (words.length) return 'lyric';
  return 'chords';
}

function matchAllIdx(L, re) {
  const out = []; let m;
  const r = new RegExp(re.source, 'g');
  while ((m = r.exec(L)) !== null) { out.push([m.index, m[0]]); if (m.index === r.lastIndex) r.lastIndex++; }
  return out;
}

function wordStarts(L) { return matchAllIdx(L, /\S+/).map(x => x[0]); }

function chordPositions(line) {
  const res = [];
  for (const [col, tok] of matchAllIdx(line, /\S+/)) {
    const sub = parseMulti(tok);
    if (sub) sub.forEach((ch, i) => res.push([col + i, ch]));
  }
  return res;
}

function merge(chordline, lyric, label) {
  const positions = chordPositions(chordline);
  const L = lyric, n = L.length, starts = wordStarts(L);
  const ins = [];
  positions.forEach(([col, ch], k) => {
    let c = col, target;
    if (c >= n) { ins.push([n, ch]); return; }
    if (L[c] === ' ') { let j = c; while (j < n && L[j] === ' ') j++; target = j < n ? j : n; }
    else { let ws = c; while (ws > 0 && L[ws - 1] !== ' ') ws--; target = ws; }
    if (k === 0 && starts.indexOf(target) !== -1 && starts.indexOf(target) <= 1) target = 0;
    ins.push([target, ch]);
  });
  ins.sort((a, b) => a[0] - b[0]);
  let out = '', prev = 0;
  for (const [idx, ch] of ins) { out += L.slice(prev, idx) + '\x00' + ch + '\x01'; prev = idx; }
  out += L.slice(prev);
  out = out.replace(/\x00(.*?)\x01/g, (_, c) => '**[' + c + ']**');
  out = out.replace(/\s*(\*\*\[[^\]]*\]\*\*)\s*/g, ' $1 ');
  out = out.replace(/ +/g, ' ').trim();
  if (label) out = '**(' + label.trim().replace(/:+$/, '') + ')** ' + out;
  return out;
}

function renderInstrumental(line) {
  const toks = tokens(line);
  let i = 0; const label = [];
  while (i < toks.length && !parseMulti(toks[i]) && !ANNOT.test(toks[i])) { label.push(toks[i]); i++; }
  const rest = toks.slice(i); const parts = [];
  for (const t of rest) { const sub = parseMulti(t); if (sub) parts.push(...sub.map(c => '[' + c + ']')); else parts.push(t); }
  const body = parts.join(' ');
  return label.length ? '**' + label.join(' ') + '** ' + body : body;
}

function leadingLabel(line) {
  const toks = tokens(line); const label = [];
  for (const t of toks) { if (parseMulti(t) || ANNOT.test(t)) break; label.push(t); }
  return label.length ? label.join(' ') : null;
}

function convert(block) {
  const lines = normalizeSpaces(block).split('\n');
  const out = []; let i = 0; const N = lines.length;
  while (i < N) {
    const kind = classify(lines[i]);
    if (kind === 'blank') { out.push(''); i++; continue; }
    if (kind === 'label') { out.push('**' + lines[i].trim() + '**'); i++; continue; }
    if (kind === 'tab') { out.push(lines[i].replace(/\s+$/, '')); i++; continue; }
    if (kind === 'chords') {
      let j = i + 1;
      while (j < N && classify(lines[j]) === 'blank') j++;
      const nxt = j < N ? classify(lines[j]) : null;
      if (nxt === 'lyric') { out.push(merge(lines[i], lines[j], leadingLabel(lines[i]))); i = j + 1; }
      else { out.push(renderInstrumental(lines[i])); i++; }
      continue;
    }
    out.push(lines[i].trim()); i++;
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* =========================================================================
 *  Limpieza del texto pegado + detección de metadatos
 * ========================================================================= */

// Enlace markdown del tipo [texto](url)
function mdLink(line) {
  const m = line.trim().match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
  return m ? { text: m[1].trim(), url: m[2] } : null;
}

// Token con pinta de diagrama de traste (p. ej. 575655, X76750)
function isFret(tok) { return /^[xX\d]{3,}$/.test(tok); }

// Línea de diagrama de acordes: "LA7       575655"
function isDiagramLine(l) {
  const t = l.trim().split(/\s+/);
  return t.length >= 2 && !!parseMulti(t[0]) && isFret(t[1]);
}

// Líneas con acordes y letra EN LA MISMA línea (formato de lacuerda al copiar):
// "LA7        SI7 To el mundo va..." -> ["LA7        SI7", "To el mundo va..."]
function splitJoined(line) {
  const toks = matchAllIdx(line, /\S+/);
  if (toks.length < 2) return null;
  let k = 0;
  while (k < toks.length && (parseMulti(toks[k][1]) || ANNOT.test(toks[k][1]))) k++;
  if (k === 0 || k >= toks.length) return null;              // sin acordes al inicio, o sin texto detrás
  const leadChords = toks.slice(0, k).filter(x => parseMulti(x[1]));
  if (!leadChords.length) return null;                       // hace falta ≥1 acorde real
  // evitar falsos positivos con prosa que empieza por un acorde de una sola letra
  // (p.ej. el título "A la luz del Lorenzo"): exigir ≥2 acordes o uno de ≥2 caracteres.
  if (leadChords.length < 2 && !leadChords.some(x => x[1].length >= 2)) return null;
  const lyricStart = toks[k][0];
  const lyric = line.slice(lyricStart).replace(/\s+$/, '');
  if (lyric.trim()[0] === '(') return null;                  // lo de detrás es un comentario, no letra
  if (isFret(toks[k][1])) return null;                       // lo de detrás parece un diagrama
  const chordPortion = line.slice(0, lyricStart).replace(/\s+$/, '');
  return [chordPortion, lyric];
}

function isMusicalLine(line) {
  const k = classify(line);
  return k === 'chords' || k === 'label' || splitJoined(line) !== null;
}

const JUNK = [
  /^\s*(acordes?|letra|tab(latura)?s?)\s*:?\s*$/i,
  /lacuerda\.net/i, /ultimate.?guitar/i, /cifraclub/i, /e-?chords/i,
  /^\s*(ver|imprimir|transportar|tono original|a[ñn]adir a|favorit|compartir|reportar)\b/i,
  /mostrar\/ocultar|desfile autom|diagramas de acordes|cambio de tono|cifrado ingl|formato del texto/i,
  /^\s*enviado por\b/i,
  /derechos? reservad|copyright|©/i,
  /^\s*\d+(\.\d+)?\s*\/\s*10\b/,                              // valoración 8.17/10
  /^\s*\d+\s*(comentarios?|valoraciones?)\s*$/i
];

function cleanPaste(raw) {
  let lines = normalizeSpaces(raw).replace(/\r\n?/g, '\n').split('\n');
  // 1) quitar bloques cercados ```...``` (IDs, diagramas de acordes)
  const noFence = []; let inFence = false;
  for (const ln of lines) {
    if (/^\s*```/.test(ln.trim())) { inFence = !inFence; continue; }
    if (!inFence) noFence.push(ln);
  }
  lines = noFence;

  const meta = { artista: '', cancion: '', tono: '', capo: '', genero: '' };
  const rest = [];
  for (let ln of lines) {
    const t = ln.trim();
    // enlaces markdown: artista (url .../slug/) vs canción (url .../slug/cancion)
    const lk = mdLink(ln);
    if (lk) {
      try {
        const segs = new URL(lk.url).pathname.split('/').filter(s => s);
        if (segs.length <= 1) { if (!meta.artista) meta.artista = lk.text; }
        else { if (!meta.cancion) meta.cancion = lk.text; }
      } catch (e) { if (!meta.cancion) meta.cancion = lk.text; }
      continue;
    }
    // tono / capo / género
    const mTono = t.match(/^tono\s*(original)?\s*[:.\-]?\s*(.+)$/i);
    const mCapo = t.match(/^(capo|cejilla|ceja)\s*(en\s*el\s*)?(traste\s*)?[:.\-]?\s*(\d+)/i);
    const mGen = t.match(/^(g[ée]nero|estilo)\s*[:.\-]?\s*(.+)$/i);
    if (mTono && mTono[2] && mTono[2].length <= 24 && !/\s/.test(mTono[2].trim().replace(/\s*[-–]\s*/g, ''))) {
      if (!meta.tono) meta.tono = mTono[2].trim(); continue;
    }
    if (mCapo) { if (!meta.capo) meta.capo = mCapo[4]; continue; }
    if (mGen && mGen[2]) { if (!meta.genero) meta.genero = mGen[2].trim(); continue; }
    if (JUNK.some(rx => rx.test(t))) continue;
    rest.push(ln.replace(/\s+$/, ''));
  }

  // 2) localizar el inicio del cuerpo musical y descartar el resto de cabecera
  //    (álbum, "desconocido", restos de diagrama sin cercar, etc.)
  let startIdx = rest.findIndex(isMusicalLine);

  // 2b) si no hubo enlaces markdown, deducir Canción/Artista del texto plano:
  //     en lacuerda la 1ª línea de la cabecera es la canción y la 2ª el artista.
  if (!meta.cancion || !meta.artista) {
    const header = (startIdx >= 0 ? rest.slice(0, startIdx) : rest.slice())
      .map(l => l.trim())
      .filter(l => l && /[A-Za-zÀ-ÿ]/.test(l) && !isTabLine(l) && !isDiagramLine(l) && l.length <= 80);
    if (!meta.cancion && header[0]) meta.cancion = header[0];
    if (!meta.artista && header[1]) meta.artista = header[1];
  }

  let body = startIdx >= 0 ? rest.slice(startIdx) : rest.slice();

  // 3) reconstruir líneas "acordes+letra juntas" a dos líneas
  const out = [];
  for (const ln of body) {
    const sj = splitJoined(ln);
    if (sj) { out.push(sj[0]); out.push(sj[1]); }
    else out.push(ln);
  }

  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return { body: out.join('\n').replace(/\n{3,}/g, '\n\n'), meta };
}

/* =========================================================================
 *  Construcción de la nota
 * ========================================================================= */

function sanitizeName(name) {
  return (name || '').replace(/[\\/:*?"<>|#^[\]]/g, '').replace(/\s+/g, ' ').trim();
}

function buildNote(meta, rawBlock, s) {
  const mobile = convert(rawBlock);
  const fm = ['---'];
  fm.push('artista: "[[' + meta.artista + ']]"');
  if (meta.otros && meta.otros.length) {
    fm.push('otros_artistas:');
    meta.otros.forEach(a => fm.push('  - "[[' + a + ']]"'));
  }
  fm.push('cancion: "[[' + meta.cancion + ']]"');
  if (meta.genero) fm.push('genero: ' + meta.genero);
  fm.push('tono: ' + (meta.tono || '{{tono}}'));
  fm.push('capo: ' + (meta.capo !== '' && meta.capo != null ? meta.capo : 0));
  fm.push('formato: inline');
  fm.push('---');

  const movilHead = '## 🎶 Letra + Acordes (versión móvil)';
  const ordHead = '## 🎶 Letra + [[Acordes]]';
  const fence = '```';
  const movilBlock = movilHead + '\n\n' + mobile + '\n';
  const ordBlock = ordHead + '\n' + fence + '\n' + normalizeSpaces(rawBlock).replace(/\s+$/, '') + '\n' + fence + '\n';

  const parts = [];
  parts.push(fm.join('\n'));
  parts.push('# 🎵 ' + meta.cancion + ' – [[' + meta.artista + ']]');
  parts.push('');
  if (s.hubNote) parts.push('[[' + s.hubNote + ']]');
  parts.push('');
  if (s.mobileFirst) { parts.push(movilBlock); parts.push(ordBlock); }
  else { parts.push(ordBlock); parts.push(movilBlock); }
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n';
}

/* =========================================================================
 *  Modal de entrada
 * ========================================================================= */

const DEFAULTS = { baseFolder: 'Acordes', hubNote: 'Música', mobileFirst: true };

class AddSongModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.state = { artista: '', cancion: '', otros: '', genero: '', tono: '', capo: '', raw: '', overwrite: false };
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass('autoacordes-modal');
    contentEl.empty();
    contentEl.createEl('h2', { text: '🎸 Añadir canción' });
    contentEl.createEl('p', {
      text: 'Pega la letra con acordes (acordes encima de la letra). Se guardará en ' +
        this.plugin.settings.baseFolder + '/<Artista>/<Canción>.md con versión móvil y ordenador.',
      cls: 'setting-item-description'
    });

    const wrap = contentEl.createDiv({ cls: 'autoacordes-wrap' });
    const left = wrap.createDiv({ cls: 'autoacordes-col' });
    const right = wrap.createDiv({ cls: 'autoacordes-col' });

    const up = () => this.renderPreview();

    new Setting(left).setName('Artista').addText(t => { t.setPlaceholder('Los Delincuentes'); t.onChange(v => { this.state.artista = v; up(); }); this._artista = t; });
    new Setting(left).setName('Canción').addText(t => { t.setPlaceholder('La primavera trompetera'); t.onChange(v => { this.state.cancion = v; up(); }); this._cancion = t; });
    new Setting(left).setName('Otros artistas').setDesc('Separados por coma (opcional)').addText(t => { t.onChange(v => { this.state.otros = v; up(); }); });
    new Setting(left).setName('Género').addText(t => { t.setPlaceholder('Flamenco-rock'); t.onChange(v => { this.state.genero = v; up(); }); this._genero = t; });
    new Setting(left).setName('Tono').addText(t => { t.setPlaceholder('Em'); t.onChange(v => { this.state.tono = v; up(); }); this._tono = t; });
    new Setting(left).setName('Capo').addText(t => { t.setPlaceholder('0'); t.onChange(v => { this.state.capo = v; up(); }); this._capo = t; });

    const taSetting = new Setting(left).setName('Letra + acordes');
    taSetting.settingEl.addClass('autoacordes-ta-setting');
    const ta = taSetting.controlEl.createEl('textarea', { cls: 'autoacordes-textarea' });
    ta.placeholder = 'Pega aquí (Ctrl+V)…';
    ta.addEventListener('input', () => {
      const res = cleanPaste(ta.value);
      const fill = (key, comp, val) => { if (val && !this.state[key]) { this.state[key] = val; comp.setValue(val); } };
      fill('artista', this._artista, res.meta.artista);
      fill('cancion', this._cancion, res.meta.cancion);
      fill('genero', this._genero, res.meta.genero);
      fill('tono', this._tono, res.meta.tono);
      fill('capo', this._capo, res.meta.capo);
      this.state.raw = ta.value;
      up();
    });
    this._ta = ta;

    right.createEl('h3', { text: 'Vista previa' });
    this._prev = right.createEl('pre', { cls: 'autoacordes-preview' });

    this._msg = contentEl.createDiv({ cls: 'autoacordes-error' });

    const btns = contentEl.createDiv({ cls: 'autoacordes-buttons' });
    const save = btns.createEl('button', { text: 'Guardar', cls: 'mod-cta' });
    save.addEventListener('click', () => this.save());
    const cancel = btns.createEl('button', { text: 'Cancelar' });
    cancel.addEventListener('click', () => this.close());

    this.renderPreview();
    window.setTimeout(() => { if (this._artista && this._artista.inputEl) this._artista.inputEl.focus(); }, 30);
  }

  buildMeta() {
    const cleaned = cleanPaste(this.state.raw);
    return {
      meta: {
        artista: sanitizeName(this.state.artista) || 'Sin artista',
        cancion: sanitizeName(this.state.cancion) || 'Sin título',
        otros: this.state.otros.split(',').map(s => sanitizeName(s)).filter(x => x),
        genero: this.state.genero.trim(),
        tono: this.state.tono.trim(),
        capo: this.state.capo.trim()
      },
      body: cleaned.body
    };
  }

  renderPreview() {
    const prev = this._prev;
    const { meta, body } = this.buildMeta();
    if (!body.trim()) { prev.textContent = '(pega la letra con acordes para ver la previsualización)'; return; }
    prev.textContent = buildNote(meta, body, this.plugin.settings);
  }

  async save() {
    const { meta, body } = this.buildMeta();
    this._msg.textContent = '';
    if (!this.state.artista.trim()) { this._msg.textContent = 'Falta el artista.'; return; }
    if (!this.state.cancion.trim()) { this._msg.textContent = 'Falta el nombre de la canción.'; return; }
    if (!body.trim()) { this._msg.textContent = 'Falta la letra con acordes.'; return; }

    const base = this.plugin.settings.baseFolder.replace(/\/+$/, '');
    const folder = normalizePath(base + '/' + meta.artista);
    const path = normalizePath(folder + '/' + meta.cancion + '.md');

    if (!this.app.vault.getAbstractFileByPath(folder)) {
      try { await this.app.vault.createFolder(folder); } catch (e) { /* ya existe */ }
    }
    const existing = this.app.vault.getAbstractFileByPath(path);
    const content = buildNote(meta, body, this.plugin.settings);
    try {
      if (existing) {
        if (!this.state.overwrite) {
          this._msg.textContent = 'Ya existe "' + meta.cancion + '". Pulsa Guardar de nuevo para sobrescribir.';
          this.state.overwrite = true;
          return;
        }
        await this.app.vault.modify(existing, content);
      } else {
        await this.app.vault.create(path, content);
      }
    } catch (e) {
      this._msg.textContent = 'Error al guardar: ' + e.message;
      return;
    }
    new Notice('Guardado: ' + meta.artista + ' / ' + meta.cancion);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file) this.app.workspace.getLeaf(true).openFile(file);
    this.close();
  }

  onClose() { this.contentEl.empty(); }
}

/* =========================================================================
 *  Ajustes
 * ========================================================================= */

class AutoAcordesSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this; containerEl.empty();
    new Setting(containerEl).setName('Carpeta base').setDesc('Dónde se crean las carpetas de artista.')
      .addText(t => t.setValue(this.plugin.settings.baseFolder).onChange(async v => { this.plugin.settings.baseFolder = v.trim() || 'Acordes'; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Nota central (hub)').setDesc('Nota a la que enlazan todas las canciones. Vacío para desactivar.')
      .addText(t => t.setValue(this.plugin.settings.hubNote).onChange(async v => { this.plugin.settings.hubNote = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Versión móvil arriba').setDesc('Coloca la versión inline (móvil) antes que la de ordenador.')
      .addToggle(t => t.setValue(this.plugin.settings.mobileFirst).onChange(async v => { this.plugin.settings.mobileFirst = v; await this.plugin.saveSettings(); }));
  }
}

/* =========================================================================
 *  Plugin
 * ========================================================================= */

module.exports = class AutoAcordes extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon('music', 'Añadir canción (acordes)', () => new AddSongModal(this.app, this).open());
    this.addCommand({ id: 'add-song', name: 'Añadir canción (acordes)', callback: () => new AddSongModal(this.app, this).open() });
    this.addSettingTab(new AutoAcordesSettingTab(this.app, this));
  }
  async loadSettings() { this.settings = Object.assign({}, DEFAULTS, await this.loadData()); }
  async saveSettings() { await this.saveData(this.settings); }
};
