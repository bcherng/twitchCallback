const crypto = require('crypto')
const express = require('express');
const app = express();
const port = 443;
const path = require('path');
const ratge = {
    stars: 0,
    lastResult: "none"
};
let accessToken = process.env.token;
let refreshToken = process.env.refreshToken;
const client_id = process.env.clientID;
const client_secret = process.env.clientSecret;

const successRates = [
    0.95,   //0
    0.9,    //1
    0.85,   //2
    0.85,   //3
    0.8,    //4
    0.75,   //5
    0.70,   //6
    0.65,   //7
    0.60,   //8
    0.55,   //9
    0.50,   //10
    0.45,   //11
    0.40,   //12
    0.35,   //13
    0.30,   //14
    0.30,   //15
    0.30,   //16
    0.30,   //17
    0.30,   //18
    0.30,   //19
    0.30,   //20
    0.30,   //21
    0.03,   //22
    0.02,    //23
    0.01,    //24
];
const decreaseRates = [
    0,   //0
    0,    //1
    0,   //2
    0,   //3
    0,    //4
    0,   //5
    0,   //6
    0,   //7
    0,   //8
    0,   //9
    0,   //10
    0,   //11
    0,   //12
    0,   //13
    0,   //14
    0,   //15
    0.97,   //16
    0.97,   //17
    0.96,   //18
    0.97,   //19
    0,   //20
    0.9,   //21
    0.8,   //22
    0.7,    //23
    0.6,    //24
]

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
  

let counter = 0;

app.use('/static', express.static(path.join(__dirname, 'public')))

// Notification request headers
const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id'.toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp'.toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature'.toLowerCase();
const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';
// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = 'sha256=';

app.use(express.raw({          // Need raw message body for signature verification
    type: 'application/json'
}))

app.get("/", (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end("The counter is: " + counter);
})

app.get("/animation", (req, res) => {
  res.sendFile(`${__dirname}/${ratge.lastResult}.gif`);
})

app.get("/starforce", (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.end(ratge.stars.toString());
})

app.post('/starforce', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
        let notification = JSON.parse(req.body);
        if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
            console.log("start");
            if (Math.random() < successRates[ratge.stars]) {
                ratge.stars += 1;
                ratge.lastResult = "success";
                connection.send('PRIVMSG #kahyo_gms :Sucess -> Ratge is now ' + ratge.stars + ' stars');
            } else if (Math.random() < decreaseRates[ratge.stars]) {
                ratge.stars -= 1;
                ratge.lastResult = "failure";
                connection.send('PRIVMSG #kahyo_gms :Failed(Drop) -> Ratge is now ' + ratge.stars + ' stars');
            } else if (decreaseRates[ratge.stars] == 0) {
                connection.send('PRIVMSG #kahyo_gms :Failed(Maintain) Ratge is ' + ratge.stars + " stars");
            } else {
                ratge.stars = 12; 
                ratge.lastResult = "destroy";
                connection.send('PRIVMSG #kahyo_gms :Destroyed -> Ratge is back to 12 stars');
            }
            console.log("finish");
            res.sendStatus(204);
        } else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
            res.set('Content-Type', 'text/plain').status(200).send(notification.challenge);
        }
        else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
            res.sendStatus(204);

            console.log(`${notification.subscription.type} notifications revoked!`);
            console.log(`reason: ${notification.subscription.status}`);
            console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
        }
        else {
            res.sendStatus(204);
            console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        }
    }
    else {
        console.log('403');    // Signatures didn't match.
        res.sendStatus(403);
    }
})

app.post('/eventsub', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
        console.log("signatures match");

        // Get JSON object from body, so you can process the message.
        let notification = JSON.parse(req.body);

        if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
            counter += 1;

            console.log(`Event type: ${notification.subscription.type}`);
            console.log(JSON.stringify(notification.event, null, 4));

            res.sendStatus(204);
        }
        else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
            res.set('Content-Type', 'text/plain').status(200).send(notification.challenge);
        }
        else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
            res.sendStatus(204);

            console.log(`${notification.subscription.type} notifications revoked!`);
            console.log(`reason: ${notification.subscription.status}`);
            console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
        }
        else {
            res.sendStatus(204);
            console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        }
    }
    else {
        console.log('403');    // Signatures didn't match.
        res.sendStatus(403);
    }
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})


function getSecret() {
    // TODO: Get secret from secure storage. This is the secret you pass 
    // when you subscribed to the event.
    return process.env.secret;;
}

// Build the message used to get the HMAC.
function getHmacMessage(request) {
    return (request.headers[TWITCH_MESSAGE_ID] +
        request.headers[TWITCH_MESSAGE_TIMESTAMP] +
        request.body);
}

// Get the HMAC.
function getHmac(secret, message) {
    return crypto.createHmac('sha256', secret)
        .update(message)
        .digest('hex');
}

// Verify whether our hash matches the hash that Twitch passed in the header.
function verifyMessage(hmac, verifySignature) {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
}




module.exports = app;


// async function getToken() {
//     try {
//         const body = new URLSearchParams({
//             'grant_type': 'refresh_token',
//             'refresh_token': refreshToken,
//             'client_id': client_id,
//             'client_secret': client_secret
//         });
//         const response = await fetch("https://id.twitch.tv/oauth2/token", {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded',
//             },
//             body: body
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }

//         const data = await response.json(); // Assuming the response is in JSON format
//         return data;
//     } catch (error) {
//         console.error('Error refreshing token:', error);
//         // Handle the error, e.g., log it or take appropriate action
//     }
// }