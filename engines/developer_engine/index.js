/**
 * DropAnyConvert — Developer Engine v1.0.0
 *
 * All functions run entirely in the browser.
 * No backend, no uploads, no third-party accounts required.
 *
 * Contract for text tools:
 *   fn(input: string, opts: object) → { output: string, outputMime?, outputExt?, error? }
 *
 * Contract for image-output tools (QR, barcode):
 *   fn(input: string, opts: object) → { output: string (dataURL or SVG), outputMime, outputExt }
 *
 * Contract for image-input tools (QR reader):
 *   fn(dataUrl: string, opts: object) → { output: string }
 */

export const engineMeta = {
  id: 'developer_engine',
  version: '1.0.0',
  runtime: 'browser',
  capabilities: [
    'text-transform', 'encode-decode', 'hash', 'generate',
    'qr', 'barcode', 'jwt', 'regex', 'minify', 'beautify',
  ],
  dependencies: [],
};

// ── Self-hosted vendor library loader ─────────────────────────────────────
// All libraries are served from /assets/js/vendor/ — no CDN dependency.
// See scripts/copy-vendor.js for how they are vendored from node_modules.

const _libCache = {};

const VENDOR_LIBS = {
  jsyaml:    '/assets/js/vendor/js-yaml.min.js',
  QRCode:    '/assets/js/vendor/qrcode.min.js',
  jsQR:      '/assets/js/vendor/jsQR.js',
  JsBarcode: '/assets/js/vendor/JsBarcode.all.min.js',
};

async function loadLib(_, globalKey) {
  if (window[globalKey]) return window[globalKey];
  if (_libCache[globalKey]) return _libCache[globalKey];
  const url = VENDOR_LIBS[globalKey];
  if (!url) throw new Error(`Unknown vendor library: ${globalKey}`);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => { _libCache[globalKey] = window[globalKey]; resolve(window[globalKey]); };
    s.onerror = () => reject(new Error(`Failed to load vendor library: ${url}`));
    document.head.appendChild(s);
  });
}

// ── Compact MD5 (pure JS — Web Crypto does not support MD5) ──────────────

