var _ = require('underscore');
var logger = require('./loggingservice.js');
var Bitstamp = require('bitstamp');
var Kraken = require('kraken-api');
var async = require('async');

//------------------------------Config
var config = require('../config.js');
//------------------------------Config

var api = function() {

    this.exchange = config.exchangeSettings.exchange;
    this.currencyPair = config.exchangeSettings.currencyPair;

    if(this.exchange === 'bitstamp') {

        var key = config.apiSettings.bitstamp.apiKey;
        var secret = config.apiSettings.bitstamp.secret;
        var client_id = config.apiSettings.bitstamp.clientId;
        
        this.bitstamp = new Bitstamp(key, secret, client_id);

    } else if(this.exchange === 'kraken') {

        this.kraken = new Kraken(config.apiSettings.kraken.apiKey, config.apiSettings.kraken.secret);

    } else {

        logger.error('Invalid exchange, exiting!');
        return process.exit();

    }

    this.q = async.queue(function (task, callback) {
        task();
        setTimeout(callback,1000);
    }, 1);

    _.bindAll(this, 'retry', 'errorHandler', 'getTrades', 'getBalance', 'getOrderBook', 'placeOrder', 'orderFilled' ,'cancelOrder');

};

api.prototype.retry = function(method, args) {

    var self = this;

    // make sure the callback (and any other fn)
    // is bound to api
    _.each(args, function(arg, i) {
        if(_.isFunction(arg))
        args[i] = _.bind(arg, self);
    });

    // run the failed method again with the same
    // arguments after wait
    setTimeout(
        function() { method.apply(self, args) },
    1000*15);

};

api.prototype.errorHandler = function(method, receivedArgs, retryAllowed, cb) {

    var args = _.toArray(receivedArgs);

    return function(err, result) {

        if(err) {

            if(this.exchange === 'kraken' && err[0] === 'EQuery:Unknown asset pair') {

                logger.error('Kraken returned Unknown asset pair error, exiting!');
                return process.exit();

            } else if(retryAllowed) {

                logger.error('Couldn\'t connect to the API, retrying in 15 seconds!');
                logger.error(JSON.stringify(err).substring(0,99));
                return this.retry(method, args);

            } else {

                logger.error('Couldn\'t connect to the API.');
                return logger.error(JSON.stringify(err).substring(0,99));
                cb(err, result);

            }

        }

        if(this.exchange === 'bitstamp' && result.error === 'Invalid nonce') {
            logger.error('Bitstamp returned invalid nonce error, retrying in 15 seconds!');
            return this.retry(method, args);
        }

        logger.debug('API Call Result (Substring)!');
        logger.debug(JSON.stringify(result).substring(0,99));

        //_.last(args)(null, result);
        cb(null, result);

    }.bind(this);

};

api.prototype.getTrades = function(cb) {

    var args = arguments;

    var wrapper = function() {

        var pair = this.currencyPair.pair;

        if(this.exchange === 'bitstamp') {

            var handler = function(err, response) {

                var trades = _.map(response, function(t) {

                    return {date: parseInt(t.date), price: parseFloat(t.price), amount: parseFloat(t.amount)};

                });

                var result = _.sortBy(trades, function(trade){ return trade.date; });

                cb(null, result);

            }

            this.bitstamp.transactions({time: 'hour'}, this.errorHandler(this.getTrades, args, false, handler));

        } else if(this.exchange === 'kraken') {

            var handler = function(err, data) {

                var values = _.find(data.result, function(value, key) {

                    return key === pair;

                });

                var trades = _.map(values, function(t) {

                    return {date: parseInt(t[2]), price: parseFloat(t[0]), amount: parseFloat(t[1])};

                });

                cb(null, trades);

            }

            this.kraken.api('Trades', {"pair": pair}, this.errorHandler(this.getTrades, args, false, handler));

        }

    };

    this.q.push(_.bind(wrapper,this));

};

api.prototype.getBalance = function(cb) {

    var args = arguments;

    var wrapper = function() {

        var asset = this.currencyPair.asset;
        var currency = this.currencyPair.currency;

        var pair = this.currencyPair.pair;

        if(this.exchange === 'bitstamp') {

            var handler = function(err, result) {

                cb(null, {currencyAvailable:result.usd_available, assetAvailable:result.btc_available, fee:result.fee});

            }

            this.bitstamp.balance(this.errorHandler(this.getBalance, args, true, handler));

        } else if(this.exchange === 'kraken') {

            var handler = function(err, data) {

                var assetValue = _.find(data.result, function(value, key) {
                    return key === asset;
                });

                var currencyValue = _.find(data.result, function(value, key) {
                    return key === currency;
                });

                if(!assetValue) {
                    assetValue = 0;
                }

                if(!currencyValue) {
                    currencyValue = 0;
                }

                this.kraken.api('TradeVolume', {"pair": pair}, this.errorHandler(this.getBalance, args, true, function(err, data) {

                    var fee = parseFloat(_.find(data.result.fees, function(value, key) {
                        return key === pair;
                    }).fee);

                    cb(null, {currencyAvailable:currencyValue, assetAvailable:assetValue, fee:fee});

                }));

            }.bind(this);

            this.kraken.api('Balance', {}, this.errorHandler(this.getBalance, args, true, handler));

        }

    };

    this.q.push(_.bind(wrapper,this));

};

