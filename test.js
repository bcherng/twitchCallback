const WebSocket = require('websocket').w3cwebsocket;

const twitchWebSocketUrl = 'wss://irc-ws.chat.twitch.tv:443';
const twitchUsername = 'kahyogbot';
const twitchOAuthToken = 'oauth:4dm1ikh4capesl2po4jlap9logf0l4';

const connection = new WebSocket(twitchWebSocketUrl);

connection.onopen = () => {
  console.log('WebSocket Connection Opened');

  // Send PASS and NICK commands to authenticate with Twitch
  connection.send(`PASS ${twitchOAuthToken}`);
  connection.send(`NICK ${twitchUsername}`);
};

connection.onerror = (error) => {
  console.error(`WebSocket Error: ${error}`);
};

connection.onmessage = (event) => {
    connection.send('PRIVMSG #kahyo_gms :This is a sample message');
    if (event.type === 'message') {
      const message = event.data;
  
      if (message.startsWith('PING')) {
        // Respond to PING with PONG to keep the connection alive
        connection.send('PONG :tmi.twitch.tv');
      } else {
        // Handle Twitch chat messages here
        console.log('Received message:', message);
      }
    }
  };
  

connection.onclose = () => {
    console.log('WebSocket Connection Closed');
  };