function md5hex(str) {
  function safeAdd(x, y) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a,b,c,d,x,s,t){return md5cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function md5gg(a,b,c,d,x,s,t){return md5cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function md5hh(a,b,c,d,x,s,t){return md5cmn(b^c^d,a,b,x,s,t);}
  function md5ii(a,b,c,d,x,s,t){return md5cmn(c^(b|(~d)),a,b,x,s,t);}

  const bytes = new TextEncoder().encode(str);
  const len8 = bytes.length;
  const extra = ((len8 + 8) >>> 6) + 1;
  const M = new Int32Array(extra * 16);
  for (let i = 0; i < len8; i++) M[i >> 2] |= bytes[i] << ((i % 4) * 8);
  M[len8 >> 2] |= 0x80 << ((len8 % 4) * 8);
  M[extra * 16 - 2] = len8 * 8;

  let [a, b, c, d] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let i = 0; i < M.length; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    const m = (j) => M[i + j];
    a=md5ff(a,b,c,d,m(0),7,-680876936);d=md5ff(d,a,b,c,m(1),12,-389564586);c=md5ff(c,d,a,b,m(2),17,606105819);b=md5ff(b,c,d,a,m(3),22,-1044525330);
    a=md5ff(a,b,c,d,m(4),7,-176418897);d=md5ff(d,a,b,c,m(5),12,1200080426);c=md5ff(c,d,a,b,m(6),17,-1473231341);b=md5ff(b,c,d,a,m(7),22,-45705983);
    a=md5ff(a,b,c,d,m(8),7,1770035416);d=md5ff(d,a,b,c,m(9),12,-1958414417);c=md5ff(c,d,a,b,m(10),17,-42063);b=md5ff(b,c,d,a,m(11),22,-1990404162);
    a=md5ff(a,b,c,d,m(12),7,1804603682);d=md5ff(d,a,b,c,m(13),12,-40341101);c=md5ff(c,d,a,b,m(14),17,-1502002290);b=md5ff(b,c,d,a,m(15),22,1236535329);
    a=md5gg(a,b,c,d,m(1),5,-165796510);d=md5gg(d,a,b,c,m(6),9,-1069501632);c=md5gg(c,d,a,b,m(11),14,643717713);b=md5gg(b,c,d,a,m(0),20,-373897302);
    a=md5gg(a,b,c,d,m(5),5,-701558691);d=md5gg(d,a,b,c,m(10),9,38016083);c=md5gg(c,d,a,b,m(15),14,-660478335);b=md5gg(b,c,d,a,m(4),20,-405537848);
    a=md5gg(a,b,c,d,m(9),5,568446438);d=md5gg(d,a,b,c,m(14),9,-1019803690);c=md5gg(c,d,a,b,m(3),14,-187363961);b=md5gg(b,c,d,a,m(8),20,1163531501);
    a=md5gg(a,b,c,d,m(13),5,-1444681467);d=md5gg(d,a,b,c,m(2),9,-51403784);c=md5gg(c,d,a,b,m(7),14,1735328473);b=md5gg(b,c,d,a,m(12),20,-1926607734);
    a=md5hh(a,b,c,d,m(5),4,-378558);d=md5hh(d,a,b,c,m(8),11,-2022574463);c=md5hh(c,d,a,b,m(11),16,1839030562);b=md5hh(b,c,d,a,m(14),23,-35309556);
    a=md5hh(a,b,c,d,m(1),4,-1530992060);d=md5hh(d,a,b,c,m(4),11,1272893353);c=md5hh(c,d,a,b,m(7),16,-155497632);b=md5hh(b,c,d,a,m(10),23,-1094730640);
    a=md5hh(a,b,c,d,m(13),4,681279174);d=md5hh(d,a,b,c,m(0),11,-358537222);c=md5hh(c,d,a,b,m(3),16,-722521979);b=md5hh(b,c,d,a,m(6),23,76029189);
    a=md5hh(a,b,c,d,m(9),4,-640364487);d=md5hh(d,a,b,c,m(12),11,-421815835);c=md5hh(c,d,a,b,m(15),16,530742520);b=md5hh(b,c,d,a,m(2),23,-995338651);
    a=md5ii(a,b,c,d,m(0),6,-198630844);d=md5ii(d,a,b,c,m(7),10,1126891415);c=md5ii(c,d,a,b,m(14),15,-1416354905);b=md5ii(b,c,d,a,m(5),21,-57434055);
    a=md5ii(a,b,c,d,m(12),6,1700485571);d=md5ii(d,a,b,c,m(3),10,-1894986606);c=md5ii(c,d,a,b,m(10),15,-1051523);b=md5ii(b,c,d,a,m(1),21,-2054922799);
    a=md5ii(a,b,c,d,m(8),6,1873313359);d=md5ii(d,a,b,c,m(15),10,-30611744);c=md5ii(c,d,a,b,m(6),15,-1560198380);b=md5ii(b,c,d,a,m(13),21,1309151649);
    a=md5ii(a,b,c,d,m(4),6,-145523070);d=md5ii(d,a,b,c,m(11),10,-1120210379);c=md5ii(c,d,a,b,m(2),15,718787259);b=md5ii(b,c,d,a,m(9),21,-343485551);
    a=safeAdd(a,oa); b=safeAdd(b,ob); c=safeAdd(c,oc); d=safeAdd(d,od);
  }
  function le32hex(n) {
    let s = '';
    for (let i = 0; i < 4; i++) s += ((n >> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    return s;
  }
  return le32hex(a) + le32hex(b) + le32hex(c) + le32hex(d);
}

// ── Web Crypto SHA helper ─────────────────────────────────────────────────

async function webCryptoHash(str, algorithm) {
  const data = new TextEncoder().encode(str);
  const buf  = await crypto.subtle.digest(algorithm, data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── YAML serialiser (JSON → YAML, no external lib needed) ────────────────

function jsonToYamlStr(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (obj === null) return 'null';
  if (typeof obj === 'boolean' || typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    if (/[:\n#\[\]{},&*?|<>=!%@`"']/.test(obj) || /^\s|\s$/.test(obj) || obj === '') return JSON.stringify(obj);
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(v => {
      if (typeof v === 'object' && v !== null) {
        const sub = jsonToYamlStr(v, indent + 1).replace(new RegExp(`^${'  '.repeat(indent + 1)}`), '');
        return `${pad}- ${sub}`;
      }
      return `${pad}- ${jsonToYamlStr(v, indent)}`;
    }).join('\n');
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    return keys.map(k => {
      const key = /[:\s#\[\]{},&*?|<>=!%@`"']/.test(k) ? JSON.stringify(k) : k;
      const v = obj[k];
      if (typeof v === 'object' && v !== null) return `${pad}${key}:\n${jsonToYamlStr(v, indent + 1)}`;
      return `${pad}${key}: ${jsonToYamlStr(v, 0)}`;
    }).join('\n');
  }
  return String(obj);
}

// ── XML helpers ───────────────────────────────────────────────────────────

function safeXml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function jsonObjToXmlStr(obj, tag = 'root', indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) return obj.map(item => jsonObjToXmlStr(item, tag, indent)).join('\n');
  if (typeof obj === 'object' && obj !== null) {
    const children = Object.entries(obj).map(([k, v]) => jsonObjToXmlStr(v, k, indent + 1)).join('\n');
    return `${pad}<${tag}>\n${children}\n${pad}</${tag}>`;
  }
  return `${pad}<${tag}>${safeXml(obj)}</${tag}>`;
}

function xmlNodeToObj(node) {
  if (node.nodeType === 3) return node.nodeValue.trim();
  const obj = {};
  for (const attr of node.attributes || []) obj[`@${attr.name}`] = attr.value;
  for (const child of node.childNodes) {
    if (child.nodeType === 3) { const t = child.nodeValue.trim(); if (t) obj['#text'] = t; continue; }
    if (child.nodeType === 8) continue;
    const key = child.nodeName;
    const val = xmlNodeToObj(child);
    if (key in obj) { if (!Array.isArray(obj[key])) obj[key] = [obj[key]]; obj[key].push(val); }
    else obj[key] = val;
  }
  const keys = Object.keys(obj);
  if (keys.length === 1 && keys[0] === '#text') return obj['#text'];
  if (keys.length === 0) return '';
  return obj;
}

function formatXmlStr(xmlStr) {
  let out = '', indent = 0;
  const reg = /(<\/?[^>]+>|[^<]+)/g;
  let m;
  while ((m = reg.exec(xmlStr)) !== null) {
    const t = m[0].trim();
    if (!t) continue;
    if (t.startsWith('</')) { indent--; out += '  '.repeat(Math.max(0, indent)) + t + '\n'; }
    else if (t.startsWith('<') && !t.startsWith('<?') && !t.startsWith('<!') && !t.endsWith('/>')) {
      out += '  '.repeat(indent) + t + '\n'; indent++;
    } else { out += '  '.repeat(Math.max(0, indent)) + t + '\n'; }
  }
  return out.trim();
}

// ── Input size guard ──────────────────────────────────────────────────────

const MAX_INPUT_BYTES = 2 * 1024 * 1024; // 2 MB

function guardInputSize(input) {
  if (new TextEncoder().encode(input).length > MAX_INPUT_BYTES) {
    throw new Error('Input is too large (max 2 MB). Paste a smaller snippet for in-browser processing.');
  }
}

// ── CSV helpers ───────────────────────────────────────────────────────────

function csvEscapeField(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function parseCsv(text) {
  const rows = []; let cur = '', inQuote = false, row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') { if (text[i+1] === '"') { cur += '"'; i++; } else inQuote = false; }
      else cur += ch;
    } else if (ch === '"') { inQuote = true; }
    else if (ch === ',') {
      if (row.length >= 1000) throw new Error('Too many columns (max 1000). Reduce the CSV width.');
      row.push(cur); cur = '';
    }
    else if (ch === '\n' || (ch === '\r' && text[i+1] === '\n')) {
      if (ch === '\r') i++;
      row.push(cur); cur = '';
      if (rows.length >= 10000) throw new Error('Too many rows (max 10,000). Split the CSV into smaller files.');
      rows.push(row); row = [];
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// ── Minify / Beautify helpers ─────────────────────────────────────────────

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
    .replace(/;\}/g, '}')
    .replace(/\s+/g, ' ')
    .trim();
}

function beautifyCss(css) {
  let out = '', indent = 0;
  const tokens = css.replace(/\s*([{}:;,])\s*/g, ' $1 ').split(/\s+/);
  for (const tok of tokens) {
    if (!tok) continue;
    if (tok === '{') { out += ' {\n'; indent++; }
    else if (tok === '}') { indent = Math.max(0, indent - 1); out += '  '.repeat(indent) + '}\n\n'; }
    else if (tok.endsWith(';')) { out += '  '.repeat(indent) + tok + '\n'; }
    else { out += '  '.repeat(indent) + tok; }
  }
  return out.trim();
}

function minifyHtml(html) {
  return html
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function beautifyHtml(html) {
  let out = '', indent = 0;
  const voidTags   = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const inlineTags = new Set(['a','abbr','b','bdi','bdo','cite','code','data','dfn','em','i','kbd','mark','q','rp','rt','ruby','s','samp','small','span','strong','sub','sup','time','u','var','wbr']);
  const tokens = html.split(/(<[^>]+>)/);
  for (const tok of tokens) {
    if (!tok.trim()) continue;
    if (tok.startsWith('</')) {
      const tag = tok.match(/<\/(\w+)/)?.[1]?.toLowerCase();
      if (!inlineTags.has(tag)) { indent = Math.max(0, indent - 1); out += '\n'; }
      out += '  '.repeat(indent) + tok;
    } else if (tok.startsWith('<') && !tok.startsWith('<!') && !tok.startsWith('<?')) {
      const tag = tok.match(/<(\w+)/)?.[1]?.toLowerCase();
      if (!inlineTags.has(tag)) out += '\n' + '  '.repeat(indent);
      out += tok;
      if (!voidTags.has(tag) && !inlineTags.has(tag) && !tok.endsWith('/>')) indent++;
    } else { out += tok; }
  }
  return out.replace(/^\n/, '').replace(/\n{3,}/g, '\n\n').trim();
}

function minifyJs(js) {
  let out = '', inStr = null, i = 0;
  while (i < js.length) {
    const ch = js[i];
    if (inStr) {
      out += ch;
      if (ch === '\\') { out += js[++i] || ''; i++; continue; }
      if (ch === inStr) inStr = null;
      i++; continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; out += ch; i++; continue; }
    if (ch === '/' && js[i+1] === '/') { while (i < js.length && js[i] !== '\n') i++; continue; }
    if (ch === '/' && js[i+1] === '*') { i += 2; while (i < js.length && !(js[i]==='*'&&js[i+1]==='/')) i++; i += 2; continue; }
    out += ch; i++;
  }
  return out.replace(/\s*([{}();,=+\-*/<>!&|?:[\]])\s*/g, '$1').replace(/\s+/g, ' ').trim();
}

function beautifyJs(js) {
  let out = '', indent = 0, inStr = null, i = 0;
  while (i < js.length) {
    const ch = js[i];
    if (inStr) {
      out += ch;
      if (ch === '\\') { out += js[++i] || ''; i++; continue; }
      if (ch === inStr) inStr = null;
      i++; continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; out += ch; i++; continue; }
    if (ch === '{') { out += ' {\n' + '  '.repeat(++indent); }
    else if (ch === '}') { indent = Math.max(0, indent - 1); out = out.trimEnd(); out += '\n' + '  '.repeat(indent) + '}'; }
    else if (ch === ';') { out += ';\n' + '  '.repeat(indent); }
    else { out += ch; }
    i++;
  }
  return out.replace(/\n\s*\n/g, '\n').trim();
}

// ── Color helpers ─────────────────────────────────────────────────────────

function parseColor(str) {
  str = str.trim();
  let m = str.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (m) {
    const h = m[1].length <= 4 ? m[1].split('').map(c => c+c).join('') : m[1];
    return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16),
             a: h.length === 8 ? parseInt(h.slice(6,8),16)/255 : 1 };
  }
  m = str.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  m = str.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (m) {
    const [hv, s, l, a] = [+m[1], +m[2]/100, +m[3]/100, m[4] !== undefined ? +m[4] : 1];
    const c = (1 - Math.abs(2*l - 1)) * s, x = c*(1-Math.abs((hv/60)%2-1)), mo = l-c/2;
    let r=0,g=0,b=0;
    if (hv<60){r=c;g=x;} else if(hv<120){r=x;g=c;} else if(hv<180){g=c;b=x;}
    else if(hv<240){g=x;b=c;} else if(hv<300){r=x;b=c;} else{r=c;b=x;}
    return { r: Math.round((r+mo)*255), g: Math.round((g+mo)*255), b: Math.round((b+mo)*255), a };
  }
  return null;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l*100) };
  const d = max-min, s = l > 0.5 ? d/(2-max-min) : d/(max+min);
  const h = max===r ? (g-b)/d+(g<b?6:0) : max===g ? (b-r)/d+2 : (r-g)/d+4;
  return { h: Math.round(h*60), s: Math.round(s*100), l: Math.round(l*100) };
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Public exports ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// JSON
export function devFormatJson(input, opts = {}) {
  guardInputSize(input);
  const indent = opts.indent === '\t' ? '\t' : (parseInt(opts.indent, 10) || 2);
  return { output: JSON.stringify(JSON.parse(input.trim()), null, indent), outputExt: 'json', outputMime: 'application/json' };
}
export function devBeautifyJson(input, opts = {}) { return devFormatJson(input, opts); }
export function devMinifyJson(input) {
  guardInputSize(input);
  return { output: JSON.stringify(JSON.parse(input.trim())), outputExt: 'json', outputMime: 'application/json' };
}
export function devValidateJson(input) {
  try {
    const p = JSON.parse(input.trim());
    const type = Array.isArray(p) ? 'array' : typeof p;
    const count = Array.isArray(p) ? p.length : typeof p === 'object' && p !== null ? Object.keys(p).length : 0;
    const detail = type === 'array' ? ` — ${count} items` : type === 'object' ? ` — ${count} keys` : '';
    return { output: `✓ Valid JSON\nType    : ${type}${detail}\nBytes   : ${new TextEncoder().encode(input.trim()).length}`, valid: true };
  } catch (e) {
    return { output: `✗ Invalid JSON\n\n${e.message}`, valid: false, error: e.message };
  }
}
export function devJsonToYaml(input) {
  guardInputSize(input);
  return { output: jsonToYamlStr(JSON.parse(input.trim())), outputExt: 'yaml', outputMime: 'text/yaml' };
}
export async function devYamlToJson(input) {
  guardInputSize(input);
  let yaml;
  try { yaml = await loadLib('https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js', 'jsyaml'); }
  catch { throw new Error('Could not load YAML library. Check your internet connection and try again.'); }
  return { output: JSON.stringify(yaml.load(input), null, 2), outputExt: 'json', outputMime: 'application/json' };
}
export function devJsonToXml(input) {
  guardInputSize(input);
  const p = JSON.parse(input.trim());
  const keys = typeof p === 'object' && p !== null && !Array.isArray(p) ? Object.keys(p) : [];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += keys.length === 1 ? jsonObjToXmlStr(p[keys[0]], keys[0]) : jsonObjToXmlStr(p, 'root');
  return { output: xml, outputExt: 'xml', outputMime: 'application/xml' };
}
export function devXmlToJson(input) {
  guardInputSize(input);
  const doc = new DOMParser().parseFromString(input.trim(), 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Invalid XML: ' + err.textContent.split('\n')[0]);
  const root = doc.documentElement;
  return { output: JSON.stringify({ [root.nodeName]: xmlNodeToObj(root) }, null, 2), outputExt: 'json', outputMime: 'application/json' };
}
export function devJsonToCsv(input) {
  guardInputSize(input);
  const data = JSON.parse(input.trim());
  if (!Array.isArray(data)) throw new Error('Input must be a JSON array of objects.');
  if (!data.length) return { output: '', outputExt: 'csv', outputMime: 'text/csv' };
  const headers = [...new Set(data.flatMap(r => Object.keys(r)))];
  const rows = [headers.map(csvEscapeField).join(','), ...data.map(r => headers.map(h => csvEscapeField(r[h] ?? '')).join(','))];
  return { output: rows.join('\r\n'), outputExt: 'csv', outputMime: 'text/csv' };
}
export function devCsvToJson(input) {
  guardInputSize(input);
  const rows = parseCsv(input.trim());
  if (rows.length < 2) throw new Error('CSV must have a header row and at least one data row.');
  const [headers, ...data] = rows;
  const out = data.filter(r => r.some(v => v.trim())).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = r[i] ?? ''; });
    return obj;
  });
  return { output: JSON.stringify(out, null, 2), outputExt: 'json', outputMime: 'application/json' };
}

// XML
export function devFormatXml(input) {
  guardInputSize(input);
  const doc = new DOMParser().parseFromString(input.trim(), 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Invalid XML: ' + err.textContent.split('\n')[0]);
  return { output: formatXmlStr(input.trim()), outputExt: 'xml', outputMime: 'application/xml' };
}
export function devBeautifyXml(input) { return devFormatXml(input); }
export function devValidateXml(input) {
  guardInputSize(input);
  const doc = new DOMParser().parseFromString(input.trim(), 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) { const msg = err.textContent.split('\n').slice(0,2).join(' — ').trim(); return { output: `✗ Invalid XML\n\n${msg}`, valid: false, error: msg }; }
  const root = doc.documentElement;
  return { output: `✓ Well-formed XML\nRoot element : <${root.nodeName}>\nElements     : ${doc.querySelectorAll('*').length}\nEncoding     : ${doc.xmlEncoding || 'UTF-8'}`, valid: true };
}
export function devMinifyXml(input) {
  guardInputSize(input);
  const doc = new DOMParser().parseFromString(input.trim(), 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Invalid XML: ' + err.textContent.split('\n')[0]);
  return { output: new XMLSerializer().serializeToString(doc).replace(/>\s+</g,'><').trim(), outputExt: 'xml', outputMime: 'application/xml' };
}

// YAML
export async function devFormatYaml(input) {
  guardInputSize(input);
  let yaml;
  try { yaml = await loadLib('https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js', 'jsyaml'); }
  catch { throw new Error('Could not load YAML library. Check your internet connection and try again.'); }
  return { output: yaml.dump(yaml.load(input), { indent: 2, lineWidth: 120 }), outputExt: 'yaml', outputMime: 'text/yaml' };
}
export async function devValidateYaml(input) {
  guardInputSize(input);
  let yaml;
  try { yaml = await loadLib('https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js', 'jsyaml'); }
  catch { throw new Error('Could not load YAML library. Check your internet connection and try again.'); }
  try {
    const p = yaml.load(input);
    const type = Array.isArray(p) ? 'sequence' : typeof p === 'object' && p !== null ? 'mapping' : typeof p;
    return { output: `✓ Valid YAML\nRoot type : ${type}\nLines     : ${input.split('\n').length}`, valid: true };
  } catch (e) {
    return { output: `✗ Invalid YAML\n\n${e.message}`, valid: false, error: e.message };
  }
}

// Encoding
export function devBase64Encode(input) { return { output: btoa(unescape(encodeURIComponent(input))) }; }
export function devBase64Decode(input) {
  try { return { output: decodeURIComponent(escape(atob(input.trim().replace(/\s/g, '')))) }; }
  catch { throw new Error('Invalid Base64 string. Ensure it contains only A–Z, a–z, 0–9, +, /, and = characters.'); }
}
export function devUrlEncode(input) { return { output: encodeURIComponent(input) }; }
export function devUrlDecode(input) {
  try { return { output: decodeURIComponent(input.replace(/\+/g, ' ')) }; }
  catch { throw new Error('Invalid URL-encoded string. Check for malformed percent sequences.'); }
}
export function devHtmlEncode(input) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(input));
  return { output: d.innerHTML };
}
export function devHtmlDecode(input) {
  const d = document.createElement('div');
  d.innerHTML = input;
  return { output: d.textContent };
}

// Hashing
export function devMd5(input) { return { output: md5hex(input) }; }
export async function devSha1(input)   { return { output: await webCryptoHash(input, 'SHA-1') }; }
export async function devSha256(input) { return { output: await webCryptoHash(input, 'SHA-256') }; }
export async function devSha512(input) { return { output: await webCryptoHash(input, 'SHA-512') }; }

// Generators
export function devUuid(input, opts = {}) {
  const count = Math.min(Math.max(parseInt(opts.count,10)||1,1),100);
  const fmt = opts.format || 'lowercase';
  const ids = Array.from({length:count}, () => {
    let id = crypto.randomUUID();
    if (fmt === 'uppercase') id = id.toUpperCase();
    else if (fmt === 'nodash') id = id.replace(/-/g, '');
    return id;
  });
  return { output: ids.join('\n') };
}
export function devPassword(input, opts = {}) {
  const len = Math.min(Math.max(parseInt(opts.length,10)||16,6),128);
  const count = Math.min(Math.max(parseInt(opts.count,10)||1,1),20);
  let charset = '';
  if (opts.uppercase !== 'false' && opts.uppercase !== false) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (opts.lowercase !== 'false' && opts.lowercase !== false) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (opts.numbers  !== 'false' && opts.numbers  !== false) charset += '0123456789';
  if (opts.symbols  !== 'false' && opts.symbols  !== false) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!charset) throw new Error('Select at least one character set.');
  const passwords = Array.from({length:count}, () => {
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, v => charset[v % charset.length]).join('');
  });
  return { output: passwords.join('\n') };
}
export function devRandomString(input, opts = {}) {
  const len = Math.min(Math.max(parseInt(opts.length,10)||32,1),1000);
  const count = Math.min(Math.max(parseInt(opts.count,10)||1,1),100);
  const charset = opts.charset === 'alphabetic'  ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
                : opts.charset === 'numeric'      ? '0123456789'
                : opts.charset === 'hex'          ? '0123456789abcdef'
                : opts.charset === 'custom'       ? (opts.customAlphabet || 'ABCabc123')
                : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  if (!charset) throw new Error('Alphabet cannot be empty.');
  const results = Array.from({length:count}, () => {
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, v => charset[v % charset.length]).join('');
  });
  return { output: results.join('\n') };
}

