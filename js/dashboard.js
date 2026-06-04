// Dashboard Selenior — KPIs, gráficos, safra, sinais de alerta e action items.

let phaseChart=null, respChart=null, actionsFilter='todos';

function activeClients(){return clients.filter(c=>(c.status||'ativo')==='ativo');}

function renderDashboard(){
  if(!document.getElementById('view-dashboard')) return;
  renderDashHeader();
  renderKPIs();
  renderPhaseChart();
  renderRespChart();
  renderCohortTable();
  renderAlerts();
}

function renderDashHeader(){
  const now=new Date();
  const fmt=now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  document.getElementById('dash-sub').textContent='Atualizado em '+fmt;
}

function renderKPIs(){
  const ativos=activeClients();
  const churned=clients.filter(c=>c.status==='churned');
  let mrrB=0,mrrL=0;
  ativos.forEach(cl=>{const{bruto,liquido}=calcMRR(cl);mrrB+=bruto;mrrL+=liquido;});
  const riscoAlto=ativos.filter(c=>c.churn==='alto').length;
  const pctRisco=ativos.length?Math.round(riscoAlto/ativos.length*100):0;
  document.getElementById('kpi-ativos').textContent=ativos.length;
  document.getElementById('kpi-ativos-sub').textContent=churned.length?'+'+churned.length+' churned histórico':'nenhum churn registrado';
  document.getElementById('kpi-mrr-bruto').textContent=fmtMoney(mrrB);
  document.getElementById('kpi-mrr-liquido').textContent=fmtMoney(mrrL);
  document.getElementById('kpi-mrr-liquido-sub').textContent=mrrB>mrrL?'-'+fmtMoney(mrrB-mrrL)+' em comissões':'';
  document.getElementById('kpi-risco').textContent=riscoAlto;
  document.getElementById('kpi-risco-sub').textContent=ativos.length?pctRisco+'% da base ativa':'';
}

const FASE_COLORS={Onboarding:'#17395D','Otimização':'#876A0E',Escala:'#2D6A4F','Consolidação':'#6E5A51','Aceleração':'#375560'};
const FASES=['Onboarding','Otimização','Escala','Consolidação','Aceleração'];

function renderPhaseChart(){
  const counts=FASES.map(f=>activeClients().filter(c=>c.fase===f).length);
  const ctx=document.getElementById('chart-phase');
  if(!ctx) return;
  if(phaseChart) phaseChart.destroy();
  phaseChart=new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:FASES,
      datasets:[{data:counts,backgroundColor:FASES.map(f=>FASE_COLORS[f]),borderColor:'#FFFFFF',borderWidth:2}]
    },
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'62%',
      plugins:{
        legend:{position:'right',labels:{font:{family:'DM Sans',size:11.5},color:'#5A6873',padding:12,boxWidth:10,boxHeight:10,usePointStyle:true,pointStyle:'circle'}},
        tooltip:{backgroundColor:'#1A232B',titleFont:{family:'DM Sans',size:12},bodyFont:{family:'DM Sans',size:12},padding:10,cornerRadius:8,displayColors:false}
      }
    }
  });
}

function renderRespChart(){
  const labels=['Leo','João Pedro','Clientes'];
  const colors=['#17395D','#6E5A51','#2D6A4F'];
  const keys=['Leo','João Pedro','Cliente'];
  const counts=keys.map(r=>actionItems.filter(a=>!a.concluido&&a.responsavel===r).length);
  const ctx=document.getElementById('chart-resp');
  if(!ctx) return;
  if(respChart) respChart.destroy();
  respChart=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[{data:counts,backgroundColor:colors,borderRadius:6,maxBarThickness:32}]},
    options:{
      responsive:true,maintainAspectRatio:false,indexAxis:'y',
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#1A232B',titleFont:{family:'DM Sans',size:12},bodyFont:{family:'DM Sans',size:12},padding:10,cornerRadius:8,displayColors:false}},
      scales:{
        x:{grid:{color:'rgba(26,35,43,0.06)'},border:{display:false},ticks:{color:'#5A6873',font:{family:'DM Sans',size:11.5},precision:0}},
        y:{grid:{display:false},border:{display:false},ticks:{color:'#1A232B',font:{family:'DM Sans',size:12,weight:'500'}}}
      }
    }
  });
}

