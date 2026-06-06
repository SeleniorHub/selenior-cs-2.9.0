// Dashboard Selenior — KPIs, gráficos, safra, sinais de alerta e action items.

let phaseChart=null, mrrEvolutionChart=null, financialChart=null, churnChart=null, actionsFilter='todos';

function activeClients(){return clients.filter(c=>(c.status||'ativo')==='ativo');}

function renderDashboard(){
  if(!document.getElementById('view-dashboard')) return;
  // Limpa skeleton dos charts antes de renderizar (canvas foi escondido, não destruído)
  document.querySelectorAll('.chart-canvas .skel-chart-ov').forEach(s=>s.remove());
  document.querySelectorAll('.chart-canvas canvas').forEach(cv=>cv.style.display='');
  document.querySelectorAll('.chart-canvas .chart-empty').forEach(s=>s.remove());
  renderDashHeader();
  renderBriefing();
  renderKPIs();
  renderPhaseChart();
  renderMRREvolution();
  renderCohortTable();
  renderFinancialSection();
  renderChurnSection();
  renderEngagementHeatmap();
  renderAlerts();
}

function renderBriefing(){
  const el=document.getElementById('briefing-card');if(!el)return;
  const now=new Date();
  const hour=now.getHours();
  const isBatman=document.documentElement.getAttribute('data-theme')==='batman';
  const greeting=isBatman?'Good evening, sir':(hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite');
  const todayStr=now.toISOString().split('T')[0];
  const dateLabel=now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
  const today=new Date(now);today.setHours(0,0,0,0);

  // ── Reuniões de hoje ──
  const todayMeetings=reunioes.filter(r=>r.data===todayStr);
  let meetHtml='';
  if(!todayMeetings.length){
    meetHtml='<div class="briefing-empty">Sem reuniões hoje ☀️</div>';
  }else{
    meetHtml=todayMeetings.map(r=>{
      const cl=clients.find(c=>c.id===r.clienteId);
      return`<div class="briefing-item" onclick="openPopup('${r.id}')">
        <div class="briefing-dot briefing-dot-blue"></div>
        <div><div class="briefing-item-text">${r.titulo}</div>
        <div class="briefing-item-sub">${cl?cl.nome:''}${r.duracao?' · '+r.duracao:''}</div></div>
      </div>`;
    }).join('');
  }

  // ── Action items urgentes (vencidos + hoje) ──
  const urgentAI=actionItems.filter(a=>{
    if(a.concluido||!a.dataPrazo)return false;
    const dp=new Date(a.dataPrazo);dp.setHours(0,0,0,0);
    return dp<=today;
  }).sort((a,b)=>new Date(a.dataPrazo)-new Date(b.dataPrazo)).slice(0,5);
  let aiHtml='';
  if(!urgentAI.length){
    aiHtml='<div class="briefing-empty">Nada urgente no momento ✓</div>';
  }else{
    aiHtml=urgentAI.map(a=>{
      const cl=clients.find(c=>c.id===a.clienteId);
      const dp=new Date(a.dataPrazo);dp.setHours(0,0,0,0);
      const diff=Math.round((dp-today)/(1000*60*60*24));
      const dLabel=diff===0?'Hoje':Math.abs(diff)+'d de atraso';
      const isOverdue=diff<0;
      const shortText=a.texto.split('\n')[0].substring(0,55)+(a.texto.length>55?'…':'');
      return`<div class="briefing-item" onclick="openClientViewTab('${a.clienteId}','actions')">
        <div class="briefing-dot ${isOverdue?'briefing-dot-red':'briefing-dot-amber'}"></div>
        <div><div class="briefing-item-text">${shortText}</div>
        <div class="briefing-item-sub">${cl?cl.nome:''} · ${dLabel}</div></div>
      </div>`;
    }).join('');
  }

  // ── Clientes em zona de risco (health < 31) ──
  const atRisk=activeClients()
    .map(cl=>({cl,hs:calcHealthScore(cl)}))
    .filter(x=>x.hs<31)
    .sort((a,b)=>a.hs-b.hs)
    .slice(0,4);
  let riskHtml='';
  if(!atRisk.length){
    riskHtml='<div class="briefing-empty">Todos os clientes saudáveis ✓</div>';
  }else{
    riskHtml=atRisk.map(({cl,hs})=>{
      const hl=healthLabel(hs);
      return`<div class="briefing-item" onclick="openClientView('${cl.id}')">
        <div class="briefing-dot briefing-dot-red"></div>
        <div><div class="briefing-item-text">${cl.nome}</div>
        <div class="briefing-item-sub"><span class="health-badge ${hl.cls}" style="font-size:10px;padding:2px 7px">${hs}</span> · ${cl.nicho}</div></div>
      </div>`;
    }).join('');
  }

  const countBadge=n=>n>0?`<span class="actions-count">${n}</span>`:'';
  el.innerHTML=`
    <div class="briefing-header">
      <div class="briefing-greeting">${greeting} — <span style="text-transform:capitalize">${dateLabel}</span></div>
      <div class="briefing-time">${now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
    </div>
    <div class="briefing-cols">
      <div class="briefing-col">
        <div class="briefing-col-title">📋 Reuniões hoje ${countBadge(todayMeetings.length)}</div>
        ${todayMeetings.length>0?`<div class="briefing-big">${todayMeetings.length}</div>`:''}
        ${meetHtml}
      </div>
      <div class="briefing-col">
        <div class="briefing-col-title">⚡ Urgente ${countBadge(urgentAI.length)}</div>
        ${urgentAI.length>0?`<div class="briefing-big briefing-big-amber">${urgentAI.length}</div>`:''}
        ${aiHtml}
      </div>
      <div class="briefing-col">
        <div class="briefing-col-title">🔴 Atenção ${countBadge(atRisk.length)}</div>
        ${atRisk.length>0?`<div class="briefing-big briefing-big-red">${atRisk.length}</div>`:''}
        ${riskHtml}
      </div>
    </div>`;
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
  document.getElementById('kpi-ativos-sub').innerHTML=churned.length?`<span style="color:var(--red)">↓ ${churned.length} churned</span> histórico`:'nenhum churn registrado';
  document.getElementById('kpi-mrr-bruto').textContent=fmtMoney(mrrB);
  document.getElementById('kpi-mrr-liquido').textContent=fmtMoney(mrrL);
  const pctLiquido=mrrB>0?Math.round(mrrL/mrrB*100):100;
  document.getElementById('kpi-mrr-liquido-sub').innerHTML=mrrB>mrrL?`<span style="color:var(--text-3)">-${fmtMoney(mrrB-mrrL)}</span> em deduções · ${pctLiquido}% do bruto`:'sem deduções';
  document.getElementById('kpi-risco').textContent=riscoAlto;
  document.getElementById('kpi-risco-sub').innerHTML=ativos.length?`<span style="${riscoAlto>0?'color:var(--red)':'color:var(--green)'}">${pctRisco}%</span> da base ativa`:'';
  const riscoCard=document.getElementById('kpi-risco')?.closest('.metric');
  if(riscoCard) riscoCard.classList.toggle('metric-danger',riscoAlto>0);
  const liquidoCard=document.getElementById('kpi-mrr-liquido')?.closest('.metric');
  if(liquidoCard) liquidoCard.classList.add('metric-success');
}

const FASES=['Onboarding','Otimização','Escala','Consolidação','Aceleração'];

function getChartTheme(){
  const t=document.documentElement.getAttribute('data-theme')||'light';
  const text=t==='batman'?'#8A6D35':t==='dark'?'#8B949E':'#5A6873';
  const grid=t==='batman'?'rgba(200,168,75,0.06)':t==='dark'?'rgba(240,246,252,0.07)':'rgba(26,35,43,0.05)';
  const tooltip=t==='batman'?'#0C0C10':t==='dark'?'#21262D':'#1A232B';
  const border=t==='dark'?'#21262D':t==='batman'?'#0C0C10':'#FFFFFF';
  const phases={
    light:['#2A6BE8','#E8881A','#22936A','#8055C8','#D94545'],
    dark:['#60A5FA','#FBBF24','#34D399','#A78BFA','#F87171'],
    batman:['#C8A84B','#8A6D35','#6B7A4A','#5A5A6E','#8A4A3A']
  };
  return{text,grid,tooltip,border,phases:phases[t]||phases.light};
}

function renderPhaseChart(){
  const ativos=activeClients();
  const counts=FASES.map(f=>ativos.filter(c=>c.fase===f).length);
  const total=ativos.length;
  const ctx=document.getElementById('chart-phase');
  if(!ctx) return;
  if(phaseChart) phaseChart.destroy();
  const ct=getChartTheme();
  const centerPlugin={
    id:'phaseCenter',
    afterDraw(chart){
      const{ctx:c,chartArea:{left,top,width,height}}=chart;
      c.save();c.textAlign='center';c.textBaseline='middle';
      const cx=left+width/2,cy=top+height/2;
      c.font='600 24px "Clash Display",sans-serif';
      c.fillStyle=ct.text;c.fillText(total,cx,cy-9);
      c.font='500 11px "Clash Display",sans-serif';
      c.globalAlpha=0.45;c.fillText('ativos',cx,cy+12);
      c.restore();
    }
  };
  phaseChart=new Chart(ctx,{
    type:'doughnut',
    data:{labels:FASES,datasets:[{data:counts,backgroundColor:ct.phases,borderColor:ct.border,borderWidth:2}]},
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'65%',
      onClick:(evt,elements)=>{
        if(!elements.length)return;
        const fase=FASES[elements[0].index];
        if(!counts[elements[0].index])return;
        showMainView('clientes',null);
        const btn=[...document.querySelectorAll('#view-list .filter-btn')].find(b=>b.textContent===fase);
        if(btn)setFilter(fase,btn);
      },
      plugins:{
        legend:{position:'right',labels:{font:{family:'Clash Display',size:11.5},color:ct.text,padding:14,boxWidth:8,boxHeight:8,usePointStyle:true,pointStyle:'circle',filter:(item)=>counts[item.index]>0}},
        tooltip:{backgroundColor:ct.tooltip,titleFont:{family:'Clash Display',size:12},bodyFont:{family:'Clash Display',size:12},padding:10,cornerRadius:8,displayColors:true,callbacks:{label:(item)=>` ${item.label}: ${item.raw} cliente${item.raw===1?'':'s'} — clique para filtrar`}}
      }
    },
    plugins:[centerPlugin]
  });
}


