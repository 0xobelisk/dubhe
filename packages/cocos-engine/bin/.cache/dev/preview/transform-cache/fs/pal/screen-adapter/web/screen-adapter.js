System.register("q-bundled:///fs/pal/screen-adapter/web/screen-adapter.js", ["../../../../virtual/internal%253Aconstants.js", "pal/system-info", "../../../cocos/core/platform/debug.js", "../../../cocos/core/event/event-target.js", "../../../cocos/core/math/index.js", "../enum-type/index.js", "../../../predefine.js", "../../integrity-check.js", "../../system-info/enum-type/index.js"], function (_export, _context) {
  "use strict";

  var EDITOR, TEST, systemInfo, warnID, EventTarget, Size, Orientation, legacyCC, checkPalIntegrity, withImpl, OS, EVENT_TIMEOUT, orientationMap, WindowType, ScreenAdapter, screenAdapter;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); } /*
                                                                                                                                                                                                            Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                           
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
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
      TEST = _virtualInternal253AconstantsJs.TEST;
    }, function (_palSystemInfo) {
      systemInfo = _palSystemInfo.systemInfo;
    }, function (_cocosCorePlatformDebugJs) {
      warnID = _cocosCorePlatformDebugJs.warnID;
    }, function (_cocosCoreEventEventTargetJs) {
      EventTarget = _cocosCoreEventEventTargetJs.EventTarget;
    }, function (_cocosCoreMathIndexJs) {
      Size = _cocosCoreMathIndexJs.Size;
    }, function (_enumTypeIndexJs) {
      Orientation = _enumTypeIndexJs.Orientation;
    }, function (_predefineJs) {
      legacyCC = _predefineJs.default;
    }, function (_integrityCheckJs) {
      checkPalIntegrity = _integrityCheckJs.checkPalIntegrity;
      withImpl = _integrityCheckJs.withImpl;
    }, function (_systemInfoEnumTypeIndexJs) {
      OS = _systemInfoEnumTypeIndexJs.OS;
    }],
    execute: function () {
      EVENT_TIMEOUT = EDITOR ? 5 : 200;
      orientationMap = {
        auto: Orientation.AUTO,
        landscape: Orientation.LANDSCAPE,
        portrait: Orientation.PORTRAIT
      };
      /**
       * On Web platform, the game window may points to different type of window.
       */
      (function (WindowType) {
        WindowType[WindowType["Unknown"] = 0] = "Unknown";
        WindowType[WindowType["SubFrame"] = 1] = "SubFrame";
        WindowType[WindowType["BrowserWindow"] = 2] = "BrowserWindow";
        WindowType[WindowType["Fullscreen"] = 3] = "Fullscreen";
      })(WindowType || (WindowType = {}));
      ScreenAdapter = /*#__PURE__*/function (_EventTarget) {
        _inheritsLoose(ScreenAdapter, _EventTarget);
        var _proto = ScreenAdapter.prototype;
        _proto._updateFrame = function _updateFrame() {
          this._updateFrameState();
          this._resizeFrame();
        };
        //Store the device's orientation.

        function ScreenAdapter() {
          var _this;
          _this = _EventTarget.call(this) || this;
          // TODO: need to access frame from 'pal/launcher' module
          _this.isFrameRotated = false;
          _this.handleResizeEvent = true;
          _this._gameFrame = void 0;
          _this._gameContainer = void 0;
          _this._gameCanvas = void 0;
          _this._isProportionalToFrame = false;
          _this._cachedFrameStyle = {
            width: '0px',
            height: '0px'
          };
          _this._cachedContainerStyle = {
            width: '0px',
            height: '0px'
          };
          _this._cbToUpdateFrameBuffer = void 0;
          _this._supportFullScreen = false;
          _this._touchEventName = void 0;
          _this._onFullscreenChange = void 0;
          _this._onFullscreenError = void 0;
          // We need to set timeout to handle screen event.
          _this._orientationChangeTimeoutId = -1;
          _this._cachedFrameSize = new Size(0, 0);
          // cache before enter fullscreen.
          _this._exactFitScreen = false;
          _this._isHeadlessMode = false;
          _this._fn = {};
          // Function mapping for cross browser support
          _this._fnGroup = [['requestFullscreen', 'exitFullscreen', 'fullscreenchange', 'fullscreenEnabled', 'fullscreenElement', 'fullscreenerror'], ['requestFullScreen', 'exitFullScreen', 'fullScreenchange', 'fullScreenEnabled', 'fullScreenElement', 'fullscreenerror'], ['webkitRequestFullScreen', 'webkitCancelFullScreen', 'webkitfullscreenchange', 'webkitIsFullScreen', 'webkitCurrentFullScreenElement', 'webkitfullscreenerror'], ['mozRequestFullScreen', 'mozCancelFullScreen', 'mozfullscreenchange', 'mozFullScreen', 'mozFullScreenElement', 'mozfullscreenerror'], ['msRequestFullscreen', 'msExitFullscreen', 'MSFullscreenChange', 'msFullscreenEnabled', 'msFullscreenElement', 'msfullscreenerror']];
          _this._resolutionScale = 1;
          _this._orientation = Orientation.AUTO;
          //The orientation set by user.
          _this._orientationDevice = Orientation.AUTO;
          _this._gameFrame = document.getElementById('GameDiv');
          _this._gameContainer = document.getElementById('Cocos3dGameContainer');
          _this._gameCanvas = document.getElementById('GameCanvas');
          // Compability with old preview or build template in Editor.
          if (!TEST && !EDITOR) {
            if (!_this._gameFrame) {
              var _this$_gameCanvas, _this$_gameCanvas$par;
              _this._gameFrame = document.createElement('div');
              _this._gameFrame.setAttribute('id', 'GameDiv');
              (_this$_gameCanvas = _this._gameCanvas) === null || _this$_gameCanvas === void 0 ? void 0 : (_this$_gameCanvas$par = _this$_gameCanvas.parentNode) === null || _this$_gameCanvas$par === void 0 ? void 0 : _this$_gameCanvas$par.insertBefore(_this._gameFrame, _this._gameCanvas);
              _this._gameFrame.appendChild(_this._gameCanvas);
            }
            if (!_this._gameContainer) {
              var _this$_gameCanvas2, _this$_gameCanvas2$pa;
              _this._gameContainer = document.createElement('div');
              _this._gameContainer.setAttribute('id', 'Cocos3dGameContainer');
              (_this$_gameCanvas2 = _this._gameCanvas) === null || _this$_gameCanvas2 === void 0 ? void 0 : (_this$_gameCanvas2$pa = _this$_gameCanvas2.parentNode) === null || _this$_gameCanvas2$pa === void 0 ? void 0 : _this$_gameCanvas2$pa.insertBefore(_this._gameContainer, _this._gameCanvas);
              _this._gameContainer.appendChild(_this._gameCanvas);
            }
          }
          var fnList;
          var fnGroup = _this._fnGroup;
          for (var i = 0; i < fnGroup.length; i++) {
            fnList = fnGroup[i];
            // detect event support
            if (typeof document[fnList[1]] !== 'undefined') {
              for (var _i = 0; _i < fnList.length; _i++) {
                _this._fn[fnGroup[0][_i]] = fnList[_i];
              }
              break;
            }
          }
          _this._supportFullScreen = _this._fn.requestFullscreen !== undefined;
          _this._touchEventName = 'ontouchstart' in window ? 'touchend' : 'mousedown';
          _this._registerEvent();
          return _this;
        }
        _proto.init = function init(options, cbToRebuildFrameBuffer) {
          this._cbToUpdateFrameBuffer = cbToRebuildFrameBuffer;
          this.orientation = orientationMap[options.configOrientation];
          this._exactFitScreen = options.exactFitScreen;
          this._isHeadlessMode = options.isHeadlessMode;
          this._resizeFrame();
        };
        _proto.requestFullScreen = function requestFullScreen() {
          var _this2 = this;
          return new Promise(function (resolve, reject) {
            if (_this2.isFullScreen) {
              resolve();
              return;
            }
            _this2._cachedFrameSize = _this2.windowSize;
            _this2._doRequestFullScreen().then(function () {
              resolve();
            })["catch"](function () {
              var fullscreenTarget = _this2._getFullscreenTarget();
              if (!fullscreenTarget) {
                reject(new Error('Cannot access fullscreen target'));
                return;
              }
              fullscreenTarget.addEventListener(_this2._touchEventName, function () {
                _this2._doRequestFullScreen().then(function () {
                  resolve();
                })["catch"](reject);
              }, {
                once: true,
                capture: true
              });
            });
          });
        };
        _proto.exitFullScreen = function exitFullScreen() {
          var _this3 = this;
          return new Promise(function (resolve, reject) {
            var requestPromise = document[_this3._fn.exitFullscreen]();
            if (window.Promise && requestPromise instanceof Promise) {
              requestPromise.then(function () {
                _this3.windowSize = _this3._cachedFrameSize;
                resolve();
              })["catch"](reject);
              return;
            }
            _this3.windowSize = _this3._cachedFrameSize;
            resolve();
          });
        };
        _proto._registerEvent = function _registerEvent() {
          var _this4 = this;
          document.addEventListener(this._fn.fullscreenerror, function () {
            var _this4$_onFullscreenE;
            (_this4$_onFullscreenE = _this4._onFullscreenError) === null || _this4$_onFullscreenE === void 0 ? void 0 : _this4$_onFullscreenE.call(_this4);
          });
          window.addEventListener('resize', function () {
            // if (!this.handleResizeEvent) {
            //     return;
            // }
            _this4._resizeFrame();
          });
          var notifyOrientationChange = function notifyOrientationChange(orientation) {
            if (orientation === _this4._orientationDevice) {
              return;
            }
            _this4._orientationDevice = orientation;
            _this4._updateFrame();
            _this4.emit('orientation-change', orientation);
          };
          var getOrientation = function getOrientation() {
            var tmpOrientation = Orientation.PORTRAIT;
            switch (window.orientation) {
              case 0:
                tmpOrientation = Orientation.PORTRAIT;
                break;
              case 90:
                // Handle landscape orientation, top side facing to the right
                tmpOrientation = Orientation.LANDSCAPE_RIGHT;
                break;
              case -90:
                // Handle landscape orientation, top side facing to the left
                tmpOrientation = Orientation.LANDSCAPE_LEFT;
                break;
              case 180:
                tmpOrientation = Orientation.PORTRAIT_UPSIDE_DOWN;
                break;
              default:
                tmpOrientation = _this4._orientationDevice;
                break;
            }
            return tmpOrientation;
          };
          /*After receive orientation-change event, window.innerWidth & innerHeight may not change immediately,
          so we delay EVENT_TIMEOUT to handle orientation-change.*/
          var handleOrientationChange;
          var orientationChangeCallback = function orientationChangeCallback() {
            if (_this4._orientationChangeTimeoutId !== -1) {
              clearTimeout(_this4._orientationChangeTimeoutId);
            }
            _this4._orientationChangeTimeoutId = setTimeout(function () {
              handleOrientationChange();
            }, EVENT_TIMEOUT);
          };
          if (typeof window.matchMedia === 'function') {
            var updateDPRChangeListener = function updateDPRChangeListener() {
              var _window$matchMedia, _window$matchMedia$ad;
              var dpr = window.devicePixelRatio;
              // NOTE: some browsers especially on iPhone doesn't support MediaQueryList
              (_window$matchMedia = window.matchMedia("(resolution: " + dpr + "dppx)")) === null || _window$matchMedia === void 0 ? void 0 : (_window$matchMedia$ad = _window$matchMedia.addEventListener) === null || _window$matchMedia$ad === void 0 ? void 0 : _window$matchMedia$ad.call(_window$matchMedia, 'change', function () {
                _this4.emit('window-resize', _this4.windowSize.width, _this4.windowSize.height);
                updateDPRChangeListener();
              }, {
                once: true
              });
            };
            updateDPRChangeListener();
            var mediaQueryPortrait = window.matchMedia('(orientation: portrait)');
            var mediaQueryLandscape = window.matchMedia('(orientation: landscape)');
            // eslint-disable-next-line no-restricted-globals
            var hasScreeOrientation = screen.orientation;
            handleOrientationChange = function handleOrientationChange() {
              var tmpOrientation = _this4._orientationDevice;
              if (mediaQueryPortrait.matches) {
                tmpOrientation = Orientation.PORTRAIT;
                if (hasScreeOrientation) {
                  // eslint-disable-next-line no-restricted-globals
                  var orientationType = screen.orientation.type;
                  if (orientationType === 'portrait-primary') {
                    tmpOrientation = Orientation.PORTRAIT;
                  } else {
                    tmpOrientation = Orientation.PORTRAIT_UPSIDE_DOWN;
                  }
                }
              } else if (mediaQueryLandscape.matches) {
                tmpOrientation = Orientation.LANDSCAPE;
                if (hasScreeOrientation) {
                  // eslint-disable-next-line no-restricted-globals
                  var _orientationType = screen.orientation.type;
                  if (_orientationType === 'landscape-primary') {
                    tmpOrientation = Orientation.LANDSCAPE_LEFT;
                  } else {
                    tmpOrientation = Orientation.LANDSCAPE_RIGHT;
                  }
                }
              }
              notifyOrientationChange(tmpOrientation);
            };
            mediaQueryPortrait.addEventListener('change', orientationChangeCallback);
            mediaQueryLandscape.addEventListener('change', orientationChangeCallback);
          } else {
            handleOrientationChange = function handleOrientationChange() {
              var tmpOrientation = getOrientation();
              notifyOrientationChange(tmpOrientation);
            };
            window.addEventListener('orientationchange', orientationChangeCallback);
          }
          document.addEventListener(this._fn.fullscreenchange, function () {
            var _this4$_onFullscreenC;
            (_this4$_onFullscreenC = _this4._onFullscreenChange) === null || _this4$_onFullscreenC === void 0 ? void 0 : _this4$_onFullscreenC.call(_this4);
            _this4.emit('fullscreen-change', _this4.windowSize.width, _this4.windowSize.height);
          });
        };
        _proto._convertToSizeInCssPixels = function _convertToSizeInCssPixels(size) {
          var clonedSize = size.clone();
          var dpr = this.devicePixelRatio;
          clonedSize.width /= dpr;
          clonedSize.height /= dpr;
          return clonedSize;
        }

        /**
         * The frame size may be from screen size or an external editor options by setting screen.windowSize.
         * @param sizeInCssPixels you need to specify this size when the windowType is SubFrame.
         */;
        _proto._resizeFrame = function _resizeFrame(sizeInCssPixels) {
          if (!this._gameFrame) {
            return;
          }
          // Center align the canvas
          this._gameFrame.style.display = 'flex';
          this._gameFrame.style['justify-content'] = 'center';
          this._gameFrame.style['align-items'] = 'center';
          if (this._windowType === WindowType.SubFrame) {
            if (!sizeInCssPixels) {
              this._updateContainer();
              return;
            }
            this._gameFrame.style.width = sizeInCssPixels.width + "px";
            this._gameFrame.style.height = sizeInCssPixels.height + "px";
          } else {
            var winWidth = window.innerWidth;
            var winHeight = window.innerHeight;
            //On certain android devices, window.innerHeight may not account for the height of the virtual keyboard, so dynamic calculation is necessary.
            var inputHeight = document.body.scrollHeight - winHeight;
            if (systemInfo.os === OS.ANDROID && winHeight < inputHeight) {
              winHeight += inputHeight;
            }
            if (this.isFrameRotated) {
              this._gameFrame.style['-webkit-transform'] = 'rotate(90deg)';
              this._gameFrame.style.transform = 'rotate(90deg)';
              this._gameFrame.style['-webkit-transform-origin'] = '0px 0px 0px';
              this._gameFrame.style.transformOrigin = '0px 0px 0px';
              this._gameFrame.style.margin = "0 0 0 " + winWidth + "px";
              this._gameFrame.style.width = winHeight + "px";
              this._gameFrame.style.height = winWidth + "px";
            } else {
              this._gameFrame.style['-webkit-transform'] = 'rotate(0deg)';
              this._gameFrame.style.transform = 'rotate(0deg)';
              // TODO
              // this._gameFrame.style['-webkit-transform-origin'] = '0px 0px 0px';
              // this._gameFrame.style.transformOrigin = '0px 0px 0px';
              this._gameFrame.style.margin = '0px auto';
              this._gameFrame.style.width = winWidth + "px";
              this._gameFrame.style.height = winHeight + "px";
            }
          }
          this._updateContainer();
        };
        _proto._getFullscreenTarget = function _getFullscreenTarget() {
          var windowType = this._windowType;
          if (windowType === WindowType.Fullscreen) {
            return document[this._fn.fullscreenElement];
          }
          if (windowType === WindowType.SubFrame) {
            return this._gameFrame;
          }
          // On web mobile, the transform of game frame doesn't work when it's on fullscreen.
          // So we need to make the body fullscreen.
          return document.body;
        };
        _proto._doRequestFullScreen = function _doRequestFullScreen() {
          var _this5 = this;
          return new Promise(function (resolve, reject) {
            if (!_this5._supportFullScreen) {
              reject(new Error('fullscreen is not supported'));
              return;
            }
            var fullscreenTarget = _this5._getFullscreenTarget();
            if (!fullscreenTarget) {
              reject(new Error('Cannot access fullscreen target'));
              return;
            }
            _this5._onFullscreenChange = undefined;
            _this5._onFullscreenError = undefined;
            var requestPromise = fullscreenTarget[_this5._fn.requestFullscreen]();
            if (window.Promise && requestPromise instanceof Promise) {
              requestPromise.then(resolve)["catch"](reject);
            } else {
              _this5._onFullscreenChange = resolve;
              _this5._onFullscreenError = reject;
            }
          });
        };
        _proto._updateFrameState = function _updateFrameState() {
          var orientation = this.orientation;
          var width = window.innerWidth;
          var height = window.innerHeight;
          var isBrowserLandscape = width > height;
          this.isFrameRotated = systemInfo.isMobile && (isBrowserLandscape && orientation === Orientation.PORTRAIT || !isBrowserLandscape && orientation === Orientation.LANDSCAPE);
        };
        _proto._updateContainer = function _updateContainer() {
          if (!this._gameContainer) {
            warnID(9201);
            return;
          }
          if (this.isProportionalToFrame) {
            if (!this._gameFrame) {
              warnID(9201);
              return;
            }
            // TODO: access designedResolution from Launcher module.
            var designedResolution = legacyCC.view.getDesignResolutionSize();
            var frame = this._gameFrame;
            var frameW = frame.clientWidth;
            var frameH = frame.clientHeight;
            var designW = designedResolution.width;
            var designH = designedResolution.height;
            var scaleX = frameW / designW;
            var scaleY = frameH / designH;
            var containerStyle = this._gameContainer.style;
            var containerW;
            var containerH;
            if (scaleX < scaleY) {
              containerW = frameW;
              containerH = designH * scaleX;
            } else {
              containerW = designW * scaleY;
              containerH = frameH;
            }
            // Set window size on game container
            containerStyle.width = containerW + "px";
            containerStyle.height = containerH + "px";
          } else {
            var _containerStyle = this._gameContainer.style;
            // game container exact fit game frame.
            _containerStyle.width = '100%';
            _containerStyle.height = '100%';
          }

          // Cache Test
          if (this._gameFrame && (this._cachedFrameStyle.width !== this._gameFrame.style.width || this._cachedFrameStyle.height !== this._gameFrame.style.height || this._cachedContainerStyle.width !== this._gameContainer.style.width || this._cachedContainerStyle.height !== this._gameContainer.style.height)) {
            this.emit('window-resize', this.windowSize.width, this.windowSize.height);

            // Update Cache
            this._cachedFrameStyle.width = this._gameFrame.style.width;
            this._cachedFrameStyle.height = this._gameFrame.style.height;
            this._cachedContainerStyle.width = this._gameContainer.style.width;
            this._cachedContainerStyle.height = this._gameContainer.style.height;
          }
        };
        _createClass(ScreenAdapter, [{
          key: "supportFullScreen",
          get: function get() {
            return this._supportFullScreen;
          }
        }, {
          key: "isFullScreen",
          get: function get() {
            if (!this._supportFullScreen) {
              return false;
            }
            return !!document[this._fn.fullscreenElement];
          }
        }, {
          key: "devicePixelRatio",
          get: function get() {
            var _window$devicePixelRa;
            // TODO: remove the down sampling operation in DPR after supporting resolutionScale
            return Math.min((_window$devicePixelRa = window.devicePixelRatio) !== null && _window$devicePixelRa !== void 0 ? _window$devicePixelRa : 1, 2);
          }
        }, {
          key: "windowSize",
          get: function get() {
            var result = this._windowSizeInCssPixels;
            var dpr = this.devicePixelRatio;
            result.width *= dpr;
            result.height *= dpr;
            return result;
          },
          set: function set(size) {
            if (this._windowType !== WindowType.SubFrame) {
              warnID(9202);
              return;
            }
            this._resizeFrame(this._convertToSizeInCssPixels(size));
          }
        }, {
          key: "resolution",
          get: function get() {
            var windowSize = this.windowSize;
            var resolutionScale = this.resolutionScale;
            return new Size(windowSize.width * resolutionScale, windowSize.height * resolutionScale);
          }
        }, {
          key: "resolutionScale",
          get: function get() {
            return this._resolutionScale;
          },
          set: function set(v) {
            var _this$_cbToUpdateFram;
            if (v === this._resolutionScale) {
              return;
            }
            this._resolutionScale = v;
            (_this$_cbToUpdateFram = this._cbToUpdateFrameBuffer) === null || _this$_cbToUpdateFram === void 0 ? void 0 : _this$_cbToUpdateFram.call(this);
          }
        }, {
          key: "orientation",
          get: function get() {
            return this._orientation;
          },
          set: function set(value) {
            if (this._orientation === value) {
              return;
            }
            this._orientation = value;
            this._updateFrame();
          }
        }, {
          key: "safeAreaEdge",
          get: function get() {
            var dpr = this.devicePixelRatio;
            var _top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-top') || '0') * dpr;
            var _bottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom') || '0') * dpr;
            var _left = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-left') || '0') * dpr;
            var _right = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-right') || '0') * dpr;
            return {
              top: _top,
              bottom: _bottom,
              left: _left,
              right: _right
            };
          }
        }, {
          key: "isProportionalToFrame",
          get: function get() {
            return this._isProportionalToFrame;
          },
          set: function set(v) {
            if (this._isProportionalToFrame === v) {
              return;
            }
            this._isProportionalToFrame = v;
            this._updateContainer();
          }
        }, {
          key: "_windowSizeInCssPixels",
          get: function get() {
            if (TEST) {
              return new Size(window.innerWidth, window.innerHeight);
            }
            if (this.isProportionalToFrame) {
              if (!this._gameContainer) {
                warnID(9201);
                return new Size(0, 0);
              }
              return new Size(this._gameContainer.clientWidth, this._gameContainer.clientHeight);
            }
            var fullscreenTarget;
            var width;
            var height;
            switch (this._windowType) {
              case WindowType.SubFrame:
                if (!this._gameFrame) {
                  warnID(9201);
                  return new Size(0, 0);
                }
                return new Size(this._gameFrame.clientWidth, this._gameFrame.clientHeight);
              case WindowType.Fullscreen:
                fullscreenTarget = this._getFullscreenTarget();
                width = this.isFrameRotated ? fullscreenTarget.clientHeight : fullscreenTarget.clientWidth;
                height = this.isFrameRotated ? fullscreenTarget.clientWidth : fullscreenTarget.clientHeight;
                return new Size(width, height);
              case WindowType.BrowserWindow:
                width = this.isFrameRotated ? window.innerHeight : window.innerWidth;
                height = this.isFrameRotated ? window.innerWidth : window.innerHeight;
                return new Size(width, height);
              case WindowType.Unknown:
              default:
                return new Size(0, 0);
            }
          }
        }, {
          key: "_windowType",
          get: function get() {
            if (this._isHeadlessMode) {
              return WindowType.Unknown;
            }
            if (this.isFullScreen) {
              return WindowType.Fullscreen;
            }
            if (!this._gameFrame) {
              warnID(9201);
              return WindowType.Unknown;
            }
            if (this._exactFitScreen) {
              // Note: It doesn't work well to determine whether the frame exact fits the screen.
              // Need to specify the attribute from Editor.
              return WindowType.BrowserWindow;
            }
            return WindowType.SubFrame;
          }
        }]);
        return ScreenAdapter;
      }(EventTarget);
      _export("screenAdapter", screenAdapter = new ScreenAdapter());
      checkPalIntegrity(withImpl());
    }
  };
});