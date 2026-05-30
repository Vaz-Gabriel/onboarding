/* ============================================================
   ONBOARDING LINX V18 — Sistema Completo de Gestão
   ============================================================ */

// ---- STATE ----
let analysts = [];
let trilhaCourses = [];
let trainings = [];
let users = [];
let feedbacks = [];
let agendaItems = [];
let grupos = [];
let currentUser = null;
let deleteTarget = null;
let deleteTargetType = null;
let editTarget = null;
let feedbackEditId = null;
let primeiroAcessoEmail = null;

const STATUS_OPTIONS = ['Em andamento', 'Concluído'];
const FRENTE_OPTIONS = ['Reta', 'PDV', 'Reta e PDV'];
const TRILHA_STATUS = ['Não feito', 'Feito'];

// ---- THEME ----
function initTheme() { applyTheme(localStorage.getItem('onb_theme') || 'dark'); }
function toggleTheme() { const t = document.body.classList.contains('light-mode') ? 'dark' : 'light'; applyTheme(t); localStorage.setItem('onb_theme', t); }
function applyTheme(t) { if(t==='light'){ document.body.classList.add('light-mode'); } else { document.body.classList.remove('light-mode'); } }

// ---- AUTENTICAÇÃO ----
function switchAuthScreen(screen) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('primeiroAcessoScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'none';
  
  if(screen === 'login') {
    document.getElementById('loginScreen').style.display = 'flex';
  } else if(screen === 'primeiro-acesso') {
    document.getElementById('primeiroAcessoScreen').style.display = 'flex';
  } else if(screen === 'app') {
    document.getElementById('appScreen').style.display = 'flex';
  }
  
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('primeiroAcessoError1').classList.add('hidden');
  document.getElementById('primeiroAcessoError2').classList.add('hidden');
}

async function doLogin() {
  const e = document.getElementById('loginEmail').value.trim();
  const p = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  if(!e || !p) return showToast('❌ Digite e-mail e senha', 'err');
  try {
    const res = await window.electronAPI.dbOperation({ operation: 'LOGIN', data: { email: e, senha: p } });
    if(res.success) {
      currentUser = res.data;
      document.getElementById('sidebarUserName').textContent = currentUser.name;
      document.getElementById('sidebarUserRole').textContent = currentUser.role;
      switchAuthScreen('app');
      applyPermissions();
      await loadData();
      initTheme();
      switchView('dashboard');
      showToast(`Bem-vindo, ${currentUser.name}! 👋`);
    } else {
      if(res.error === 'PRIMEIRO_ACESSO') {
        err.textContent = 'Este usuário precisa completar o primeiro acesso. Clique em "Ativar Conta".';
      } else {
        err.textContent = res.error || 'Erro ao fazer login';
      }
      err.classList.remove('hidden');
    }
  } catch(err_e) { showToast('❌ Erro de conexão', 'err'); }
}

async function verificarEmailPrimeiroAcesso() {
  const email = document.getElementById('primeiroAcessoEmail').value.trim();
  const err = document.getElementById('primeiroAcessoError1');
  if(!email) { err.textContent = 'Digite seu e-mail'; err.classList.remove('hidden'); return; }
  try {
    const res = await window.electronAPI.dbOperation({ operation: 'PRIMEIRO_ACESSO', data: { email } });
    if(res.success) {
      primeiroAcessoEmail = email;
      document.getElementById('primeiroAcessoStep1').style.display = 'none';
      document.getElementById('primeiroAcessoStep2').style.display = 'block';
      showToast('✅ E-mail verificado!');
    } else {
      err.textContent = res.error || 'E-mail não encontrado';
      err.classList.remove('hidden');
    }
  } catch(err_e) { showToast('❌ Erro de conexão', 'err'); }
}

async function definirSenhaPrimeiroAcesso() {
  const senha = document.getElementById('primeiroAcessoSenha').value;
  const confirmaSenha = document.getElementById('primeiroAcessoConfirmaSenha').value;
  const err = document.getElementById('primeiroAcessoError2');
  if(!senha || !confirmaSenha) { err.textContent = 'Preencha todos os campos'; err.classList.remove('hidden'); return; }
  if(senha !== confirmaSenha) { err.textContent = 'As senhas não correspondem'; err.classList.remove('hidden'); return; }
  if(senha.length < 8) { err.textContent = 'A senha deve ter no mínimo 8 caracteres'; err.classList.remove('hidden'); return; }
  try {
    const res = await window.electronAPI.dbOperation({ operation: 'DEFINIR_SENHA', data: { email: primeiroAcessoEmail, senha, confirmaSenha } });
    if(res.success) {
      showToast('✅ Senha definida! Faça login para continuar.');
      setTimeout(() => {
        document.getElementById('primeiroAcessoStep1').style.display = 'block';
        document.getElementById('primeiroAcessoStep2').style.display = 'none';
        switchAuthScreen('login');
      }, 2000);
    } else {
      err.textContent = res.error || 'Erro ao definir senha';
      err.classList.remove('hidden');
    }
  } catch(err_e) { showToast('❌ Erro de conexão', 'err'); }
}

