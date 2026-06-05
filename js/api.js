// Camada de API: hash, fetch wrappers, sync e mappers de dados.

async function sha256(s){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function setSyncStatus(state,label){document.getElementById('sync-dot').className='sync-dot '+state;document.getElementById('sync-label').textContent=label;}
function showToast(msg,isErr=false){const t=document.getElementById('toast');const icon=isErr?'<span style="font-size:15px;line-height:1;flex-shrink:0">✕</span>':'<span style="font-size:15px;line-height:1;flex-shrink:0">✓</span>';t.innerHTML=icon+'<span>'+msg+'</span>';t.className='toast'+(isErr?' err':'')+' show';setTimeout(()=>{t.className='toast'+(isErr?' err':'');},2500);}

function applyData(d){
  clients=(d.Clientes||[]).filter(r=>r[0]&&r[1]).map(rowToClient);
  reunioes=(d.Reunioes||[]).filter(r=>r[0]).map(rowToReuniao);
  metas=(d.Metas||[]).filter(r=>r[0]).map(rowToMeta);
  objetivos=(d.Objetivos||[]).filter(r=>r[0]).map(rowToObj);
  actionItems=(d.ActionItems||[]).filter(r=>r[0]).map(rowToAI);
  documentos=(d.Documentos||[]).filter(r=>r[0]).map(rowToDoc);
  renderAll();
  if(currentClientId) renderClientView(currentClientId);
}

function readFileAsBase64(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{const r=reader.result;resolve(r.split(',')[1]);};
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function loadData(){
  if(!authHash){handleUnauthorized();return;}
  setSyncStatus('syncing','Sincronizando...');
  try{
    const res=await fetch(SCRIPT_URL+'?auth='+authHash);
    const json=await res.json();
    if(!json.ok){
      if(json.error==='unauthorized'){handleUnauthorized();return;}
      throw new Error(json.error||'Erro no script');
    }
    applyData(json.data);
    setSyncStatus('ok','Atualizado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){setSyncStatus('error','Erro ao sincronizar');showToast('Erro ao carregar dados',true);}
}

async function apiPost_(body){
  if(!authHash) throw new Error('unauthorized');
  const res=await fetch(SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(Object.assign({auth:authHash},body))});
  const json=await res.json();
  if(!json.ok){
    if(json.error==='unauthorized'){handleUnauthorized();}
    throw new Error(json.error||'Erro');
  }
  return json;
}
async function upsertRow(sheetName, row){return apiPost_({action:'upsert', sheetName, row});}
async function deleteRow(sheetName, id){return apiPost_({action:'delete', sheetName, id});}

// Sheets pode retornar datas como ISO datetime ("2024-01-15T00:00:00.000Z"); normaliza para YYYY-MM-DD.
function normalizeSheetDate(v){const m=String(v||'').match(/^(\d{4}-\d{2}-\d{2})/);return m?m[1]:'';}

// Mappers — Clientes: id|nome|nicho|fase|churn|dataInicio|mrr|indicador|comissaoVal|comissaoTipo|checkpoints|done|nota|depoimento|status|dataFim|custo
function clientToRow(cl){return[cl.id,cl.nome,cl.nicho,cl.fase,cl.churn,cl.dataInicio||'',cl.mrr||'0',cl.indicador||'',cl.comissaoVal||'',cl.comissaoTipo||'pct',(cl.checkpoints||[]).join('||'),(cl.done||[]).join('||'),cl.nota||'',cl.depoimento||'',cl.status||'ativo',cl.dataFim||'',cl.custo||'0'];}
function rowToClient(r){return{id:String(r[0]),nome:r[1]||'',nicho:r[2]||'',fase:r[3]||'Onboarding',churn:r[4]||'baixo',dataInicio:normalizeSheetDate(r[5]),mrr:String(r[6]||'0'),indicador:r[7]||'',comissaoVal:r[8]||'',comissaoTipo:r[9]||'pct',checkpoints:r[10]?String(r[10]).split('||').filter(Boolean):[],done:r[11]?String(r[11]).split('||').filter(Boolean):[],nota:r[12]||'',depoimento:r[13]||'',status:r[14]||'ativo',dataFim:normalizeSheetDate(r[15]),custo:String(r[16]||'0')};}

// Mappers — Reunioes: id|clienteId|data|titulo|duracao|participantes|resumo|pontos|actionItemIds
function reuniaoToRow(r){return[r.id,r.clienteId,r.data,r.titulo,r.duracao||'',r.participantes||'',r.resumo||'',(r.pontos||[]).join('||'),r.actionItemIds||''];}
function rowToReuniao(r){return{id:String(r[0]),clienteId:String(r[1]),data:r[2]||'',titulo:r[3]||'',duracao:r[4]||'',participantes:r[5]||'',resumo:r[6]||'',pontos:r[7]?String(r[7]).split('||').filter(Boolean):[],actionItemIds:r[8]||''};}

// Mappers — Metas: id|clienteId|mes|titulo|status|progresso|total|unidade
function metaToRow(m){return[m.id,m.clienteId,m.mes,m.titulo,m.status,m.progresso,m.total,m.unidade||''];}
function rowToMeta(r){return{id:String(r[0]),clienteId:String(r[1]),mes:r[2]||'',titulo:r[3]||'',status:r[4]||'Não iniciado',progresso:parseFloat(r[5])||0,total:parseFloat(r[6])||100,unidade:r[7]||''};}

// Mappers — Objetivos: id|clienteId|texto|icone
function objToRow(o){return[o.id,o.clienteId,o.texto,o.icone||''];}
function rowToObj(r){return{id:String(r[0]),clienteId:String(r[1]),texto:r[2]||'',icone:r[3]||''};}

// Mappers — ActionItems: id|clienteId|reuniaoId|texto|responsavel|prazo|concluido|dataPrazo
function aiToRow(a){return[a.id,a.clienteId,a.reuniaoId||'',a.texto,a.responsavel||'',a.prazo||'',a.concluido?'1':'0',a.dataPrazo||''];}
function rowToAI(r){return{id:String(r[0]),clienteId:String(r[1]),reuniaoId:String(r[2]||''),texto:r[3]||'',responsavel:r[4]||'',prazo:r[5]||'',concluido:String(r[6])==='1',dataPrazo:r[7]||''};}

// Mappers — Documentos: id|clienteId|tipo|nome|driveFileId|url|tamanho|uploadedAt
function docToRow(d){return[d.id,d.clienteId,d.tipo||'outro',d.nome,d.driveFileId||'',d.url||'',d.tamanho||0,d.uploadedAt||''];}
function rowToDoc(r){return{id:String(r[0]),clienteId:String(r[1]),tipo:r[2]||'outro',nome:r[3]||'',driveFileId:r[4]||'',url:r[5]||'',tamanho:parseInt(r[6])||0,uploadedAt:r[7]||''};}
