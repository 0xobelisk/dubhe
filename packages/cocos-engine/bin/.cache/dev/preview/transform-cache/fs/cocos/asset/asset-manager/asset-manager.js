System.register("q-bundled:///fs/cocos/asset/asset-manager/asset-manager.js", ["../../../../virtual/internal%253Aconstants.js", "../../core/index.js", "./bundle.js", "./cache.js", "./cache-manager.js", "./depend-util.js", "./downloader.js", "./factory.js", "./fetch.js", "./helper.js", "./load.js", "./pack-manager.js", "./parser.js", "./pipeline.js", "./preprocess.js", "./release-manager.js", "./request-item.js", "./shared.js", "./task.js", "./url-transformer.js", "./utilities.js"], function (_export, _context) {
  "use strict";

  var BUILD, EDITOR, PREVIEW, error, Settings, settings, path, cclegacy, EventTarget, Bundle, Cache, CacheManager, dependUtil, DependUtil, downloader, Downloader, factory, fetch, helper, load, packManager, parser, Parser, Pipeline, preprocess, releaseManager, RequestItem, presets, references, assets, BuiltinBundleName, bundles, fetchPipeline, files, parsed, pipeline, transformPipeline, assetsOverrideMap, Task, combine, parse, replaceOverrideAsset, asyncify, parseParameters, EVENT_ASSET_MISSING, AssetManager, assetManager;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /* eslint-disable max-len */ /*
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
      PREVIEW = _virtualInternal253AconstantsJs.PREVIEW;
    }, function (_coreIndexJs) {
      error = _coreIndexJs.error;
      Settings = _coreIndexJs.Settings;
      settings = _coreIndexJs.settings;
      path = _coreIndexJs.path;
      cclegacy = _coreIndexJs.cclegacy;
      EventTarget = _coreIndexJs.EventTarget;
    }, function (_bundleJs) {
      Bundle = _bundleJs.default;
    }, function (_cacheJs) {
      Cache = _cacheJs.default;
    }, function (_cacheManagerJs) {
      CacheManager = _cacheManagerJs.default;
    }, function (_dependUtilJs) {
      dependUtil = _dependUtilJs.default;
      DependUtil = _dependUtilJs.DependUtil;
    }, function (_downloaderJs) {
      downloader = _downloaderJs.default;
      Downloader = _downloaderJs.Downloader;
    }, function (_factoryJs) {
      factory = _factoryJs.default;
    }, function (_fetchJs) {
      fetch = _fetchJs.default;
    }, function (_helperJs) {
      helper = _helperJs;
    }, function (_loadJs) {
      load = _loadJs.default;
    }, function (_packManagerJs) {
      packManager = _packManagerJs.default;
    }, function (_parserJs) {
      parser = _parserJs.default;
      Parser = _parserJs.Parser;
    }, function (_pipelineJs) {
      Pipeline = _pipelineJs.Pipeline;
    }, function (_preprocessJs) {
      preprocess = _preprocessJs.default;
    }, function (_releaseManagerJs) {
      releaseManager = _releaseManagerJs.releaseManager;
    }, function (_requestItemJs) {
      RequestItem = _requestItemJs.default;
    }, function (_sharedJs) {
      presets = _sharedJs.presets;
      references = _sharedJs.references;
      assets = _sharedJs.assets;
      BuiltinBundleName = _sharedJs.BuiltinBundleName;
      bundles = _sharedJs.bundles;
      fetchPipeline = _sharedJs.fetchPipeline;
      files = _sharedJs.files;
      parsed = _sharedJs.parsed;
      pipeline = _sharedJs.pipeline;
      transformPipeline = _sharedJs.transformPipeline;
      assetsOverrideMap = _sharedJs.assetsOverrideMap;
    }, function (_taskJs) {
      Task = _taskJs.default;
    }, function (_urlTransformerJs) {
      combine = _urlTransformerJs.combine;
      parse = _urlTransformerJs.parse;
      replaceOverrideAsset = _urlTransformerJs.replaceOverrideAsset;
    }, function (_utilitiesJs) {
      asyncify = _utilitiesJs.asyncify;
      parseParameters = _utilitiesJs.parseParameters;
    }],
    execute: function () {
      EVENT_ASSET_MISSING = 'asset-missing';
      /**
       * @zh
       * AssetManager 配置。
       * @en
       * AssetManager configuration.
       */
      /**
       * @en
       * This module controls asset's behaviors and information, include loading, releasing etc. it is a singleton
       * You can access it via [[assetManager]].
       *
       * @zh
       * 此模块管理资源的行为和信息，包括加载，释放等，这是一个单例，你能够通过 `assetManager` 访问它。
       */
      _export("AssetManager", AssetManager = /*#__PURE__*/function () {
        function AssetManager() {
          /**
           * @en
           * Normal loading pipeline. Asset manager uses this pipeline to load all assets, it has an additional asset parsing process compared to the fetchPipeline.
           *
           * @zh
           * 正常加载管线。Asset manager 使用此管线来加载所有资源，他与 fetchPipeline 相比额外多了资源的解析过程。
           */
          this.pipeline = pipeline.append(preprocess).append(load);
          /**
           * @en
           * Fetching pipeline. Asset manager uses this pipeline to preload all assets, which lacks the asset parsing process compared to the pipeline.
           *
           * @zh
           * 下载管线。Asset manager 使用此管线来预加载所有资源，他与 pipeline 相比缺少了资源的解析过程。
           *
           */
          this.fetchPipeline = fetchPipeline.append(preprocess).append(fetch);
          /**
           * @en
           * Url transformer. Asset manager uses this pipeline to convert the uuid, path, etc. to the path of the final file path to be loaded.
           * You can customize this pipeline to redirect the path to the path you want.
           *
           * @zh
           * Url 转换器。Asset manager 使用此管线将 uuid, 路径等信息转换为最终要加载的文件路径。你可以自定义此管线将路径重定向到你想要的路径。
           *
           */
          this.transformPipeline = transformPipeline.append(parse).append(replaceOverrideAsset).append(combine);
          /**
           * @en
           * The collection of bundle which is already loaded, you can remove cache with [[removeBundle]].
           *
           * @zh
           * 已加载 bundle 的集合， 你能通过 [[removeBundle]] 来移除缓存。
           *
           */
          this.bundles = bundles;
          /**
           * @en
           * The collection of asset which is already loaded, you can remove cache with [[releaseAsset]].
           *
           * @zh
           * 已加载资源的集合， 你能通过 [[releaseAsset]] 来移除缓存。
           */
          this.assets = assets;
          /**
           * @internal only using in L10N for now.
           */
          this.assetsOverrideMap = assetsOverrideMap;
          /**
           * @internal
           */
          this.generalImportBase = '';
          /**
           * @internal
           */
          this.generalNativeBase = '';
          /**
           * @en
           * Manage relationship between asset and its dependencies.
           *
           * @zh
           * 管理资源间依赖关系。
           */
          this.dependUtil = dependUtil;
          /**
           * @en
           * A flag indicates whether to force loading assets and ignore errors.
           *
           * @zh
           * 是否强制加载资源标志, 如果为 true，加载资源时将会忽略错误。
           *
           */
          this.force = EDITOR || PREVIEW;
          /**
           * @en
           * Whether to use image bitmap to load image first. If enabled, images loading will become faster but memory usage will increase.
           *
           * @zh
           * 是否优先使用 image bitmap 来加载图片，启用之后，图片加载速度会更快, 但内存占用会变高。
           *
           */
          this.allowImageBitmap = false;
          /**
           * @en
           * Some useful functions, such as the convert function between url and uuid.
           *
           * @zh
           * 一些有用的方法, 例如 url 与 uuid 之间的转换方法。
           *
           */
          this.utils = helper;
          /**
           * @en
           * The downloader used by `assetManager`.It manages all downloading tasks.
           *
           * @zh
           * `assetManager` 所使用的下载器，管理所有下载任务。
           *
           */
          this.downloader = downloader;
          /**
           * @en
           * The parser used by `assetManager`.It manages all parsing tasks.
           *
           * @zh
           * `assetManager` 所使用的解析器，管理所有解析任务。
           *
           */
          this.parser = parser;
          /**
           * @en
           * Manage all packed assets.
           *
           * @zh
           * 管理所有合并后的资源。
           *
           * @deprecated Since v3.7, this is an engine internal interface. You usually don't need to care about how resources are merged and split.
           */
          this.packManager = packManager;
          /**
           * @en
           * Whether to cache loaded assets.
           *
           * @zh
           * 是否缓存已加载的资源。
           *
           */
          this.cacheAsset = true;
          /**
           * @en
           * Cache manager is a module which controls all caches downloaded from server in non-web platform.
           *
           * @zh
           * 缓存管理器是一个模块，在非 WEB 平台上，用于管理所有从服务器上下载下来的缓存。
           *
           */
          this.cacheManager = null;
          /**
           * @en
           * The preset of options.
           *
           * @zh
           * 可选参数的预设集。
           *
           */
          this.presets = presets;
          /**
           * @internal
           */
          this.factory = factory;
          /**
           * @internal
           */
          this.preprocessPipe = preprocess;
          /**
           * @internal
           */
          this.fetchPipe = fetch;
          /**
           * @internal
           */
          this.loadPipe = load;
          /**
           * @internal
           */
          this.references = references;
          this._releaseManager = releaseManager;
          this._files = files;
          this._parsed = parsed;
          this._parsePipeline = BUILD ? null : new Pipeline('parse existing json', [this.loadPipe]);
          this._projectBundles = [];
          this._eventTarget = new EventTarget();
        }

        /**
         * @en
         * The builtin 'main' bundle.
         *
         * @zh
         * 内置 main 包。
         */
        var _proto = AssetManager.prototype;
        /**
         * @en
         * Add a delegate which will be invoked when asset is missing.
         *
         * @zh
         * 添加当资源丢失时调用的委托。
         *
         * @param func - @en The missing asset delegate. @zh 资源丢失委托。
         * @param target - @en The target of the missing asset delegate, can be null. @zh 资源丢失委托的目标对象，可以为空。
         * @internal
         * @engineInternal
         */
        _proto.onAssetMissing = function onAssetMissing(func, target) {
          this._eventTarget.on(EVENT_ASSET_MISSING, func, target);
        }

        /**
         * @en
         * Remove the delegate when asset is missing.
         * @zh
         * 移除资源丢失时调用的委托。
         * @param func - @en The missing asset delegate. @zh 资源丢失委托。
         * @param target - @en The target of the missing asset delegate, can be null. @zh 资源丢失委托的目标对象，可以为空。
         * @internal
         * @engineInternal
         */;
        _proto.offAssetMissing = function offAssetMissing(func, target) {
          this._eventTarget.off(EVENT_ASSET_MISSING, func, target);
        }

        /**
         * @en
         * Dispatch event when asset is missing.
         * @zh
         * 触发资源丢失时事件。
         * @param parentAsset - @en The parent asset of the missing asset. @zh 丢失的资源的父资源。
         * @param owner - @en The owner of the missing asset. @zh 丢失的资源的拥有者。
         * @param propName - @en The property name of the missing asset. @zh 丢失的资源的属性名称。
         * @param uuid - @en The uuid of the missing asset. @zh 丢失的资源的 uuid。
         * @internal
         * @engineInternal
         */;
        _proto.dispatchAssetMissing = function dispatchAssetMissing(parentAsset, owner, propName, uuid) {
          this._eventTarget.emit(EVENT_ASSET_MISSING, parentAsset, owner, propName, uuid);
        }

        /**
         * @en
         * Initializes assetManager with options.
         * This method will be called automatically when the engine starts, you should not call this method manually at any time.
         *
         * @zh
         * 初始化资源管理器，引擎在启动时，将会自动调用此方法，你不应该在任何时候手动调用此方法。
         *
         * @param options @en The configuration of asset manager. @zh 资源管理器的配置选项。
         * @internal
         */;
        _proto.init = function init(options) {
          if (options === void 0) {
            options = {};
          }
          var server = options.server || settings.querySettings(Settings.Category.ASSETS, 'server') || '';
          var bundleVers = options.bundleVers || settings.querySettings(Settings.Category.ASSETS, 'bundleVers') || {};
          var remoteBundles = options.remoteBundles || settings.querySettings(Settings.Category.ASSETS, 'remoteBundles') || [];
          var downloadMaxConcurrency = options.downloadMaxConcurrency || settings.querySettings(Settings.Category.ASSETS, 'downloadMaxConcurrency');
          if (downloadMaxConcurrency && downloadMaxConcurrency > 0) {
            this.downloader.maxConcurrency = downloadMaxConcurrency;
          }
          this._files.clear();
          this._parsed.clear();
          this._releaseManager.init();
          this.assets.clear();
          this.bundles.clear();
          this.packManager.init();
          this.downloader.init(server, bundleVers, remoteBundles);
          this.parser.init();
          this.dependUtil.init();
          var importBase = options.importBase || settings.querySettings(Settings.Category.ASSETS, 'importBase') || '';
          if (importBase && importBase.endsWith('/')) {
            importBase = importBase.substr(0, importBase.length - 1);
          }
          var nativeBase = options.nativeBase || settings.querySettings(Settings.Category.ASSETS, 'nativeBase') || '';
          if (nativeBase && nativeBase.endsWith('/')) {
            nativeBase = nativeBase.substr(0, nativeBase.length - 1);
          }
          this.generalImportBase = importBase;
          this.generalNativeBase = nativeBase;
          this._projectBundles = settings.querySettings(Settings.Category.ASSETS, 'projectBundles') || [];
          var assetsOverride = settings.querySettings(Settings.Category.ASSETS, 'assetsOverrides') || {};
          for (var _key in assetsOverride) {
            this.assetsOverrideMap.set(_key, assetsOverride[_key]);
          }
        }

        /**
         * @en
         * Gets the bundle which has been loaded with the name of bundle.
         *
         * @zh
         * 通过包名称获取已加载的分包。
         *
         * @param name @en The name of bundle. @zh 资源包的名称。
         * @returns @en The loaded bundle. @zh 已加载的资源包。
         *
         * @example
         * // ${project}/assets/test1
         * assetManager.getBundle('test1');
         *
         * assetManager.getBundle('resources');
         *
         */;
        _proto.getBundle = function getBundle(name) {
          return bundles.get(name) || null;
        }

        /**
         * @en
         * Removes this bundle. NOTE: The asset within this bundle will not be released automatically,
         * you can call [[AssetManager.Bundle.releaseAll]] manually before removing it if you need.
         *
         * @zh
         * 移除此包, 注意：这个包内的资源不会自动释放, 如果需要的话你可以在摧毁之前手动调用 [[AssetManager.Bundle.releaseAll]] 进行释放。
         *
         * @param bundle @en The bundle to be removed. @zh 准备移除的 Bundle。
         *
         */;
        _proto.removeBundle = function removeBundle(bundle) {
          bundle._destroy();
          bundles.remove(bundle.name);
        }

        /**
         * @en
         * General interface used to load assets with a progression callback and a complete callback.
         * It is highly recommended that you use more simple API, such as `load`, `loadDir` etc. You can pass
         * some additional data via the `options` parameter, and the parameters in `options` will affect this loading.
         * The optional parameter will be transferred to handler of `downloader` and `parser` as `options`. You can
         * register you own handler downloader or parser to collect these custom parameters for some effect.
         *
         * Reserved Keywords for additional parameters: `uuid`, `url`, `path`, `dir`, `scene`, `type`, `priority`, `preset`, `audioLoadMode`, `ext`,
         * `bundle`, `onFileProgress`, `maxConcurrency`, `maxRequestsPerFrame`, `maxRetryCount`, `version`, `xhrResponseType`,
         * `xhrWithCredentials`, `xhrMimeType`, `xhrTimeout`, `xhrHeader`, `reloadAsset`, `cacheAsset`, `cacheEnabled`,
         * Please DO NOT use these words as your own options!
         *
         * @zh
         * 通用加载资源接口，可传入进度回调以及完成回调，建议你使用更简单的API，例如 `load`、`loadDir` 等。你可以通过 `options` 参数额外传递一些数据，`options` 中的参数将会影响本次加载。
         * 额外参数会传入加载流程中的 `downloader`, `parser` 的处理方法中, 你可以扩展 `downloader`, `parser` 收集参数完成想实现的效果。
         *
         * 额外参数保留关键字: `uuid`, `url`, `path`, `dir`, `scene`, `type`, `priority`, `preset`, `audioLoadMode`, `ext`, `bundle`, `onFileProgress`,
         *  `maxConcurrency`, `maxRequestsPerFrame`, `maxRetryCount`, `version`, `xhrResponseType`, `xhrWithCredentials`, `xhrMimeType`, `xhrTimeout`, `xhrHeader`,
         *  `reloadAsset`, `cacheAsset`, `cacheEnabled`, 请不要使用这些字段为你自己的参数!
         *
         * @param requests @en The loading requests. @zh 加载请求。
         * @param options @en Optional parameters. @zh 可选参数。
         * @param onProgress @en Callback invoked when the loading progress change. @zh 加载进度发生变化时执行的回调。
         * @param onProgress.finished
         * @en The number of request items that have finished loading.
         * @zh 已经完成加载的资源数量。
         * @param onProgress.total @en The number of all request items to be loaded. @zh 所有待加载的资源数量。
         * @param onProgress.item @en The finished request item. @zh 当前完成的加载项。
         * @param onComplete @en Callback invoked when all assets loaded. @zh 所有资源加载完成后的回调。
         * @param onComplete.err @en Error message during loading, or null if loaded successfully. @zh 加载过程中的错误信息，如果加载成功则为 null。
         * @param onComplete.data @en The loaded data, or null if an error occurred during loading. @zh 已加载的数据，如果加载过程中有错误发生，则为 null。
         *
         * @example
         * assetManager.loadAny({url: 'http://example.com/a.png'}, (err, img) => log(img));
         * assetManager.loadAny(['60sVXiTH1D/6Aft4MRt9VC'], (err, assets) => log(assets));
         * assetManager.loadAny([{ uuid: '0cbZa5Y71CTZAccaIFluuZ'}, {url: 'http://example.com/a.png'}], (err, assets) => log(assets));
         * assetManager.downloader.register('.asset', (url, options, onComplete) => {
         *      url += '?userName=' + options.userName + "&password=" + options.password;
         *      // other logic.
         * });
         * assetManager.parser.register('.asset', (file, options, onComplete) => {
         *      var json = JSON.parse(file);
         *      var skin = json[options.skin];
         *      var model = json[options.model];
         *      onComplete(null, {skin, model});
         * });
         * assetManager.loadAny({ url: 'http://example.com/my.asset' }, { skin: 'xxx', model: 'xxx', userName: 'xxx', password: 'xxx' });
         *
         */;
        _proto.loadAny = function loadAny(requests, options, onProgress, onComplete) {
          var _parseParameters = parseParameters(options, onProgress, onComplete),
            opts = _parseParameters.options,
            onProg = _parseParameters.onProgress,
            onComp = _parseParameters.onComplete;
          opts.preset = opts.preset || 'default';
          requests = Array.isArray(requests) ? requests.slice() : requests;
          var task = Task.create({
            input: requests,
            onProgress: onProg,
            onComplete: asyncify(onComp),
            options: opts
          });
          pipeline.async(task);
        }

        /**
         * @en
         * General interface used to preload assets with a progression callback and a complete callback.It is highly recommended that you use
         * more simple API, such as `preloadRes`, `preloadResDir` etc. Everything about preload is just likes `assetManager.loadAny`, the
         * difference is `assetManager.preloadAny` will only download asset but not parse asset. You need to invoke `assetManager.loadAny()`
         * to finish loading asset
         *
         * @zh
         * 通用预加载资源接口，可传入进度回调以及完成回调，非常建议你使用更简单的 API ，例如 `preloadRes`, `preloadResDir` 等。`preloadAny` 和 `loadAny`
         * 几乎一样，区别在于 `preloadAny` 只会下载资源，不会去解析资源，你需要调用 `assetManager.loadAny()` 来完成资源加载。
         *
         * @param requests @en The preloading requests. @zh 预加载请求。
         * @param options @en Optional parameters. @zh 可选参数。
         * @param onProgress @en Callback invoked when the preloading progress change. @zh 预加载进度发生变化时执行的回调。
         * @param onProgress.finished
         * @en The number of request items that have finished preloading.
         * @zh 已经完成加载的资源数量。
         * @param onProgress.total @en The number of all request items to be preloaded. @zh 所有待预加载的资源数量。
         * @param onProgress.item @en The finished request item. @zh 当前完成的预加载项。
         * @param onComplete @en Callback invoked when all assets preloaded. @zh 所有资源预加载完成后的回调。
         * @param onComplete.err
         * @en The error occurred in preloading process. Or null if preloaded successfully.
         * @zh 预加载过程中的发生的错误，如果预加载成功则为 null。
         * @param onComplete.items @en The preloaded content. @zh 完成预加载的内容。
         *
         * @example
         * assetManager.preloadAny('0cbZa5Y71CTZAccaIFluuZ', (err) => assetManager.loadAny('0cbZa5Y71CTZAccaIFluuZ'));
         *
         */;
        _proto.preloadAny = function preloadAny(requests, options, onProgress, onComplete) {
          var _parseParameters2 = parseParameters(options, onProgress, onComplete),
            opts = _parseParameters2.options,
            onProg = _parseParameters2.onProgress,
            onComp = _parseParameters2.onComplete;
          opts.preset = opts.preset || 'preload';
          requests = Array.isArray(requests) ? requests.slice() : requests;
          var task = Task.create({
            input: requests,
            onProgress: onProg,
            onComplete: asyncify(onComp),
            options: opts
          });
          fetchPipeline.async(task);
        }

        /**
         * @en
         * Loads remote asset with url, such as audio, image, text and so on.
         * Note that `loadRemote` uses the extension name in the url to determine how to load the asset.
         * If you pass in a url without the extension name, you need to specify the `ext` parameter
         * in the `options` to indicate how you want the asset loaded. See the third example below.
         *
         * @zh
         * 使用 url 加载远程资源，例如音频，图片，文本等等。需要注意的是 `loadRemote` 是通过 url 中的扩展名判断以何种方式加载该资源，
         * 如果你传入的 url 中没有携带后缀名，你需要额外指定 `options` 中的 `ext` 参数来表明你需要何种方式加载该资源。请参考下面的第三个示例。
         *
         * @param url @en The url of asset. @zh 资源的 URL 链接。
         * @param options @en Some optional parameters. @zh 一些可选参数。
         * @param options.ext
         * @en If the url does not have an extension name, you can specify one manually. This will affect the way the assets are loaded.
         * @zh 如果 URL 链接中没有包含扩展名，你可以手动指定一个扩展名。这将会影响资源的加载方式。
         * @param onComplete @en Callback invoked when finish loading. @zh 当完成加载时触发的回调函数。
         * @param onComplete.err @en The error occurred in loading process. Or null if loaded successfully. @zh 加载过程中出现的错误，如果加载成功则为 null。
         * @param onComplete.asset
         * @en The loaded asset. If there is an error in the loading process, this asset will be null.
         * @zh 加载好的资源，如果加载过程出现了错误，资源将会 null。
         *
         * @example
         * assetManager.loadRemote('http://www.cloud.com/test1.jpg', (err, texture) => console.log(err));
         * assetManager.loadRemote('http://www.cloud.com/test2.mp3', (err, audioClip) => console.log(err));
         * assetManager.loadRemote('http://www.cloud.com/test3', { ext: '.png' }, (err, texture) => console.log(err));
         *
         */;
        _proto.loadRemote = function loadRemote(url, options, onComplete) {
          var _parseParameters3 = parseParameters(options, undefined, onComplete),
            opts = _parseParameters3.options,
            onComp = _parseParameters3.onComplete;
          if (!opts.reloadAsset && this.assets.has(url)) {
            asyncify(onComp)(null, this.assets.get(url));
            return;
          }
          opts.__isNative__ = true;
          opts.preset = opts.preset || 'remote';
          this.loadAny({
            url: url
          }, opts, null, function (err, data) {
            if (err) {
              error(err.message, err.stack);
              if (onComp) {
                onComp(err, data);
              }
            } else {
              factory.create(url, data, opts.ext || path.extname(url), opts, function (p1, p2) {
                if (onComp) {
                  onComp(p1, p2);
                }
              });
            }
          });
        }

        /**
         * @en
         * loads bundle with bundle name or URL. When you have configured a bundle in your project, you can load the bundle by the name configured in your project.
         * Or when you put the bundle on the server, you can also load it by the full url address.
         *
         * Note: When you load a remote bundle by name, the bundle will be cached locally after download and will continue to use that cache in future, even if
         * the version of the bundle file on your server has changed. When you need to load the latest bundle, you can pass an additional `version` parameter in the
         * optional parameters and the asset system will compare this version number with the local cache, if the comparison fails, the asset system will pull
         * the latest version of the bundle data from the server again.
         *
         * @zh
         * 通过包名称或 url 加载资源包。当你在项目中配置了 Bundle 后，你可以通过项目中配置的名称来加载该 Bundle。
         * 或者当你将 bundle 放在服务器上时，你也可以通过完整的 url 地址进行加载。
         *
         * 注意：当你用名称加载远程 bundle 时，该 bundle 在下载后将会缓存在本地并在后续持续使用该缓存，即使你服务器上的 bundle 文件版本已经发生变化。当你需要加载
         * 最新的 bundle 时，你可以在可选参数中额外传入一个 `version` 参数，资源系统将比对此版本号与本地缓存是否一致，如果比对失败，则资源系统将重新从服务器上拉取
         * 最新版本的 bundle 数据。
         *
         * @param nameOrUrl @en The name or root path of bundle. @zh 待加载的 bundle 在项目中的名称或在服务器上的 url 路径。
         * @param options @en Some optional parameters. @zh 一些可选参数。
         * @param options.version
         * @en The version of the bundle, which you can get in the editor's build system, or directly by looking at the md5 hash value in the `config.json` path in the bundle directory after the build.
         * @zh bundle 的版本号，你可以在编辑器的构建系统中获取，或者直接查看构建后的 bundle 目录中 config.json 路径中的 md5 hash 值。
         * @param onComplete @en Callback invoked when bundle loaded or failed. @zh bundle 加载完成的回调。
         * @param onComplete.err @en The occurred error during the loading, Or null if loaded successfully. @zh 加载过程中发生的错误，如果加载成功则为 null。
         * @param onComplete.bundle
         * @en The loaded bundle. If there is an error in the loading process, this bundle will be null.
         * @zh 加载完成的 bundle。如果加载过程中出现了错误，则为 null。
         *
         * @example
         * loadBundle('myBundle', (err, bundle) => console.log(bundle));
         * loadBundle('http://localhost:8080/test', null, (err, bundle) => console.log(err));
         *
         */;
        _proto.loadBundle = function loadBundle(nameOrUrl, options, onComplete) {
          var _parseParameters4 = parseParameters(options, undefined, onComplete),
            opts = _parseParameters4.options,
            onComp = _parseParameters4.onComplete;
          var bundleName = path.basename(nameOrUrl);
          if (this.bundles.has(bundleName)) {
            asyncify(onComp)(null, this.getBundle(bundleName));
            return;
          }
          opts.preset = opts.preset || 'bundle';
          opts.ext = 'bundle';
          opts.__isNative__ = true;
          this.loadAny({
            url: nameOrUrl
          }, opts, null, function (err, data) {
            if (err) {
              error(err.message, err.stack);
              if (onComp) {
                onComp(err, data);
              }
            } else {
              factory.create(nameOrUrl, data, 'bundle', opts, function (p1, p2) {
                if (onComp) {
                  onComp(p1, p2);
                }
              });
            }
          });
        }

        /**
         * @en
         * Release asset and it's dependencies.
         * This method will not only remove the cache of the asset in assetManager, but also clean up its content.
         * For example, if you release a texture, the texture asset and its gl texture data will be freed up.
         * Notice, this method may cause the texture to be unusable, if there are still other nodes use the same texture,
         * they may turn to black and report gl errors.
         *
         * @zh
         * 释放资源以及其依赖资源, 这个方法不仅会从 assetManager 中删除资源的缓存引用，还会清理它的资源内容。
         * 比如说，当你释放一个 texture 资源，这个 texture 和它的 gl 贴图数据都会被释放。
         * 注意，这个函数可能会导致资源贴图或资源所依赖的贴图不可用，如果场景中存在节点仍然依赖同样的贴图，它们可能会变黑并报 GL 错误。
         *
         * @param asset @en The asset to be released. @zh 被释放的资源。
         *
         * @example
         * // release a texture which is no longer need
         * assetManager.releaseAsset(texture);
         *
         */;
        _proto.releaseAsset = function releaseAsset(asset) {
          releaseManager.tryRelease(asset, true);
        }

        /**
         * @en
         * Release all unused assets. Refer to [[releaseAsset]] for detailed information.
         *
         * @zh
         * 释放所有没有用到的资源。详细信息请参考 [[releaseAsset]]。
         *
         * @engineInternal
         *
         */;
        _proto.releaseUnusedAssets = function releaseUnusedAssets() {
          assets.forEach(function (asset) {
            releaseManager.tryRelease(asset);
          });
        }

        /**
         * @en
         * Release all assets. Refer to [[releaseAsset]] for detailed information.
         *
         * @zh
         * 释放所有资源。详细信息请参考 [[releaseAsset]]。
         *
         */;
        _proto.releaseAll = function releaseAll() {
          assets.forEach(function (asset) {
            releaseManager.tryRelease(asset, true);
          });
        }

        /**
         * For internal usage.
         * @param json
         * @param options
         * @param onComplete
         * @internal
         */;
        _proto.loadWithJson = function loadWithJson(json, options, onProgress, onComplete) {
          if (BUILD) {
            throw new Error('Only valid in Editor');
          }
          var _parseParameters5 = parseParameters(options, onProgress, onComplete),
            opts = _parseParameters5.options,
            onProg = _parseParameters5.onProgress,
            onComp = _parseParameters5.onComplete;
          var item = RequestItem.create();
          item.isNative = false;
          item.uuid = opts.assetId || "" + new Date().getTime() + Math.random();
          item.file = json;
          item.ext = '.json';
          var task = Task.create({
            input: [item],
            onProgress: onProg,
            options: opts,
            onComplete: asyncify(function (err, data) {
              if (!err) {
                if (!opts.assetId) {
                  data._uuid = '';
                }
              }
              if (onComp) {
                onComp(err, data);
              }
            })
          });
          this._parsePipeline.async(task);
        };
        _createClass(AssetManager, [{
          key: "main",
          get: function get() {
            return bundles.get(BuiltinBundleName.MAIN) || null;
          }

          /**
           * @en
           * The builtin 'resources' bundle.
           *
           * @zh
           * 内置 resources 包。
           *
           */
        }, {
          key: "resources",
          get: function get() {
            return bundles.get(BuiltinBundleName.RESOURCES) || null;
          }
        }], [{
          key: "instance",
          get:
          /**
           * @en
           * A global singleton instance of [[AssetManager]], which you can access directly through [[assetManager]].
           *
           * @zh
           * [[AssetManager]] 的全局单例，你可以直接通过 [[assetManager]] 访问。
           */
          function get() {
            if (!this._instance) {
              this._instance = new AssetManager();
            }
            return this._instance;
          }
        }]);
        return AssetManager;
      }());
      AssetManager._instance = void 0;
      AssetManager.Pipeline = Pipeline;
      AssetManager.Task = Task;
      AssetManager.Cache = Cache;
      AssetManager.RequestItem = RequestItem;
      AssetManager.Bundle = Bundle;
      AssetManager.BuiltinBundleName = BuiltinBundleName;
      AssetManager.CacheManager = CacheManager;
      AssetManager.Downloader = Downloader;
      AssetManager.Parser = Parser;
      AssetManager.DependUtil = DependUtil;
      /**
       * @en `assetManager` is a global singleton instance of [[AssetManager]].
       * The engine uses `assetManager` to manage all asset and asset bundle, including loading, releasing, etc.
       * @zh `assetManager` 为 [[AssetManager]] 的全局单例，引擎使用 `assetManager` 来完成所有资源和资源包的管理工作，包括加载，释放等。
       */
      assetManager = cclegacy.assetManager = AssetManager.instance;
      _export("default", assetManager);
      cclegacy.AssetManager = AssetManager;
    }
  };
});