function doLogout() { currentUser = null; switchAuthScreen('login'); document.getElementById('loginEmail').value = ''; document.getElementById('loginPass').value = ''; }

function applyPermissions() {
  const perms = currentUser.permissions || {};
  document.querySelectorAll('.nav-item').forEach(el => {
    const view = el.getAttribute('data-view');
    el.style.display = perms[view] ? '' : 'none';
  });
}

// ---- DATA ----
async function loadData() {
  const op = (t) => window.electronAPI.dbOperation({ operation: 'SELECT_ALL', table: t });
  const [ra, rt, rn, rf, ru, rg, rj] = await Promise.all([op('analistas'), op('trilhas'), op('treinamentos'), op('feedbacks'), op('usuarios'), op('grupos_usuarios'), op('agenda')]);
  if(ra.success) analysts = ra.data;
  if(ru.success) users = ru.data;
  if(rg.success) grupos = rg.data;
  if(rj.success) agendaItems = rj.data;
  if(rn.success) trainings = rn.data;
  if(rf.success) feedbacks = rf.data;
  if(rt.success) trilhaCourses = rt.data.map(c => ({...c, analystStatus: JSON.parse(c.analystStatus || '{}')}));
  updateFilters();
}

function updateFilters() {
  const fill = (id, list, key='nome') => { 
    const s = document.getElementById(id); 
    if(s) s.innerHTML = '<option value="">Selecione...</option>' + list.map(x => `<option value="${x.id}">${x[key] || x.usuario || x.email}</option>`).join(''); 
  };
  fill('trilhaAnalystFilter', analysts);
  fill('f_feedback_destinatario', users.filter(u => u.id !== currentUser.id));
  
  // Preencher lista de participantes na agenda
  const partList = document.getElementById('f_agenda_participantes_list');
  if(partList) {
    partList.innerHTML = users.map(u => `<label style="display:block; margin:5px 0;"><input type="checkbox" value="${u.id}" class="participant-checkbox"> ${u.nome || u.email}</label>`).join('');
  }
}

