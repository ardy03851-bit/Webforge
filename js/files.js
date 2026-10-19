"use strict";
/**
 * js/files.js — File operations, import (files, folders, ZIP), and export (ZIP, standalone HTML, single file).
 *
 * Loaded as a classic script from index.html. Modules share one global
 * scope; keep the documented load order when adding files.
 */

/* ============ FILE OPS ============ */
$('#btnNewFile').onclick=()=>{
  const name=prompt('New file name','untitled.js');
  if(!name)return;
  const full=currentDir()?currentDir()+'/'+name:name;
  const target=uniquePath(full);
  writeFile(target,'',false);
  isTemplate=false;
  renderTree();populateEntry();
  openFile(target);
  persistSoon();
  addLog('sys','Created '+target);
};
$('#btnNewFolder').onclick=()=>{
  const name=prompt('New folder name','folder');
  if(!name)return;
  const full=currentDir()?currentDir()+'/'+name:name;
  if(nodes.has(full))return toast('Folder already exists','warn');
  ensureFolder(full);isTemplate=false;
  expanded.add(currentDir());
  renderTree();persistSoon();
};
$('#btnRename').onclick=()=>{
  if(!selectedPath)return toast('Select a file first','warn');
  const n=nodes.get(selectedPath);if(!n)return;
  const name=prompt('Rename to',n.name);
  if(!name||name===n.name)return;
  const dir=dirOf(selectedPath);
  const next=dir?dir+'/'+name:name;
  if(nodes.has(next))return toast('Name already in use','warn');
  if(n.type==='folder'){
    const moves=[];
    nodes.forEach((node,p)=>{if(p===selectedPath||p.startsWith(selectedPath+'/'))moves.push([p,next+p.slice(selectedPath.length)]);});
    for(const[from,to]of moves){
      const node=nodes.get(from);nodes.delete(from);
      node.path=to;node.name=baseOf(to);nodes.set(to,node);
    }
    openTabs=openTabs.map(p=>p===selectedPath||p.startsWith(selectedPath+'/')?next+p.slice(selectedPath.length):p);
    if(entryPath.startsWith(selectedPath+'/'))entryPath=next+entryPath.slice(selectedPath.length);
    if(activePath&&(activePath===selectedPath||activePath.startsWith(selectedPath+'/')))activePath=next+activePath.slice(selectedPath.length);
  }else{
    nodes.delete(selectedPath);
    n.path=next;n.name=name;nodes.set(next,n);
    openTabs=openTabs.map(p=>p===selectedPath?next:p);
    if(entryPath===selectedPath)entryPath=next;
    if(activePath===selectedPath){activePath=next;currentTextPath=next;}
  }
  selectedPath=next;isTemplate=false;
  renderTree();populateEntry();updateToolbar();
  if(activePath===next)setActive(next);
  persistSoon();toast('Renamed','ok');
};
$('#btnDelete').onclick=()=>{
  if(!selectedPath)return toast('Select a file first','warn');
  const n=nodes.get(selectedPath);if(!n)return;
  if(!confirm('Delete "'+n.name+'"'+(n.type==='folder'?' and everything inside it?':'?')))return;
  const doomed=[];
  nodes.forEach((node,p)=>{if(p===selectedPath||p.startsWith(selectedPath+'/'))doomed.push(p);});
  doomed.forEach(p=>nodes.delete(p));
  openTabs=openTabs.filter(p=>!doomed.includes(p));
  if(activePath&&doomed.includes(activePath)){
    activePath=null;currentTextPath=null;
    if(openTabs.length)setActive(openTabs[openTabs.length-1]);else clearEditor();
  }
  if(doomed.includes(entryPath))entryPath='';
  selectedPath=null;isTemplate=false;
  renderTree();renderTabs();populateEntry();updateToolbar();
  persistSoon();toast('Deleted','ok');
};
$('#btnCollapseAll').onclick=()=>{expanded.clear();renderTree();};

function deleteAllFiles(){
  if(!nodes.size)return toast('Project is already empty');
  if(!confirm('Delete ALL files and folders in this project?\nThis cannot be undone.'))return;
  nodes.clear();
  openTabs=[];activePath=null;currentTextPath=null;selectedPath=null;
  entryPath='';isTemplate=false;
  clearEditor();hide3D();hideViewer();
  renderTree();renderTabs();populateEntry();updateToolbar();
  refreshInline();
  persistSoon();
  addLog('warn','All project files deleted');
  toast('Project cleared','ok');
}
$('#btnDeleteAll').onclick=deleteAllFiles;

