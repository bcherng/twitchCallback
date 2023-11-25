const crypto = require('crypto')
const express = require('express');
const app = express();
const port = 443;
const path = require('path');
const { Client } = require('pg')

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

const client = new Client({
    connectionString: "postgres://default:XFSq74fhtGCp@ep-twilight-field-19232688-pooler.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require",
})

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to the PostgreSQL database');
    } catch (error) {
        console.error('Error connecting to the PostgreSQL database:', error);
    }
}
connectToDatabase();

// Your other functions can now use the connected database
async function initializeDB() {
    try {
        const result = await client.query('CREATE TABLE IF NOT EXISTS ratge_table (id SERIAL PRIMARY KEY,stars INT,results TEXT[],fails TINYINT);');
        console.log('Query result:', result.rows);
    } catch (error) {
        console.error('Error executing PostgreSQL query:', error);
    }
}
initializeDB();

const ratge = {
    stars: 0,
    results: [],
    fails: 0
};

async function updateRatge() {
    try {
        const result = await client.query('UPDATE ratge_table SET stars = $1, results = $2 WHERE id = $3', [ratge.stars, ratge.results, 1]);
        console.log('Query result:', result.rows);
    } catch (error) {
        console.error('Error executing PostgreSQL query:', error);
    }
}

async function alterTable() {
    try {
        const result = await client.query('ALTER TABLE ratge_table ADD COLUMN fails TINYINT');
        console.log('Query result:', result.rows);
    } catch (error) {
        console.error('Error executing PostgreSQL query:', error);
    }
    updateRatge();
}


async function downloadRatge() {
    try {
        const result = await client.query('SELECT stars, results FROM ratge_table where id = $1', [1]);
        ratge.stars = result.rows[0].stars;
        ratge.results = result.rows[0].results;
    } catch (error) {
        console.error('Error executing PostgreSQL query:', error);
    }
}
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
const boomRates = [
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
    0.03,   //16
    0.03,   //17
    0.04,   //18
    0.04,   //19
    0.1,   //20
    0.1,   //21
    0.2,  //22
    0.3,    //23
    0.4,    //24
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

app.get("/results", async (req, res) => {
    downloadRatge();
    res.setHeader('Content-Type', 'application/json');
    res.send(
        {
            entry: ratge.results.length,
            result: ratge.results.slice(-1)
        });
})

app.get("/starforce", async (req, res) => {
    downloadRatge();
    res.setHeader('Content-Type', 'text/plain');
    res.end(ratge.stars.toString());
});

app.post('/starforce', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
        downloadRatge().then(() => {
            let notification = JSON.parse(req.body);
            if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
                console.log("start");
                if (ratge.fails >= 2) {
                    ratge.fails = 0;
                    ratge.stars += 1;
                    ratge.results.push("success");
                    connection.send('PRIVMSG #kahyog :Success(Chance) -> Ratge is now ' + ratge.stars + ' stars');
                } else if (Math.random() <= successRates[ratge.stars]) {
                    ratge.stars += 1;
                    ratge.fails = 0;
                    ratge.results.push("success");
                    connection.send('PRIVMSG #kahyog :Success -> Ratge is now ' + ratge.stars + ' stars');
                } else {
                    if (Math.random() < boomRates[ratge.stars]) {
                        ratge.stars = 12;
                        ratge.fails = 0;
                        ratge.results.push("destroy");
                        connection.send('PRIVMSG #kahyog :Destroyed -> Ratge is back to 12 stars');
                    } else {
                        if (ratge.stars <= 15 || ratge.stars == 20) {
                            ratge.fails = 0;
                            ratge.results.push("failure");
                            connection.send('PRIVMSG #kahyog :Failed(Maintain) -> Ratge is ' + ratge.stars + " stars");
                        } else {
                            ratge.stars -= 1;
                            ratge.results.push("failure");
                            ratge.fails++;
                            connection.send('PRIVMSG #kahyog :Failed(Drop) -> Ratge is now ' + ratge.stars + ' stars');
                        }
                    }
                }
                updateRatge();
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
        });
    } else {
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


module.exports = app;
