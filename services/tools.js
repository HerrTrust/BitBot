var tools = function() {


};

tools.prototype.unixTimeStamp = function(timestamp) {
    return Math.floor(timestamp/1000);
};

var utiltools = new tools();

module.exports = utiltools; 