function renderMRREvolution(){
  const canvas=document.getElementById('chart-mrr-evolution');if(!canvas)return;
  if(mrrEvolutionChart)mrrEvolutionChart.destroy();
  const ct=getChartTheme();
  const t=document.documentElement.getAttribute('data-theme')||'light';
  const lc=t==='batman'?'#C8A84B':t==='dark'?'#60A5FA':'#17395D';
  const newC=t==='batman'?'rgba(107,122,74,0.75)':t==='dark'?'rgba(52,211,153,0.75)':'rgba(45,106,79,0.75)';
  const churnC=t==='batman'?'rgba(138,74,58,0.75)':t==='dark'?'rgba(248,113,113,0.75)':'rgba(139,42,46,0.75)';

  // Build monthly data: prefer historicoMRR, fallback reconstruct from clients
  const monthMap={};
  if(historicoMRR.length){
    historicoMRR.forEach(h=>{monthMap[h.mes]=(monthMap[h.mes]||0)+h.mrr;});
  }else{
    const now=new Date();
    for(let i=11;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      const dEnd=new Date(d.getFullYear(),d.getMonth()+1,0);
      let tot=0;
      clients.forEach(cl=>{
        if(!cl.dataInicio)return;
        const s=new Date(cl.dataInicio);const e=cl.dataFim?new Date(cl.dataFim):null;
        if(s<=dEnd&&(!e||e>=d))tot+=parseMoney(cl.mrr);
      });
      if(tot>0)monthMap[key]=tot;
    }
  }
  const months=Object.keys(monthMap).sort();
  if(!months.length){
    canvas.style.display='none';
    const wrap=canvas.closest('.chart-canvas');
    if(wrap&&!wrap.querySelector('.chart-empty')){
      const d=document.createElement('div');d.className='chart-empty';
      d.style.cssText='height:200px;display:flex;align-items:center;justify-content:center;padding:20px';
      d.innerHTML='<div class="empty-title" style="text-align:center">Adicione registros em Histórico MRR para ver a evolução</div>';
      wrap.appendChild(d);
    }
    return;
  }

  // New MRR per month (clients starting that month)
  const newMRR=months.map(m=>{
    let n=0;
    if(historicoMRR.length){
      const clientFirst={};
      historicoMRR.forEach(h=>{if(!clientFirst[h.clienteId]||h.mes<clientFirst[h.clienteId])clientFirst[h.clienteId]=h.mes;});
      Object.entries(clientFirst).forEach(([cid,first])=>{
        if(first===m)n+=historicoMRR.filter(h=>h.clienteId===cid&&h.mes===m).reduce((s,h)=>s+h.mrr,0);
      });
    }else{
      clients.forEach(cl=>{if(cl.dataInicio&&cl.dataInicio.substring(0,7)===m)n+=parseMoney(cl.mrr);});
    }
    return n;
  });

  // Churn MRR per month (negative, for display below zero)
  const churnMRR=months.map(m=>{
    let c=0;
    clients.forEach(cl=>{if(cl.status==='churned'&&cl.dataFim&&cl.dataFim.substring(0,7)===m)c+=parseMoney(cl.mrr);});
    return c>0?-c:null;
  });

  const labels=months.map(m=>{const[y,mo]=m.split('-');return new Date(parseInt(y),parseInt(mo)-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','');});

  const gradPlugin={
    id:'mrrEvolGrad',
    beforeRender(chart){
      const{ctx:c,chartArea:ca}=chart;if(!ca)return;
      const g=c.createLinearGradient(0,ca.top,0,ca.bottom);
      if(t==='batman'){g.addColorStop(0,'rgba(200,168,75,0.18)');g.addColorStop(1,'rgba(200,168,75,0)');}
      else if(t==='dark'){g.addColorStop(0,'rgba(96,165,250,0.18)');g.addColorStop(1,'rgba(96,165,250,0)');}
      else{g.addColorStop(0,'rgba(23,57,93,0.14)');g.addColorStop(1,'rgba(23,57,93,0)');}
      chart.data.datasets[0].backgroundColor=g;
    }
  };

  mrrEvolutionChart=new Chart(canvas,{
    data:{
      labels,
      datasets:[
        {type:'line',label:'MRR Total',data:months.map(m=>monthMap[m]||0),borderColor:lc,backgroundColor:'transparent',fill:true,tension:0.35,pointBackgroundColor:lc,pointBorderColor:ct.border,pointBorderWidth:2,pointRadius:4,pointHoverRadius:8,borderWidth:2.5,order:0,yAxisID:'y'},
        {type:'bar',label:'Novos',data:newMRR,backgroundColor:newC,borderRadius:4,order:1,yAxisID:'y',barPercentage:0.55},
        {type:'bar',label:'Churn',data:churnMRR,backgroundColor:churnC,borderRadius:4,order:1,yAxisID:'y',barPercentage:0.55}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{position:'top',labels:{font:{family:'Clash Display',size:11.5},color:ct.text,padding:16,usePointStyle:true,pointStyle:'circle',boxWidth:8,boxHeight:8}},
        tooltip:{
          backgroundColor:ct.tooltip,titleFont:{family:'Clash Display',size:12},bodyFont:{family:'Clash Display',size:12},padding:12,cornerRadius:8,
          callbacks:{label:(item)=>`  ${item.dataset.label}: ${fmtMoney(Math.abs(item.raw||0))}/mês`}
        }
      },
      scales:{
        x:{grid:{color:ct.grid},border:{display:false},ticks:{color:ct.text,font:{family:'Clash Display',size:11.5}}},
        y:{grid:{color:ct.grid},border:{display:false},ticks:{color:ct.text,font:{family:'Clash Display',size:11.5},callback:(v)=>fmtMoney(Math.abs(v))}}
      }
    },
    plugins:[gradPlugin]
  });
}

function renderFinancialSection(){
  const ativos=activeClients();
  let totalBruto=0,totalCusto=0,totalComissao=0;
  ativos.forEach(cl=>{const{bruto,custo,comissao}=calcMRR(cl);totalBruto+=bruto;totalCusto+=custo;totalComissao+=comissao;});
  const totalDed=totalCusto+totalComissao;
  const margem=totalBruto-totalDed;
  const pct=totalBruto>0?Math.round(margem/totalBruto*100):0;
  const kpisEl=document.getElementById('fin-kpis');
  if(kpisEl){
    kpisEl.innerHTML=`
      <div class="fin-kpi"><div class="fin-kpi-val">${fmtMoney(totalBruto)}</div><div class="fin-kpi-lbl">Receita bruta</div></div>
      <div class="fin-kpi"><div class="fin-kpi-val" style="color:var(--red)">-${fmtMoney(totalDed)}</div><div class="fin-kpi-lbl">Custos + comissões</div></div>
      <div class="fin-kpi"><div class="fin-kpi-val" style="color:var(--green)">${fmtMoney(margem)}</div><div class="fin-kpi-lbl">Margem bruta</div></div>
      <div class="fin-kpi"><div class="fin-kpi-val" style="color:${pct>=70?'var(--green)':pct>=50?'var(--amber)':'var(--red)'}">${pct}%</div><div class="fin-kpi-lbl">% margem</div></div>`;
  }
  const canvas=document.getElementById('chart-financial');
  if(!canvas||!ativos.length)return;
  if(financialChart)financialChart.destroy();
  const ct=getChartTheme();
  const t=document.documentElement.getAttribute('data-theme')||'light';
  const sorted=[...ativos].sort((a,b)=>calcMRR(b).bruto-calcMRR(a).bruto);
  const liqC=t==='batman'?'rgba(200,168,75,0.85)':t==='dark'?'rgba(96,165,250,0.85)':'rgba(23,57,93,0.85)';
  const comC=t==='batman'?'rgba(138,109,53,0.75)':t==='dark'?'rgba(251,191,36,0.75)':'rgba(196,148,23,0.75)';
  const cusC=t==='batman'?'rgba(138,74,58,0.75)':t==='dark'?'rgba(248,113,113,0.75)':'rgba(139,42,46,0.75)';
  financialChart=new Chart(canvas,{
    type:'bar',
    data:{
      labels:sorted.map(cl=>cl.nome.split(' ')[0]),
      datasets:[
        {label:'Líquido',data:sorted.map(cl=>calcMRR(cl).liquido),backgroundColor:liqC,borderRadius:4,stack:'s'},
        {label:'Comissão',data:sorted.map(cl=>calcMRR(cl).comissao),backgroundColor:comC,borderRadius:0,stack:'s'},
        {label:'Custo',data:sorted.map(cl=>calcMRR(cl).custo),backgroundColor:cusC,borderRadius:0,stack:'s'}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      onClick:(evt,els)=>{if(!els.length)return;openClientView(sorted[els[0].index].id);},
      plugins:{
        legend:{position:'top',labels:{font:{family:'Clash Display',size:11.5},color:ct.text,padding:14,usePointStyle:true,pointStyle:'circle',boxWidth:8,boxHeight:8}},
        tooltip:{backgroundColor:ct.tooltip,titleFont:{family:'Clash Display',size:12},bodyFont:{family:'Clash Display',size:12},padding:10,cornerRadius:8,callbacks:{label:(item)=>`  ${item.dataset.label}: ${fmtMoney(item.raw)}`}}
      },
      scales:{
        x:{grid:{color:ct.grid},border:{display:false},ticks:{color:ct.text,font:{family:'Clash Display',size:11.5}},stacked:true},
        y:{grid:{color:ct.grid},border:{display:false},ticks:{color:ct.text,font:{family:'Clash Display',size:11.5},callback:(v)=>fmtMoney(v)},stacked:true}
      }
    }
  });
}

function renderChurnSection(){
  const churned=clients.filter(c=>c.status==='churned');
  const kpisEl=document.getElementById('churn-kpis');
  if(!churned.length){
    if(kpisEl)kpisEl.innerHTML='<div style="font-size:13px;color:var(--text-3);padding:8px 0">Nenhum churn registrado. ✓</div>';
    const canvas=document.getElementById('chart-churn');
    if(canvas){const w=canvas.closest('.chart-canvas');if(w)w.style.display='none';}
    return;
  }
  const canvas=document.getElementById('chart-churn');
  if(canvas){const w=canvas.closest('.chart-canvas');if(w)w.style.display='';}
  const totalMRRLost=churned.reduce((s,c)=>s+parseMoney(c.mrr),0);
  const withDates=churned.filter(c=>c.dataInicio&&c.dataFim);
  const avgDur=withDates.length?Math.round(withDates.reduce((s,c)=>{
    const ms=((new Date(c.dataFim).getFullYear()-new Date(c.dataInicio).getFullYear())*12)+(new Date(c.dataFim).getMonth()-new Date(c.dataInicio).getMonth());
    return s+Math.max(1,ms);
  },0)/withDates.length):null;
  if(kpisEl){
    kpisEl.innerHTML=`
      <div class="fin-kpi"><div class="fin-kpi-val">${churned.length}</div><div class="fin-kpi-lbl">Total churned</div></div>
      <div class="fin-kpi"><div class="fin-kpi-val" style="color:var(--red)">-${fmtMoney(totalMRRLost)}</div><div class="fin-kpi-lbl">MRR perdido</div></div>
      <div class="fin-kpi"><div class="fin-kpi-val">${avgDur?avgDur+'m':'—'}</div><div class="fin-kpi-lbl">Duração média</div></div>`;
  }
  if(!canvas)return;
  if(churnChart)churnChart.destroy();
  const byMonth={};
  churned.forEach(cl=>{
    if(!cl.dataFim)return;
    const k=cl.dataFim.substring(0,7);
    if(!byMonth[k])byMonth[k]={count:0,mrr:0};
    byMonth[k].count++;byMonth[k].mrr+=parseMoney(cl.mrr);
  });
  const months=Object.keys(byMonth).sort();
  const labels=months.map(m=>{const[y,mo]=m.split('-');return new Date(parseInt(y),parseInt(mo)-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','');});
  const ct=getChartTheme();
  const t=document.documentElement.getAttribute('data-theme')||'light';
  const barC=t==='batman'?'rgba(138,74,58,0.8)':t==='dark'?'rgba(248,113,113,0.8)':'rgba(139,42,46,0.8)';
  churnChart=new Chart(canvas,{
    type:'bar',
    data:{labels,datasets:[{label:'Churns',data:months.map(m=>byMonth[m].count),backgroundColor:barC,borderRadius:5}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:ct.tooltip,titleFont:{family:'Clash Display',size:12},bodyFont:{family:'Clash Display',size:12},padding:10,cornerRadius:8,
          callbacks:{label:(item)=>`  ${item.raw} cliente${item.raw===1?'':'s'} · ${fmtMoney(byMonth[months[item.dataIndex]].mrr)} perdidos`}
        }
      },
      scales:{
        x:{grid:{color:ct.grid},border:{display:false},ticks:{color:ct.text,font:{family:'Clash Display',size:11.5}}},
        y:{grid:{color:ct.grid},border:{display:false},ticks:{color:ct.text,font:{family:'Clash Display',size:11.5},stepSize:1}}
      }
    }
  });
}

function renderEngagementHeatmap(){
  const el=document.getElementById('engagement-heatmap');if(!el)return;
  const ativos=activeClients();
  if(!ativos.length){el.innerHTML='<div class="empty-state">Sem clientes ativos.</div>';return;}
  const now=new Date();
  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
  }
  const labels=months.map(m=>{const[y,mo]=m.split('-');return new Date(parseInt(y),parseInt(mo)-1,1).toLocaleDateString('pt-BR',{month:'short'}).replace('.','');});
  const t=document.documentElement.getAttribute('data-theme')||'light';
  const baseRGB=t==='batman'?'200,168,75':t==='dark'?'96,165,250':'23,57,93';
  const data=ativos.map(cl=>({cl,counts:months.map(m=>reunioes.filter(r=>r.clienteId===cl.id&&r.data&&r.data.substring(0,7)===m).length)}));
  data.sort((a,b)=>b.counts.reduce((s,c)=>s+c,0)-a.counts.reduce((s,c)=>s+c,0));
  const max=Math.max(...data.flatMap(d=>d.counts),1);
  const t2=document.documentElement.getAttribute('data-theme')||'light';
  const surfRGB=t2==='batman'?'12,12,16':t2==='dark'?'13,17,23':'243,243,238';
  let html=`<div class="heatmap-wrap"><div class="heatmap-header"><div class="heatmap-row-label"></div>${labels.map(l=>`<div class="heatmap-col-label">${l}</div>`).join('')}</div>`;
  data.forEach(({cl,counts})=>{
    html+=`<div class="heatmap-row" onclick="openClientView('${cl.id}')"><div class="heatmap-row-label" title="${cl.nome}">${cl.nome.split(' ')[0]}</div>`;
    counts.forEach(c=>{
      const alpha=c===0?0:0.12+Math.min(1,c/max)*0.75;
      const bg=c===0?`rgb(${surfRGB})`:`rgba(${baseRGB},${alpha.toFixed(2)})`;
      html+=`<div class="heatmap-cell" title="${c} reunião${c===1?'':'ões'}" style="background:${bg}">${c||''}</div>`;
    });
    html+='</div>';
  });
  html+='</div>';
  el.innerHTML=html;
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
  const now=new Date();const today=new Date(now);today.setHours(0,0,0,0);
  const LIMIT_DAYS=30;
  const alerts=[];
  ativos.forEach(cl=>{
    const reasons=[];let needsMeeting=false,hasOverdueAI=false;
    if(cl.churn==='alto'){reasons.push({label:'Risco alto',cls:'alert-tag-red'});needsMeeting=true;}
    const clMeetings=reunioes.filter(r=>r.clienteId===cl.id);
    if(clMeetings.length===0){
      if(cl.dataInicio){
        const daysSinceStart=Math.floor((now-new Date(cl.dataInicio))/(1000*60*60*24));
        if(daysSinceStart>15){reasons.push({label:'Sem reuniões registradas',cls:'alert-tag-amber'});needsMeeting=true;}
      }
    }else{
      const latest=clMeetings.reduce((max,m)=>new Date(m.data)>new Date(max.data)?m:max);
      const days=Math.floor((now-new Date(latest.data))/(1000*60*60*24));
      if(days>LIMIT_DAYS){reasons.push({label:days+' dias sem reunião',cls:'alert-tag-amber'});needsMeeting=true;}
    }
    const overdue=actionItems.filter(a=>a.clienteId===cl.id&&!a.concluido&&a.dataPrazo&&new Date(a.dataPrazo)<today).length;
    if(overdue>0){
      reasons.push({label:overdue+' ação'+(overdue>1?'ões':'')+(overdue>1?' vencidas':' vencida'),cls:'alert-tag-red'});
      hasOverdueAI=true;
    }
    if(reasons.length) alerts.push({cl,reasons,needsMeeting,hasOverdueAI});
  });
  const wrap=document.getElementById('alerts-list');
  if(!alerts.length){wrap.innerHTML='<div class="empty-state">Nenhum sinal de alerta. ✓</div>';return;}
  alerts.sort((a,b)=>{
    const hsA=calcHealthScore(a.cl),hsB=calcHealthScore(b.cl);
    if(b.reasons.length!==a.reasons.length) return b.reasons.length-a.reasons.length;
    return hsA-hsB;
  });
  wrap.innerHTML=alerts.map(({cl,reasons,needsMeeting,hasOverdueAI})=>{
    const idx=clients.indexOf(cl);const ci=colorFor(idx);
    const hs=calcHealthScore(cl);const hl=healthLabel(hs);
    const tags=reasons.map(r=>'<span class="alert-tag '+r.cls+'">'+r.label+'</span>').join('')
      +'<span class="health-badge '+hl.cls+'" style="margin-left:4px">'+hs+'</span>';
    let actionBtns='';
    if(mode==='admin'){
      if(needsMeeting) actionBtns+=`<button class="alert-action-btn" onclick="event.stopPropagation();openReuniaoModal('${cl.id}')">+ Reunião</button>`;
      if(hasOverdueAI) actionBtns+=`<button class="alert-action-btn" onclick="event.stopPropagation();openClientViewTab('${cl.id}','actions')">Ver ações</button>`;
    }
    return '<div class="alert-row" onclick="openClientView(\''+cl.id+'\')">'
      +'<div class="avatar" style="background:'+ci.bg+';color:'+ci.txt+'">'+initials(cl.nome)+'</div>'
      +'<div class="alert-info"><div class="alert-name">'+cl.nome+'</div><div class="alert-tags">'+tags+'</div></div>'
      +(actionBtns?'<div class="alert-actions">'+actionBtns+'</div>':'')
      +'</div>';
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
  let dataLabel='',dataCls='',urgencyCls='';
  if(!a.concluido&&a.dataPrazo){const _dp=new Date(a.dataPrazo);const _td=new Date();_td.setHours(0,0,0,0);_dp.setHours(0,0,0,0);if(_dp<_td)urgencyCls=' actions-row-overdue';else if(_dp.getTime()===_td.getTime())urgencyCls=' actions-row-today';}
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
  const editBtn=mode==='admin'?`<button onclick="event.stopPropagation();openAIModalEdit('${a.id}')" style="background:transparent;border:none;cursor:pointer;color:var(--text-3);font-size:12px;padding:2px 6px;flex-shrink:0" title="Editar">✎</button>`:'';
  return `<div class="actions-row${urgencyCls}" onclick="openClientView('${a.clienteId}')">
    ${check}
    <div class="actions-info">
      <div class="actions-text ${a.concluido?'done':''}" style="white-space:pre-wrap">${a.texto}</div>
      <div class="actions-meta">${avatarMini}<span class="actions-cliente">${clienteNome}</span></div>
    </div>
    ${ownerTag(resp)}
    ${editBtn}
    ${dataLabel?`<span class="actions-date ${dataCls}">${dataLabel}</span>`:'<span class="actions-date date-none">—</span>'}
  </div>`;
}
