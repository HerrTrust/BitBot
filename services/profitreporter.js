var _ = require('underscore');
var BigNumber = require('bignumber.js');
var async = require('async');
var logger = require('./loggingservice.js');
var api = require('./api.js');

var profitreporter = function(currencyPair) {

    this.currencyPair = currencyPair;

    _.bindAll(this, 'createReport', 'processBalance', 'updateBalance');
    
};

//---EventEmitter Setup
var Util = require('util');
var EventEmitter = require('events').EventEmitter;
Util.inherits(profitreporter, EventEmitter);
//---EventEmitter Setup

profitreporter.prototype.createReport = function() {

    var report = this.currencyPair.asset + ': ' + this.assetBalance + ' ' + this.currencyPair.currency + ': ' + this.currencyBalance + ' Total in ' + this.currencyPair.currency + ': ' + this.totalCurrencyBalance + ' Profit: ' + this.profitAbsolute + ' (' + this.profitPercentage + '%)';

    logger.log('Profit Report: ' + report);

    this.emit('report', report);

};

profitreporter.prototype.processBalance = function(err, result) {
                    
    this.currencyBalance = parseFloat(result.balance.currencyAvailable);
    this.assetBalance = Number(BigNumber(parseFloat(result.balance.assetAvailable)).round(2));

    this.highestBid = _.first(result.orderBook.bids).currencyPrice;
    this.assetBalanceInCurrency = BigNumber(this.assetBalance).times(BigNumber(this.highestBid));

    if(!this.totalCurrencyBalance) {
        this.initalTotalCurrencyBalance = Number(BigNumber(this.currencyBalance).plus(this.assetBalanceInCurrency).round(2));
    }

    this.totalCurrencyBalance = Number(BigNumber(this.currencyBalance).plus(this.assetBalanceInCurrency).round(2));
    this.profitAbsolute = Number(BigNumber(this.totalCurrencyBalance).minus(this.initalTotalCurrencyBalance))
    this.profitPercentage = Number(BigNumber(this.profitAbsolute).dividedBy(BigNumber(this.initalTotalCurrencyBalance)).times(BigNumber(100)).round(2));

    if(this.includeReport) {
        this.createReport();
    }

    this.emit('update', {'asset': this.currencyPair.asset, 'currency': this.currencyPair.currency, 'currencyBalance': this.currencyBalance, 'assetBalance': this.assetBalance, 'profitAbsolute': this.profitAbsolute, 'profitPercentage': this.profitPercentage});

};

profitreporter.prototype.updateBalance = function(includeReport) {

    this.includeReport = includeReport;

    async.series(
        {
        balance: api.getBalance,
        orderBook: api.getOrderBook
        },
        this.processBalance
    );

};

module.exports = profitreporter;