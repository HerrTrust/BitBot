var _ = require('underscore');
var async = require('async');
var logger = require('./loggingservice.js');
var api = require('./api.js');

var downloader = function(refreshInterval){

    this.refreshInterval = refreshInterval;

    _.bindAll(this, 'start', 'stop', 'processTrades');

};

//---EventEmitter Setup
var Util = require('util');
var EventEmitter = require('events').EventEmitter;
Util.inherits(downloader, EventEmitter);
//---EventEmitter Setup

downloader.prototype.processTrades = function(err, trades) {

    this.emit('update', trades);

};

downloader.prototype.start = function() {

    logger.log('Downloader started!');
    
    api.getTrades(this.processTrades);
    
    this.downloadInterval = setInterval(function(){
        api.getTrades(this.processTrades);
    }.bind(this),1000 * this.refreshInterval);

};

downloader.prototype.stop = function() {

    clearInterval(this.downloadInterval);

    logger.log('Downloader stopped!');

};

module.exports = downloader;