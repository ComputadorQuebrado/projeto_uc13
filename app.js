const express = require('express');
const app = express();
const { engine } = require('express-handlebars');

app.use(express.urlencoded({ extended: true }));

const mysql = require('mysql2');

app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'));
app.use('/static', express.static(__dirname + '/static'));

const session = require('express-session');
const bcrypt = require('bcrypt');

app.use (session({
    secret: 'chave-secreta-ultra-segura',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } //1 hora
}));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.engine('handlebars', engine({
    defaultLayout: 'main',
    partialsDir: __dirname + '/views/partials',
    helpers: {
        ifCond: function (v1, operator, v2, options) {
            switch (operator) {
                case '==':
                    return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!=':
                    return (v1 != v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        }
    }
}));
app.set('views', './views');

const conexao = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'senac',
    port: 3306,
    database: 'ecommerce_pc'
});

conexao.connect(function(erro){
    if (erro){
        console.error('Erro ao conectar ao banco de dados: ', erro);
        return;
    }
    console.log('Conexão com o banco de dados estabelecida com sucesso');
});

app.get('/home', (req,res) => {
    if (!req.session.usuario) {
        return('/login');
    }
    res.render('home_user', { usuario: req.session.usuario });
});

app.get('/login', (req,res) => {
    if (req.session.usuario) {
        return res.redirect('/home');
    }
    res.render('login');
});

app.post('/login', (req,res) => {
    const { email, senha } = req.body;
    const sql = 'SELECT * FROM usuarios WHERE email = ?';

    conexao.query(sql, [email], (erro, resultado) => {
        if (erro || resultado.length === 0) {
            return res.status(401).send('E-mail não encontrado.');
        }

        const usuario = resultado [0];

        bcrypt.compare(senha, usuario.senha, (erroHash,senhaOk) => {
            if (erroHash || !senhaOk) {
                return res.status(401).send('Senha incorreta.');
            }

            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                tipo: usuario.tipo,
                email: usuario.email
            };

            res.redirect('/home');
        });
    });
});

app.get('/logout', (req,res) => {
    req.session.destroy((erro) => {
        if(erro) {
            console.error('Erro ao encerrar sessão: ', erro);
            return res.status(500).send('Erro ao encerrar sessão.');
        }
        res.redirect('/login');
    });
});

app.get('/', (req, res) => {;
    let sql = 'SELECT * FROM produtos';
    conexao.query(sql, function (erro, produtos_qs) {
        if (erro) {
            console.error('Erro ao consultar produtos: ', erro);
            res.status(500).send('Erro ao consultar produtos');
            return;
        }
        res.render('index', {produtos: produtos_qs, usuario: req.session.usuario });
    });
}
);

app.get('/produto/categoria/:id', (req, res) => {
    const id = req.params.id;

    let sql = `SELECT produtos.*, categorias.nome as categoria_nome
                FROM produtos
                JOIN categorias
                ON produtos.categoria_id = categorias.id
                WHERE produtos.categoria_id = ?`;
    
    conexao.query(sql,[id], function(erro, produto_qs){
        if (erro) {
            console.error('Erro ao consultar produtos: ', erro);
            res.status(500).send('Erro ao consultar produtos');
            return;
        }
        
        res.render('index', { produtos: produto_qs });
    });
});

app.get('/produtos/:id/detalhes', (req,res)=>{
    const id = req.params.id;
    const sql = `SELECT produtos.*,
                    categorias.nome AS categoria_nome,
                    categorias.id AS categoria_id
                FROM produtos
                JOIN categorias ON produtos.categoria_id = categorias.id
                WHERE produtos.id = ?
        `;
    conexao.query(sql, [id], function (erro,produto_qs){
        if(erro) {
            console.error('Erro ao consultar produto: ', erro);
            res.status(500).send('Erro ao consultar produto');
            return;
        }
        if(produto_qs.length===0) {
            return res.status(404).send('Produto não encontrado');
        }
        res.render('produto_detalhes', { produto: produto_qs[0] });
    });
});

app.post('/produtos/:id/remover', (req,res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM produtos WHERE id = ?';

    conexao.query(sql, [id], (erro, resultado) => {
        if (erro) {
            console.error('Erro ao apagar o produto: ', erro);
            return res.status(500).send('Erro ao apagar o produto.');
        }
        res.redirect('/');
    });
});

app.post('/produtos/:id/editar', (req,res) => {
    const id = req.params.id;
    const { nome, descricao, preco, estoque, categoria_id } = req.body;

    const sql = `
        UPDATE produtos SET
        nome = ?, descricao = ?, preco = ?, estoque = ?, categoria_id = ?
        WHERE id = ?
    `;
    conexao.query(sql, [nome, descricao, preco, estoque, categoria_id, id], (erro, resultado) => {
        if (erro) {
            console.error('Erro ao atualizar produto: ', erro);
            return res.status(500).send('Erro ao atualizar o produto.');
        }
        res.redirect(`/produtos/${id}/detalhes`);
    });
});