api.prototype.getOrderBook = function(cb) {

    var args = arguments;

    var wrapper = function () {

        var pair = this.currencyPair.pair;

        if(this.exchange === 'bitstamp') {

            var handler = function(err, result) {

                var bids = _.map(result.bids, function(bid) {
                    return {assetAmount: bid[1], currencyPrice: bid[0]};
                });

                var asks = _.map(result.asks, function(ask) {
                    return {assetAmount: ask[1], currencyPrice: ask[0]};
                });

                cb(null, {bids: bids, asks: asks});

            };

            this.bitstamp.order_book(1, this.errorHandler(this.getOrderBook, args, true, handler));

        } else if(this.exchange === 'kraken') {

            var handler = function(err, data) {

                var orderbook = _.find(data.result, function(value, key) {

                    return key === pair;

                });

                var bids = _.map(orderbook.bids, function(bid) {
                    return {assetAmount: bid[1], currencyPrice: bid[0]};
                });

                var asks = _.map(orderbook.asks, function(ask) {
                    return {assetAmount: ask[1], currencyPrice: ask[0]};
                });

                cb(null, {bids: bids, asks: asks});

            };


            this.kraken.api('Depth', {"pair": pair}, this.errorHandler(this.getOrderBook, args, true, handler));

        }

    };

    this.q.push(_.bind(wrapper,this));

};

api.prototype.placeOrder = function(type, amount, price, cb) {

    var args = arguments;

    var wrapper = function() {

        var pair = this.currencyPair.pair;

        if(this.exchange === 'bitstamp') {

            var handler = function(err, result) {

                cb(null, {txid: result.id});

            };

            if(type === 'buy') {

                this.bitstamp.buy(amount, price, this.errorHandler(this.placeOrder, args, true, handler));

            } else if (type === 'sell') {

                this.bitstamp.sell(amount, price, this.errorHandler(this.placeOrder, args, true, handler));

            } else {

                logger.log('Invalid order type!');
            }

        } else if(this.exchange === 'kraken') {

            var handler = function(err, data) {

                cb(null, {txid: data.result.txid[0]});

            }

            if(type === 'buy') {

                this.kraken.api('AddOrder', {"pair": pair, "type": 'buy', "ordertype": 'limit', "price": price, "volume": amount}, this.errorHandler(this.placeOrder, args, true, handler));

            } else if (type === 'sell') {

                this.kraken.api('AddOrder', {"pair": pair, "type": 'sell', "ordertype": 'limit', "price": price, "volume": amount}, this.errorHandler(this.placeOrder, args, true, handler));

            } else {

                logger.log('Invalid order type!');
            }

        }

    };

    this.q.push(_.bind(wrapper,this));

};

api.prototype.orderFilled = function(order, cb) {

    var args = arguments;

    var wrapper = function() {

        if(this.exchange === 'bitstamp') {

            var handler = function(err, result) {

                var open = _.find(result, function(o) {

                    return o.id === order;

                }, this);

                if(open) {

                    cb(null, false);

                } else {

                    cb(null, true);

                }

            };

            this.bitstamp.open_orders(this.errorHandler(this.orderFilled, args, false, handler));

        } else if(this.exchange === 'kraken') {

            var handler = function(err, data) {

                var open = _.find(data.result.open, function(value, key) {

                    return key === order;

                });

                if(open) {

                    cb(null, false);

                } else {

                    cb(null, true);

                }

            };

            this.kraken.api('OpenOrders', {}, this.errorHandler(this.orderFilled, args, false, handler));

        }

    };

    this.q.push(_.bind(wrapper,this));

};

api.prototype.cancelOrder = function(order, cb) {

    var args = arguments;

    var wrapper = function() {

        if(this.exchange === 'bitstamp') {

            var handler = function(err, result) {

                if(!result.error) {
                    cb(null, true);
                } else {
                    cb(null, false);
                }

            };

            this.bitstamp.cancel_order(order,this.errorHandler(this.cancelOrder, args, true, handler));

        } else if(this.exchange === 'kraken') {

            this.orderFilled(order, function(err, filled) {

                if(!filled) {

                    var handler = function(err, result) {

                        if(result.count > 0) {
                            cb(null, true);
                        } else {
                            cb(null, false);
                        }

                    };

                    this.kraken.api('CancelOrder', {"txid": order}, this.errorHandler(this.cancelOrder, args, true, handler));

                } else {

                    cb(null, false);

                }

            }.bind(this));

        }

    };

    this.q.push(_.bind(wrapper,this));

};

var apiservice = new api();

module.exports = apiservice;