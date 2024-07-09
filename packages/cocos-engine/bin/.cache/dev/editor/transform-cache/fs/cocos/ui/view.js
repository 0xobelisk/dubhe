System.register("q-bundled:///fs/cocos/ui/view.js", ["../core/data/class.js", "../../../virtual/internal%253Aconstants.js", "pal/screen-adapter", "../core/event/index.js", "../core/math/index.js", "../core/index.js", "../../pal/screen-adapter/enum-type/index.js", "../game/director.js", "../core/settings.js"], function (_export, _context) {
  "use strict";

  var MINIGAME, JSB, RUNTIME_BASED, EDITOR, screenAdapter, Eventify, Rect, Size, Vec2, visibleRect, cclegacy, errorID, screen, macro, System, assert, Orientation, director, Settings, settings, View, ContainerStrategy, ContentStrategy, ResolutionPolicy, localWinSize, orientationMap, view;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2008-2010 Ricardo Quesada
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2011-2012 cocos2d-x.org
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2013-2016 Chukong Technologies Inc.
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             http://www.cocos2d-x.org
                                                                                                                                                                                                                                                                                                                                                                                            
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
  _export({
    View: void 0,
    ResolutionPolicy: void 0
  });
  return {
    setters: [function (_coreDataClassJs) {}, function (_virtualInternal253AconstantsJs) {
      MINIGAME = _virtualInternal253AconstantsJs.MINIGAME;
      JSB = _virtualInternal253AconstantsJs.JSB;
      RUNTIME_BASED = _virtualInternal253AconstantsJs.RUNTIME_BASED;
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
    }, function (_palScreenAdapter) {
      screenAdapter = _palScreenAdapter.screenAdapter;
    }, function (_coreEventIndexJs) {
      Eventify = _coreEventIndexJs.Eventify;
    }, function (_coreMathIndexJs) {
      Rect = _coreMathIndexJs.Rect;
      Size = _coreMathIndexJs.Size;
      Vec2 = _coreMathIndexJs.Vec2;
    }, function (_coreIndexJs) {
      visibleRect = _coreIndexJs.visibleRect;
      cclegacy = _coreIndexJs.cclegacy;
      errorID = _coreIndexJs.errorID;
      screen = _coreIndexJs.screen;
      macro = _coreIndexJs.macro;
      System = _coreIndexJs.System;
      assert = _coreIndexJs.assert;
    }, function (_palScreenAdapterEnumTypeIndexJs) {
      Orientation = _palScreenAdapterEnumTypeIndexJs.Orientation;
    }, function (_gameDirectorJs) {
      director = _gameDirectorJs.director;
    }, function (_coreSettingsJs) {
      Settings = _coreSettingsJs.Settings;
      settings = _coreSettingsJs.settings;
    }],
    execute: function () {
      /**
       * @en View represents the game window.<br/>
       * It's main task include: <br/>
       *  - Apply the design resolution policy to the UI Canvas<br/>
       *  - Provide interaction with the window, like resize event on web, retina display support, etc...<br/>
       *  - Manage the scale and translation of canvas related to the frame on Web<br/>
       * <br/>
       * With [[view]] as its singleton initialized by the engine, you don't need to call any constructor or create functions,<br/>
       * the standard way to use it is by calling:<br/>
       *  - view.methodName(); <br/>
       * @zh View 代表游戏窗口视图，它的核心功能包括：
       *  - 对所有 UI Canvas 进行设计分辨率适配。
       *  - 提供窗口视图的交互，比如监听 resize 事件，控制 retina 屏幕适配，等等。
       *  - 控制 Canvas 节点相对于外层 DOM 节点的缩放和偏移。
       * 引擎会自动初始化它的单例对象 [[view]]，所以你不需要实例化任何 View，只需要直接使用 `view.methodName();`
       */
      localWinSize = new Size();
      orientationMap = {
        [macro.ORIENTATION_AUTO]: Orientation.AUTO,
        [macro.ORIENTATION_LANDSCAPE]: Orientation.LANDSCAPE,
        [macro.ORIENTATION_PORTRAIT]: Orientation.PORTRAIT
      };
      _export("View", View = class View extends Eventify(System) {
        constructor() {
          super();
          /**
           * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
           */
          this._designResolutionSize = void 0;
          this._scaleX = void 0;
          this._scaleY = void 0;
          this._viewportRect = void 0;
          this._visibleRect = void 0;
          this._autoFullScreen = void 0;
          this._retinaEnabled = void 0;
          this._resizeCallback = void 0;
          this._resolutionPolicy = void 0;
          this._rpExactFit = void 0;
          this._rpShowAll = void 0;
          this._rpNoBorder = void 0;
          this._rpFixedHeight = void 0;
          this._rpFixedWidth = void 0;
          const _strategyer = ContainerStrategy;
          const _strategy = ContentStrategy;

          // resolution size, it is the size appropriate for the app resources.
          this._designResolutionSize = new Size(0, 0);
          this._scaleX = 1;
          this._scaleY = 1;
          // Viewport is the container's rect related to content's coordinates in pixel
          this._viewportRect = new Rect(0, 0, 0, 0);
          // The visible rect in content's coordinate in point
          this._visibleRect = new Rect(0, 0, 0, 0);
          // Auto full screen disabled by default
          this._autoFullScreen = false;
          // Retina disabled by default
          this._retinaEnabled = false;
          // Custom callback for resize event
          this._resizeCallback = null;

          // Setup system default resolution policies
          this._rpExactFit = new ResolutionPolicy(_strategyer.EQUAL_TO_FRAME, _strategy.EXACT_FIT);
          this._rpShowAll = new ResolutionPolicy(_strategyer.EQUAL_TO_FRAME, _strategy.SHOW_ALL);
          this._rpNoBorder = new ResolutionPolicy(_strategyer.EQUAL_TO_FRAME, _strategy.NO_BORDER);
          this._rpFixedHeight = new ResolutionPolicy(_strategyer.EQUAL_TO_FRAME, _strategy.FIXED_HEIGHT);
          this._rpFixedWidth = new ResolutionPolicy(_strategyer.EQUAL_TO_FRAME, _strategy.FIXED_WIDTH);
          this._resolutionPolicy = this._rpShowAll;
        }

        // Call init at the time Game.EVENT_ENGINE_INITED
        init() {
          const windowSize = screen.windowSize;
          const w = windowSize.width;
          const h = windowSize.height;
          this._designResolutionSize.width = w;
          this._designResolutionSize.height = h;
          this._viewportRect.width = w;
          this._viewportRect.height = h;
          this._visibleRect.width = w;
          this._visibleRect.height = h;
          localWinSize.width = this._visibleRect.width;
          localWinSize.height = this._visibleRect.height;
          if (visibleRect) {
            visibleRect.init(this._visibleRect);
          }
          if (!EDITOR) {
            this.resizeWithBrowserSize(true);
            const designResolution = settings.querySettings(Settings.Category.SCREEN, 'designResolution');
            if (designResolution) {
              this.setDesignResolutionSize(Number(designResolution.width), Number(designResolution.height), designResolution.policy || ResolutionPolicy.FIXED_HEIGHT);
            }
          }

          // For now, the engine UI is adapted to resolution size, instead of window size.
          screen.on('window-resize', this._updateAdaptResult, this);
          screen.on('fullscreen-change', this._updateAdaptResult, this);
        }

        /**
         * @en
         * Sets whether resize canvas automatically when browser's size changed.<br/>
         * Useful only on web.
         * @zh 设置当发现浏览器的尺寸改变时，是否自动调整 canvas 尺寸大小。
         * 仅在 Web 模式下有效。
         * @param enabled - Whether enable automatic resize with browser's resize event
         */
        resizeWithBrowserSize(enabled) {
          screenAdapter.handleResizeEvent = enabled;
        }

        /**
         * @en
         * Sets the callback function for `view`'s resize action,<br/>
         * this callback will be invoked before applying resolution policy, <br/>
         * so you can do any additional modifications within the callback.<br/>
         * Useful only on web.
         * @zh 设置 `view` 调整视窗尺寸行为的回调函数，
         * 这个回调函数会在应用适配模式之前被调用，
         * 因此你可以在这个回调函数内添加任意附加改变，
         * 仅在 Web 平台下有效。
         * @param callback - The callback function
         *
         * @deprecated since v3.8.0, please use [[screen.on]] to listen for events.
         */
        setResizeCallback(callback) {
          if (typeof callback === 'function' || callback == null) {
            this._resizeCallback = callback;
          }
        }

        /**
         * @en
         * Sets the orientation of the game, it can be landscape, portrait or auto.
         * When set it to landscape or portrait, and screen w/h ratio doesn't fit,
         * `view` will automatically rotate the game canvas using CSS.
         * Note that this function doesn't have any effect in native,
         * in native, you need to set the application orientation in native project settings
         * @zh 设置游戏屏幕朝向，它能够是横版，竖版或自动。
         * 当设置为横版或竖版，并且屏幕的宽高比例不匹配时，
         * `view` 会自动用 CSS 旋转游戏场景的 canvas，
         * 这个方法不会对 native 部分产生任何影响，对于 native 而言，你需要在应用设置中的设置排版。
         * @param orientation - Possible values: macro.ORIENTATION_LANDSCAPE | macro.ORIENTATION_PORTRAIT | macro.ORIENTATION_AUTO
         */
        setOrientation(orientation) {
          screenAdapter.orientation = orientationMap[orientation];
        }

        /**
         * @en
         * Sets whether the engine modify the "viewport" meta in your web page.<br/>
         * It's enabled by default, we strongly suggest you not to disable it.<br/>
         * And even when it's enabled, you can still set your own "viewport" meta, it won't be overridden<br/>
         * Only useful on web
         * @zh 设置引擎是否调整 viewport meta 来配合屏幕适配。
         * 默认设置为启动，我们强烈建议你不要将它设置为关闭。
         * 即使当它启动时，你仍然能够设置你的 viewport meta，它不会被覆盖。
         * 仅在 Web 模式下有效
         * @param enabled - Enable automatic modification to "viewport" meta
         * @deprecated since v3.3
         */
        adjustViewportMeta(enabled) {
          // DO NOTHING
        }

        /**
         * @en
         * Retina support is enabled by default for Apple device but disabled for other devices,<br/>
         * it takes effect only when you called setDesignResolutionPolicy<br/>
         * Only useful on web
         * @zh 对于 Apple 这种支持 Retina 显示的设备上默认进行优化而其他类型设备默认不进行优化，
         * 它仅会在你调用 setDesignResolutionPolicy 方法时有影响。
         * 仅在 Web 模式下有效。
         * @param enabled - Enable or disable retina display
         *
         * @deprecated since v3.4.0
         */
        enableRetina(enabled) {
          this._retinaEnabled = !!enabled;
        }

        /**
         * @en
         * Check whether retina display is enabled.<br/>
         * Only useful on web
         * @zh 检查是否对 Retina 显示设备进行优化。
         * 仅在 Web 模式下有效。
         *
         * @deprecated since v3.4.0
         */
        isRetinaEnabled() {
          return this._retinaEnabled;
        }

        /**
         * @en
         * If enabled, the application will try automatically to enter full screen mode on mobile devices<br/>
         * You can pass true as parameter to enable it and disable it by passing false.<br/>
         * Only useful on web
         * @zh 启动时，移动端游戏会在移动端自动尝试进入全屏模式。
         * 你能够传入 true 为参数去启动它，用 false 参数来关闭它。
         * @param enabled - Enable or disable auto full screen on mobile devices
         *
         * @deprecated since v3.3, please use screen.requestFullScreen() instead.
         */
        enableAutoFullScreen(enabled) {
          if (enabled === this._autoFullScreen) {
            return;
          }
          this._autoFullScreen = enabled;
          if (enabled) {
            screen.requestFullScreen().catch(e => {});
          }
        }

        /**
         * @en
         * Check whether auto full screen is enabled.<br/>
         * Only useful on web
         * @zh 检查自动进入全屏模式是否启动。
         * 仅在 Web 模式下有效。
         * @return Auto full screen enabled or not
         *
         * @deprecated since v3.3
         */
        isAutoFullScreenEnabled() {
          return this._autoFullScreen;
        }

        /**
         * @en Set the canvas size in CSS pixels on Web platform.
         * This method is not supported on other platforms.
         * @zh  Web 平台下，可以以 CSS 像素尺寸来设置 canvas 尺寸。
         * 这个方法并不支持其他平台。
         * @private
         * @param {Number} width
         * @param {Number} height
         *
         * @deprecated since v3.4.0, setting size in CSS pixels is not recommended, please use screen.windowSize instead.
         */
        setCanvasSize(width, height) {
          // set resolution scale to 1;
          screenAdapter.resolutionScale = 1;

          // set window size
          const dpr = screenAdapter.devicePixelRatio;
          const windowSize = new Size(width * dpr, height * dpr);
          screen.windowSize = windowSize;
        }

        /**
         * @en
         * Returns the canvas size of the view.<br/>
         * On native platforms, it returns the screen size since the view is a fullscreen view.<br/>
         * On web, it returns the size of the canvas element.
         * @zh 返回视图中 canvas 的尺寸。
         * 在 native 平台下，它返回全屏视图下屏幕的尺寸。
         * 在 Web 平台下，它返回 canvas 元素尺寸。
         *
         * @deprecated since v3.4.0, please use screen.windowSize instead.
         */
        getCanvasSize() {
          return screen.windowSize;
        }

        /**
         * @en
         * Returns the frame size of the view in CSS pixels.<br/>
         * On native platforms, it returns the screen size since the view is a fullscreen view.<br/>
         * On web, it returns the size of the canvas's outer DOM element.
         * @zh 以 CSS 像素尺寸返回视图中边框尺寸。
         * 在 native 平台下，它返回全屏视图下屏幕的尺寸。
         * 在 web 平台下，它返回 canvas 元素的外层 DOM 元素尺寸。
         *
         * @deprecated since v3.4.0, getting size in CSS pixels is not recommended, please use screen.windowSize instead.
         */
        getFrameSize() {
          const dpr = screenAdapter.devicePixelRatio;
          const sizeInCssPixels = screen.windowSize;
          sizeInCssPixels.width /= dpr;
          sizeInCssPixels.height /= dpr;
          return sizeInCssPixels;
        }

        /**
         * @en Setting the frame size of the view in CSS pixels.
         * On native, it sets the frame size of view.<br/>
         * On web, it sets the size of the canvas's outer DOM element.
         * @zh 以 CSS 像素尺寸设置视图中边框尺寸。
         * 在 native 平台下，设置视图框架尺寸。
         * 在 web 平台下，设置 canvas 外层 DOM 元素尺寸。
         * @param {Number} width
         * @param {Number} height
         *
         * @deprecated since v3.4.0, setting size in CSS pixels is not recommended, please use screen.windowSize instead.
         */
        setFrameSize(width, height) {
          const dpr = screenAdapter.devicePixelRatio;
          screen.windowSize = new Size(width * dpr, height * dpr);
        }

        /**
         * @en Returns the visible area size of the view port.
         * @zh 返回视图窗口可见区域尺寸。
         */
        getVisibleSize() {
          return new Size(this._visibleRect.width, this._visibleRect.height);
        }

        /**
         * @en Returns the visible area size of the view port.
         * @zh 返回视图窗口可见区域像素尺寸。
         */
        getVisibleSizeInPixel() {
          return new Size(this._visibleRect.width * this._scaleX, this._visibleRect.height * this._scaleY);
        }

        /**
         * @en Returns the visible origin of the view port.
         * @zh 返回视图窗口可见区域原点。
         */
        getVisibleOrigin() {
          return new Vec2(this._visibleRect.x, this._visibleRect.y);
        }

        /**
         * @en Returns the visible origin of the view port.
         * @zh 返回视图窗口可见区域像素原点。
         */
        getVisibleOriginInPixel() {
          return new Vec2(this._visibleRect.x * this._scaleX, this._visibleRect.y * this._scaleY);
        }

        /**
         * @en Returns the current resolution policy
         * @zh 返回当前分辨率方案
         * @see [[ResolutionPolicy]]
         */
        getResolutionPolicy() {
          return this._resolutionPolicy;
        }
        _updateResolutionPolicy(resolutionPolicy) {
          if (resolutionPolicy instanceof ResolutionPolicy) {
            this._resolutionPolicy = resolutionPolicy;
          } else {
            // Ensure compatibility with JSB
            const _locPolicy = ResolutionPolicy;
            if (resolutionPolicy === _locPolicy.EXACT_FIT) {
              this._resolutionPolicy = this._rpExactFit;
            }
            if (resolutionPolicy === _locPolicy.SHOW_ALL) {
              this._resolutionPolicy = this._rpShowAll;
            }
            if (resolutionPolicy === _locPolicy.NO_BORDER) {
              this._resolutionPolicy = this._rpNoBorder;
            }
            if (resolutionPolicy === _locPolicy.FIXED_HEIGHT) {
              this._resolutionPolicy = this._rpFixedHeight;
            }
            if (resolutionPolicy === _locPolicy.FIXED_WIDTH) {
              this._resolutionPolicy = this._rpFixedWidth;
            }
          }
        }
        /**
         * @en Sets the current resolution policy
         * @zh 设置当前分辨率模式
         * @see [[ResolutionPolicy]]
         */
        setResolutionPolicy(resolutionPolicy) {
          this._updateResolutionPolicy(resolutionPolicy);
          const designedResolution = view.getDesignResolutionSize();
          view.setDesignResolutionSize(designedResolution.width, designedResolution.height, resolutionPolicy);
        }

        /**
         * @en Sets the resolution policy with designed view size in points.<br/>
         * The resolution policy include: <br/>
         * [1] ResolutionExactFit       Fill screen by stretch-to-fit: if the design resolution ratio of width to height is different from the screen resolution ratio, your game view will be stretched.<br/>
         * [2] ResolutionNoBorder       Full screen without black border: if the design resolution ratio of width to height is different from the screen resolution ratio, two areas of your game view will be cut.<br/>
         * [3] ResolutionShowAll        Full screen with black border: if the design resolution ratio of width to height is different from the screen resolution ratio, two black borders will be shown.<br/>
         * [4] ResolutionFixedHeight    Scale the content's height to screen's height and proportionally scale its width<br/>
         * [5] ResolutionFixedWidth     Scale the content's width to screen's width and proportionally scale its height<br/>
         * [ResolutionPolicy]        [Web only feature] Custom resolution policy, constructed by ResolutionPolicy<br/>
         * @zh 通过设置设计分辨率和匹配模式来进行游戏画面的屏幕适配。
         * @param width Design resolution width.
         * @param height Design resolution height.
         * @param resolutionPolicy The resolution policy desired
         */
        setDesignResolutionSize(width, height, resolutionPolicy) {
          // Defensive code
          if (!(width > 0 && height > 0)) {
            errorID(2200);
            return;
          }
          this._updateResolutionPolicy(resolutionPolicy);
          const policy = this._resolutionPolicy;
          if (policy) {
            policy.preApply(this);
          }
          this._designResolutionSize.width = width;
          this._designResolutionSize.height = height;
          const result = policy.apply(this, this._designResolutionSize);
          if (result.scale && result.scale.length === 2) {
            this._scaleX = result.scale[0];
            this._scaleY = result.scale[1];
          }
          if (result.viewport) {
            const vp = this._viewportRect;
            const vb = this._visibleRect;
            const rv = result.viewport;
            vp.x = rv.x;
            vp.y = rv.y;
            vp.width = rv.width;
            vp.height = rv.height;
            vb.x = 0;
            vb.y = 0;
            vb.width = rv.width / this._scaleX;
            vb.height = rv.height / this._scaleY;
          }
          policy.postApply(this);
          localWinSize.width = this._visibleRect.width;
          localWinSize.height = this._visibleRect.height;
          if (visibleRect) {
            visibleRect.init(this._visibleRect);
          }
          this.emit('design-resolution-changed');
        }

        /**
         * @en Returns the designed size for the view.
         * @zh 返回视图的设计分辨率。
         */
        getDesignResolutionSize() {
          return new Size(this._designResolutionSize.width, this._designResolutionSize.height);
        }

        /**
         * @en Sets the container to desired pixel resolution and fit the game content to it.
         * This function is very useful for adaptation in mobile browsers.
         * In some HD android devices, the resolution is very high, but its browser performance may not be very good.
         * In this case, enabling retina display is very costy and not suggested, and if retina is disabled, the image may be blurry.
         * But this API can be helpful to set a desired pixel resolution which is in between.
         * This API will do the following:
         *     1. Set viewport's width to the desired width in pixel
         *     2. Set body width to the exact pixel resolution
         *     3. The resolution policy will be reset with designed view size in points.
         * @zh 设置容器（container）需要的像素分辨率并且适配相应分辨率的游戏内容。
         * @param width Design resolution width.
         * @param height Design resolution height.
         * @param resolutionPolicy The resolution policy desired
         *
         * @deprecated since v3.6.0
         */
        setRealPixelResolution(width, height, resolutionPolicy) {
          if (!JSB && !RUNTIME_BASED && !MINIGAME) {
            // Set body width to the exact pixel resolution
            document.documentElement.style.width = `${width}px`;
            document.body.style.width = `${width}px`;
            document.body.style.left = '0px';
            document.body.style.top = '0px';
          }

          // Reset the resolution size and policy
          this.setDesignResolutionSize(width, height, resolutionPolicy);
        }

        /**
         * @en Returns the view port rectangle.
         * @zh 返回视窗剪裁区域。
         */
        getViewportRect() {
          return this._viewportRect;
        }

        /**
         * @en Returns scale factor of the horizontal direction (X axis).
         * @zh 返回横轴的缩放比，这个缩放比是将画布像素分辨率放到设计分辨率的比例。
         */
        getScaleX() {
          return this._scaleX;
        }

        /**
         * @en Returns scale factor of the vertical direction (Y axis).
         * @zh 返回纵轴的缩放比，这个缩放比是将画布像素分辨率缩放到设计分辨率的比例。
         */
        getScaleY() {
          return this._scaleY;
        }

        /**
         * @en Returns device pixel ratio for retina display.
         * @zh 返回设备或浏览器像素比例。
         *
         * @deprecated since v3.4.0, please use screen.devicePixelRatio instead.
         */
        getDevicePixelRatio() {
          return screenAdapter.devicePixelRatio;
        }

        /**
         * @en Returns the real location in view for a translation based on a related position
         * @zh 将屏幕坐标转换为游戏视图下的坐标。
         * @param tx - The X axis translation
         * @param ty - The Y axis translation
         * @param relatedPos - The related position object including "left", "top", "width", "height" informations
         * @param out - The out object to save the conversion result
         *
         * @deprecated since v3.4.0
         */
        convertToLocationInView(tx, ty, relatedPos, out = new Vec2()) {
          const x = screenAdapter.devicePixelRatio * (tx - relatedPos.left);
          const y = screenAdapter.devicePixelRatio * (relatedPos.top + relatedPos.height - ty);
          if (screenAdapter.isFrameRotated) {
            out.x = screen.windowSize.width - y;
            out.y = x;
          } else {
            out.x = x;
            out.y = y;
          }
          return out;
        }

        // Convert location in Cocos screen coordinate to location in UI space
        _convertToUISpace(point) {
          const viewport = this._viewportRect;
          point.x = (point.x - viewport.x) / this._scaleX;
          point.y = (point.y - viewport.y) / this._scaleY;
        }
        _updateAdaptResult(width, height, windowId) {
          var _this$_resizeCallback;
          // The default invalid windowId is 0
          cclegacy.director.root.resize(width, height, windowId === undefined || windowId === 0 ? 1 : windowId);
          // Frame size changed, do resize works
          const w = this._designResolutionSize.width;
          const h = this._designResolutionSize.height;
          if (width > 0 && height > 0) {
            this.setDesignResolutionSize(w, h, this._resolutionPolicy);
          } else {
            assert(false, '_updateAdaptResult Invalid size.');
          }
          this.emit('canvas-resize');
          (_this$_resizeCallback = this._resizeCallback) === null || _this$_resizeCallback === void 0 ? void 0 : _this$_resizeCallback.call(this);
        }
      });
      /**
       * !en
       * Emit when design resolution changed.
       * !zh
       * 当设计分辨率改变时发送。
       * @event design-resolution-changed
       */
      View.instance = void 0;
      /**
       * ContainerStrategy class is the root strategy class of container's scale strategy,
       * it controls the behavior of how to scale the cc.game.container and cc.game.canvas object
       */
      ContainerStrategy = class ContainerStrategy {
        constructor() {
          this.name = 'ContainerStrategy';
        }
        /**
         * @en Manipulation before appling the strategy
         * @zh 在应用策略之前的操作
         * @param view - The target view
         */
        preApply(_view) {}

        /**
         * @en Function to apply this strategy
         * @zh 策略应用方法
         * @param view
         * @param designedResolution
         */
        apply(_view, designedResolution) {}

        /**
         * @en
         * Manipulation after applying the strategy
         * @zh 策略调用之后的操作
         * @param view  The target view
         */
        postApply(_view) {}
        _setupCanvas() {
          // TODO: need to figure out why set width and height of canvas
          const locCanvas = cclegacy.game.canvas;
          if (locCanvas) {
            const windowSize = screen.windowSize;
            if (locCanvas.width !== windowSize.width) {
              locCanvas.width = windowSize.width;
            }
            if (locCanvas.height !== windowSize.height) {
              locCanvas.height = windowSize.height;
            }
          }
        }
      };
      /**
       * @en
       * Emit when canvas resize.
       * @zh
       * 当画布大小改变时发送。
       * @event canvas-resize
       */
      /**
       * ContentStrategy class is the root strategy class of content's scale strategy,
       * it controls the behavior of how to scale the scene and setup the viewport for the game
       *
       * @class ContentStrategy
       */
      ContainerStrategy.EQUAL_TO_FRAME = void 0;
      ContainerStrategy.PROPORTION_TO_FRAME = void 0;
      ContentStrategy = class ContentStrategy {
        constructor() {
          this.name = 'ContentStrategy';
          this._result = void 0;
          this._result = {
            scale: [1, 1],
            viewport: null
          };
        }

        /**
         * @en Manipulation before applying the strategy
         * @zh 策略应用前的操作
         * @param view - The target view
         */
        preApply(_view) {}

        /**
         * @en Function to apply this strategy
         * The return value is {scale: [scaleX, scaleY], viewport: {new Rect}},
         * The target view can then apply these value to itself, it's preferred not to modify directly its private variables
         * @zh 调用策略方法
         * @return The result scale and viewport rect
         */
        apply(_view, designedResolution) {
          return {
            scale: [1, 1]
          };
        }

        /**
         * @en Manipulation after applying the strategy
         * @zh 策略调用之后的操作
         * @param view - The target view
         */
        postApply(_view) {}

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */
        _buildResult(containerW, containerH, contentW, contentH, scaleX, scaleY) {
          // Makes content fit better the canvas
          if (Math.abs(containerW - contentW) < 2) {
            contentW = containerW;
          }
          if (Math.abs(containerH - contentH) < 2) {
            contentH = containerH;
          }
          const viewport = new Rect(Math.round((containerW - contentW) / 2), Math.round((containerH - contentH) / 2), contentW, contentH);
          this._result.scale = [scaleX, scaleY];
          this._result.viewport = viewport;
          return this._result;
        }
      };
      ContentStrategy.EXACT_FIT = void 0;
      ContentStrategy.SHOW_ALL = void 0;
      ContentStrategy.NO_BORDER = void 0;
      ContentStrategy.FIXED_HEIGHT = void 0;
      ContentStrategy.FIXED_WIDTH = void 0;
      (() => {
        // Container scale strategys
        /**
         * @class EqualToFrame
         * @extends ContainerStrategy
         */
        class EqualToFrame extends ContainerStrategy {
          constructor(...args) {
            super(...args);
            this.name = 'EqualToFrame';
          }
          apply(_view, designedResolution) {
            screenAdapter.isProportionalToFrame = false;
            this._setupCanvas();
          }
        }

        /**
         * @class ProportionalToFrame
         * @extends ContainerStrategy
         */
        class ProportionalToFrame extends ContainerStrategy {
          constructor(...args) {
            super(...args);
            this.name = 'ProportionalToFrame';
          }
          apply(_view, designedResolution) {
            screenAdapter.isProportionalToFrame = true;
            this._setupCanvas();
          }
        }

        // Alias: Strategy that makes the container's size equals to the frame's size
        ContainerStrategy.EQUAL_TO_FRAME = new EqualToFrame();
        // Alias: Strategy that scale proportionally the container's size to frame's size
        ContainerStrategy.PROPORTION_TO_FRAME = new ProportionalToFrame();

        // Content scale strategys
        class ExactFit extends ContentStrategy {
          constructor(...args) {
            super(...args);
            this.name = 'ExactFit';
          }
          apply(_view, designedResolution) {
            const windowSize = screen.windowSize;
            const containerW = windowSize.width;
            const containerH = windowSize.height;
            const scaleX = containerW / designedResolution.width;
            const scaleY = containerH / designedResolution.height;
            return this._buildResult(containerW, containerH, containerW, containerH, scaleX, scaleY);
          }
        }
        class ShowAll extends ContentStrategy {
          constructor(...args) {
            super(...args);
            this.name = 'ShowAll';
          }
          apply(_view, designedResolution) {
            const windowSize = screen.windowSize;
            const containerW = windowSize.width;
            const containerH = windowSize.height;
            const designW = designedResolution.width;
            const designH = designedResolution.height;
            const scaleX = containerW / designW;
            const scaleY = containerH / designH;
            let scale = 0;
            let contentW;
            let contentH;
            if (scaleX < scaleY) {
              scale = scaleX;
              contentW = containerW;
              contentH = designH * scale;
            } else {
              scale = scaleY;
              contentW = designW * scale;
              contentH = containerH;
            }
            return this._buildResult(containerW, containerH, contentW, contentH, scale, scale);
          }
        }
        class NoBorder extends ContentStrategy {
          constructor(...args) {
            super(...args);
            this.name = 'NoBorder';
          }
          apply(_view, designedResolution) {
            const windowSize = screen.windowSize;
            const containerW = windowSize.width;
            const containerH = windowSize.height;
            const designW = designedResolution.width;
            const designH = designedResolution.height;
            const scaleX = containerW / designW;
            const scaleY = containerH / designH;
            let scale;
            let contentW;
            let contentH;
            if (scaleX < scaleY) {
              scale = scaleY;
              contentW = designW * scale;
              contentH = containerH;
            } else {
              scale = scaleX;
              contentW = containerW;
              contentH = designH * scale;
            }
            return this._buildResult(containerW, containerH, contentW, contentH, scale, scale);
          }
        }
        class FixedHeight extends ContentStrategy {
          constructor(...args) {
            super(...args);
            this.name = 'FixedHeight';
          }
          apply(_view, designedResolution) {
            const windowSize = screen.windowSize;
            const containerW = windowSize.width;
            const containerH = windowSize.height;
            const designH = designedResolution.height;
            const scale = containerH / designH;
            const contentW = containerW;
            const contentH = containerH;
            return this._buildResult(containerW, containerH, contentW, contentH, scale, scale);
          }
        }
        class FixedWidth extends ContentStrategy {
          constructor(...args) {
            super(...args);
            this.name = 'FixedWidth';
          }
          apply(_view, designedResolution) {
            const windowSize = screen.windowSize;
            const containerW = windowSize.width;
            const containerH = windowSize.height;
            const designW = designedResolution.width;
            const scale = containerW / designW;
            const contentW = containerW;
            const contentH = containerH;
            return this._buildResult(containerW, containerH, contentW, contentH, scale, scale);
          }
        }

        // Alias: Strategy to scale the content's size to container's size, non proportional
        ContentStrategy.EXACT_FIT = new ExactFit();
        // Alias: Strategy to scale the content's size proportionally to maximum size and keeps the whole content area to be visible
        ContentStrategy.SHOW_ALL = new ShowAll();
        // Alias: Strategy to scale the content's size proportionally to fill the whole container area
        ContentStrategy.NO_BORDER = new NoBorder();
        // Alias: Strategy to scale the content's height to container's height and proportionally scale its width
        ContentStrategy.FIXED_HEIGHT = new FixedHeight();
        // Alias: Strategy to scale the content's width to container's width and proportionally scale its height
        ContentStrategy.FIXED_WIDTH = new FixedWidth();
      })();

      /**
       * @en ResolutionPolicy class is the root strategy class of scale strategy,
       * its main task is to maintain the compatibility with Cocos2d-x.
       *
       * @zh ResolutionPolicy 类是适配策略的根策略类，它的主要任务是保持与 Cocos2d-x 的兼容性。
       */
      _export("ResolutionPolicy", ResolutionPolicy = class ResolutionPolicy {
        /**
         * Constructor of ResolutionPolicy
         * @param containerStg
         * @param contentStg
         */
        constructor(containerStg, contentStg) {
          this.name = 'ResolutionPolicy';
          this._containerStrategy = void 0;
          this._contentStrategy = void 0;
          this._containerStrategy = null;
          this._contentStrategy = null;
          this.setContainerStrategy(containerStg);
          this.setContentStrategy(contentStg);
        }
        get canvasSize() {
          return screen.windowSize;
        }

        /**
         * @en Manipulation before applying the resolution policy
         * @zh 策略应用前的操作
         * @param _view The target view
         */
        preApply(_view) {
          this._contentStrategy.preApply(_view);
        }

        /**
         * @en Function to apply this resolution policy
         * The return value is {scale: [scaleX, scaleY], viewport: {new Rect}},
         * The target view can then apply these value to itself, it's preferred not to modify directly its private variables
         * @zh 调用策略方法
         * @param _view - The target view
         * @param designedResolution - The user defined design resolution
         * @return An object contains the scale X/Y values and the viewport rect
         */
        apply(_view, designedResolution) {
          this._containerStrategy.apply(_view, designedResolution);
          return this._contentStrategy.apply(_view, designedResolution);
        }

        /**
         * @en Manipulation after appyling the strategy
         * @zh 策略应用之后的操作
         * @param _view - The target view
         */
        postApply(_view) {
          this._contentStrategy.postApply(_view);
        }

        /**
         * @en Setup the container's scale strategy
         * @zh 设置容器的适配策略
         * @param containerStg The container strategy
         */
        setContainerStrategy(containerStg) {
          if (containerStg instanceof ContainerStrategy) {
            this._containerStrategy = containerStg;
          }
        }

        /**
         * @en Setup the content's scale strategy
         * @zh 设置内容的适配策略
         * @param contentStg The content strategy
         */
        setContentStrategy(contentStg) {
          if (contentStg instanceof ContentStrategy) {
            this._contentStrategy = contentStg;
          }
        }
      });
      /**
       * @en The entire application is visible in the specified area without trying to preserve the original aspect ratio.
       * Distortion can occur, and the application may appear stretched or compressed.
       *
       * @zh 整个应用程序在指定区域可见，无需尝试保留原始纵横比，
       * 可能会发生变形，出现画面拉伸或压缩。
       */
      ResolutionPolicy.EXACT_FIT = 0;
      /**
       * @en The entire application fills the specified area, without distortion but possibly with some cropping,
       * while maintaining the original aspect ratio of the application.
       *
       * @zh 整个应用程序填充指定区域，没有变形，但可能有一些裁剪，
       * 同时保持画面的原始纵横比。
       */
      ResolutionPolicy.NO_BORDER = 1;
      /**
       * @en The entire application is visible in the specified area without distortion while maintaining the original
       * aspect ratio of the application. Borders can appear on two sides of the application.
       *
       * @zh 整个应用程序在指定区域可见，没有变形，同时保持原始纵横比，
       * 边框可能出现在画面的旁侧。
       */
      ResolutionPolicy.SHOW_ALL = 2;
      /**
       * @en The application takes the height of the design resolution size and modifies the width of the internal
       * canvas so that it fits the aspect ratio of the device
       * no distortion will occur however you must make sure your application works on different
       * aspect ratios
       *
       * @zh 该应用程序采用设计分辨率大小的高度并修改内部画布的宽度，使其适合设备的纵横比，不会发生变形，
       * 但是您必须确保您的应用程序在不同的纵横比的设备下工作。
       */
      ResolutionPolicy.FIXED_HEIGHT = 3;
      /**
       * @en The application takes the width of the design resolution size and modifies the height of the internal
       * canvas so that it fits the aspect ratio of the device
       * no distortion will occur however you must make sure your application works on different
       * aspect ratios
       *
       * @zh 该应用程序采用设计分辨率大小的宽度并修改内部画布的高度，使其适合设备的纵横比，不会发生变形
       * 但是您必须确保您的应用程序在不同的纵横比的设备下工作。
       */
      ResolutionPolicy.FIXED_WIDTH = 4;
      /**
       * @en Unknown policy
       *
       * @zh 未知的策略
       */
      ResolutionPolicy.UNKNOWN = 5;
      ResolutionPolicy.ContainerStrategy = ContainerStrategy;
      ResolutionPolicy.ContentStrategy = ContentStrategy;
      cclegacy.ResolutionPolicy = ResolutionPolicy;

      /**
       * @en view is the singleton view object.
       * @zh view 是全局的视图单例对象。
       */
      _export("view", view = View.instance = cclegacy.view = new View());
      director.registerSystem('view', view, 0);

      /**
       * @en winSize is the alias object for the size of the current game window.
       * @zh winSize 为当前的游戏窗口的大小。
       *
       * @deprecated since v3.3, please use view.getVisibleSize() instead.
       */
      cclegacy.winSize = localWinSize;
    }
  };
});