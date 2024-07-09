System.register("q-bundled:///fs/cocos/spine/skeleton-data.js", ["../../../virtual/internal%253Aconstants.js", "../core/index.js", "./skeleton-cache.js", "./lib/spine-core.js", "../core/data/decorators/index.js", "../core/global-exports.js", "../asset/assets/index.js", "../scene-graph/index.js"], function (_export, _context) {
  "use strict";

  var EDITOR_NOT_IN_PREVIEW, CCString, Enum, error, SkeletonCache, spine, ccclass, serializable, type, legacyCC, Texture2D, Asset, Node, _dec, _dec2, _dec3, _class, _class2, _initializer, _initializer2, _initializer3, _initializer4, _initializer5, SkeletonData;
  function _applyDecoratedInitializer(target, property, decorators, initializer) {
    return decorators.slice().reverse().reduce(function (decoratedInitializer, decorator) {
      return decorator(target, property, decoratedInitializer) || decoratedInitializer;
    }, initializer);
  }
  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR_NOT_IN_PREVIEW = _virtualInternal253AconstantsJs.EDITOR_NOT_IN_PREVIEW;
    }, function (_coreIndexJs) {
      CCString = _coreIndexJs.CCString;
      Enum = _coreIndexJs.Enum;
      error = _coreIndexJs.error;
    }, function (_skeletonCacheJs) {
      SkeletonCache = _skeletonCacheJs.default;
    }, function (_libSpineCoreJs) {
      spine = _libSpineCoreJs.default;
    }, function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
      serializable = _coreDataDecoratorsIndexJs.serializable;
      type = _coreDataDecoratorsIndexJs.type;
    }, function (_coreGlobalExportsJs) {
      legacyCC = _coreGlobalExportsJs.legacyCC;
    }, function (_assetAssetsIndexJs) {
      Texture2D = _assetAssetsIndexJs.Texture2D;
      Asset = _assetAssetsIndexJs.Asset;
    }, function (_sceneGraphIndexJs) {
      Node = _sceneGraphIndexJs.Node;
    }],
    execute: function () {
      /**
       * @en The skeleton data of spine.
       * @zh Spine 的骨骼数据。
       * @class SkeletonData
       * @extends Asset
       */
      _export("SkeletonData", SkeletonData = (_dec = ccclass('sp.SkeletonData'), _dec2 = type([Texture2D]), _dec3 = type([CCString]), _dec(_class = (_class2 = class SkeletonData extends Asset {
        /**
         * @en A string parsed from the _skeletonJson.
         * @zh 从 _skeletonJson 中解析出的字符串。
         */
        get skeletonJsonStr() {
          if (this._skeletonJson) {
            return JSON.stringify(this._skeletonJson);
          }
          return '';
        }

        /**
         * @en See http://en.esotericsoftware.com/spine-json-format
         * @zh 可查看 Spine 官方文档 http://zh.esotericsoftware.com/spine-json-format
         */
        get skeletonJson() {
          return this._skeletonJson;
        }
        set skeletonJson(value) {
          this.reset();
          if (typeof value === 'string') {
            this._skeletonJson = JSON.parse(value);
          } else {
            this._skeletonJson = value;
          }
          // If create by manual, uuid is empty.
          if (!this._uuid && value.skeleton) {
            this._uuid = value.skeleton.hash;
          }
        }

        /**
         * @en An atlas text description.
         * @zh Atlas 文本描述。
         */
        get atlasText() {
          return this._atlasText;
        }
        set atlasText(value) {
          this._atlasText = value;
          this.reset();
        }

        /**
         * @en Texture array.
         * @zh 纹理数组。
         */

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */
        get _nativeAsset() {
          return this._buffer;
        }
        set _nativeAsset(bin) {
          this._buffer = bin;
          this.reset();
        }
        /**
         * @en A string describing atlas.
         * @zh 描述图集信息的字符串。
         */

        constructor() {
          super();
          /**
           * @en See http://en.esotericsoftware.com/spine-json-format
           * @zh 可查看 Spine 官方文档 http://zh.esotericsoftware.com/spine-json-format
           * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
           */
          this._skeletonJson = _initializer && _initializer();
          this.textures = _initializer2 && _initializer2();
          /**
           * @en Texture name array.
           * @zh 纹理名称数组。
           * @private
           */
          this.textureNames = _initializer3 && _initializer3();
          /**
           * @en
           * A scale can be specified on the JSON or binary loader which will scale the bone positions,
           * image sizes, and animation translations.
           * This can be useful when using different sized images than were used when design ing the skeleton
           * in Spine. For example, if using images that are half the size than were used in Spine,
           * a scale of 0.5 can be used. This is commonly used for games that can run with either low or high
           * resolution texture atlases.
           * see http://en.esotericsoftware.com/spine-using-runtimes#Scaling
           * @zh 在 JSON 或二进制加载器上可以指定一个缩放比例，该缩放比例将缩放骨头位置、图像大小和动画平移。
           * 这在使用与 Spine 中设计骨架不同大小的图像时非常有用。例如，如果使用的图像大小是 Spine 中使用的
           * 图像大小的一半，可以使用 0.5 的缩放比例。这在游戏中经常使用，因为游戏可以使用低分辨率或高分辨率
           * 的纹理图集。可查看 Spine 官方文档：
           * http://zh.esotericsoftware.com/spine-using-runtimes#Scaling
           */
          this.scale = _initializer4 && _initializer4();
          this._atlasText = _initializer5 && _initializer5();
          this._buffer = void 0;
          this._skeletonCache = null;
          this._skinsEnum = null;
          this._animsEnum = null;
          this.reset();
        }

        /**
         * @internal
         * @deprecated Since v3.7.2, this is an engine private interface that will be removed in the future.
         */
        createNode(callback) {
          const node = new Node(this.name);
          const skeleton = node.addComponent('cc.Skeleton');
          skeleton.skeletonData = this;
          return callback(null, node);
        }
        /**
         * @en Resets skeleton data state.
         * @zh 重置数据。
         */
        reset() {
          this._skeletonCache = null;
          if (EDITOR_NOT_IN_PREVIEW) {
            this._skinsEnum = null;
            this._animsEnum = null;
          }
        }
        /**
         * @internal Since v3.7.2, this is an engine private function, only works in editor.
         * @en Reset skeleton skin and animation enumeration.
         * @zh 重置皮肤和动画枚举。
         */
        resetEnums() {
          if (EDITOR_NOT_IN_PREVIEW) {
            this._skinsEnum = null;
            this._animsEnum = null;
          }
        }

        /**
         * @en Gets the included SkeletonData used in spine runtime.<br>
         * Returns a sp.spine.SkeletonData object.
         * @zh 获取 Spine Runtime 使用的 SkeletonData。<br>
         * 返回一个 p.spine.SkeletonData 对象。
         * @param quiet @en If vaulue is false, feedback information will be printed when an error occurs.
         *              @zh 值为 false 时，当发生错误时将打印出反馈信息。
         */
        getRuntimeData(quiet) {
          if (this._skeletonCache) {
            return this._skeletonCache;
          }
          if (!(this.textures && this.textures.length > 0) && this.textureNames && this.textureNames.length > 0) {
            if (!quiet) {
              error(`${this.name} no textures found!`);
            }
            return null;
          }
          const spData = spine.wasmUtil.querySpineSkeletonDataByUUID(this._uuid);
          if (spData) {
            this._skeletonCache = spData;
          } else if (this.skeletonJsonStr) {
            this._skeletonCache = spine.wasmUtil.createSpineSkeletonDataWithJson(this.skeletonJsonStr, this._atlasText);
            spine.wasmUtil.registerSpineSkeletonDataWithUUID(this._skeletonCache, this._uuid);
          } else {
            const rawData = new Uint8Array(this._nativeAsset);
            const byteSize = rawData.length;
            const ptr = spine.wasmUtil.queryStoreMemory(byteSize);
            const wasmMem = spine.wasmUtil.wasm.HEAPU8.subarray(ptr, ptr + byteSize);
            wasmMem.set(rawData);
            this._skeletonCache = spine.wasmUtil.createSpineSkeletonDataWithBinary(byteSize, this._atlasText);
            spine.wasmUtil.registerSpineSkeletonDataWithUUID(this._skeletonCache, this._uuid);
          }
          return this._skeletonCache;
        }

        /**
         * @internal Since v3.7.2, this is an engine private function, it only works in editor.
         */
        getSkinsEnum() {
          if (this._skinsEnum /* && Object.keys(this._skinsEnum).length > 0 */) {
            return this._skinsEnum;
          }
          const sd = this.getRuntimeData(true);
          if (sd) {
            const skins = sd.skins;
            const enumDef = {};
            for (let i = 0; i < skins.length; i++) {
              const name = skins[i].name;
              enumDef[name] = i;
            }
            return this._skinsEnum = Enum(enumDef);
          }
          return null;
        }
        /**
         * @internal Since v3.7.2, this is an engine private function, it only works in editor.
         */
        getAnimsEnum() {
          if (this._animsEnum && Object.keys(this._animsEnum).length > 1) {
            return this._animsEnum;
          }
          const sd = this.getRuntimeData(true);
          if (sd) {
            const enumDef = {
              '<None>': 0
            };
            const anims = sd.animations;
            for (let i = 0; i < anims.length; i++) {
              const name = anims[i].name;
              enumDef[name] = i + 1;
            }
            return this._animsEnum = Enum(enumDef);
          }
          return null;
        }
        /**
         * @en Destroy skeleton data.
         * @zh 销毁 skeleton data。
         */
        destroy() {
          SkeletonCache.sharedCache.destroyCachedAnimations(this._uuid);
          if (this._skeletonCache) {
            spine.wasmUtil.registerSpineSkeletonDataWithUUID(this._skeletonCache, this._uuid);
          }
          return super.destroy();
        }
      }, (_initializer = _applyDecoratedInitializer(_class2.prototype, "_skeletonJson", [serializable], function () {
        return null;
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "textures", [serializable, _dec2], function () {
        return [];
      }), _initializer3 = _applyDecoratedInitializer(_class2.prototype, "textureNames", [serializable, _dec3], function () {
        return [];
      }), _initializer4 = _applyDecoratedInitializer(_class2.prototype, "scale", [serializable], function () {
        return 1;
      }), _initializer5 = _applyDecoratedInitializer(_class2.prototype, "_atlasText", [serializable], function () {
        return '';
      })), _class2)) || _class));
      legacyCC.internal.SpineSkeletonData = SkeletonData;
    }
  };
});