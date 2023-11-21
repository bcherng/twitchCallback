
const tmi = require('tmi.js');

const client = new tmi.Client({
    identity: {
        username: 'kahyogbot',
        password: 'oauth:4dm1ikh4capesl2po4jlap9logf0l4'
    },
    channels: ['kahyo_gms']
});
client.connect().catch(error => {
    console.log(error);
});