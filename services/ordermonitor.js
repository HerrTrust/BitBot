var _ = require('underscore');
var BigNumber = require('bignumber.js');
var logger = require('./loggingservice.js');
var api = require('./api.js');

var ordermonitor = function() {

    _.bindAll(this, 'checkCancellation', 'processCancellation', 'add', 'resolvePreviousOrder');

    this.checkOrder = {};
    
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

            logger.log('Order (' + checkOrder.id + ') filled succesfully!');

            this.emit('filled', checkOrder);

            this.checkOrder = {};

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

    this.checkOrder = {};

};

ordermonitor.prototype.add = function(orderDetails, cancelTime) {

    this.resolvePreviousOrder();

    this.checkOrder = {id:orderDetails.order, orderDetails:orderDetails, status:'open'};

    logger.log('Monitoring order: ' + this.checkOrder.id + ' (Cancellation after ' + cancelTime + ' minutes)');

    this.checkOrder.interval = setInterval(function() {

        api.orderFilled(this.checkOrder.id, function(err, response){
            this.checkCancellation(this.checkOrder, response);
        }.bind(this));

    }.bind(this), 1000 * 30);

    this.checkOrder.timeout = setTimeout(function() {

        clearInterval(this.checkOrder.interval);

        if(this.checkOrder.status === 'open') {

            api.cancelOrder(this.checkOrder.id, function(err, response) {
                this.processCancellation(this.checkOrder, response);
            }.bind(this));

        }

    }.bind(this), 1000 * 60 * cancelTime);

};

ordermonitor.prototype.resolvePreviousOrder = function() {

    if(this.checkOrder.status === 'open') {

        clearInterval(this.checkOrder.interval);
        clearTimeout(this.checkOrder.timeout);

        this.checkOrder = {};

    } else {

        this.checkOrder = {};

    }

};

module.exports = ordermonitor;