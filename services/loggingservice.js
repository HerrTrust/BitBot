var moment = require('moment');
var _ = require('underscore');

//------------------------------Config
var config = require('../config.js');
//------------------------------Config

var logger = function() {

    this.debugEnabled = config.debug;

    _.bindAll(this, 'log', 'debug', 'error');

};

logger.prototype.log = function(message) {

    var now = moment(new Date()).format('DD-MM-YYYY HH:mm:ss');

    console.log('[' + now + '] (INFO) ' + message);

};

logger.prototype.debug = function(message) {

    if(this.debugEnabled) {

        var now = moment(new Date()).format('DD-MM-YYYY HH:mm:ss');

        console.log('[' + now + '] (DEBUG) ' + message);

    }

};

logger.prototype.error = function(message) {

    var now = moment(new Date()).format('DD-MM-YYYY HH:mm:ss');

    console.log('[' + now + '] (ERROR) ' + message);

};

var loggingservice = new logger();

module.exports = loggingservice;