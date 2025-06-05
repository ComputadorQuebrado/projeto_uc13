const express = require('express');
const app = express();
const { engine } = require('express-handlebars');

const mysql = require('mysql2');

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
    res.render('teste');
}
);

app.listen(8080);