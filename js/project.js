"use strict";
/**
 * js/project.js — In-memory virtual file system, explorer tree, editor tabs, and the editor surface.
 *
 * Loaded as a classic script from index.html. Modules share one global
 * scope; keep the documented load order when adding files.
 */

/* ============ VFS ============ */
const nodes=new Map();
const expanded=new Set(['']);
let selectedPath=null;
let activePath=null;
let openTabs=[];
let entryPath='index.html';
let isTemplate=true;
let dirty=false;

function ensureFolder(path){
  if(!path)return;
  const parts=path.split('/');let cur='';
  for(const p of parts){cur=cur?cur+'/'+p:p;if(!nodes.has(cur))nodes.set(cur,{type:'folder',name:p,path:cur});}
}
function writeFile(path,content,binary){
  ensureFolder(dirOf(path));
  nodes.set(path,{type:'file',name:baseOf(path),path,content:binary?null:content,data:binary?content:null,binary:!!binary});
}
function uniquePath(path){
  if(!nodes.has(path))return path;
  const dir=dirOf(path),base=baseOf(path);
  const dot=base.lastIndexOf('.');
  const stem=dot>0?base.slice(0,dot):base;
  const ext=dot>0?base.slice(dot):'';
  let i=1,p;
  do{p=(dir?dir+'/':'')+stem+' '+(i++)+ext;}while(nodes.has(p));
  return p;
}
function listChildren(dir){
  const out=[];
  nodes.forEach((n,p)=>{if(p&&dirOf(p)===dir)out.push(n);});
  out.sort((a,b)=>a.type!==b.type?(a.type==='folder'?-1:1):a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));
  return out;
}
function bytesOf(n){return n.binary?n.data:enc.encode(n.content||'');}
function currentDir(){
  if(!selectedPath)return'';
  const n=nodes.get(selectedPath);
  if(!n)return'';
  return n.type==='folder'?selectedPath:dirOf(selectedPath);
}
function markDirty(){
  dirty=true;
  const el=$('#statusSave');
  el.textContent='Unsaved';
  el.classList.add('dirty');
}

/* ============ BADGES ============ */
function badge(path){
  const ext=extOf(path);
  if(TYPE[ext])return `<span class="fx" style="--fc:${TYPE[ext].c}">${esc(TYPE[ext].l)}</span>`;
  if(IMAGE_EXT.has(ext))return `<span class="fx ic" style="--fc:#4ade80">${ico('image',13)}</span>`;
  if(AUDIO_EXT.has(ext))return `<span class="fx ic" style="--fc:#c084fc">${ico('audio',13)}</span>`;
  if(VIDEO_EXT.has(ext))return `<span class="fx ic" style="--fc:#fb7185">${ico('play',13)}</span>`;
  if(FONT_EXT.has(ext))return `<span class="fx ic" style="--fc:#fbbf24">${ico('layers',13)}</span>`;
  if(MODEL_EXT.has(ext))return `<span class="fx ic" style="--fc:#38bdf8">${ico('cube',13)}</span>`;
  if(ext==='zip')return `<span class="fx ic" style="--fc:#f59e0b">${ico('zip',13)}</span>`;
  if(ext==='pdf')return `<span class="fx ic" style="--fc:#ef4444">${ico('file',13)}</span>`;
  return `<span class="fx" style="--fc:#8b93a7">${esc((ext||'?').slice(0,3).toUpperCase())}</span>`;
}