function renderCohortTable(){
  const byMonth={};
  clients.forEach(cl=>{
    if(!cl.dataInicio) return;
    const d=new Date(cl.dataInicio);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    (byMonth[key]=byMonth[key]||[]).push(cl);
  });
  const sortedKeys=Object.keys(byMonth).sort();
  const wrap=document.getElementById('cohort-table-wrap');
  if(!sortedKeys.length){
    wrap.innerHTML='<div class="empty-state">Nenhum cliente com data de início definida ainda.</div>';
    return;
  }
  let html='<table class="cohort-table"><thead><tr>';
  html+='<th>Safra</th><th>Total</th>';
  FASES.forEach(f=>html+='<th title="'+f+'">'+f.slice(0,4)+'</th>');
  html+='<th class="cohort-churn-col">Churn</th><th>MRR ativo</th></tr></thead><tbody>';
  let totals={total:0,fases:FASES.map(()=>0),churn:0,mrr:0};
  sortedKeys.forEach(k=>{
    const safra=byMonth[k];
    const date=new Date(k+'-01');
    const label=date.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','');
    const total=safra.length;
    const counts=FASES.map(f=>safra.filter(c=>(c.status||'ativo')==='ativo'&&c.fase===f).length);
    const churn=safra.filter(c=>c.status==='churned').length;
    const mrr=safra.filter(c=>(c.status||'ativo')==='ativo').reduce((s,c)=>s+calcMRR(c).liquido,0);
    totals.total+=total;counts.forEach((v,i)=>totals.fases[i]+=v);totals.churn+=churn;totals.mrr+=mrr;
    html+='<tr>';
    html+='<td class="cohort-label">'+label+'</td>';
    html+='<td class="cohort-count cohort-cell'+(total>0?' has-val':'')+'"'+(total>0?' onclick="openSafraPopup(\''+k+'\',\'__all__\')"':'')+'>'+total+'</td>';
    counts.forEach((c,i)=>{const f=FASES[i];html+='<td class="cohort-cell'+(c>0?' has-val':'')+'"'+(c>0?' onclick="openSafraPopup(\''+k+'\',\''+f+'\')"':'')+'>'+(c||'')+'</td>';});
    html+='<td class="cohort-churn'+(churn>0?' has-val':'')+'"'+(churn>0?' onclick="openSafraPopup(\''+k+'\',\'__churn__\')"':'')+'>'+(churn||'')+'</td>';
    html+='<td class="cohort-mrr">'+(mrr?fmtMoney(mrr):'—')+'</td>';
    html+='</tr>';
  });
  html+='<tr class="cohort-totals"><td>Total</td><td>'+totals.total+'</td>';
  totals.fases.forEach(c=>html+='<td>'+(c||'')+'</td>');
  html+='<td class="cohort-churn-col">'+(totals.churn||'')+'</td>';
  html+='<td>'+(totals.mrr?fmtMoney(totals.mrr):'—')+'</td></tr>';
  html+='</tbody></table>';
  wrap.innerHTML=html;
}

