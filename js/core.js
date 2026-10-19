"use strict";
/**
 * js/core.js — DOM helpers, the SVG icon set, file-type metadata, user settings, and console/toast plumbing.
 *
 * Loaded as a classic script from index.html. Modules share one global
 * scope; keep the documented load order when adding files.
 */

/* ============ HELPERS ============ */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const enc=new TextEncoder(),dec=new TextDecoder();
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
/* ============ ICONS ============ */
const ICONS={
  logo:'<path d="M9 4 4 12l5 8"/><path d="m15 4 5 8-5 8"/>',
  filePlus:'<path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M12 12v6M9 15h6"/>',
  folderPlus:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v6M9 14h6"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 11l5 5 5-5"/><path d="M12 16V4"/>',
  play:'<polygon points="7 4.5 19 12 7 19.5" fill="currentColor" stroke="none"/>',
  external:'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  wand:'<path d="m3 21 9-9"/><path d="M15 5V3M15 11V9M9 9H7M21 9h-2M17.5 6.5 18.9 5.1M17.5 11.5l1.4 1.4M11.5 6.5 10.1 5.1"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  clipboard:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  selectAll:'<path d="M3 5a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3"/><path d="m9 12 2 2 4-4"/>',
  trash:'<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  trashAll:'<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="m9 13 6 6M15 13l-6 6"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  chevron:'<polyline points="9 18 15 12 9 6"/>',
  chevronDown:'<polyline points="6 9 12 15 18 9"/>',
  file:'<path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/>',
  audio:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  terminal:'<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v5h-5"/>',
  box:'<path d="m21 8-9-5-9 5v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v9"/>',
  cube:'<path d="m21 8-9-5-9 5v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v9"/>',
  layers:'<path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  zip:'<path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M10 3v3M12 6v3M10 9v3M12 12v3"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
  fileCode:'<path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="m10 12-2 2 2 2M14 12l2 2-2 2"/>',
  folderOpen:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/><path d="m3 9 2.4 9.3A2 2 0 0 0 7.3 20h9.9a2 2 0 0 0 1.9-1.4L22 9z"/>',
  collapse:'<path d="m7 13 5-5 5 5"/><path d="m7 18 5-5 5 5"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  wrap:'<path d="M3 6h18M3 12h15a3 3 0 1 1 0 6h-4"/><path d="m16 16-2 2 2 2"/><path d="M3 18h7"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
  command:'<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>',
  maximize:'<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>'
};
function ico(n,s=16){
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||ICONS.file}</svg>`;
}
/* ============ FILE TYPES ============ */
const TYPE={
  js:{l:'JS',c:'#f7df1e'},mjs:{l:'JS',c:'#f7df1e'},cjs:{l:'JS',c:'#f7df1e'},jsx:{l:'JSX',c:'#61dafb'},
  ts:{l:'TS',c:'#3178c6'},tsx:{l:'TSX',c:'#61dafb'},json:{l:'{}',c:'#cbcb41'},
  html:{l:'<>',c:'#e44d26'},htm:{l:'<>',c:'#e44d26'},xhtml:{l:'<>',c:'#e44d26'},
  css:{l:'CSS',c:'#2965f1'},scss:{l:'SCSS',c:'#cd6799'},less:{l:'LESS',c:'#1d365d'},sass:{l:'SASS',c:'#cd6799'},
  md:{l:'MD',c:'#8fa2bd'},markdown:{l:'MD',c:'#8fa2bd'},txt:{l:'TXT',c:'#8b93a7'},
  py:{l:'PY',c:'#3776ab'},pyw:{l:'PY',c:'#3776ab'},java:{l:'JV',c:'#e76f00'},
  c:{l:'C',c:'#5c6bc0'},h:{l:'H',c:'#5c6bc0'},cpp:{l:'C++',c:'#00599c'},hpp:{l:'C++',c:'#00599c'},
  cc:{l:'C++',c:'#00599c'},cxx:{l:'C++',c:'#00599c'},cs:{l:'C#',c:'#68217a'},
  rb:{l:'RB',c:'#cc342d'},go:{l:'GO',c:'#00add8'},rs:{l:'RS',c:'#dea584'},php:{l:'PHP',c:'#777bb4'},
  sh:{l:'SH',c:'#89e051'},bash:{l:'SH',c:'#89e051'},zsh:{l:'SH',c:'#89e051'},fish:{l:'SH',c:'#89e051'},
  bat:{l:'BAT',c:'#c1f12e'},ps1:{l:'PS',c:'#012456'},sql:{l:'SQL',c:'#e38c00'},
  vue:{l:'VUE',c:'#41b883'},svelte:{l:'SV',c:'#ff3e00'},yml:{l:'YML',c:'#cb171e'},yaml:{l:'YML',c:'#cb171e'},
  toml:{l:'TML',c:'#9c4121'},xml:{l:'XML',c:'#e37933'},svg:{l:'SVG',c:'#ffb13b'},
  glsl:{l:'GLSL',c:'#5586a4'},wgsl:{l:'WGSL',c:'#5586a4'},lua:{l:'LUA',c:'#000080'},
  swift:{l:'SW',c:'#f05138'},kt:{l:'KT',c:'#7f52ff'},kts:{l:'KT',c:'#7f52ff'},dart:{l:'DART',c:'#0175c2'},
  r:{l:'R',c:'#276dc3'},pl:{l:'PL',c:'#39457e'},pm:{l:'PL',c:'#39457e'},graphql:{l:'GQL',c:'#e10098'},
  gql:{l:'GQL',c:'#e10098'},proto:{l:'PROTO',c:'#4285f4'},csv:{l:'CSV',c:'#237346'},env:{l:'ENV',c:'#ecd53f'}
};
const TEXT_EXT=new Set(('js mjs cjs jsx ts tsx json html htm xhtml css scss sass less md markdown txt svg xml yml yaml toml ini cfg conf env gitignore glsl vert frag wgsl py pyw java c h cpp hpp cc cxx cs rb go rs php sh bash zsh fish bat ps1 sql vue svelte lua swift kt kts dart r pl pm csv tsv graphql gql proto asm s v vhd cshtml erb haml pug obj mtl dae').split(' '));
const IMAGE_EXT=new Set('png jpg jpeg gif webp bmp ico avif apng svg'.split(' '));
const AUDIO_EXT=new Set('mp3 wav ogg oga m4a aac flac opus weba'.split(' '));
const VIDEO_EXT=new Set('mp4 webm ogv mov m4v'.split(' '));
const FONT_EXT=new Set('ttf otf woff woff2'.split(' '));
const MODEL_EXT=new Set('glb gltf obj stl'.split(' '));
const MIME={
  html:'text/html;charset=utf-8',htm:'text/html;charset=utf-8',xhtml:'application/xhtml+xml',
  js:'text/javascript;charset=utf-8',mjs:'text/javascript;charset=utf-8',cjs:'text/javascript;charset=utf-8',jsx:'text/javascript;charset=utf-8',
  ts:'text/typescript;charset=utf-8',tsx:'text/typescript;charset=utf-8',json:'application/json;charset=utf-8',
  css:'text/css;charset=utf-8',scss:'text/css;charset=utf-8',less:'text/css;charset=utf-8',
  svg:'image/svg+xml',xml:'application/xml;charset=utf-8',md:'text/markdown;charset=utf-8',txt:'text/plain;charset=utf-8',
  png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp',ico:'image/x-icon',avif:'image/avif',apng:'image/apng',
  mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',oga:'audio/ogg',m4a:'audio/mp4',aac:'audio/aac',flac:'audio/flac',opus:'audio/opus',weba:'audio/webm',
  mp4:'video/mp4',webm:'video/webm',ogv:'video/ogg',mov:'video/quicktime',m4v:'video/mp4',
  glb:'model/gltf-binary',gltf:'model/gltf+json',ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2',
  pdf:'application/pdf',wasm:'application/wasm',zip:'application/zip'
};
const LANG={js:'JavaScript',mjs:'JavaScript',cjs:'JavaScript',jsx:'React',ts:'TypeScript',tsx:'TSX',json:'JSON',html:'HTML',htm:'HTML',xhtml:'HTML',css:'CSS',scss:'SCSS',less:'Less',md:'Markdown',svg:'SVG',xml:'XML',py:'Python',java:'Java',c:'C',cpp:'C++',cs:'C#',rb:'Ruby',go:'Go',rs:'Rust',php:'PHP',sh:'Shell',sql:'SQL',vue:'Vue',svelte:'Svelte',yml:'YAML',yaml:'YAML',toml:'TOML',txt:'Plain text',glsl:'GLSL',wgsl:'WGSL',obj:'Wavefront OBJ',glb:'glTF Binary',gltf:'glTF',stl:'STL'};
const extOf=p=>{const i=p.lastIndexOf('.');return i<0?'':p.slice(i+1).toLowerCase();};
const dirOf=p=>{const i=p.lastIndexOf('/');return i<0?'':p.slice(0,i);};
const baseOf=p=>{const i=p.lastIndexOf('/');return i<0?p:p.slice(i+1);};
const esc=s=>String(s).replace(/[&<>"]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':c==='>'?'&gt;':'&quot;');
const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fmtBytes=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB';
const mimeOf=p=>MIME[extOf(p)]||(TEXT_EXT.has(extOf(p))?'text/plain;charset=utf-8':'application/octet-stream');
const isText=p=>TEXT_EXT.has(extOf(p));

/* ============ SETTINGS ============ */
const DEFAULTS={theme:'obsidian',preview:'side',auto:true,highlight:true,lineNumbers:true,wrap:false,fontSize:13,tabSize:2,rotate:true,bg:'dark',currentLine:true};
let settings=Object.assign({},DEFAULTS);
try{Object.assign(settings,JSON.parse(localStorage.getItem('forge.settings')||'{}'));}catch(e){}
const saveSettings=()=>{try{localStorage.setItem('forge.settings',JSON.stringify(settings));}catch(e){}};

/* ============ DOM ============ */
const app=$('#app');
const ta=$('#code');
const hlPre=$('#hl');
const editorBody=$('#editorBody');
const gutter=$('#gutter');
const gutterInner=$('#gutterInner');
const treeEl=$('#tree');
const tabsEl=$('#tabs');
const viewerEl=$('#viewer');
const v3dEl=$('#viewer3d');
const v3dCanvas=$('#v3dCanvas');
const v3dLoading=$('#v3dLoading');
const consoleEl=$('#console');
const consoleBody=$('#consoleBody');
const inlineFrame=$('#inlinePreview');
const overlay=$('#overlay');
const overlayFrame=$('#previewFrame');

/* initial icons */
$('#logoSlot').innerHTML=ico('logo',15);
$('#btnNewFile').innerHTML=ico('filePlus');
$('#btnNewFolder').innerHTML=ico('folderPlus');
$('#btnRename').innerHTML=ico('edit');
$('#btnDelete').innerHTML=ico('trash');
$('#btnSearch').innerHTML=ico('search');
$('#btnSettings').innerHTML=ico('settings');
$('#btnRun').innerHTML=ico('play');
$('#btnCmdk').innerHTML=ico('command');
$('#btnWrap').innerHTML=ico('wrap');
$('#btnFormat').innerHTML=ico('wand');
$('#btnSelectAll').innerHTML=ico('selectAll');
$('#btnCopySel').innerHTML=ico('copy');
$('#btnPaste').innerHTML=ico('clipboard');
$('#btnCollapseAll').innerHTML=ico('collapse');
$('#btnDeleteAll').innerHTML=ico('trashAll');
$('#btnToggleConsole').innerHTML=ico('chevronDown');
$('#consoleIcon').innerHTML=ico('terminal',13);
$('#emptyIcon').innerHTML=ico('fileCode',22);
$('#overlayIcon').innerHTML=ico('globe',14);
$('#settingsIcon').innerHTML=ico('settings',14);
$('#searchIcon').innerHTML=ico('search',14);
$('#cmdkIcon').innerHTML=ico('command',16);
$('#searchClose').innerHTML=ico('x',14);
$('#settingsClose').innerHTML=ico('x',14);
$('#btnCloseOverlay').innerHTML=ico('x',14);
$('#btnPreviewReload').innerHTML=ico('refresh',13);
$('#btnPreviewPopout').innerHTML=ico('external',13);
$('#btnPreviewClose').innerHTML=ico('x',13);
$('#btn3dReset').innerHTML=ico('refresh',13);
$('#btn3dClose').innerHTML=ico('x',13);
$('#v3dIcon').innerHTML=ico('cube',13);

/* ============ TOASTS / LOGS ============ */
function toast(msg,type=''){
  const t=document.createElement('div');
  t.className='toast'+type;
  t.textContent=msg;
  $('#toasts').appendChild(t);
  setTimeout(()=>{
    t.classList.add('out');
    t.addEventListener('animationend',()=>t.remove(),{once:true});
  },2400);
}
const logs=[];const MAX_LOGS=600;let errCount=0;let logAutoScroll=true;
consoleBody.addEventListener('scroll',()=>{logAutoScroll=consoleBody.scrollHeight-consoleBody.scrollTop-consoleBody.clientHeight<40;});
function logEl(e){
  const d=document.createElement('div');
  d.className='log '+(e.level==='log'?'info':e.level);
  const lvl=document.createElement('span');lvl.className='lvl';lvl.textContent=e.level==='log'?'info':e.level;
  const msg=document.createElement('span');msg.className='msg';msg.textContent=e.text;
  if(e.meta&&e.meta.source){
    const s=document.createElement('span');s.className='src';s.textContent='→ '+e.meta.source+(e.meta.line?':'+e.meta.line:'');msg.appendChild(s);
  }
  if(e.meta&&e.meta.stack){const st=document.createElement('span');st.className='stack';st.textContent=e.meta.stack;msg.appendChild(st);}
  d.append(lvl,msg);return d;
}
function addLog(level,text,meta){
  const entry={level,text:String(text),meta:meta||null};
  logs.push(entry);
  if(logs.length>MAX_LOGS){logs.shift();consoleBody.innerHTML='';logs.forEach(e=>consoleBody.appendChild(logEl(e)));}
  else consoleBody.appendChild(logEl(entry));
  if(level==='error')errCount++;
  const b=$('#logCount');b.textContent=logs.length;b.classList.toggle('err',errCount>0);
  if(logAutoScroll)consoleBody.scrollTop=consoleBody.scrollHeight;
}
$('#btnClearLogs').onclick=()=>{logs.length=0;errCount=0;consoleBody.innerHTML='';$('#logCount').textContent='0';$('#logCount').classList.remove('err');};
$('#btnCopyLogs').onclick=async()=>{
  if(!logs.length)return toast('Console is empty');
  const txt=logs.map(l=>'['+l.level.toUpperCase()+'] '+l.text).join('\n');
  toast(await copyText(txt)?'Console copied':'Copy failed','ok');
};
$('#btnToggleConsole').onclick=()=>{
  consoleEl.classList.toggle('collapsed');
  $('#btnToggleConsole').innerHTML=ico(consoleEl.classList.contains('collapsed')?'chevron':'chevronDown',14);
  setTimeout(syncScroll,220);
};
async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true;}catch(e){}
  try{
    const t=document.createElement('textarea');
    t.value=text;t.style.cssText='position:fixed;opacity:0';
    document.body.appendChild(t);t.select();
    const ok=document.execCommand('copy');t.remove();return ok;
  }catch(e){return false;}
}