/* ============ TREE ============ */
function renderTree(){
  const scroll=treeEl.scrollTop;
  const frag=document.createDocumentFragment();
  const walk=(dir,depth)=>{
    for(const n of listChildren(dir)){
      const row=document.createElement('div');
      row.className='row'+(n.type==='folder'?' folder':'')+(n.path===selectedPath?' sel':'');
      row.style.paddingLeft=(7+depth*13)+'px';
      row.dataset.path=n.path;
      const chev=n.type==='folder'?`<span class="chev${expanded.has(n.path)?' open':''}">${ico('chevron',11)}</span>`:'<span class="chev"></span>';
      const icon=n.type==='folder'?`<span class="ic">${ico(expanded.has(n.path)?'folderOpen':'folder',14)}</span>`:badge(n.path);
      row.innerHTML=chev+icon+'<span class="nm"></span>';
      row.querySelector('.nm').textContent=n.name;
      row.addEventListener('click',()=>{
        selectedPath=n.path;
        if(n.type==='folder'){
          expanded.has(n.path)?expanded.delete(n.path):expanded.add(n.path);
          renderTree();updateToolbar();
        }else openFile(n.path);
      });
      frag.appendChild(row);
      if(n.type==='folder'&&expanded.has(n.path))walk(n.path,depth+1);
    }
  };
  walk('',0);
  treeEl.replaceChildren(frag);
  treeEl.scrollTop=scroll;
}
function updateToolbar(){
  const has=!!selectedPath&&nodes.has(selectedPath);
  $('#btnRename').disabled=!has;
  $('#btnDelete').disabled=!has;
}

/* ============ TABS ============ */
function renderTabs(){
  tabsEl.innerHTML='';
  if(!openTabs.length){
    const e=document.createElement('div');
    e.className='tabs-empty';e.textContent='No files open';
    tabsEl.appendChild(e);return;
  }
  openTabs.forEach(p=>{
    const n=nodes.get(p);if(!n)return;
    const tab=document.createElement('div');
    tab.className='tab'+(p===activePath?' active':'');
    tab.innerHTML=badge(p)+'<span class="tname"></span>'+(dirty&&p===activePath?'<span class="dot"></span>':'')+
      `<span class="tx" role="button" aria-label="Close">${ico('x',11)}</span>`;
    tab.querySelector('.tname').textContent=n.name;
    tab.addEventListener('click',e=>{
      if(e.target.closest('.tx')){closeTab(p);return;}
      setActive(p);
    });
    tab.addEventListener('auxclick',e=>{if(e.button===1)closeTab(p);});
    tabsEl.appendChild(tab);
  });
}
function closeTab(path){
  const i=openTabs.indexOf(path);if(i<0)return;
  openTabs.splice(i,1);
  if(activePath===path){
    const next=openTabs[Math.min(i,openTabs.length-1)];
    if(next)setActive(next);else clearEditor();
  }
  renderTabs();persistSoon();
}
function openFile(path){
  const n=nodes.get(path);
  if(!n||n.type!=='file')return;
  if(!openTabs.includes(path))openTabs.push(path);
  selectedPath=path;
  setActive(path);
  renderTree();updateToolbar();persistSoon();
}

