require('newrelic');
var pg = require('pg');
var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000
var server = http.createServer(app)
server.listen(port)

// Requiring our module
var slackAPI = require('slackbotapi');

// Starting
var slack = new slackAPI({
	'token': process.env.SLACK_KEY,
	'logging': true,
	'autoReconnect': true
});

var connectionString = process.env.DATABASE_URL;
var dbClient = new pg.Client(connectionString);
dbClient.connect();

pg.connect(process.env.DATABASE_URL, function(err, client) {
	if (err) throw err;
	console.log('Connected to postgres! Getting data...');
	client
		.query('SELECT * FROM reminders;')
		.on('row', function(row) {
			console.log(JSON.stringify(row));
		});
});

//slack.reqAPI('channels.join',{name:'suporte_ti'},function(data){});

// Slack on EVENT message, send data.
slack.on('message', function(data) {
	// If no text, return.
	if(typeof data.text == 'undefined') return;

	// If the first character starts with %, you can change this to your own prefix of course.
	if(data.text.charAt(0) === '!') {
		// Split the command and it's arguments into an array
		var command = data.text.substring(1).split(' ');

		// If command[2] is not undefined use command[1] to have all arguments in comand[1]
		if (typeof command[2] != "undefined") {
			for (var i = 2; i < command.length; i++) {
				command[1] = command[1] + ' ' + command[i];
			}
		}

		// Switch to check which command has been requested.
		switch (command[0].toLowerCase()) {
			// If hello
			case "help":
				slack.sendMsg(data.channel, "Olá, segue abaixo a lista de comandos que eu reconheço."+
											" \n `!help` Imprime essa lista de comandos"+
											" \n `!docs` Imprime lista de atalhos que o Google Docs reconhece"+
											" \n `!lembrar` Salva um lembrete pessoal. Usar no formato `!lembrar dd/mm/aaaa mensagem`. Seus lembretes serão enviados automaticamente na data indicada"+
											" \n `!lembretes` Exibe a sua lista pessoal de lembretes futuros"+
											" \n Estou disponível no canal #anuncios_tfy, #suporte_ti e através de chat privado (Direct Messages no menu esquerdo)"+
											" \n Lembre que sempre responderei na mesma tela onde fui chamado."+
											" \n Digite o comando que deseja usar:")
				break;
			case "docs":
				slack.sendMsg(data.channel, "`Ctrl+F` Procura texto no arquivo \n"+
											"`Ctrl + Home` Retorna ao topo do seu documento \n"+
											"`Ctrl + B` Negrito \n"+
											"`Ctrl + E` Centraliza o alinhamento \n"+
											"`Ctrl + L` Voltar para o alinhamento à esquerda \n"+
											"`Ctrl + M` Inserir comentário \n"+
											"`Ctrl + H` Substituir \n"+
											"`Ctrl + End ` Ir para a última célula na região de dados \n"+
											"`Ctrl + Home` Ir para a primeira célula na região de dados \n"+
											"`Shift + barra de espaço ` Selecione linha inteira \n"+
											"`Ctrl + barra de espaço ` Selecione coluna inteira \n"+
											"`Ctrl + Z ` Desfazer \n"+
											"`Ctrl + Y` Refazer \n"+
											"`Ctrl + J ` justificar \n"+
											"`Ctrl + Shift + L ` lista de marcadores \n"+
											"`Ctrl + Shift + Espaço` Inserir espaço sem quebras \n"+
											"`Page Down ` Mover uma tela abaixo \n"+
											"`Ctrl + Shift + F` Tela cheia \n"+
											"`Page Up ` Mover uma tela acima \n"+
											"`Ctrl + Espaço` Remover a formatação")
				break;
			case "lembrar":
				if(typeof command[1] == typeof undefined){
					slack.sendMsg(data.channel,'Ops, parece que você esqueceu de algum parametro.\n Para salvar um lembrete, use `!lembrar dd/mm/aaaa texto do lembrete`\n Para visualizar seus lembretes salvos, use `!lembretes`')
					return;
				}
				var userName = slack.getUser(data.user).name;
				var reminderArgs = command[1].split(' '); //Pega os argumentos passados na mensagem e explode por espaço em branco
				var date = reminderArgs[0]; //Pega o primeiro argumento que é a data
				reminderArgs.shift(); //Remove a data do array de argumentos restantes
				if(reminderArgs.length==0){ //Verifica se sobrou algum argumento (espera-se que sim, pois precisamos de uma mensagem)
					slack.sendMsg(data.channel,'Ops, parece que você esqueceu de algum parametro.\n Para salvar um lembrete, use `!lembrar dd/mm/aaaa texto do lembrete`\n Para visualizar seus lembretes salvos, use `!lembretes`')
					return;
				}
				if(date.match('[0-9][0-9]/[0-9][0-9]/[0-9][0-9][0-9][0-9]') == null){
					slack.sendMsg(data.channel,'Ops, tem algo errado com os parametros que você me enviou.\n Para salvar um lembrete, use `!lembrar dd/mm/aaaa texto do lembrete`\n Para visualizar seus lembretes salvos, use `!lembretes`')
					return;
				}
				var originalDate = date;
				date = date.split('/');
				date = date[2]+'-'+date[1]+'-'+date[0];
				var reminder = reminderArgs.join(' ');//Unifica os pedaços da mensagem
				var query = dbClient.query("INSERT INTO reminders(username, date, reminder) values($1, $2, $3)", [userName, date, reminder]);
				query.on('end', function() {
					slack.sendMsg(data.channel,'@'+userName+', seu lembrete "'+reminder+'" foi agendado para :calendar: '+originalDate+'. Irei te lembrar no momento que você ficar online nessa data.');
				})
				break;
			case "lembretes":
				var userName = slack.getUser(data.user).name;
				var currentTime = new Date();
				var currentDate = currentTime.getFullYear()+'-'+(currentTime.getMonth()+1)+'-'+currentTime.getDate();
				var query = dbClient.query("SELECT * FROM reminders WHERE username = $1 AND date >= $2 ORDER BY date ASC", [userName,currentDate]);
				var results = '';
		        query.on('row', function(row) {
		        	var rowDate = new Date(row.date);
		        	var formattedDate = rowDate.getDate()+'/'+(rowDate.getMonth()+1)+'/'+rowDate.getFullYear();
					results += ':calendar: '+formattedDate+' *'+row.reminder+'*\n';
	    	    });
	    	    query.on('end', function() {
					slack.sendMsg(data.channel,results);
				})
				break;
			case "comunicado":
				if(typeof command[1] == typeof undefined){
					slack.sendMsg(data.channel,'Ops, parece que você esqueceu de algum parametro.\n Para salvar um comunicado, use `!comunicado dd/mm/aaaa texto do comunicado`')
					return;
				}
				var reminderArgs = command[1].split(' '); //Pega os argumentos passados na mensagem e explode por espaço em branco
				var date = reminderArgs[0]; //Pega o primeiro argumento que é a data
				reminderArgs.shift(); //Remove a data do array de argumentos restantes
				if(reminderArgs.length==0){ //Verifica se sobrou algum argumento (espera-se que sim, pois precisamos de uma mensagem)
					slack.sendMsg(data.channel,'Ops, parece que você esqueceu de algum parametro.\n Para salvar um comunicado, use `!comunicado dd/mm/aaaa texto do comunicado`')
					return;
				}
				if(date.match('[0-9][0-9]/[0-9][0-9]/[0-9][0-9][0-9][0-9]') == null){
					slack.sendMsg(data.channel,'Ops, tem algo errado com os parametros que você me enviou.\n Para salvar um comunicado, use `!comunicado dd/mm/aaaa texto do comunicado`')
					return;
				}
				var originalDate = date;
				date = date.split('/');
				date = date[2]+'-'+date[1]+'-'+date[0];
				var reminder = reminderArgs.join(' ');//Unifica os pedaços da mensagem
				var query = dbClient.query("INSERT INTO bulletin(date, reminder, sent) values($1, $2, $3)", [date, reminder, 0]);
				query.on('end', function() {
					slack.sendMsg(data.channel,'O comunicado "'+reminder+'" foi agendado para :calendar: '+originalDate);
				})
				break;
		}
	}
});

