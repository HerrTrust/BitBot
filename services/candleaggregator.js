var _ = require('underscore');
var BigNumber = require('bignumber.js');
var logger = require('./loggingservice.js');
var storage = require('./candlestorage.js');

var aggregator = function(candleStickSize) {

	this.candleStickSize = candleStickSize;

	_.bindAll(this, 'update');

};

//---EventEmitter Setup
var Util = require('util');
var EventEmitter = require('events').EventEmitter;
Util.inherits(aggregator, EventEmitter);
//---EventEmitter Setup

aggregator.prototype.update = function() {

	if(storage.length(this.candleStickSize) > 0) {

		this.previousCandlePeriod = storage.getLastNonEmptyPeriod(this.candleStickSize);

		var cs = storage.getLastCompleteAggregatedCandleStick(this.candleStickSize);

		this.latestCandlePeriod = storage.getLastNonEmptyPeriod(this.candleStickSize);

		if(this.latestCandlePeriod > this.previousCandlePeriod) {

			logger.debug('Created a new ' + this.candleStickSize + ' minute candlestick!');
			logger.debug(JSON.stringify(cs));

			this.emit('update', cs);

			storage.removeOldCandles();

		}

	} else {

		storage.getFinishedAggregatedCandleSticks(this.candleStickSize);

	}

};

module.exports = aggregator;