// ---- NAVIGATION ----
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }
function switchView(v) {
  document.querySelectorAll('.view, .nav-item').forEach(x => x.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  const nav = document.querySelector(`[data-view="${v}"]`);
  if(nav) nav.classList.add('active');
  if(v==='dashboard') renderDashboard();
  if(v==='analysts') renderAnalysts();
  if(v==='trilha') renderTrilha();
  if(v==='trainings') renderTrainings();
  if(v==='feedback') renderFeedbacks();
  if(v==='agenda') renderAgenda();
  if(v==='users') renderUsers();
  if(v==='grupos') {
    loadData().then(() => renderGrupos());
  }
}

// ---- DASHBOARD ----
function renderDashboard() {
  const html = analysts.map(a => {
    const progresso = calcularProgresso(a.id);
    return `
      <tr>
        <td>${a.nome}</td>
        <td>${users.find(u => u.id === a.id_usuario_parca)?.nome || '—'}</td>
        <td>${a.frente || '—'}</td>
        <td>${a.ingresso ? new Date(a.ingresso).toLocaleDateString('pt-BR') : '—'}</td>
        <td><span class="status-badge status-${a.status.toLowerCase().replace(' ','-')}">${a.status}</span></td>
        <td>
          <div class="progress-bar" style="width: 100%; height: 20px; background: var(--bg3); border-radius: 3px; overflow: hidden;">
            <div class="progress-fill" style="width: ${progresso}%; height: 100%; background: ${progresso === 100 ? 'var(--green)' : progresso >= 50 ? 'var(--orange)' : 'var(--red)'}; transition: width .3s;"></div>
          </div>
          <small style="font-size: 10px; color: var(--text-muted);">${progresso}%</small>
        </td>
      </tr>
    `;
  }).join('');
  
  const stats = `
    <div class="stat-card"><div class="stat-value">${analysts.length}</div><div class="stat-label">Total Analistas</div></div>
    <div class="stat-card green"><div class="stat-value">${analysts.filter(a=>a.status==='Concluído').length}</div><div class="stat-label">Concluídos</div></div>
    <div class="stat-card blue"><div class="stat-value">${analysts.filter(a=>a.status==='Em andamento').length}</div><div class="stat-label">Em andamento</div></div>
  `;
  
  document.getElementById('dashStats').innerHTML = stats;
  document.getElementById('dashTable').innerHTML = `
    <table>
      <thead><tr><th>Nome</th><th>Parça</th><th>Frente</th><th>Ingresso</th><th>Status</th><th>Progresso</th></tr></thead>
      <tbody>${html || '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Nenhum analista cadastrado</td></tr>'}</tbody>
    </table>
  `;
}

function calcularProgresso(analystId) {
  const courses = trilhaCourses.filter(c => c.analystStatus[analystId]);
  if(courses.length === 0) return 0;
  const feitos = courses.filter(c => c.analystStatus[analystId] === 'Feito').length;
  return Math.round((feitos / courses.length) * 100);
}

// ---- ANALISTAS ----
function renderAnalysts() {
  const s = document.getElementById('analystSearch').value.toLowerCase();
  const analystUsers = users.filter(u => grupos.find(g => g.nome === 'ANALISTA' && g.id === u.id_grupo));
  const rows = analystUsers.filter(u => u.nome.toLowerCase().includes(s)).map(u => {
    const analyst = analysts.find(a => a.id_usuario === u.id);
    return `
      <tr>
        <td>${u.nome}</td>
        <td>${users.find(us => us.id === analyst?.id_usuario_parca)?.nome || '—'}</td>
        <td>${analyst?.frente || '—'}</td>
        <td>${analyst?.ingresso ? new Date(analyst.ingresso).toLocaleDateString('pt-BR') : '—'}</td>
        <td><span class="status-badge status-${analyst?.status.toLowerCase().replace(' ','-')}">${analyst?.status || 'Em andamento'}</span></td>
        <td style="text-align:right">
          <button class="action-btn" onclick="openEditAnalyst(${analyst?.id})">✎</button>
          <button class="action-btn danger" onclick="openDeleteConfirm(${analyst?.id}, 'analistas')">✕</button>
        </td>
      </tr>
    `;
  }).join('');
  document.getElementById('analystsList').innerHTML = `
    <table>
      <thead><tr><th>Nome</th><th>Parça</th><th>Frente</th><th>Ingresso</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Nenhum analista encontrado</td></tr>'}</tbody>
    </table>
  `;
}

function openEditAnalyst(id) { editTarget = analysts.find(a => a.id === id); if(editTarget) { document.getElementById('modalAnalystTitle').textContent = 'Editar Analista'; renderAnalystForm(editTarget); document.getElementById('modalAnalyst').classList.remove('hidden'); } }
function closeAnalystModal() { document.getElementById('modalAnalyst').classList.add('hidden'); }

function renderAnalystForm(d = null) {
  const parcaUsers = users.filter(u => grupos.find(g => g.nome === 'PARCA' && g.id === u.id_grupo));
  document.getElementById('modalAnalystBody').innerHTML = `
    <div class="form-group"><label>Nome</label><input type="text" id="f_ana_nome" value="${d?.nome || ''}" placeholder="Nome do analista" /></div>
    <div class="form-group"><label>Parça Responsável</label><select id="f_ana_parca"><option value="">Selecione...</option>${parcaUsers.map(u => `<option value="${u.id}" ${d?.id_usuario_parca === u.id ? 'selected' : ''}>${u.nome}</option>`).join('')}</select></div>
    <div class="form-group"><label>Frente</label><select id="f_ana_frente"><option ${d?.frente === 'Reta' ? 'selected' : ''}>Reta</option><option ${d?.frente === 'PDV' ? 'selected' : ''}>PDV</option><option ${d?.frente === 'Reta e PDV' ? 'selected' : ''}>Reta e PDV</option></select></div>
    <div class="form-group"><label>Data de Ingresso</label><input type="date" id="f_ana_ingresso" value="${d?.ingresso ? d.ingresso.split('T')[0] : ''}" /></div>
    <div class="form-group"><label>Status</label><select id="f_ana_status"><option ${d?.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option><option ${d?.status === 'Concluído' ? 'selected' : ''}>Concluído</option></select></div>
  `;
}

async function saveAnalyst() {
  const nome = document.getElementById('f_ana_nome').value.trim();
  const parca = document.getElementById('f_ana_parca').value;
  const frente = document.getElementById('f_ana_frente').value;
  const ingresso = document.getElementById('f_ana_ingresso').value;
  const status = document.getElementById('f_ana_status').value;
  
  if(!nome) return showToast('❌ Preencha o nome', 'err');
  
  const data = { nome, id_usuario_parca: parca || null, frente, ingresso, status };
  const res = await window.electronAPI.dbOperation({ 
    operation: editTarget ? 'UPDATE' : 'INSERT', 
    table: 'analistas', 
    id: editTarget ? editTarget.id : null,
    data: data 
  });
  
  if(res.success) {
    showToast('✅ Analista salvo com sucesso!');
    closeAnalystModal();
    await loadData();
    renderAnalysts();
  } else {
    showToast('❌ Erro ao salvar analista', 'err');
  }
}

// ---- TRILHA RC ----
function renderTrilha() {
  const analystId = document.getElementById('trilhaAnalystFilter').value;
  const rows = trilhaCourses.map(c => {
    const status = analystId ? (c.analystStatus[analystId] || 'Não feito') : '—';
    const statusColor = status === 'Feito' ? 'var(--green)' : status === 'Não feito' ? 'var(--red)' : 'var(--text-muted)';
    return `
      <tr>
        <td>${c.tema}</td>
        <td>${c.duracao || '—'}</td>
        <td>${c.frente || '—'}</td>
        <td style="color: ${statusColor}; font-weight: 700;">${status}</td>
        <td style="text-align:right">
          <button class="action-btn" onclick="openEditTrilha(${c.id})">✎</button>
          <button class="action-btn danger" onclick="openDeleteConfirm(${c.id}, 'trilhas')">✕</button>
        </td>
      </tr>
    `;
  }).join('');
  
  if(analystId) {
    const progresso = calcularProgresso(analystId);
    document.getElementById('trilhaProgressWrap').style.display = 'block';
    document.getElementById('trilhaProgressLabel').textContent = progresso + '%';
    document.getElementById('trilhaProgressFill').style.width = progresso + '%';
  } else {
    document.getElementById('trilhaProgressWrap').style.display = 'none';
  }
  
  document.getElementById('trilhaTable').innerHTML = `
    <table>
      <thead><tr><th>Tema</th><th>Duração</th><th>Frente</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum curso cadastrado</td></tr>'}</tbody>
    </table>
  `;
}

function openAddTrilhaModal() { editTarget = null; document.getElementById('modalTrilha').classList.remove('hidden'); }
function openEditTrilha(id) { editTarget = trilhaCourses.find(t => t.id === id); if(editTarget) { document.getElementById('f_trilha_tema').value = editTarget.tema; document.getElementById('f_trilha_duracao').value = editTarget.duracao; document.getElementById('f_trilha_frente').value = editTarget.frente; document.getElementById('f_trilha_bloco').value = editTarget.bloco; document.getElementById('modalTrilha').classList.remove('hidden'); } }
function closeTrilhaModal() { document.getElementById('modalTrilha').classList.add('hidden'); editTarget = null; }

async function saveTrilha() {
  const tema = document.getElementById('f_trilha_tema').value.trim();
  const duracao = document.getElementById('f_trilha_duracao').value.trim();
  const frente = document.getElementById('f_trilha_frente').value;
  const bloco = document.getElementById('f_trilha_bloco').value || 0;
  
  if(!tema) return showToast('❌ Preencha o tema', 'err');
  
  const data = { tema, duracao, frente, bloco: parseInt(bloco), analystStatus: editTarget ? editTarget.analystStatus : '{}' };
  if(typeof data.analystStatus !== 'string') data.analystStatus = JSON.stringify(data.analystStatus);

  const res = await window.electronAPI.dbOperation({ 
    operation: editTarget ? 'UPDATE' : 'INSERT', 
    table: 'trilhas', 
    id: editTarget ? editTarget.id : null,
    data: data 
  });
  
  if(res.success) {
    showToast('✅ Curso salvo com sucesso!');
    closeTrilhaModal();
    await loadData();
    renderTrilha();
  } else {
    showToast('❌ Erro ao salvar curso', 'err');
  }
}

// ---- TREINAMENTOS ----
function renderTrainings() {
  const rows = trainings.map(t => `
    <tr>
      <td>${t.nome}</td>
      <td>${t.instrutor || '—'}</td>
      <td style="text-align:center">
        <button class="action-btn" style="background: var(--blue); color: white;" onclick="downloadTraining(${t.id})">📥 Baixar</button>
      </td>
      <td style="text-align:right">
        <button class="action-btn" onclick="openEditTraining(${t.id})">✎</button>
        <button class="action-btn danger" onclick="openDeleteConfirm(${t.id}, 'treinamentos')">✕</button>
      </td>
    </tr>
  `).join('');
  
  document.getElementById('trainingsTable').innerHTML = `
    <table>
      <thead><tr><th>Nome</th><th>Aplicador</th><th>Arquivo</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Nenhum treinamento cadastrado</td></tr>'}</tbody>
    </table>
  `;
}

function openAddTraining() { editTarget = null; document.getElementById('modalTraining').classList.remove('hidden'); }
function openEditTraining(id) { editTarget = trainings.find(t => t.id === id); if(editTarget) { document.getElementById('f_train_nome').value = editTarget.nome; document.getElementById('f_train_instrutor').value = editTarget.instrutor; document.getElementById('modalTraining').classList.remove('hidden'); } }
function closeTrainingModal() { document.getElementById('modalTraining').classList.add('hidden'); editTarget = null; }

async function saveTraining() {
  const nome = document.getElementById('f_train_nome').value.trim();
  const instrutor = document.getElementById('f_train_instrutor').value.trim();
  const file = document.getElementById('f_train_file').files[0];
  
  if(!nome) return showToast('❌ Preencha o nome', 'err');
  if(!editTarget && !file) return showToast('❌ Selecione um arquivo', 'err');
  
  let pdfUrl = editTarget?.pdfUrl || '';
  let nomeArquivo = editTarget?.nomeArquivo || '';
  let tipoArquivo = editTarget?.tipoArquivo || '';
  
  if(file) {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if(!validTypes.includes(file.type)) return showToast('❌ Apenas PDF e PPTX são permitidos', 'err');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      pdfUrl = e.target.result;
      nomeArquivo = file.name;
      tipoArquivo = file.type.includes('pdf') ? 'pdf' : 'pptx';
      
      const data = { nome, instrutor, pdfUrl, nomeArquivo, tipoArquivo };
      const res = await window.electronAPI.dbOperation({ 
        operation: editTarget ? 'UPDATE' : 'INSERT', 
        table: 'treinamentos', 
        data: editTarget ? {...data, id: editTarget.id} : data 
      });
      
      if(res.success) {
        showToast('✅ Treinamento salvo com sucesso!');
        closeTrainingModal();
        await loadData();
        renderTrainings();
      } else {
        showToast('❌ Erro ao salvar treinamento', 'err');
      }
    };
    reader.readAsDataURL(file);
  } else {
    const data = { nome, instrutor, pdfUrl, nomeArquivo, tipoArquivo };
    const res = await window.electronAPI.dbOperation({ 
      operation: 'UPDATE', 
      table: 'treinamentos', 
      data: {...data, id: editTarget.id} 
    });
    
    if(res.success) {
      showToast('✅ Treinamento atualizado com sucesso!');
      closeTrainingModal();
      await loadData();
      renderTrainings();
    } else {
      showToast('❌ Erro ao atualizar treinamento', 'err');
    }
  }
}

