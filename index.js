require('newrelic');
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
				slack.sendMsg(data.channel, "Olá, segue abaixo a lista de comandos que eu reconheço. \n `!help` Imprime essa lista de comandos \n `!docs` Imprime lista de atalhos que o Google Docs reconhece \n Digite o comando que dejsa usar:")
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