// QR Code
export async function devQrGenerate(input, opts = {}) {
  if (!input.trim()) throw new Error('Please enter text or a URL to encode as a QR code.');
  let QRCode;
  try { QRCode = await loadLib('https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js', 'QRCode'); }
  catch { throw new Error('Could not load QR code library. Check your internet connection and try again.'); }
  const size       = Math.min(Math.max(parseInt(opts.size,10)||300,100),1000);
  const errLevel   = ['L','M','Q','H'].includes(opts.errorLevel) ? opts.errorLevel : 'M';
  const dataUrl    = await QRCode.toDataURL(input.trim(), {
    width: size, errorCorrectionLevel: errLevel,
    color: { dark: opts.darkColor||'#000000', light: opts.lightColor||'#ffffff' }, margin: 2,
  });
  return { output: dataUrl, outputType: 'image', outputExt: 'png', outputMime: 'image/png' };
}

export async function devQrRead(dataUrl) {
  if (!dataUrl) throw new Error('Please provide an image containing a QR code.');
  let jsQR;
  try { jsQR = await loadLib('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js', 'jsQR'); }
  catch { throw new Error('Could not load QR reader library. Check your internet connection and try again.'); }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(id.data, id.width, id.height);
      code ? resolve({ output: code.data }) : reject(new Error('No QR code detected. Ensure the image is clear and contains a valid QR code.'));
    };
    img.onerror = () => reject(new Error('Failed to load image.'));
    img.src = dataUrl;
  });
}