function downloadTraining(id) {
  const training = trainings.find(t => t.id === id);
  if(!training || !training.pdfUrl) return showToast('❌ Arquivo não encontrado', 'err');
  
  const link = document.createElement('a');
  link.href = training.pdfUrl;
  link.download = training.nomeArquivo || 'treinamento';
  link.click();
  showToast('✅ Download iniciado!');
}

// ---- AGENDA ----
function renderAgenda() {
  const stats = `
    <div class="stat-card"><div class="stat-value">${agendaItems.filter(a => a.status === 'Agendado').length}</div><div class="stat-label">Agendados</div></div>
    <div class="stat-card green"><div class="stat-value">${agendaItems.filter(a => a.status === 'Concluído').length}</div><div class="stat-label">Concluídos</div></div>
    <div class="stat-card orange"><div class="stat-value">${agendaItems.filter(a => a.status === 'Reagendado').length}</div><div class="stat-label">Reagendados</div></div>
    <div class="stat-card red"><div class="stat-value">${agendaItems.filter(a => a.status === 'Cancelado').length}</div><div class="stat-label">Cancelados</div></div>
  `;
  
  const rows = agendaItems.map(a => {
    const statusColor = a.status === 'Concluído' ? 'var(--green)' : a.status === 'Cancelado' ? 'var(--red)' : a.status === 'Reagendado' ? 'var(--orange)' : 'var(--blue)';
    return `
      <tr>
        <td>${a.titulo}</td>
        <td>${a.data_agendamento ? new Date(a.data_agendamento).toLocaleDateString('pt-BR') : '—'}</td>
        <td>${a.tipo || '—'}</td>
        <td style="color: ${statusColor}; font-weight: 700;">${a.status}</td>
        <td style="text-align:right">
          <button class="action-btn" onclick="openEditAgenda(${a.id})">✎</button>
          <button class="action-btn danger" onclick="openDeleteConfirm(${a.id}, 'agenda')">✕</button>
        </td>
      </tr>
    `;
  }).join('');
  
  document.getElementById('agendaStats').innerHTML = stats;
  document.getElementById('agendaTable').innerHTML = `
    <table>
      <thead><tr><th>Título</th><th>Data</th><th>Tipo</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum agendamento</td></tr>'}</tbody>
    </table>
  `;
}

