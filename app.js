var _ = require('underscore');

var dataretriever = require('./services/dataretriever.js');
var dataprocessor = require('./services/dataprocessor.js');
var candleaggregator = require('./services/candleaggregator');
var tradingadvisor = require('./services/tradingadvisor.js');
var tradingagent = require('./services/tradingagent.js');
var pushservice = require('./services/pushservice.js');
var ordermonitor = require('./services/ordermonitor.js');
var profitreporter = require('./services/profitreporter.js');
var pricemonitor = require('./services/pricemonitor');

//------------------------------Config
var config = require('./config.js');
//------------------------------Config

//------------------------------IntializeModules
var retriever = new dataretriever(config.downloaderRefreshSeconds);
var processor = new dataprocessor(config.candleStickSizeMinutes);
var aggregator = new candleaggregator(config.candleStickSizeMinutes);
var advisor = new tradingadvisor(config.indicatorSettings, config.candleStickSizeMinutes);
var agent = new tradingagent(config.tradingEnabled, config.exchangeSettings);
var pusher = new pushservice(config.pushOver);
var monitor = new ordermonitor();
var reporter = new profitreporter(config.exchangeSettings.currencyPair);
var pricemon = new pricemonitor(config.stoplossSettings.percentageBought, config.stoplossSettings.percentageSold, config.candleStickSizeMinutes);
//------------------------------IntializeModules

//------------------------------AnnounceStart
console.log('------------------------------------------');
console.log('Starting BitBot v0.6.0');
console.log('Real Trading Enabled = ' + config.tradingEnabled);
console.log('Working Dir = ' + process.cwd());
console.log('------------------------------------------');
//------------------------------AnnounceStart

retriever.on('update', function(ticks){

    processor.updateCandleDB(ticks);

});

processor.on('initialized', function(){

    retriever.start();

});

processor.on('initialDBWrite', function(){

    reporter.updateBalance(false);

    advisor.start();

});

processor.on('update', function(cs){

    if(config.stoplossSettings.enabled) {

        pricemon.check(cs.close);

    }

    aggregator.update();

});

aggregator.on('update', function(cs){

    if(config.stoplossSettings.enabled) {

        pricemon.update(cs);

    }

    advisor.update(cs);

});

advisor.on('advice', function(advice){

    if(advice === 'buy') {

        agent.order(advice);
        
    } else if(advice === 'sell') {

        agent.order(advice);

    }

});

agent.on('realOrder',function(orderDetails){

    if(config.pushOver.enabled) {
        pusher.send('BitBot - Order Placed!', 'Placed ' + orderDetails.orderType + ' order: (' + orderDetails.amount + '@' + orderDetails.price + ')', 'magic', 1);
    }
    
    monitor.add(orderDetails, config.orderKeepAliveMinutes);

});

agent.on('simulatedOrder',function(orderDetails){
    
    if(config.pushOver.enabled) {
        pusher.send('BitBot - Order Simulated!', 'Simulated ' + orderDetails.orderType + ' order: (' + orderDetails.amount + '@' + orderDetails.price + ')', 'magic', 1);
    }

    orderDetails.order = 'Simulated';

    monitor.add(orderDetails, config.orderKeepAliveMinutes);

    reporter.updateBalance(true);

});

monitor.on('filled', function(order) {

    if(order.orderDetails.orderType === 'buy') {

        pricemon.setPosition('bought', order.orderDetails.price);

    } else if(order.orderDetails.orderType === 'sell') {

        pricemon.setPosition('sold', order.orderDetails.price);

    }

    reporter.updateBalance(true);

});

monitor.on('cancelled', function(order) {

    reporter.updateBalance(false);

    setTimeout(function(){

        agent.order(order.orderDetails.orderType);

    }, 1000 * 5);

});

pricemon.on('advice', function(advice) {

    if(advice === 'buy') {

        agent.order(advice);
        
    } else if(advice === 'sell') {

        agent.order(advice);

    }

});

reporter.on('update', function(update){

    

});

reporter.on('report', function(report){

    if(config.pushOver.enabled) {
        pusher.send('BitBot - Profit Report!', report, 'magic', 1);
    }

});

processor.initialize();