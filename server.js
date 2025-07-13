// server.js
const http    = require('http');
const url     = require('url');
const fs      = require('fs');
const path    = require('path');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
require('dotenv').config();

// --- Configuração do banco ---
const dbConfig = {
  host:     'localhost',
  user:     'weuler',
  password: 'Deusefiel@2002',
  database: 'mydb',
  port:     3306
};

let connection;
(async () => {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✔️  Banco conectado');
  } catch (err) {
    console.error('❌ Erro ao conectar ao DB:', err);
    process.exit(1);
  }
})();

// --- Chave secreta para JWT ---
const secretKey = process.env.JWT_SECRET || 'yourSecretKey';

// --- Helper para content-type ---
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.css':  return 'text/css';
    case '.js':   return 'application/javascript';
    case '.json': return 'application/json';
    case '.png':  return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    default:      return 'application/octet-stream';
  }
}

// --- Cria servidor HTTP ---
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname  = decodeURIComponent(parsedUrl.pathname);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // --- ROTA: POST /login ---
  if (pathname === '/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    return req.on('end', async () => {
      try {
        const { email, password } = JSON.parse(body);
        const [rows] = await connection.execute(
          'SELECT id_cliente AS id, pnome AS nome, senha FROM cliente WHERE email = ?',
          [email]
        );
        if (!rows.length || !bcrypt.compareSync(password, rows[0].senha)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Credenciais inválidas' }));
        }
        const token = jwt.sign(
          { id: rows[0].id, nome: rows[0].nome, role: 'cliente' },
          secretKey,
          { expiresIn: '2h' }
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Login bem-sucedido', token }));
      } catch (err) {
        console.error('Erro no /login:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Erro interno' }));
      }
    });
  }

  // --- ROTA: POST /cadastro ---
  // --- ROTA: POST /cadastro ---
if (pathname === '/cadastro' && req.method === 'POST') {
  let body = '';
  req.on('data', chunk => body += chunk);
  return req.on('end', async () => {
    try {
      const { name, surname, email, password, confirmPassword, phone } = JSON.parse(body);

      // Validação de senha
      if (password !== confirmPassword) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'As senhas não coincidem.' }));
      }

      // Hash da senha
      const hash = bcrypt.hashSync(password, 10);

      // Tenta inserir
      const [result] = await connection.execute(
        'INSERT INTO cliente (pnome, sobrenome, telefone, email, senha) VALUES (?,?,?,?,?)',
        [name, surname, phone, email, hash]
      );
      console.log('✅ Cliente inserido com ID:', result.insertId);

      // Sucesso
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Cadastro realizado com sucesso' }));

    } catch (err) {
      // Erro de e-mail duplicado
      if (err.code === 'ER_DUP_ENTRY') {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Este e-mail já está em uso.' }));
      }
      // Outros erros
      console.error('❌ Erro no /cadastro:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Erro interno no cadastro' }));
    }
  });
}


  // --- ROTA: GET /api/produtos ---
  if (pathname === '/api/produtos' && req.method === 'GET') {
    try {
      const sql = `
        SELECT
          p.produto_id AS id,
          p.nome AS nome,
          p.descricao_produto AS descricao,
          p.quantidade_estoque AS estoque,
          pr.preco_total AS preco
        FROM produto p
        JOIN preco pr
          ON pr.produto_id = p.produto_id
         AND pr.data_inicio_vigencia <= CURDATE()
         AND (pr.data_fim >= CURDATE() OR pr.data_fim IS NULL)
        WHERE p.status = 'ativo'
      `;
      const [rows] = await connection.execute(sql);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(rows));
    } catch (err) {
      console.error('Erro no /api/produtos:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Erro ao listar produtos' }));
    }
  }
  // --- ROTA: GET /api/produtos/:id (detalhe) ---
  if (pathname.match(/^\/api\/produtos\/\d+$/) && req.method === 'GET') {
    const id = pathname.split('/').pop();
    try {
      const sql = `
        SELECT
          p.produto_id AS id,
          p.nome AS nome,
          p.descricao_produto AS descricao,
          p.quantidade_estoque AS estoque,
          pr.preco_total AS preco
        FROM produto p
        JOIN preco pr
          ON pr.produto_id = p.produto_id
         AND pr.data_inicio_vigencia <= CURDATE()
         AND (pr.data_fim >= CURDATE() OR pr.data_fim IS NULL)
        WHERE p.produto_id = ?
          AND p.status = 'ativo'
        LIMIT 1
      `;
      const [rows] = await connection.execute(sql, [id]);
      if (!rows.length) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Produto não encontrado' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(rows[0]));
    } catch (err) {
      console.error('Erro no /api/produtos/:id:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Erro interno' }));
    }
  }

    // --- ROTA: GET /api/produtos/:id (detalhe + categorias) ---
  if (pathname.match(/^\/api\/produtos\/\d+$/) && req.method === 'GET') {
    const id = pathname.split('/').pop();
    try {
      const sql = `
        SELECT
          p.produto_id AS id,
          p.nome AS nome,
          p.descricao_produto AS descricao,
          p.quantidade_estoque AS estoque,
          pr.preco_total AS preco,
          GROUP_CONCAT(c.nome SEPARATOR ', ') AS categorias
        FROM produto p
        JOIN preco pr
          ON pr.produto_id = p.produto_id
         AND pr.data_inicio_vigencia <= CURDATE()
         AND (pr.data_fim >= CURDATE() OR pr.data_fim IS NULL)
        LEFT JOIN produto_tem_categoria pc
          ON pc.produto_id = p.produto_id
        LEFT JOIN categoria c
          ON c.id = pc.categoria_id
        WHERE p.produto_id = ?
          AND p.status = 'ativo'
        GROUP BY p.produto_id, pr.preco_total
        LIMIT 1
      `;
      const [rows] = await connection.execute(sql, [id]);
      if (!rows.length) {
        res.writeHead(404, { 'Content-Type':'application/json' });
        return res.end(JSON.stringify({ message: 'Produto não encontrado' }));
      }
      res.writeHead(200, { 'Content-Type':'application/json' });
      return res.end(JSON.stringify(rows[0]));
    } catch (err) {
      console.error('❌ Erro em /api/produtos/:id', err);
      res.writeHead(500, { 'Content-Type':'application/json' });
      return res.end(JSON.stringify({ message:'Erro interno' }));
    }
  }


  // --- ROTA: GET /userinfo ---
  if (pathname === '/userinfo' && req.method === 'GET') {
    const auth = req.headers['authorization'] || '';
    const token = auth.split(' ')[1];
    if (!token) {
      res.writeHead(401, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ message: 'Não autorizado' }));
    }
    try {
      const decoded = jwt.verify(token, secretKey);
      // envia só o nome e o id
      res.writeHead(200, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ id: decoded.id, nome: decoded.nome }));
    } catch (err) {
      res.writeHead(401, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ message: 'Token inválido' }));
    }
  }

  // depois das rotas /login, /cadastro e /api/produtos