app.get('/produtos/:id/editar', (req,res) => {
    const id = req.params.id;

    const sqlProduto = `
        SELECT produtos.*, categorias.nome AS categoria_nome
        FROM produtos
        JOIN categorias ON produtos.categoria_id = categorias.id
        WHERE produtos.id = ?
    `;

    const sqlCategorias = 'SELECT id, nome FROM categorias';

    conexao.query(sqlProduto, [id], (erro, produto_qs) => {
        if (erro) return res.status(500).send('Erro ao buscar produto.');

        if (produto_qs.length === 0) return res.status(404).send('Produto não encontrado.');

        const produto = produto_qs[0];

        conexao.query(sqlCategorias, (erro2, categorias_qs) => {
            if (erro2) return res.status(500).send('Erro ao buscar categorias.');

            res.render('produto_form', {
                produto,
                categorias: categorias_qs,
                formAction: `/produtos/${id}/editar`
            });
        });
    });
});

app.get('/produtos/add', (req, res) => {
    if (!req.session.usuario || req.session.usuario.tipo !== 'admin') {
        return res.status(403).send('Acesso negado. Somente administradores podem acessar.');
    }
    let sql = 'SELECT * FROM categorias';
    conexao.query(sql, function (erro, categorias_qs){
        if (erro) {
            console.error('Erro ao consultar categorias: ', erro);
            res.status(500).send('Erro ao consultar categorias');
            return;
        }
        res.render('produto_form.handlebars', {categorias: categorias_qs});
    });
});

app.post('/produtos/add', (req, res) => {
    if (!req.session.usuario || req.session.usuario.tipo !== 'admin') {
        return res.status(403).send('Acesso negado. Somente administradores podem acessar.');
    }
    const {nome, descricao, preco, estoque, categoria_id } = req.body;

    const sql = `
        INSERT INTO produtos (nome, descricao, preco, estoque, categoria_id)
        VALUES (?,?,?,?,?)
    `;

    conexao.query(sql, [nome, descricao, preco, estoque, categoria_id], (erro, resultado) => {
        if (erro) {
            console.error('Erro ao inserir produto: ', erro);
            return res.status(500).send('Erro ao adicionar produto.');
        }
        res.redirect('/');
    });
});

app.get('/categorias', (req, res) => {
    let sql = 'SELECT * FROM categorias';
    conexao.query(sql, function (erro, categorias_qs){
        if (erro) {
            console.error('Erro ao consultar categorias: ', erro);
            res.status(500).send('Erro ao consultar categorias');
            return;
        }
        res.render('categorias.handlebars', {categorias: categorias_qs});
    });
});

app.get('/categorias/add', (req, res) => {
    let sql = 'SELECT * FROM categorias';
    conexao.query(sql, function (erro, categorias_qs){
        if (erro) {
            console.error('Erro ao consultar categorias: ', erro);
            res.status(500).send('Erro ao consultar categorias');
            return;
        }
        res.render('adicionarcategorias.handlebars', {categorias: categorias_qs});
    });
});

app.post('/categorias/add', (req, res) => {
    const {nome, descricao} = req.body;

    const sql = `
        INSERT INTO categorias (nome, descricao)
        VALUES (?,?)
    `;

    conexao.query(sql, [nome, descricao], (erro, resultado) => {
        if (erro) {
            console.error('Erro ao inserir categoria: ', erro);
            return res.status(500).send('Erro ao adicionar categoria.');
        }
        res.redirect('/categorias');
    });
});

app.get('/clientes', (req, res) => {;
    let sql = 'SELECT * FROM clientes';
    conexao.query(sql, function (erro, clientes_qs) {
        if (erro) {
            console.error('Erro ao consultar clientes: ', erro);
            res.status(500).send('Erro ao consultar clientes');
            return;
        }
        res.render('clientes', {clientes: clientes_qs});
    });
}
);

app.get('/clientes/add', (req, res) => {
    res.render('usuario_form');
});

app.post('/clientes/cadastrar', (req, res) => {
    const {nome, email, senha, endereco } = req.body;
    
    bcrypt.hash(senha, 10, (erro, hash) => {
        if (erro) {
            console.error('Erro ao criptografar a senha: ', erro);
            return res.status(500).send('Erro interno no servidor.');
        }
        const sqlUsuario = 'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)';
        conexao.query(sqlUsuario, [nome, email, hash, 'comum'], (erro, resultado) => {
            if (erro) {
                console.error('Erro ao inserir usuário: ', erro);
                return res.status(500).send('Erro ao cadastrar usuário.');
            }

            const usuario_id = resultado.insertId;
            const sqlCliente = 'INSERT INTO clientes (nome, endereco, usuario_id) VALUES (?, ?, ?)';
            conexao.query(sqlCliente, [nome, endereco, usuario_id], (erro2) => {
                if (erro2) {
                    console.error('Erro ao inserir cliente: ', erro2);
                    return res.status(500).send('Erro ao cadastrar cliente.');
                }
                res.redirect('/');
            });
        });
    });
});

app.listen(8080);