/* ============ EDITOR ============ */
let currentTextPath=null;
let lineCount=1;
let viewerUrls=[];
function releaseViewerUrls(){
  viewerUrls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});
  viewerUrls=[];
}
function clearEditor(){
  dispose3D();
  releaseViewerUrls();
  activePath=null;currentTextPath=null;selectedPath=null;
  ta.value='';hlPre.textContent='';gutterInner.textContent='';
  viewerEl.classList.remove('show');viewerEl.innerHTML='';
  v3dEl.classList.remove('show');
  $('#emptyState').style.display='flex';
  $('#pathLabel').textContent='no file open';
  $('#statusPos').textContent='Ln 1, Col 1';
  $('#statusSize').textContent='0 B';
  $('#statusLang').textContent='—';
  updateCurrentLine();
  renderTabs();
}
function setActive(path){
  const n=nodes.get(path);
  if(!n||n.type!=='file'){clearEditor();return;}
  if(activePath!==path){
    const w=$('#editorWrap');
    w.classList.remove('editor-refresh');
    void w.offsetWidth;
    w.classList.add('editor-refresh');
  }
  activePath=path;selectedPath=path;
  $('#pathLabel').innerHTML='<b>'+esc(baseOf(path))+'</b>'+(dirOf(path)?'  ·  '+esc(dirOf(path)):'');
  $('#statusLang').textContent=LANG[extOf(path)]||(n.binary?'Binary':'Plain text');
  updateSize();
  if(MODEL_EXT.has(extOf(path))){show3D(n);}
  else if(n.binary){hideTextSurface();showViewer(n);}
  else{
    hideViewer();hide3D();
    $('#emptyState').style.display='none';
    editorBody.style.display='';
    gutter.style.display=settings.lineNumbers?'':'none';
    if(currentTextPath!==path){
      currentTextPath=path;
      ta.value=n.content||'';
      ta.scrollTop=0;ta.scrollLeft=0;
      computeLines();updateGutter();updateHighlight();
    }
  }
  applyEditorStyle();
  renderTabs();renderTree();updateToolbar();syncScroll();updateCurrentLine();
}
function hideTextSurface(){
  editorBody.style.display='none';gutter.style.display='none';hlPre.textContent='';
  $('#currentLine').style.opacity='0';
}
function hideViewer(){viewerEl.classList.remove('show');viewerEl.innerHTML='';releaseViewerUrls();}
function hide3D(){v3dEl.classList.remove('show');dispose3D();}
function showViewer(n){
  hide3D();releaseViewerUrls();
  const ext=extOf(n.path);
  const url=URL.createObjectURL(new Blob([n.data],{type:mimeOf(n.path)}));
  viewerUrls.push(url);
  let html='';
  if(IMAGE_EXT.has(ext))html=`<img src="${url}" alt="">`;
  else if(AUDIO_EXT.has(ext))html=`<audio controls src="${url}"></audio>`;
  else if(VIDEO_EXT.has(ext))html=`<video controls src="${url}"></video>`;
  else{
    let desc='Binary asset available to your project.';
    if(FONT_EXT.has(ext))desc='Web font. Reference it with an <code>@font-face</code> rule.';
    else if(ext==='zip')desc='ZIP archive. Import it to extract project files.';
    else if(ext==='wasm')desc='WebAssembly module.';
    else if(ext==='pdf')desc='PDF document.';
    else if(/^(exe|msi|dll|app|dmg|pkg|apk|deb|rpm|bin)$/i.test(ext))desc='Native binary. A browser-only studio can store and export this file but cannot execute desktop apps.';
    html=`<div class="asset-card"><div class="big">${ico(FONT_EXT.has(ext)?'layers':'box',24)}</div>`+
      `<h3>${esc(n.name)}</h3><p>${desc}</p>`+
      `<p style="margin-top:10px">${fmtBytes(n.data.length)} · ${esc(mimeOf(n.path))}</p></div>`;
  }
  viewerEl.innerHTML=html;
  viewerEl.classList.add('show');
  hideTextSurface();
  $('#emptyState').style.display='none';
}

/* line numbers */
function computeLines(){
  let c=1;
  for(let i=0;i<ta.value.length;i++)if(ta.value.charCodeAt(i)===10)c++;
  lineCount=c;
}
let gutterRaf=false;
function scheduleGutter(){
  if(gutterRaf)return;
  gutterRaf=true;
  requestAnimationFrame(()=>{gutterRaf=false;updateGutter();});
}
function updateGutter(){
  if(!settings.lineNumbers||editorBody.style.display==='none'){gutterInner.textContent='';return;}
  const lh=20,st=ta.scrollTop,h=editorBody.clientHeight||400;
  const first=Math.max(0,Math.floor(st/lh)-1);
  const last=Math.min(lineCount,first+Math.ceil(h/lh)+3);
  let s='';
  for(let i=first;i<last;i++)s+=(i+1)+'\n';
  gutterInner.textContent=s;
  gutterInner.style.transform='translateY('+(first*lh-st)+'px)';
}

/* current line */
function updateCurrentLine(){
  const el=$('#currentLine');
  if(!settings.currentLine||!activePath||nodes.get(activePath)?.binary){el.style.opacity='0';return;}
  const pos=ta.selectionStart;
  const before=ta.value.slice(0,pos);
  const line=(before.match(/\n/g)||[]).length;
  const y=10+line*20-ta.scrollTop;
  if(y<-20||y>editorBody.clientHeight+20){el.style.opacity='0';return;}
  el.style.opacity='1';
  el.style.transform='translateY('+y+'px)';
}