/* ============ IMPORT ============ */
function readBytes(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>res(new Uint8Array(fr.result));
    fr.onerror=()=>rej(fr.error);
    fr.readAsArrayBuffer(file);
  });
}
function importFile(path,name,bytes){
  const full=path?path+'/'+name:name;
  const target=nodes.has(full)?uniquePath(full):full;
  if(isText(name)){
    try{writeFile(target,dec.decode(bytes),false);}
    catch(e){writeFile(target,bytes,true);}
  }else writeFile(target,bytes,true);
  return target;
}
function resetIfTemplate(names){
  if(!isTemplate)return;
  if(!(names||[]).some(n=>/\.(?:html?|xhtml)$/i.test(String(n))))return;
  nodes.clear();openTabs=[];expanded.clear();expanded.add('');
  selectedPath=null;activePath=null;currentTextPath=null;
  entryPath='';isTemplate=false;
  clearEditor();renderTree();renderTabs();
  addLog('sys','Replaced the starter template with the imported project');
}
async function importFiles(files){
  resetIfTemplate(Array.from(files).map(f=>f.webkitRelativePath||f.name));
  let count=0;
  for(const f of files){
    if(!f||/\.DS_Store$/i.test(f.name))continue;
    const rel=(f.webkitRelativePath||f.name).replace(/\\/g,'/');
    const segs=rel.split('/');
    const fileName=segs.pop();
    const sub=segs.join('/');
    const base=currentDir();
    const dir=sub?(base?base+'/'+sub:sub):base;
    ensureFolder(dir);
    importFile(dir,fileName,await readBytes(f));
    count++;
  }
  isTemplate=false;
  return count;
}
async function importZip(file){
  const buf=await file.arrayBuffer();
  const entries=await zipRead(buf);
  if(!entries.length)throw new Error('ZIP contains no files');
  resetIfTemplate(entries.map(e=>e.name));
  let root='';
  const first=entries[0].name;
  const slash=first.indexOf('/');
  if(slash>0){
    const cand=first.slice(0,slash+1);
    if(entries.every(e=>e.name.startsWith(cand)))root=cand;
  }
  let placed=0;
  for(const e of entries){
    let name=e.name.replace(/\\/g,'/');
    if(name.startsWith('__MACOSX/')||/\.DS_Store$/i.test(name))continue;
    if(root&&name.startsWith(root))name=name.slice(root.length);
    if(!name)continue;
    const segs=name.split('/');
    const fileName=segs.pop();
    const sub=segs.join('/');
    const base=currentDir();
    const dir=sub?(base?base+'/'+sub:sub):base;
    ensureFolder(dir);
    importFile(dir,fileName,e.data);
    placed++;
  }
  isTemplate=false;
  return placed;
}
function afterImport(){
  renderTree();populateEntry();updateToolbar();
  if(!activePath||!nodes.has(activePath)){
    const entry=resolveEntry();
    if(entry)openFile(entry);
  }
  persistSoon();refreshInline();
}
$('#fileInput').onchange=async e=>{
  const files=Array.from(e.target.files||[]);e.target.value='';
  if(!files.length)return;
  try{
    const n=await importFiles(files);
    afterImport();
    addLog('sys','Imported '+n+' file(s)');
    toast('Imported '+n+' file(s)','ok');
  }catch(err){addLog('error','Import failed: '+err.message);toast('Import failed','err');}
};
$('#folderInput').onchange=async e=>{
  const files=Array.from(e.target.files||[]);e.target.value='';
  if(!files.length)return;
  try{
    const n=await importFiles(files);
    afterImport();
    addLog('sys','Imported folder · '+n+' file(s)');
    toast('Imported '+n+' files','ok');
  }catch(err){addLog('error','Import failed: '+err.message);toast('Import failed','err');}
};
$('#zipInput').onchange=async e=>{
  const file=(e.target.files||[])[0];e.target.value='';
  if(!file)return;
  toast('Extracting '+file.name+'…');
  try{
    const n=await importZip(file);
    afterImport();
    addLog('sys','Extracted ZIP · '+n+' file(s)');
    toast('Extracted '+n+' files','ok');
  }catch(err){addLog('error','ZIP import failed: '+err.message);toast('ZIP import failed','err');}
};
['dragover','drop'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault()));
document.addEventListener('drop',async e=>{
  const files=Array.from(e.dataTransfer?.files||[]);
  if(!files.length)return;
  const zips=files.filter(f=>/\.zip$/i.test(f.name));
  const rest=files.filter(f=>!/\.zip$/i.test(f.name));
  try{
    let total=0;
    for(const z of zips)total+=await importZip(z);
    if(rest.length)total+=await importFiles(rest);
    afterImport();
    toast('Imported '+total+' file(s)','ok');
  }catch(err){addLog('error','Drop import failed: '+err.message);toast('Import failed','err');}
});

