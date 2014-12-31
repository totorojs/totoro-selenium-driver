/**!
 * totoro-selenium-driver - lib/driver.js
 *
 * Copyright(c) 2014 leoner and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   leoner <kangpangpang@gmail.com>
 */

"use strict";

/**
 * Module dependencies.
 */

var debug = require('debug')('totoro-selenium-driver');
var TotoroDriver = require('totoro-driver-base');
var webdriver = require('selenium-webdriver');
var path = require('path');
var util = require('util');
var async = require('async');

//var firefox = require('selenium-webdriver/firefox');
var chrome = require('selenium-webdriver/chrome');

process.env.PATH = process.env.PATH + ':' + __dirname;
var chromeDriver;

//var firefoxDriver = new firefox.Driver();

module.exports = SeleniumDriver;

function SeleniumDriver(options) {
  this.includeScripts = options.includeScripts || [];
  TotoroDriver.call(this, options);
}

util.inherits(SeleniumDriver, TotoroDriver);

var proto = SeleniumDriver.prototype;

proto.getBrowser = function () {
  var ver = require(path.join('../node_modules/selenium-webdriver/package.json')).version;
  return { name: 'selenium', version: ver };
};

proto.onAdd = function (data) {
  var that = this;

  chromeDriver = new chrome.Driver();
  debug('got a order: %j', data);

  chromeDriver.get(data.url);
  // create dom script
  if (this.includeScripts) {
    async.eachSeries(this.includeScripts, function(script, cb){
      var str = '(function(){'
      str += 'var script = document.createElement("script");'
      str += 'script.src = "' + script + '";';
      str += 'document.getElementsByTagName("body")[0].appendChild(script);';
      str += '})';
      chromeDriver.executeScript(eval(str)).then(cb);
    }, function() {
      var scriptStr = '(function(){})';
      if (that.script) {
        scriptStr = that.script.replace(/\r\n/g, '');
        setTimeout(function() {
          chromeDriver.executeScript(eval(scriptStr));
        }, 500);
      }
    });
  }
};

proto.onRemove = function (data) {
  // the structure is the same as 'add' event's but without the ua
  chromeDriver.quit();
};

proto.cleanup = function () {
};
