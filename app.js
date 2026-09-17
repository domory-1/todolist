const legacyStorageKey = 'little-star-wishes-v1';
const browserIdentityKey = 'little-star-browser-id-v1';
let browserId = localStorage.getItem(browserIdentityKey);
if(!browserId){
  browserId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(browserIdentityKey,browserId);
}
const storageKey = `${legacyStorageKey}:${browserId}`;
let tasks = JSON.parse(localStorage.getItem(storageKey) || 'null');
if(!tasks){
  const legacyTasks = JSON.parse(localStorage.getItem(legacyStorageKey) || 'null');
  tasks = legacyTasks || [];
  localStorage.setItem(storageKey,JSON.stringify(tasks));
}
const $ = (id) => document.getElementById(id);
const escapeHtml = (text) => text.replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;' }[c]));
function save(){ localStorage.setItem(storageKey, JSON.stringify(tasks)); }
function updateTimeWish(){
  const hour=new Date().getHours();
  let message;
  if(hour>=5&&hour<11) message='早呀，今天也要照顾好自己';
  else if(hour>=11&&hour<14) message='中午好，记得好好吃饭';
  else if(hour>=14&&hour<19) message='下午好，慢一点也没关系';
  else message='夜深了，一个人要照顾好自己';
  $('timeWish').textContent=message;
}
function render(){
  const done = tasks.filter(t => t.done); const ordered = [...tasks].sort((a,b) => Number(b.done) - Number(a.done));
  $('taskList').innerHTML = ordered.map(t => `<li class="task ${t.done ? 'done completed-task' : ''}" data-id="${t.id}" style="view-transition-name: wish-${t.id}"><button class="check" type="button" aria-label="${t.done ? '设为未完成' : '完成'}" aria-pressed="${t.done}"></button><span class="task-name">${escapeHtml(t.title)}</span></li>`).join('');
  $('taskList').classList.toggle('dense',ordered.length>8);
  $('emptyHint').hidden = ordered.length>0;
  renderStars(done);
}
function renderStars(done){
  const positions = [[69,8],[84,31],[72,73],[42,88],[13,68],[9,32],[38,10],[92,55],[54,3],[25,88],[4,51],[57,97]];
  $('stars').innerHTML = done.map((task, i) => { const [x,y] = positions[i % positions.length], z = 22 + (i % 4) * 20, scale = 0.76 + (i % 3) * .18; return `<button class="star" data-wish-id="${task.id}" style="left:calc(${x}% - 18px);top:calc(${y}% - 18px);--z:${z}px;--scale:${scale};animation-delay:${i*.25}s" title="${escapeHtml(task.title)}">✦<small>${escapeHtml(task.title)}</small></button>` }).join('');
}
const completing = new Set();
function reorderWithMotion(){
  const positions=new Map([...$('taskList').querySelectorAll('.task')].map(row=>[row.dataset.id,row.getBoundingClientRect().top]));
  render();
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  $('taskList').querySelectorAll('.task').forEach(row=>{
    const previous=positions.get(row.dataset.id),distance=previous-row.getBoundingClientRect().top;
    if(previous!==undefined&&Math.abs(distance)>1)row.animate([{transform:`translateY(${distance}px)`},{transform:'translateY(0)'}],{duration:520,easing:'cubic-bezier(.25,.8,.25,1)'});
  });
}
function toggle(id,row){
  const task=tasks.find(x=>x.id===id); if(!task||completing.has(id))return;
  task.done=!task.done; save();
  const reorder=()=>{reorderWithMotion();completing.delete(id);};
  if(task.done){
    completing.add(id); row.classList.add('done','completing');
    row.querySelector('.check').setAttribute('aria-label','设为未完成');
    row.querySelector('.check').setAttribute('aria-pressed','true');
    window.wishEffects.meteor(row);
    setTimeout(reorder,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:360);
  }else reorder();
}
$('taskList').addEventListener('click', event => { const row=event.target.closest('.task'); if(!row)return; const id=Number(row.dataset.id); if(event.target.closest('.check')||event.target.closest('.task-name')) toggle(id,row); });
let composerFocusTimer;
function composer(open){
  clearTimeout(composerFocusTimer);
  if(!open)$('openComposer').focus();
  $('composerBackdrop').classList.toggle('open',open);$('composerBackdrop').setAttribute('aria-hidden',!open);
  if(open)composerFocusTimer=setTimeout(()=>$('taskInput').focus(),200);
}
$('openComposer').onclick=()=>composer(true); $('closeComposer').onclick=()=>composer(false); $('composerBackdrop').onclick=e=>{if(e.target===$('composerBackdrop'))composer(false)};
$('composer').onsubmit=e=>{
  e.preventDefault();const input=$('taskInput'),title=input.value.trim();if(!title)return;
  const id=Date.now();tasks.unshift({id,title,done:false});save();render();input.value='';composer(false);
  focusFirstPending('instant');
  setTimeout(()=>{
    const row=$('taskList').querySelector(`[data-id="${id}"]`);
    if(!row||!$('todoPage').classList.contains('active'))return;
    row.classList.add('arriving');window.wishEffects.supernova(row);
    setTimeout(()=>row.classList.remove('arriving'),1500);
  },260);
};
document.addEventListener('keydown',e=>{if(e.key==='Escape')composer(false)});
function focusFirstPending(behavior='smooth'){ const first=$('taskList').querySelector('.task:not(.done)'); if(first) $('taskList').scrollTo({top:Math.max(0,first.offsetTop-$('taskList').offsetTop-8),behavior:typeof behavior==='string'?behavior:'smooth'}); }
document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{const sky=btn.dataset.page==='sky';document.querySelectorAll('.tab').forEach(x=>{x.classList.toggle('active',x===btn);x.setAttribute('aria-pressed',String(x===btn));});$('todoPage').classList.toggle('active',!sky);$('todoPage').setAttribute('aria-hidden',sky);$('skyPage').classList.toggle('active',sky);$('skyPage').setAttribute('aria-hidden',!sky);if(!sky) requestAnimationFrame(focusFirstPending);});
updateTimeWish(); render(); requestAnimationFrame(focusFirstPending);