// Barcode
export async function devBarcode(input, opts = {}) {
  if (!input.trim()) throw new Error('Please enter content to encode as a barcode.');
  let JsBarcode;
  try { JsBarcode = await loadLib('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js', 'JsBarcode'); }
  catch { throw new Error('Could not load barcode library. Check your internet connection and try again.'); }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, input.trim(), {
      format:       opts.format || 'CODE128',
      width:        Math.min(Math.max(parseInt(opts.width,10)||2,1),5),
      height:       Math.min(Math.max(parseInt(opts.height,10)||80,30),200),
      displayValue: opts.displayValue !== 'false' && opts.displayValue !== false,
      margin: 10,
    });
  } catch (e) { throw new Error(`Cannot generate ${opts.format||'CODE128'} barcode: ${e.message}`); }
  return { output: new XMLSerializer().serializeToString(svg), outputType: 'image-svg', outputExt: 'svg', outputMime: 'image/svg+xml' };
}

// JWT
function jwtParts(token) {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT: must have exactly three dot-separated parts.');
  function b64d(s) { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'='))))); }
  return { header: b64d(parts[0]), payload: b64d(parts[1]), signature: parts[2] };
}
export function devJwtDecode(input) {
  const { header, payload, signature } = jwtParts(input);
  return { output: JSON.stringify({ header, payload, signature: `[${signature.length} chars]` }, null, 2), outputExt: 'json', outputMime: 'application/json' };
}
export function devJwtInspect(input) {
  const { header, payload } = jwtParts(input);
  const now = Math.floor(Date.now()/1000);
  const lines = ['═══ JWT INSPECTOR ═══\n',
    `Algorithm  : ${header.alg||'—'}`, `Type       : ${header.typ||'—'}`,
    ...(header.kid ? [`Key ID     : ${header.kid}`] : []), '',
    '─── Standard Claims ───',
  ];
  for (const [k, label] of [['iss','Issuer'],['sub','Subject'],['aud','Audience'],['jti','JWT ID']]) {
    if (payload[k] !== undefined) lines.push(`${label.padEnd(12)}: ${payload[k]}`);
  }
  if (payload.iat) lines.push(`Issued At  : ${new Date(payload.iat*1000).toISOString()}`);
  if (payload.nbf) lines.push(`Not Before : ${new Date(payload.nbf*1000).toISOString()} — ${now>=payload.nbf?'✓ active':'✗ not yet active'}`);
  if (payload.exp) {
    const diff = payload.exp - now;
    lines.push(`Expiration : ${new Date(payload.exp*1000).toISOString()} — ${diff<0?`✗ EXPIRED ${Math.abs(diff)}s ago`:`✓ valid (${diff}s remaining)`}`);
  }
  const custom = Object.keys(payload).filter(k => !['iss','sub','aud','exp','nbf','iat','jti'].includes(k));
  if (custom.length) { lines.push('', '─── Custom Claims ───'); custom.forEach(k => lines.push(`${k}: ${JSON.stringify(payload[k])}`)); }
  lines.push('', '─── Full Payload ───', JSON.stringify(payload, null, 2));
  return { output: lines.join('\n') };
}

