"use strict";
/**
 * js/editor.js — Syntax highlighting, editor appearance, typing behaviour, cursor state, and formatting.
 *
 * Loaded as a classic script from index.html. Modules share one global
 * scope; keep the documented load order when adding files.
 */

/* ============ HIGHLIGHTING ============ */
const KEYWORDS=new Set(('const let var function return if else for while do switch case default break continue new class extends super this typeof instanceof in of try catch finally throw async await yield import export from as null undefined true false void delete static get set enum interface type implements public private protected readonly namespace declare abstract').split(' '));
const HL_LIMIT=180000;

function hlJS(src){
  let out='',i=0,n=src.length,canRegex=true;
  const emit=(cls,txt)=>{out+=cls?`<span class="${cls}">${esc(txt)}</span>`:esc(txt);};
  while(i<n){
    const c=src[i];
    if(c==='/'&&src[i+1]==='/'){let j=src.indexOf('\n',i);if(j<0)j=n;emit('c',src.slice(i,j));i=j;canRegex=true;continue;}
    if(c==='/'&&src[i+1]==='*'){let j=src.indexOf('*/',i+2);j=j<0?n:j+2;emit('c',src.slice(i,j));i=j;continue;}
    if(c==='"'||c==="'"||c==='`'){
      let j=i+1;
      while(j<n){
        if(src[j]==='\\'){j+=2;continue;}
        if(src[j]===c){j++;break;}
        j++;
      }
      emit('s',src.slice(i,j));i=j;canRegex=false;continue;
    }
    if(c==='/'&&canRegex){
      let j=i+1,cls=false;
      while(j<n){
        if(src[j]==='\\'){j+=2;continue;}
        if(src[j]==='[')cls=true;
        if(src[j]===']')cls=false;
        if(src[j]==='/'&&!cls){j++;break;}
        if(src[j]==='\n')break;
        j++;
      }
      emit('s',src.slice(i,j));i=j;canRegex=false;continue;
    }
    if(/[0-9]/.test(c)&&(i===0||!/[\w$]/.test(src[i-1]))){
      let j=i;
      while(j<n&&/[0-9a-fA-FxXoObB._n]/.test(src[j]))j++;
      emit('n',src.slice(i,j));i=j;canRegex=false;continue;
    }
    if(/[A-Za-z_$]/.test(c)){
      let j=i;
      while(j<n&&/[\w$]/.test(src[j]))j++;
      const word=src.slice(i,j);
      let k=j;while(k<n&&/\s/.test(src[k]))k++;
      if(KEYWORDS.has(word)){
        emit('k',word);
        canRegex=/^(return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/.test(word);
      }else if(src[k]==='('){emit('g',word);canRegex=false;}
      else{emit('',word);canRegex=false;}
      i=j;continue;
    }
    if(/[{}()[\];,.<>+\-*/%=!&|?:~^]/.test(c)){
      emit('p',c);canRegex=/[({[,;:!&|?=+\-*%^~<>]/.test(c);i++;continue;
    }
    emit('',c);
    if(!/\s/.test(c))canRegex=false;
    i++;
  }
  return out+'\n';
}
function hlCSS(src){
  const re=/(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(@[\w-]+)|(#[0-9a-fA-F]{3,8}\b)|([-\w]+)(?=\s*:)|(\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?\b)/g;
  let out='',last=0,m;
  while((m=re.exec(src))){
    out+=esc(src.slice(last,m.index));
    let cls='p';
    if(m[1]!=null)cls='c';else if(m[2]!=null)cls='s';else if(m[3]!=null)cls='k';
    else if(m[4]!=null)cls='n';else if(m[5]!=null)cls='t';else if(m[6]!=null)cls='n';
    out+=`<span class="${cls}">${esc(m[0])}</span>`;
    last=m.index+m[0].length;
  }
  return out+esc(src.slice(last))+'\n';
}
function hlAttrs(raw){
  const re=/([\w:-]+)(\s*=\s*)("(?:[^"]*)"|'(?:[^']*)')?/g;
  let out='',last=0,m;
  while((m=re.exec(raw))){
    out+=esc(raw.slice(last,m.index));
    out+=`<span class="a">${esc(m[1])}</span>${esc(m[2])}`;
    if(m[3])out+=`<span class="s">${esc(m[3])}</span>`;
    last=m.index+m[0].length;
  }
  return out+esc(raw.slice(last));
}
function hlMarkup(src){
  const re=/(<!--[\s\S]*?-->)|(<!\[CDATA\[[\s\S]*?\]\]>)|(<!DOCTYPE[^>]*>)|(<\/?)([a-zA-Z][\w:-]*)((?:\s+[^<>]*?)?)(\/?>)/g;
  let out='',last=0,m;
  while((m=re.exec(src))){
    out+=esc(src.slice(last,m.index));
    if(m[1]!=null)out+=`<span class="c">${esc(m[1])}</span>`;
    else if(m[2]!=null||m[3]!=null)out+=`<span class="t">${esc(m[0])}</span>`;
    else out+=`<span class="p">${esc(m[4])}</span><span class="t">${esc(m[5])}</span>`+hlAttrs(m[6]||'')+`<span class="p">${esc(m[7])}</span>`;
    last=m.index+m[0].length;
  }
  return out+esc(src.slice(last))+'\n';
}
function highlight(src,ext){
  if(['html','htm','xhtml','xml','svg','vue','svelte'].includes(ext))return hlMarkup(src);
  if(['css','scss','sass','less'].includes(ext))return hlCSS(src);
  return hlJS(src);
}
let hlRaf=false;
function scheduleHighlight(){
  if(hlRaf)return;
  hlRaf=true;
  requestAnimationFrame(()=>{hlRaf=false;updateHighlight();});
}
function updateHighlight(){
  if(!activePath||!settings.highlight||ta.value.length>HL_LIMIT){
    editorBody.classList.add('no-hl');
    hlPre.textContent='';
    return;
  }
  editorBody.classList.remove('no-hl');
  hlPre.innerHTML=highlight(ta.value,extOf(activePath));
  hlPre.scrollTop=ta.scrollTop;
  hlPre.scrollLeft=ta.scrollLeft;
}
function syncScroll(){
  if(!editorBody.classList.contains('no-hl')){
    hlPre.scrollTop=ta.scrollTop;hlPre.scrollLeft=ta.scrollLeft;
  }
  scheduleGutter();
  updateCurrentLine();
}
ta.addEventListener('scroll',syncScroll,{passive:true});

/* ============ EDITOR STYLE ============ */
function applyEditorStyle(){
  document.documentElement.style.setProperty('--fs',settings.fontSize+'px');
  document.documentElement.style.setProperty('--tab',settings.tabSize);
  editorBody.classList.toggle('wrap',settings.wrap);
  ta.wrap=settings.wrap?'soft':'off';
  if(editorBody.style.display!=='none')gutter.style.display=settings.lineNumbers?'':'none';
  $('#btnWrap').classList.toggle('on',settings.wrap);
}
function applyPreviewMode(){
  const area=$('#editorArea');
  area.classList.remove('p-side','p-bottom');
  if(settings.preview==='side')area.classList.add('p-side');
  else if(settings.preview==='bottom')area.classList.add('p-bottom');
  $('#liveDot').classList.toggle('paused',!settings.auto);
}
function syncSettingsUI(){
  $$('#segTheme button').forEach(b=>b.classList.toggle('on',b.dataset.v===settings.theme));
  $$('#segPreview button').forEach(b=>b.classList.toggle('on',b.dataset.v===settings.preview));
  $$('#segFont button').forEach(b=>b.classList.toggle('on',+b.dataset.v===settings.fontSize));
  $$('#segTab button').forEach(b=>b.classList.toggle('on',+b.dataset.v===settings.tabSize));
  $$('#seg3d button').forEach(b=>b.classList.toggle('on',b.dataset.v===settings.bg));
  $('#swAuto').classList.toggle('on',settings.auto);
  $('#swHighlight').classList.toggle('on',settings.highlight);
  $('#swLineNums').classList.toggle('on',settings.lineNumbers);
  $('#swWrap').classList.toggle('on',settings.wrap);
  $('#swRotate').classList.toggle('on',settings.rotate);
  $('#swCurrentLine').classList.toggle('on',settings.currentLine);
}
function applyAll(){
  document.body.dataset.theme=settings.theme;
  applyEditorStyle();applyPreviewMode();syncSettingsUI();saveSettings();
}

/* ============ INPUT ============ */
let decorTimer=null;
ta.addEventListener('input',()=>{
  if(!activePath)return;
  const n=nodes.get(activePath);
  if(!n||n.binary)return;
  n.content=ta.value;
  isTemplate=false;
  updateSize();markDirty();
  if(decorTimer)clearTimeout(decorTimer);
  decorTimer=setTimeout(()=>{computeLines();updateGutter();updateHighlight();scheduleGutter();},110);
  persistSoon();schedulePreview();
});
ta.addEventListener('keyup',updateCursor);
ta.addEventListener('click',updateCursor);
ta.addEventListener('input',updateCursor);
ta.addEventListener('keydown',e=>{
  if(e.key==='Tab'){e.preventDefault();handleTab(e.shiftKey);}
  else if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    const s=ta.selectionStart,en=ta.selectionEnd;
    if(s===en){
      const before=ta.value.slice(0,s);
      const lineStart=before.lastIndexOf('\n')+1;
      const line=before.slice(lineStart);
      const indent=(line.match(/^[ \t]*/)||[''])[0];
      let extra='';
      const trimmed=line.trimEnd();
      if(/[{:([]$/.test(trimmed))extra=' '.repeat(settings.tabSize);
      if(indent||extra){e.preventDefault();insertText('\n'+indent+extra);}
    }
  }
});
function handleTab(outdent){
  if(!activePath||nodes.get(activePath)?.binary)return;
  const unit=' '.repeat(settings.tabSize);
  const s=ta.selectionStart,e=ta.selectionEnd;
  if(s===e&&!outdent){insertText(unit);return;}
  const value=ta.value;
  const start=value.lastIndexOf('\n',s-1)+1;
  const endIdx=value.indexOf('\n',e);
  const end=endIdx<0?value.length:endIdx;
  const block=value.slice(start,end);
  const lines=block.split('\n').map(line=>outdent?line.replace(new RegExp('^ {1,'+settings.tabSize+'}'),''):unit+line);
  const next=lines.join('\n');
  ta.value=value.slice(0,start)+next+value.slice(end);
  ta.selectionStart=start;ta.selectionEnd=start+next.length;
  ta.dispatchEvent(new Event('input'));
}
function insertText(text){
  ta.focus();
  let ok=false;
  try{ok=document.execCommand('insertText',false,text);}catch(e){}
  if(!ok){
    const s=ta.selectionStart,e=ta.selectionEnd;
    ta.setRangeText(text,s,e,'end');
    ta.dispatchEvent(new Event('input'));
  }
}
function updateCursor(){
  if(!activePath)return;
  const pos=ta.selectionStart,before=ta.value.slice(0,pos);
  const line=(before.match(/\n/g)||[]).length+1;
  const col=pos-before.lastIndexOf('\n');
  const sel=ta.selectionEnd-ta.selectionStart;
  $('#statusPos').textContent='Ln '+line+', Col '+col+(sel?'  ·  Sel '+sel:'');
  updateCurrentLine();
}
function updateSize(){
  if(!activePath){$('#statusSize').textContent='0 B';return;}
  const n=nodes.get(activePath);if(!n)return;
  const size=n.binary?n.data.length:ta.value.length;
  $('#statusSize').textContent=fmtBytes(size);
}

/* ============ EDITOR ACTIONS ============ */
$('#btnSelectAll').onclick=()=>{
  if(!activePath||nodes.get(activePath)?.binary)return;
  ta.focus();ta.select();
  toast('Selected '+ta.value.length+' characters');
};
$('#btnCopySel').onclick=async()=>{
  if(!activePath||nodes.get(activePath)?.binary)return;
  const sel=ta.value.slice(ta.selectionStart,ta.selectionEnd);
  const text=sel||ta.value;
  toast(await copyText(text)?'Copied '+text.length+' characters':'Copy failed','ok');
};
$('#btnPaste').onclick=async()=>{
  if(!activePath||nodes.get(activePath)?.binary)return;
  try{
    const text=await navigator.clipboard.readText();
    if(text){insertText(text);toast('Pasted '+text.length+' characters','ok');return;}
    throw new Error('empty');
  }catch(e){
    ta.focus();toast('Use your keyboard paste shortcut','warn');
  }
};
$('#btnWrap').onclick=()=>{settings.wrap=!settings.wrap;applyAll();toast(settings.wrap?'Word wrap on':'Word wrap off');};

/* safe re-indent */
function reindentJS(text,unit){
  const lines=text.replace(/\r\n?/g,'\n').split('\n');
  const out=[];
  let depth=0,inBlock=false;
  for(const raw of lines){
    const line=raw.trim();
    if(!line){out.push('');continue;}
    let opens=0,closes=0,i=0,quote=null,block=inBlock;
    while(i<line.length){
      const c=line[i];
      if(block){if(c==='*'&&line[i+1]==='/'){block=false;i+=2;continue;}i++;continue;}
      if(quote){
        if(c==='\\'){i+=2;continue;}
        if(c===quote)quote=null;
        i++;continue;
      }
      if(c==='/'&&line[i+1]==='/')break;
      if(c==='/'&&line[i+1]==='*'){block=true;i+=2;continue;}
      if(c==='"'||c==="'"||c==='`'){quote=c;i++;continue;}
      if(c==='{')opens++;
      if(c==='}')closes++;
      i++;
    }
    inBlock=block;
    const leading=(line.match(/^}+/)||[''])[0].length;
    const d=Math.max(0,depth-leading);
    const caseLine=/^(case\b|default\s*:)/.test(line);
    out.push(unit.repeat(Math.max(0,d-(caseLine?1:0)))+line);
    depth=Math.max(0,depth+opens-closes);
  }
  return out.join('\n');
}
function reindentMarkup(text,unit){
  const lines=text.replace(/\r\n?/g,'\n').split('\n');
  const voidTags=/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr|!doctype)$/i;
  let depth=0;
  const out=[];
  for(const raw of lines){
    const line=raw.trim();
    if(!line){out.push('');continue;}
    let leadClose=/^<\//.test(line);
    if(leadClose)depth=Math.max(0,depth-1);
    out.push(unit.repeat(depth)+line);
    const tags=line.match(/<[^>]*>/g)||[];
    let opens=0,closes=0;
    for(const tag of tags){
      if(/^<\//.test(tag)){if(tag!==line.slice(0,tag.length)||!leadClose)closes++;else leadClose=false;}
      else if(/\/>$/.test(tag)){}
      else if(/^<[a-zA-Z]/.test(tag)){
        const name=(tag.match(/^<([a-zA-Z][\w:-]*)/)||[])[1]||'';
        if(!voidTags.test(name))opens++;
      }
    }
    depth=Math.max(0,depth+opens-closes);
  }
  return out.join('\n');
}
function formatCurrent(){
  if(!activePath)return toast('No file open','warn');
  const n=nodes.get(activePath);
  if(!n||n.binary)return toast('Cannot format binary files','warn');
  if(ta.value.length>3000000)return toast('File too large to format safely','warn');
  const ext=extOf(activePath);
  const unit=' '.repeat(settings.tabSize);
  let next=ta.value;
  try{
    if(ext==='json')next=JSON.stringify(JSON.parse(next),null,settings.tabSize);
    else if(['html','htm','xhtml','xml','svg','vue','svelte'].includes(ext))next=reindentMarkup(next,unit);
    else next=reindentJS(next,unit);
  }catch(e){return toast('Format failed: '+e.message,'err');}
  if(next===ta.value)return toast('Already formatted');
  ta.value=next;n.content=next;
  computeLines();updateGutter();updateHighlight();
  ta.dispatchEvent(new Event('input'));
  toast('Re-indented '+activePath,'ok');
}
$('#btnFormat').onclick=formatCurrent;


