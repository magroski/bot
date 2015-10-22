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
											" \n Digite o comando que dejsa usar:")
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
				date = date.split('/');
				date = date[2]+'-'+date[1]+'-'+date[0];
				var reminder = reminderArgs.join(' ');//Unifica os pedaços da mensagem
				var query = dbClient.query("INSERT INTO reminders(username, date, reminder, seen) values($1, $2, $3, 0)", [userName, date, reminder]);
				query.on('end', function() { 
					slack.sendMsg(data.channel,'@'+userName+', seu lembrete "'+reminder+'" foi agendado para :calendar: '+date);
				})
				break; 
			case "lembretes":
				var userName = slack.getUser(data.user).name;
				var currentTime = new Date();
				var currentDate = currentTime.getFullYear()+'-'+(currentTime.getMonth()+1)+'-'+currentTime.getDate();
				var query = dbClient.query("SELECT * FROM reminders WHERE username = $1 AND seen = 0 AND date >= $2 ORDER BY date ASC", [userName,currentDate]);
				var results = '';
		        query.on('row', function(row) {
		        	var rowDate = new Date(row.date);
		        	var formattedDate = rowDate.getFullYear()+'/'+(rowDate.getMonth()+1)+'/'+rowDate.getDate();
					results += ':calendar:'+formattedDate+' *'+row.reminder+'*\n';
	    	    });
	    	    query.on('end', function() { 
					slack.sendMsg(data.channel,results);
				})
				break;
		}
	}
});

slack.on('channel_joined', function(data){
	slack.sendMsg(data.channel.id, "Olá, sou o bot de ajuda da Talentify. Envie `!help` aqui ou em uma mensagem privada para ter acesso à minha lista de comandos")
});

//var birthdays = [];
//birthdays['lucas'] = '21/10';

slack.on('presence_change', function(data){
	console.log('mudou presença')
	/*
	var currentTime = new Date();
	var currentHour = currentTime.getHours()-2;
	var currentDate = currentTime.getDate()+'/'+(currentTime.getMonth()+1);
	if(data.presence=='active' && currentHour < 12){
		var userName = slack.getUser(data.user).name;
		if( typeof birthdays[userName] != typeof undefined && birthdays[userName] == currentDate ){
			slack.sendMsg('general','Feliz aniversário @'+userName+' :cake:');
		}
	}
	*/
});