// Regex
export function devRegex(pattern, opts = {}) {
  const testStr = opts.testInput || '';
  const flags = (opts.flags || 'g').replace(/[^gimsuy]/g, '');
  let re;
  try { re = new RegExp(pattern, flags); }
  catch (e) { return { output: `✗ Invalid regex\n\n${e.message}`, valid: false, error: e.message }; }
  const MAX_MATCHES = 500;
  const matches = [];
  let m;
  if (flags.includes('g')) {
    while ((m = re.exec(testStr)) !== null) {
      matches.push({ index: m.index, match: m[0], groups: [...m.slice(1)], namedGroups: m.groups||{} });
      if (m.index === re.lastIndex) re.lastIndex++;
      if (matches.length >= MAX_MATCHES) break;
    }
  } else { m = re.exec(testStr); if (m) matches.push({ index: m.index, match: m[0], groups: [...m.slice(1)], namedGroups: m.groups||{} }); }
  const truncated = matches.length >= MAX_MATCHES;
  const lines = [`Pattern : /${pattern}/${flags}`, `Matches : ${truncated ? `${matches.length}+ (first ${MAX_MATCHES} shown)` : matches.length}`, ''];
  if (!matches.length) { lines.push('No matches found.'); }
  else {
    matches.forEach((match, i) => {
      lines.push(`Match ${i+1} : "${match.match}" at index ${match.index}–${match.index+match.match.length-1}`);
      if (match.groups.length) lines.push(`  Groups : ${match.groups.map((g,j)=>`$${j+1}="${g??'undefined'}"`).join(', ')}`);
      if (Object.keys(match.namedGroups).length) Object.entries(match.namedGroups).forEach(([k,v]) => lines.push(`  ${k} : "${v}"`));
    });
  }
  return { output: lines.join('\n'), matchCount: matches.length, matches };
}

