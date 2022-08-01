const db = require('../lib/postgres');
const { log } = require('../../Web/lib/logger');
const app = require('uWebSockets.js').App();

const ControlerCache = require('js-object-cache');

const ReBuildControlerCache = () => {
  return new Promise((resolve, reject) => {
    db.Controler.GetAll().then(function (Controler) {
      ControlerCache.set_object('token', Controler.rows);
      resolve(Controler);
    }
    ).catch(function (err) {
      reject(err);
    }
    );
  });
}

/* You can do app.publish('sensors/home/temperature', '22C') kind of pub/sub as well */
setInterval(() => {
  //console.log('publishing');
  app.publish('client', '22C');
}, 100);

/* Clients route is used for the PlugClients connecting, the PlugsClient will establish a connection to this appliaction. */
/* It will then recive the Plug IPs that are assinged to him and starts sending all avaible data of those Plugs */
app.ws('/client', {

  idleTimeout: 30,
  maxBackpressure: 1024,
  maxPayloadLength: 2048,
  compression: app.DEDICATED_COMPRESSOR_8KB,

  open: (ws) => {
    log.info(`Opened connection by a plug_client`);
    //ws.subscribe('client');
  },

  pong: (ws, message) => {
    ws.ping(message)
  },

  message: (ws, message, isBinary) => {
    /* Date Protocol: {event: String, data_payload: {}} */

    log.info(`Received message: ${Buffer.from(message).toString()}`);

    const message_data = JSON.parse(Buffer.from(message).toString());
    const { event, data_payload } = message_data;

    if (event === 'settings_controler') {
      if (ControlerCache.has(data_payload.token)) {
        ws.send(JSON.stringify({ event: 'settings_controler', data_payload: ControlerCache.get_object(data_payload.token) }));
      } else {
        ReBuildControlerCache().then(function (Controler) {
          if (ControlerCache.has(data_payload.token)) {
            ws.send(JSON.stringify({ event: 'settings_controler', data_payload: ControlerCache.get_object(data_payload.token) }));
          } else {
            ws.send(JSON.stringify({ event: 'failed', data_payload: { error: 'No Controler found' } }));
          }
        }).catch(function (err) {
          console.log(err);
        });

      }
    } else if (event === 'settings_plugs') {

    } else if (event === 'plug_power') {

    } else if (event === 'plug_status') {

    }

    //ws.send(message, isBinary, true);
  }

});

app.ws('/webuser', {

  idleTimeout: 30,
  maxBackpressure: 1024,
  maxPayloadLength: 2048,
  compression: app.DEDICATED_COMPRESSOR_8KB,

  open: (ws) => {
    console.log('WebSocket opened')
    ws.send('Its open: UwU', (error) => {
      if (error) {
        console.log(error)
      }
    });
  },

  /* For brevity we skip the other events (upgrade, open, ping, pong, close) */
  message: (ws, message, isBinary) => {
    /* You can do app.publish('sensors/home/temperature', '22C') kind of pub/sub as well */

    /* Here we echo the message back, using compression if available */
    ws.send(message, isBinary, true);
  }

});

app.get('/*', (res, req) => {
  /* It does Http as well */
  res.writeStatus('200 OK').writeHeader('IsExample', 'Yes').end('Hello there!');

})

module.exports = app