/**
 * comfoair adapter
 */

/* jshint -W097 */ // jshint strict:false
/*jslint node: true */
'use strict';

const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
let adapter;
var deviceIpAdress;
var port;
var net = require('net');
var hexout = [];
var buffarr = [];
var buff;

var statcmdi = [
  [0x07, 0xF0, 0x00, 0xD1, 0x00, 0x7E, 0x07, 0x0F], //Temperaturen
  [0x07, 0xF0, 0x00, 0xCD, 0x00, 0x7A, 0x07, 0x0F], //Ventilatorenstati
  [0x07, 0xF0, 0x00, 0xDD, 0x00, 0x8A, 0x07, 0x0F], //Betriebsstunden
  [0x07, 0xF0, 0x00, 0x0D, 0x00, 0xBA, 0x07, 0x0F], //Status Bypass
  [0x07, 0xF0, 0x00, 0xC9, 0x00, 0x76, 0x07, 0x0F]
];
var setfanstate = [
  [0x07, 0xF0, 0x00, 0x99, 0x01, 0x01, 0x48, 0x07, 0x0F], //Stufe abwesend
  [0x07, 0xF0, 0x00, 0x99, 0x01, 0x02, 0x49, 0x07, 0x0F], //Stufe niedrig
  [0x07, 0xF0, 0x00, 0x99, 0x01, 0x03, 0x4A, 0x07, 0x0F], //Stufe mittel
  [0x07, 0xF0, 0x00, 0x99, 0x01, 0x04, 0x4B, 0x07, 0x0F] //Stufe hoch
];
var setcomfotemp = [0x07, 0xF0, 0x00, 0xD3, 0x01, 0x14, 0x48, 0x07, 0x0F]; //Komforttemperatur setzen
var setreset = [0x07, 0xF0, 0x00, 0xDB, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0x0F];
var setvent = [0x07, 0xF0, 0x00, 0xCF, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0x0F]; //Ventilatorstufen setzen
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

    try {
      adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
      //adapter.log.debug("Adapter=" + adapter.toString());

      if (!id || state.ack) return; // Ignore acknowledged state changes or error states
      id = id.substring(adapter.namespace.length + 1); // remove instance name and id
      state = state.val;
      adapter.log.debug("id=" + id);
      switch (id) {
        case "control.stufe":
          adapter.log.debug("Setzte Stufe: " + state);
          callcomfoair(setfanstate[state - 1]);
          break;

        case "control.comfort":
          adapter.log.warn("Setze Komforttemperatur auf: " + state + "°C");
          setcomfotemp[5] = ((state + 20) * 2);
          setcomfotemp[6] = parseInt(checksumcmd(setcomfotemp), 16);
          callcomfoair(setcomfotemp);
          break;

        case "control.reset.filterh":
          if (state == true) {
            adapter.log.warn("Setze Betriebsstunden Filter zurück");
            setreset[8] = 0x01;
            setreset[9] = parseInt(checksumcmd(setreset), 16);
            callcomfoair(setreset);
            setreset = [0x07, 0xF0, 0x00, 0xDB, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0x0F]
          }
          break;

        default:
          adapter.log.warn("Befehl nicht erkannt");

      }
      if (id.slice(0, 14) == "control.setvent") {
        adapter.log.warn("Setze Ventilationsstufen");
        adapter.getState("control.setvent.ABLabw", function(err, state) {
          setvent[5] = state.val;
        });
        adapter.getState("control.setvent.ABL1", function(err, state) {
          setvent[6] = state.val;
        });
        adapter.getState("control.setvent.ABL2", function(err, state) {
          setvent[7] = state.val;
        });
        adapter.getState("control.setvent.ZULabw", function(err, state) {
          setvent[8] = state.val;
        });
        adapter.getState("control.setvent.ZUL1", function(err, state) {
          setvent[9] = state.val;
        });
        adapter.getState("control.setvent.ZUL2", function(err, state) {
          setvent[10] = state.val;
        });
        adapter.getState("control.setvent.ABL3", function(err, state) {
          setvent[11] = state.val;
        });
        adapter.getState("control.setvent.ZUL3", function(err, state) {
          setvent[12] = state.val;
        });
        setTimeout(callcomfoair(setvent), 1000);
      }

      // you can use the ack flag to detect if it is status (true) or command (false)
      if (state && !state.ack) {
        adapter.log.info('ack is not set!');
      }
    } catch (e) {
      adapter.log.debug("Fehler Befehlsauswertung: " + e);
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
  deviceIpAdress = adapter.config.host;
  port = adapter.config.port;


  const pollingTime = adapter.config.pollInterval || 300000;
  adapter.log.debug('[INFO] Configured polling interval: ' + pollingTime);
  adapter.log.debug('[START] Started Adapter with: ' + adapter.config.host);

  callval = setInterval(callvalues, 2000);

  if (!polling) {
    polling = setTimeout(function repeat() { // poll states every [30] seconds
      callval = setInterval(callvalues, 2000); //DATAREQUEST;
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
    calli = 0;
    clearInterval(callval);
  }
} //end callvalues


function callcomfoair(hexout) {
  var client = new net.Socket();

  client.connect(port, deviceIpAdress, function() { //Connection Data ComfoAir
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
    try {
      if (buffarr.length > 3) {
        adapter.log.debug("ACK: " + buffarr[0] + ", " + buffarr[1]);
        adapter.log.debug("Checksumme aus Datensatz: " + buffarr[buffarr.length - 3]);
        adapter.log.debug("Checksumme berechnet: " + parseInt(checksumcmd(buff.slice(2)), 16));
        if (buffarr[0] == 7 && buffarr[1] == 243 && buffarr[buffarr.length - 3] == parseInt(checksumcmd(buff.slice(2)), 16)) {
          adapter.log.debug("ACK erhalten und Checksumme ok");
          readComfoairData(buffarr);
        } else {
          adapter.log.warn("ACK zu Datenabfrage nicht erhalten oder Checksumme falsch");
        }

      } else {
        if (buff.toString('hex') == "07f3") {
          adapter.log.debug("ACK erhalten");
          switch (hexout[3]) {
            case 153:
              adapter.setState('status.statstufe', hexout[5], true);
              break;
            case 211:
              adapter.setState('temperature.statcomfort', ((hexout[5] / 2) - 20), true);
              break;
            case 219:
              if (hexout[5] == 1) {
                adapter.log.warn("Störungen zurückgesetzt");
              }
              if (hexout[6] == 1) {
                adapter.log.warn("Einstellungen zurückgesetzt");
              }
              if (hexout[7] == 1) {
                adapter.log.warn("Selbsttest gestartet");
              }
              if (hexout[8] == 1) {
                adapter.log.warn("Betriebsstunden Filter zurückgesetzt");
                adapter.setState('status.filterh', 0, true);
              }
            case 207:
              adapter.setState('status.ventlevel.ABLabw', hexout[5], true);
              adapter.setState('status.ventlevel.ABL1', hexout[6], true);
              adapter.setState('status.ventlevel.ABL2', hexout[7], true);
              adapter.setState('status.ventlevel.ZULabw', hexout[8], true);
              adapter.setState('status.ventlevel.ZUL2', hexout[10], true);
              adapter.setState('status.ventlevel.ZUL1', hexout[9], true);
              adapter.setState('status.ventlevel.ABL3', hexout[11], true);
              adapter.setState('status.ventlevel.ZUL3', hexout[12], true);

              adapter.log.debug("Ventilationsstufen gesetzt");
          }
        } else {
          adapter.log.debug("ACK zu Kommando nicht erhlaten");
        }
      }

    } catch (e) {
      adapter.log.warn("Client-Data - Fehler" + e);
    }

    setTimeout(function() {
      client.destroy();
    }, 1000); // kill client after server's response

  });

  client.on('close', function() {


    adapter.log.debug('Connection closed');
  });
} //end callcomfoair

function readComfoairData(buffarr) {
  try {
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
        adapter.setState('status.ventlevel.ABLabw', buffarr[7], true);
        adapter.setState('status.ventlevel.ABL1', buffarr[8], true);
        adapter.setState('status.ventlevel.ABL2', buffarr[9], true);
        adapter.setState('status.ventlevel.ZULabw', buffarr[10], true);
        adapter.setState('status.ventlevel.ZUL2', buffarr[11], true);
        adapter.setState('status.ventlevel.ZUL1', buffarr[12], true);
        adapter.setState('status.ventABL', buffarr[13], true);
        adapter.setState('status.ventZUL', buffarr[14], true);
        adapter.setState('status.statstufe', buffarr[15], true);
        adapter.setState('status.ventlevel.ABL3', buffarr[17], true);
        adapter.setState('status.ventlevel.ZUL3', buffarr[18], true);
        break;
      case 222:
        adapter.log.debug(cmd + " : lese Betriebsstunden");
        adapter.setState('status.filterh', parseInt((buffarr[22].toString(16) + buffarr[23].toString(16)), 16), true);
        break;
      case 14:
        adapter.log.debug(cmd + " : lese Status Bypass");
        adapter.setState('status.bypass', buffarr[7], true);
        break;
      case 202:
        adapter.setState("status.filterw", buffarr[11], true);
      default:
        adapter.log.warn("Fehler: ACK korrekt, aber Daten nicht erkannt");

    }
  } catch (e) {
    adapter.log.warn("readComfoairData - Fehler: " + e);
  }
} //end readComfoairData

function checksumcmd(csdata) {
  try {
    var checksum = 0;
    for (var i = 2; i < (csdata.length - 3); i++) {
      if (i > 5 && csdata[i] == 7 && csdata[i - 1] == 7) {
        adapter.log.debug("doppelte '07'");
      } else {
        checksum = checksum + csdata[i]
      }
    }
    checksum = ((checksum + 173).toString(16)).slice(-2);
    return checksum;

  } catch (e) {
    s
    adapter.log.warn("ChecksumCmd - Fehler: " + e)
  }
} //end checksumcmd




// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
  module.exports = startAdapter;
} else {
  // or start the instance directly
  startAdapter();
} // endElse
