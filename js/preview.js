"use strict";
/**
 * js/preview.js — Preview bundler: rewrites project-relative URLs, builds blob/data bundles, and manages live preview.
 *
 * Loaded as a classic script from index.html. Modules share one global
 * scope; keep the documented load order when adding files.
 */

/* ============ PREVIEW BUILD ============ */
class Build{
  constructor(){this.urls=[];this.cache=new Map();}
  dispose(){this.urls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});this.urls=[];this.cache.clear();}
  url(path,stack,mode){
    const key=mode+':'+path;
    if(this.cache.has(key))return this.cache.get(key);
    const node=nodes.get(path);
    if(!node||node.type!=='file')return null;
    if(stack.includes(path))return null;
    const nextStack=stack.concat(path);
    const ext=extOf(path);
    let bytes;
    if(node.binary)bytes=node.data;
    else{
      let text=node.content||'';
      const dir=dirOf(path);
      if(['js','mjs','cjs','jsx'].includes(ext))text=rewriteJS(text,dir,nextStack,mode,this);
      else if(['css','scss','less'].includes(ext))text=rewriteCSS(text,dir,nextStack,mode,this);
      else if(['html','htm','xhtml'].includes(ext))text=rewriteHTML(text,dir,nextStack,mode,this);
      bytes=enc.encode(text);
    }
    let url;
    if(mode==='data')url=toDataUrl(mimeOf(path),bytes);
    else{url=URL.createObjectURL(new Blob([bytes],{type:mimeOf(path)}));this.urls.push(url);}
    this.cache.set(key,url);return url;
  }
}
function resolvePath(base,rel){
  if(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rel)||rel.startsWith('//')||rel.startsWith('#'))return null;
  const clean=rel.split('?')[0].split('#')[0];
  if(!clean)return null;
  const parts=clean.startsWith('/')?[]:(base?base.split('/').filter(Boolean):[]);
  for(const seg of clean.split('/')){
    if(!seg||seg==='.')continue;
    if(seg==='..')parts.pop();else parts.push(seg);
  }
  return parts.join('/');
}
function toDataUrl(mime,bytes){
  let bin='';
  const CH=0x8000;
  for(let i=0;i<bytes.length;i+=CH)bin+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(i+CH,bytes.length)));
  return 'data:'+mime+';base64,'+btoa(bin);
}
function rewriteJS(js,dir,stack,mode,build){
  const local=spec=>{
    if(/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/|#)/.test(spec))return null;
    const rp=resolvePath(dir,spec);
    if(!rp||!nodes.has(rp))return null;
    return build.url(rp,stack,mode);
  };
  js=js.replace(/(\bimport\s*\(\s*|\bfrom\s+|\bimport\s+)(["'])([^"'\n]+)\2/g,(m,pre,q,spec)=>{
    const u=local(spec);return u?pre+q+u+q:m;
  });
  js=js.replace(/(\b(?:fetch|importScripts)\s*\(\s*|\bnew\s+(?:Worker|SharedWorker|Audio)\s*\(\s*)(["'])([^"'\n]+)\2/g,(m,pre,q,spec)=>{
    const u=local(spec);return u?pre+q+u+q:m;
  });
  js=js.replace(/\bnew\s+URL\(\s*(["'])([^"'\n]+)\1(\s*,\s*import\.meta\.url\s*\))/g,(m,q,spec,tail)=>{
    const u=local(spec);return u?'new URL('+q+u+q+tail:m;
  });
  return js;
}
function rewriteCSS(css,dir,stack,mode,build){
  css=css.replace(/@import\s+(?:url\(\s*)?(['"])([^'"]+)\1\s*\)?\s*;/g,(m,q,u)=>{
    const rp=resolvePath(dir,u);
    if(!rp||!nodes.has(rp))return m;
    const url=build.url(rp,stack,mode);
    return url?'@import url('+q+url+q+');':m;
  });
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g,(m,q,u)=>{
    if(/^(data:|https?:|blob:|#|\/\/)/.test(u))return m;
    const rp=resolvePath(dir,u);
    if(!rp||!nodes.has(rp))return m;
    const url=build.url(rp,stack,mode);
    return url?'url('+q+url+q+')':m;
  });
}
function rewriteHTML(html,dir,stack,mode,build){
  html=html.replace(/(\s(?:src|href|poster|data-src)\s*=\s*)(["'])([^"']+)\2/gi,(m,pre,q,u)=>{
    if(/^(data:|https?:|blob:|mailto:|tel:|#|\/\/|javascript:)/i.test(u))return m;
    const rp=resolvePath(dir,u);
    if(!rp||!nodes.has(rp))return m;
    const url=build.url(rp,stack,mode);
    return url?pre+q+url+q:m;
  });
  html=html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,(m,a,css,b)=>a+rewriteCSS(css,dir,stack,mode,build)+b);
  html=html.replace(/(<script(?![^>]*\ssrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,(m,a,js,b)=>a+rewriteJS(js,dir,stack,mode,build)+b);
  return html;
}
function previewRuntime(){
  function ser(v,depth,seen){
    seen=seen||[];depth=depth||0;
    if(v===null)return'null';
    if(v===undefined)return'undefined';
    const t=typeof v;
    if(t==='string')return depth===0?v:JSON.stringify(v);
    if(t==='number'||t==='boolean')return String(v);
    if(t==='bigint')return String(v)+'n';
    if(t==='symbol')return v.toString();
    if(t==='function')return 'ƒ '+(v.name||'anonymous')+'()';
    if(v instanceof Error)return (v.name||'Error')+': '+v.message+(v.stack?'\n'+v.stack:'');
    if(seen.includes(v))return'[Circular]';
    if(depth>4)return'…';
    if(Array.isArray(v))return '['+v.map(x=>ser(x,depth+1,seen.concat(v))).join(', ')+']';
    if(typeof Node!=='undefined'&&v instanceof Node)return '<'+v.nodeName.toLowerCase()+(v.id?'#'+v.id:'')+'>';
    try{return JSON.stringify(v,(k,val)=>typeof val==='function'?'ƒ '+(val.name||'anonymous')+'()':val,2);}catch(e){return String(v);}
  }
  function post(level,parts,extra){
    const msg={__forge:true,level,text:parts.map(p=>ser(p)).join(' ')};
    if(extra)Object.assign(msg,extra);
    try{if(window.parent!==window)window.parent.postMessage(msg,'*');}catch(e){}
  }
  ['log','info','warn','error','debug'].forEach(m=>{
    const orig=console[m];
    console[m]=function(){
      const args=Array.prototype.slice.call(arguments);
      try{orig.apply(console,args);}catch(e){}
      let extra=null;
      for(const a of args)if(a instanceof Error&&a.stack){extra={stack:a.stack};break;}
      post(m==='debug'?'log':m,args,extra);
    };
  });
  window.addEventListener('error',e=>{
    let stack=(e.error&&e.error.stack)||'';
    if(!stack)stack='at '+(e.filename||'<anonymous>')+':'+(e.lineno||0)+':'+(e.colno||0);
    post('error',['Uncaught '+(e.message||'Unknown error')],{stack,source:e.filename||null,line:e.lineno||null});
  });
  window.addEventListener('unhandledrejection',e=>{
    const r=e.reason;
    post('error',['Unhandled promise rejection: '+((r&&r.message)||String(r))],{stack:(r&&r.stack)||''});
  });
}
const RUNTIME_SRC='('+previewRuntime.toString()+')();';
function injectRuntime(html){
  const tag='<script>'+RUNTIME_SRC+'<\/script>';
  if(/<\/body>/i.test(html))return html.replace(/<\/body>/i,tag+'</body>');
  if(/<\/html>/i.test(html))return html.replace(/<\/html>/i,tag+'</html>');
  return html+tag;
}
function htmlFiles(){
  const out=[];
  nodes.forEach((n,p)=>{if(n.type==='file'&&/\.(?:html?|xhtml)$/i.test(p))out.push(p);});
  return out.sort();
}
function resolveEntry(){
  if(entryPath&&nodes.has(entryPath)&&nodes.get(entryPath).type==='file')return entryPath;
  const htmls=htmlFiles();
  if(htmls.includes('index.html'))return'index.html';
  if(htmls.length)return htmls[0];
  const all=[];
  nodes.forEach((n,p)=>{if(n.type==='file')all.push(p);});
  return all.sort()[0]||null;
}
function buildPreviewHTML(build,mode){
  const entry=resolveEntry();
  if(!entry)throw new Error('No files in project');
  const node=nodes.get(entry);
  const ext=extOf(entry);
  let html;
  if(['html','htm','xhtml'].includes(ext)){
    html=rewriteHTML(node.content||'',dirOf(entry),[entry],mode,build);
  }else{
    const url=build.url(entry,[],mode);
    if(IMAGE_EXT.has(ext)){
      html='<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;min-height:100%;background:#0b0e13;display:grid;place-items:center}</style></head><body><img src="'+url+'" style="max-width:100%"></body></html>';
    }else if(AUDIO_EXT.has(ext)){
      html='<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;min-height:100%;background:#0b0e13;display:grid;place-items:center}</style></head><body><audio controls src="'+url+'"></audio></body></html>';
    }else if(VIDEO_EXT.has(ext)){
      html='<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;min-height:100%;background:#000;display:grid;place-items:center}</style></head><body><video controls src="'+url+'" style="max-width:100%"></video></body></html>';
    }else if(['css','scss','less'].includes(ext)){
      html='<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="'+url+'"></head>'+
        '<body style="font-family:system-ui;padding:24px;color:#d7dde8;background:#0b0e13"><p>Stylesheet loaded.</p></body></html>';
    }else{
      html='<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;min-height:100%;background:#0b0e13;color:#d7dde8;font-family:system-ui,sans-serif}</style></head>'+
        '<body><script type="module" src="'+url+'"><\/script></body></html>';
    }
  }
  return injectRuntime(html);
}

/* ============ PREVIEW ============ */
let inlineBuild=null;
let previewTimer=null;
function schedulePreview(){
  if(!settings.auto||settings.preview==='off'||settings.preview==='popup')return;
  clearTimeout(previewTimer);
  previewTimer=setTimeout(refreshInline,650);
}
function refreshInline(){
  if(settings.preview==='off'||settings.preview==='popup')return;
  if(!nodes.size){
    inlineFrame.srcdoc='<!DOCTYPE html><html><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0b0b0e;color:#68717e;font-size:12px">No files in project</body></html>';
    return;
  }
  const build=new Build();
  let html;
  try{html=buildPreviewHTML(build,'blob');}
  catch(e){build.dispose();addLog('error','Preview failed: '+e.message);return;}
  const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));
  build.urls.push(url);
  const old=inlineBuild;
  inlineBuild=build;
  inlineFrame.src=url;
  if(old)setTimeout(()=>old.dispose(),4000);
}
let overlayBuild=null;
function openOverlay(){
  if(!nodes.size)return toast('No files in project','warn');
  const build=new Build();
  let html;
  try{html=buildPreviewHTML(build,'blob');}
  catch(e){build.dispose();toast('Preview failed: '+e.message,'err');return;}
  const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));
  build.urls.push(url);
  if(overlayBuild)overlayBuild.dispose();
  overlayBuild=build;
  $('#overlayTitle').textContent=resolveEntry()||'preview';
  overlay.classList.add('show');
  overlayFrame.src=url;
  addLog('sys','Preview opened · '+(resolveEntry()||''));
}
function closeOverlay(){
  overlay.classList.remove('show');
  overlayFrame.src='about:blank';
  if(overlayBuild){overlayBuild.dispose();overlayBuild=null;}
}
/* popup preview — self-contained via data-mode, single blob URL for the tab */
function openExternal(){
  if(!nodes.size)return toast('No files in project','warn');
  const build=new Build();
  let html;
  try{
    html=buildPreviewHTML(build,'data');
  }catch(e){
    build.dispose();
    toast('Preview failed: '+e.message,'err');
    addLog('error','Preview failed: '+e.message);
    return;
  }
  build.dispose();
  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const win=window.open(url,'_blank');
  if(!win){
    URL.revokeObjectURL(url);
    toast('Popup blocked — opening here instead','warn');
    openOverlay();
    return;
  }
  addLog('sys','Preview opened in a new tab');
}
$('#btnRun').onclick=()=>{
  if(settings.preview==='popup')return openExternal();
  if(settings.preview==='off'){settings.preview='side';applyAll();}
  refreshInline();
};
$('#btnPopout').onclick=openExternal;
$('#btnPreviewReload').onclick=refreshInline;
$('#btnPreviewPopout').onclick=openExternal;
$('#btnPreviewClose').onclick=()=>{settings.preview='off';applyAll();};
$('#btnCloseOverlay').onclick=closeOverlay;
$('#btnReloadOverlay').onclick=openOverlay;
$('#btnExternalOverlay').onclick=openExternal;
window.addEventListener('message',e=>{
  const d=e.data;
  if(!d||!d.__forge)return;
  addLog(d.level||'info',d.text,d.stack||d.source?{stack:d.stack,source:d.source,line:d.line}:null);
});

/* ============ ENTRY SELECT ============ */
const entrySelect=$('#entrySelect');
function populateEntry(){
  const all=[];
  nodes.forEach((n,p)=>{if(n.type==='file')all.push(p);});
  all.sort();
  const htmls=htmlFiles();
  const sources=htmls.length?htmls:all;
  entrySelect.innerHTML='';
  if(!sources.length){
    const o=document.createElement('option');o.textContent='no entry';
    entrySelect.appendChild(o);entrySelect.disabled=true;return;
  }
  entrySelect.disabled=false;
  sources.forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p;entrySelect.appendChild(o);});
  if(sources.includes(entryPath))entrySelect.value=entryPath;
  else{entryPath=sources.includes('index.html')?'index.html':sources[0];entrySelect.value=entryPath;}
}
entrySelect.onchange=()=>{entryPath=entrySelect.value;persistSoon();refreshInline();};