function openAddAgenda() { editTarget = null; updateFilters(); document.getElementById('modalAgenda').classList.remove('hidden'); }

async function openEditAgenda(id) { 
  editTarget = agendaItems.find(a => a.id === id); 
  if(editTarget) { 
    document.getElementById('f_agenda_titulo').value = editTarget.titulo || ''; 
    document.getElementById('f_agenda_desc').value = editTarget.descricao || ''; 
    
    let dataVal = '';
    if (editTarget.data_agendamento) {
      const d = new Date(editTarget.data_agendamento);
      if (!isNaN(d.getTime())) {
        const pad = (n) => n.toString().padStart(2, '0');
        dataVal = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    
    document.getElementById('f_agenda_data').value = dataVal; 
    document.getElementById('f_agenda_tipo').value = editTarget.tipo || 'Reunião'; 
    document.getElementById('f_agenda_status').value = editTarget.status || 'Agendado'; 
    document.getElementById('f_agenda_motivo').value = editTarget.motivo_alteracao || ''; 
    
    updateFilters(); 
    
    if (editTarget.participantes) {
      try {
        const parts = typeof editTarget.participantes === 'string' ? JSON.parse(editTarget.participantes) : editTarget.participantes;
        document.querySelectorAll('.participant-checkbox').forEach(cb => {
          cb.checked = parts.includes(cb.value);
        });
      } catch(e) { console.error('Erro ao processar participantes:', e); }
    }
    
    document.getElementById('modalAgenda').classList.remove('hidden'); 
  } 
}

function closeAgendaModal() { document.getElementById('modalAgenda').classList.add('hidden'); editTarget = null; }

async function saveAgenda() {
  const titulo = document.getElementById('f_agenda_titulo').value.trim();
  const descricao = document.getElementById('f_agenda_desc').value.trim();
  const data_agendamento = document.getElementById('f_agenda_data').value;
  const tipo = document.getElementById('f_agenda_tipo').value;
  const status = document.getElementById('f_agenda_status').value;
  const motivo_alteracao = document.getElementById('f_agenda_motivo').value.trim();
  
  if(!titulo) return showToast('❌ Preencha o título', 'err');
  if(!data_agendamento) return showToast('❌ Selecione a data', 'err');
  
  const participantes = Array.from(document.querySelectorAll('.participant-checkbox:checked')).map(c => c.value);
  const participantesJSON = JSON.stringify(participantes);
  
  const data = { titulo, descricao, data_agendamento, tipo, status, participantes: participantesJSON, motivo_alteracao, id_responsavel: currentUser.id };
  const res = await window.electronAPI.dbOperation({ 
    operation: editTarget ? 'UPDATE' : 'INSERT', 
    table: 'agenda', 
    id: editTarget ? editTarget.id : null,
    data: data 
  });
  
  if(res.success) {
    showToast('✅ Agendamento salvo com sucesso!');
    closeAgendaModal();
    await loadData();
    renderAgenda();
  } else {
    showToast('❌ Erro ao salvar agendamento', 'err');
  }
}

// ---- USUÁRIOS ----
function renderUsers() {
  const rows = users.map(u => `
    <tr>
      <td>${u.nome || '—'}</td>
      <td>${u.email || '—'}</td>
      <td>${grupos.find(g => g.id === u.id_grupo)?.nome || '—'}</td>
      <td><span class="status-badge status-${u.ativo === 'S' ? 'ativo' : 'inativo'}">${u.ativo === 'S' ? 'Ativo' : 'Inativo'}</span></td>
      <td style="text-align:right">
        <button class="action-btn" onclick="openEditUser(${u.id})">✎</button>
        <button class="action-btn danger" onclick="openDeleteConfirm(${u.id}, 'usuarios')">✕</button>
      </td>
    </tr>
  `).join('');
  
  document.getElementById('usersTable').innerHTML = `
    <table>
      <thead><tr><th>Nome</th><th>E-mail</th><th>Grupo</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum usuário cadastrado</td></tr>'}</tbody>
    </table>
  `;
}

function openAddUser() { editTarget = null; renderUserForm(); document.getElementById('modalUser').classList.remove('hidden'); }
function openEditUser(id) { editTarget = users.find(u => u.id === id); document.getElementById('modalUserTitle').textContent = 'Editar Usuário'; renderUserForm(editTarget); document.getElementById('modalUser').classList.remove('hidden'); }
function closeUserModal() { document.getElementById('modalUser').classList.add('hidden'); editTarget = null; }

function renderUserForm(d = null) {
  const gOpts = grupos.map(g => `<option value="${g.id}" ${d?.id_grupo === g.id ? 'selected' : ''}>${g.nome}</option>`).join('');
  document.getElementById('modalUserBody').innerHTML = `
    <div class="form-group"><label>Usuário (Login)</label><input type="text" id="f_user_login" value="${d?.usuario || ''}" placeholder="Ex: gvaz" /></div>
    <div class="form-group"><label>Nome</label><input type="text" id="f_user_nome" value="${d?.nome || ''}" placeholder="Nome completo" /></div>
    <div class="form-group"><label>E-mail</label><input type="email" id="f_user_email" value="${d?.email || ''}" placeholder="email@linx.com.br" /></div>
    <div class="form-group"><label>Grupo</label><select id="f_user_grupo">${gOpts}</select></div>
    <div class="form-group"><label>Status</label><select id="f_user_status"><option value="S" ${d?.ativo === 'S' ? 'selected' : ''}>Ativo</option><option value="N" ${d?.ativo === 'N' ? 'selected' : ''}>Inativo</option></select></div>
    ${!d ? '<p style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">* O usuário definirá sua senha no primeiro acesso.</p>' : ''}
  `;
}

async function saveUser() {
  const usuario = document.getElementById('f_user_login').value.trim();
  const nome = document.getElementById('f_user_nome').value.trim();
  const email = document.getElementById('f_user_email').value.trim();
  const id_grupo = document.getElementById('f_user_grupo').value;
  const ativo = document.getElementById('f_user_status').value;
  
  if(!usuario || !nome || !email) return showToast('❌ Preencha todos os campos', 'err');
  
  const data = { usuario, nome, email, id_grupo, ativo };
  if(!editTarget) {
    data.primeiro_acesso = 'S';
    data.senha_hash = '';
  }
  
  const res = await window.electronAPI.dbOperation({ 
    operation: editTarget ? 'UPDATE' : 'INSERT', 
    table: 'usuarios', 
    id: editTarget ? editTarget.id : null,
    data: data 
  });
  
  if(res.success) {
    showToast('✅ Usuário salvo com sucesso!');
    closeUserModal();
    await loadData();
    renderUsers();
  } else {
    showToast('❌ Erro ao salvar usuário', 'err');
  }
}

// ---- FEEDBACK ----
function renderFeedbacks() {
  const html = feedbacks.map(f => `
    <div class="feedback-card" style="background: var(--bg2); border: 1px solid var(--border); padding: 15px; border-radius: var(--radius); margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <strong>${f.autor_nome}</strong>
          <p style="font-size: 12px; color: var(--text-muted);">Para: ${users.find(u => u.id === f.destinatario_id)?.nome || '—'}</p>
          <p style="margin-top: 10px;">${f.texto}</p>
          <small style="color: var(--text-muted);">${new Date(f.data_envio).toLocaleDateString('pt-BR')}</small>
        </div>
        <button class="action-btn danger" onclick="openDeleteConfirm(${f.id}, 'feedbacks')">✕</button>
      </div>
    </div>
  `).join('');
  
  document.getElementById('feedbackList').innerHTML = html || '<p style="text-align: center; color: var(--text-muted);">Nenhum feedback enviado</p>';
}

async function saveFeedback() {
  const destinatario_id = document.getElementById('f_feedback_destinatario').value;
  const texto = document.getElementById('f_feedback_text').value.trim();
  
  if(!destinatario_id || !texto) return showToast('❌ Preencha todos os campos', 'err');
  
  const data = { destinatario_id, autor_id: currentUser.id, autor_nome: currentUser.name, texto };
  const res = await window.electronAPI.dbOperation({ 
    operation: 'INSERT', 
    table: 'feedbacks', 
    data 
  });
  
  if(res.success) {
    showToast('✅ Feedback enviado com sucesso!');
    document.getElementById('f_feedback_text').value = '';
    document.getElementById('f_feedback_destinatario').value = '';
    await loadData();
    renderFeedbacks();
  } else {
    showToast('❌ Erro ao enviar feedback', 'err');
  }
}

function cancelEditFeedback() { feedbackEditId = null; document.getElementById('f_feedback_text').value = ''; }

// ---- GRUPOS ----
function renderGrupos() {
  const rows = grupos.map(g => `
    <tr>
      <td>${g.nome}</td>
      <td style="text-align:right">
        <button class="action-btn" onclick="openEditGrupo(${g.id})">✎</button>
        <button class="action-btn danger" onclick="openDeleteConfirm(${g.id}, 'grupos_usuarios')">✕</button>
      </td>
    </tr>
  `).join('');
  
  document.getElementById('gruposTable').innerHTML = `
    <table>
      <thead><tr><th>Nome</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="2" style="text-align:center; color:var(--text-muted);">Nenhum grupo cadastrado</td></tr>'}</tbody>
    </table>
  `;
}

function openAddGrupo() { editTarget = null; renderGrupoForm(); document.getElementById('modalGrupo').classList.remove('hidden'); }
function openEditGrupo(id) { editTarget = grupos.find(g => g.id === id); renderGrupoForm(editTarget); document.getElementById('modalGrupo').classList.remove('hidden'); }
function closeGrupoModal() { document.getElementById('modalGrupo').classList.add('hidden'); }

function renderGrupoForm(d = null) {
  const perms = d?.permissoes ? (typeof d.permissoes === 'string' ? JSON.parse(d.permissoes) : d.permissoes) : {};
  const menus = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analysts', label: 'Analistas' },
    { id: 'trilha', label: 'Trilha RC' },
    { id: 'trainings', label: 'Treinamentos' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'users', label: 'Usuários' },
    { id: 'grupos', label: 'Grupos' }
  ];

  let permsHtml = menus.map(m => `
    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; cursor: pointer;">
      <input type="checkbox" class="perm-checkbox" value="${m.id}" ${perms[m.id] ? 'checked' : ''}>
      <span style="font-size: 13px;">${m.label}</span>
    </label>
  `).join('');

  document.getElementById('modalGrupoBody').innerHTML = `
    <div class="form-group"><label>Nome do Grupo</label><input type="text" id="f_grupo_nome" value="${d?.nome || ''}" placeholder="Ex: ADMIN, LIDER..." /></div>
    <div class="form-group">
      <label>Permissões de Acesso (Menus)</label>
      <div style="background: var(--bg3); padding: 15px; border-radius: var(--radius); border: 1px solid var(--border2); max-height: 250px; overflow-y: auto;">
        ${permsHtml}
      </div>
    </div>
  `;
}

async function saveGrupo() {
  const nome = document.getElementById('f_grupo_nome').value.trim();
  if(!nome) return showToast('❌ Preencha o nome', 'err');
  
  const perms = {};
  document.querySelectorAll('.perm-checkbox').forEach(cb => {
    perms[cb.value] = cb.checked;
  });
  
  const data = { nome, permissoes: JSON.stringify(perms) };
  const res = await window.electronAPI.dbOperation({ 
    operation: editTarget ? 'UPDATE' : 'INSERT', 
    table: 'grupos_usuarios', 
    id: editTarget ? editTarget.id : null,
    data: data 
  });
  
  if(res.success) {
    showToast('✅ Grupo salvo com sucesso!');
    closeGrupoModal();
    await loadData();
    renderGrupos();
  } else {
    showToast('❌ Erro ao salvar grupo', 'err');
  }
}

// ---- UTILITÁRIOS ----
function openDeleteConfirm(id, type) { deleteTarget = id; deleteTargetType = type; document.getElementById('modalDeleteConfirm').classList.remove('hidden'); }
function closeDeleteConfirm() { deleteTarget = null; deleteTargetType = null; document.getElementById('modalDeleteConfirm').classList.add('hidden'); }

async function confirmDelete() {
  if(!deleteTarget || !deleteTargetType) return;
  const res = await window.electronAPI.dbOperation({ operation: 'DELETE', table: deleteTargetType, id: deleteTarget });
  if(res.success) {
    showToast('✅ Item excluído com sucesso!');
    closeDeleteConfirm();
    await loadData();
    if(deleteTargetType === 'analistas') renderAnalysts();
    else if(deleteTargetType === 'trilhas') renderTrilha();
    else if(deleteTargetType === 'treinamentos') renderTrainings();
    else if(deleteTargetType === 'usuarios') renderUsers();
    else if(deleteTargetType === 'grupos_usuarios') renderGrupos();
    else if(deleteTargetType === 'agenda') renderAgenda();
    else if(deleteTargetType === 'feedbacks') renderFeedbacks();
  } else {
    showToast('❌ Erro ao excluir item', 'err');
  }
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.style.cssText = `background: ${type === 'err' ? 'var(--red)' : 'var(--green)'}; color: white; padding: 12px 16px; border-radius: var(--radius); font-size: 14px; animation: slideIn .3s;`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function hashPassword(pwd) {
  // Implementar hash SHA256 ou usar bcrypt no backend
  return pwd; // Placeholder
}

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  switchAuthScreen('login');
  initTheme();
});


