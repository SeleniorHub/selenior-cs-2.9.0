// CRUD via modais: clientes, reuniões, metas, objetivos e action items.

// ── MODAL CLIENTE ──
function openClientModal(id=null){
  editingClientId=id;
  const cl=id?clients.find(c=>c.id===id):null;
  document.getElementById('mc-title').textContent=id?'Editar cliente':'Novo cliente';
  document.getElementById('mc-nome').value=cl?cl.nome:'';
  document.getElementById('mc-nicho').value=cl?cl.nicho:'';
  document.getElementById('mc-fase').value=cl?cl.fase:'Onboarding';
  document.getElementById('mc-churn').value=cl?cl.churn:'baixo';
  document.getElementById('mc-data-inicio').value=cl?cl.dataInicio:'';
  document.getElementById('mc-mrr').value=cl?cl.mrr:'';
  document.getElementById('mc-indicador').value=cl?cl.indicador:'';
  document.getElementById('mc-comissao-val').value=cl?cl.comissaoVal:'';
  document.getElementById('mc-comissao-tipo').value=cl?cl.comissaoTipo:'pct';
  document.getElementById('mc-checkpoints').value=cl?(cl.checkpoints||[]).join('\n'):'';
  document.getElementById('mc-done').value=cl?(cl.done||[]).join('\n'):'';
  document.getElementById('mc-nota').value=cl?cl.nota:'';
  document.getElementById('mc-depo').value=cl?cl.depoimento:'';
  document.getElementById('modal-client').classList.add('open');
}
function closeClientModal(){document.getElementById('modal-client').classList.remove('open');}

async function saveClient(){
  const nome=document.getElementById('mc-nome').value.trim();
  if(!nome){showToast('Preencha o nome.',true);return;}
  const cl={id:editingClientId||String(Date.now()),nome,nicho:document.getElementById('mc-nicho').value.trim(),fase:document.getElementById('mc-fase').value,churn:document.getElementById('mc-churn').value,dataInicio:document.getElementById('mc-data-inicio').value,mrr:document.getElementById('mc-mrr').value.trim(),indicador:document.getElementById('mc-indicador').value.trim(),comissaoVal:document.getElementById('mc-comissao-val').value.trim(),comissaoTipo:document.getElementById('mc-comissao-tipo').value,checkpoints:document.getElementById('mc-checkpoints').value.split('\n').map(s=>s.trim()).filter(Boolean),done:document.getElementById('mc-done').value.split('\n').map(s=>s.trim()).filter(Boolean),nota:document.getElementById('mc-nota').value.trim(),depoimento:document.getElementById('mc-depo').value.trim()};
  if(editingClientId){const i=clients.findIndex(c=>c.id===editingClientId);if(i>=0)clients[i]=cl;else clients.push(cl);}else clients.push(cl);
  closeClientModal();renderAll();if(currentClientId===editingClientId)renderClientView(editingClientId);
  setSyncStatus('syncing','Salvando...');
  try{await upsertRow('Clientes',clientToRow(cl));setSyncStatus('ok','Salvo');showToast('Salvo com sucesso.');setTimeout(loadData,1500);}
  catch(e){setSyncStatus('error','Erro');showToast('Erro ao salvar',true);}
}

async function deleteClient(id){
  if(!confirm('Remover este cliente?'))return;
  clients=clients.filter(c=>c.id!==id);goBack();renderAll();
  try{await deleteRow('Clientes',id);showToast('Removido.');}catch(e){showToast('Erro ao remover',true);}
}

// ── MODAL REUNIÃO ──
function openReuniaoModal(clienteId){
  editingReuniaoId=null;
  document.getElementById('mr-titulo').value='';document.getElementById('mr-data').value=new Date().toISOString().split('T')[0];
  document.getElementById('mr-duracao').value='';document.getElementById('mr-participantes').value='';
  document.getElementById('mr-resumo').value='';document.getElementById('mr-pontos').value='';
  document.getElementById('mr-title').textContent='Nova reunião';
  document.getElementById('mr-title').dataset.clienteId=clienteId;
  document.getElementById('modal-reuniao').classList.add('open');
}
function closeReuniaoModal(){document.getElementById('modal-reuniao').classList.remove('open');}

