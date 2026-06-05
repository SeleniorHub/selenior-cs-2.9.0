// Helpers de UI, formatters e funções de renderização.

function initials(n){return n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();}
function colorFor(i){return AVATAR_COLORS[i%AVATAR_COLORS.length];}
function parseMoney(s){return parseInt((String(s)||'0').replace(/\D/g,''))||0;}
function fmtMoney(n){if(n>=1000000)return'R$'+(n/1000000).toFixed(1)+'M';if(n>=1000)return'R$'+Math.round(n/1000)+'k';return'R$'+n;}
function calcMRR(cl){const bruto=parseMoney(cl.mrr);let comissao=0;if(cl.comissaoVal){const v=parseFloat(String(cl.comissaoVal).replace(',','.'))||0;comissao=cl.comissaoTipo==='pct'?Math.round(bruto*v/100):Math.round(v);}const custo=parseMoney(cl.custo||'0');return{bruto,comissao,custo,deducao:comissao+custo,liquido:bruto-comissao-custo};}
function churnBadge(c){if(c==='alto')return'<span class="badge churn-high">Risco alto</span>';if(c==='médio')return'<span class="badge churn-med">Risco médio</span>';return'<span class="badge churn-low">Risco baixo</span>';}
function progressPct(cl){if(!cl.checkpoints||!cl.checkpoints.length)return 0;return Math.round((cl.done.length/cl.checkpoints.length)*100);}
function mesStrip(mes){let h='<div class="mes-strip">';for(let i=1;i<=12;i++)h+=`<div class="mes-dot ${i<mes?'done':i===mes?'cur':''}" title="Mês ${i}"></div>`;return h+'</div>';}
function ownerTag(r){if(r==='Leo')return'<span class="owner-tag owner-leo">Leo</span>';if(r==='João Pedro')return'<span class="owner-tag owner-joao">João Pedro</span>';return'<span class="owner-tag owner-client">'+r+'</span>';}
function docIcon(tipo){return({briefing:'📋',contrato:'📑',qbr:'📊',apresentacao:'🖥',gravacao:'🎥',outro:'📄'})[tipo]||'📄';}
function docTipoLabel(tipo){return({briefing:'Briefings',contrato:'Contratos',qbr:'QBR / Relatórios',apresentacao:'Apresentações',gravacao:'Gravações',outro:'Outros'})[tipo]||'Outros';}
function formatBytes(n){if(!n)return'';if(n<1024)return n+' B';if(n<1024*1024)return Math.round(n/1024)+' KB';return(n/(1024*1024)).toFixed(1)+' MB';}

function calcMesAtual(dataInicio){
  if(!dataInicio) return 1;
  const inicio=new Date(dataInicio);const hoje=new Date();
  const meses=((hoje.getFullYear()-inicio.getFullYear())*12)+(hoje.getMonth()-inicio.getMonth())+1;
  return Math.min(Math.max(meses,1),12);
}
function fmtTempo(dataInicio){
  if(!dataInicio) return '';
  const inicio=new Date(dataInicio);const hoje=new Date();
  const meses=((hoje.getFullYear()-inicio.getFullYear())*12)+(hoje.getMonth()-inicio.getMonth());
  if(meses===0) return 'menos de 1 mês';
  if(meses===1) return '1 mês';
  if(meses<12) return meses+' meses';
  const anos=Math.floor(meses/12);const m=meses%12;
  return anos+'a'+(m>0?' '+m+'m':'');
}

