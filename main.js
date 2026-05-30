const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Carregar variáveis de ambiente
dotenv.config();

// CONFIGURAÇÕES DE CONEXÃO
const DB_CONFIG = {
  host: process.env.DB_HOST || '192.168.2.27',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'onboarding_linx',
  port: process.env.DB_PORT || 3306,
  connectTimeout: 10000
};

// CONFIGURAÇÕES DE E-MAIL (Opcional - apenas se configurado)
const EMAIL_CONFIG = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
};

let mainWindow;
let connection;

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

async function getConnection() {
    try {
        if (!connection || connection.connection._closing) {
            connection = await mysql.createConnection(DB_CONFIG);
            console.log('✅ Conectado ao MariaDB');
        }
        return connection;
    } catch (error) {
        console.error('❌ Erro de Conexão:', error.message);
        throw error;
    }
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function validatePassword(password, hash) {
    return hashPassword(password) === hash;
}

// Função para envio real de e-mail (opcional)
async function sendEmail(to, subject, body) {
    try {
        if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
            console.log('⚠️ SMTP não configurado. E-mail não será enviado.');
            return { success: true, simulated: true };
        }

        const transporter = nodemailer.createTransport(EMAIL_CONFIG);
        await transporter.sendMail({
            from: `"Onboarding Linx" <${EMAIL_CONFIG.auth.user}>`,
            to,
            subject,
            html: body
        });

        console.log(`✅ E-mail enviado para ${to}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================================
// HANDLERS IPC
// ============================================================

ipcMain.handle('db-operation', async (event, payload) => {
    const { operation, table, data, id, query, params } = payload;
    try {
        const db = await getConnection();
        
        if (operation === 'QUERY') {
            const [rows] = await db.execute(query, params || []);
            return { success: true, data: rows };
        }

        if (operation === 'SELECT_ALL') {
            const [rows] = await db.execute(`SELECT * FROM ${table} WHERE apagado = 'N'`);
            return { success: true, data: rows };
        }

        if (operation === 'INSERT') {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(', ');
            const [result] = await db.execute(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
            
            // Se for inserção na agenda, enviar e-mail se houver participantes
            if (table === 'agenda' && data.participantes) {
                try {
                    const parts = JSON.parse(data.participantes);
                    if (parts.length > 0) {
                        const body = `<h2>Novo Agendamento</h2><p><strong>Título:</strong> ${data.titulo}</p><p><strong>Data:</strong> ${new Date(data.data_agendamento).toLocaleString('pt-BR')}</p><p><strong>Descrição:</strong> ${data.descricao || 'N/A'}</p>`;
                        await sendEmail(parts[0], `Novo Agendamento: ${data.titulo}`, body);
                    }
                } catch(e) {}
            }
            
            return { success: true, id: result.insertId };
        }

        if (operation === 'UPDATE') {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClause = keys.map(key => `${key} = ?`).join(', ');
            await db.execute(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...values, id]);
            return { success: true };
        }

        if (operation === 'DELETE') {
            await db.execute(`UPDATE ${table} SET apagado = 'S' WHERE id = ?`, [id]);
            return { success: true };
        }

        if (operation === 'LOGIN') {
            const { email, senha } = data;
            const [rows] = await db.execute(
                `SELECT u.*, g.nome as nome_grupo, g.permissoes FROM usuarios u 
                 LEFT JOIN grupos_usuarios g ON u.id_grupo = g.id 
                 WHERE u.email = ? AND u.apagado = 'N'`, 
                [email]
            );
            
            if (rows.length === 0) return { success: false, error: 'E-mail não cadastrado' };
            
            const user = rows[0];
            if (user.primeiro_acesso === 'S') return { success: false, error: 'PRIMEIRO_ACESSO', email: user.email };
            
            const senhaValida = user.senha_hash ? validatePassword(senha, user.senha_hash) : (user.senha === senha);
            if (!senhaValida) return { success: false, error: 'Senha incorreta' };
            if (user.ativo !== 'S') return { success: false, error: 'Usuário inativo' };

            return { 
                success: true, 
                data: {
                    id: user.id,
                    email: user.email,
                    role: user.nome_grupo,
                    name: user.nome,
                    permissions: user.permissoes ? JSON.parse(user.permissoes) : {}
                }
            };
        }

        if (operation === 'PRIMEIRO_ACESSO') {
            const { email } = data;
            const [rows] = await db.execute(`SELECT u.* FROM usuarios u WHERE u.email = ? AND u.apagado = 'N'`, [email]);
            if (rows.length === 0) return { success: false, error: 'E-mail não encontrado' };
            const user = rows[0];
            if (user.primeiro_acesso !== 'S') return { success: false, error: 'Este usuário já completou o primeiro acesso' };
            return { success: true, data: { email: user.email, nome: user.nome } };
        }

        if (operation === 'DEFINIR_SENHA') {
            const { email, senha, confirmaSenha } = data;
            if (senha !== confirmaSenha) return { success: false, error: 'As senhas não correspondem' };
            if (senha.length < 8) return { success: false, error: 'A senha deve ter no mínimo 8 caracteres' };
            const senhaHash = hashPassword(senha);
            await db.execute(`UPDATE usuarios SET senha_hash = ?, senha = ?, primeiro_acesso = 'N', ativo = 'S' WHERE email = ? AND apagado = 'N'`, [senhaHash, senha, email]);
            return { success: true };
        }

        if (operation === 'CADASTRO') {
            const { usuario, email, nome, senha, confirmaSenha, id_grupo } = data;
            const [existing] = await db.execute(`SELECT id FROM usuarios WHERE (usuario = ? OR email = ?) AND apagado = 'N'`, [usuario, email]);
            if (existing.length > 0) return { success: false, error: 'Usuário ou e-mail já cadastrado' };
            const senhaHash = hashPassword(senha);
            const [result] = await db.execute(`INSERT INTO usuarios (usuario, email, nome, senha, senha_hash, id_grupo, primeiro_acesso, ativo) VALUES (?, ?, ?, ?, ?, ?, 'N', 'S')`, [usuario, email, nome, senha, senhaHash, id_grupo || 4]);
            return { success: true, id: result.insertId };
        }

        if (operation === 'REAGENDAR_AGENDA') {
            const { id, nova_data, motivo, email_notificacao } = data;
            const [rows] = await db.execute(`SELECT * FROM agenda WHERE id = ?`, [id]);
            if (rows.length === 0) return { success: false, error: 'Agendamento não encontrado' };
            const agenda = rows[0];
            
            await db.execute(`UPDATE agenda SET data_agendamento = ?, status = 'Reagendado' WHERE id = ?`, [nova_data, id]);
            
            if (email_notificacao) {
                const body = `<h2>Compromisso Reagendado</h2><p><strong>Título:</strong> ${agenda.titulo}</p><p><strong>Nova Data:</strong> ${new Date(nova_data).toLocaleString('pt-BR')}</p><p><strong>Motivo:</strong> ${motivo}</p>`;
                await sendEmail(email_notificacao, `Reagendamento: ${agenda.titulo}`, body);
            }
            return { success: true };
        }

        if (operation === 'CANCELAR_AGENDA') {
            const { id, motivo_cancelamento, email_notificacao } = data;
            const [rows] = await db.execute(`SELECT * FROM agenda WHERE id = ?`, [id]);
            if (rows.length === 0) return { success: false, error: 'Agendamento não encontrado' };
            const agenda = rows[0];
            
            await db.execute(`UPDATE agenda SET status = 'Cancelado', motivo_cancelamento = ? WHERE id = ?`, [motivo_cancelamento, id]);
            
            if (email_notificacao) {
                const body = `<h2>Compromisso Cancelado</h2><p><strong>Título:</strong> ${agenda.titulo}</p><p><strong>Motivo:</strong> ${motivo_cancelamento}</p>`;
                await sendEmail(email_notificacao, `Cancelamento: ${agenda.titulo}`, body);
            }
            return { success: true };
        }

        if (operation === 'OBTER_ESTATISTICAS_AGENDA') {
            const [rows] = await db.execute(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Concluído' THEN 1 ELSE 0 END) as concluidos,
                    SUM(CASE WHEN status = 'Em andamento' OR status = 'Reagendado' THEN 1 ELSE 0 END) as agendados,
                    SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END) as cancelados
                FROM agenda WHERE apagado = 'N'
            `);
            return { success: true, data: rows[0] };
        }

        if (operation === 'IMPORTAR_CRONOGRAMA_GERAL') {
            const { items } = data;
            for (const item of items) {
                // Verificar se analista existe pelo nome ou e-mail
                const [analysts] = await db.execute(`SELECT id FROM analistas WHERE nome = ? OR email = ?`, [item.analista, item.email]);
                let analystId = analysts.length > 0 ? analysts[0].id : null;
                
                if (analystId) {
                    await db.execute(
                        `INSERT INTO cronograma_geral (id_analista, parca, chats_atendidos, dias_restantes, data_importacao) 
                         VALUES (?, ?, ?, ?, NOW())`,
                        [analystId, item.parca, item.chats, item.dias_restantes]
                    );
                }
            }
            return { success: true };
        }

        return { success: false, error: 'Operação desconhecida' };
    } catch (error) {
        console.error('❌ Erro na operação:', error.message);
        return { success: false, error: error.message };
    }
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    mainWindow.loadFile('src/index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
