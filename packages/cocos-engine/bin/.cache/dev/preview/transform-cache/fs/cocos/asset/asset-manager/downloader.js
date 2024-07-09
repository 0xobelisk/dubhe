System.register("q-bundled:///fs/cocos/asset/asset-manager/downloader.js", ["../../../../virtual/internal%253Aconstants.js", "../../core/index.js", "./cache.js", "./download-dom-image.js", "./download-file.js", "./download-script.js", "./shared.js", "./utilities.js", "../../serialization/ccon.js"], function (_export, _context) {
  "use strict";

  var BUILD, EDITOR, EDITOR_NOT_IN_PREVIEW, sys, js, misc, path, cclegacy, Cache, downloadDomImage, downloadFile, downloadScript, files, retry, urlAppendTimestamp, CCON, parseCCONJson, decodeCCONBinary, REGEX, downloadImage, downloadBlob, downloadJson, downloadArrayBuffer, downloadCCON, downloadCCONB, downloadText, downloadBundle, Downloader, downloader;
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             https://www.cocos.com/
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             Permission is hereby granted, free of charge, to any person obtaining a copy
                                                                                                                                                                                                                                                                                                                                                                                             of this software and associated documentation files (the "Software"), to deal
                                                                                                                                                                                                                                                                                                                                                                                             in the Software without restriction, including without limitation the rights to
                                                                                                                                                                                                                                                                                                                                                                                             use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
                                                                                                                                                                                                                                                                                                                                                                                             of the Software, and to permit persons to whom the Software is furnished to do so,
                                                                                                                                                                                                                                                                                                                                                                                             subject to the following conditions:
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             The above copyright notice and this permission notice shall be included in
                                                                                                                                                                                                                                                                                                                                                                                             all copies or substantial portions of the Software.
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                                                                                                                                                                                                                                                                                                                                                                                             IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                                                                                                                                                                                                                                                                                                                                                                                             FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                                                                                                                                                                                                                                                                                                                                                                                             AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                                                                                                                                                                                                                                                                                                                                                                                             LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                                                                                                                                                                                                                                                                                                                                                                                             OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
                                                                                                                                                                                                                                                                                                                                                                                             THE SOFTWARE.
                                                                                                                                                                                                                                                                                                                                                                                            */
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      BUILD = _virtualInternal253AconstantsJs.BUILD;
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
      EDITOR_NOT_IN_PREVIEW = _virtualInternal253AconstantsJs.EDITOR_NOT_IN_PREVIEW;
    }, function (_coreIndexJs) {
      sys = _coreIndexJs.sys;
      js = _coreIndexJs.js;
      misc = _coreIndexJs.misc;
      path = _coreIndexJs.path;
      cclegacy = _coreIndexJs.cclegacy;
    }, function (_cacheJs) {
      Cache = _cacheJs.default;
    }, function (_downloadDomImageJs) {
      downloadDomImage = _downloadDomImageJs.default;
    }, function (_downloadFileJs) {
      downloadFile = _downloadFileJs.default;
    }, function (_downloadScriptJs) {
      downloadScript = _downloadScriptJs.default;
    }, function (_sharedJs) {
      files = _sharedJs.files;
    }, function (_utilitiesJs) {
      retry = _utilitiesJs.retry;
      urlAppendTimestamp = _utilitiesJs.urlAppendTimestamp;
    }, function (_serializationCconJs) {
      CCON = _serializationCconJs.CCON;
      parseCCONJson = _serializationCconJs.parseCCONJson;
      decodeCCONBinary = _serializationCconJs.decodeCCONBinary;
    }],
    execute: function () {
      REGEX = /^(?:\w+:\/\/|\.+\/).+/;
      downloadImage = function downloadImage(url, options, onComplete) {
        // if createImageBitmap is valid, we can transform blob to ImageBitmap. Otherwise, just use HTMLImageElement to load
        var func = sys.hasFeature(sys.Feature.IMAGE_BITMAP) && cclegacy.assetManager.allowImageBitmap ? downloadBlob : downloadDomImage;
        func(url, options, onComplete);
      };
      downloadBlob = function downloadBlob(url, options, onComplete) {
        options.xhrResponseType = 'blob';
        downloadFile(url, options, options.onFileProgress, onComplete);
      };
      downloadJson = function downloadJson(url, options, onComplete) {
        options.xhrResponseType = 'json';
        downloadFile(url, options, options.onFileProgress, onComplete);
      };
      downloadArrayBuffer = function downloadArrayBuffer(url, options, onComplete) {
        options.xhrResponseType = 'arraybuffer';
        downloadFile(url, options, options.onFileProgress, onComplete);
      };
      downloadCCON = function downloadCCON(url, options, onComplete) {
        downloader._downloadJson(url, options, function (err, json) {
          if (err) {
            onComplete(err);
            return;
          }
          var cconPreface = parseCCONJson(json);
          var chunkPromises = Promise.all(cconPreface.chunks.map(function (chunk) {
            return new Promise(function (resolve, reject) {
              downloader._downloadArrayBuffer("" + path.mainFileName(url) + chunk, {}, function (errChunk, chunkBuffer) {
                if (err) {
                  reject(err);
                } else {
                  resolve(new Uint8Array(chunkBuffer));
                }
              });
            });
          }));
          chunkPromises.then(function (chunks) {
            var ccon = new CCON(cconPreface.document, chunks);
            onComplete(null, ccon);
          })["catch"](function (err) {
            onComplete(err);
          });
        });
      };
      downloadCCONB = function downloadCCONB(url, options, onComplete) {
        downloader._downloadArrayBuffer(url, options, function (err, arrayBuffer) {
          if (err) {
            onComplete(err);
            return;
          }
          try {
            var ccon = decodeCCONBinary(new Uint8Array(arrayBuffer));
            onComplete(null, ccon);
          } catch (err) {
            onComplete(err);
          }
        });
      };
      downloadText = function downloadText(url, options, onComplete) {
        options.xhrResponseType = 'text';
        downloadFile(url, options, options.onFileProgress, onComplete);
      };
      downloadBundle = function downloadBundle(nameOrUrl, options, onComplete) {
        var bundleName = path.basename(nameOrUrl);
        var url = nameOrUrl;
        if (!REGEX.test(url)) {
          if (downloader.remoteBundles.indexOf(bundleName) !== -1) {
            url = downloader.remoteServerAddress + "remote/" + bundleName;
          } else {
            url = "assets/" + bundleName;
          }
        }
        var version = options.version || downloader.bundleVers[bundleName];
        var count = 0;
        var config = url + "/config." + (version ? version + "." : '') + "json";
        var out = null;
        var error = null;
        downloadJson(config, options, function (err, response) {
          error = err || error;
          out = response;
          if (out) {
            out.base = url + "/";
          }
          if (++count === 2) {
            onComplete(error, out);
          }
        });
        var jspath = url + "/index." + (version ? version + "." : '') + "js";
        downloadScript(jspath, options, function (err) {
          error = err || error;
          if (++count === 2) {
            onComplete(error, out);
          }
        });
      };
      /**
       * @en
       * Manages all download process, it is a singleton.
       * You can access it via [[AssetManager.downloader]], It can download various types of files.
       *
       * @zh
       * 管理所有下载过程，downloader 是个单例，你能通过 [[AssetManager.downloader]] 访问它，它能下载各种类型的文件。
       *
       */
      _export("Downloader", Downloader = /*#__PURE__*/function () {
        var _proto = Downloader.prototype;
        /**
         * @engineInternal
         */
        _proto.init = function init(remoteServerAddress, bundleVers, remoteBundles) {
          if (remoteServerAddress === void 0) {
            remoteServerAddress = '';
          }
          if (bundleVers === void 0) {
            bundleVers = {};
          }
          if (remoteBundles === void 0) {
            remoteBundles = [];
          }
          this._downloading.clear();
          this._queue.length = 0;
          this._remoteServerAddress = remoteServerAddress;
          this.bundleVers = bundleVers;
          this.remoteBundles = remoteBundles;
        }

        /**
         * @en
         * Register custom handler if you want to change default behavior or extend downloader to download other format file.
         *
         * @zh
         * 当你想修改默认行为或者拓展 downloader 来下载其他格式文件时可以注册自定义的 handler。
         *
         * @param type
         * @en Extension name likes '.jpg' or map likes {'.jpg': jpgHandler, '.png': pngHandler}.
         * @zh 扩展名，或者形如 {'.jpg': jpgHandler, '.png': pngHandler} 的映射表。
         * @param handler @en Customized handling for this extension. @zh 针对此扩展名的自定义的处理方法。
         * @param handler.url @en The url to be downloaded. @zh 待下载的 url.
         * @param handler.options @en Some optional parameters will be transferred to handler. @zh 传递到处理方法的可选参数。
         * @param handler.onComplete
         * @en Callback when finishing downloading. You need to call this method manually and pass in the execution result after the custom handler
         * is executed.
         * @zh 完成下载后的回调。你需要在自定义处理方法执行完后手动调用此方法，并将执行结果传入。
         *
         * @example
         * downloader.register('.tga', (url, options, onComplete) => onComplete(null, null));
         * downloader.register({'.tga': (url, options, onComplete) => onComplete(null, null),
         *                      '.ext': (url, options, onComplete) => onComplete(null, null)});
         *
         */;
        _proto.register = function register(type, handler) {
          if (typeof type === 'object') {
            js.mixin(this._downloaders, type);
          } else {
            this._downloaders[type] = handler;
          }
        }

        /**
         * @en
         * Use corresponding handler to download file under limitation.
         *
         * @zh
         * 在限制下使用对应的 handler 来下载文件。
         *
         * @param id @en The unique id of this download. @zh 本次下载的唯一 id.
         * @param url @en The url should be downloaded. @zh 待下载的 url。
         * @param type @en The type indicates that which handler should be used to download, such as '.jpg'. @zh 要使用的处理方法的类型，例如 '.jpg'。
         * @param options @en Some optional parameters will be transferred to the corresponding handler. @zh 传递到处理方法的一些可选参数。
         * @param options.onFileProgress @en Progressive callback will be transferred to handler. @zh 传递到处理方法的进度回调。
         * @param options.maxRetryCount @en How many times should retry when download failed. @zh 下载失败后的重试数量。
         * @param options.maxConcurrency @en The maximum number of concurrent when downloading. @zh 下载的最大并行数。
         * @param options.maxRequestsPerFrame @en The maximum number of request can be launched per frame when downloading. @zh 每帧能发起的最大请求数量，在下载时。
         * @param options.priority @en The priority of this url, default is 0, the greater number is higher priority. @zh 下载的优先级，值越大优先级越高。
         * @param onComplete @en Callback when finishing downloading. @zh 完成下载后的回调。
         * @param onComplete.err @en The occurred error, null indicates success. @zh 下载过程中出现的错误，如果为 null 则表明下载成功。
         * @param onComplete.content @en The downloaded file. @zh 下载下来的文件内容。
         *
         * @example
         * download('http://example.com/test.tga', '.tga', { onFileProgress: (loaded, total) => console.log(loaded/total) },
         *      onComplete: (err) => console.log(err));
         */;
        _proto.download = function download(id, url, type, options, onComplete) {
          var _this = this;
          // if it is downloaded, don't download again
          var file = files.get(id);
          if (file) {
            onComplete(null, file);
            return;
          }
          var downloadCallbacks = this._downloading.get(id);
          if (downloadCallbacks) {
            downloadCallbacks.push(onComplete);
            var request = this._queue.find(function (x) {
              return x.id === id;
            });
            if (!request) {
              return;
            }
            var priority = options.priority || 0;
            if (request.priority < priority) {
              request.priority = priority;
              this._queueDirty = true;
            }
            return;
          }

          // if download fail, should retry
          var maxRetryCount = typeof options.maxRetryCount !== 'undefined' ? options.maxRetryCount : this.maxRetryCount;
          var maxConcurrency = typeof options.maxConcurrency !== 'undefined' ? options.maxConcurrency : this.maxConcurrency;
          var maxRequestsPerFrame = typeof options.maxRequestsPerFrame !== 'undefined' ? options.maxRequestsPerFrame : this.maxRequestsPerFrame;
          var handler = this._downloaders[type] || this._downloaders["default"];
          var process = function process(index, callback) {
            if (index === 0) {
              _this._downloading.add(id, [onComplete]);
            }
            if (!_this.limited) {
              handler(urlAppendTimestamp(url, _this.appendTimeStamp), options, callback);
              return;
            }

            // refresh
            _this._updateTime();
            var done = function done(err, data) {
              // when finish downloading, update _totalNum
              _this._totalNum--;
              _this._handleQueueInNextFrame(maxConcurrency, maxRequestsPerFrame);
              callback(err, data);
            };
            if (_this._totalNum < maxConcurrency && _this._totalNumThisPeriod < maxRequestsPerFrame) {
              handler(urlAppendTimestamp(url, _this.appendTimeStamp), options, done);
              _this._totalNum++;
              _this._totalNumThisPeriod++;
            } else {
              // when number of request up to limitation, cache the rest
              _this._queue.push({
                id: id,
                priority: options.priority || 0,
                url: url,
                options: options,
                done: done,
                handler: handler
              });
              _this._queueDirty = true;
              if (_this._totalNum < maxConcurrency) {
                _this._handleQueueInNextFrame(maxConcurrency, maxRequestsPerFrame);
              }
            }
          };

          // when retry finished, invoke callbacks
          var finale = function finale(err, result) {
            if (!err) {
              files.add(id, result);
            }
            var callbacks = _this._downloading.remove(id);
            for (var i = 0, l = callbacks.length; i < l; i++) {
              callbacks[i](err, result);
            }
          };
          retry(process, maxRetryCount, this.retryInterval, finale);
        }

        /**
         * @en Load sub package with name.
         * @zh 通过子包名加载子包。
         * @param name @en Sub package name. @zh 子包名称。
         * @param completeCallback @en Callback invoked when sub package loaded. @zh 子包加载完成后的回调。
         * @param completeCallback.error @en Error information. Will be null if loaded successfully. @zh 错误信息。如果加载成功则为 null。
         *
         * @deprecated loader.downloader.loadSubpackage is deprecated, please use AssetManager.loadBundle instead.
         */;
        _proto.loadSubpackage = function loadSubpackage(name, completeCallback) {
          cclegacy.assetManager.loadBundle(name, null, completeCallback);
        };
        function Downloader() {
          /**
           * @en
           * The maximum number of concurrent when downloading.
           *
           * @zh
           * 下载时的最大并发数。
           */
          this.maxConcurrency = 15;
          /**
           * @en
           * The maximum number of request can be launched per frame when downloading.
           *
           * @zh
           * 下载时每帧可以启动的最大请求数。
           *
           */
          this.maxRequestsPerFrame = 15;
          /**
           * @en
           * The max number of retries when fail.
           *
           * @zh
           * 失败重试次数。
           *
           */
          this.maxRetryCount = BUILD ? 3 : 0;
          /**
           * Whether to automatically add a timestamp after the url.
           * This function is mainly used to prevent the browser from using cache in editor mode.
           * You don't need to change it at runtime.
           * @internal
           */
          this.appendTimeStamp = !!EDITOR_NOT_IN_PREVIEW;
          /**
           * @engineInternal
           */
          this.limited = !EDITOR;
          /**
           * @en
           * Wait for while before another retry, unit: ms.
           *
           * @zh
           * 重试的间隔时间，单位为毫秒。
           *
           */
          this.retryInterval = 2000;
          /**
           * @en Version information of all bundles.
           * @zh 所有包的版本信息。
           */
          this.bundleVers = {};
          /**
           * @en The names of remote bundles.
           * @zh 远程包名列表。
           */
          this.remoteBundles = [];
          /**
           * @deprecated Since v3.7, this is an engine internal interface. You can easily implement the functionality of this API using HTMLImageElement.
           */
          this.downloadDomImage = downloadDomImage;
          /**
           * @deprecated Since v3.7, this is an engine internal interface. You can easily implement the functionality of this API using HTMLAudioElement.
           */
          this.downloadDomAudio = null;
          /**
           * @deprecated Since v3.7, this is an engine internal interface. You can easily implement the functionality of this API using XMLHttpRequest.
           */
          this.downloadFile = downloadFile;
          /**
           * @deprecated Since v3.7, this is an engine internal interface. You can easily implement the functionality of this API using XMLHttpRequest.
           */
          this.downloadScript = downloadScript;
          /**
           * @engineInternal
           */
          this._downloadArrayBuffer = downloadArrayBuffer;
          /**
           * @engineInternal
           */
          this._downloadJson = downloadJson;
          // default handler map
          this._downloaders = {
            // Images
            '.png': downloadImage,
            '.jpg': downloadImage,
            '.bmp': downloadImage,
            '.jpeg': downloadImage,
            '.gif': downloadImage,
            '.ico': downloadImage,
            '.tiff': downloadImage,
            '.webp': downloadImage,
            '.image': downloadImage,
            '.pvr': downloadArrayBuffer,
            '.pkm': downloadArrayBuffer,
            '.astc': downloadArrayBuffer,
            // Txt
            '.txt': downloadText,
            '.xml': downloadText,
            '.vsh': downloadText,
            '.fsh': downloadText,
            '.atlas': downloadText,
            '.tmx': downloadText,
            '.tsx': downloadText,
            '.json': downloadJson,
            '.ExportJson': downloadJson,
            '.plist': downloadText,
            '.ccon': downloadCCON,
            '.cconb': downloadCCONB,
            '.fnt': downloadText,
            // Binary
            '.binary': downloadArrayBuffer,
            '.bin': downloadArrayBuffer,
            '.dbbin': downloadArrayBuffer,
            '.skel': downloadArrayBuffer,
            '.js': downloadScript,
            bundle: downloadBundle,
            "default": downloadText
          };
          this._downloading = new Cache();
          this._queue = [];
          this._queueDirty = false;
          // the number of loading thread
          this._totalNum = 0;
          // the number of request that launched in this period
          this._totalNumThisPeriod = 0;
          // last time, if now - lastTime > period, refresh _totalNumThisPeriod.
          this._lastDate = -1;
          // if _totalNumThisPeriod equals max, move request to next period using setTimeOut.
          this._checkNextPeriod = false;
          this._remoteServerAddress = '';
          this._maxInterval = 1 / 30;
        }
        _proto._updateTime = function _updateTime() {
          var now = performance.now();
          // use deltaTime as interval
          var deltaTime = cclegacy.game.deltaTime;
          var interval = deltaTime > this._maxInterval ? this._maxInterval : deltaTime;
          if (now - this._lastDate > interval * 1000) {
            this._totalNumThisPeriod = 0;
            this._lastDate = now;
          }
        }

        // handle the rest request in next period
        ;
        _proto._handleQueue = function _handleQueue(maxConcurrency, maxRequestsPerFrame) {
          this._checkNextPeriod = false;
          this._updateTime();
          while (this._queue.length > 0 && this._totalNum < maxConcurrency && this._totalNumThisPeriod < maxRequestsPerFrame) {
            if (this._queueDirty) {
              this._queue.sort(function (a, b) {
                return a.priority - b.priority;
              });
              this._queueDirty = false;
            }
            var request = this._queue.pop();
            if (!request) {
              break;
            }
            this._totalNum++;
            this._totalNumThisPeriod++;
            request.handler(urlAppendTimestamp(request.url, this.appendTimeStamp), request.options, request.done);
          }
          this._handleQueueInNextFrame(maxConcurrency, maxRequestsPerFrame);
        };
        _proto._handleQueueInNextFrame = function _handleQueueInNextFrame(maxConcurrency, maxRequestsPerFrame) {
          if (!this._checkNextPeriod && this._queue.length > 0) {
            misc.callInNextTick(this._handleQueue.bind(this), maxConcurrency, maxRequestsPerFrame);
            this._checkNextPeriod = true;
          }
        };
        _createClass(Downloader, [{
          key: "remoteServerAddress",
          get:
          /**
           * @en
           * The address of remote server.
           *
           * @zh
           * 远程服务器地址。
           *
           */
          function get() {
            return this._remoteServerAddress;
          }
        }], [{
          key: "instance",
          get:
          /**
           * @en Global singleton for [[Downloader]]. You can access it via [[AssetManager.downloader]].
           * @zh [[Downloader]] 的全局单例. 你可以通过 [[AssetManager.downloader]] 访问.
           */
          function get() {
            if (!Downloader._instance) {
              Downloader._instance = new Downloader();
            }
            return Downloader._instance;
          }
        }]);
        return Downloader;
      }());
      Downloader._instance = void 0;
      downloader = Downloader.instance;
      _export("default", Downloader.instance);
    }
  };
});