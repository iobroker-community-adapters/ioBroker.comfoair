/**
 * comfoair adapter
 */

/* jshint -W097 */ // jshint strict:false
/*jslint node: true */
'use strict';

const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
let adapter;
var DeviceIpAdress;
var port;
var net = require('net');
var hexout = [];
var buffarr = [];
var buff;
var cmdi;
var statTemp = [0x07, 0xF0, 0x00, 0xD1, 0x00, 0x7E, 0x07, 0x0F];
var statVent = [0x07, 0xF0, 0x00, 0xCD, 0x00, 0x7A, 0x07, 0x0F];
var statBetrH = [0x07, 0xF0, 0x00, 0xDD, 0x00, 0x8A, 0x07, 0x0F];
var statByp = [0x07, 0xF0, 0x00, 0x0D, 0x00, 0xBA, 0x07, 0x0F];
var statcmd = [statTemp, statVent, statBetrH, statByp];
var statcmdi = [
  [0x07, 0xF0, 0x00, 0xD1, 0x00, 0x7E, 0x07, 0x0F],
  [0x07, 0xF0, 0x00, 0xCD, 0x00, 0x7A, 0x07, 0x0F],
  [0x07, 0xF0, 0x00, 0xDD, 0x00, 0x8A, 0x07, 0x0F],
  [0x07, 0xF0, 0x00, 0x0D, 0x00, 0xBA, 0x07, 0x0F]
];
var statcmdS = ["statTemp", "statVent", "statBetrH", "statByp"];
var statcmdL = statcmdi.length;
var calli = 0;
var callval;

let polling;
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'comfoair'
    });

    adapter = new utils.Adapter(options);


// when adapter shuts down
adapter.on('unload', function(callback) {
  try {
    clearInterval(polling);
    adapter.log.info('[END] Stopping comfoair adapter...');
    adapter.setState('info.connection', false, true);
    callback();
  } catch (e) {
    callback();
  }
});

// is called if a subscribed object changes
adapter.on('objectChange', function(id, obj) {
  // Warning, obj can be null if it was deleted
  adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function(id, state) {
  // Warning, state can be null if it was deleted
  adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

  // you can use the ack flag to detect if it is status (true) or command (false)
  if (state && !state.ack) {
    adapter.log.info('ack is not set!');
  }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function(obj) {
  if (typeof obj === 'object' && obj.message) {
    if (obj.command === 'send') {
      // e.g. send email or pushover or whatever
      adapter.log('send command');

      // Send response in callback if required
      if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    }
  }
});

// is called when databases are connected and adapter received configuration.
adapter.on('ready', function() {
  if (adapter.config.host) {
    adapter.log.info('[START] Starting comfoair adapter');
    adapter.setState('info.connection', true, true);
    main();
  } else adapter.log.warn('[START] No IP-address set');
});

return adapter;
} // endStartAdapter


function main() {
  // Vars
  DeviceIpAdress = adapter.config.host;
  port = adapter.config.port;


  const pollingTime = adapter.config.pollInterval || 300000;
  adapter.log.debug('[INFO] Configured polling interval: ' + pollingTime);
  adapter.log.debug('[START] Started Adapter with: ' + adapter.config.host);

  callval = setInterval(callvalues, 2000);

  if (!polling) {
    polling = setTimeout(function repeat() { // poll states every [30] seconds
      callval = setInterval(callvalues(calval), 2000); //DATAREQUEST;
      setTimeout(repeat, pollingTime);
    }, pollingTime);
  } // endIf

  // all states changes inside the adapters namespace are subscribed
  adapter.subscribeStates('*');

} // endMain

function callvalues() {
  hexout = statcmdi[calli];
  adapter.log.debug(hexout);
  callcomfoair(hexout);
  calli++;
  if (calli == statcmdL) {
    clearInterval(callval);
  }
} //end callvalues


function callcomfoair(hexout) {
  var client = new net.Socket();

  client.connect(port, DeviceIpAdress, function() { //Connection Data ComfoAir
    adapter.log.debug('Connected');
    adapter.log.debug(hexout);
    var msgbuf = new Buffer(hexout);
    var hexoutarr = [...msgbuf];
    adapter.log.debug("out " + msgbuf.toString('hex'));
    adapter.log.debug("outarr: " + hexoutarr);
    client.write(msgbuf);

  });

  client.on('data', function(data) {
    var buff = new Buffer(data, 'utf8');
    adapter.log.debug('Received: ' + buff.toString('hex'));
    buffarr = [...buff];
    adapter.log.debug('Received arr: ' + buffarr);
    readComfoairData(buffarr);
    client.destroy(); // kill client after server's response

  });

  client.on('close', function() {


    adapter.log.debug('Connection closed');
  });
} //end callcomfoair

function readComfoairData(buffarr) {
adapter.log.debug("Verarbeite Daten");
  var cmd = buffarr[5];
  switch (cmd) {
    case 210:
      adapter.log.debug(cmd + " : lese Temperaturwerte");
      adapter.setState('temperature.statcomfort', ((buffarr[7] / 2) - 20), true);
      adapter.setState('temperature.AUL', ((buffarr[8] / 2) - 20), true);
      adapter.setState('temperature.ZUL', ((buffarr[9] / 2) - 20), true);
      adapter.setState('temperature.ABL', ((buffarr[10] / 2) - 20), true);
      adapter.setState('temperature.FOL', ((buffarr[11] / 2) - 20), true);
      adapter.setState('temperature.FOL', ((buffarr[11] / 2) - 20), true);
      break;
    case 206:
      adapter.log.debug(cmd + " : lese Ventilatorstatus");
      adapter.setState('status.ventABL', buffarr[13], true);
      adapter.setState('status.ventZUL', buffarr[14], true);
      adapter.setState('status.statstufe', buffarr[15], true);
      break;
    case 222:
      adapter.log.debug(cmd + " : lese Betriebsstunden - noch zu erstellen");
      break;
    case 14:
      adapter.log.debug(cmd + " : lese Status Bypass - noch zu erstellen");
      break;


  }
} //end readComfoairData

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} // endElse
