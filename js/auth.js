// Autenticação, sessão e bootstrap da aplicação.

async function tryLogin(){
  const pwd=document.getElementById('pwd-input').value;
  if(!pwd) return;
  const btn=document.getElementById('login-btn');
  btn.disabled=true;btn.textContent='Verificando...';
  try{
    const hash=await sha256(pwd);
    const res=await fetch(SCRIPT_URL+'?auth='+hash);
    const json=await res.json();
    if(!json.ok||!json.role) throw new Error('unauthorized');
    authHash=hash;mode=json.role;saveSession();
    enterApp(json.data);
  }catch(e){
    const er=document.getElementById('login-error');
    er.style.display='block';setTimeout(()=>er.style.display='none',2500);
  }finally{
    btn.disabled=false;btn.textContent='Entrar';
  }
}

function saveSession(){
  localStorage.setItem(SESSION_KEY,JSON.stringify({mode,authHash,expires:Date.now()+SESSION_TTL}));
}

function loadSession(){
  try{
    const s=JSON.parse(localStorage.getItem(SESSION_KEY));
    if(s&&s.mode&&s.authHash&&s.expires>Date.now()){
      mode=s.mode;authHash=s.authHash;return true;
    }
  }catch(e){}
  return false;
}

function enterApp(initialData){
  document.getElementById('login-screen').style.display='none';
  const app=document.getElementById('app');
  app.style.display='flex';
  app.classList.add('open');
  const badge=document.getElementById('mode-badge');
  badge.textContent=mode==='admin'?'Admin':'Visualização';
  badge.className='mode-badge '+(mode==='admin'?'mode-admin':'mode-view');
  const isAdmin=mode==='admin';
  document.getElementById('add-btn-top').style.display='none';
  document.getElementById('add-row-btn').style.display=isAdmin?'flex':'none';
  document.getElementById('topbar-context').textContent='Panorama';
  if(initialData){applyData(initialData);setSyncStatus('ok','Atualizado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));}
  else loadData();
  if(mode==='viewer')setInterval(loadData,60000);
}

function logout(){
  mode=null;authHash=null;
  localStorage.removeItem(SESSION_KEY);
  const app=document.getElementById('app');
  app.style.display='none';
  app.classList.remove('open');
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('pwd-input').value='';
}

function handleUnauthorized(){
  showToast('Sessão expirada. Faça login novamente.',true);
  logout();
}

// Bootstrap
document.getElementById('pwd-input').addEventListener('keydown',e=>{if(e.key==='Enter')tryLogin();});
window.addEventListener('load',()=>{
  const vEl=document.getElementById('app-version');
  if(vEl) vEl.textContent='v'+VERSION;
  initTheme();
  if(loadSession())enterApp();
});

// ── THEME ──
let themeDropCount=0,themeListenerAdded=false;

function initTheme(){
  const saved=localStorage.getItem('selenior_theme')||'light';
  applyTheme(saved,false);
  if(!themeListenerAdded){
    themeListenerAdded=true;
    document.addEventListener('click',e=>{
      if(!e.target.closest('.theme-switcher-wrap')){
        document.getElementById('theme-menu')?.classList.remove('open');
        document.getElementById('theme-trigger')?.classList.remove('open');
      }
    });
  }
}

function toggleThemeMenu(){
  const menu=document.getElementById('theme-menu');
  const trigger=document.getElementById('theme-trigger');
  const isOpening=!menu.classList.contains('open');
  menu.classList.toggle('open');trigger.classList.toggle('open');
  if(isOpening){
    themeDropCount++;
    if(themeDropCount>=10){
      themeDropCount=0;
      menu.classList.remove('open');trigger.classList.remove('open');
      setTimeout(activateBatmanMode,250);
    }
  }
}

function setTheme(t){
  document.getElementById('theme-menu').classList.remove('open');
  document.getElementById('theme-trigger').classList.remove('open');
  themeDropCount=0;
  applyTheme(t,true);
}

function applyTheme(t,save){
  document.documentElement.classList.add('theme-transitioning');
  setTimeout(()=>document.documentElement.classList.remove('theme-transitioning'),300);
  if(save) localStorage.setItem('selenior_theme',t);
  if(t==='light') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme',t);
  const icons={light:'☀️',dark:'🌙',batman:'🦇'};
  const labels={light:'Claro',dark:'Escuro',batman:'Batman'};
  const iconEl=document.getElementById('theme-icon');
  const labelEl=document.getElementById('theme-label');
  if(iconEl) iconEl.textContent=icons[t]||'☀️';
  if(labelEl) labelEl.textContent=labels[t]||'Claro';
  document.querySelectorAll('#theme-menu button[data-theme]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.theme===t);
  });
  // Re-renderiza charts se o dashboard estiver visível
  const dashEl=document.getElementById('view-dashboard');
  if(dashEl&&dashEl.style.display!=='none'&&typeof renderDashboard==='function') renderDashboard();
  // DOM overrides para batman
  const batBrand=document.querySelector('.batman-brand');
  const tagEl=document.querySelector('.sidebar-tag');
  const vEl=document.getElementById('app-version');
  if(t==='batman'){
    if(batBrand) batBrand.style.display='inline-flex';
    if(tagEl){if(!tagEl.dataset.orig)tagEl.dataset.orig=tagEl.textContent;tagEl.textContent='WAYNE';}
    if(vEl) vEl.textContent='Alfred Pennyworth, Butler';
  }else{
    if(batBrand) batBrand.style.display='none';
    if(tagEl&&tagEl.dataset.orig) tagEl.textContent=tagEl.dataset.orig;
    if(vEl) vEl.textContent='v'+VERSION;
  }
}

function activateBatmanMode(){
  const overlay=document.getElementById('batman-overlay');
  if(overlay){overlay.classList.add('show');setTimeout(()=>overlay.classList.remove('show'),3600);}
  applyTheme('batman',true);
}