slack.on('channel_joined', function(data){
	slack.sendMsg(data.channel.id, "Olá, sou o bot da Talentify. Envie `!help` aqui ou em uma mensagem privada para ter acesso à minha lista de comandos")
});

var birthdays = [];
birthdays['lozgabriel'] = '05/10';
birthdays['marcus'] = '23/10';
birthdays['bruna.barbosa'] = '23/10';
birthdays['caroline.silva'] = '25/10';
birthdays['jessica.dias'] = '25/11';

slack.on('presence_change', function(data){
	if(data.presence=='active'){
		var userName = slack.getUser(data.user).name;
		var query = dbClient.query("SELECT last_seen FROM access WHERE username = $1", [userName]);
		var lastSeen;
		query.on('row',function(row){
			lastSeen = new Date(row.last_seen)
		});
		query.on('end',function(){
			var currentTime = new Date();
			var currentDayMonth = currentTime.getDate()+'/'+(currentTime.getMonth()+1);
			var lastSeenDayMonth = lastSeen.getDate()+'/'+(lastSeen.getMonth()+1);
			if(lastSeenDayMonth != currentDayMonth){
				//Birthday logic
				if(typeof birthdays[userName] != typeof undefined && birthdays[userName] == currentDayMonth){
					slack.sendMsg('C03GNTC0P',':tada: Feliz aniversário @'+userName+'!! :cake: :balloon:');
				}
				//Reminders logic
				var currentDate = currentTime.getFullYear()+'-'+(currentTime.getMonth()+1)+'-'+currentTime.getDate();
				var noteQuery = dbClient.query("SELECT * FROM reminders WHERE username = $1 AND date = $2", [userName,currentDate]);
				var results = '';
				noteQuery.on('row',function(row){
					var rowDate = new Date(row.date);
					var formattedDate = rowDate.getDate()+'/'+(rowDate.getMonth()+1)+'/'+rowDate.getFullYear();
					results += ':calendar: '+formattedDate+' *'+row.reminder+'*\n';
				});
				noteQuery.on('end',function(){
					if(results != ''){
						slack.sendPM(userName,'Seus lembretes de hoje são:\n'+results);
					}
				});
				//Updating table to avoid duplicated messages
				dbClient.query("UPDATE access SET last_seen = $1 WHERE username = $2", [currentDate,userName]);
			}
			//Bulletin logic
			if(userName=='lucas' || userName=='kelly' || userName=='thais'){
				var bulletinQuery = dbClient.query("SELECT * FROM bulletin WHERE date = $1 AND sent = 0", [currentDate]);
				bulletinQuery.on('row',function(row){
					slack.sendMsg('C03GNTC0P',row.reminder);
				});
				bulletinQuery.on('end',function(){
					dbClient.query('UPDATE bulletin SET sent = 1 WHERE date = $1', [currentDate]);
				});
			}
		});
	}
});
