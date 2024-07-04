System.register("q-bundled:///fs/cocos/particle/animator/curve-range.js", ["../../core/data/decorators/index.js", "../../../../virtual/internal%253Aconstants.js", "../../core/index.js", "../../asset/assets/asset-enum.js", "../../asset/assets/index.js", "../../core/internal-index.js"], function (_export, _context) {
  "use strict";

  var ccclass, EDITOR, lerp, RealCurve, CCClass, geometry, Enum, approx, EPSILON, PixelFormat, Filter, WrapMode, Texture2D, ImageAsset, setPropertyEnumType, _dec, _class, _class2, setClassAttr, SerializableTable, Mode, CurveRange;
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
  function evaluateCurve(cr, time, index) {
    switch (cr.mode) {
      case Mode.Constant:
        return cr.constant;
      case Mode.Curve:
        return cr.spline.evaluate(time) * cr.multiplier;
      case Mode.TwoCurves:
        return index === 0 ? cr.splineMin.evaluate(time) * cr.multiplier : cr.splineMax.evaluate(time) * cr.multiplier;
      case Mode.TwoConstants:
        return index === 0 ? cr.constantMin : cr.constantMax;
      default:
        return 0;
    }
  }
  function evaluateHeight(cr) {
    switch (cr.mode) {
      case Mode.TwoConstants:
        return 2;
      case Mode.TwoCurves:
        return 2;
      default:
        return 1;
    }
  }
  function packTexture(data, width, height) {
    const image = new ImageAsset({
      width,
      height,
      _data: data,
      _compressed: false,
      format: PixelFormat.RGBA32F
    });
    const texture = new Texture2D();
    texture.setFilters(Filter.NEAREST, Filter.NEAREST);
    texture.setMipFilter(Filter.NONE);
    texture.setWrapMode(WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE);
    texture.image = image;
    return texture;
  }
  function updateTexture(tex, data, width, height) {
    if (tex === null || width !== tex.width || height !== tex.height) {
      if (tex) {
        tex.destroy();
      }
      tex = packTexture(data, width, height);
    } else {
      tex.uploadData(data);
    }
    return tex;
  }
  // eslint-disable-next-line max-len

  // eslint-disable-next-line max-len

  // eslint-disable-next-line max-len
  function packCurveRangeZ(tex, data, samples, cr, discrete) {
    const height = evaluateHeight(cr);
    const len = samples * height * 4;
    if (data === null || data.length !== len) {
      data = new Float32Array(samples * height * 4);
    }
    const interval = 1.0 / (samples - 1);
    let sum = 0;
    let average = 0;
    let offset = 0;
    for (let h = 0; h < height; h++) {
      sum = 0;
      for (let j = 0; j < samples; j++) {
        const value = evaluateCurve(cr, interval * j, h);
        if (discrete) {
          average = value;
        } else {
          sum += value;
          average = sum / (j + 1);
        }
        data[offset + 2] = value;
        offset += 4;
      }
    }
    return {
      texture: updateTexture(tex, data, samples, height),
      texdata: data
    };
  }
  function packCurveRangeN(tex, data, samples, cr, discrete) {
    const height = evaluateHeight(cr);
    const len = samples * height * 4;
    if (data === null || data.length !== len) {
      data = new Float32Array(samples * height * 4);
    }
    const interval = 1.0 / (samples - 1);
    let sum = 0;
    let average = 0;
    let offset = 0;
    for (let h = 0; h < height; h++) {
      sum = 0;
      for (let j = 0; j < samples; j++) {
        const value = evaluateCurve(cr, interval * j, h);
        if (discrete) {
          average = value;
        } else {
          sum += value;
          average = sum / (j + 1);
        }
        data[offset] = average;
        data[offset + 1] = average;
        data[offset + 2] = average;
        offset += 4;
      }
    }
    return {
      texture: updateTexture(tex, data, samples, height),
      texdata: data
    };
  }
  function packCurveRangeXY(tex, data, samples, x, y, discrete) {
    const height = Math.max(evaluateHeight(x), evaluateHeight(y));
    const len = samples * height * 4;
    if (data === null || data.length !== len) {
      data = new Float32Array(samples * height * 4);
    }
    const curves = [x, y];
    const interval = 1.0 / (samples - 1);
    for (let h = 0; h < height; h++) {
      for (let i = 0; i < 2; i++) {
        const cr = curves[i];
        let sum = 0;
        let average = 0;
        for (let j = 0; j < samples; j++) {
          const value = evaluateCurve(cr, interval * j, h);
          if (discrete) {
            average = value;
          } else {
            sum += value;
            average = sum / (j + 1);
          }
          data[(h * samples + j) * 4 + i] = average;
        }
      }
    }
    return {
      texture: updateTexture(tex, data, samples, height),
      texdata: data
    };
  }
  function packCurveRangeXYZ(tex, data, samples, x, y, z, discrete) {
    const height = Math.max(evaluateHeight(x), evaluateHeight(y), evaluateHeight(z));
    const len = samples * height * 4;
    if (data === null || data.length !== len) {
      data = new Float32Array(samples * height * 4);
    }
    const curves = [x, y, z];
    const interval = 1.0 / (samples - 1);
    for (let h = 0; h < height; h++) {
      for (let i = 0; i < 3; i++) {
        const cr = curves[i];
        let sum = 0;
        let average = 0;
        for (let j = 0; j < samples; j++) {
          const value = evaluateCurve(cr, interval * j, h);
          if (discrete) {
            average = value;
          } else {
            sum += value;
            average = sum / (j + 1);
          }
          data[(h * samples + j) * 4 + i] = average;
        }
      }
    }
    return {
      texture: updateTexture(tex, data, samples, height),
      texdata: data
    };
  }
  function packCurveRangeXYZW(tex, data, samples, x, y, z, w, discrete) {
    const height = Math.max(evaluateHeight(x), evaluateHeight(y), evaluateHeight(z), evaluateHeight(w));
    const len = samples * height * 4;
    if (data === null || data.length !== len) {
      data = new Float32Array(samples * height * 4);
    }
    const curves = [x, y, z, w];
    const interval = 1.0 / (samples - 1);
    for (let h = 0; h < height; h++) {
      for (let i = 0; i < 4; i++) {
        const cr = curves[i];
        let sum = 0;
        let average = 0;
        for (let j = 0; j < samples; j++) {
          const value = evaluateCurve(cr, interval * j, h);
          if (discrete) {
            average = value;
          } else {
            sum += value;
            average = sum / (j + 1);
          }
          data[(h * samples + j) * 4 + i] = average;
        }
      }
    }
    return {
      texture: updateTexture(tex, data, samples, height),
      texdata: data
    };
  }
  _export({
    packCurveRangeZ: packCurveRangeZ,
    packCurveRangeN: packCurveRangeN,
    packCurveRangeXY: packCurveRangeXY,
    packCurveRangeXYZ: packCurveRangeXYZ,
    packCurveRangeXYZW: packCurveRangeXYZW
  });
  return {
    setters: [function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
    }, function (_virtualInternal253AconstantsJs) {
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
    }, function (_coreIndexJs) {
      lerp = _coreIndexJs.lerp;
      RealCurve = _coreIndexJs.RealCurve;
      CCClass = _coreIndexJs.CCClass;
      geometry = _coreIndexJs.geometry;
      Enum = _coreIndexJs.Enum;
      approx = _coreIndexJs.approx;
      EPSILON = _coreIndexJs.EPSILON;
    }, function (_assetAssetsAssetEnumJs) {
      PixelFormat = _assetAssetsAssetEnumJs.PixelFormat;
      Filter = _assetAssetsAssetEnumJs.Filter;
      WrapMode = _assetAssetsAssetEnumJs.WrapMode;
    }, function (_assetAssetsIndexJs) {
      Texture2D = _assetAssetsIndexJs.Texture2D;
      ImageAsset = _assetAssetsIndexJs.ImageAsset;
    }, function (_coreInternalIndexJs) {
      setPropertyEnumType = _coreInternalIndexJs.setPropertyEnumType;
    }],
    execute: function () {
      setClassAttr = CCClass.Attr.setClassAttr;
      SerializableTable = [['mode', 'constant', 'multiplier'], ['mode', 'spline', 'multiplier'], ['mode', 'splineMin', 'splineMax', 'multiplier'], ['mode', 'constantMin', 'constantMax', 'multiplier']];
      /**
       * @en
       * This curve has 4 modes:
       * Constant means this curve only have the constant value all the time.
       * Tow Constants means this curve value will generated by the interpolation of these 2 constant values.
       * Curve means the curve value will generated by one RealCurve.
       * A RealCurve has many key frames, so the value will be generated by interpolation of key frames.
       * Two Curves has two RealCurve, so the value is generated by the interpolation of these 2 curves.
       * @zh
       * 曲线控件包含四种模式：
       * 常值，表示曲线的值从头到尾都是一个常量。
       * 双常值，表示曲线的值是从两个常量进行插值。
       * 曲线，包含一个 RealCurve 曲线值，从 RealCurve 取得关键帧进行插值得到。
       * 双曲线，包含两个 RealCurve 曲线，首先对每个曲线进行关键帧插值计算，然后再对算出的两个曲线值进行插值得到最终的数值。
       */
      _export("Mode", Mode = Enum({
        Constant: 0,
        Curve: 1,
        TwoCurves: 2,
        TwoConstants: 3
      })); // TODO: can not remove ccclass for now, we need ccclass specified deserialization to handle deserialization of RealCurve
      /**
       * @en
       * CurveRange is a data structure which contains some constants or curves.
       * Calculate the value by its mode and particle system will use it to change particle attribute associated with it.
       * Refer [[CurveRange.Mode]] to see the detail of calculation mode.
       * @zh
       * CurveRange 是一类数据结构，其包含了多个常数值或曲线值，计算时其将根据计算模式计算最终值，粒子系统使用此数据结构对所有的粒子的属性进行修改。
       * 详细的计算模式请参考 [[CurveRange.Mode]] 的解释。
       */
      _export("default", CurveRange = (_dec = ccclass('cc.CurveRange'), _dec(_class = (_class2 = class CurveRange {
        /**
         * @en Spline will create a RealCurve when mode is curve. The mode of curve range, see [[Mode]].
         * A RealCurve will be created for each spline(SplineMin & SplineMax) when mode is TwoCurves.
         * @zh 当mode为Curve时，spline创建1个RealCurve，当mode为TwoCurves时，splineMax创建1个RealCurve,splineMin创建一个RealCurve。
         */
        set mode(mode) {
          this._mode = mode;
          switch (mode) {
            case Mode.Constant:
              break;
            case Mode.TwoConstants:
              break;
            case Mode.Curve:
              if (!this.spline) this.spline = geometry.constructLegacyCurveAndConvert();
              break;
            case Mode.TwoCurves:
              if (!this.splineMax) this.splineMax = geometry.constructLegacyCurveAndConvert();
              if (!this.splineMin) this.splineMin = geometry.constructLegacyCurveAndConvert();
              break;
            default:
              break;
          }
        }
        get mode() {
          return this._mode;
        }
        /**
         * @en The spline used when mode is Mode.Curve.
         * @zh 当 mode 为Curve时，使用的曲线。
         */

        /**
         * @en The min spline when mode is Mode.TwoCurves.
         * @zh 当 mode 为TwoCurves时，使用的曲线下限。
         */

        /**
         * @en Max spline when mode is TwoCurves.
         * @zh 当 mode 为TwoCurves时，使用的曲线上限。
         */

        /**
         * @en Gets/Sets the curve when use curve mode.
         * @zh 当 mode 为 Curve 时，使用的曲线。
         * @deprecated Since V3.3. Use `spline` instead.
         */
        get curve() {
          var _this$_curve;
          return (_this$_curve = this._curve) !== null && _this$_curve !== void 0 ? _this$_curve : this._curve = new geometry.AnimationCurve(this.spline);
        }
        set curve(value) {
          this._curve = value;
          this.spline = value._internalCurve;
        }

        /**
         * @en Get/Set min curve when use TwoCurves mode.
         * @zh 当 mode 为 TwoCurves 时，使用的曲线下限。
         * @deprecated Since V3.3. Use `splineMin` instead.
         */
        get curveMin() {
          var _this$_curveMin;
          return (_this$_curveMin = this._curveMin) !== null && _this$_curveMin !== void 0 ? _this$_curveMin : this._curveMin = new geometry.AnimationCurve(this.splineMin);
        }
        set curveMin(value) {
          this._curveMin = value;
          this.splineMin = value._internalCurve;
        }

        /**
         * @en Gets/Sets max curve when use TwoCurves mode.
         * @zh 当 mode 为 TwoCurves 时，使用的曲线上限。
         * @deprecated Since V3.3. Use `splineMax` instead.
         */
        get curveMax() {
          var _this$_curveMax;
          return (_this$_curveMax = this._curveMax) !== null && _this$_curveMax !== void 0 ? _this$_curveMax : this._curveMax = new geometry.AnimationCurve(this.splineMax);
        }
        set curveMax(value) {
          this._curveMax = value;
          this.splineMax = value._internalCurve;
        }

        /**
         * @en Constant value when use constant mode.
         * @zh 当 mode 为 Constant 时，曲线的值。
         */

        constructor() {
          this.constant = 0;
          /**
           * @en Constant min value when use TwoConstants mode.
           * @zh 当 mode 为 TwoConstants 时，曲线的下限。
           */
          this.constantMin = 0;
          /**
           * @en Constant max value when use TwoConstants mode.
           * @zh 当 mode 为 TwoConstants 时，曲线的上限。
           */
          this.constantMax = 0;
          /**
           * @en Mulitplier used to evaluate spline.
           * @zh 应用于曲线插值的系数。
           */
          this.multiplier = 1;
          /**
           * @en Curve mode to use.
           * @zh 曲线类型 [[Mode]]。
           */
          this._mode = Mode.Constant;
          /* Only create RealCurves in Editor, in order to show the Splines in Editor,
          in RunTime the RealCurves will only be created when it is in Curve mode*/
          if (EDITOR) {
            this.spline = geometry.constructLegacyCurveAndConvert();
            this.splineMin = geometry.constructLegacyCurveAndConvert();
            this.splineMax = geometry.constructLegacyCurveAndConvert();
          }
        }

        /**
         * @en Calculate curve value.
         * @zh 计算曲线数值。
         * @param time @en Normalized time to interpolate. @zh 用于插值的归一化时间。
         * @param rndRatio @en Interpolation ratio when mode is TwoCurves or TwoConstants.
         *                     Particle attribute will pass in a random number to get a random result.
         *                 @zh 当模式为双曲线或双常数时，使用的插值比例，通常粒子系统会传入一个随机数以获得一个随机结果。
         * @returns @en Curve value. @zh 曲线的值。
         */
        evaluate(time, rndRatio) {
          switch (this._mode) {
            default:
            case Mode.Constant:
              return this.constant;
            case Mode.Curve:
              return this.spline.evaluate(time) * this.multiplier;
            case Mode.TwoCurves:
              return lerp(this.splineMin.evaluate(time), this.splineMax.evaluate(time), rndRatio) * this.multiplier;
            case Mode.TwoConstants:
              return lerp(this.constantMin, this.constantMax, rndRatio);
          }
        }

        /**
         * @en Gets the max value this curve can reach.
         * @zh 获得曲线能达到的最大值。
         * @returns @en Max value of this curve @zh 曲线能达到的最大值
         */
        getMax() {
          switch (this._mode) {
            default:
            case Mode.Constant:
              return this.constant;
            case Mode.Curve:
              return this.multiplier;
            case Mode.TwoConstants:
              return this.constantMax;
            case Mode.TwoCurves:
              return this.multiplier;
          }
        }
        isZero() {
          switch (this._mode) {
            default:
            case Mode.Constant:
              return approx(this.constant, 0.0, EPSILON);
            case Mode.Curve:
              return approx(this.multiplier, 0.0, EPSILON);
            case Mode.TwoConstants:
              return approx(Math.max(Math.abs(this.constantMax), Math.abs(this.constantMin)), 0.0, EPSILON);
            case Mode.TwoCurves:
              return approx(this.multiplier, 0.0, EPSILON);
          }
        }

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */
        _onBeforeSerialize(props) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return SerializableTable[this._mode];
        }
      }, _class2.Mode = Mode, _class2)) || _class));
      CCClass.fastDefine('cc.CurveRange', CurveRange, {
        multiplier: 1,
        constantMax: 0,
        constantMin: 0,
        constant: 0,
        mode: Mode.Constant,
        splineMax: Object.freeze(geometry.constructLegacyCurveAndConvert()),
        splineMin: Object.freeze(geometry.constructLegacyCurveAndConvert()),
        spline: Object.freeze(geometry.constructLegacyCurveAndConvert())
      });
      setClassAttr(CurveRange, 'multiplier', 'visible', true);
      setClassAttr(CurveRange, 'constantMax', 'visible', true);
      setClassAttr(CurveRange, 'constantMin', 'visible', true);
      setClassAttr(CurveRange, 'constant', 'visible', true);
      setPropertyEnumType(CurveRange, 'mode', Mode);
      setClassAttr(CurveRange, 'mode', 'visible', true);
      setClassAttr(CurveRange, 'splineMax', 'type', 'Object');
      setClassAttr(CurveRange, 'splineMax', 'ctor', RealCurve);
      setClassAttr(CurveRange, 'splineMax', 'visible', true);
      setClassAttr(CurveRange, 'splineMin', 'type', 'Object');
      setClassAttr(CurveRange, 'splineMin', 'ctor', RealCurve);
      setClassAttr(CurveRange, 'splineMin', 'visible', true);
      setClassAttr(CurveRange, 'spline', 'type', 'Object');
      setClassAttr(CurveRange, 'spline', 'ctor', RealCurve);
      setClassAttr(CurveRange, 'spline', 'visible', true);
    }
  };
});