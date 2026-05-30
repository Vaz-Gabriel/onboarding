# Sistema de Autenticação Completo + Agenda Melhorada
## Documentação de Implementação

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fluxo de Autenticação](#fluxo-de-autenticação)
4. [Melhorias na Agenda](#melhorias-na-agenda)
5. [Instalação e Configuração](#instalação-e-configuração)
6. [Guia de Uso](#guia-de-uso)
7. [Segurança](#segurança)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Este projeto implementa um **sistema de autenticação completo** com três fluxos distintos:

- **Login**: Acesso para usuários já cadastrados
- **Cadastro**: Criação de novas contas de usuário
- **Primeiro Acesso**: Ativação de contas criadas pelo administrador

Além disso, o **menu de Agenda** foi significativamente melhorado com:

- ✅ Envio automático de notificações por e-mail
- ✅ Funcionalidade de reagendamento com histórico
- ✅ Funcionalidade de cancelamento com motivo
- ✅ Cards de estatísticas (Total, Concluídos, Agendados, Cancelados)

---

## 🏗️ Arquitetura

### Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | HTML5 + CSS3 + JavaScript (Vanilla) |
| **Desktop** | Electron 30.0.1 |
| **Backend** | Node.js + IPC (Inter-Process Communication) |
| **Banco de Dados** | MariaDB 10.x |
| **Autenticação** | SHA-256 Hash |

### Estrutura de Arquivos

```
onboarding-linx/
├── src/
│   ├── index.html          # Telas de autenticação + aplicativo
│   ├── script.js           # Lógica do frontend
│   └── style.css           # Estilos
├── main.js                 # Processo principal Electron + IPC handlers
├── preload.js              # Bridge de segurança
├── package.json            # Dependências
├── .env                    # Variáveis de ambiente
├── .env.example            # Exemplo de variáveis
├── SETUP_BANCO.sql         # Script inicial do banco
├── MIGRACAO_AUTENTICACAO.sql  # Alterações para autenticação
└── IMPLEMENTACAO_AUTENTICACAO.md  # Esta documentação
```

---

## 🔐 Fluxo de Autenticação

### 1. Login

```
┌─────────────────────┐
│  Tela de Login      │
│  E-mail + Senha     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Validar credenciais │
│ no banco de dados   │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
  ✅ Sucesso  ❌ Erro
      │          │
      ▼          ▼
   Dashboard  Mensagem
```

**Fluxo:**
1. Usuário insere e-mail e senha
2. Sistema valida no banco de dados
3. Se credenciais corretas → Acesso ao dashboard
4. Se incorretas → Mensagem de erro

**Validações:**
- E-mail obrigatório
- Senha obrigatória
- Usuário ativo (ativo = 'S')
- Não é primeiro acesso

---

### 2. Cadastro

```
┌──────────────────────┐
│ Tela de Cadastro     │
│ Nome, Usuário,       │
│ E-mail, Senha        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Validar dados        │
│ - Campos obrigatórios│
│ - Senha mínimo 8 car │
│ - E-mail único       │
└──────────┬───────────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
  ✅ Válido   ❌ Erro
      │          │
      ▼          ▼
  Inserir BD  Mensagem
      │
      ▼
  ✅ Cadastro
     Concluído
```

**Fluxo:**
1. Usuário preenche formulário de cadastro
2. Sistema valida todos os campos
3. Verifica se usuário/e-mail já existem
4. Hash da senha com SHA-256
5. Insere novo usuário no banco
6. Redireciona para login

**Validações:**
- Nome obrigatório
- Usuário obrigatório e único
- E-mail obrigatório e único
- Senha mínimo 8 caracteres
- Confirmação de senha

---

### 3. Primeiro Acesso

```
┌────────────────────────┐
│ Etapa 1: Verificar     │
│ E-mail Cadastrado      │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Buscar usuário no BD   │
│ Verificar primeiro     │
│ acesso = 'S'           │
└──────────┬─────────────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
  ✅ Encontrado ❌ Erro
      │          │
      ▼          ▼
  Etapa 2   Mensagem
      │
      ▼
┌────────────────────────┐
│ Etapa 2: Definir Senha │
│ Senha + Confirmar      │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Validar e salvar       │
│ Hash + Ativar usuário  │
└──────────┬─────────────┘
           │
           ▼
  ✅ Conta Ativada
```

**Fluxo:**
1. Usuário insere e-mail cadastrado
2. Sistema verifica se existe e está em primeiro acesso
3. Se válido → Exibe tela para definir senha
4. Usuário define nova senha
5. Sistema hash e ativa a conta
6. Redireciona para login

**Validações:**
- E-mail deve existir no banco
- Usuário deve estar em primeiro acesso (primeiro_acesso = 'S')
- Senha mínimo 8 caracteres
- Confirmação de senha

---

## 📅 Melhorias na Agenda

### 1. Cards de Estatísticas

Exibidos no topo da tela de Agenda:

| Card | Descrição |
|------|-----------|
| **Total** | Quantidade total de agendamentos |
| **Concluídos** | Agendamentos com status "Concluído" |
| **Agendados** | Agendamentos com status "Em andamento" |
| **Cancelados** | Agendamentos com status "Cancelado" |

**Implementação:**
- Query SQL: `SELECT COUNT(*), SUM(CASE WHEN status = ...) FROM agenda`
- Atualizado ao carregar a página de agenda
- Cores diferenciadas por tipo

---

### 2. Reagendamento

**Funcionalidade:**
- Clique no ícone 🕒 para reagendar
- Modal abre com dados do agendamento
- Usuário pode alterar a data
- Obrigatório informar motivo
- Notificações enviadas para todos os participantes

**Fluxo:**
```
Clique em 🕒
    ↓
Modal abre com dados
    ↓
Alterar data + Motivo
    ↓
Salvar
    ↓
Atualizar BD
    ↓
Registrar no histórico
    ↓
Enviar notificações
    ↓
Atualizar tela
```

**Dados Salvos:**
- Data anterior
- Nova data
- Motivo do reagendamento
- Timestamp da alteração
- Histórico em JSON

---

### 3. Cancelamento

**Funcionalidade:**
- Clique no ícone ✕ para cancelar
- Modal abre em modo cancelamento
- Campo de data desabilitado
- Obrigatório informar motivo
- Notificações enviadas para todos os participantes

**Fluxo:**
```
Clique em ✕
    ↓
Modal abre (data desabilitada)
    ↓
Informar motivo
    ↓
Confirmar cancelamento
    ↓
Atualizar status para "Cancelado"
    ↓
Registrar motivo e data
    ↓
Enviar notificações
    ↓
Atualizar tela
```

**Dados Salvos:**
- Status: "Cancelado"
- Motivo do cancelamento
- Data do cancelamento
- Notificações registradas

---

### 4. Notificações por E-mail

**Implementação:**
- Tabela `notificacoes_agenda` registra todas as notificações
- Tipos: 'agendamento', 'reagendamento', 'cancelamento'
- Status: 'pendente', 'enviado', 'falha'
- Integração com SMTP (preparada para nodemailer)

**Fluxo:**
```
Ação na agenda
    ↓
Buscar participantes
    ↓
Para cada participante:
    ├─ Buscar e-mail
    ├─ Preparar corpo do e-mail
    ├─ Enviar e-mail
    └─ Registrar notificação
    ↓
Atualizar status
```

**E-mails Enviados:**

| Tipo | Assunto | Conteúdo |
|------|---------|----------|
| **Agendamento** | "Novo Agendamento: [Título]" | Título, Data, Descrição, Local/Link, Tipo |
| **Reagendamento** | "Agendamento Reagendado: [Título]" | Título, Data Anterior, Nova Data, Motivo |
| **Cancelamento** | "Agendamento Cancelado: [Título]" | Título, Data Original, Motivo |

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 16+ instalado
- MariaDB 10.x instalado e rodando
- npm ou yarn

### Passo 1: Preparar o Banco de Dados

```bash
# Conectar ao MariaDB
mysql -u root -p

# Executar script inicial
source SETUP_BANCO.sql;

# Executar migração de autenticação
source MIGRACAO_AUTENTICACAO.sql;

# Verificar tabelas criadas
SHOW TABLES;
```

### Passo 2: Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais
nano .env
```

**Variáveis Importantes:**
```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=onboarding_linx
DB_USER=root
DB_PASSWORD=root

# E-mail (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_aplicativo
SMTP_FROM=seu_email@gmail.com
```

### Passo 3: Instalar Dependências

```bash
npm install
```

### Passo 4: Executar Aplicação

```bash
npm start
```

---

## 📖 Guia de Uso

### Para Administrador

#### Criar Novo Usuário

1. Menu → Usuários
2. Clique em "+ Novo Usuário"
3. Preencha: Nome, E-mail, Usuário, Grupo
4. Clique em "Salvar"
5. Usuário receberá senha temporária
6. Usuário faz "Primeiro Acesso" para ativar conta

#### Gerenciar Agenda

1. Menu → Agenda
2. Visualizar estatísticas no topo
3. Clique em "+ Novo Agendamento" para criar
4. Clique em 🕒 para reagendar
5. Clique em ✕ para cancelar

### Para Usuário Novo

#### Primeiro Acesso

1. Na tela de login, clique em "Ativar Conta"
2. Insira o e-mail cadastrado
3. Clique em "Verificar E-mail"
4. Defina uma nova senha (mínimo 8 caracteres)
5. Confirme a senha
6. Clique em "Definir Senha"
7. Faça login com o e-mail e nova senha

#### Cadastro Autônomo

1. Na tela de login, clique em "Criar Conta"
2. Preencha: Nome, Usuário, E-mail, Senha
3. Confirme a senha
4. Clique em "Cadastrar"
5. Faça login com as credenciais criadas

---

## 🔒 Segurança

### Implementações de Segurança

| Aspecto | Implementação |
|--------|--------------|
| **Hash de Senha** | SHA-256 (com salt em produção) |
| **Validação** | Lado do servidor e cliente |
| **Isolamento** | Context Isolation no Electron |
| **Soft Delete** | Registros marcados como apagado, não deletados |
| **Auditoria** | Tabela `auditoria_autenticacao` registra eventos |

### Recomendações de Segurança

1. **Em Produção:**
   - Usar bcrypt ou Argon2 em vez de SHA-256
   - Implementar rate limiting em tentativas de login
   - Usar HTTPS para comunicação
   - Implementar 2FA (autenticação de dois fatores)

2. **Banco de Dados:**
   - Alterar senha padrão do root
   - Usar usuário específico com permissões limitadas
   - Fazer backups regulares
   - Ativar logs de auditoria

3. **Variáveis de Ambiente:**
   - Nunca commitar `.env` no Git
   - Usar `.env.example` como template
   - Proteger arquivo `.env` com permissões restritas

---

## 🛠️ Troubleshooting

### Erro: "Conectado ao MariaDB" não aparece

**Solução:**
```bash
# Verificar se MariaDB está rodando
sudo systemctl status mariadb

# Iniciar MariaDB se parado
sudo systemctl start mariadb

# Testar conexão
mysql -u root -p -h localhost
```

### Erro: "E-mail não cadastrado"

**Solução:**
1. Verificar se usuário foi criado no banco
2. Verificar se e-mail está correto
3. Verificar se usuário não foi deletado (apagado = 'N')

### Erro: "As senhas não correspondem"

**Solução:**
- Verificar se ambos os campos de senha foram preenchidos
- Verificar se não há espaços em branco
- Tentar novamente com cuidado

### Erro: "Usuário ou e-mail já cadastrado"

**Solução:**
- Usar e-mail ou usuário diferente
- Se precisar reutilizar, deletar usuário anterior

### E-mails não são enviados

**Solução:**
1. Verificar credenciais SMTP em `.env`
2. Verificar se SMTP_HOST está correto
3. Para Gmail: gerar "Senha de Aplicativo"
4. Verificar logs do console do Electron

---

## 📊 Schema do Banco de Dados

### Tabela: usuarios

```sql
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL,
    senha_hash VARCHAR(255),
    email VARCHAR(100) NOT NULL,
    nome VARCHAR(100),
    id_grupo INT,
    primeiro_acesso CHAR(1) DEFAULT 'S',
    ativo CHAR(1) DEFAULT 'S',
    token_ativacao VARCHAR(255),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    apagado CHAR(1) DEFAULT 'N',
    FOREIGN KEY (id_grupo) REFERENCES grupos_usuarios(id)
);
```

### Tabela: agenda (alterações)

```sql
ALTER TABLE agenda ADD COLUMN participantes JSON;
ALTER TABLE agenda ADD COLUMN id_responsavel INT;
ALTER TABLE agenda ADD COLUMN historico_reagendamento JSON;
ALTER TABLE agenda ADD COLUMN motivo_cancelamento TEXT;
ALTER TABLE agenda ADD COLUMN data_cancelamento DATETIME;
ALTER TABLE agenda ADD COLUMN notificacao_enviada CHAR(1) DEFAULT 'N';
ALTER TABLE agenda ADD COLUMN data_notificacao DATETIME;
ALTER TABLE agenda ADD COLUMN tipo VARCHAR(50) DEFAULT 'Reunião';
ALTER TABLE agenda ADD COLUMN local_link TEXT;
ALTER TABLE agenda ADD COLUMN criado_em DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE agenda ADD COLUMN atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

### Tabela: notificacoes_agenda

```sql
CREATE TABLE notificacoes_agenda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_agenda INT NOT NULL,
    id_usuario INT NOT NULL,
    tipo_notificacao VARCHAR(50),
    email_destinatario VARCHAR(100),
    status_envio VARCHAR(20) DEFAULT 'pendente',
    data_envio DATETIME,
    mensagem_erro TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_agenda) REFERENCES agenda(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

---

## 📝 Próximos Passos

### Melhorias Futuras

1. **Autenticação:**
   - [ ] Implementar 2FA com QR Code
   - [ ] Recuperação de senha por e-mail
   - [ ] Login com redes sociais
   - [ ] Histórico de logins

2. **Agenda:**
   - [ ] Integração com Google Calendar
   - [ ] Lembretes automáticos antes do evento
   - [ ] Anexos de documentos
   - [ ] Videoconferência integrada

3. **Segurança:**
   - [ ] Usar bcrypt para hash
   - [ ] Rate limiting
   - [ ] CAPTCHA em cadastro
   - [ ] Verificação de e-mail

4. **Notificações:**
   - [ ] SMS
   - [ ] Push notifications
   - [ ] Webhooks

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Verificar este documento
2. Consultar logs do Electron (DevTools)
3. Verificar console do MariaDB
4. Verificar arquivo `.env`

---

**Versão:** 1.0.0  
**Data:** Maio 2026  
**Autor:** Sistema de Onboarding Linx
