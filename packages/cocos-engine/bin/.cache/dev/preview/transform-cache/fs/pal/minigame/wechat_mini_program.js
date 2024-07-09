System.register("q-bundled:///fs/pal/minigame/wechat_mini_program.js", ["../integrity-check.js", "../screen-adapter/enum-type/index.js", "../utils.js"], function (_export, _context) {
  "use strict";

  var checkPalIntegrity, withImpl, Orientation, cloneObject, createInnerAudioContextPolyfill, versionCompare, _wx$onKeyDown, _wx$onKeyUp, _wx$onMouseDown, _wx$onMouseMove, _wx$onMouseUp, _wx$onWheel, _minigame$onWindowRes, minigame, _cachedSystemInfo, systemInfo, landscapeOrientation, _accelerometerCb, locCanvas, webglRC, originalUseProgram, gl, oldTexSubImage2D;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  return {
    setters: [function (_integrityCheckJs) {
      checkPalIntegrity = _integrityCheckJs.checkPalIntegrity;
      withImpl = _integrityCheckJs.withImpl;
    }, function (_screenAdapterEnumTypeIndexJs) {
      Orientation = _screenAdapterEnumTypeIndexJs.Orientation;
    }, function (_utilsJs) {
      cloneObject = _utilsJs.cloneObject;
      createInnerAudioContextPolyfill = _utilsJs.createInnerAudioContextPolyfill;
      versionCompare = _utilsJs.versionCompare;
    }],
    execute: function () {
      // NOTE: getApp is defined on wechat miniprogram platform
      // @ts-expect-error can't init minigame when it's declared
      _export("minigame", minigame = {});
      cloneObject(minigame, wx);

      // #region platform related
      minigame.wx = {};
      minigame.wx.onKeyDown = (_wx$onKeyDown = wx.onKeyDown) === null || _wx$onKeyDown === void 0 ? void 0 : _wx$onKeyDown.bind(wx);
      minigame.wx.onKeyUp = (_wx$onKeyUp = wx.onKeyUp) === null || _wx$onKeyUp === void 0 ? void 0 : _wx$onKeyUp.bind(wx);
      minigame.wx.onMouseDown = (_wx$onMouseDown = wx.onMouseDown) === null || _wx$onMouseDown === void 0 ? void 0 : _wx$onMouseDown.bind(wx);
      minigame.wx.onMouseMove = (_wx$onMouseMove = wx.onMouseMove) === null || _wx$onMouseMove === void 0 ? void 0 : _wx$onMouseMove.bind(wx);
      minigame.wx.onMouseUp = (_wx$onMouseUp = wx.onMouseUp) === null || _wx$onMouseUp === void 0 ? void 0 : _wx$onMouseUp.bind(wx);
      minigame.wx.onWheel = (_wx$onWheel = wx.onWheel) === null || _wx$onWheel === void 0 ? void 0 : _wx$onWheel.bind(wx);
      // #endregion platform related

      // #region SystemInfo
      _cachedSystemInfo = wx.getSystemInfoSync(); // @ts-expect-error TODO: move into minigame.d.ts
      minigame.testAndUpdateSystemInfoCache = function (testAmount, testInterval) {
        var successfullyTestTimes = 0;
        var intervalTimer = null;
        function testCachedSystemInfo() {
          var currentSystemInfo = wx.getSystemInfoSync();
          if (_cachedSystemInfo.screenWidth === currentSystemInfo.screenWidth && _cachedSystemInfo.screenHeight === currentSystemInfo.screenHeight) {
            if (++successfullyTestTimes >= testAmount && intervalTimer !== null) {
              clearInterval(intervalTimer);
              intervalTimer = null;
            }
          } else {
            successfullyTestTimes = 0;
          }
          _cachedSystemInfo = currentSystemInfo;
        }
        intervalTimer = setInterval(testCachedSystemInfo, testInterval);
      };
      // @ts-expect-error TODO: update when view resize
      minigame.testAndUpdateSystemInfoCache(10, 500);
      (_minigame$onWindowRes = minigame.onWindowResize) === null || _minigame$onWindowRes === void 0 ? void 0 : _minigame$onWindowRes.call(minigame, function () {
        // update cached system info
        _cachedSystemInfo = wx.getSystemInfoSync();
      });
      minigame.getSystemInfoSync = function () {
        return _cachedSystemInfo;
      };
      systemInfo = minigame.getSystemInfoSync();
      minigame.isDevTool = systemInfo.platform === 'devtools';
      // NOTE: size and orientation info is wrong at the init phase, especially on iOS device
      Object.defineProperty(minigame, 'isLandscape', {
        get: function get() {
          var locSystemInfo = wx.getSystemInfoSync();
          if (typeof locSystemInfo.deviceOrientation === 'string') {
            return locSystemInfo.deviceOrientation.startsWith('landscape');
          } else {
            return locSystemInfo.screenWidth > locSystemInfo.screenHeight;
          }
        }
      });
      // init landscapeOrientation as LANDSCAPE_RIGHT
      landscapeOrientation = Orientation.LANDSCAPE_RIGHT;
      if (systemInfo.platform.toLocaleLowerCase() !== 'android') {
        // onDeviceOrientationChange doesn't work well on Android.
        // see this issue: https://developers.weixin.qq.com/community/minigame/doc/000482138dc460e56cfaa5cb15bc00
        wx.onDeviceOrientationChange(function (res) {
          if (res.value === 'landscape') {
            landscapeOrientation = Orientation.LANDSCAPE_RIGHT;
          } else if (res.value === 'landscapeReverse') {
            landscapeOrientation = Orientation.LANDSCAPE_LEFT;
          }
        });
      }
      Object.defineProperty(minigame, 'orientation', {
        get: function get() {
          return minigame.isLandscape ? landscapeOrientation : Orientation.PORTRAIT;
        }
      });
      // #endregion SystemInfo

      // #region Accelerometer

      minigame.onAccelerometerChange = function (cb) {
        minigame.offAccelerometerChange();
        // onAccelerometerChange would start accelerometer
        // so we won't call this method here
        _accelerometerCb = function _accelerometerCb(res) {
          var x = res.x;
          var y = res.y;
          if (minigame.isLandscape) {
            var orientationFactor = landscapeOrientation === Orientation.LANDSCAPE_RIGHT ? 1 : -1;
            var tmp = x;
            x = -y * orientationFactor;
            y = tmp * orientationFactor;
          }
          var resClone = {
            x: x,
            y: y,
            z: res.z
          };
          cb(resClone);
        };
      };
      minigame.offAccelerometerChange = function (cb) {
        if (_accelerometerCb) {
          wx.offAccelerometerChange(_accelerometerCb);
          _accelerometerCb = undefined;
        }
      };
      minigame.startAccelerometer = function (res) {
        if (_accelerometerCb) {
          wx.onAccelerometerChange(_accelerometerCb);
        }
        wx.startAccelerometer(res);
      };
      // #endregion Accelerometer

      minigame.createInnerAudioContext = createInnerAudioContextPolyfill(wx, {
        onPlay: true,
        onPause: true,
        onStop: true,
        onSeek: false
      }, true);

      // #region SafeArea
      // FIX_ME: wrong safe area when orientation is landscape left
      minigame.getSafeArea = function () {
        var locSystemInfo = wx.getSystemInfoSync();
        return locSystemInfo.safeArea;
      };
      // #endregion SafeArea

      // HACK: adapt GL.useProgram: use program not supported to unbind program on pc end
      if (systemInfo.platform === 'windows' && versionCompare(systemInfo.SDKVersion, '2.16.0') < 0) {
        // @ts-expect-error canvas defined in global
        locCanvas = canvas;
        if (locCanvas) {
          webglRC = locCanvas.getContext('webgl');
          originalUseProgram = webglRC.useProgram.bind(webglRC);
          webglRC.useProgram = function (program) {
            if (program) {
              originalUseProgram(program);
            }
          };
        }
      }

      // HACK: adapt gl.texSubImage2D: gl.texSubImage2D do not support 2d canvas in wechat miniprogram
      gl = getApp().GameGlobal.canvas.getContext('webgl');
      oldTexSubImage2D = gl.texSubImage2D;
      gl.texSubImage2D = function () {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        if (args.length === 7) {
          var _canvas = args[6];
          if (typeof _canvas.type !== 'undefined' && _canvas.type === 'canvas') {
            var ctx = _canvas.getContext('2d');
            var texOffsetX = args[2];
            var texOffsetY = args[3];
            var imgData = ctx.getImageData(texOffsetX, texOffsetY, _canvas.width, _canvas.height);
            oldTexSubImage2D.call(gl, args[0], args[1], texOffsetX, texOffsetY, _canvas.width, _canvas.height, args[4], args[5], new Uint8Array(imgData.data));
          } else {
            oldTexSubImage2D.apply(gl, args);
          }
        } else {
          oldTexSubImage2D.apply(gl, args);
        }
      };
      checkPalIntegrity(withImpl());
    }
  };
});