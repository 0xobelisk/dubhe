System.register("q-bundled:///fs/cocos/render-scene/scene/directional-light.js", ["../../core/index.js", "./ambient.js", "./light.js", "./shadows.js"], function (_export, _context) {
  "use strict";

  var Vec3, cclegacy, Ambient, Light, LightType, CSMLevel, CSMOptimizationMode, PCFType, Shadows, DirectionalLight, _forward, _v3;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                            
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
  _export("DirectionalLight", void 0);
  return {
    setters: [function (_coreIndexJs) {
      Vec3 = _coreIndexJs.Vec3;
      cclegacy = _coreIndexJs.cclegacy;
    }, function (_ambientJs) {
      Ambient = _ambientJs.Ambient;
    }, function (_lightJs) {
      Light = _lightJs.Light;
      LightType = _lightJs.LightType;
    }, function (_shadowsJs) {
      CSMLevel = _shadowsJs.CSMLevel;
      CSMOptimizationMode = _shadowsJs.CSMOptimizationMode;
      PCFType = _shadowsJs.PCFType;
      Shadows = _shadowsJs.Shadows;
    }],
    execute: function () {
      _forward = new Vec3(0, 0, -1);
      _v3 = new Vec3();
      /**
       * @en The directional light representation in the render scene, it acts as the main light source in a scene.
       * As main light, only one directional light can be created in a scene, it can generate realtime shadows with configuration.
       * @zh 渲染场景中的方向光抽象，这是场景中的主光源。作为主光源，每个场景只能有一个方向光，它也包含阴影配置，用来生成实时阴影。
       */
      _export("DirectionalLight", DirectionalLight = class DirectionalLight extends Light {
        /**
         * @en The direction vector of the light
         * @zh 光源的方向
         */
        set direction(dir) {
          Vec3.normalize(this._dir, dir);
        }
        get direction() {
          return this._dir;
        }

        /**
         * @en The illuminance of the light in Lux(lx)
         * @zh 光源的辐照度，单位是 Lux(lx)
         */
        get illuminance() {
          const isHDR = cclegacy.director.root.pipeline.pipelineSceneData.isHDR;
          if (isHDR) {
            return this._illuminanceHDR;
          } else {
            return this._illuminanceLDR;
          }
        }
        set illuminance(value) {
          const isHDR = cclegacy.director.root.pipeline.pipelineSceneData.isHDR;
          if (isHDR) {
            this.illuminanceHDR = value;
          } else {
            this.illuminanceLDR = value;
          }
        }

        /**
         * @en The illuminance of the light in HDR mode
         * @zh HDR 模式下光源的辐照度
         */
        get illuminanceHDR() {
          return this._illuminanceHDR;
        }
        set illuminanceHDR(value) {
          this._illuminanceHDR = value;
        }

        /**
         * @en The illuminance of the light in LDR mode
         * @zh LDR 模式下光源的辐照度
         */
        get illuminanceLDR() {
          return this._illuminanceLDR;
        }
        set illuminanceLDR(value) {
          this._illuminanceLDR = value;
        }

        /**
         * @en Whether activate shadow
         * @zh 是否启用阴影？
         */
        get shadowEnabled() {
          return this._shadowEnabled;
        }
        set shadowEnabled(val) {
          this._shadowEnabled = val;
          this.activate();
        }

        /**
         * @en get or set shadow pcf.
         * @zh 获取或者设置阴影pcf等级。
         */
        get shadowPcf() {
          return this._shadowPcf;
        }
        set shadowPcf(val) {
          this._shadowPcf = val;
          this.activate();
        }

        /**
         * @en get or set shadow map sampler offset
         * @zh 获取或者设置阴影纹理偏移值
         */
        get shadowBias() {
          return this._shadowBias;
        }
        set shadowBias(val) {
          this._shadowBias = val;
        }

        /**
         * @en get or set normal bias.
         * @zh 设置或者获取法线偏移。
         */
        get shadowNormalBias() {
          return this._shadowNormalBias;
        }
        set shadowNormalBias(val) {
          this._shadowNormalBias = val;
        }

        /**
         * @en Shadow color saturation
         * @zh 阴影颜色饱和度
         */
        get shadowSaturation() {
          return this._shadowSaturation;
        }
        set shadowSaturation(val) {
          this._shadowSaturation = val;
        }

        /**
         * @en get or set shadow camera far
         * @zh 获取或者设置潜在阴影产生的范围
         */
        get shadowDistance() {
          return this._shadowDistance;
        }
        set shadowDistance(val) {
          this._shadowDistance = Math.min(val, Shadows.MAX_FAR);
        }

        /**
         * @en get or set shadow camera far
         * @zh 获取或者设置潜在阴影产生的范围
         */
        get shadowInvisibleOcclusionRange() {
          return this._shadowInvisibleOcclusionRange;
        }
        set shadowInvisibleOcclusionRange(val) {
          this._shadowInvisibleOcclusionRange = Math.min(val, Shadows.MAX_FAR);
        }

        /**
         * @en get or set shadow CSM level
         * @zh 获取或者设置级联阴影层数
         */
        get csmLevel() {
          return this._csmLevel;
        }
        set csmLevel(val) {
          this._csmLevel = val;
          this.activate();
        }

        /**
         * @en is CSM need update
         * @zh 获取或者设置级联阴影是否需要更新
         */
        get csmNeedUpdate() {
          return this._csmNeedUpdate;
        }
        set csmNeedUpdate(val) {
          this._csmNeedUpdate = val;
        }

        /**
         * @en get or set shadow CSM level ratio
         * @zh 获取或者设置级联阴影层数系数
         */
        get csmLayerLambda() {
          return this._csmLayerLambda;
        }
        set csmLayerLambda(val) {
          this._csmLayerLambda = val;
        }

        /**
         * @en get or set shadow CSM performance optimization mode
         * @zh 获取或者设置级联阴影性能优化模式
         */
        get csmOptimizationMode() {
          return this._csmOptimizationMode;
        }
        set csmOptimizationMode(val) {
          this._csmOptimizationMode = val;
        }

        /**
         * @en get or set fixed area shadow
         * @zh 是否是固定区域阴影
         */
        get shadowFixedArea() {
          return this._shadowFixedArea;
        }
        set shadowFixedArea(val) {
          this._shadowFixedArea = val;
          this.activate();
        }

        /**
         * @en The near clip plane of the shadow camera
         * @zh 获取或者设置阴影相机近裁剪面
         */
        get shadowNear() {
          return this._shadowNear;
        }
        set shadowNear(val) {
          this._shadowNear = val;
        }

        /**
         * @en The far clip plane of the shadow camera
         * @zh 获取或者设置阴影相机远裁剪面
         */
        get shadowFar() {
          return this._shadowFar;
        }
        set shadowFar(val) {
          this._shadowFar = Math.min(val, Shadows.MAX_FAR);
        }

        /**
         * @en get or set shadow camera orthoSize
         * @zh 获取或者设置阴影相机正交大小
         */
        get shadowOrthoSize() {
          return this._shadowOrthoSize;
        }
        set shadowOrthoSize(val) {
          this._shadowOrthoSize = val;
        }

        /**
         * @en Enabled csm layers transition
         * @zh 是否启用级联阴影层级过渡？
         */
        get csmLayersTransition() {
          return this._csmLayersTransition;
        }
        set csmLayersTransition(val) {
          this._csmLayersTransition = val;
          this.activate();
        }

        /**
         * @en get or set csm layers transition range
         * @zh 获取或者设置级联阴影层级过渡范围？
         */
        get csmTransitionRange() {
          return this._csmTransitionRange;
        }
        set csmTransitionRange(val) {
          this._csmTransitionRange = val;
        }
        constructor() {
          super();
          this._dir = new Vec3(1.0, -1.0, -1.0);
          this._illuminanceHDR = Ambient.SUN_ILLUM;
          this._illuminanceLDR = 1.0;
          // Public properties of shadow
          this._shadowEnabled = false;
          // Shadow map properties
          this._shadowPcf = PCFType.HARD;
          this._shadowBias = 0.00001;
          this._shadowNormalBias = 0.0;
          this._shadowSaturation = 1.0;
          this._shadowDistance = 50;
          this._shadowInvisibleOcclusionRange = 200;
          this._csmLevel = CSMLevel.LEVEL_4;
          this._csmNeedUpdate = false;
          this._csmLayerLambda = 0.75;
          this._csmOptimizationMode = CSMOptimizationMode.DisableRotationFix;
          this._csmLayersTransition = false;
          this._csmTransitionRange = 0.05;
          // fixed area properties
          this._shadowFixedArea = false;
          this._shadowNear = 0.1;
          this._shadowFar = 10.0;
          this._shadowOrthoSize = 5;
          this._type = LightType.DIRECTIONAL;
        }
        initialize() {
          super.initialize();
          this.illuminance = Ambient.SUN_ILLUM;
          this.direction = new Vec3(1.0, -1.0, -1.0);
        }

        /**
         * @en Update the direction
         * @zh 更新方向
         */
        update() {
          if (this._node && this._node.hasChangedFlags) {
            this.direction = Vec3.transformQuat(_v3, _forward, this._node.worldRotation);
          }
        }

        /**
         * @engineInternal
         */
        activate() {
          const root = cclegacy.director.root;
          const pipeline = root.pipeline;
          if (this._shadowEnabled) {
            if (this._shadowFixedArea || !pipeline.pipelineSceneData.csmSupported) {
              pipeline.macros.CC_DIR_LIGHT_SHADOW_TYPE = 1;
            } else if (this.csmLevel > 1 && pipeline.pipelineSceneData.csmSupported) {
              pipeline.macros.CC_DIR_LIGHT_SHADOW_TYPE = 2;
              pipeline.macros.CC_CASCADED_LAYERS_TRANSITION = this._csmLayersTransition;
            } else {
              pipeline.macros.CC_DIR_LIGHT_SHADOW_TYPE = 1;
            }
            pipeline.macros.CC_DIR_SHADOW_PCF_TYPE = this._shadowPcf;
          } else {
            pipeline.macros.CC_DIR_LIGHT_SHADOW_TYPE = 0;
          }
          root.onGlobalPipelineStateChanged();
        }
      });
    }
  };
});