/* ============ EXPORT / ZIP ============ */
function download(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=name;a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},2000);
}
const CRC_TABLE=(()=>{
  const t=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;
    t[n]=c>>>0;
  }
  return t;
})();
function crc32(buf){
  let c=0xFFFFFFFF;
  for(let i=0;i<buf.length;i++)c=CRC_TABLE[(c^buf[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
function zipCreate(entries){
  const chunks=[],central=[];
  let offset=0;
  for(const e of entries){
    const name=enc.encode(e.name);
    const data=e.data;
    const crc=crc32(data);
    const local=new Uint8Array(30+name.length);
    const dv=new DataView(local.buffer);
    dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);
    dv.setUint16(8,0,true);dv.setUint16(10,0,true);dv.setUint16(12,0x21,true);
    dv.setUint32(14,crc,true);dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);
    dv.setUint16(26,name.length,true);dv.setUint16(28,0,true);
    local.set(name,30);
    chunks.push(local,data);
    const cd=new Uint8Array(46+name.length);
    const cv=new DataView(cd.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);
    cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);cv.setUint16(12,0,true);
    cv.setUint16(14,0x21,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);
    cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);
    cv.setUint32(42,offset,true);
    cd.set(name,46);
    central.push(cd);
    offset+=local.length+data.length;
  }
  let cdSize=0;
  central.forEach(c=>cdSize+=c.length);
  const eocd=new Uint8Array(22);
  const ev=new DataView(eocd.buffer);
  ev.setUint32(0,0x06054b50,true);
  ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);
  ev.setUint32(12,cdSize,true);ev.setUint32(16,offset,true);
  return new Blob([...chunks,...central,eocd],{type:'application/zip'});
}
async function zipRead(buffer){
  const u8=new Uint8Array(buffer);
  const dv=new DataView(buffer);
  let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-66000);i--){
    if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}
  }
  if(eocd<0)throw new Error('Not a valid ZIP archive');
  const count=dv.getUint16(eocd+10,true);
  let p=dv.getUint32(eocd+16,true);
  const out=[];
  for(let i=0;i<count;i++){
    if(p+46>u8.length||dv.getUint32(p,true)!==0x02014b50)break;
    const method=dv.getUint16(p+10,true);
    const csize=dv.getUint32(p+20,true);
    const nlen=dv.getUint16(p+28,true);
    const elen=dv.getUint16(p+30,true);
    const clen=dv.getUint16(p+32,true);
    const lho=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46,p+46+nlen));
    const lnlen=dv.getUint16(lho+26,true);
    const lelen=dv.getUint16(lho+28,true);
    const start=lho+30+lnlen+lelen;
    const raw=u8.subarray(start,start+csize);
    if(!name.endsWith('/')){
      let data;
      if(method===0)data=new Uint8Array(raw);
      else if(method===8){
        if(typeof DecompressionStream==='undefined')throw new Error('This device cannot decompress DEFLATE entries');
        const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        data=new Uint8Array(await new Response(stream).arrayBuffer());
      }else{p+=46+nlen+elen+clen;continue;}
      out.push({name,data});
    }
    p+=46+nlen+elen+clen;
  }
  return out;
}
function exportZip(){
  const entries=[];
  nodes.forEach(n=>{if(n.type==='file')entries.push({name:n.path,data:bytesOf(n)});});
  if(!entries.length)return toast('Nothing to export','warn');
  download(zipCreate(entries),'forge-project.zip');
  addLog('sys','Exported ZIP · '+entries.length+' file(s)');
  toast('Exported project.zip','ok');
}
function exportStandalone(){
  if(!nodes.size)return toast('No files in project','warn');
  const build=new Build();
  try{
    const html=buildPreviewHTML(build,'data');
    download(new Blob([html],{type:'text/html'}),(resolveEntry()||'index').replace(/\.html?$/i,'')+'.standalone.html');
    toast('Exported standalone HTML','ok');
    addLog('sys','Exported standalone HTML bundle');
  }catch(e){toast('Export failed: '+e.message,'err');}
}
function exportSingle(){
  if(!activePath)return toast('No file open','warn');
  const n=nodes.get(activePath);if(!n)return;
  download(new Blob([bytesOf(n)],{type:mimeOf(activePath)}),n.name);
  toast('Saved '+n.name,'ok');
}


