# 🚀 Guia Rápido - Sistema de Onboarding Linx

## ⚡ Início Rápido

### 1. Instalação

```bash
# Clonar/extrair projeto
cd onboarding-linx

# Instalar dependências
npm install

# Configurar banco de dados
mysql -u root -p < SETUP_BANCO.sql
mysql -u root -p < MIGRACAO_AUTENTICACAO.sql

# Executar aplicação
npm start
```

### 2. Login Inicial

**Credenciais Padrão:**
- **E-mail:** admin@linx.com.br
- **Senha:** admin123

---

## 👤 Fluxos de Autenticação

### Login (Usuário Existente)
1. Insira e-mail
2. Insira senha
3. Clique em "Entrar"

### Cadastro (Novo Usuário)
1. Clique em "Criar Conta"
2. Preencha: Nome, Usuário, E-mail, Senha
3. Clique em "Cadastrar"
4. Faça login

### Primeiro Acesso (Conta Criada pelo Admin)
1. Clique em "Ativar Conta"
2. Insira e-mail cadastrado
3. Clique em "Verificar E-mail"
4. Defina nova senha
5. Clique em "Definir Senha"
6. Faça login

---

## 📅 Agenda - Novas Funcionalidades

### Visualizar Estatísticas
- Abra o menu "Agenda"
- Veja os cards no topo:
  - **Total:** Todos os agendamentos
  - **Concluídos:** Status "Concluído"
  - **Agendados:** Status "Em andamento"
  - **Cancelados:** Status "Cancelado"

### Criar Novo Agendamento
1. Clique em "+ Novo Agendamento"
2. Preencha: Título, Descrição, Data, Status
3. Clique em "Salvar"
4. ✅ Notificações serão enviadas por e-mail

### Reagendar Agendamento
1. Clique no ícone 🕒 do agendamento
2. Altere a data
3. Informe o motivo do reagendamento
4. Clique em "Salvar"
5. ✅ Notificações de reagendamento serão enviadas

### Cancelar Agendamento
1. Clique no ícone ✕ do agendamento
2. Informe o motivo do cancelamento
3. Clique em "Salvar"
4. ✅ Notificações de cancelamento serão enviadas

---

## 🔐 Segurança

- ✅ Senhas são criptografadas com SHA-256
- ✅ Validação de dados no servidor
- ✅ Soft delete (dados não são realmente deletados)
- ✅ Auditoria de eventos de autenticação

---

## ❓ Perguntas Frequentes

**P: Esqueci minha senha, o que fazer?**  
R: Atualmente, contate o administrador. Em breve haverá recuperação por e-mail.

**P: Posso alterar meu e-mail?**  
R: Sim, no menu Usuários (se tiver permissão).

**P: Como recebo notificações de agenda?**  
R: Notificações são enviadas por e-mail automaticamente ao criar, reagendar ou cancelar agendamentos.

**P: Posso usar o sistema em múltiplos computadores?**  
R: Sim, desde que tenham acesso ao banco de dados MariaDB.

---

## 🆘 Problemas Comuns

| Problema | Solução |
|----------|---------|
| "E-mail não cadastrado" | Verifique se o e-mail está correto ou crie uma nova conta |
| "Senha incorreta" | Verifique se a senha está correta (maiúsculas/minúsculas) |
| "Usuário já existe" | Use um e-mail ou usuário diferente |
| Sem conexão com banco | Verifique se MariaDB está rodando |
| E-mails não chegam | Verifique configuração SMTP no arquivo `.env` |

---

## 📞 Suporte

Para problemas técnicos, consulte:
- `IMPLEMENTACAO_AUTENTICACAO.md` - Documentação completa
- `LEIA-ME.md` - Informações gerais do projeto
- Console do Electron (F12) - Logs de erro

---

**Versão:** 1.0.0  
**Última Atualização:** Maio 2026
