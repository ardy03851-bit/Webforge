"use strict";
/**
 * js/commands.js — Toolbar menus, find & replace, and the command palette.
 *
 * Loaded as a classic script from index.html. Modules share one global
 * scope; keep the documented load order when adding files.
 */

/* ============ MENUS ============ */
function showMenu(anchor,items){
  const m=$('#menu');
  m.innerHTML='';
  items.forEach(it=>{
    const b=document.createElement('button');
    b.className='mi'+(it.danger?' danger':'');
    b.innerHTML=ico(it.icon||'file',14)+'<span></span>'+(it.kbd?'<span class="kbd">'+esc(it.kbd)+'</span>':'');
    b.querySelector('span').textContent=it.label;
    b.onclick=()=>{m.classList.remove('show');it.action();};
    m.appendChild(b);
  });
  m.classList.add('show');
  const r=anchor.getBoundingClientRect();
  const w=220;
  let left=clamp(r.left,8,innerWidth-w-10);
  let top=r.bottom+5;
  const h=m.offsetHeight;
  if(top+h>innerHeight-10)top=Math.max(8,r.top-h-5);
  m.style.left=left+'px';m.style.top=top+'px';
}
document.addEventListener('click',e=>{
  const m=$('#menu');
  if(!m.classList.contains('show')||e.target.closest('#menu')||e.target.closest('[data-menu]'))return;
  m.classList.remove('show');
},true);
$('#btnImport').onclick=e=>showMenu(e.currentTarget,[
  {icon:'upload',label:'Import files…',action:()=>$('#fileInput').click()},
  {icon:'zip',label:'Import ZIP archive…',action:()=>$('#zipInput').click()},
  {icon:'folderOpen',label:'Import folder…',action:()=>$('#folderInput').click()}
]);
$('#btnExport').onclick=e=>showMenu(e.currentTarget,[
  {icon:'zip',label:'Export project as ZIP',action:exportZip},
  {icon:'globe',label:'Export standalone HTML',action:exportStandalone},
  {icon:'save',label:'Save current file',action:exportSingle}
]);

