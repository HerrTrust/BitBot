var _ = require('underscore');
var BigNumber = require('bignumber.js');
var async = require('async');
var logger = require('./loggingservice.js');
var storage = require('./candlestorage.js');
var tools = require('./tools.js');

var dataprocessor = function(candleStickSize) {

    this.candleStickSize = candleStickSize;

    this.initialDBWriteDone = false;

    _.bindAll(this, 'updateCandleStick', 'createBaseCandleSticks', 'processInitialLoad', 'processUpdate', 'initialize', 'updateCandleDB');

};

//---EventEmitter Setup
var Util = require('util');
var EventEmitter = require('events').EventEmitter;
Util.inherits(dataprocessor, EventEmitter);
//---EventEmitter Setup

dataprocessor.prototype.updateCandleStick = function (candleStick, tick) {

    if(!candleStick.open) {

      candleStick.open = tick.price;
      candleStick.high = tick.price;
      candleStick.low = tick.price;
      candleStick.close = tick.price;
      candleStick.volume = tick.amount;
      candleStick.vwap = tick.price;

    } else {

        var currentVwap = BigNumber(candleStick.vwap).times(BigNumber(candleStick.volume));
        var newVwap = BigNumber(tick.price).times(BigNumber(tick.amount));

        candleStick.high = _.max([candleStick.high, tick.price]);
        candleStick.low = _.min([candleStick.low, tick.price]);

        candleStick.volume = Number(BigNumber(candleStick.volume).plus(BigNumber(tick.amount)).round(8));
        candleStick.vwap = Number(currentVwap.plus(newVwap).dividedBy(BigNumber(candleStick.volume)).round(2));

    }

    candleStick.close = tick.price;

    return candleStick;

};

dataprocessor.prototype.createBaseCandleSticks = function (callback) {

    if(this.ticks.length > 0) {

        var candleStickSizeSeconds = 60;

        var tickTimeStamp = this.ticks[0].date;

        var lastStoragePeriod = storage.getLastNonEmptyPeriod();
        var firstTickCandleStick = (Math.floor(tickTimeStamp/candleStickSizeSeconds)*candleStickSizeSeconds);

        if(lastStoragePeriod < firstTickCandleStick && lastStoragePeriod !== 0) {
            tickTimeStamp = lastStoragePeriod + candleStickSizeSeconds;
        }

        var now = tools.unixTimeStamp(new Date().getTime());

        var startTimeStamp = (Math.floor(tickTimeStamp/candleStickSizeSeconds)*candleStickSizeSeconds);
        var stopTimeStamp = (Math.floor(now/candleStickSizeSeconds)*candleStickSizeSeconds);

        var endTimeStamp = startTimeStamp + candleStickSizeSeconds;

        while(endTimeStamp < this.ticks[0].date) {

            var previousClose = storage.getLastNonEmptyClose();

            storage.push({'period':startTimeStamp,'open':previousClose,'high':previousClose,'low':previousClose,'close':previousClose,'volume':0, 'vwap':previousClose});

            startTimeStamp = endTimeStamp;
            endTimeStamp = endTimeStamp + candleStickSizeSeconds;

        }

        var currentCandleStick = {'period':startTimeStamp,'open':undefined,'high':undefined,'low':undefined,'close':undefined,'volume':0, 'vwap':undefined};

        this.ticks.forEach(function(tick){

            tickTimeStamp = tick.date;

            while(tickTimeStamp >= endTimeStamp + candleStickSizeSeconds) {

                if(currentCandleStick.volume > 0) {
                	storage.push(currentCandleStick);
                }

                startTimeStamp = endTimeStamp;
                endTimeStamp = endTimeStamp + candleStickSizeSeconds;

                var previousClose = storage.getLastNonEmptyClose();

                storage.push({'period':startTimeStamp,'open':previousClose,'high':previousClose,'low':previousClose,'close':previousClose,'volume':0, 'vwap':previousClose});

            }

            if(tickTimeStamp >= endTimeStamp) {

            	if(currentCandleStick.volume > 0) {
                	storage.push(currentCandleStick);
                }

                startTimeStamp = endTimeStamp;
                endTimeStamp = endTimeStamp + candleStickSizeSeconds;

                currentCandleStick = {'period':startTimeStamp,'open':undefined,'high':undefined,'low':undefined,'close':undefined,'volume':0, 'vwap':undefined};

            } 

            if(tickTimeStamp >= startTimeStamp && tickTimeStamp < endTimeStamp) {

                currentCandleStick = this.updateCandleStick(currentCandleStick,tick);

            }

        }.bind(this));

        if(currentCandleStick.volume > 0) {

            storage.push(currentCandleStick);

            startTimeStamp = endTimeStamp;
            endTimeStamp = endTimeStamp + candleStickSizeSeconds;

        }

        for(var i = startTimeStamp;i <= stopTimeStamp;i = i + candleStickSizeSeconds) {

            var beginPeriod = i;
            var endPeriod = beginPeriod + candleStickSizeSeconds;

            var previousClose = storage.getLastNonEmptyClose();

            storage.push({'period':beginPeriod,'open':previousClose,'high':previousClose,'low':previousClose,'close':previousClose,'volume':0, 'vwap':previousClose});

        }

        callback(null);

    } else {

        callback(null);

    }

};

dataprocessor.prototype.processInitialLoad = function(err, result) {

    if(err) {

        logger.log('Couldn\'t create candlesticks due to a database error');
        logger.error(err.stack);

        process.exit();

    } else {

        this.emit('initialized');

    }

};

dataprocessor.prototype.processUpdate = function(err, result) {

    this.ticks = [];

    if(err) {

        logger.error('Couldn\'t create candlesticks due to a database error');
        logger.error(err.stack);

        process.exit();

    } else {

        var latestCandleStick = storage.getLastNCandles(1)[0];

        if(!this.initialDBWriteDone) {
            this.emit('initialDBWrite');
            this.initialDBWriteDone = true;
        } else {

            this.emit('update', latestCandleStick);

        }

    }

};

dataprocessor.prototype.initialize = function() {

    async.waterfall([
        storage.getDBCandles
    ], this.processInitialLoad);

};

dataprocessor.prototype.updateCandleDB = function(ticks) {

    var period = storage.getLastNonEmptyPeriod();

    this.ticks = _.filter(ticks,function(tick){

    	return tick.date >= period;

    });

    async.waterfall([
        this.createBaseCandleSticks,
        storage.materialise
    ], this.processUpdate);

};

module.exports = dataprocessor;