"use strict";
/**
 * js/viewer3d.js — Three.js model viewer for GLB, glTF, OBJ, and STL assets.
 *
 * Loaded as a classic script from index.html. Modules share one global
 * scope; keep the documented load order when adding files.
 */

/* ============ 3D ============ */
let scene3d=null,camera3d=null,renderer3d=null,controls3d=null;
let frame3d=null,model3d=null,modelToken=0;
let modelUrls=[];
const modelCache=new Map();
let ro3d=null;
function disposeObject(root){
  if(!root||!root.traverse)return;
  const geos=new Set(),mats=new Set(),texs=new Set();
  root.traverse(o=>{
    if(o.geometry&&!geos.has(o.geometry)){geos.add(o.geometry);try{o.geometry.dispose();}catch(e){}}
    const list=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
    list.forEach(m=>{
      if(!m||mats.has(m))return;
      mats.add(m);
      Object.values(m).forEach(v=>{
        if(v&&v.isTexture&&!texs.has(v)){texs.add(v);try{v.dispose();}catch(e){}}
      });
      try{m.dispose();}catch(e){}
    });
  });
}
function dispose3D(){
  modelToken++;
  if(frame3d)cancelAnimationFrame(frame3d);frame3d=null;
  if(ro3d){ro3d.disconnect();ro3d=null;}
  if(scene3d)disposeObject(scene3d);scene3d=null;
  if(controls3d){try{controls3d.dispose();}catch(e){}controls3d=null;}
  if(renderer3d){try{renderer3d.dispose();}catch(e){}renderer3d=null;}
  modelUrls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});
  modelUrls=[];modelCache.clear();model3d=null;camera3d=null;
}
function modelManager(){
  const manager=new THREE.LoadingManager();
  const prefix='https://forge.invalid/__project__/';
  manager.setURLModifier(url=>{
    if(typeof url!=='string'||!url.startsWith(prefix))return url;
    let path;
    try{path=decodeURIComponent(new URL(url).pathname.replace(/^\/__project__\//,''));}
    catch(e){return url;}
    const node=nodes.get(path);
    if(!node||node.type!=='file')return url;
    if(modelCache.has(path))return modelCache.get(path);
    try{
      const obj=URL.createObjectURL(new Blob([bytesOf(node)],{type:mimeOf(path)}));
      modelCache.set(path,obj);modelUrls.push(obj);return obj;
    }catch(e){return url;}
  });
  return manager;
}
function finishModel(root,token){
  if(!root||!root.isObject3D)throw new Error('The loader returned no scene');
  if(token!==modelToken||!scene3d){disposeObject(root);return;}
  const box=new THREE.Box3().setFromObject(root);
  const size=box.getSize(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z);
  if(!Number.isFinite(max)||max<=0)throw new Error('The model has no visible geometry');
  root.scale.multiplyScalar(2/max);
  root.updateMatrixWorld(true);
  const scaled=new THREE.Box3().setFromObject(root);
  root.position.sub(scaled.getCenter(new THREE.Vector3()));
  root.updateMatrixWorld(true);
  model3d=root;scene3d.add(root);
  const finalBox=new THREE.Box3().setFromObject(root);
  const s=finalBox.getSize(new THREE.Vector3());
  const fit=Math.max(s.x,s.y,s.z,.1);
  const dist=Math.max(2.8,fit/(2*Math.tan(THREE.MathUtils.degToRad(camera3d.fov/2)))*1.4);
  camera3d.position.set(dist*.72,dist*.52,dist);
  camera3d.near=Math.max(dist/2000,.001);
  camera3d.far=Math.max(dist*100,1000);
  camera3d.lookAt(0,0,0);camera3d.updateProjectionMatrix();
  if(controls3d){
    controls3d.target.set(0,0,0);
    controls3d.minDistance=Math.max(fit*.15,.05);
    controls3d.maxDistance=fit*80;
    controls3d.update();
  }
  v3dLoading.style.display='none';
  animate3D();
}
function loadModel(node,token){
  const ext=extOf(node.path);
  const base='https://forge.invalid/__project__/'+dirOf(node.path).split('/').filter(Boolean).map(encodeURIComponent).join('/')+(dirOf(node.path)?'/':'');
  const manager=modelManager();
  const bytes=bytesOf(node);
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  try{
    if(!window.THREE)throw new Error('Three.js could not load — check your connection');
    if(ext==='glb'||ext==='gltf'){
      new THREE.GLTFLoader(manager).parse(buffer,base,g=>finishModel(g.scene||g.scenes?.[0],token),e=>failModel(e,token));
    }else if(ext==='obj'){
      finishModel(new THREE.OBJLoader(manager).parse(dec.decode(bytes)),token);
    }else if(ext==='stl'){
      const geo=new THREE.STLLoader(manager).parse(buffer);
      if(geo.computeVertexNormals)geo.computeVertexNormals();
      finishModel(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xb8c2d3,metalness:.12,roughness:.58})),token);
    }else throw new Error('Unsupported model format');
  }catch(e){failModel(e,token);}
}
function failModel(err,token){
  if(token!==modelToken)return;
  v3dLoading.style.display='flex';
  v3dLoading.textContent='Could not load model — '+(err?.message||err);
  addLog('error','3D load failed: '+(err?.message||err),{stack:err?.stack});
}
function show3D(node){
  hideViewer();releaseViewerUrls();hideTextSurface();
  $('#emptyState').style.display='none';
  v3dEl.classList.add('show');
  $('#v3dTitle').textContent=node.name;
  v3dLoading.style.display='flex';
  v3dLoading.textContent='Loading model…';
  dispose3D();
  const token=modelToken;
  try{
    if(!window.THREE||!THREE.WebGLRenderer)throw new Error('Three.js could not load');
    scene3d=new THREE.Scene();
    if(settings.bg==='grid')scene3d.add(new THREE.GridHelper(100,50,0x333333,0x222222));
    else scene3d.background=new THREE.Color(settings.bg==='light'?0xf0f1f4:0x080a0e);
    const w=Math.max(1,v3dEl.clientWidth||500),h=Math.max(1,v3dEl.clientHeight||400);
    camera3d=new THREE.PerspectiveCamera(45,w/h,.01,10000);
    camera3d.position.set(3,3,5);
    renderer3d=new THREE.WebGLRenderer({canvas:v3dCanvas,antialias:true,alpha:settings.bg==='grid'});
    renderer3d.setSize(w,h);
    renderer3d.setPixelRatio(Math.min(devicePixelRatio||1,2));
    if('outputEncoding'in renderer3d&&THREE.sRGBEncoding!==undefined)renderer3d.outputEncoding=THREE.sRGBEncoding;
    scene3d.add(new THREE.HemisphereLight(0xffffff,0x303747,1));
    const key=new THREE.DirectionalLight(0xffffff,1.5);key.position.set(5,8,7);scene3d.add(key);
    const fill=new THREE.DirectionalLight(0x9eb9ff,.45);fill.position.set(-5,-2,-4);scene3d.add(fill);
    if(THREE.OrbitControls){
      controls3d=new THREE.OrbitControls(camera3d,renderer3d.domElement);
      controls3d.enableDamping=true;controls3d.dampingFactor=.075;
      controls3d.autoRotate=settings.rotate;controls3d.autoRotateSpeed=1;
      controls3d.screenSpacePanning=true;
    }
    if(typeof ResizeObserver!=='undefined'){
      ro3d=new ResizeObserver(()=>{
        if(!renderer3d||!camera3d||!v3dEl.classList.contains('show'))return;
        const nw=Math.max(1,v3dEl.clientWidth),nh=Math.max(1,v3dEl.clientHeight);
        camera3d.aspect=nw/nh;camera3d.updateProjectionMatrix();
        renderer3d.setSize(nw,nh);
      });
      ro3d.observe(v3dEl);
    }
    loadModel(node,token);
  }catch(e){failModel(e,token);}
}
function animate3D(){
  if(!v3dEl.classList.contains('show')||!renderer3d||!scene3d||!camera3d)return;
  frame3d=requestAnimationFrame(animate3D);
  if(controls3d)controls3d.update();
  renderer3d.render(scene3d,camera3d);
}
$('#btn3dReset').onclick=()=>{
  if(!camera3d||!model3d)return;
  const box=new THREE.Box3().setFromObject(model3d);
  const size=box.getSize(new THREE.Vector3());
  const fit=Math.max(size.x,size.y,size.z,.1);
  const dist=Math.max(2.8,fit*1.8);
  camera3d.position.set(dist*.72,dist*.52,dist);
  camera3d.lookAt(0,0,0);
  if(controls3d){controls3d.target.set(0,0,0);controls3d.update();}
};
$('#btn3dClose').onclick=()=>{
  const node=activePath?nodes.get(activePath):null;
  hide3D();
  if(node){
    viewerEl.innerHTML=`<div class="asset-card"><div class="big">${ico('cube',24)}</div><h3>${esc(node.name)}</h3>`+
      `<p>3D preview closed.</p><p style="margin-top:10px">${fmtBytes(bytesOf(node).length)} · .${esc(extOf(node.path).toUpperCase())}</p>`+
      `<button class="btn primary" id="reopen3d" style="margin-top:16px">Open 3D view</button></div>`;
    viewerEl.classList.add('show');
    $('#reopen3d').onclick=()=>show3D(node);
  }
};