/* ============ SEARCH ============ */
const search={case:false,word:false,regex:false,scope:'file',groups:[]};
$('#btnSearch').onclick=openSearch;
$('#searchClose').onclick=closeSearch;
$('#searchModal').onclick=e=>{if(e.target===$('#searchModal'))closeSearch();};
function openSearch(){
  $('#searchModal').classList.add('show');
  setTimeout(()=>$('#searchInput').focus(),50);
  if(activePath&&!nodes.get(activePath)?.binary){
    const sel=ta.value.slice(ta.selectionStart,ta.selectionEnd).trim();
    if(sel&&sel.length<100&&!sel.includes('\n'))$('#searchInput').value=sel;
  }
  runSearch();
}
function closeSearch(){$('#searchModal').classList.remove('show');}
$('#optCase').onclick=function(){search.case=!search.case;this.classList.toggle('on',search.case);runSearch();};
$('#optWord').onclick=function(){search.word=!search.word;this.classList.toggle('on',search.word);runSearch();};
$('#optRegex').onclick=function(){search.regex=!search.regex;this.classList.toggle('on',search.regex);runSearch();};
$('#optScope').onclick=function(){
  search.scope=search.scope==='file'?'project':'file';
  this.textContent='In: '+search.scope;
  this.classList.toggle('on',search.scope==='project');
  runSearch();
};
let searchTimer=null;
$('#searchInput').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(runSearch,120);};
$('#replaceInput').oninput=updateSearchButtons;
function makeRegex(q){
  let src=search.regex?q:escRe(q);
  if(search.word)src='\\b'+src+'\\b';
  return new RegExp(src,search.case?'g':'gi');
}
function findMatches(text,re,max){
  const out=[];re.lastIndex=0;let m;
  while((m=re.exec(text))){
    if(!m[0].length){re.lastIndex++;continue;}
    const before=text.slice(0,m.index);
    out.push({index:m.index,length:m[0].length,line:(before.match(/\n/g)||[]).length+1,text:m[0]});
    if(out.length>=max)break;
  }
  return out;
}
const MAX_MATCHES=600;
function runSearch(){
  const q=$('#searchInput').value;
  const box=$('#searchResults');
  search.groups=[];
  $('#searchStat').textContent='';
  if(!q){box.innerHTML='<div class="sr-empty">Type a query to search…</div>';updateSearchButtons();return;}
  let re;
  try{re=makeRegex(q);}catch(e){box.innerHTML='<div class="sr-empty">Invalid regular expression</div>';return;}
  let total=0;
  const paths=[];
  if(search.scope==='file'){
    if(!activePath||nodes.get(activePath)?.binary){box.innerHTML='<div class="sr-empty">No text file is open</div>';return;}
    paths.push(activePath);
  }else{
    nodes.forEach((n,p)=>{if(n.type==='file'&&!n.binary)paths.push(p);});
    paths.sort();
  }
  for(const p of paths){
    const n=nodes.get(p);
    const text=p===activePath&&search.scope==='file'?ta.value:(n.content||'');
    const ms=findMatches(text,re,MAX_MATCHES-total);
    if(ms.length){search.groups.push({path:p,matches:ms});total+=ms.length;}
    if(total>=MAX_MATCHES)break;
  }
  $('#searchStat').textContent=total+' match'+(total===1?'':'es')+' in '+search.groups.length+' file'+(search.groups.length===1?'':'s');
  box.innerHTML='';
  if(!total){box.innerHTML='<div class="sr-empty">No matches found</div>';updateSearchButtons();return;}
  const frag=document.createDocumentFragment();
  for(const g of search.groups){
    const head=document.createElement('div');
    head.className='sr-file';
    head.innerHTML=badge(g.path)+'<span class="fname"></span><span class="count">'+g.matches.length+'</span>';
    head.querySelector('.fname').textContent=g.path;
    frag.appendChild(head);
    const n=nodes.get(g.path);
    const text=g.path===activePath&&search.scope==='file'?ta.value:(n.content||'');
    g.matches.slice(0,50).forEach(mm=>{
      const row=document.createElement('div');
      row.className='sr-match';
      const lineStart=text.lastIndexOf('\n',mm.index)+1;
      const lineEnd=text.indexOf('\n',mm.index);
      const line=text.slice(lineStart,lineEnd<0?text.length:lineEnd);
      const col=mm.index-lineStart;
      row.innerHTML='<span class="ln">'+mm.line+'</span><span class="tx"></span>';
      row.querySelector('.tx').innerHTML=esc(line.slice(0,col))+'<mark>'+esc(line.slice(col,col+mm.length))+'</mark>'+esc(line.slice(col+mm.length));
      row.onclick=()=>{closeSearch();if(activePath!==g.path)openFile(g.path);setTimeout(()=>jumpTo(mm.index,mm.length),50);};
      frag.appendChild(row);
    });
    if(g.matches.length>50){
      const more=document.createElement('div');
      more.className='sr-file';more.textContent='+ '+(g.matches.length-50)+' more…';
      frag.appendChild(more);
    }
  }
  box.appendChild(frag);updateSearchButtons();
}
function jumpTo(index,length){
  ta.focus();ta.setSelectionRange(index,index+length);
  const line=(ta.value.slice(0,index).match(/\n/g)||[]).length;
  ta.scrollTop=Math.max(0,line*20-100);
  syncScroll();
}
function updateSearchButtons(){
  const has=search.groups.length>0&&!!$('#searchInput').value;
  $('#btnReplaceOne').disabled=!has;
  $('#btnReplaceAll').disabled=!has;
}
$('#btnReplaceOne').onclick=()=>{
  if(!activePath||nodes.get(activePath)?.binary)return;
  const q=$('#searchInput').value,r=$('#replaceInput').value;
  if(!q)return;
  let re;
  try{re=makeRegex(q);}catch(e){return toast('Invalid regex','err');}
  const s=ta.selectionStart,e=ta.selectionEnd;
  const selected=ta.value.slice(s,e);
  re.lastIndex=0;
  if(selected&&re.test(selected)){
    re.lastIndex=0;
    ta.setRangeText(selected.replace(re,r),s,e,'end');
    ta.dispatchEvent(new Event('input'));
    runSearch();return toast('Replaced 1 match','ok');
  }
  const first=search.groups.find(g=>g.path===activePath)?.matches[0];
  if(!first)return toast('No match to replace','warn');
  ta.setRangeText(r,first.index,first.index+first.length,'end');
  ta.dispatchEvent(new Event('input'));
  runSearch();toast('Replaced 1 match','ok');
};
$('#btnReplaceAll').onclick=()=>{
  const q=$('#searchInput').value,r=$('#replaceInput').value;
  if(!q)return;
  let re;
  try{re=makeRegex(q);}catch(e){return toast('Invalid regex','err');}
  let total=0;
  const paths=search.scope==='file'
    ?(activePath&&!nodes.get(activePath)?.binary?[activePath]:[])
    :Array.from(nodes.keys()).filter(p=>nodes.get(p).type==='file'&&!nodes.get(p).binary);
  if(!paths.length)return toast('No text file open','warn');
  for(const p of paths){
    const n=nodes.get(p);
    const before=p===activePath?ta.value:(n.content||'');
    const local=new RegExp(re.source,re.flags);
    const count=findMatches(before,local,MAX_MATCHES).length;
    if(!count)continue;
    const after=before.replace(new RegExp(re.source,re.flags),r);
    if(after===before)continue;
    total+=count;
    n.content=after;
    if(p===activePath){ta.value=after;computeLines();updateGutter();updateHighlight();}
  }
  if(!total)return toast('No matches to replace','warn');
  markDirty();persistSoon();runSearch();
  toast('Replaced '+total+' match'+(total===1?'':'es'),'ok');
};

