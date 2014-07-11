BitBot
======

BitBot is a Crypto-Currency trading bot and backtesting platform that connects to popular Bitcoin exchanges (Bitstamp, Kraken). It is written in javascript and runs on [Node.JS](http://nodejs.org).

# Dependencies

- [Node.JS](http://nodejs.org)
- [MongoDB](http://www.mongodb.org/)

# Installation

Make sure you have the latest Node.JS version and MongoDB installed.

Clone this repository to a folder of your liking and execute the following command:

	npm install

Pay close attention to the log messages of NPM (there shouldn't be any errors).

# Configuration basics

Copy the config.sample.js file and name it config.js.

Fill in the config.js file with relevant information.

When running the bot initially make sure to run with real trading disabled:

	config.tradingEnabled = false;

Choose an exhange you want to trade on in the exchangeSettings:

	exchange: '',
	// Options: (bitstamp, kraken)

Pay close attention to the currencyPair settings:

	currencyPair: {pair: '', asset: '', currency: ''},
	// For Bitstamp just use {pair: 'XBTUSD', asset: 'XBT', currency: 'USD'}
	// For Kraken look up the currency pairs in their API: https://api.kraken.com/0/public/AssetPairs
	// Kraken Example: {pair: 'XXBTZEUR', asset: 'XXBT', currency: 'ZEUR'}

Then fill in your API details:

	config.apiSettings = {
		bitstamp: {clientId: 0, apiKey: '', secret: ''},
		kraken: {apiKey: '', secret: ''}
	};

Lastly make sure you enter the correct connection string for your MongoDB instance:

	config.mongoConnectionString = 'username:password@example.com/mydb';

By default you will see a lot of debugging information, once you are sure that your bot is retrieving data change the debug setting to false:

	config.debug = false;

These are the minimum required settings you need to get the bot started.
All other settings are user preference and should be pretty self explanatory.

# Usage

Execute the following command in the folder where you installed BitBot:

	node app.js

If you would like to simulate trading on your collected data, execute:

	node backtester.js

# Profitability

The provided trading algorithms are well known and documented on the internet (MADC, PPO). I do not guarantee you will make any profit when using this bot...
For better results, consider writing your own algorithm and share it with the community in a pull request :-).

# Discussion

For discussion on this bot visit the bitcointalk [topic](https://bitcointalk.org/index.php?topic=683755.0).