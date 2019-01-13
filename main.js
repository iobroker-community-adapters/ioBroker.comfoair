/**
 * comfoair adapter
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
const adapter = new utils.Adapter('comfoair');
var DeviceIpAdress;
var port;
var net = require('net');
var hexout= [];
var buffarr = [];
var buff;
var cmdi;
var statTemp = [0x07, 0xF0, 0x00, 0xD1, 0x00, 0x7E, 0x07, 0x0F];
var statVent = [0x07, 0xF0, 0x00, 0xCD, 0x00, 0x7A, 0x07, 0x0F];
var statBetrH = [0x07, 0xF0, 0x00, 0xDD, 0x00, 0x8A, 0x07, 0x0F];
var statByp = [0x07, 0xF0, 0x00, 0x0D, 0x00, 0xBA, 0x07, 0x0F];
var statcmd = [stat0Temp, stat1Vent, stat2BetrH, stat3Byp];
var statcmdi = [[0x07, 0xF0, 0x00, 0xD1, 0x00, 0x7E, 0x07, 0x0F], [0x07, 0xF0, 0x00, 0xCD, 0x00, 0x7A, 0x07, 0x0F], [0x07, 0xF0, 0x00, 0xDD, 0x00, 0x8A, 0x07, 0x0F], [0x07, 0xF0, 0x00, 0x0D, 0x00, 0xBA, 0x07, 0x0F] ];
var statcmdS = ["statTemp", "statVent", "statBetrH", "statByp"];
var statcmdL = statcmdi.length;
var calli = 0;

let polling;


// when adapter shuts down
adapter.on('unload', function (callback) {
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
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
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
			callval = setInterval(callvalues, 2000);//DATAREQUEST;
			setTimeout(repeat, pollingTime);
		}, pollingTime);
	} // endIf

	// all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

} // endMain

function callvalues(){
    hexout = statcmdi[calli];
    console.log(hexout);
    callcomfoair(hexout);
    calli++;
    if (calli == statcmdL){
        clearInterval(callval);
    }
}//end callvalues


function callcomfoair (hexout) {
var client = new net.Socket();
client.connect(8899, '192.168.1.132', function() {  //Connection Data ComfoAir
	console.log('Connected');
	console.log(hexout);
	var msgbuf = new Buffer(hexout);
	var hexoutarr = [...msgbuf];
	console.log("out " + msgbuf.toString('hex'));
	console.log("outarr: " + hexoutarr);
	client.write(msgbuf);
});

client.on('data', function(data) {
    var buff = new Buffer(data, 'utf8');
    console.log('Received: ' + buff.toString('hex'));
    buffarr = [...buff];
    console.log('Received arr: '  + buffarr);
    client.destroy(); // kill client after server's response
    cmd = buffarr[5];
    console.log("Befehlsnummer: " + cmd);
    switch(cmd){
        case 222:
            console.log("es ist Befehl 222");
            break;
        case 14:
            console.log("es ist Befehl 14");
            break;
    }


});

client.on('close', function() {
	console.log('Connection closed');
});
} //end callcomfoair
// end callcomfoair