//  ----------------------------------------------

// Helper: extrai e valida JWT, retorna decoded ou lança erro
async function getUserFromToken(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.split(' ')[1];
  if (!token) throw { status: 401, message: 'Não autorizado' };
  try {
    return jwt.verify(token, secretKey);
  } catch {
    throw { status: 401, message: 'Token inválido' };
  }
}

// --- ROTA: GET /api/cupons
if (pathname === '/api/cupons' && req.method === 'GET') {
  try {
    const [rows] = await connection.execute(
      'SELECT id_cupom AS id, cupom AS codigo, tipo_de_desconto AS tipo, quantidade_de_desconto AS valor, data_inicio_vigencia, data_fim FROM cupom'
    );
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify(rows));
  } catch (e) {
    res.writeHead(500, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ message: 'Erro ao listar cupons' }));
  }
}

// --- ROTA: GET /cart (lista itens do carrinho do usuário)
if (pathname === '/cart' && req.method === 'GET') {
  try {
    const user = await getUserFromToken(req);
    // busca carrinho do cliente
    const [[{ carrinho_id }]] = await connection.execute(
      'SELECT carrinho_id FROM carrinho WHERE cliente_id = ?', [user.id]
    );
    const [itens] = await connection.execute(
      `SELECT p.produto_id AS id, p.nome, pr.preco_total AS preco, ctp.quantidade
         FROM carrinho_tem_produto ctp
         JOIN produto p ON p.produto_id = ctp.produto_id
         JOIN preco pr ON pr.id_preco = ctp.preco_id_preco
        WHERE ctp.carrinho_carrinho_id = ?`, [carrinho_id]
    );
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify(itens));
  } catch (err) {
    const status = err.status || 500;
    res.writeHead(status, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ message: err.message || 'Erro no carrinho' }));
  }
}

