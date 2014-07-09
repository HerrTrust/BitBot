var _ = require('underscore');
var BigNumber = require('bignumber.js');
var logger = require('./loggingservice.js');
var api = require('./api.js');

var ordermonitor = function() {

    _.bindAll(this, 'checkCancellation', 'processCancellation', 'add', 'cancelAllOpen');

    this.checkOrders = [];
    
};

//---EventEmitter Setup
var Util = require('util');
var EventEmitter = require('events').EventEmitter;
Util.inherits(ordermonitor, EventEmitter);
//---EventEmitter Setup

ordermonitor.prototype.checkCancellation = function(checkOrder, filled) {

    if(checkOrder.status !== 'filled') {

        if(filled) {

            checkOrder.status = 'filled';

            clearInterval(checkOrder.interval);
            clearTimeout(checkOrder.timeout);

            this.checkOrders = _.filter(this.checkOrders, function(entry){
                return entry.id !== checkOrder.id;
            });

            logger.log('Order (' + checkOrder.id + ') filled succesfully!');

            this.emit('filled', checkOrder);

        }

    }

};

ordermonitor.prototype.processCancellation = function(checkOrder, cancelled) {

    if(cancelled && checkOrder.status !== 'cancelled') {

        checkOrder.status = 'cancelled';

        logger.log('Order (' + checkOrder.id + ') cancelled!');

        this.emit('cancelled', checkOrder);

    } else if(checkOrder.status !== 'filled') {

        checkOrder.status = 'filled';

        logger.log('Order (' + checkOrder.id + ') filled succesfully!');

        this.emit('filled', checkOrder);

    }

    this.checkOrders = _.filter(this.checkOrders, function(entry){
        return entry.id !== checkOrder.id;
    });

};

ordermonitor.prototype.add = function(orderDetails, cancelTime) {

    this.cancelAllOpen();

    var order = orderDetails.order;

    logger.log('Monitoring order: ' + order + ' (Cancellation after ' + cancelTime + ' minutes)');

    var checkOrdersPos = this.checkOrders.length;

    var interval = setInterval(function() {
        api.orderFilled(this.checkOrders[checkOrdersPos].id, function(err, response){
            this.checkCancellation(this.checkOrders[checkOrdersPos], response);
        }.bind(this));
    }.bind(this), 1000 * 30);

    var timeout = setTimeout(function() {
        clearInterval(interval);
        api.cancelOrder(this.checkOrders[checkOrdersPos].id, function(err, response) {
            this.processCancellation(this.checkOrders[checkOrdersPos], response);
        }.bind(this));
    }.bind(this), 1000 * 60 * cancelTime);

    this.checkOrders.push({id:order, orderDetails:orderDetails, status:'open', interval:interval, timeout:timeout});

};

ordermonitor.prototype.cancelAllOpen = function() {

    this.checkOrders.forEach(function(checkOrder) {

        api.cancelOrder(checkOrder.id, function(err, response) {});
        clearInterval(checkOrder.interval);
        clearTimeout(checkOrder.timeout);
        this.checkOrders = _.filter(this.checkOrders, function(entry){
            return entry.id !== checkOrder.id;
        });

    });

};

module.exports = ordermonitor;