// ---- IMPORTAÇÃO DE ARQUIVOS ----
async function handleFileImport(event, type) {
  const file = event.target.files[0];
  if(!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if(type === 'trilha') {
        importTrilhas(jsonData);
      }
    } catch(err) {
      showToast('❌ Erro ao ler o arquivo', 'err');
    }
  };
  reader.readAsArrayBuffer(file);
}

async function importTrilhas(data) {
  if(!data || data.length === 0) return showToast('❌ Arquivo vazio', 'err');
  
  const preview = data.map(row => `
    <tr>
      <td>${row.Tema || row.tema || '—'}</td>
      <td>${row.Duração || row.duracao || '—'}</td>
      <td>${row.Frente || row.frente || '—'}</td>
      <td>${row.Bloco || row.bloco || '—'}</td>
    </tr>
  `).join('');
  
  document.getElementById('importPreview').innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead><tr style="background: var(--bg2);"><th style="padding: 8px; text-align: left;">Tema</th><th style="padding: 8px; text-align: left;">Duração</th><th style="padding: 8px; text-align: left;">Frente</th><th style="padding: 8px; text-align: left;">Bloco</th></tr></thead>
      <tbody>${preview}</tbody>
    </table>
  `;
  
  document.getElementById('importData').value = JSON.stringify(data);
  document.getElementById('modalImport').classList.remove('hidden');
}

async function confirmImportTrilhas() {
  const data = JSON.parse(document.getElementById('importData').value);
  let successCount = 0;
  let failCount = 0;
  
  for(const row of data) {
    const tema = row.Tema || row.tema;
    const duracao = row.Duração || row.duracao || '';
    const frente = row.Frente || row.frente || '';
    const bloco = row.Bloco || row.bloco || 0;
    
    if(!tema) continue;
    
    const res = await window.electronAPI.dbOperation({ 
      operation: 'INSERT', 
      table: 'trilhas', 
      data: { tema, duracao, frente, bloco: parseInt(bloco) || 0, analystStatus: '{}' } 
    });
    
    if(res.success) successCount++; else failCount++;
  }
  
  if(failCount > 0) {
    showToast(`⚠️ Importação concluída: ${successCount} sucesso, ${failCount} erro(s)`, 'err');
  } else {
    showToast(`✅ ${successCount} Trilhas importadas com sucesso!`);
  }
  
  showToast('✅ Trilhas importadas com sucesso!');
  document.getElementById('modalImport').classList.add('hidden');
  await loadData();
  renderTrilha();
}

function closeImportModal() { document.getElementById('modalImport').classList.add('hidden'); }