async function saveReuniao(){
  const titulo=document.getElementById('mr-titulo').value.trim();if(!titulo){showToast('Preencha o título.',true);return;}
  const clienteId=document.getElementById('mr-title').dataset.clienteId;
  const r={id:editingReuniaoId||String(Date.now()),clienteId,data:document.getElementById('mr-data').value,titulo,duracao:document.getElementById('mr-duracao').value.trim(),participantes:document.getElementById('mr-participantes').value.trim(),resumo:document.getElementById('mr-resumo').value.trim(),pontos:document.getElementById('mr-pontos').value.split('\n').map(s=>s.trim()).filter(Boolean),actionItemIds:''};
  if(editingReuniaoId){const i=reunioes.findIndex(x=>x.id===editingReuniaoId);if(i>=0)reunioes[i]=r;else reunioes.push(r);}else reunioes.push(r);
  closeReuniaoModal();renderClientView(clienteId);
  try{await upsertRow('Reunioes',reuniaoToRow(r));showToast('Reunião salva.');setTimeout(loadData,1500);}catch(e){showToast('Erro ao salvar',true);}
}

// ── MODAL META ──
function openMetaModal(clienteId){
  editingMetaId=null;
  document.getElementById('mm-titulo').value='';document.getElementById('mm-mes').value='';
  document.getElementById('mm-status').value='Não iniciado';document.getElementById('mm-progresso').value=0;
  document.getElementById('mm-total').value=100;document.getElementById('mm-unidade').value='';
  document.getElementById('mm-title').textContent='Nova meta';
  document.getElementById('mm-title').dataset.clienteId=clienteId;
  document.getElementById('modal-meta').classList.add('open');
}
function closeMetaModal(){document.getElementById('modal-meta').classList.remove('open');}

async function saveMeta(){
  const titulo=document.getElementById('mm-titulo').value.trim();if(!titulo){showToast('Preencha o título.',true);return;}
  const clienteId=document.getElementById('mm-title').dataset.clienteId;
  const m={id:editingMetaId||String(Date.now()),clienteId,mes:document.getElementById('mm-mes').value.trim(),titulo,status:document.getElementById('mm-status').value,progresso:parseFloat(document.getElementById('mm-progresso').value)||0,total:parseFloat(document.getElementById('mm-total').value)||100,unidade:document.getElementById('mm-unidade').value.trim()};
  if(editingMetaId){const i=metas.findIndex(x=>x.id===editingMetaId);if(i>=0)metas[i]=m;else metas.push(m);}else metas.push(m);
  closeMetaModal();renderClientView(clienteId);
  try{await upsertRow('Metas',metaToRow(m));showToast('Meta salva.');setTimeout(loadData,1500);}catch(e){showToast('Erro ao salvar',true);}
}

async function deleteMeta(id){
  const m=metas.find(x=>x.id===id);if(!m)return;
  metas=metas.filter(x=>x.id!==id);renderClientView(m.clienteId);
  try{await deleteRow('Metas',id);showToast('Meta removida.');}catch(e){showToast('Erro',true);}
}

// ── MODAL OBJETIVO ──
function openObjModal(clienteId){
  document.getElementById('mo-texto').value='';document.getElementById('mo-icone').value='';
  document.getElementById('modal-obj').dataset.clienteId=clienteId;
  document.getElementById('modal-obj').classList.add('open');
}
function closeObjModal(){document.getElementById('modal-obj').classList.remove('open');}

async function saveObj(){
  const texto=document.getElementById('mo-texto').value.trim();if(!texto){showToast('Preencha a descrição.',true);return;}
  const clienteId=document.getElementById('modal-obj').dataset.clienteId;
  const o={id:String(Date.now()),clienteId,texto,icone:document.getElementById('mo-icone').value.trim()};
  objetivos.push(o);closeObjModal();renderClientView(clienteId);
  try{await upsertRow('Objetivos',objToRow(o));showToast('Objetivo salvo.');setTimeout(loadData,1500);}catch(e){showToast('Erro ao salvar',true);}
}

async function deleteObj(id){
  const o=objetivos.find(x=>x.id===id);if(!o)return;
  objetivos=objetivos.filter(x=>x.id!==id);renderClientView(o.clienteId);
  try{await deleteRow('Objetivos',id);showToast('Removido.');}catch(e){showToast('Erro',true);}
}

