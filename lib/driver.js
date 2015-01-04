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
// var EventEmitter = require('events').EventEmitter; // 暂时不需要事件发布.

//var firefox = require('selenium-webdriver/firefox');
var chrome = require('selenium-webdriver/chrome');

process.env.PATH = process.env.PATH + ':' + __dirname;
var chromeDriver;

//var firefoxDriver = new firefox.Driver();

module.exports = SeleniumDriver;

function SeleniumDriver(options) {
  // this._events = new EventEmitter();
  this.includeScripts = options.includeScripts || []; // 固定不变的.每个页面都需要加载的脚本列表
  TotoroDriver.call(this, options);
}

util.inherits(SeleniumDriver, TotoroDriver);

var proto = SeleniumDriver.prototype;

proto.getBrowser = function () {
  var ver = require(path.join('../node_modules/selenium-webdriver/package.json')).version;
  return { name: 'selenium', version: ver };
};

proto.onAdd = function (data) {
  chromeDriver = new chrome.Driver();
  debug('got a order: %j', data);
  this.url = data.url;
  chromeDriver.get(data.url);
  this.loadScripts();
};

proto.loadScripts = function() {
  var that = this;
  if (this.includeScripts) {
    async.eachSeries(this.includeScripts, function(script, cb){
      // create dom script
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
          // 加载完成后, 开始观察 url 变化.
          that._watchUrlChanged(function(url) {
            var script = that._findMappingScript(url);
            if (script) {
              that.script = script;
              that.url = url;
              that.loadScripts();
            } else {
              // TODO 没有找到,可以警告. 如果没有处理, 会自动超时.
            }
          });
        }, 500);
      }
    });
  }
};

// TODO 如果支持此功能需要更精细的检查.
proto._watchUrlChanged = function(cb) {
  var that = this;
  this._timer = setInterval(function() {
    chromeDriver.wait(function() {
      return chromeDriver.getCurrentUrl().then(function(url) {
        if (url.indexOf(that.url) < 0) {
          clearInterval(that._timer);
          cb(url);
        }
        return true;
      });
    });
  }, 1000);
};

proto._findMappingScript = function(url) {
  var that = this;
  var script = null;
  // 如果支持多页面, 需要提前传入 runner 和 测试脚本的对应关系, 也就是 subTasks
  if (this.subTasks) {
    Object.keys(this.subTasks).some(function(subUrl) {
      if (url.indexOf(subUrl) > -1) {
         script = that.subTasks[subUrl];
         return true;
      }
    });
  }
  return script;
};

proto.onRemove = function (data) {
  // the structure is the same as 'add' event's but without the ua
  clearInterval(this._timer);
  chromeDriver.quit();
};

proto.cleanup = function () {
};
