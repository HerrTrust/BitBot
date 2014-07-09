var _ = require('underscore');
var BigNumber = require('bignumber.js');
var async = require('async');
var logger = require('./loggingservice.js');
var storage = require('./candlestorage.js');

var advisor = function(indicatorSettings, candleStickSize) {

	this.indicator = indicatorSettings.indicator;
	this.options = indicatorSettings.options;
	this.buyTreshold = indicatorSettings.buyTreshold;
	this.sellTreshold = indicatorSettings.sellTreshold;
	this.candleStickSize = candleStickSize;

	if(this.indicator === 'MACD') {
		this.selectedIndicator = this.calculateMacd;
	} else if(this.indicator === 'PPO') {
		this.selectedIndicator = this.calculatePPO;
	} else {
    	throw new Error('Wrong indicator chosen. This indicator doesn\'t exist.');
	}

	this.previousIndicatorResult = {};
	this.indicatorResult = {};

	this.length = 0;

	_.bindAll(this, 'start', 'update', 'calculateEma', 'calculateMacd', 'calculatePPO', 'generateAdvice');

};

//---EventEmitter Setup
var Util = require('util');
var EventEmitter = require('events').EventEmitter;
Util.inherits(advisor, EventEmitter);
//---EventEmitter Setup

advisor.prototype.start = function() {

	var candleSticks = storage.getFinishedAggregatedCandleSticks(this.candleStickSize);

	for(var i = 0; i < candleSticks.length; i++) {

		this.length = this.length + 1;

		var usePrice = candleSticks[i].close;

		this.previousIndicatorResult = this.indicatorResult;
		this.indicatorResult = this.selectedIndicator(usePrice, this.options, this.previousIndicatorResult);
        
	}

};

advisor.prototype.update = function(cs) {

	this.length = this.length + 1;

	var usePrice = cs.close;

	this.previousIndicatorResult = this.indicatorResult;
	this.indicatorResult = this.selectedIndicator(usePrice, this.options, this.previousIndicatorResult);

	if(this.length >= this.options.neededPeriods) {
	            
		this.generateAdvice();

	} else {

		logger.log('Indicator needs ' + (this.options.neededPeriods - this.length) + ' more periods before actual trades will be executed.');

	}

};

advisor.prototype.calculateEma = function(periods, priceToday, previousEma) {

	if(!previousEma) {
		previousEma = priceToday;
	}

	var k = BigNumber(2).dividedBy(BigNumber(periods+1));
	var ema = (BigNumber(priceToday).times(k)).plus(BigNumber(previousEma).times(BigNumber(1).minus(k)));

	return BigNumber(ema).round(8);

};

advisor.prototype.calculateMacd = function(usePrice, options, previousMacd) {

	var emaLong = Number(this.calculateEma(options.longPeriods, usePrice, previousMacd.emaLong));
	var emaShort = Number(this.calculateEma(options.shortPeriods, usePrice, previousMacd.emaShort));

	var macd = Number(BigNumber(emaShort).minus(BigNumber(emaLong)));
	var macdSignal = Number(this.calculateEma(options.emaPeriods, macd, previousMacd.macdSignal));      
	var macdHistogram = Number(BigNumber(macd).minus(BigNumber(macdSignal)).round(2));

	return {'emaLong': emaLong, 'emaShort': emaShort, 'macd': macd, 'macdSignal': macdSignal, 'result': macdHistogram};

}

advisor.prototype.calculatePPO = function(usePrice, options, previousPPO) {

	var emaLong = Number(this.calculateEma(options.longPeriods, usePrice, previousPPO.emaLong));
	var emaShort = Number(this.calculateEma(options.shortPeriods, usePrice, previousPPO.emaShort));

	var PPO = Number(BigNumber(emaShort).minus(BigNumber(emaLong)).dividedBy(BigNumber(emaLong)).times(BigNumber(100)).round(8));
	var PPOSignal = Number(this.calculateEma(options.emaPeriods, PPO, previousPPO.PPOSignal));      
	var PPOHistogram = Number(BigNumber(PPO).minus(BigNumber(PPOSignal)).round(2));

	return {'emaLong': emaLong, 'emaShort': emaShort, 'PPO': PPO, 'PPOSignal': PPOSignal, 'result': PPOHistogram};

}

advisor.prototype.generateAdvice = function() {

	var advice;

	if(this.previousIndicatorResult.result <= this.buyTreshold && this.indicatorResult.result > this.buyTreshold) {

		advice = 'buy';

	} else if(this.previousIndicatorResult.result >= this.sellTreshold && this.indicatorResult.result < this.sellTreshold) {

		advice = 'sell';

	} else {

		advice = 'hold';

	}

	logger.debug('Advice: ' + advice + ' (Previous Indicator Result: ' + this.previousIndicatorResult.result + ' Current Indicator Result: ' + this.indicatorResult.result + ')');

	this.emit('advice', advice);

};

module.exports = advisor;