function renderAlerts(){
  const ativos=activeClients();
  const now=new Date();
  const LIMIT_DAYS=30;
  const alerts=[];
  ativos.forEach(cl=>{
    const reasons=[];
    if(cl.churn==='alto') reasons.push({label:'Risco alto',cls:'alert-tag-red'});
    const clMeetings=reunioes.filter(r=>r.clienteId===cl.id);
    if(clMeetings.length===0){
      if(cl.dataInicio){
        const daysSinceStart=Math.floor((now-new Date(cl.dataInicio))/(1000*60*60*24));
        if(daysSinceStart>15) reasons.push({label:'Sem reuniões registradas',cls:'alert-tag-amber'});
      }
    }else{
      const latest=clMeetings.reduce((max,m)=>new Date(m.data)>new Date(max.data)?m:max);
      const days=Math.floor((now-new Date(latest.data))/(1000*60*60*24));
      if(days>LIMIT_DAYS) reasons.push({label:days+' dias sem reunião',cls:'alert-tag-amber'});
    }
    if(reasons.length) alerts.push({cl,reasons});
  });
  const wrap=document.getElementById('alerts-list');
  if(!alerts.length){
    wrap.innerHTML='<div class="empty-state">Nenhum sinal de alerta. ✓</div>';
    return;
  }
  alerts.sort((a,b)=>b.reasons.length-a.reasons.length);
  wrap.innerHTML=alerts.map(({cl,reasons})=>{
    const idx=clients.indexOf(cl);const ci=colorFor(idx);
    const tags=reasons.map(r=>'<span class="alert-tag '+r.cls+'">'+r.label+'</span>').join('');
    return '<div class="alert-row" onclick="openClientView(\''+cl.id+'\')">'
      +'<div class="avatar" style="background:'+ci.bg+';color:'+ci.txt+'">'+initials(cl.nome)+'</div>'
      +'<div class="alert-info"><div class="alert-name">'+cl.nome+'</div><div class="alert-tags">'+tags+'</div></div>'
      +'<span style="font-size:16px;color:var(--text-3)">›</span></div>';
  }).join('');
}

// Drill-down: clica numa célula da safra → lista os clientes daquela coorte+categoria.
function openSafraPopup(monthKey,category){
  const date=new Date(monthKey+'-01');
  const monthLabel=date.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const isChurn=category==='__churn__';
  const isAll=category==='__all__';
  const categoryLabel=isChurn?'Churned':isAll?'Todos os clientes':category;
  const matching=clients.filter(cl=>{
    if(!cl.dataInicio) return false;
    const d=new Date(cl.dataInicio);
    const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    if(k!==monthKey) return false;
    if(isAll) return true;
    if(isChurn) return cl.status==='churned';
    return (cl.status||'ativo')==='ativo'&&cl.fase===category;
  });
  matching.sort((a,b)=>a.nome.localeCompare(b.nome));
  const items=matching.map(cl=>{
    const idx=clients.indexOf(cl);const ci=colorFor(idx);
    const status=cl.status||'ativo';
    let detail;
    if(status==='churned'){
      detail=cl.dataFim?'Saiu em '+new Date(cl.dataFim).toLocaleDateString('pt-BR'):'Sem data de saída';
    }else{
      const liquido=calcMRR(cl).liquido;
      detail=fmtMoney(liquido)+'/mês · '+cl.fase+(status==='pausado'?' · Pausado':'');
    }
    return '<div class="popup-client-row" onclick="closePopup();openClientView(\''+cl.id+'\')">'
      +'<div class="avatar" style="background:'+ci.bg+';color:'+ci.txt+'">'+initials(cl.nome)+'</div>'
      +'<div class="popup-client-info"><div class="popup-client-name">'+cl.nome+'</div><div class="popup-client-meta">'+detail+'</div></div>'
      +'<span style="font-size:14px;color:var(--text-3)">›</span></div>';
  }).join('');
  document.getElementById('popup-content').innerHTML=
    '<div class="popup-header">'
    +'<div><div class="popup-title">Safra '+monthLabel+' — '+categoryLabel+'</div>'
    +'<div class="popup-sub">'+matching.length+' cliente'+(matching.length===1?'':'s')+'</div></div>'
    +'<button class="popup-close" onclick="closePopup()">✕</button>'
    +'</div>'
    +'<div class="popup-body">'+(items||'<div class="empty-state">Sem clientes nesta categoria.</div>')+'</div>';
  document.getElementById('popup-overlay').classList.add('show');
}