// --- ROTA: POST /cart (adiciona ou incrementa item)
if (pathname === '/cart' && req.method === 'POST') {
  let body = '';
  req.on('data', c => body += c);
  return req.on('end', async () => {
    try {
      const { produto_id, quantidade = 1 } = JSON.parse(body);
      const user = await getUserFromToken(req);
      // pega ou cria carrinho
      const [[c]] = await connection.execute(
        'SELECT carrinho_id FROM carrinho WHERE cliente_id = ?', [user.id]
      );
      let carrinho_id = c?.carrinho_id;
      if (!carrinho_id) {
        const [{ insertId }] = await connection.execute(
          'INSERT INTO carrinho (cliente_id) VALUES (?)', [user.id]
        );
        carrinho_id = insertId;
      }
      // verifica se já tem o produto
      const [[exists]] = await connection.execute(
        'SELECT quantidade, preco_id_preco FROM carrinho_tem_produto WHERE carrinho_carrinho_id = ? AND produto_id = ?',
        [carrinho_id, produto_id]
      );
      if (exists) {
        // atualiza quantidade
        await connection.execute(
          `UPDATE carrinho_tem_produto 
              SET quantidade = quantidade + ? 
            WHERE carrinho_carrinho_id = ? AND produto_id = ?`,
          [quantidade, carrinho_id, produto_id]
        );
      } else {
        // pega preço atual
        const [[pr]] = await connection.execute(
          `SELECT id_preco FROM preco
             WHERE produto_id = ? AND data_inicio_vigencia <= CURDATE()
               AND (data_fim >= CURDATE() OR data_fim IS NULL)
             ORDER BY data_inicio_vigencia DESC LIMIT 1`,
          [produto_id]
        );
        await connection.execute(
          'INSERT INTO carrinho_tem_produto (carrinho_carrinho_id, produto_id, quantidade, preco_id_preco) VALUES (?,?,?,?)',
          [carrinho_id, produto_id, quantidade, pr.id_preco]
        );
      }
      res.writeHead(201, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ message: 'Item adicionado ao carrinho' }));
    } catch (err) {
      const status = err.status || 500;
      res.writeHead(status, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ message: err.message || 'Erro ao adicionar ao carrinho' }));
    }
  });
}

// --- ROTA: DELETE /cart/:produto_id (remove item) ---
if (pathname.startsWith('/cart/') && req.method === 'DELETE') {
  try {
    const user = await getUserFromToken(req);
    const produto_id = pathname.split('/')[2];
    const [[{ carrinho_id }]] = await connection.execute(
      'SELECT carrinho_id FROM carrinho WHERE cliente_id = ?', [user.id]
    );
    await connection.execute(
      'DELETE FROM carrinho_tem_produto WHERE carrinho_carrinho_id = ? AND produto_id = ?',
      [carrinho_id, produto_id]
    );
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ message: 'Item removido' }));
  } catch (err) {
    const status = err.status || 500;
    res.writeHead(status, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ message: err.message || 'Erro ao remover item' }));
  }
}

// --- ROTA ADMIN: CRUD de produtos ---
// Usar header Authorization: Bearer <token> de admin
function ensureAdmin(req) {
  return getUserFromToken(req).then(decoded => {
    if (decoded.role !== 'administrador') {
      throw { status: 403, message: 'Proibido' };
    }
    return decoded;
  });
}

// POST /admin/produtos
if (pathname === '/admin/produtos' && req.method === 'POST') {
  let body = '';
  req.on('data', c => body += c);
  return req.on('end', async () => {
    try {
      await ensureAdmin(req);
      const { nome, descricao, estoque } = JSON.parse(body);
      const [{ insertId }] = await connection.execute(
        'INSERT INTO produto (nome, descricao_produto, quantidade_estoque, status) VALUES (?,?,?,?)',
        [nome, descricao, estoque, 'ativo']
      );
      res.writeHead(201, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ message: 'Produto criado', id: insertId }));
    } catch (err) {
      const status = err.status || 500;
      res.writeHead(status, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ message: err.message || 'Erro admin' }));
    }
  });
}

// PUT /admin/produtos/:id
if (pathname.startsWith('/admin/produtos/') && req.method === 'PUT') {
  let body = '';
  req.on('data', c => body += c);
  return req.on('end', async () => {
    try {
      await ensureAdmin(req);
      const produto_id = pathname.split('/')[2];
      const { nome, descricao, estoque, status } = JSON.parse(body);
      await connection.execute(
        `UPDATE produto
            SET nome=?, descricao_produto=?, quantidade_estoque=?, status=?
          WHERE produto_id = ?`,
        [nome, descricao, estoque, status, produto_id]
      );
      res.writeHead(200, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ message: 'Produto atualizado' }));
    } catch (err) {
      const status = err.status || 500;
      res.writeHead(status, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ message: err.message || 'Erro admin' }));
    }
  });
}

// DELETE /admin/produtos/:id
if (pathname.startsWith('/admin/produtos/') && req.method === 'DELETE') {
  try {
    await ensureAdmin(req);
    const produto_id = pathname.split('/')[2];
    await connection.execute(
      'DELETE FROM produto WHERE produto_id = ?',
      [produto_id]
    );
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ message: 'Produto removido' }));
  } catch (err) {
    const status = err.status || 500;
    res.writeHead(status, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ message: err.message || 'Erro admin' }));
  }
}

  // --- Arquivos estáticos em ./public ---
  const publicDir = path.join(__dirname, 'public');
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(publicDir, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
});

// --- Inicia o servidor ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