// ── HEALTH SCORE ──
function calcHealthScore(cl){
  const now=new Date();const today=new Date(now);today.setHours(0,0,0,0);
  // Frequência de reuniões (30%)
  const clReunioes=reunioes.filter(r=>r.clienteId===cl.id);
  let meetScore=100;
  if(clReunioes.length===0){
    const daysSinceStart=cl.dataInicio?Math.floor((now-new Date(cl.dataInicio))/(1000*60*60*24)):0;
    meetScore=daysSinceStart>15?0:100;
  }else{
    const latest=clReunioes.reduce((mx,r)=>new Date(r.data)>new Date(mx.data)?r:mx);
    const days=Math.floor((now-new Date(latest.data))/(1000*60*60*24));
    meetScore=days<=30?100:days<=60?50:0;
  }
  // Progresso de checkpoints (25%)
  const totalCp=(cl.checkpoints||[]).length;
  const doneCp=(cl.done||[]).length;
  const cpScore=totalCp>0?Math.round((doneCp/totalCp)*100):100;
  // Action items vencidos (25%)
  const overdue=actionItems.filter(a=>a.clienteId===cl.id&&!a.concluido&&a.dataPrazo&&new Date(a.dataPrazo)<today).length;
  const aiScore=overdue===0?100:overdue<=2?60:0;
  // Risco manual (20%)
  const churnScore=cl.churn==='baixo'?100:cl.churn==='médio'?50:0;
  return Math.round(meetScore*0.30+cpScore*0.25+aiScore*0.25+churnScore*0.20);
}
function healthLabel(score){
  if(score>=71)return{cls:'health-green',label:'Saudável'};
  if(score>=31)return{cls:'health-amber',label:'Atenção'};
  return{cls:'health-red',label:'Risco'};
}
function openClientViewTab(id,tab){
  openClientView(id);
  setTimeout(()=>{
    const tabMap={overview:0,reunioes:1,metas:2,actions:3,documentos:4};
    const tabs=document.querySelectorAll('.ctab');
    const btn=tabs[tabMap[tab]];
    if(btn) showClientTab(tab,btn);
  },60);
}

// ── TOGGLE CHECKPOINT ──
async function toggleCheckpoint(clientId,cpText){
  const cl=clients.find(c=>c.id===clientId);
  if(!cl||mode!=='admin') return;
  const norm=s=>s.trim().toLowerCase();
  const isDone=(cl.done||[]).some(d=>norm(d)===norm(cpText));
  if(isDone){cl.done=(cl.done||[]).filter(d=>norm(d)!==norm(cpText));}
  else{cl.done=[...(cl.done||[]),cpText];}
  renderOverview(cl);
  try{await upsertRow('Clientes',clientToRow(cl));}
  catch(e){showToast('Erro ao salvar checkpoint',true);}
}

// ── LIST VIEW ──
function setFilter(f,btn){activeFilter=f;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderList();}
function renderAll(){
  renderSummary();renderList();
  const dashVisible=document.getElementById('view-dashboard')?.style.display!=='none';
  const actionsVisible=document.getElementById('view-actions')?.style.display!=='none';
  const reunioesVisible=document.getElementById('view-reunioes')?.style.display!=='none';
  if(dashVisible&&typeof renderDashboard==='function') renderDashboard();
  if(actionsVisible&&typeof renderActionsPage==='function') renderActionsPage();
  if(reunioesVisible) renderReunioesView();
}

const VIEW_TITLES={dashboard:'Panorama',actions:'Action items',clientes:'Clientes',reunioes:'Reuniões'};

function showMainView(view,btn){
  if(btn){document.querySelectorAll('.side-nav-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
  else{document.querySelectorAll('.side-nav-btn').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);});}
  currentClientId=null;
  document.getElementById('view-dashboard').style.display=view==='dashboard'?'block':'none';
  document.getElementById('view-actions').style.display=view==='actions'?'block':'none';
  document.getElementById('view-list').style.display=view==='clientes'?'block':'none';
  document.getElementById('view-reunioes').style.display=view==='reunioes'?'block':'none';
  document.getElementById('view-client').style.display='none';
  document.getElementById('topbar-context').textContent=VIEW_TITLES[view]||'';
  const isAdmin=mode==='admin';
  document.getElementById('add-btn-top').style.display=(isAdmin&&view==='clientes')?'inline-flex':'none';
  if(view==='dashboard'&&typeof renderDashboard==='function') renderDashboard();
  if(view==='actions'&&typeof renderActionsPage==='function') renderActionsPage();
  if(view==='reunioes') renderReunioesView();
}

function renderSummary(){
  const ativos=clients.filter(c=>(c.status||'ativo')==='ativo');
  const total=ativos.length;const alto=ativos.filter(c=>c.churn==='alto').length;
  let mrrB=0,mrrL=0;ativos.forEach(cl=>{const{bruto,liquido}=calcMRR(cl);mrrB+=bruto;mrrL+=liquido;});
  document.getElementById('summary-grid').innerHTML=`
    <div class="metric"><div class="metric-label">Clientes ativos</div><div class="metric-value">${total}</div><div class="metric-sub">contratos vigentes</div></div>
    <div class="metric"><div class="metric-label">MRR bruto</div><div class="metric-value">${fmtMoney(mrrB)}</div><div class="metric-sub">receita total mensal</div></div>
    <div class="metric"><div class="metric-label">Deduções</div><div class="metric-value" style="color:var(--red)">-${fmtMoney(mrrB-mrrL)}</div><div class="metric-sub">comissões + custos</div></div>
    <div class="metric"><div class="metric-label">MRR líquido</div><div class="metric-value" style="color:var(--green)">${fmtMoney(mrrL)}</div><div class="metric-sub">${alto>0?alto+' em risco alto':'tudo ok'}</div></div>`;
}

