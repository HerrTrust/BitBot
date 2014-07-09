var config = {};

//------------------------------UserParams

//------------------------------EnableRealTrading
config.tradingEnabled = false;
//------------------------------EnableRealTrading

//------------------------------exchangeSettings
config.exchangeSettings = {
	exchange: '',
	// Options: (bitstamp, kraken)
	currencyPair: {pair: '', asset: '', currency: ''},
	// For Bitstamp just use {pair: 'XBTUSD', asset: 'XBT', currency: 'USD'}
	// For Kraken look up the currency pairs in their API: https://api.kraken.com/0/public/AssetPairs
	// Kraken Example: {pair: 'XXBTZEUR', asset: 'XXBT', currency: 'ZEUR'}
	tradingReserveAsset: 0,
	// Enter an amount of "asset" you would like to freeze (not trade)
	tradingReserveCurrency: 0,
	// Enter an amount of "currency" you would like to freeze (not trade)
	slippagePercentage: 0.1
};
//------------------------------exchangeSettings

//------------------------------APISettings
config.apiSettings = {
	bitstamp: {clientId: 0, apiKey: '', secret: ''},
	kraken: {apiKey: '', secret: ''}
};
//------------------------------APISettings

//------------------------------dbSettings
config.mongoConnectionString = 'localhost/bitbot';
// The connection string for your MongoDB Installation
//------------------------------dbSettings

//------------------------------downloaderSettings
config.downloaderRefreshSeconds = 10;
// Best to keep this default setting unless you know what you are doing
//------------------------------downloaderSettings

//------------------------------candleStickSizeSettings
config.candleStickSizeMinutes = 5;
//------------------------------candleStickSizeSettings

//------------------------------orderSettings
config.orderKeepAliveMinutes = config.candleStickSizeMinutes / 10;
//------------------------------orderSettings

//------------------------------IndicatorSettings
config.indicatorSettings = {
	indicator: 'MACD',
	// Options: (MACD, PPO)
	options: {neededPeriods: 26, longPeriods: 26, shortPeriods: 12, emaPeriods: 9},
	buyTreshold: 0,
	sellTreshold: 0
};
//------------------------------IndicatorSettings

//------------------------------stopLossSettings
config.stoplossSettings = {
	enabled: false,
	percentageBought: 1,
	percentageSold: 1
}
//------------------------------stopLossSettings

//------------------------------PushOver
config.pushOver = {
	enabled: false,
	pushUserId: '',
	pushAppToken: ''
};
// You can receive push notifications using pushover if you fill in these settings (https://pushover.net/).
//------------------------------PushOver

//------------------------------BackTesting
config.backTesting = {
	initialBalance: 10000,
	transactionFee: 0
};
//------------------------------BackTesting

//------------------------------Debug
config.debug = true;
//------------------------------Debug

//------------------------------UserParams

module.exports = config;