// Timestamp
export function devTimestamp(input) {
  const str = input.trim();
  let ts, date;
  if (/^\d{10}$/.test(str)) { ts = parseInt(str,10); date = new Date(ts*1000); }
  else if (/^\d{13}$/.test(str)) { ts = Math.floor(parseInt(str,10)/1000); date = new Date(parseInt(str,10)); }
  else {
    date = new Date(str);
    if (isNaN(date.getTime())) throw new Error('Cannot parse input. Enter a 10-digit Unix timestamp, 13-digit millisecond timestamp, or ISO 8601 date.');
    ts = Math.floor(date.getTime()/1000);
  }
  if (isNaN(date.getTime())) throw new Error('Invalid timestamp.');
  const dow = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getUTCDay()];
  const woy = Math.ceil((((date-new Date(Date.UTC(date.getUTCFullYear(),0,1)))/864e5)+new Date(Date.UTC(date.getUTCFullYear(),0,1)).getUTCDay()+1)/7);
  return { output: [
    `Unix (seconds)  : ${ts}`,
    `Unix (ms)       : ${ts*1000}`,
    `UTC             : ${date.toUTCString()}`,
    `ISO 8601        : ${date.toISOString()}`,
    `Local Time      : ${date.toLocaleString()}`,
    `Date            : ${date.toISOString().slice(0,10)}`,
    `Day of Week     : ${dow}`,
    `Week of Year    : ${woy}`,
  ].join('\n') };
}

