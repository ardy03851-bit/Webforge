"use strict";
/**
 * js/settings.js — Settings modal bindings and IndexedDB project persistence.
 *
 * Loaded as a classic script from index.html. Modules share one global
 * scope; keep the documented load order when adding files.
 */

/* ============ SETTINGS MODAL ============ */
function openSettings(pane='editor'){
  $$('#setNav button').forEach(b=>b.classList.toggle('on',b.dataset.pane===pane));
  $$('.set-pane').forEach(p=>p.classList.toggle('on',p.dataset.pane===pane));
  syncSettingsUI();
  $('#settingsModal').classList.add('show');
}
$('#btnSettings').onclick=()=>openSettings('editor');
$('#settingsClose').onclick=()=>$('#settingsModal').classList.remove('show');
$('#settingsDone').onclick=()=>{$('#settingsModal').classList.remove('show');toast('Settings saved','ok');};
$('#settingsReset').onclick=()=>{Object.assign(settings,DEFAULTS);applyAll();toast('Settings reset');};
$('#settingsModal').onclick=e=>{if(e.target===$('#settingsModal'))$('#settingsModal').classList.remove('show');};
$$('#setNav button').forEach(b=>b.onclick=()=>{
  $$('#setNav button').forEach(x=>x.classList.toggle('on',x===b));
  $$('.set-pane').forEach(p=>p.classList.toggle('on',p.dataset.pane===b.dataset.pane));
});
function bindSegmented(sel,key,num){
  $$(sel+' button').forEach(b=>b.onclick=()=>{
    settings[key]=num?+b.dataset.v:b.dataset.v;
    applyAll();
    if(key==='preview'&&(settings.preview==='side'||settings.preview==='bottom'))refreshInline();
    if(key==='bg'&&v3dEl.classList.contains('show')&&activePath)show3D(nodes.get(activePath));
  });
}
bindSegmented('#segTheme','theme');
bindSegmented('#segPreview','preview');
bindSegmented('#segFont','fontSize',true);
bindSegmented('#segTab','tabSize',true);
bindSegmented('#seg3d','bg');
function bindSwitch(sel,key,after){
  $(sel).onclick=()=>{settings[key]=!settings[key];applyAll();if(after)after();};
}
bindSwitch('#swAuto','auto',()=>{if(settings.auto)refreshInline();});
bindSwitch('#swHighlight','highlight',()=>updateHighlight());
bindSwitch('#swLineNums','lineNumbers',()=>updateGutter());
bindSwitch('#swWrap','wrap');
bindSwitch('#swRotate','rotate',()=>{if(controls3d)controls3d.autoRotate=settings.rotate;});
bindSwitch('#swCurrentLine','currentLine',()=>updateCurrentLine());

/* ============ PERSISTENCE ============ */
let dbPromise=null;
function idb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((res,rej)=>{
    try{
      const req=indexedDB.open('forge-studio',2);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv');
      };
      req.onsuccess=()=>res(req.result);
      req.onerror=()=>rej(req.error);
    }catch(e){rej(e);}
  });
  return dbPromise;
}
async function idbSet(k,v){
  const db=await idb();
  return new Promise((res,rej)=>{
    const tx=db.transaction('kv','readwrite');
    tx.objectStore('kv').put(v,k);
    tx.oncomplete=res;tx.onerror=()=>rej(tx.error);
  });
}
async function idbGet(k){
  const db=await idb();
  return new Promise((res,rej)=>{
    const tx=db.transaction('kv','readonly');
    const rq=tx.objectStore('kv').get(k);
    rq.onsuccess=()=>res(rq.result);
    rq.onerror=()=>rej(rq.error);
  });
}
let persistTimer=null;
function persistSoon(){
  clearTimeout(persistTimer);
  persistTimer=setTimeout(persist,850);
}
async function persist(){
  try{
    const list=[];
    nodes.forEach((n,p)=>{
      if(n.type==='folder')list.push({p,t:'d'});
      else if(n.binary)list.push({p,t:'b',d:n.data});
      else list.push({p,t:'f',c:n.content||''});
    });
    await idbSet('project',{
      entry:entryPath,nodes:list,open:openTabs.slice(),active:activePath,template:isTemplate,saved:Date.now()
    });
    dirty=false;
    const el=$('#statusSave');
    el.textContent='Saved';el.classList.remove('dirty');
    el.classList.remove('pulse');void el.offsetWidth;el.classList.add('pulse');
    renderTabs();
  }catch(e){}
}
async function restore(){
  try{
    const data=await idbGet('project');
    if(!data||!Array.isArray(data.nodes))return false;
    nodes.clear();
    for(const it of data.nodes){
      if(it.t==='d')nodes.set(it.p,{type:'folder',name:baseOf(it.p),path:it.p});
      else if(it.t==='b')nodes.set(it.p,{type:'file',name:baseOf(it.p),path:it.p,data:new Uint8Array(it.d),content:null,binary:true});
      else nodes.set(it.p,{type:'file',name:baseOf(it.p),path:it.p,content:it.c,data:null,binary:false});
    }
    if(data.entry)entryPath=data.entry;
    isTemplate=!!data.template;
    if(Array.isArray(data.open))openTabs=data.open.filter(p=>nodes.has(p));
    if(data.active&&nodes.has(data.active))activePath=data.active;
    return nodes.size>0;
  }catch(e){return false;}
}


