CREATE DATABASE IF NOT EXISTS onboarding_linx;
USE onboarding_linx;

-- 1. Tabela de Grupos de Usuários
CREATE TABLE IF NOT EXISTS grupos_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) UNIQUE NOT NULL,
    permissoes JSON,
    apagado CHAR(1) DEFAULT 'N'
);

INSERT IGNORE INTO grupos_usuarios (nome, permissoes) VALUES 
('ADMIN', '{"dashboard":true,"analysts":true,"trilha":true,"trainings":true,"feedback":true,"agenda":true,"users":true,"grupos":true, "view_all_analysts":true}'),
('LIDER', '{"dashboard":true,"analysts":true,"trilha":true,"trainings":true,"feedback":true,"agenda":true,"users":false,"grupos":false, "view_all_analysts":true}'),
('PARCA', '{"dashboard":true,"analysts":true,"trilha":true,"trainings":true,"feedback":true,"agenda":true,"users":false,"grupos":false, "view_all_analysts":false}'),
('ANALISTA', '{"dashboard":true,"analysts":false,"trilha":true,"trainings":true,"feedback":true,"agenda":false,"users":false,"grupos":false, "view_all_analysts":false}');

-- 2. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255),
    senha_hash VARCHAR(255) NOT NULL,
    id_grupo INT,
    nome VARCHAR(100),
    email VARCHAR(100) NOT NULL,
    primeiro_acesso CHAR(1) DEFAULT 'S',
    ativo CHAR(1) DEFAULT 'S',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    apagado CHAR(1) DEFAULT 'N',
    FOREIGN KEY (id_grupo) REFERENCES grupos_usuarios(id)
);

-- Admin Inicial (Senha: admin123 - Hash SHA256)
INSERT IGNORE INTO usuarios (usuario, senha_hash, id_grupo, nome, email, ativo, primeiro_acesso) 
SELECT 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', id, 'Administrador', 'admin@linx.com.br', 'S', 'N'
FROM grupos_usuarios WHERE nome = 'ADMIN' LIMIT 1;

-- 3. Tabela de Analistas
CREATE TABLE IF NOT EXISTS analistas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNIQUE,
    id_usuario_analista INT UNIQUE,
    id_usuario_parca INT,
    nome VARCHAR(100) NOT NULL,
    frente VARCHAR(50),
    ingresso DATE,
    status VARCHAR(50) DEFAULT 'Em andamento',
    apagado CHAR(1) DEFAULT 'N',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_analista) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_parca) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 4. Tabela de Trilhas RC
CREATE TABLE IF NOT EXISTS trilhas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tema VARCHAR(200) NOT NULL,
    duracao VARCHAR(50),
    frente VARCHAR(50),
    bloco INT,
    analystStatus TEXT, -- JSON com status por analista
    apagado CHAR(1) DEFAULT 'N'
);

-- 5. Tabela de Treinamentos (Apenas arquivos PDF/PPTX)
CREATE TABLE IF NOT EXISTS treinamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    instrutor VARCHAR(100),
    pdfUrl LONGTEXT,
    nomeArquivo VARCHAR(200),
    tipoArquivo VARCHAR(20),
    apagado CHAR(1) DEFAULT 'N'
);

-- 6. Tabela de Feedbacks
CREATE TABLE IF NOT EXISTS feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destinatario_id INT,
    autor_id INT,
    autor_nome VARCHAR(100),
    texto TEXT,
    data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    apagado CHAR(1) DEFAULT 'N',
    FOREIGN KEY (destinatario_id) REFERENCES usuarios(id),
    FOREIGN KEY (autor_id) REFERENCES usuarios(id)
);

-- 7. Tabela de Agenda (Simplificada e Detalhada)
CREATE TABLE IF NOT EXISTS agenda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    data_agendamento DATETIME,
    tipo VARCHAR(50) DEFAULT 'Reunião', -- Treinamento, Feedback, Reunião
    status VARCHAR(50) DEFAULT 'Agendado', -- Agendado, Concluído, Cancelado, Reagendado
    participantes JSON, -- Lista de IDs de usuários
    id_responsavel INT,
    motivo_alteracao TEXT,
    motivo_cancelamento TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    apagado CHAR(1) DEFAULT 'N',
    FOREIGN KEY (id_responsavel) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 8. Tabela de Cronograma
CREATE TABLE IF NOT EXISTS cronogramas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dia INT,
    treinamento VARCHAR(255),
    formato VARCHAR(50),
    bloco VARCHAR(255),
    apagado CHAR(1) DEFAULT 'N'
);

-- 8b. Tabela de Cronograma Geral (para importação de dados)
CREATE TABLE IF NOT EXISTS cronograma_geral (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_analista INT,
    parca VARCHAR(100),
    chats_atendidos INT,
    dias_restantes INT,
    data_importacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    apagado CHAR(1) DEFAULT 'N',
    FOREIGN KEY (id_analista) REFERENCES analistas(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_agenda_data ON agenda(data_agendamento);
