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
	'token': "xoxb-11117365730-aPUuJCOsPbZwLrbZdRM58EZW",
	'logging': true,
	'autoReconnect': true
});

slack.reqApi('channels.join',name:'random'},function(data){});

// Slack on EVENT message, send data.
slack.on('message', function(data) {
	// If no text, return.
	if(typeof data.text == 'undefined') return;
	// If someone says 'cake!!' respond to their message with "@user OOH, CAKE!! :cake"
	if(data.text === 'cake') slack.sendMsg(data.channel, "@"+slack.getUser(data.user).name+" OOH, CAKE!! :cake:")

	// If the first character starts with %, you can change this to your own prefix of course.
	if(data.text.charAt(0) === '%') {
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
			case "hello":
				// Send message.
				slack.sendMsg(data.channel, "Oh, hello @"+slack.getUser(data.user).name+" !")
			break;
			
			case "say":
				var say = data.text.split('%say ');
				slack.sendMsg(data.channel, say[1]);
			break;
		}
	}
});
