var _ = require('underscore');
var BigNumber = require('bignumber.js');
var logger = require('./loggingservice.js');
var api = require('./api.js');
var storage = require('./candlestorage.js');

var pricemonitor = function(slPercentageB, slPercentageS, candleStickSizeMinutes) {

    this.percentageBought = slPercentageB;
    this.percentageSold = slPercentageS;
    this.candleStickSizeMinutes = candleStickSizeMinutes;

    this.position = 'none';

    _.bindAll(this, 'check', 'setPosition', 'update');
    
};

//---EventEmitter Setup
var Util = require('util');
var EventEmitter = require('events').EventEmitter;
Util.inherits(pricemonitor, EventEmitter);
//---EventEmitter Setup

pricemonitor.prototype.check = function(price) {

    if(this.position === 'bought') {

        if(price <= this.checkPriceBought) {
            logger.log('Stop Loss triggered (Long Entry: ' + this.posPrice + ' Exit: ' + price + ')');
            this.position = 'none';
            this.posPrice = 0;
            this.emit('advice', 'sell');
        }

    } else if(this.position === 'sold') {

        if(price >= this.checkPriceSold) {
            logger.log('Stop Loss triggered (Short Entry: ' + this.posPrice + ' Exit: ' + price + ')');
            this.position = 'none';
            this.posPrice = 0;
            this.emit('advice', 'buy');
        }

    } else {

        this.emit('advice', 'hold');

    }

};

pricemonitor.prototype.setPosition = function(pos, price) {

    if(pos === 'bought') {

        this.position = 'bought'
        this.posPrice = price;
        this.checkPriceBought = Number(BigNumber(this.posPrice).times(BigNumber(1).minus(BigNumber(this.percentageBought).dividedBy(BigNumber(100)))));

    } else if(pos === 'sold') {

        this.position = 'sold';
        this.posPrice = price;
        this.checkPriceSold = Number(BigNumber(this.posPrice).times(BigNumber(1).plus(BigNumber(this.percentageSold).dividedBy(BigNumber(100)))));

    }

};

pricemonitor.prototype.update = function(cs) {

    var diff = cs.close - cs.open;
    var size = Math.abs(Number(BigNumber(cs.close).minus(BigNumber(cs.open)).round(2)));
    var averageSize = storage.getAverageCandleStickSize(10, this.candleStickSizeMinutes);

    var change = Number(BigNumber(size).dividedBy(2).round(2));

    if(size >= averageSize * 2) {

        if(this.position === 'bought' && diff > 0) {

            var newSl = Number(BigNumber(this.checkPriceBought).plus(change));

            logger.log('Stop loss increased! Old: ' + this.checkPriceBought + ' New: ' + newSl);

            this.checkPriceBought = newSl;

        } else if(this.position === 'sold' && diff < 0) {

            var newSl = Number(BigNumber(this.checkPriceSold).minus(change));

            logger.log('Stop loss decreased! Old: ' + this.checkPriceSold + ' New: ' + newSl);

            this.checkPriceSold = newSl;

        }

    }

};

module.exports = pricemonitor;