/* ============ COMMAND PALETTE ============ */
const cmdk={items:[],index:0,filtered:[]};
const cmdkEl=$('#cmdk');
const cmdkInput=$('#cmdkInput');
const cmdkResults=$('#cmdkResults');
function fileItems(){
  const out=[];
  nodes.forEach((n,p)=>{
    if(n.type==='file')out.push({
      id:'file:'+p,label:p,kind:'file',icon:null,
      hint:baseOf(p),
      run:()=>{openFile(p);cmdkClose();}
    });
  });
  return out;
}
function commandItems(){
  return [
    {id:'new-file',label:'New file',icon:'filePlus',kbd:'Ctrl+N',run:()=>{cmdkClose();$('#btnNewFile').click();}},
    {id:'new-folder',label:'New folder',icon:'folderPlus',run:()=>{cmdkClose();$('#btnNewFolder').click();}},
    {id:'delete-all',label:'Delete all files',icon:'trashAll',danger:true,run:()=>{cmdkClose();deleteAllFiles();}},
    {id:'format',label:'Format file',icon:'wand',kbd:'Ctrl+Shift+F',run:()=>{cmdkClose();formatCurrent();}},
    {id:'wrap',label:'Toggle word wrap',icon:'wrap',run:()=>{cmdkClose();$('#btnWrap').click();}},
    {id:'sidebar',label:'Toggle sidebar',icon:'layers',run:()=>{cmdkClose();$('#sidebar').classList.toggle('collapsed');}},
    {id:'console',label:'Toggle console',icon:'terminal',run:()=>{cmdkClose();$('#btnToggleConsole').click();}},
    {id:'preview',label:'Toggle preview',icon:'play',run:()=>{cmdkClose();settings.preview=settings.preview==='off'?'side':'off';applyAll();if(settings.preview!=='off')refreshInline();}},
    {id:'reload',label:'Reload preview',icon:'refresh',kbd:'Ctrl+Enter',run:()=>{cmdkClose();refreshInline();}},
    {id:'popout',label:'Open preview in new tab',icon:'external',run:()=>{cmdkClose();openExternal();}},
    {id:'zen',label:'Toggle Zen mode',icon:'maximize',run:()=>{cmdkClose();app.classList.toggle('zen');toast(app.classList.contains('zen')?'Zen mode on':'Zen mode off');}},
    {id:'import',label:'Import files',icon:'upload',run:()=>{cmdkClose();$('#fileInput').click();}},
    {id:'export',label:'Export as ZIP',icon:'download',run:()=>{cmdkClose();exportZip();}},
    {id:'search',label:'Find & replace',icon:'search',kbd:'Ctrl+F',run:()=>{cmdkClose();openSearch();}},
    {id:'settings',label:'Open settings',icon:'settings',run:()=>{cmdkClose();openSettings();}},
    {id:'theme-obsidian',label:'Theme: Obsidian',icon:'layers',run:()=>{cmdkClose();settings.theme='obsidian';applyAll();}},
    {id:'theme-ember',label:'Theme: Ember',icon:'layers',run:()=>{cmdkClose();settings.theme='ember';applyAll();}},
    {id:'theme-forest',label:'Theme: Forest',icon:'layers',run:()=>{cmdkClose();settings.theme='forest';applyAll();}},
    {id:'theme-paper',label:'Theme: Paper',icon:'layers',run:()=>{cmdkClose();settings.theme='paper';applyAll();}},
    {id:'save',label:'Save project',icon:'save',kbd:'Ctrl+S',run:()=>{cmdkClose();persist().then(()=>toast('Project saved','ok'));}},
    {id:'reset-settings',label:'Reset settings',icon:'refresh',run:()=>{cmdkClose();Object.assign(settings,DEFAULTS);applyAll();toast('Settings reset');}}
  ];
}
function fuzzy(needle,haystack){
  needle=needle.toLowerCase();haystack=haystack.toLowerCase();
  let ni=0,hi=0;
  while(ni<needle.length&&hi<haystack.length){
    if(needle[ni]===haystack[hi])ni++;
    hi++;
  }
  return ni===needle.length;
}
function cmdkOpen(){
  if(!cmdkEl.classList.contains('show')){
    cmdkEl.classList.add('show');
    cmdkInput.value='';
    renderCmdk('');
    setTimeout(()=>cmdkInput.focus(),30);
  }
}
function cmdkClose(){cmdkEl.classList.remove('show');}
function renderCmdk(query){
  const cmds=commandItems();
  const files=fileItems();
  const q=(query||'').trim();
  let filtered;
  if(!q){
    filtered=[...cmds,...files.slice(0,8)];
  }else{
    filtered=[...cmds,...files].filter(item=>{
      return fuzzy(q,item.label)||item.label.toLowerCase().includes(q.toLowerCase());
    }).slice(0,60);
  }
  cmdk.filtered=filtered;
  cmdk.index=0;
  drawCmdk();
}
function drawCmdk(){
  cmdkResults.innerHTML='';
  if(!cmdk.filtered.length){
    const e=document.createElement('div');
    e.className='cmdk-empty';e.textContent='No results';
    cmdkResults.appendChild(e);return;
  }
  const frag=document.createDocumentFragment();
  const showGroup=!cmdkInput.value.trim();
  let lastGroup=null;
  cmdk.filtered.forEach((item,i)=>{
    const group=item.kind==='file'?'Files':'Commands';
    if(showGroup&&group!==lastGroup){
      const g=document.createElement('div');
      g.className='cmdk-group';g.textContent=group;
      frag.appendChild(g);lastGroup=group;
    }
    const b=document.createElement('button');
    b.className='cmdk-item'+(i===cmdk.index?' sel':'')+(item.danger?' danger':'');
    b.style.animationDelay=Math.min(i*10,150)+'ms';
    const ic=item.kind==='file'?badge(item.id.slice(5)):`<span class="ic">${ico(item.icon||'file',14)}</span>`;
    b.innerHTML=ic+'<span class="label"></span>'+(item.kbd?`<span class="kbd">${esc(item.kbd)}</span>`:'');
    b.querySelector('.label').textContent=item.kind==='file'?item.label:item.label;
    b.onclick=()=>item.run();
    b.addEventListener('mouseenter',()=>{cmdk.index=i;updateCmdkSel();});
    frag.appendChild(b);
  });
  cmdkResults.appendChild(frag);
}
function updateCmdkSel(){
  const items=cmdkResults.querySelectorAll('.cmdk-item');
  items.forEach((el,i)=>el.classList.toggle('sel',i===cmdk.index));
  const sel=items[cmdk.index];
  if(sel)sel.scrollIntoView({block:'nearest'});
}
cmdkInput.addEventListener('input',()=>renderCmdk(cmdkInput.value));
cmdkInput.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();cmdk.index=Math.min(cmdk.index+1,cmdk.filtered.length-1);updateCmdkSel();}
  else if(e.key==='ArrowUp'){e.preventDefault();cmdk.index=Math.max(cmdk.index-1,0);updateCmdkSel();}
  else if(e.key==='Enter'){e.preventDefault();const it=cmdk.filtered[cmdk.index];if(it)it.run();}
  else if(e.key==='Escape'){e.preventDefault();cmdkClose();}
});
cmdkEl.addEventListener('click',e=>{if(e.target===cmdkEl)cmdkClose();});
$('#btnCmdk').onclick=cmdkOpen;


