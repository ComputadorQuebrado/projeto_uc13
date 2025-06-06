const express = require('express');
const app = express();
const { engine } = require('express-handlebars');

const mysql = require('mysql2');

app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
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

app.get('/', (req, res) => {;
    let sql = 'SELECT * FROM produtos';
    conexao.query(sql, function (erro, produtos_qs) {
        if (erro) {
            console.error('Erro ao consultar produtos: ', erro);
            res.status(500).send('Erro ao consultar produtos');
            return;
        }
        res.render('index', {produtos: produtos_qs});
    });
}
);

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

app.listen(8080);