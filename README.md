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

These are the minimum required settings you need to get the bot started.
All other settings are user preference and should be pretty self explanatory.

# Usage

Copy the config.sample.js file and name it config.js.

Fill in the config.js file with relevant information.

Execute the following command in the folder where you installed BitBot:

	node app.js

If you would like to simulate trading on your collected data, execute:

	node backtester.js