var _ = require('underscore');
var BigNumber = require('bignumber.js');
var async = require('async');
var logger = require('./loggingservice.js');
var storage = require('./candlestorage.js');
var api = require('./api.js');

var tradingagent = function(tradingEnabled, exchangeSettings) {

	_.bindAll(this, 'order', 'calculateOrder', 'placeRealOrder', 'placeSimulatedOrder', 'processOrder');

    this.tradingEnabled = tradingEnabled;
    this.currencyPair = exchangeSettings.currencyPair;
    this.tradingReserveAsset = exchangeSettings.tradingReserveAsset;
    this.tradingReserveCurrency = exchangeSettings.tradingReserveCurrency;
    this.slippagePercentage = exchangeSettings.slippagePercentage;

};

//---EventEmitter Setup
var Util = require('util');
var EventEmitter = require('events').EventEmitter;
Util.inherits(tradingagent, EventEmitter);
//---EventEmitter Setup

tradingagent.prototype.order = function(orderType) {

	this.orderDetails = {};

	this.orderDetails.orderType = orderType;

	var process = function (err, result) {

		//No need to test on error as it's handled by the errorhandler
		this.calculateOrder(result);

		if(this.tradingEnabled) {
			this.placeRealOrder();
		} else {
			this.placeSimulatedOrder();
		}
		
	}

	async.series(
		{
		balance: api.getBalance,
		orderBook: api.getOrderBook
		},
		process.bind(this)
	);

};

tradingagent.prototype.calculateOrder = function(result) {

	this.orderDetails.assetBalance = parseFloat(result.balance.assetAvailable);
	this.orderDetails.currencyBalance = parseFloat(result.balance.currencyAvailable);
	this.orderDetails.tradingFee = parseFloat(result.balance.fee);

	var orderBook = result.orderBook;

	var lastClose = storage.getLastClose();
	var minClose = Number(BigNumber(lastClose).times(BigNumber(0.9975)).round(2));
	var maxClose = Number(BigNumber(lastClose).times(BigNumber(1.0025)).round(2));

	logger.log('Preparing to place a ' + this.orderDetails.orderType + ' order! (' + this.currencyPair.asset + ' Balance: ' + this.orderDetails.assetBalance + ' ' + this.currencyPair.currency + ' Balance: ' + this.orderDetails.currencyBalance + ' Trading Fee: ' + this.orderDetails.tradingFee +')');
	                        
	if(this.orderDetails.orderType === 'buy') {

		//var lowestAsk = _.first(orderBook.asks)[0];
		/*var lowestAsk = _.min(orderBook.asks, function(ask){ return parseFloat(ask[0]); })[0];

		if(lowestAsk < minClose) {
			lowestAsk = minClose;
		} else if(lowestAsk > lastClose) {
			lowestAsk = lastClose;
		}*/

		var lowestAsk = lastClose;

		var lowestAskWithSlippage = Number(BigNumber(lowestAsk).times(BigNumber(1).plus(BigNumber(this.slippagePercentage).dividedBy(BigNumber(100)))).round(2));
		var balance = (BigNumber(this.orderDetails.currencyBalance).minus(BigNumber(this.tradingReserveCurrency))).times(BigNumber(1).minus(BigNumber(this.orderDetails.tradingFee).dividedBy(BigNumber(100))));

		logger.log('Lowest Ask: ' + lowestAsk + ' Lowest Ask With Slippage: ' + lowestAskWithSlippage);
		                            
		this.orderDetails.price = lowestAskWithSlippage;
		this.orderDetails.amount = Number(balance.dividedBy(BigNumber(this.orderDetails.price)).minus(BigNumber(0.005)).round(2));
		                            
	} else if(this.orderDetails.orderType === 'sell') {

		//var highestBid = _.first(orderBook.bids)[0];
		/*var highestBid = _.max(orderBook.bids, function(bid){ return parseFloat(bid[0]); })[0];

		if(highestBid > maxClose) {
			highestBid = maxClose;
		} else if(highestBid < lastClose) {
			highestBid = lastClose;
		}*/

		var highestBid = lastClose;

		var highestBidWithSlippage = Number(BigNumber(highestBid).times(BigNumber(1).minus(BigNumber(this.slippagePercentage).dividedBy(BigNumber(100)))).round(2));

		logger.log('Highest Bid: ' + highestBid + ' Highest Bid With Slippage: ' + highestBidWithSlippage);
		                            
		this.orderDetails.price = highestBidWithSlippage;
		this.orderDetails.amount = Number(BigNumber(this.orderDetails.assetBalance).minus(BigNumber(this.tradingReserveAsset)));
		
	}

};

tradingagent.prototype.placeRealOrder = function() {
    
	if(this.orderDetails.amount <= 0) {

		logger.log('Insufficient funds to place an order.')

	} else {

		api.placeOrder(this.orderDetails.orderType, this.orderDetails.amount, this.orderDetails.price, this.processOrder);
	        
	}

};

tradingagent.prototype.placeSimulatedOrder = function() {

	if(this.orderDetails.amount <= 0) {

		logger.log('Insufficient funds to place an order.')

	} else {

		logger.log('Placed simulated ' + this.orderDetails.orderType + ' order: (' + this.orderDetails.amount + '@' + this.orderDetails.price + ')');

		this.emit('simulatedOrder', this.orderDetails);

	}

};

tradingagent.prototype.processOrder = function(err, order) {

	if(!order) {

		logger.log('Something went wrong when placing the ' + this.orderDetails.orderType + ' order.');

	} else {

		this.orderDetails.order = order.txid;

		logger.log('Placed ' + this.orderDetails.orderType + ' order: ' + this.orderDetails.order + ' (' + this.orderDetails.amount + '@' + this.orderDetails.price + ')');

		this.emit('realOrder', this.orderDetails);
        
	}

};

module.exports = tradingagent;