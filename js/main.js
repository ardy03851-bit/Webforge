"use strict";
/**
 * js/main.js — Starter project, keyboard shortcuts, error reporting, and the boot sequence. Loaded last.
 *
 * Loaded as a classic script from index.html. Modules share one global
 * scope; keep the documented load order when adding files.
 */

/* ============ STARTER PROJECT ============ */
function seedProject(){
  writeFile('index.html',`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Forge App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="stage">
    <p class="eyebrow">FORGE STUDIO</p>
    <h1>Hello, builder.</h1>
    <p class="sub">Edit any file on the left. The preview updates live.</p>
    <canvas id="scene" width="560" height="300"></canvas>
    <button id="go">Pause</button>
  </main>
  <script src="main.js"><\/script>
</body>
</html>`,false);
  writeFile('styles.css',`* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; display: grid; place-items: center;
  background: radial-gradient(circle at 50% 0%, #182033, #050608 68%);
  color: #e9edf2;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.stage { text-align: center; padding: 32px; }
.eyebrow { margin: 0 0 8px; font-size: 10px; letter-spacing: .3em; color: #5b8cff; }
h1 { margin: 0 0 8px; font-size: 30px; font-weight: 620; letter-spacing: -.03em; }
.sub { margin: 0 0 24px; color: #6f7784; font-size: 13px; }
canvas {
  display: block; max-width: 100%; border-radius: 14px; background: #000;
  border: 1px solid rgba(255,255,255,.07);
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
}
button {
  margin-top: 20px; padding: 9px 22px; border-radius: 9px; cursor: pointer;
  border: 1px solid rgba(255,255,255,.12);
  background: #111; color: #e9edf2;
  font-size: 13px; transition: background .15s, transform .15s;
}
button:hover { background: #191919; }
button:active { transform: scale(.98); }`,false);
  writeFile('main.js',`const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const ball = { x: canvas.width / 2, y: canvas.height / 2, r: 26, vx: 3.1, vy: 2.3, hue: 215 };
let running = true;
function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  if (running) {
    ball.x += ball.vx; ball.y += ball.vy;
    ball.hue = (ball.hue + 0.55) % 360;
    if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) ball.vx *= -1;
    if (ball.y - ball.r < 0 || ball.y + ball.r > canvas.height) ball.vy *= -1;
  }
  const grad = ctx.createRadialGradient(ball.x - 8, ball.y - 8, 2, ball.x, ball.y, ball.r);
  grad.addColorStop(0, 'hsl(' + ball.hue + ' 92% 74%)');
  grad.addColorStop(1, 'hsl(' + ball.hue + ' 72% 46%)');
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.shadowColor = 'hsla(' + ball.hue + ' 92% 60% / .55)';
  ctx.shadowBlur = 28; ctx.fill(); ctx.shadowBlur = 0;
  requestAnimationFrame(frame);
}
document.getElementById('go').addEventListener('click', () => {
  running = !running;
  console.log('Animation running:', running);
});
console.log('Scene ready — canvas ' + canvas.width + 'x' + canvas.height);
frame();`,false);
  writeFile('README.md',`# Forge Studio

A browser IDE with live preview, ZIP import/export, a 3D model viewer (GLB / glTF / OBJ / STL).

## Shortcuts
- **Ctrl/Cmd + K** or **Ctrl/Cmd + P** — command palette
- **Ctrl/Cmd + S** — save
- **Ctrl/Cmd + Enter** — refresh preview
- **Ctrl/Cmd + F** — find & replace
- **Ctrl/Cmd + Shift + F** — format
- **Tab / Shift+Tab** — indent / outdent`,false);
  entryPath='index.html';
  isTemplate=true;
}

/* ============ KEYBOARD ============ */
document.addEventListener('keydown',e=>{
  const mod=e.metaKey||e.ctrlKey;
  if(!mod)return;
  const k=e.key.toLowerCase();
  if(k==='s'){e.preventDefault();persist().then(()=>toast('Project saved','ok'));}
  else if(k==='enter'){e.preventDefault();if(settings.preview==='popup')openExternal();else refreshInline();}
  else if(k==='f'&&e.shiftKey){e.preventDefault();formatCurrent();}
  else if(k==='f'){e.preventDefault();openSearch();}
  else if(k==='k'||k==='p'){e.preventDefault();cmdkOpen();}
  else if(k==='w'&&e.shiftKey){e.preventDefault();settings.wrap=!settings.wrap;applyAll();}
});

/* global errors */
window.addEventListener('error',e=>{
  if(e.filename&&e.filename.startsWith('blob:'))return;
  addLog('error','IDE error: '+e.message,{stack:e.error?.stack||'',source:e.filename,line:e.lineno});
});
window.addEventListener('unhandledrejection',e=>{
  const r=e.reason;
  addLog('error','IDE promise rejection: '+((r&&r.message)||String(r)),{stack:(r&&r.stack)||''});
});

/* ============ BOOT ============ */
(async function boot(){
  addLog('sys','Forge Studio ready');
  applyAll();
  const restored=await restore();
  if(!restored)seedProject();
  renderTree();populateEntry();updateToolbar();
  const start=(activePath&&nodes.has(activePath))?activePath:(nodes.has('index.html')?'index.html':null);
  if(start)openFile(start);else clearEditor();
  addLog('sys',nodes.size+' node(s) in project');
  if(settings.preview==='side'||settings.preview==='bottom')setTimeout(refreshInline,120);
  persistSoon();
})();