// Color
export function devColor(input) {
  const color = parseColor(input.trim());
  if (!color) throw new Error('Unrecognized color. Try #ff6b6b, rgb(255,107,107), or hsl(0,100%,71%).');
  const { r, g, b, a } = color;
  const hsl = rgbToHsl(r, g, b);
  const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
  const lines = [
    `HEX   : ${hex}`,
    ...(a < 1 ? [`HEX+A : ${hex}${Math.round(a*255).toString(16).padStart(2,'0')}`] : []),
    `RGB   : rgb(${r}, ${g}, ${b})`,
    ...(a < 1 ? [`RGBA  : rgba(${r}, ${g}, ${b}, ${a})`] : []),
    `HSL   : hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    ...(a < 1 ? [`HSLA  : hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})`] : []),
    `R     : ${r}   (${Math.round(r/255*100)}%)`,
    `G     : ${g}   (${Math.round(g/255*100)}%)`,
    `B     : ${b}   (${Math.round(b/255*100)}%)`,
    `Hue   : ${hsl.h}°`,
    `Sat   : ${hsl.s}%`,
    `Light : ${hsl.l}%`,
  ];
  if (a < 1) lines.push(`Alpha : ${Math.round(a*100)}%`);
  return { output: lines.join('\n'), meta: { hex, r, g, b, a, h: hsl.h, s: hsl.s, l: hsl.l } };
}

// Minifiers
export function devHtmlMinify(input)   { guardInputSize(input); return { output: minifyHtml(input), outputExt: 'html', outputMime: 'text/html' }; }
export function devCssMinify(input)    { guardInputSize(input); return { output: minifyCss(input),  outputExt: 'css',  outputMime: 'text/css' }; }
export function devJsMinify(input)     { guardInputSize(input); return { output: minifyJs(input),   outputExt: 'js',   outputMime: 'text/javascript' }; }

// Beautifiers
export function devHtmlBeautify(input) { guardInputSize(input); return { output: beautifyHtml(input), outputExt: 'html', outputMime: 'text/html' }; }
export function devCssBeautify(input)  { guardInputSize(input); return { output: beautifyCss(input),  outputExt: 'css',  outputMime: 'text/css' }; }
export function devJsBeautify(input)   { guardInputSize(input); return { output: beautifyJs(input),   outputExt: 'js',   outputMime: 'text/javascript' }; }
