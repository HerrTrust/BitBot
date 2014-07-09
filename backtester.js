var _ = require('underscore');

var dataprocessor = require('./services/dataprocessor.js');
var tradingadvisor = require('./services/tradingadvisor.js');
var pushservice = require('./services/pushservice.js');
var storage = require('./services/candlestorage.js');
var logger = require('./services/loggingservice.js');
var pricemonitor = require('./services/pricemonitor');
var BigNumber = require('bignumber.js');

//------------------------------Config
var config = require('./config.js');
//------------------------------Config

//------------------------------IntializeModules
var processor = new dataprocessor(config.candleStickSizeMinutes);
var advisor = new tradingadvisor(config.indicatorSettings, config.candleStickSizeMinutes);
var pricemon = new pricemonitor(config.stoplossSettings.percentageBought, config.stoplossSettings.percentageSold, config.candleStickSizeMinutes);
//------------------------------IntializeModules

//------------------------------AnnounceStart
console.log('------------------------------------------');
console.log('Starting BitBot Back-Tester v0.6.0');
console.log('Working Dir = ' + process.cwd());
console.log('------------------------------------------');
//------------------------------AnnounceStart

processor.on('initialized', function(){

    var loopArray = storage.getAllCandlesSince();
    var csArray = storage.getFinishedAggregatedCandleSticks(config.candleStickSizeMinutes);

    config.backTesting.USDBalance = config.backTesting.initialBalance;
    config.backTesting.BTCBalance = 0;
    config.backTesting.intialBalanceBTC = Number(BigNumber(config.backTesting.USDBalance).dividedBy(BigNumber(_.first(loopArray).close)).round(2));

    config.transactions = 0;
    config.slTransactions = 0;

    var candleStickSizeSeconds = config.candleStickSizeMinutes * 60;

    if(csArray.length > 0) {

        var csPeriod = _.first(csArray).period + candleStickSizeSeconds;

    } else {

        var csPeriod = 0;

    }

    _.each(loopArray, function(cs) {

        config.backTesting.lastClose = cs.close;

        if(config.stoplossSettings.enabled) {
            pricemon.check(cs.close);
        }

        if(cs.period + 60 === csPeriod) {
            var cs = csArray.shift();
            if(config.stoplossSettings.enabled) {
                pricemon.update(cs);
            }
            logger.debug('Backtest: Created a new ' + config.candleStickSizeMinutes + ' minute candlestick!');
            logger.debug(JSON.stringify(cs));
            advisor.update(cs);
            if(csArray.length > 0) {
                csPeriod = _.first(csArray).period + candleStickSizeSeconds;
            } else {
                csPeriod = 0;
            }
        }

    });

    config.backTesting.totalBalanceInUSD = Number(BigNumber(config.backTesting.USDBalance).plus(BigNumber(config.backTesting.BTCBalance).times(BigNumber(config.backTesting.lastClose))).round(2));
    config.backTesting.totalBalanceInBTC = Number(BigNumber(config.backTesting.BTCBalance).plus(BigNumber(config.backTesting.USDBalance).dividedBy(BigNumber(config.backTesting.lastClose))).round(2));
    config.backTesting.profit = Number(BigNumber(config.backTesting.totalBalanceInUSD).minus(BigNumber(config.backTesting.initialBalance)).round(2));
    config.backTesting.profitPercentage = Number(BigNumber(config.backTesting.profit).dividedBy(BigNumber(config.backTesting.initialBalance)).times(BigNumber(100)).round(2));

    logger.log('----------Report----------');
    logger.log('Transaction Fee: ' + config.backTesting.transactionFee + '%');
    logger.log('Initial Balance: ' + config.backTesting.initialBalance);
    logger.log('Initial Balance BTC: ' + config.backTesting.intialBalanceBTC);
    logger.log('Final Balance: ' + config.backTesting.totalBalanceInUSD);
    logger.log('Final Balance BTC: ' + config.backTesting.totalBalanceInBTC);
    logger.log('Profit: ' + config.backTesting.profit + ' (' + config.backTesting.profitPercentage + '%)');
    logger.log('Open Price: ' + _.first(loopArray).open);
    logger.log('Close Price: ' + _.last(loopArray).close);
    logger.log('Transactions: ' + config.transactions);
    logger.log('Stop Loss Transactions: ' + config.slTransactions);
    logger.log('--------------------------');

});

advisor.on('advice', function(advice){

    if(advice === 'buy' && config.backTesting.USDBalance !== 0) {

        var usableBalance = Number(BigNumber(config.backTesting.USDBalance).times(BigNumber(1).minus(BigNumber(config.backTesting.transactionFee).dividedBy(BigNumber(100)))));

        config.backTesting.BTCBalance = Number(BigNumber(config.backTesting.BTCBalance).plus(BigNumber(usableBalance).dividedBy(BigNumber(config.backTesting.lastClose)).round(2)));
        config.backTesting.USDBalance = 0;

        config.transactions += 1;

        logger.log('Placed buy order @ ' + config.backTesting.lastClose);

        pricemon.setPosition('bought', config.backTesting.lastClose);
        
    } else if(advice === 'sell' && config.backTesting.BTCBalance !== 0) {

        var usableBalance = Number(BigNumber(config.backTesting.BTCBalance).times(BigNumber(1).minus(BigNumber(config.backTesting.transactionFee).dividedBy(BigNumber(100)))));

        config.backTesting.USDBalance = Number(BigNumber(config.backTesting.USDBalance).plus(BigNumber(usableBalance).times(BigNumber(config.backTesting.lastClose)).round(2)));
        config.backTesting.BTCBalance = 0;

        config.transactions += 1;

        logger.log('Placed sell order @ ' + config.backTesting.lastClose);

        pricemon.setPosition('sold', config.backTesting.lastClose);

    } else if(advice === 'buy' || advice === 'sell') {

        logger.log('Wanted to place a ' + advice + ' order @ ' + config.backTesting.lastClose + ', but there are no more funds available to ' + advice);

    }

});

pricemon.on('advice', function(advice) {

    if(advice === 'buy' && config.backTesting.USDBalance !== 0) {

        var usableBalance = Number(BigNumber(config.backTesting.USDBalance).times(BigNumber(1).minus(BigNumber(config.backTesting.transactionFee).dividedBy(BigNumber(100)))));

        config.backTesting.BTCBalance = Number(BigNumber(config.backTesting.BTCBalance).plus(BigNumber(usableBalance).dividedBy(BigNumber(config.backTesting.lastClose)).round(2)));
        config.backTesting.USDBalance = 0;

        config.transactions += 1;
        config.slTransactions += 1;

        logger.log('Stop Loss Placed buy order @ ' + config.backTesting.lastClose);

        pricemon.setPosition('bought', config.backTesting.lastClose);
        
    } else if(advice === 'sell' && config.backTesting.BTCBalance !== 0) {

        var usableBalance = Number(BigNumber(config.backTesting.BTCBalance).times(BigNumber(1).minus(BigNumber(config.backTesting.transactionFee).dividedBy(BigNumber(100)))));

        config.backTesting.USDBalance = Number(BigNumber(config.backTesting.USDBalance).plus(BigNumber(usableBalance).times(BigNumber(config.backTesting.lastClose)).round(2)));
        config.backTesting.BTCBalance = 0;

        config.transactions += 1;
        config.slTransactions += 1;

        logger.log('Stop Loss Placed sell order @ ' + config.backTesting.lastClose);

        pricemon.setPosition('sold', config.backTesting.lastClose);

    }

});

processor.initialize();