// ── ACTION ITEMS (Dashboard) ──
function setActionsFilter(f,btn){
  actionsFilter=f;
  document.querySelectorAll('#view-actions .filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderActionsPage();
}

function renderActionsPage(){
  const showDone=document.getElementById('show-done')?.checked||false;
  let items=actionItems.filter(a=>{
    if(actionsFilter!=='todos'&&a.responsavel!==actionsFilter) return false;
    if(!showDone&&a.concluido) return false;
    return true;
  });
  const today=new Date();today.setHours(0,0,0,0);
  const tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
  const weekEnd=new Date(today);weekEnd.setDate(weekEnd.getDate()+7);
  const buckets={atrasados:[],hoje:[],amanha:[],semana:[],futuro:[],semData:[],concluidos:[]};
  items.forEach(a=>{
    if(a.concluido){buckets.concluidos.push(a);return;}
    if(!a.dataPrazo){buckets.semData.push(a);return;}
    const dp=new Date(a.dataPrazo);dp.setHours(0,0,0,0);
    if(dp<today) buckets.atrasados.push(a);
    else if(dp.getTime()===today.getTime()) buckets.hoje.push(a);
    else if(dp.getTime()===tomorrow.getTime()) buckets.amanha.push(a);
    else if(dp<weekEnd) buckets.semana.push(a);
    else buckets.futuro.push(a);
  });
  ['atrasados','hoje','amanha','semana','futuro'].forEach(k=>{
    buckets[k].sort((a,b)=>new Date(a.dataPrazo)-new Date(b.dataPrazo));
  });
  const sections=[
    ['atrasados','Atrasados','overdue'],
    ['hoje','Hoje','today'],
    ['amanha','Amanhã',''],
    ['semana','Esta semana',''],
    ['futuro','Próximos',''],
    ['semData','Sem prazo','']
  ];
  if(showDone) sections.push(['concluidos','Concluídos','done']);
  let html='';
  sections.forEach(([key,label,cls])=>{
    const arr=buckets[key];
    if(arr.length===0) return;
    html+='<div class="actions-section">'
      +'<div class="actions-section-title '+cls+'">'+label+' <span class="actions-count">'+arr.length+'</span></div>'
      +arr.map(renderActionRow).join('')
      +'</div>';
  });
  if(!html) html='<div class="empty-state">Nenhum action item nessas condições.</div>';
  document.getElementById('actions-list').innerHTML=html;
}

function renderActionRow(a){
  const cl=clients.find(c=>c.id===a.clienteId);
  const clienteNome=cl?cl.nome:'—';
  const resp=a.responsavel==='Cliente'?clienteNome:a.responsavel;
  let dataLabel='',dataCls='';
  if(a.dataPrazo){
    const dp=new Date(a.dataPrazo);const today=new Date();today.setHours(0,0,0,0);dp.setHours(0,0,0,0);
    const diff=Math.round((dp-today)/(1000*60*60*24));
    if(diff<0){dataLabel=Math.abs(diff)+'d atrás';dataCls='date-overdue';}
    else if(diff===0){dataLabel='Hoje';dataCls='date-today';}
    else if(diff===1){dataLabel='Amanhã';dataCls='date-soon';}
    else{dataLabel=dp.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');}
  }
  const check=mode==='admin'
    ?`<div class="ai-check ${a.concluido?'done':''}" onclick="event.stopPropagation();toggleAI('${a.id}')">${a.concluido?'✓':''}</div>`
    :`<div class="ai-check ${a.concluido?'done':''}">${a.concluido?'✓':''}</div>`;
  const idx=cl?clients.indexOf(cl):0;
  const ci=colorFor(idx);
  const avatarMini=cl?`<div class="avatar-mini" style="background:${ci.bg};color:${ci.txt}" title="${cl.nome}">${initials(cl.nome)}</div>`:'';
  return `<div class="actions-row" onclick="openClientView('${a.clienteId}')">
    ${check}
    <div class="actions-info">
      <div class="actions-text ${a.concluido?'done':''}" style="white-space:pre-wrap">${a.texto}</div>
      <div class="actions-meta">${avatarMini}<span class="actions-cliente">${clienteNome}</span></div>
    </div>
    ${ownerTag(resp)}
    ${dataLabel?`<span class="actions-date ${dataCls}">${dataLabel}</span>`:'<span class="actions-date date-none">—</span>'}
  </div>`;
}