// ── MODAL ACTION ITEM ──
function openAIModal(clienteId){
  document.getElementById('ai-texto').value='';document.getElementById('ai-resp').value='Leo';
  document.getElementById('ai-prazo').value='';
  const sel=document.getElementById('ai-reuniao');
  sel.innerHTML='<option value="">Nenhuma</option>';
  reunioes.filter(r=>r.clienteId===clienteId).forEach(r=>{sel.innerHTML+=`<option value="${r.id}">${r.titulo} (${new Date(r.data).toLocaleDateString('pt-BR')})</option>`;});
  document.getElementById('modal-ai').dataset.clienteId=clienteId;
  document.getElementById('modal-ai').classList.add('open');
}
function closeAIModal(){document.getElementById('modal-ai').classList.remove('open');}

async function saveAI(){
  const texto=document.getElementById('ai-texto').value.trim();if(!texto){showToast('Preencha a descrição.',true);return;}
  const clienteId=document.getElementById('modal-ai').dataset.clienteId;
  const a={id:String(Date.now()),clienteId,reuniaoId:document.getElementById('ai-reuniao').value||'',texto,responsavel:document.getElementById('ai-resp').value,prazo:document.getElementById('ai-prazo').value.trim(),concluido:false};
  actionItems.push(a);closeAIModal();renderClientView(clienteId);
  try{await upsertRow('ActionItems',aiToRow(a));showToast('Action item salvo.');setTimeout(loadData,1500);}catch(e){showToast('Erro ao salvar',true);}
}

async function toggleAI(id){
  const a=actionItems.find(x=>x.id===id);if(!a)return;
  a.concluido=!a.concluido;renderClientView(a.clienteId);
  try{await upsertRow('ActionItems',aiToRow(a));showToast(a.concluido?'Concluído!':'Reaberto.');}catch(e){showToast('Erro',true);}
}

async function deleteAI(id){
  const a=actionItems.find(x=>x.id===id);if(!a)return;
  actionItems=actionItems.filter(x=>x.id!==id);renderClientView(a.clienteId);
  try{await deleteRow('ActionItems',id);showToast('Removido.');}catch(e){showToast('Erro',true);}
}

// ── MODAL DOCUMENTO ──
function openDocModal(clienteId){
  document.getElementById('md-tipo').value='briefing';
  document.getElementById('md-nome').value='';
  document.getElementById('md-file').value='';
  document.getElementById('modal-doc').dataset.clienteId=clienteId;
  document.getElementById('modal-doc').classList.add('open');
}
function closeDocModal(){document.getElementById('modal-doc').classList.remove('open');}

// Auto-preenche o nome com o filename quando o arquivo é selecionado.
document.addEventListener('change',e=>{
  if(e.target&&e.target.id==='md-file'&&e.target.files[0]){
    const nomeInput=document.getElementById('md-nome');
    if(!nomeInput.value.trim()) nomeInput.value=e.target.files[0].name;
  }
});

async function saveDoc(){
  const fileInput=document.getElementById('md-file');
  const file=fileInput.files[0];
  if(!file){showToast('Selecione um arquivo.',true);return;}
  const clienteId=document.getElementById('modal-doc').dataset.clienteId;
  const tipo=document.getElementById('md-tipo').value;
  const nome=document.getElementById('md-nome').value.trim()||file.name;
  const btn=document.getElementById('md-save-btn');
  btn.disabled=true;btn.textContent='Enviando...';
  setSyncStatus('syncing','Enviando '+nome+'...');
  try{
    const base64=await readFileAsBase64(file);
    await apiPost_({action:'uploadDoc',clienteId,tipo,nome,mimeType:file.type||'application/octet-stream',base64});
    closeDocModal();
    showToast('Documento salvo.');
    await loadData();
  }catch(e){
    showToast('Erro ao enviar: '+(e.message||''),true);
    setSyncStatus('error','Erro');
  }finally{
    btn.disabled=false;btn.textContent='Upload';
  }
}

async function deleteDoc(id){
  if(!confirm('Remover este documento? O arquivo no Drive vai pra lixeira.'))return;
  const d=documentos.find(x=>x.id===id);if(!d)return;
  documentos=documentos.filter(x=>x.id!==id);renderClientView(d.clienteId);
  try{await apiPost_({action:'deleteDoc',id});showToast('Removido.');}catch(e){showToast('Erro ao remover',true);}
}