function renderList(){
  const q=(document.getElementById('search-box').value||'').toLowerCase();
  const filtered=clients.filter(c=>{
    if(activeFilter==='churn'&&c.churn!=='alto')return false;
    if(activeFilter!=='todos'&&activeFilter!=='churn'&&c.fase!==activeFilter)return false;
    if(q&&!c.nome.toLowerCase().includes(q)&&!c.nicho.toLowerCase().includes(q))return false;
    return true;
  });
  const list=document.getElementById('client-list');
  if(!filtered.length){list.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Nenhum cliente encontrado</div><div class="empty-sub">Tente outro filtro ou termo de busca.</div></div>';return;}
  list.innerHTML=filtered.map(cl=>{
    const idx=clients.indexOf(cl);const ci=colorFor(idx);
    const{liquido}=calcMRR(cl);const pct=progressPct(cl);
    const aiPendentes=actionItems.filter(a=>a.clienteId===cl.id&&!a.concluido).length;
    const status=cl.status||'ativo';
    const inactiveCls=status!=='ativo'?' client-row-inactive':'';
    const statusBadge=status==='churned'?' <span class="status-tag status-churned">Churned</span>':status==='pausado'?' <span class="status-tag status-paused">Pausado</span>':'';
    const hs=status==='ativo'?calcHealthScore(cl):null;
    const hl=hs!==null?healthLabel(hs):null;
    return`<div class="client-row${inactiveCls}" onclick="openClientView('${cl.id}')">
      <div class="avatar" style="background:${ci.bg};color:${ci.txt}">${initials(cl.nome)}</div>
      <div class="row-info">
        <div class="row-name">${cl.nome}${statusBadge}</div>
        <div class="row-sub">${cl.nicho} · Mês ${calcMesAtual(cl.dataInicio)}/12${cl.dataInicio?' · desde '+new Date(cl.dataInicio).toLocaleDateString('pt-BR',{month:'short',year:'numeric'}):''} · ${cl.done.length}/${cl.checkpoints.length} checkpoints${aiPendentes>0?' · '+aiPendentes+' ação pendente':''}</div>
        <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="row-right">
        <span class="badge mrr-badge">${fmtMoney(liquido)}/mês</span>
        <span class="badge phase-badge">${cl.fase}</span>
        ${churnBadge(cl.churn)}
        ${hl?`<span class="health-badge ${hl.cls}">${hs}</span>`:''}
        <span style="font-size:16px;color:var(--text-3)">›</span>
      </div>
    </div>`;
  }).join('');
}

// ── CLIENT VIEW ──
function openClientView(id){
  currentClientId=id;
  document.getElementById('view-dashboard').style.display='none';
  document.getElementById('view-actions').style.display='none';
  document.getElementById('view-list').style.display='none';
  document.getElementById('view-client').style.display='block';
  const cl=clients.find(c=>c.id===id);
  document.getElementById('topbar-context').textContent=cl?cl.nome:'Cliente';
  document.getElementById('add-btn-top').style.display='none';
  showClientTab('overview',document.querySelector('.ctab'));
  renderClientView(id);
}

function goBack(){
  currentClientId=null;
  document.getElementById('view-client').style.display='none';
  const view=document.querySelector('.side-nav-btn.active')?.dataset.view||'clientes';
  showMainView(view,null);
}

function showClientTab(name,btn){
  document.querySelectorAll('.ctab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  ['overview','reunioes','metas','actions','documentos'].forEach(t=>document.getElementById('ctab-'+t).style.display='none');
  document.getElementById('ctab-'+name).style.display='block';
}

function renderClientView(id){
  const cl=clients.find(c=>c.id===id);
  if(!cl) return;
  const idx=clients.indexOf(cl);const ci=colorFor(idx);
  const av=document.getElementById('cv-avatar');
  av.textContent=initials(cl.nome);av.style.background=ci.bg;av.style.color=ci.txt;av.style.width='52px';av.style.height='52px';av.style.fontSize='18px';av.style.borderRadius='12px';
  document.getElementById('cv-name').textContent=cl.nome;
  const mesAtualCl=calcMesAtual(cl.dataInicio);document.getElementById('cv-meta').textContent=cl.nicho+(cl.dataInicio?' · '+fmtTempo(cl.dataInicio)+' de contrato':'');
  const{bruto,liquido}=calcMRR(cl);
  const hs=calcHealthScore(cl);const hl=healthLabel(hs);
  document.getElementById('cv-badges').innerHTML=`<div class="client-header-stats"><div class="client-stat"><div class="client-stat-val">${fmtMoney(liquido)}</div><div class="client-stat-lbl">líquido/mês</div></div><div class="client-stat"><div class="client-stat-val">Mês ${mesAtualCl}/12</div><div class="client-stat-lbl">no contrato</div></div></div><div class="client-header-badges"><span class="badge phase-badge">${cl.fase}</span>${churnBadge(cl.churn)}<span class="health-badge ${hl.cls} health-badge-lg">${hl.label} · ${hs}</span></div>`;
  const acts=document.getElementById('cv-actions');
  acts.innerHTML=mode==='admin'?`<button class="topbar-btn" onclick="openClientModal('${cl.id}')">Editar</button><button class="topbar-btn" style="color:var(--red)" onclick="deleteClient('${cl.id}')">Remover</button>`:'';
  renderOverview(cl);renderReunioes(cl);renderMetas(cl);renderActionItems(cl);renderDocumentos(cl);
}

function renderOverview(cl){
  const{bruto,comissao,custo,liquido}=calcMRR(cl);
  const doneNorm=(cl.done||[]).map(s=>s.trim().toLowerCase());
  const cpHtml=(cl.checkpoints||[]).map(cp=>{
    const done=doneNorm.includes(cp.trim().toLowerCase());
    const safeId=cl.id.replace(/"/g,'&quot;');
    const safeCp=cp.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    const clickAttr=mode==='admin'?`data-cpid="${safeId}" data-cptext="${safeCp}" onclick="toggleCheckpoint(this.dataset.cpid,this.dataset.cptext)" style="cursor:pointer;user-select:none"`:'';
    const icon=done?`<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:9px;height:9px"><polyline points="2 6 5 9 10 3"/></svg>`:'';
    return`<div class="cp-item cp-item-toggle" ${clickAttr}><div class="cp-check ${done?'cp-check-done':''}">${icon}</div><span class="${done?'cp-done-lbl':''}">${cp}</span></div>`;
  }).join('');
  const comissaoInfo=cl.indicador?`<div style="margin-top:8px;font-size:12px;color:var(--text-3)">Indicado por <strong style="color:var(--text-2)">${cl.indicador}</strong>${cl.comissaoVal?' · '+(cl.comissaoTipo==='pct'?cl.comissaoVal+'%':'R$'+cl.comissaoVal):''}</div>`:'';
  const notaHtml=cl.nota?`<div class="section-gap"><div class="mini-title">Nota interna</div><div class="note-box">${cl.nota}</div></div>`:'';
  const depoHtml=cl.depoimento?`<div class="section-gap"><div class="mini-title">Depoimento</div><div class="depo-box">"${cl.depoimento}"</div></div>`:'';
  document.getElementById('ctab-overview').innerHTML=`
    <div class="overview-grid">
      <div class="mini-card"><div class="mini-title">Checkpoints (${cl.done.length}/${cl.checkpoints.length})</div>${cpHtml||'<span style="font-size:13px;color:var(--text-3)">Nenhum checkpoint.</span>'}</div>
      <div class="mini-card"><div class="mini-title">Financeiro</div>
        <div class="kpi-row">
          <div class="kpi"><div class="kpi-val">${fmtMoney(bruto)}</div><div class="kpi-lbl">MRR bruto</div></div>
          ${comissao>0?`<div class="kpi"><div class="kpi-val red">-${fmtMoney(comissao)}</div><div class="kpi-lbl">Comissão</div></div>`:''}
          ${custo>0?`<div class="kpi"><div class="kpi-val red">-${fmtMoney(custo)}</div><div class="kpi-lbl">Custo</div></div>`:''}
          <div class="kpi"><div class="kpi-val green">${fmtMoney(liquido)}</div><div class="kpi-lbl">Líquido</div></div>
        </div>
        ${comissaoInfo}
        <div style="margin-top:14px"><div class="mini-title">Progresso no contrato</div>${mesStrip(calcMesAtual(cl.dataInicio))}${cl.dataInicio?'<div style="font-size:11px;color:var(--text-3);margin-top:6px">desde '+new Date(cl.dataInicio).toLocaleDateString('pt-BR')+' · '+fmtTempo(cl.dataInicio)+'</div>':''}</div>
      </div>
    </div>
    ${notaHtml}${depoHtml}`;
}

function renderReunioes(cl){
  const clReunioes=reunioes.filter(r=>r.clienteId===cl.id).sort((a,b)=>new Date(b.data)-new Date(a.data));
  const byWeek={};
  clReunioes.forEach(r=>{
    const d=new Date(r.data);const monday=new Date(d);monday.setDate(d.getDate()-d.getDay()+1);
    const key=monday.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
    if(!byWeek[key])byWeek[key]=[];byWeek[key].push(r);
  });
  const adminBtn=mode==='admin'?`<button class="edit-btn" onclick="openReuniaoModal('${cl.id}')">+ Adicionar reunião</button>`:'';
  let html='';
  if(Object.keys(byWeek).length===0){html='<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Nenhuma reunião ainda</div><div class="empty-sub">Registre a primeira reunião para iniciar o histórico deste cliente.</div></div>';}
  else{
    Object.entries(byWeek).forEach(([week,rs])=>{
      html+=`<div class="semana-block"><div class="semana-label">Semana de ${week}</div>`;
      rs.forEach(r=>{
        const ais=actionItems.filter(a=>a.reuniaoId===r.id);
        const chips=[r.participantes,ais.length>0?ais.length+' action items':''].filter(Boolean).map(c=>`<span class="chip">${c}</span>`).join('');
        html+=`<div class="reuniao-card" onclick="openPopup('${r.id}')">
          <div class="reuniao-icon" style="font-size:16px">📋</div>
          <div class="reuniao-info">
            <div class="reuniao-title">${r.titulo}</div>
            <div class="reuniao-sub">${new Date(r.data).toLocaleDateString('pt-BR')}${r.duracao?' · '+r.duracao:''}</div>
            <div class="chip-row">${chips}</div>
          </div><span style="font-size:18px;color:var(--text-3);margin-left:8px">›</span>
        </div>`;
      });
      html+='</div>';
    });
  }
  document.getElementById('ctab-reunioes').innerHTML=html+adminBtn;
}

function renderMetas(cl){
  const clMetas=metas.filter(m=>m.clienteId===cl.id);
  const clObjs=objetivos.filter(o=>o.clienteId===cl.id);
  const adminBtns=mode==='admin'?`<div style="display:flex;gap:8px;margin-bottom:16px"><button class="edit-btn" onclick="openMetaModal('${cl.id}')">+ Meta</button><button class="edit-btn" onclick="openObjModal('${cl.id}')">+ Objetivo</button></div>`:'';
  let metasHtml='';
  if(clMetas.length===0){metasHtml='<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">Sem metas cadastradas</div><div class="empty-sub">Defina metas mensais para acompanhar o progresso do cliente.</div></div>';}
  else{
    const byMes={};
    clMetas.forEach(m=>{if(!byMes[m.mes])byMes[m.mes]=[];byMes[m.mes].push(m);});
    Object.entries(byMes).forEach(([mes,ms])=>{
      metasHtml+=`<div class="mini-title" style="margin-bottom:10px">${mes}</div><div class="metas-grid">`;
      ms.forEach(m=>{
        const pct=m.total>0?Math.min(100,Math.round((m.progresso/m.total)*100)):0;
        const stCls=m.status==='Concluído'?'ms-ok':m.status==='Em progresso'?'ms-prog':'ms-none';
        const fillCls=m.status==='Concluído'?'':'amber';
        const editBtn=mode==='admin'?`<button onclick="openMetaModalEdit('${m.id}')" style="background:transparent;border:none;cursor:pointer;color:var(--text-3);font-size:12px;padding:2px 5px" title="Editar">✎</button>`:'';
        const rmBtn=mode==='admin'?`<button onclick="deleteMeta('${m.id}')" style="background:transparent;border:none;cursor:pointer;color:var(--text-3);font-size:11px;margin-left:4px">✕</button>`:'';
        metasHtml+=`<div class="meta-card">
          <div class="meta-header"><span class="meta-title">${m.titulo}</span><div style="display:flex;align-items:center"><span class="meta-status ${stCls}">${m.status}</span>${editBtn}${rmBtn}</div></div>
          <div class="prog-bar"><div class="prog-fill ${fillCls}" style="width:${pct}%"></div></div>
          <div class="meta-sub">${m.progresso} de ${m.total}${m.unidade?' '+m.unidade:''}</div>
        </div>`;
      });
      metasHtml+='</div>';
    });
  }
  let objsHtml='';
  if(clObjs.length>0){
    objsHtml=`<div class="mini-title" style="margin-bottom:10px;margin-top:20px">Objetivos gerais</div>`;
    clObjs.forEach(o=>{
      const editObjBtn=mode==='admin'?`<button onclick="openObjModalEdit('${o.id}')" style="background:transparent;border:none;cursor:pointer;color:var(--text-3);font-size:12px;padding:2px 5px" title="Editar">✎</button>`:'';
      const rmBtn=mode==='admin'?`<button onclick="deleteObj('${o.id}')" style="background:transparent;border:none;cursor:pointer;color:var(--text-3);font-size:11px;margin-left:4px">✕</button>`:'';
      objsHtml+=`<div class="obj-item"><div class="obj-icon">🎯</div><div class="obj-text">${o.texto}<div class="obj-sub">${o.icone||''}</div></div><div style="display:flex;align-items:center;margin-left:auto">${editObjBtn}${rmBtn}</div></div>`;
    });
  }
  document.getElementById('ctab-metas').innerHTML=adminBtns+metasHtml+objsHtml;
}

function renderActionItems(cl){
  const pending=actionItems.filter(a=>a.clienteId===cl.id&&!a.concluido);
  const done=actionItems.filter(a=>a.clienteId===cl.id&&a.concluido);
  const adminBtn=mode==='admin'?`<button class="edit-btn" onclick="openAIModal('${cl.id}')">+ Action item</button>`:'';
  function aiHtml(a){
    const checkEl=mode==='admin'?`<div class="ai-check ${a.concluido?'done':''}" onclick="toggleAI('${a.id}')">${a.concluido?'✓':''}</div>`:`<div class="ai-check ${a.concluido?'done':''}">${a.concluido?'✓':''}</div>`;
    const editBtn=mode==='admin'?`<button onclick="openAIModalEdit('${a.id}')" style="background:transparent;border:none;cursor:pointer;color:var(--text-3);font-size:12px;padding:2px 5px" title="Editar">✎</button>`:'';
    const rmBtn=mode==='admin'?`<button onclick="deleteAI('${a.id}')" style="background:transparent;border:none;cursor:pointer;color:var(--text-3);font-size:11px">✕</button>`:'';
    const resolvedResp=a.responsavel==='Cliente'?(clients.find(c=>c.id===a.clienteId)?.nome||'Cliente'):a.responsavel;
    const prazoDisplay=a.dataPrazo?new Date(a.dataPrazo).toLocaleDateString('pt-BR'):(a.prazo||'Sem prazo');
    return`<div class="ai-item">${checkEl}<div class="ai-info"><div class="ai-text ${a.concluido?'done':''}" style="white-space:pre-wrap">${a.texto}</div><div class="ai-meta">${prazoDisplay}${a.reuniaoId&&a.reuniaoId!=='undefined'?' · reunião vinculada':''}</div></div>${ownerTag(resolvedResp)}${editBtn}${rmBtn}</div>`;
  }
  let html=adminBtn;
  if(pending.length>0){html+=`<div class="ai-section-title" style="margin-top:16px">Pendentes (${pending.length})</div>`+pending.map(aiHtml).join('');}
  if(done.length>0){html+=`<div class="ai-section-title" style="margin-top:16px">Concluídos</div>`+done.map(aiHtml).join('');}
  if(pending.length===0&&done.length===0){html+='<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-title">Tudo em dia</div><div class="empty-sub">Nenhuma tarefa pendente para este cliente.</div></div>';}
  document.getElementById('ctab-actions').innerHTML=html;
}

// ── POPUP REUNIÃO ──
function openPopup(reuniaoId){
  const r=reunioes.find(x=>x.id===reuniaoId);if(!r)return;
  const ais=actionItems.filter(a=>a.reuniaoId===reuniaoId);
  const pontosHtml=(r.pontos||[]).map(p=>`<div class="popup-bullet"><div class="bullet-dot bullet-blue"></div><span>${p}</span></div>`).join('');
  const aisHtml=ais.map(a=>{
    const resp=a.responsavel==='Cliente'?(clients.find(c=>c.id===a.clienteId)?.nome||'Cliente'):a.responsavel;
    return`<div class="popup-bullet"><div class="bullet-dot bullet-green"></div><span><strong style="font-weight:500">${resp}</strong> — ${a.texto}</span></div>`;
  }).join('');
  document.getElementById('popup-content').innerHTML=`
    <div class="popup-header">
      <div><div class="popup-title">${r.titulo}</div><div class="popup-sub">${new Date(r.data).toLocaleDateString('pt-BR')}${r.duracao?' · '+r.duracao:''}${r.participantes?' · '+r.participantes:''}</div></div>
      <div style="display:flex;gap:6px;align-items:center">
        ${mode==='admin'?`<button class="topbar-btn" style="font-size:12px;padding:6px 12px" onclick="closePopup();openReuniaoModalEdit('${r.id}')">Editar</button>`:''}
        <button class="popup-close" onclick="closePopup()">✕</button>
      </div>
    </div>
    <div class="popup-body">
      ${r.resumo?`<div class="popup-section"><div class="popup-section-title">Resumo</div><div class="popup-text">${r.resumo}</div></div>`:''}
      ${pontosHtml?`<div class="popup-section"><div class="popup-section-title">Pontos discutidos</div>${pontosHtml}</div>`:''}
      ${aisHtml?`<div class="popup-section"><div class="popup-section-title">Action items</div>${aisHtml}</div>`:''}
    </div>`;
  document.getElementById('popup-overlay').classList.add('show');
}
function closePopup(){document.getElementById('popup-overlay').classList.remove('show');}

// ── REUNIÕES CALENDAR VIEW ──
let reunioesViewDate=new Date();

function renderReunioesView(){
  const year=reunioesViewDate.getFullYear(),month=reunioesViewDate.getMonth();
  const monthReunioes=reunioes.filter(r=>{
    if(!r.data)return false;const d=new Date(r.data);
    return d.getFullYear()===year&&d.getMonth()===month;
  }).sort((a,b)=>new Date(b.data)-new Date(a.data));
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const t=new Date();const ty=t.getFullYear(),tm=t.getMonth(),td=t.getDate();
  const meetDays=new Set(monthReunioes.map(r=>new Date(r.data).getDate()));
  let calHtml='<div class="cal-grid">';
  ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d=>{calHtml+=`<div class="cal-day-hdr">${d}</div>`;});
  for(let i=0;i<firstDay;i++) calHtml+='<div class="cal-cell"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const isToday=ty===year&&tm===month&&td===d;
    const hasMt=meetDays.has(d);
    calHtml+=`<div class="cal-cell${isToday?' cal-today':''}${hasMt?' cal-has-meeting':''}"${hasMt?` onclick="filterReunioesByDay(${d})"`:''}>`;
    calHtml+=`<div class="cal-day-num">${d}</div>`;
    if(hasMt) calHtml+='<div class="cal-dot"></div>';
    calHtml+='</div>';
  }
  calHtml+='</div>';
  const mLabel=new Date(year,month,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  document.getElementById('reunioes-nav-month').textContent=mLabel.charAt(0).toUpperCase()+mLabel.slice(1);
  document.getElementById('reunioes-cal').innerHTML=calHtml;
  const addBtn=document.getElementById('reunioes-add-btn');
  if(addBtn) addBtn.style.display=mode==='admin'?'inline-flex':'none';
  renderReunioesList(monthReunioes,false);
}

function filterReunioesByDay(day){
  const year=reunioesViewDate.getFullYear(),month=reunioesViewDate.getMonth();
  const dayReunioes=reunioes.filter(r=>{
    if(!r.data)return false;const d=new Date(r.data);
    return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()===day;
  });
  renderReunioesList(dayReunioes,true);
}

function renderReunioesList(items,filtered){
  const listEl=document.getElementById('reunioes-list');if(!listEl)return;
  if(!items.length){listEl.innerHTML='<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">'+(filtered?'Nenhuma reunião neste dia':'Nenhuma reunião neste mês')+'</div><div class="empty-sub">Use o botão Nova reunião para adicionar.</div></div>';return;}
  const byWeek={};
  items.forEach(r=>{
    const d=new Date(r.data);const day=d.getDay();
    const mon=new Date(d);mon.setDate(d.getDate()-(day===0?6:day-1));
    const key=mon.toISOString().split('T')[0];
    if(!byWeek[key])byWeek[key]=[];byWeek[key].push(r);
  });
  let html=filtered?`<div style="margin-bottom:12px"><button class="filter-btn active" style="font-size:11.5px" onclick="renderReunioesView()">← Ver mês completo</button></div>`:'';
  Object.entries(byWeek).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([key,rs])=>{
    const mon=new Date(key+'T12:00:00');
    const wLabel=mon.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
    html+=`<div class="semana-block"><div class="semana-label">Semana de ${wLabel}</div>`;
    rs.forEach(r=>{
      const cl=clients.find(c=>c.id===r.clienteId);
      const ais=actionItems.filter(a=>a.reuniaoId===r.id);
      const chips=[cl?cl.nome:null,r.participantes||null,ais.length>0?ais.length+' action items':null].filter(Boolean).map(c=>`<span class="chip">${c}</span>`).join('');
      html+=`<div class="reuniao-card" onclick="openPopup('${r.id}')">
        <div class="reuniao-icon" style="font-size:16px">📋</div>
        <div class="reuniao-info">
          <div class="reuniao-title">${r.titulo}${cl?` <span style="font-size:11px;color:var(--text-3);font-weight:400">· ${cl.nome}</span>`:''}</div>
          <div class="reuniao-sub">${new Date(r.data).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'})}${r.duracao?' · '+r.duracao:''}</div>
          <div class="chip-row">${chips}</div>
        </div>
        <span style="font-size:18px;color:var(--text-3);margin-left:8px">›</span>
      </div>`;
    });
    html+='</div>';
  });
  listEl.innerHTML=html;
}

function reunioesNavMonth(dir){
  reunioesViewDate=new Date(reunioesViewDate.getFullYear(),reunioesViewDate.getMonth()+dir,1);
  renderReunioesView();
}

// ── DOCUMENTOS ──
function renderDocumentos(cl){
  const clDocs=documentos.filter(d=>d.clienteId===cl.id);
  const adminBtn=mode==='admin'?`<button class="edit-btn" onclick="openDocModal('${cl.id}')">+ Documento</button>`:'';
  if(clDocs.length===0){
    document.getElementById('ctab-documentos').innerHTML=adminBtn+'<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-title">Sem documentos</div><div class="empty-sub">Faça upload de briefings, contratos, gravações e outros arquivos.</div></div>';
    return;
  }
  const order=['briefing','contrato','qbr','apresentacao','gravacao','outro'];
  const byTipo={};
  clDocs.forEach(d=>{const t=d.tipo||'outro';(byTipo[t]=byTipo[t]||[]).push(d);});
  let html=adminBtn;
  order.forEach(t=>{
    if(!byTipo[t])return;
    html+=`<div class="mini-title" style="margin-top:16px">${docTipoLabel(t)}</div>`;
    byTipo[t].sort((a,b)=>(b.uploadedAt||'').localeCompare(a.uploadedAt||''));
    byTipo[t].forEach(d=>{
      const rmBtn=mode==='admin'?`<button class="doc-rm" onclick="event.stopPropagation();deleteDoc('${d.id}')" title="Remover">✕</button>`:'';
      const dt=d.uploadedAt?new Date(d.uploadedAt).toLocaleDateString('pt-BR'):'';
      const meta=[formatBytes(d.tamanho),dt].filter(Boolean).join(' · ');
      html+=`<div class="doc-item" onclick="window.open('${d.url}','_blank','noopener')">
        <div class="doc-icon">${docIcon(t)}</div>
        <div class="doc-info">
          <div class="doc-name">${d.nome}</div>
          <div class="doc-meta">${meta}</div>
        </div>
        <span class="doc-arrow">↗</span>
        ${rmBtn}
      </div>`;
    });
  });
  document.getElementById('ctab-documentos').innerHTML=html;
}
