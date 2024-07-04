System.register("q-bundled:///fs/cocos/dragon-bones/ArmatureDisplay.js", ["../../../virtual/internal%253Aconstants.js", "@cocos/dragonbones-js", "../2d/framework/ui-renderer.js", "../core/index.js", "./ArmatureCache.js", "./AttachUtil.js", "./CCFactory.js", "./DragonBonesAsset.js", "./DragonBonesAtlasAsset.js", "../2d/components/index.js", "../render-scene/core/material-instance.js", "./ArmatureSystem.js", "../2d/renderer/render-entity.js", "../2d/renderer/render-draw-info.js", "../asset/assets/index.js", "../scene-graph/index.js", "../asset/asset-manager/index.js", "../core/internal-index.js"], function (_export, _context) {
  "use strict";

  var EDITOR_NOT_IN_PREVIEW, EventObject, UIRenderer, Color, Enum, ccenum, errorID, RecyclePool, js, CCObject, EventTarget, cclegacy, _decorator, ArmatureCache, AttachUtil, CCFactory, DragonBonesAsset, DragonBonesAtlasAsset, Graphics, MaterialInstance, ArmatureSystem, RenderEntity, RenderEntityType, RenderDrawInfo, Material, Node, builtinResMgr, setPropertyEnumType, _dec, _dec2, _class, _class2, _initializer, _initializer2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _dec14, _dec15, _dec16, _dec17, _dec18, _dec19, _dec20, _dec21, _dec22, _dec23, _dec24, _dec25, _dec26, _dec27, _dec28, _dec29, _class4, _class5, _initializer3, _initializer4, _initializer5, _initializer6, _initializer7, _initializer8, _initializer9, _initializer10, _initializer11, _initializer12, _initializer13, _initializer14, _initializer15, _initializer16, _class6, DefaultArmaturesEnum, DefaultAnimsEnum, DefaultCacheMode, timeScale, AnimationCacheMode, ccclass, serializable, editable, type, help, menu, tooltip, visible, displayName, override, displayOrder, executeInEditMode, DragonBoneSocket, ArmatureDisplay;
  function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
  function _applyDecoratedInitializer(target, property, decorators, initializer) {
    return decorators.slice().reverse().reduce(function (decoratedInitializer, decorator) {
      return decorator(target, property, decoratedInitializer) || decoratedInitializer;
    }, initializer);
  }
  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }
  _export("AnimationCacheMode", void 0);
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR_NOT_IN_PREVIEW = _virtualInternal253AconstantsJs.EDITOR_NOT_IN_PREVIEW;
    }, function (_cocosDragonbonesJs) {
      EventObject = _cocosDragonbonesJs.EventObject;
    }, function (_dFrameworkUiRendererJs) {
      UIRenderer = _dFrameworkUiRendererJs.UIRenderer;
    }, function (_coreIndexJs) {
      Color = _coreIndexJs.Color;
      Enum = _coreIndexJs.Enum;
      ccenum = _coreIndexJs.ccenum;
      errorID = _coreIndexJs.errorID;
      RecyclePool = _coreIndexJs.RecyclePool;
      js = _coreIndexJs.js;
      CCObject = _coreIndexJs.CCObject;
      EventTarget = _coreIndexJs.EventTarget;
      cclegacy = _coreIndexJs.cclegacy;
      _decorator = _coreIndexJs._decorator;
    }, function (_ArmatureCacheJs) {
      ArmatureCache = _ArmatureCacheJs.ArmatureCache;
    }, function (_AttachUtilJs) {
      AttachUtil = _AttachUtilJs.AttachUtil;
    }, function (_CCFactoryJs) {
      CCFactory = _CCFactoryJs.CCFactory;
    }, function (_DragonBonesAssetJs) {
      DragonBonesAsset = _DragonBonesAssetJs.DragonBonesAsset;
    }, function (_DragonBonesAtlasAssetJs) {
      DragonBonesAtlasAsset = _DragonBonesAtlasAssetJs.DragonBonesAtlasAsset;
    }, function (_dComponentsIndexJs) {
      Graphics = _dComponentsIndexJs.Graphics;
    }, function (_renderSceneCoreMaterialInstanceJs) {
      MaterialInstance = _renderSceneCoreMaterialInstanceJs.MaterialInstance;
    }, function (_ArmatureSystemJs) {
      ArmatureSystem = _ArmatureSystemJs.ArmatureSystem;
    }, function (_dRendererRenderEntityJs) {
      RenderEntity = _dRendererRenderEntityJs.RenderEntity;
      RenderEntityType = _dRendererRenderEntityJs.RenderEntityType;
    }, function (_dRendererRenderDrawInfoJs) {
      RenderDrawInfo = _dRendererRenderDrawInfoJs.RenderDrawInfo;
    }, function (_assetAssetsIndexJs) {
      Material = _assetAssetsIndexJs.Material;
    }, function (_sceneGraphIndexJs) {
      Node = _sceneGraphIndexJs.Node;
    }, function (_assetAssetManagerIndexJs) {
      builtinResMgr = _assetAssetManagerIndexJs.builtinResMgr;
    }, function (_coreInternalIndexJs) {
      setPropertyEnumType = _coreInternalIndexJs.setPropertyEnumType;
    }],
    execute: function () {
      (function (DefaultArmaturesEnum) {
        DefaultArmaturesEnum[DefaultArmaturesEnum["default"] = -1] = "default";
      })(DefaultArmaturesEnum || (DefaultArmaturesEnum = {}));
      ccenum(DefaultArmaturesEnum);
      (function (DefaultAnimsEnum) {
        DefaultAnimsEnum[DefaultAnimsEnum["<None>"] = 0] = "<None>";
      })(DefaultAnimsEnum || (DefaultAnimsEnum = {}));
      ccenum(DefaultAnimsEnum);
      (function (DefaultCacheMode) {
        DefaultCacheMode[DefaultCacheMode["REALTIME"] = 0] = "REALTIME";
      })(DefaultCacheMode || (DefaultCacheMode = {}));
      ccenum(DefaultAnimsEnum);

      /**
       * @en Control animation speed, should be larger than 0.
       * @zh 控制龙骨动画播放速度，数值应大于 0。
       */
      // eslint-disable-next-line prefer-const,import/no-mutable-exports
      _export("timeScale", timeScale = 1);
      /**
       * @en Enum for cache mode type.
       * @zh Dragonbones 渲染类型。
       * @enum ArmatureDisplay.AnimationCacheMode
       */
      (function (AnimationCacheMode) {
        AnimationCacheMode[AnimationCacheMode["REALTIME"] = 0] = "REALTIME";
        AnimationCacheMode[AnimationCacheMode["SHARED_CACHE"] = 1] = "SHARED_CACHE";
        AnimationCacheMode[AnimationCacheMode["PRIVATE_CACHE"] = 2] = "PRIVATE_CACHE";
      })(AnimationCacheMode || _export("AnimationCacheMode", AnimationCacheMode = {}));
      ccenum(AnimationCacheMode);
      ccclass = _decorator.ccclass;
      serializable = _decorator.serializable;
      editable = _decorator.editable;
      type = _decorator.type;
      help = _decorator.help;
      menu = _decorator.menu;
      tooltip = _decorator.tooltip;
      visible = _decorator.visible;
      displayName = _decorator.displayName;
      override = _decorator.override;
      displayOrder = _decorator.displayOrder;
      executeInEditMode = _decorator.executeInEditMode;
      /**
       * @en Struct that can store rendering data-related information.
       * @zh 用于存储渲染数据相关信息的结构体。
       */
      /**
       * @en DragonBones Socket. Used to attach components to bone nodes and move them together
       * with bone animations. Developers need to specify the bone path that needs to follow the
       * movement and which node the motion transformation will be applied to.
       * @zh 骨骼挂点。用于将组件挂载在骨骼节点上，随骨骼动画一起运动。
       * 用户需指定需要跟随运动的骨骼路径以及运动变换将作用于哪个节点上。
       */
      _export("DragonBoneSocket", DragonBoneSocket = (_dec = ccclass('dragonBones.ArmatureDisplay.DragonBoneSocket'), _dec2 = type(Node), _dec(_class = (_class2 = function DragonBoneSocket(path, target) {
        if (path === void 0) {
          path = '';
        }
        if (target === void 0) {
          target = null;
        }
        /**
         * @en Path of the target joint.
         * @zh 此挂点的目标骨骼路径。
         */
        this.path = _initializer && _initializer();
        /**
         * @en Transform output node.
         * @zh 此挂点的变换信息输出节点。
         */
        this.target = _initializer2 && _initializer2();
        this.boneIndex = null;
        this.path = path;
        this.target = target;
      }, (_initializer = _applyDecoratedInitializer(_class2.prototype, "path", [serializable, editable], function () {
        return '';
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "target", [_dec2, editable, serializable], function () {
        return null;
      })), _class2)) || _class));
      js.setClassAlias(DragonBoneSocket, 'dragonBones.ArmatureDisplay.DragonBoneSocket');
      /**
       * @en
       * The Armature Display of DragonBones <br/>
       * <br/>
       * Armature Display has a reference to a DragonBonesAsset and stores the state for ArmatureDisplay instance,
       * which consists of the current pose's bone SRT, slot colors, and which slot attachments are visible. <br/>
       * Multiple Armature Display can use the same DragonBonesAsset which includes all animations, skins, and attachments. <br/>
       * Cocos Creator supports DragonBones version to 5.6.300.
       * @zh
       * DragonBones 骨骼动画 <br/>
       * <br/>
       * Armature Display 具有对骨骼数据的引用并且存储了骨骼实例的状态，
       * 它由当前的骨骼动作，slot 颜色，和可见的 slot attachments 组成。<br/>
       * 多个 Armature Display 可以使用相同的骨骼数据，其中包括所有的动画，皮肤和 attachments。<br/>
       * Cocos Creator 支持 DragonBones 版本最高到 v5.6.300.
       *
       * @class ArmatureDisplay
       * @extends RenderComponent
       */
      _export("ArmatureDisplay", ArmatureDisplay = (_dec3 = ccclass('dragonBones.ArmatureDisplay'), _dec4 = help('i18n:cc.DragonBones'), _dec5 = menu('DragonBones/ArmatureDisplay'), _dec6 = type(DragonBonesAsset), _dec7 = tooltip('i18n:COMPONENT.dragon_bones.dragon_bones_asset'), _dec8 = type(DragonBonesAtlasAsset), _dec9 = tooltip('i18n:COMPONENT.dragon_bones.dragon_bones_atlas_asset'), _dec10 = visible(false), _dec11 = visible(false), _dec12 = displayName('Armature'), _dec13 = type(DefaultArmaturesEnum), _dec14 = tooltip('i18n:COMPONENT.dragon_bones.armature_name'), _dec15 = type(DefaultAnimsEnum), _dec16 = displayName('Animation'), _dec17 = tooltip('i18n:COMPONENT.dragon_bones.animation_name'), _dec18 = displayName('Animation Cache Mode'), _dec19 = tooltip('i18n:COMPONENT.dragon_bones.animation_cache_mode'), _dec20 = tooltip('i18n:COMPONENT.dragon_bones.time_scale'), _dec21 = tooltip('i18n:COMPONENT.dragon_bones.play_times'), _dec22 = tooltip('i18n:COMPONENT.skeleton.premultipliedAlpha'), _dec23 = tooltip('i18n:COMPONENT.dragon_bones.debug_bones'), _dec24 = tooltip('i18n:COMPONENT.dragon_bones.enabled_batch'), _dec25 = type([DragonBoneSocket]), _dec26 = tooltip('i18n:animation.sockets'), _dec27 = type(Material), _dec28 = displayOrder(0), _dec29 = displayName('CustomMaterial'), _dec3(_class4 = _dec4(_class4 = _dec5(_class4 = executeInEditMode(_class4 = (_class5 = (_class6 = /*#__PURE__*/function (_UIRenderer) {
        _inheritsLoose(ArmatureDisplay, _UIRenderer);
        var _proto = ArmatureDisplay.prototype;
        _proto.requestDrawInfo = function requestDrawInfo(idx) {
          if (!this._drawInfoList[idx]) {
            this._drawInfoList[idx] = new RenderDrawInfo();
          }
          return this._drawInfoList[idx];
        };
        function ArmatureDisplay() {
          var _this;
          _this = _UIRenderer.call(this) || this;
          // Property _materialCache Use to cache material,since dragonBones may use multiple texture,
          // it will clone from the '_material' property,if the dragonbones only have one texture,
          // it will just use the _material,won't clone it.
          // So if invoke getMaterial,it only return _material,if you want to change all materialCache,
          // you can change materialCache directly.
          /**
           * @en The play times of the default animation.
           *      -1 means using the value of config file;
           *      0 means repeat for ever
           *      >0 means repeat times
           * @zh 播放默认动画的循环次数
           *      -1 表示使用配置文件中的默认值;
           *      0 表示无限循环
           *      >0 表示循环次数
           * @property {Number} playTimes
           * @default -1
           */
          _this.playTimes = _initializer3 && _initializer3();
          /**
           * @en Indicates whether to enable premultiplied alpha.
           * You should disable this option when image's transparent area appears to have opaque pixels,
           * or enable this option when image's half transparent area appears to be darken.
           * @zh 是否启用贴图预乘。
           * 当图片的透明区域出现色块时需要关闭该选项，当图片的半透明区域颜色变黑时需要启用该选项。
           * @property {Boolean} premultipliedAlpha
           * @default false
           */
          _this.premultipliedAlpha = _initializer4 && _initializer4();
          /**
           * @en The armature is the core of the skeletal animation system.
           * @zh 骨架是骨骼动画系统的核心。
           */
          _this._armature = null;
          /**
           * @en The tool for mounting functionality.
           * @zh 挂载工具。
           */
          _this.attachUtil = void 0;
          _this._defaultArmatureIndexValue = _initializer5 && _initializer5();
          /**
           * @en The skeleton data of dragonBones.
           * @zh DragonBones 的骨骼数据。
           */
          _this._dragonAsset = _initializer6 && _initializer6();
          /**
           * @en The skeleton atlas data of dragonBones.
           * @zh DragonBones 的骨骼纹理数据。
           */
          _this._dragonAtlasAsset = _initializer7 && _initializer7();
          _this._armatureName = _initializer8 && _initializer8();
          _this._animationName = _initializer9 && _initializer9();
          _this._animationIndexValue = _initializer10 && _initializer10();
          _this._preCacheMode = -1;
          _this._cacheMode = AnimationCacheMode.REALTIME;
          _this._defaultCacheModeValue = _initializer11 && _initializer11();
          _this._timeScale = _initializer12 && _initializer12();
          _this._playTimes = _initializer13 && _initializer13();
          _this._debugBones = _initializer14 && _initializer14();
          _this._enableBatch = _initializer15 && _initializer15();
          /**
           * @en The graphics component for debugging.
           * @zh 用于调试的 Graphics 组件。
           */
          /* protected */
          _this._debugDraw = null;
          // DragonBones data store key.
          /**
           * @engineInternal
           */
          _this._armatureKey = '';
          // Below properties will effect when cache mode is SHARED_CACHE or PRIVATE_CACHE.
          // accumulate time
          /**
           * @engineInternal
           */
          _this._accTime = 0;
          // Play times counter
          /**
           * @engineInternal
           */
          _this._playCount = 0;
          // Frame cache
          /**
           * @engineInternal
           */
          _this._frameCache = null;
          // Cur frame
          /**
           * @engineInternal
           */
          _this._curFrame = null;
          // Playing flag
          _this._playing = false;
          // Armature cache
          _this._armatureCache = null;
          _this._eventTarget = void 0;
          _this._factory = null;
          _this._displayProxy = null;
          _this._drawIdx = 0;
          _this._drawList = new RecyclePool(function () {
            return {
              material: null,
              texture: null,
              indexOffset: 0,
              indexCount: 0
            };
          }, 1);
          /**
          * @engineInternal
          */
          _this.maxVertexCount = 0;
          /**
          * @engineInternal
          */
          _this.maxIndexCount = 0;
          _this._materialCache = {};
          _this._enumArmatures = Enum({});
          _this._enumAnimations = Enum({});
          _this._socketNodes = new Map();
          _this._cachedSockets = new Map();
          _this._sockets = _initializer16 && _initializer16();
          _this._inited = void 0;
          _this._drawInfoList = [];
          _this._cacheModeEnum = void 0;
          _this._eventTarget = new EventTarget();
          _this._inited = false;
          _this.attachUtil = new AttachUtil();
          _this.initFactory();
          setPropertyEnumType(_assertThisInitialized(_this), '_animationIndex', _this._enumAnimations);
          setPropertyEnumType(_assertThisInitialized(_this), '_defaultArmatureIndex', _this._enumArmatures);
          _this._useVertexOpacity = true;
          return _this;
        }
        /**
         * @en Initializes _factory from CCFactory, if golbal factory not exists, will create a new one.
         * @zh 初始化变量 _factory，如果全局工厂实例不存在将新创建一个工厂实列对象。
         */
        _proto.initFactory = function initFactory() {
          this._factory = CCFactory.getInstance();
        };
        _proto.onLoad = function onLoad() {
          _UIRenderer.prototype.onLoad.call(this);
        }

        /**
         * @engineInternal
         */;
        _proto._requestDrawData = function _requestDrawData(material, texture, indexOffset, indexCount) {
          var draw = this._drawList.add();
          draw.material = material;
          draw.texture = texture;
          draw.indexOffset = indexOffset;
          draw.indexCount = indexCount;
          return draw;
        }
        /**
         * @en
         * Destroy render data，will be called when need to rebuild render data or component is destroyed.
         * @zh
         * 销毁渲染数据，一般在重新生成渲染数据时或销毁组件时调用。
         */;
        _proto.destroyRenderData = function destroyRenderData() {
          this._drawList.reset();
          _UIRenderer.prototype.destroyRenderData.call(this);
        };
        _proto.getMaterialTemplate = function getMaterialTemplate() {
          if (this.customMaterial !== null) return this.customMaterial;
          if (this.material) return this.material;
          this.updateMaterial();
          return this.material;
        }

        /**
         * @engineInternal Since v3.7.2 this is an engine private function.
         */;
        _proto.getMaterialForBlend = function getMaterialForBlend(src, dst) {
          var key = src + "/" + dst;
          var inst = this._materialCache[key];
          if (inst) {
            return inst;
          }
          var material = this.getMaterialTemplate();
          var matInfo = {
            parent: material,
            subModelIdx: 0,
            owner: this
          };
          inst = new MaterialInstance(matInfo);
          inst.recompileShaders({
            TWO_COLORED: false,
            USE_LOCAL: false
          });
          this._materialCache[key] = inst;
          inst.overridePipelineStates({
            blendState: {
              targets: [{
                blendSrc: src,
                blendDst: dst
              }]
            }
          });
          return inst;
        };
        _proto._updateBuiltinMaterial = function _updateBuiltinMaterial() {
          var material = builtinResMgr.get('default-spine-material');
          return material;
        }

        /**
         * @en Custom material.
         * @zh 自定义材质。
         */;
        /**
         * @engineInternal
         */
        _proto.updateMaterial = function updateMaterial() {
          var mat;
          if (this._customMaterial) mat = this._customMaterial;else mat = this._updateBuiltinMaterial();
          this.setSharedMaterial(mat, 0);
          this._cleanMaterialCache();
        };
        _proto._render = function _render(batcher) {
          var indicesCount = 0;
          if (this.renderData && this._drawList) {
            var rd = this.renderData;
            var chunk = rd.chunk;
            var accessor = chunk.vertexAccessor;
            var meshBuffer = rd.getMeshBuffer();
            var origin = meshBuffer.indexOffset;
            // Fill index buffer
            for (var i = 0; i < this._drawList.length; i++) {
              this._drawIdx = i;
              var dc = this._drawList.data[i];
              if (dc.texture) {
                batcher.commitMiddleware(this, meshBuffer, origin + dc.indexOffset, dc.indexCount, dc.texture, dc.material, this._enableBatch);
              }
              indicesCount += dc.indexCount;
            }
            var subIndices = rd.indices.subarray(0, indicesCount);
            accessor.appendIndices(chunk.bufferId, subIndices);
          }
        };
        _proto.__preload = function __preload() {
          _UIRenderer.prototype.__preload.call(this);
          this._init();
        }
        /**
         * @en Initialize asset data and internal data within the component.
         * @zh 初始化资产数据以及组件内部数据。
         */;
        _proto._init = function _init() {
          if (EDITOR_NOT_IN_PREVIEW) {
            var Flags = CCObject.Flags;
            this._objFlags |= Flags.IsAnchorLocked | Flags.IsSizeLocked;
            // this._refreshInspector();
          }

          this._cacheMode = this._defaultCacheMode;
          if (this._inited) return;
          this._inited = true;

          // this._resetAssembler();
          // this._activateMaterial();

          this._parseDragonAtlasAsset();
          this._refresh();
          var children = this.node.children;
          for (var i = 0, n = children.length; i < n; i++) {
            var child = children[i];
            if (child && child.name === 'DEBUG_DRAW_NODE') {
              child.destroy();
            }
          }
          this._updateDebugDraw();
          this._indexBoneSockets();
          this._updateSocketBindings();
        }

        /**
         * @en
         * The key of dragonbones cache data, which is regard as 'dragonbonesName', when you want to change dragonbones cloth.
         * @zh
         * 缓存龙骨数据的 key 值，换装的时会使用到该值，作为 'dragonbonesName' 使用。
         * @method getArmatureKey
         * @returns @en The key of dragonbones cache data. @zh 缓存龙骨数据的 key 值。
         * @example
         * let factory = dragonBones.CCFactory.getInstance();
         * let needChangeSlot = needChangeArmature.armature().getSlot("changeSlotName");
         * factory.replaceSlotDisplay(toChangeArmature.getArmatureKey(), "armatureName", "slotName", "displayName", needChangeSlot);
         */;
        _proto.getArmatureKey = function getArmatureKey() {
          return this._armatureKey;
        }

        /**
         * @en
         * It's best to set cache mode before set property 'dragonAsset', or will waste some cpu time.
         * If set the mode in editor, then no need to worry about order problem.
         * @zh
         * 若想切换渲染模式，最好在设置'dragonAsset'之前，先设置好渲染模式，否则有运行时开销。
         * 若在编辑中设置渲染模式，则无需担心设置次序的问题。
         *
         * @method setAnimationCacheMode
         * @param cacheMode
         *      @en The value can be set to REALTIME, SHARED_CACHE, or PRIVATE_CACHE.
         *      @zh 可以在 REALTIME，SHARED_CACHE，PRIVATE_CACHE 中取值。
         * @example
         * armatureDisplay.setAnimationCacheMode(dragonBones.ArmatureDisplay.AnimationCacheMode.SHARED_CACHE);
         */;
        _proto.setAnimationCacheMode = function setAnimationCacheMode(cacheMode) {
          if (this._preCacheMode !== cacheMode) {
            this._cacheMode = cacheMode;
            this._buildArmature();
            if (this._armature && !this.isAnimationCached()) {
              this._factory._dragonBones.clock.add(this._armature);
            }
            this._updateSocketBindings();
            this.markForUpdateRenderData();
          }
        }

        /**
         * @en Whether in cached mode.
         * @zh 当前是否处于缓存模式。
         * @method isAnimationCached
         * @returns @en True means animation mode is SHARED_CACHE or PRIVATE_CACHE.
         *              False means animation mode is REALTIME.
         *          @zh True 代表动画使用 SHARED_CACHE 或 PRIVATE_CACHE 模式。
         *              False 代表动画使用 REALTIME 模式。
         */;
        _proto.isAnimationCached = function isAnimationCached() {
          if (EDITOR_NOT_IN_PREVIEW) return false;
          return this._cacheMode !== AnimationCacheMode.REALTIME;
        }
        /**
         * @en Be called when the component state becomes available.
         * Instance of ArmatureDisplay will be added into ArmatureSystem.
         * @zh 组件状态变为可用时调用。ArmatureDisplay 实例将被添加到 ArmatureSystem。
         */;
        _proto.onEnable = function onEnable() {
          _UIRenderer.prototype.onEnable.call(this);
          // If cache mode is cache, no need to update by dragonbones library.
          if (this._armature && !this.isAnimationCached()) {
            this._factory._dragonBones.clock.add(this._armature);
          }
          this._flushAssembler();
          ArmatureSystem.getInstance().add(this);
        }
        /**
         * @en Be called when the component state becomes invalid.
         * Instance of ArmatureDisplay will be removed from ArmatureSystem.
         * @zh 组件状态变为不可用时调用。ArmatureDisplay 实例将被从 ArmatureSystem 移除。
         */;
        _proto.onDisable = function onDisable() {
          _UIRenderer.prototype.onDisable.call(this);
          // If cache mode is cache, no need to update by dragonbones library.
          if (this._armature && !this.isAnimationCached()) {
            this._factory._dragonBones.clock.remove(this._armature);
          }
          ArmatureSystem.getInstance().remove(this);
        }
        /**
         * @engineInternal Since v3.7.2 this is an engine private function.
         */;
        _proto._emitCacheCompleteEvent = function _emitCacheCompleteEvent() {
          // Animation loop complete, the event diffrent from dragonbones inner event,
          // It has no event object.
          this._eventTarget.emit(EventObject.LOOP_COMPLETE);

          // Animation complete the event diffrent from dragonbones inner event,
          // It has no event object.
          this._eventTarget.emit(EventObject.COMPLETE);
        }
        /**
         * @en Update animation frame.
         * @zh 更新动画序列。
         * @param dt @en Delta time, unit is second. @zh 时间差，单位为秒。
         */;
        _proto.updateAnimation = function updateAnimation(dt) {
          this.markForUpdateRenderData();
          if (!this.isAnimationCached()) return;
          if (!this._frameCache) return;
          var frameCache = this._frameCache;
          if (!frameCache.isInited()) {
            return;
          }
          var frames = frameCache.frames;
          if (!this._playing) {
            if (frameCache.isInvalid()) {
              frameCache.updateToFrame();
              this._curFrame = frames[frames.length - 1];
              // Update render data size if needed
              if (this.renderData && (this.renderData.vertexCount < frameCache.maxVertexCount || this.renderData.indexCount < frameCache.maxIndexCount)) {
                this.maxVertexCount = frameCache.maxVertexCount > this.maxVertexCount ? frameCache.maxVertexCount : this.maxVertexCount;
                this.maxIndexCount = frameCache.maxIndexCount > this.maxIndexCount ? frameCache.maxIndexCount : this.maxIndexCount;
                this.renderData.resize(this.maxVertexCount, this.maxIndexCount);
                if (!this.renderData.indices || this.maxIndexCount > this.renderData.indices.length) {
                  this.renderData.indices = new Uint16Array(this.maxIndexCount);
                }
              }
            }
            return;
          }
          var frameTime = ArmatureCache.FrameTime;

          // Animation Start, the event different from dragonbones inner event,
          // It has no event object.
          if (this._accTime === 0 && this._playCount === 0) {
            this._eventTarget.emit(EventObject.START);
          }
          var globalTimeScale = timeScale;
          this._accTime += dt * this.timeScale * globalTimeScale;
          var frameIdx = Math.floor(this._accTime / frameTime);
          if (!frameCache.isCompleted) {
            frameCache.updateToFrame(frameIdx);
            // Update render data size if needed
            if (this.renderData && (this.renderData.vertexCount < frameCache.maxVertexCount || this.renderData.indexCount < frameCache.maxIndexCount)) {
              this.maxVertexCount = frameCache.maxVertexCount > this.maxVertexCount ? frameCache.maxVertexCount : this.maxVertexCount;
              this.maxIndexCount = frameCache.maxIndexCount > this.maxIndexCount ? frameCache.maxIndexCount : this.maxIndexCount;
              this.renderData.resize(this.maxVertexCount, this.maxIndexCount);
              if (!this.renderData.indices || this.maxIndexCount > this.renderData.indices.length) {
                this.renderData.indices = new Uint16Array(this.maxIndexCount);
              }
            }
          }
          if (frameCache.isCompleted && frameIdx >= frames.length) {
            this._playCount++;
            if (this.playTimes > 0 && this._playCount >= this.playTimes) {
              // set frame to end frame.
              this._curFrame = frames[frames.length - 1];
              this._accTime = 0;
              this._playing = false;
              this._playCount = 0;
              this._emitCacheCompleteEvent();
              this.attachUtil._syncAttachedNode();
              return;
            }
            this._accTime = 0;
            frameIdx = 0;
            this._emitCacheCompleteEvent();
          }
          this._curFrame = frames[frameIdx];
          this.attachUtil._syncAttachedNode();
        }
        /**
         * @en Destroy component, release resource.
         * @zh 销毁组件时调用，释放相关资源。
         */;
        _proto.onDestroy = function onDestroy() {
          this._materialInstances = this._materialInstances.filter(function (instance) {
            return !!instance;
          });
          this._inited = false;
          if (!EDITOR_NOT_IN_PREVIEW) {
            if (this._cacheMode === AnimationCacheMode.PRIVATE_CACHE) {
              this._armatureCache.dispose();
              this._armatureCache = null;
              this._armature = null;
            } else if (this._cacheMode === AnimationCacheMode.SHARED_CACHE) {
              this._armatureCache = null;
              this._armature = null;
            } else if (this._armature) {
              this._armature.dispose();
              this._armature = null;
            }
          } else if (this._armature) {
            this._armature.dispose();
            this._armature = null;
          }
          this._drawList.destroy();
          _UIRenderer.prototype.onDestroy.call(this);
        }
        /**
         * @en Update the debugging component show.
         * @zh 更新调试 Graphic 组件的显示。
         */;
        _proto._updateDebugDraw = function _updateDebugDraw() {
          if (this.debugBones) {
            if (!this._debugDraw) {
              var debugDrawNode = new Node('DEBUG_DRAW_NODE');
              debugDrawNode.hideFlags |= CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
              var debugDraw = debugDrawNode.addComponent(Graphics);
              debugDraw.lineWidth = 1;
              debugDraw.strokeColor = new Color(255, 0, 0, 255);
              this._debugDraw = debugDraw;
            }
            this._debugDraw.node.parent = this.node;
          } else if (this._debugDraw) {
            this._debugDraw.node.parent = null;
          }
          this.markForUpdateRenderData();
        }
        /**
         * @en Update related data due to batching settings.
         * @zh 更新由于合批设置导致的相关数据。
         */;
        _proto._updateBatch = function _updateBatch() {
          this._cleanMaterialCache();
          this.markForUpdateRenderData();
        }
        /**
         * @en Building data of armature.
         * @zh 构建骨架数据。
         */;
        _proto._buildArmature = function _buildArmature() {
          if (!this.dragonAsset || !this.dragonAtlasAsset || !this.armatureName) return;

          // Switch Asset or Atlas or cacheMode will rebuild armature.
          if (this._armature) {
            // dispose pre build armature
            if (!EDITOR_NOT_IN_PREVIEW) {
              if (this._preCacheMode === AnimationCacheMode.PRIVATE_CACHE) {
                this._armatureCache.dispose();
              } else if (this._preCacheMode === AnimationCacheMode.REALTIME) {
                this._armature.dispose();
              }
            } else {
              this._armature.dispose();
            }
            this._armatureCache = null;
            this._armature = null;
            this._displayProxy = null;
            this._frameCache = null;
            this._curFrame = null;
            this._playing = false;
            this._preCacheMode = -1;
          }
          if (!EDITOR_NOT_IN_PREVIEW) {
            if (this._cacheMode === AnimationCacheMode.SHARED_CACHE) {
              this._armatureCache = ArmatureCache.sharedCache;
            } else if (this._cacheMode === AnimationCacheMode.PRIVATE_CACHE) {
              this._armatureCache = new ArmatureCache();
              this._armatureCache.enablePrivateMode();
            }
          }
          var atlasUUID = this.dragonAtlasAsset._uuid;
          this._armatureKey = this.dragonAsset.init(this._factory, atlasUUID);
          if (this.isAnimationCached()) {
            this._armature = this._armatureCache.getArmatureCache(this.armatureName, this._armatureKey, atlasUUID);
            if (!this._armature) {
              // Cache fail,swith to REALTIME cache mode.
              this._cacheMode = AnimationCacheMode.REALTIME;
            }
          }
          this._preCacheMode = this._cacheMode;
          if (EDITOR_NOT_IN_PREVIEW || this._cacheMode === AnimationCacheMode.REALTIME) {
            this._displayProxy = this._factory.buildArmatureDisplay(this.armatureName, this._armatureKey, '', atlasUUID);
            if (!this._displayProxy) return;
            this._displayProxy._ccNode = this.node;
            this._displayProxy._ccComponent = this;
            this._displayProxy.setEventTarget(this._eventTarget);
            this._armature = this._displayProxy._armature;
            this._armature.animation.timeScale = this.timeScale;
            // If change mode or armature, armature must insert into clock.
            // this._factory._dragonBones.clock.add(this._armature);
          }

          if (this._cacheMode !== AnimationCacheMode.REALTIME && this.debugBones) {
            console.warn('Debug bones is invalid in cached mode');
          }
          if (this._armature) {
            var armatureData = this._armature.armatureData;
            var aabb = armatureData.aabb;
            this.node._uiProps.uiTransformComp.setContentSize(aabb.width, aabb.height);
          }
          this.attachUtil.init(this);
          if (this.animationName) {
            this.playAnimation(this.animationName, this.playTimes);
          }
          this._flushAssembler();
        }
        /**
         * @en Gets sockets binding on this component.
         * @zh 获取绑定在本组件上的socket。
         */;
        _proto.querySockets = function querySockets() {
          if (!this._armature) {
            return [];
          }
          if (this._cachedSockets.size === 0) {
            this._indexBoneSockets();
          }
          return Array.from(this._cachedSockets.keys()).sort();
        }

        /**
         * @en Query socket path with slot or bone name.
         * @zh 查询 Socket 路径。
         * @param name @en Slot name or Bone name. @zh 插槽或骨骼名称。
         */;
        _proto.querySocketPathByName = function querySocketPathByName(name) {
          var ret = [];
          for (var _iterator = _createForOfIteratorHelperLoose(this._cachedSockets.keys()), _step; !(_step = _iterator()).done;) {
            var _key = _step.value;
            if (_key.endsWith(name)) {
              ret.push(_key);
            }
          }
          return ret;
        }

        /**
         * @engineInternal Since v3.7.2 this is an engine private function.
         */;
        _proto._parseDragonAtlasAsset = function _parseDragonAtlasAsset() {
          if (this.dragonAtlasAsset) {
            this.dragonAtlasAsset.init(this._factory);
          }
        }
        /**
         * @engineInternal Since v3.7.2 this is an engine private function.
         */;
        _proto._refresh = function _refresh() {
          this._buildArmature();
          this._indexBoneSockets();
          if (EDITOR_NOT_IN_PREVIEW) {
            // update inspector
            this._updateArmatureEnum();
            this._updateAnimEnum();
            this._updateCacheModeEnum();
            // Editor.Utils.refreshSelectedInspector('node', this.node.uuid);
          }

          this.markForUpdateRenderData();
        };
        // EDITOR
        _proto._updateCacheModeEnum = function _updateCacheModeEnum() {
          this._cacheModeEnum = Enum({});
          if (this._armature) {
            Object.assign(this._cacheModeEnum, AnimationCacheMode);
          } else {
            Object.assign(this._cacheModeEnum, DefaultCacheMode);
          }
          setPropertyEnumType(this, '_defaultCacheMode', this._cacheModeEnum);
        }

        // update animation list for editor
        /**
         * @engineInternal Since v3.7.2 this is an engine private function.
         */;
        _proto._updateAnimEnum = function _updateAnimEnum() {
          var animEnum;
          if (this.dragonAsset) {
            animEnum = this.dragonAsset.getAnimsEnum(this.armatureName);
          } else {
            animEnum = DefaultAnimsEnum;
          }
          this._enumAnimations = Enum({});
          Object.assign(this._enumAnimations, animEnum || DefaultAnimsEnum);
          Enum.update(this._enumAnimations);
          // change enum
          setPropertyEnumType(this, '_animationIndex', this._enumAnimations);
        }

        // update armature list for editor
        /**
         * @engineInternal Since v3.7.2 this is an engine private function.
         */;
        _proto._updateArmatureEnum = function _updateArmatureEnum() {
          var armatureEnum;
          if (this.dragonAsset) {
            armatureEnum = this.dragonAsset.getArmatureEnum();
          } else {
            armatureEnum = DefaultArmaturesEnum;
          }
          this._enumArmatures = Enum({});
          Object.assign(this._enumArmatures, armatureEnum || DefaultArmaturesEnum);
          Enum.update(this._enumArmatures);
          // change enum
          setPropertyEnumType(this, '_defaultArmatureIndex', this._enumArmatures);
        }
        /**
         * @engineInternal Since v3.7.2 this is an engine private function.
         */;
        _proto._indexBoneSockets = function _indexBoneSockets() {
          if (!this._armature) {
            return;
          }
          this._cachedSockets.clear();
          var nameToBone = this._cachedSockets;
          var cacheBoneName = function cacheBoneName(bi, bones, cache) {
            if (cache.has(bi)) {
              return cache.get(bi);
            }
            var bone = bones[bi];
            if (!bone.parent) {
              cache.set(bi, bone.name);
              bone.path = bone.name;
              return bone.name;
            }
            var name = cacheBoneName(bone.parent._boneIndex, bones, cache) + "/" + bone.name;
            cache.set(bi, name);
            bone.path = name;
            return name;
          };
          var walkArmature = function walkArmature(prefix, armature) {
            var bones = armature.getBones();
            var boneToName = new Map();
            for (var i = 0; i < bones.length; i++) {
              bones[i]._boneIndex = i;
            }
            for (var _i = 0; _i < bones.length; _i++) {
              cacheBoneName(_i, bones, boneToName);
            }
            for (var _iterator2 = _createForOfIteratorHelperLoose(boneToName.keys()), _step2; !(_step2 = _iterator2()).done;) {
              var bone = _step2.value;
              nameToBone.set("" + prefix + boneToName.get(bone), bone);
            }
            var slots = armature.getSlots();
            for (var _i2 = 0; _i2 < slots.length; _i2++) {
              if (slots[_i2].childArmature) {
                walkArmature(slots[_i2].name, slots[_i2].childArmature);
              }
            }
          };
          walkArmature('', this._armature);
        }

        /**
         * @en
         * Play the specified animation.
         * Parameter animName specify the animation name.
         * Parameter playTimes specify the repeat times of the animation.
         * -1 means use the value of the config file.
         * 0 means play the animation for ever.
         * >0 means repeat times.
         * @zh
         * 播放指定的动画.
         * animName 指定播放动画的名称。
         * playTimes 指定播放动画的次数。
         * -1 为使用配置文件中的次数。
         * 0 为无限循环播放。
         * >0 为动画的重复次数。
         */;
        _proto.playAnimation = function playAnimation(animName, playTimes) {
          this.playTimes = playTimes === undefined ? -1 : playTimes;
          this.animationName = animName;
          if (this.isAnimationCached()) {
            var cache = this._armatureCache.getAnimationCache(this._armatureKey, animName);
            if (!cache) {
              cache = this._armatureCache.initAnimationCache(this._armatureKey, animName);
            }
            if (cache) {
              this._accTime = 0;
              this._playCount = 0;
              this._frameCache = cache;
              if (this._sockets.length > 0) {
                this._frameCache.enableCacheAttachedInfo();
              }
              this._frameCache.updateToFrame(0);
              this._playing = true;
              this._curFrame = this._frameCache.frames[0];
            }
          } else if (this._armature) {
            return this._armature.animation.play(animName, this.playTimes);
          }
          this.markForUpdateRenderData();
          return null;
        }

        /**
         * @en
         * Updating an animation cache to calculate all frame data in the animation is a cost in
         * performance due to calculating all data in a single frame.
         * To update the cache, use the invalidAnimationCache method with high performance.
         * @zh
         * 更新某个动画缓存, 预计算动画中所有帧数据，由于在单帧计算所有数据，所以较消耗性能。
         * 若想更新缓存，可使用 invalidAnimationCache 方法，具有较高性能。
         * @method updateAnimationCache
         * @param animName @en Animation's name. @zh 动画名称。
         */;
        _proto.updateAnimationCache = function updateAnimationCache(animName) {
          if (!this.isAnimationCached()) return;
          this._armatureCache.updateAnimationCache(this._armatureKey, animName);
        }

        /**
         * @en
         * Invalidates the animation cache, which is then recomputed on each frame.
         * @zh
         * 使动画缓存失效，之后会在每帧重新计算。
         * @method invalidAnimationCache
         */;
        _proto.invalidAnimationCache = function invalidAnimationCache() {
          if (!this.isAnimationCached()) return;
          this._armatureCache.invalidAnimationCache(this._armatureKey);
        }

        /**
         * @en
         * Get the all armature names in the DragonBones Data.
         * @zh
         * 获取 DragonBones 数据中所有的 armature 名称。
         * @method getArmatureNames
         * @returns @en Return an array of armature names. @zh 返回 armature 名称数组。
         */;
        _proto.getArmatureNames = function getArmatureNames() {
          var dragonBonesData = this._factory.getDragonBonesData(this._armatureKey);
          return dragonBonesData && dragonBonesData.armatureNames || [];
        }

        /**
         * @en
         * Get the all animation names of specified armature.
         * @zh
         * 获取指定的 armature 的所有动画名称。
         * @method getAnimationNames
         * @param armatureName @en The name of armature. @zh Armature 名称。
         * @returns @en Return an array of all animation names.
         *          @zh 返回包含所有动画名称的数组。
         */;
        _proto.getAnimationNames = function getAnimationNames(armatureName) {
          var ret = [];
          var dragonBonesData = this._factory.getDragonBonesData(this._armatureKey);
          if (dragonBonesData) {
            var armatureData = dragonBonesData.getArmature(armatureName);
            if (armatureData) {
              for (var animName in armatureData.animations) {
                // eslint-disable-next-line no-prototype-builtins
                if (armatureData.animations.hasOwnProperty(animName)) {
                  ret.push(animName);
                }
              }
            }
          }
          return ret;
        }

        /**
         * @en
         * Add event listener for the DragonBones Event, the same to addEventListener.
         * @zh
         * 添加 DragonBones 事件监听器，与 addEventListener 作用相同。
         * @method on
         * @param eventType @en A string representing the event type to listen for.
         *                  @zh 用于表示监听事件类型的字符串。
         * @param listener  @en The callback that will be invoked when the event is dispatched.
         *                  @zh 事件派发时的回调。
         * @param target    @en The target (this object) to invoke the callback, can be null.
         *                  @zh 调用回调函数的对象，可以为 null。
         */;
        _proto.on = function on(eventType, listener, target) {
          this.addEventListener(eventType, listener, target);
        }

        /**
         * @en
         * Remove the event listener for the DragonBones Event, the same to removeEventListener.
         * @zh
         * 移除 DragonBones 事件监听器，与 removeEventListener 作用相同。
         * @method off
         * @param eventType @en A string representing the event type to listen for.
         *                  @zh 用于表示监听事件类型的字符串。
         * @param listener  @en The callback that will be invoked when the event is dispatched.
         *                  @zh 事件派发时的回调。
         * @param target    @en The target (this object) to invoke the callback, can be null.
         *                  @zh 调用回调函数的对象，可以为 null。
         */;
        _proto.off = function off(eventType, listener, target) {
          this.removeEventListener(eventType, listener, target);
        }

        /**
         * @en
         * Add DragonBones one-time event listener, the callback will remove itself after the first time it is triggered.
         * @zh
         * 添加 DragonBones 一次性事件监听器，回调会在第一时间被触发后删除自身。
         * @method once
         * @param eventType @en A string representing the event type to listen for.
         *                  @zh 用于表示监听事件类型的字符串。
         * @param listener  @en The callback that will be invoked when the event is dispatched.
         *                  @zh 事件派发时的回调。
         * @param target    @en The target (this object) to invoke the callback, can be null.
         *                  @zh 调用回调函数的对象，可以为 null。
         */;
        _proto.once = function once(eventType, listener, target) {
          this._eventTarget.once(eventType, listener, target);
        }

        /**
         * @en
         * Add event listener for the DragonBones Event.
         * @zh
         * 添加 DragonBones 事件监听器。
         * @method addEventListener
         * @param eventType @en A string representing the event type to listen for.
         *                  @zh 用于表示监听事件类型的字符串。
         * @param listener  @en The callback that will be invoked when the event is dispatched.
         *                  @zh 事件派发时的回调。
         * @param target    @en The target (this object) to invoke the callback, can be null.
         *                  @zh 调用回调函数的对象，可以为 null。
         */;
        _proto.addEventListener = function addEventListener(eventType, listener, target) {
          this._eventTarget.on(eventType, listener, target);
        }

        /**
         * @en Remove the event listener for the DragonBones Event.
         * @zh 移除 DragonBones 事件监听器。
         * @method removeEventListener
         * @param eventType @en A string representing the event type to listen for.
         *                  @zh 用于表示监听事件类型的字符串。
         * @param listener  @en The callback that will be invoked when the event is dispatched.
         *                  @zh 事件派发时的回调。
         * @param target    @en The target (this object) to invoke the callback, can be null.
         *                  @zh 调用回调函数的对象，可以为 null。
         */;
        _proto.removeEventListener = function removeEventListener(eventType, listener, target) {
          this._eventTarget.off(eventType, listener, target);
        }

        /**
         * @en Build the armature for specified name.
         * @zh 构建指定名称的 armature 对象。
         * @method buildArmature
         * @param armatureName @en The name of armature. @zh Armature 名称。
         * @param node @en The node contains ArmatureDisplay component.
         *             @zh 承载 ArmatureDisplay 组件的 node。
         * @returns @en Return a new ArmatureDisplay component.
         *          @zh 返回一个新创建的 ArmatureDisplay 组件。
         */;
        _proto.buildArmature = function buildArmature(armatureName, node) {
          return this._factory.createArmatureNode(this, armatureName, node);
        }

        /**
         * @en
         * Get the current armature object of the ArmatureDisplay.
         * @zh
         * 获取 ArmatureDisplay 当前使用的 Armature 对象。
         * @method armature
         * @returns @en Return the armature object. @zh 返回 armature 对象。
         */;
        _proto.armature = function armature() {
          return this._armature;
        };
        _proto._flushAssembler = function _flushAssembler() {
          var assembler = ArmatureDisplay.Assembler.getAssembler(this);
          if (this._assembler !== assembler) {
            this._assembler = assembler;
          }
          if (this._armature && this._assembler) {
            this._renderData = this._assembler.createData(this);
            if (this._renderData) {
              this.maxVertexCount = this._renderData.vertexCount;
              this.maxIndexCount = this._renderData.indexCount;
            }
            this.markForUpdateRenderData();
            this._updateColor();
          }
        };
        _proto._updateSocketBindings = function _updateSocketBindings() {
          if (!this._armature) return;
          this._socketNodes.clear();
          for (var i = 0, l = this._sockets.length; i < l; i++) {
            var socket = this._sockets[i];
            if (socket.path && socket.target) {
              var bone = this._cachedSockets.get(socket.path);
              if (!bone) {
                console.error("Skeleton data does not contain path " + socket.path);
                continue;
              }
              socket.boneIndex = bone;
              this._socketNodes.set(socket.path, socket.target);
            }
          }
        };
        _proto._verifySockets = function _verifySockets(sockets) {
          for (var i = 0, l = sockets.length; i < l; i++) {
            var target = sockets[i].target;
            if (target) {
              if (!target.parent || target.parent !== this.node) {
                console.error("Target node " + target.name + " is expected to be a direct child of " + this.node.name);
                continue;
              }
            }
          }
        };
        _proto._cleanMaterialCache = function _cleanMaterialCache() {
          for (var val in this._materialCache) {
            this._materialCache[val].destroy();
          }
          this._materialCache = {};
        };
        _proto.createRenderEntity = function createRenderEntity() {
          var renderEntity = new RenderEntity(RenderEntityType.DYNAMIC);
          renderEntity.setUseLocal(false);
          return renderEntity;
        }
        /**
         * @en Sets flag for update render data.
         * @zh 标记组件渲染数据更新。
         */;
        _proto.markForUpdateRenderData = function markForUpdateRenderData(enable) {
          if (enable === void 0) {
            enable = true;
          }
          _UIRenderer.prototype.markForUpdateRenderData.call(this, enable);
          if (this._debugDraw) {
            this._debugDraw.markForUpdateRenderData(enable);
          }
        }

        /**
         * @engineInternal since v3.7.2 this is an engine private function.
         */;
        _proto.syncAttachedNode = function syncAttachedNode() {
          // sync attached node matrix
          this.attachUtil._syncAttachedNode();
        };
        _createClass(ArmatureDisplay, [{
          key: "dragonAsset",
          get:
          /**
           * @en
           * The DragonBones data contains the armatures information (bind pose bones, slots, draw order,
           * attachments, skins, etc) and animations but does not hold any state.<br/>
           * Multiple ArmatureDisplay can share the same DragonBones data.
           * @zh
           * 骨骼数据包含了骨骼信息（绑定骨骼动作，slots，渲染顺序，
           * attachments，皮肤等等）和动画但不持有任何状态。<br/>
           * 多个 ArmatureDisplay 可以共用相同的骨骼数据。
           * @property {DragonBonesAsset} dragonAsset
           */
          function get() {
            return this._dragonAsset;
          },
          set: function set(value) {
            this._dragonAsset = value;
            this.destroyRenderData();
            this._refresh();
            if (EDITOR_NOT_IN_PREVIEW) {
              this._defaultArmatureIndex = 0;
              this._animationIndex = 0;
            }
          }

          /**
           * @en
           * The atlas asset for the DragonBones.
           * @zh
           * 骨骼数据所需的 Atlas Texture 数据。
           * @property {DragonBonesAtlasAsset} dragonAtlasAsset
           */
        }, {
          key: "dragonAtlasAsset",
          get: function get() {
            return this._dragonAtlasAsset;
          },
          set: function set(value) {
            this._dragonAtlasAsset = value;
            this._parseDragonAtlasAsset();
            this._refresh();
          }

          /**
           * @en The name of current armature.
           * @zh 当前的 Armature 名称。
           * @property {String} armatureName
           */
        }, {
          key: "armatureName",
          get: function get() {
            return this._armatureName;
          },
          set: function set(name) {
            this._armatureName = name;
            var animNames = this.getAnimationNames(this._armatureName);
            if (!this.animationName || animNames.indexOf(this.animationName) < 0) {
              if (EDITOR_NOT_IN_PREVIEW) {
                this.animationName = animNames[0];
              } else {
                // Not use default animation name at runtime
                this.animationName = '';
              }
            }
            if (this._armature && !this.isAnimationCached()) {
              this._factory._dragonBones.clock.remove(this._armature);
            }
            this._refresh();
            if (this._armature && !this.isAnimationCached()) {
              this._factory._dragonBones.clock.add(this._armature);
            }
          }

          /**
           * @en The name of current playing animation.
           * @zh 当前播放的动画名称。
           * @property {String} animationName
           */
        }, {
          key: "animationName",
          get: function get() {
            return this._animationName;
          },
          set: function set(value) {
            this._animationName = value;
          }

          /**
           * @engineInternal Since v3.7.2 this is an engine private function.
           */
        }, {
          key: "_defaultArmatureIndex",
          get: function get() {
            return this._defaultArmatureIndexValue;
          },
          set: function set(value) {
            this._defaultArmatureIndexValue = value;
            var armatureName = '';
            if (this.dragonAsset) {
              var armaturesEnum;
              if (this.dragonAsset) {
                armaturesEnum = this.dragonAsset.getArmatureEnum();
              }
              if (!armaturesEnum) {
                errorID(7400, this.name);
                return;
              }
              armatureName = armaturesEnum[this._defaultArmatureIndex];
            }
            if (armatureName !== undefined) {
              this.armatureName = armatureName;
            } else {
              errorID(7401, this.name);
            }
            this.markForUpdateRenderData();
          }

          /**
           * @engineInternal Since v3.7.2 this is an engine private function.
           */
        }, {
          key: "_animationIndex",
          get: function get() {
            return this._animationIndexValue;
          },
          set: function set(value) {
            this._animationIndexValue = value;
            if (this._animationIndex === 0) {
              this.animationName = '';
              return;
            }
            var animsEnum;
            if (this.dragonAsset) {
              animsEnum = this.dragonAsset.getAnimsEnum(this.armatureName);
            }
            if (!animsEnum) {
              return;
            }
            var animName = animsEnum[this._animationIndex];
            if (animName !== undefined) {
              this.playAnimation(animName, this.playTimes);
            } else {
              errorID(7402, this.name);
            }
          }

          /**
           * @engineInternal Since v3.7.2 this is an engine private function.
           */
        }, {
          key: "_defaultCacheMode",
          get: function get() {
            return this._defaultCacheModeValue;
          },
          set: function set(value) {
            this._defaultCacheModeValue = value;
            if (this._defaultCacheMode !== AnimationCacheMode.REALTIME) {
              if (this._armature && !ArmatureCache.canCache(this._armature)) {
                this._defaultCacheMode = AnimationCacheMode.REALTIME;
                console.warn('Animation cache mode doesn\'t support skeletal nesting');
                return;
              }
            }
            this.setAnimationCacheMode(this._defaultCacheMode);
          }
          /**
           * @en The time scale of this armature.
           * @zh 当前骨骼中所有动画的时间缩放率。
           * @property {Number} timeScale
           * @default 1
           */
        }, {
          key: "timeScale",
          get: function get() {
            return this._timeScale;
          },
          set: function set(value) {
            this._timeScale = value;
            if (this._armature && !this.isAnimationCached()) {
              this._armature.animation.timeScale = this.timeScale;
            }
          }
        }, {
          key: "debugBones",
          get:
          /**
           * @en Indicates whether open debug bones.
           * @zh 是否显示 bone 的 debug 信息。
           * @property {Boolean} debugBones
           * @default false
           */
          function get() {
            return this._debugBones;
          },
          set: function set(value) {
            this._debugBones = value;
            this._updateDebugDraw();
          }

          /**
           * @en Enabled batch model. If rendering a large number of identical textures and simple
           * skeleton animations, enabling batching can reduce the number of drawcalls and improve
           * rendering efficiency, otherwise it is not necessary to enable it.
           * @zh 开启合批。如果渲染大量相同纹理，且结构简单的龙骨动画，开启合批可以降低 drawcall 数量，
           * 提升渲染效率，否则不需要开启。
          */
        }, {
          key: "enableBatch",
          get: function get() {
            return this._enableBatch;
          },
          set: function set(value) {
            if (value !== this._enableBatch) {
              this._enableBatch = value;
              this._updateBatch();
            }
          }

          /**
           * @en
           * The bone sockets this animation component maintains.<br>
           * Sockets have to be registered here before attaching custom nodes to animated bones.
           * @zh
           * 当前动画组件维护的挂点数组。要挂载自定义节点到受动画驱动的骨骼上，必须先在此注册挂点。
           */
        }, {
          key: "sockets",
          get: function get() {
            return this._sockets;
          },
          set: function set(val) {
            this._verifySockets(val);
            this._sockets = val;
            this._updateSocketBindings();
            // this.attachUtil._syncAttachedNode();
            if (val.length > 0 && this._frameCache) {
              this._frameCache.enableCacheAttachedInfo();
            }
          }
          /**
           * @en Gets the socket nodes. Socket nodes are registered synchronous motion
           * transformation with bones.
           * @zh 获取 socket nodes，socket nodes 被注册到组件上，可以随骨骼做同步运动变换。
           */
        }, {
          key: "socketNodes",
          get: function get() {
            return this._socketNodes;
          }
        }, {
          key: "drawList",
          get:
          /**
           * @en Draw call list.
           * @zh Draw call 列表。
           */
          function get() {
            return this._drawList;
          }
        }, {
          key: "customMaterial",
          get: function get() {
            return this._customMaterial;
          },
          set: function set(val) {
            this._customMaterial = val;
            this.updateMaterial();
            this.markForUpdateRenderData();
          }
        }]);
        return ArmatureDisplay;
      }(UIRenderer), _class6.AnimationCacheMode = AnimationCacheMode, _class6), (_applyDecoratedDescriptor(_class5.prototype, "dragonAsset", [editable, _dec6, _dec7], Object.getOwnPropertyDescriptor(_class5.prototype, "dragonAsset"), _class5.prototype), _applyDecoratedDescriptor(_class5.prototype, "dragonAtlasAsset", [editable, _dec8, _dec9], Object.getOwnPropertyDescriptor(_class5.prototype, "dragonAtlasAsset"), _class5.prototype), _applyDecoratedDescriptor(_class5.prototype, "armatureName", [_dec10], Object.getOwnPropertyDescriptor(_class5.prototype, "armatureName"), _class5.prototype), _applyDecoratedDescriptor(_class5.prototype, "animationName", [_dec11], Object.getOwnPropertyDescriptor(_class5.prototype, "animationName"), _class5.prototype), _applyDecoratedDescriptor(_class5.prototype, "_defaultArmatureIndex", [_dec12, editable, _dec13, _dec14], Object.getOwnPropertyDescriptor(_class5.prototype, "_defaultArmatureIndex"), _class5.prototype), _applyDecoratedDescriptor(_class5.prototype, "_animationIndex", [editable, _dec15, _dec16, _dec17], Object.getOwnPropertyDescriptor(_class5.prototype, "_animationIndex"), _class5.prototype), _applyDecoratedDescriptor(_class5.prototype, "_defaultCacheMode", [editable, _dec18, _dec19], Object.getOwnPropertyDescriptor(_class5.prototype, "_defaultCacheMode"), _class5.prototype), _applyDecoratedDescriptor(_class5.prototype, "timeScale", [editable, _dec20, serializable], Object.getOwnPropertyDescriptor(_class5.prototype, "timeScale"), _class5.prototype), _initializer3 = _applyDecoratedInitializer(_class5.prototype, "playTimes", [_dec21, editable, serializable], function () {
        return -1;
      }), _initializer4 = _applyDecoratedInitializer(_class5.prototype, "premultipliedAlpha", [serializable, editable, _dec22], function () {
        return false;
      }), _applyDecoratedDescriptor(_class5.prototype, "debugBones", [_dec23, editable], Object.getOwnPropertyDescriptor(_class5.prototype, "debugBones"), _class5.prototype), _applyDecoratedDescriptor(_class5.prototype, "enableBatch", [_dec24, editable], Object.getOwnPropertyDescriptor(_class5.prototype, "enableBatch"), _class5.prototype), _applyDecoratedDescriptor(_class5.prototype, "sockets", [_dec25, _dec26], Object.getOwnPropertyDescriptor(_class5.prototype, "sockets"), _class5.prototype), _initializer5 = _applyDecoratedInitializer(_class5.prototype, "_defaultArmatureIndexValue", [serializable], function () {
        return DefaultArmaturesEnum["default"];
      }), _initializer6 = _applyDecoratedInitializer(_class5.prototype, "_dragonAsset", [serializable], function () {
        return null;
      }), _initializer7 = _applyDecoratedInitializer(_class5.prototype, "_dragonAtlasAsset", [serializable], function () {
        return null;
      }), _initializer8 = _applyDecoratedInitializer(_class5.prototype, "_armatureName", [serializable], function () {
        return '';
      }), _initializer9 = _applyDecoratedInitializer(_class5.prototype, "_animationName", [serializable], function () {
        return '';
      }), _initializer10 = _applyDecoratedInitializer(_class5.prototype, "_animationIndexValue", [serializable], function () {
        return 0;
      }), _initializer11 = _applyDecoratedInitializer(_class5.prototype, "_defaultCacheModeValue", [serializable], function () {
        return AnimationCacheMode.REALTIME;
      }), _initializer12 = _applyDecoratedInitializer(_class5.prototype, "_timeScale", [serializable], function () {
        return 1;
      }), _initializer13 = _applyDecoratedInitializer(_class5.prototype, "_playTimes", [serializable], function () {
        return -1;
      }), _initializer14 = _applyDecoratedInitializer(_class5.prototype, "_debugBones", [serializable], function () {
        return false;
      }), _initializer15 = _applyDecoratedInitializer(_class5.prototype, "_enableBatch", [serializable], function () {
        return false;
      }), _initializer16 = _applyDecoratedInitializer(_class5.prototype, "_sockets", [serializable], function () {
        return [];
      }), _applyDecoratedDescriptor(_class5.prototype, "customMaterial", [override, _dec27, _dec28, _dec29], Object.getOwnPropertyDescriptor(_class5.prototype, "customMaterial"), _class5.prototype)), _class5)) || _class4) || _class4) || _class4) || _class4));
      cclegacy.internal.ArmatureDisplay = ArmatureDisplay;
    }
  };
});