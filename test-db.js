const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('========================================');
  console.log('🔍 DIAGNÓSTICO DE CONEXÃO MARIADB');
  console.log('========================================');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'onboarding_linx'
  };

  console.log('Configurações atuais no .env:');
  console.log(`- Host: ${config.host}`);
  console.log(`- Usuário: ${config.user}`);
  console.log(`- Banco: ${config.database}`);
  console.log(`- Porta: ${config.port}`);
  console.log('----------------------------------------');

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ SUCESSO: Conexão estabelecida com o MariaDB!');
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ SUCESSO: Tabelas encontradas: ${tables.length}`);
    
    const tableNames = tables.map(t => Object.values(t)[0]);
    const requiredTables = ['usuarios', 'analistas', 'trilhas', 'treinamentos', 'feedbacks', 'agenda', 'grupos_usuarios'];
    
    requiredTables.forEach(table => {
      if (tableNames.includes(table)) {
        console.log(`   - Tabela "${table}": OK`);
      } else {
        console.log(`   - Tabela "${table}": ❌ NÃO ENCONTRADA`);
      }
    });

    await connection.end();
  } catch (err) {
    console.log('❌ ERRO DE CONEXÃO:');
    if (err.code === 'ECONNREFUSED') {
      console.log('   O servidor MariaDB não está rodando ou o Host/Porta estão incorretos.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('   Usuário ou Senha incorretos.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.log(`   O banco de dados "${config.database}" não existe. Crie-o no HeidiSQL.`);
    } else {
      console.log(`   ${err.message}`);
    }
  }
  console.log('========================================');
}

testConnection();
