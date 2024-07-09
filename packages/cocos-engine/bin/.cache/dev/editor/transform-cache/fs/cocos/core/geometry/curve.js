System.register("q-bundled:///fs/cocos/core/geometry/curve.js", ["../data/class.js", "../math/utils.js", "../curves/index.js"], function (_export, _context) {
  "use strict";

  var CCClass, clamp, pingPong, repeat, ExtrapolationMode, RealCurve, RealInterpolationMode, Keyframe, OptimizedKey, AnimationCurve, LOOK_FORWARD, WrapModeMask;
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
  /**
   * @engineInternal
   */
  function evalOptCurve(t, coefs) {
    return t * (t * (t * coefs[0] + coefs[1]) + coefs[2]) + coefs[3];
  }

  /**
   * @en
   * Describe a curve in which three times Hermite interpolation is used for each adjacent key frame.
   * @zh
   * 描述一条曲线，其中每个相邻关键帧采用三次hermite插值计算。
   */

  function fromLegacyWrapMode(legacyWrapMode) {
    switch (legacyWrapMode) {
      default:
      case WrapModeMask.Default:
      case WrapModeMask.Normal:
      case WrapModeMask.Clamp:
        return ExtrapolationMode.CLAMP;
      case WrapModeMask.PingPong:
        return ExtrapolationMode.PING_PONG;
      case WrapModeMask.Loop:
        return ExtrapolationMode.LOOP;
    }
  }
  function toLegacyWrapMode(extrapolationMode) {
    switch (extrapolationMode) {
      default:
      case ExtrapolationMode.LINEAR:
      case ExtrapolationMode.CLAMP:
        return WrapModeMask.Clamp;
      case ExtrapolationMode.PING_PONG:
        return WrapModeMask.PingPong;
      case ExtrapolationMode.LOOP:
        return WrapModeMask.Loop;
    }
  }

  /**
   * Same as but more effective than `new LegacyCurve()._internalCurve`.
   * @engineInternal
   */
  function constructLegacyCurveAndConvert() {
    const curve = new RealCurve();
    curve.assignSorted([[0.0, {
      interpolationMode: RealInterpolationMode.CUBIC,
      value: 1.0
    }], [1.0, {
      interpolationMode: RealInterpolationMode.CUBIC,
      value: 1.0
    }]]);
    return curve;
  }
  _export({
    Keyframe: void 0,
    OptimizedKey: void 0,
    evalOptCurve: evalOptCurve,
    AnimationCurve: void 0,
    constructLegacyCurveAndConvert: constructLegacyCurveAndConvert,
    WrapModeMask: void 0
  });
  return {
    setters: [function (_dataClassJs) {
      CCClass = _dataClassJs.CCClass;
    }, function (_mathUtilsJs) {
      clamp = _mathUtilsJs.clamp;
      pingPong = _mathUtilsJs.pingPong;
      repeat = _mathUtilsJs.repeat;
    }, function (_curvesIndexJs) {
      ExtrapolationMode = _curvesIndexJs.ExtrapolationMode;
      RealCurve = _curvesIndexJs.RealCurve;
      RealInterpolationMode = _curvesIndexJs.RealInterpolationMode;
    }],
    execute: function () {
      LOOK_FORWARD = 3;
      /**
       * @en
       * A key frame in the curve.
       * @zh
       * 曲线中的一个关键帧。
       */
      _export("Keyframe", Keyframe = class Keyframe {
        constructor() {
          /**
           * @en Current frame time.
           * @zh 当前帧时间。
           */
          this.time = 0;
          /**
           * @en Current frame value.
           * @zh 当前帧的值。
           */
          this.value = 0;
          /**
           * @en In tangent value.
           * @zh 左切线。
           */
          this.inTangent = 0;
          /**
           * @en Out tangent value.
           * @zh 右切线。
           */
          this.outTangent = 0;
        }
      });
      CCClass.fastDefine('cc.Keyframe', Keyframe, {
        time: 0,
        value: 0,
        inTangent: 0,
        outTangent: 0
      });

      /**
       * @engineInternal
       */
      _export("OptimizedKey", OptimizedKey = class OptimizedKey {
        constructor() {
          this.index = void 0;
          this.time = void 0;
          this.endTime = void 0;
          this.coefficient = void 0;
          this.index = -1;
          this.time = 0;
          this.endTime = 0;
          this.coefficient = new Float32Array(4);
        }
        evaluate(T) {
          const t = T - this.time;
          return evalOptCurve(t, this.coefficient);
        }
      });
      _export("AnimationCurve", AnimationCurve = class AnimationCurve {
        /**
         * For internal usage only.
         * @internal
         */
        get _internalCurve() {
          return this._curve;
        }

        /**
         * @en
         * The key frame of the curve.
         * @zh
         * 曲线的关键帧。
         */
        get keyFrames() {
          return Array.from(this._curve.keyframes()).map(([time, value]) => {
            const legacyKeyframe = new Keyframe();
            legacyKeyframe.time = time;
            legacyKeyframe.value = value.value;
            legacyKeyframe.inTangent = value.leftTangent;
            legacyKeyframe.outTangent = value.rightTangent;
            return legacyKeyframe;
          });
        }
        set keyFrames(value) {
          this._curve.assignSorted(value.map(legacyCurve => [legacyCurve.time, {
            interpolationMode: RealInterpolationMode.CUBIC,
            value: legacyCurve.value,
            leftTangent: legacyCurve.inTangent,
            rightTangent: legacyCurve.outTangent
          }]));
        }

        /**
         * @en
         * Loop mode [[AnimationClip.WrapMode]] when the sampling time exceeds the left end.
         * @zh
         * 当采样时间超出左端时采用的循环模式[[AnimationClip.WrapMode]]。
         */
        get preWrapMode() {
          return toLegacyWrapMode(this._curve.preExtrapolation);
        }
        set preWrapMode(value) {
          this._curve.preExtrapolation = fromLegacyWrapMode(value);
        }

        /**
         * @en
         * Cycle mode [[AnimationClip.WrapMode]] when the sampling time exceeds the right end.
         * @zh
         * 当采样时间超出右端时采用的循环模式[[AnimationClip.WrapMode]]。
         */
        get postWrapMode() {
          return toLegacyWrapMode(this._curve.postExtrapolation);
        }
        set postWrapMode(value) {
          this._curve.postExtrapolation = fromLegacyWrapMode(value);
        }
        /**
         * @en Construct a curve with key frames
         * @zh 通过关键帧构造一条曲线。
         * @param keyFrames @zh 关键帧 @en Key frames
         */
        constructor(keyFrames = null) {
          this._curve = void 0;
          this.cachedKey = void 0;
          if (keyFrames instanceof RealCurve) {
            this._curve = keyFrames;
          } else {
            const curve = new RealCurve();
            this._curve = curve;
            curve.preExtrapolation = ExtrapolationMode.LOOP;
            curve.postExtrapolation = ExtrapolationMode.CLAMP;
            if (!keyFrames) {
              curve.assignSorted([[0.0, {
                interpolationMode: RealInterpolationMode.CUBIC,
                value: 1.0
              }], [1.0, {
                interpolationMode: RealInterpolationMode.CUBIC,
                value: 1.0
              }]]);
            } else {
              curve.assignSorted(keyFrames.map(legacyKeyframe => [legacyKeyframe.time, {
                interpolationMode: RealInterpolationMode.CUBIC,
                value: legacyKeyframe.value,
                leftTangent: legacyKeyframe.inTangent,
                rightTangent: legacyKeyframe.outTangent
              }]));
            }
          }
          this.cachedKey = new OptimizedKey();
        }

        /**
         * @en
         * Add a keyframe.
         * @zh
         * 添加一个关键帧。
         * @param keyFrame @en A keyframe. @zh 关键帧。
         */
        addKey(keyFrame) {
          if (!keyFrame) {
            this._curve.clear();
          } else {
            this._curve.addKeyFrame(keyFrame.time, {
              interpolationMode: RealInterpolationMode.CUBIC,
              value: keyFrame.value,
              leftTangent: keyFrame.inTangent,
              rightTangent: keyFrame.outTangent
            });
          }
        }

        /**
         * @ignore
         * @param time
         */
        evaluate_slow(time) {
          return this._curve.evaluate(time);
        }

        /**
         * @en
         * Calculate the curve interpolation at a given point in time.
         * @zh
         * 计算给定时间点的曲线插值。
         * @param time @en The time. @zh 时间。
         */
        evaluate(time) {
          const {
            cachedKey,
            _curve: curve
          } = this;
          const nKeyframes = curve.keyFramesCount;
          const lastKeyframeIndex = nKeyframes - 1;
          let wrappedTime = time;
          const extrapolationMode = time < 0 ? curve.preExtrapolation : curve.postExtrapolation;
          const startTime = curve.getKeyframeTime(0);
          const endTime = curve.getKeyframeTime(lastKeyframeIndex);
          switch (extrapolationMode) {
            case ExtrapolationMode.LOOP:
              wrappedTime = repeat(time - startTime, endTime - startTime) + startTime;
              break;
            case ExtrapolationMode.PING_PONG:
              wrappedTime = pingPong(time - startTime, endTime - startTime) + startTime;
              break;
            case ExtrapolationMode.CLAMP:
            default:
              wrappedTime = clamp(time, startTime, endTime);
              break;
          }
          if (wrappedTime >= cachedKey.time && wrappedTime < cachedKey.endTime) {
            return cachedKey.evaluate(wrappedTime);
          }
          const leftIndex = this.findIndex(cachedKey, wrappedTime);
          const rightIndex = Math.min(leftIndex + 1, lastKeyframeIndex);
          this.calcOptimizedKey(cachedKey, leftIndex, rightIndex);
          return cachedKey.evaluate(wrappedTime);
        }

        /**
         * @ignore
         * @param optKey
         * @param leftIndex
         * @param rightIndex
         */
        calcOptimizedKey(optKey, leftIndex, rightIndex) {
          const lhsTime = this._curve.getKeyframeTime(leftIndex);
          const rhsTime = this._curve.getKeyframeTime(rightIndex);
          const {
            value: lhsValue,
            leftTangent: lhsOutTangent
          } = this._curve.getKeyframeValue(leftIndex);
          const {
            value: rhsValue,
            rightTangent: rhsInTangent
          } = this._curve.getKeyframeValue(rightIndex);
          optKey.index = leftIndex;
          optKey.time = lhsTime;
          optKey.endTime = rhsTime;
          const dx = rhsTime - lhsTime;
          const dy = rhsValue - lhsValue;
          const length = 1 / (dx * dx);
          const d1 = lhsOutTangent * dx;
          const d2 = rhsInTangent * dx;
          optKey.coefficient[0] = (d1 + d2 - dy - dy) * length / dx;
          optKey.coefficient[1] = (dy + dy + dy - d1 - d1 - d2) * length;
          optKey.coefficient[2] = lhsOutTangent;
          optKey.coefficient[3] = lhsValue;
        }

        /**
         * @ignore
         * @param optKey
         * @param t
         */
        findIndex(optKey, t) {
          const {
            _curve: curve
          } = this;
          const nKeyframes = curve.keyFramesCount;
          const cachedIndex = optKey.index;
          if (cachedIndex !== -1) {
            const cachedTime = curve.getKeyframeTime(cachedIndex);
            if (t > cachedTime) {
              for (let i = 0; i < LOOK_FORWARD; i++) {
                const currIndex = cachedIndex + i;
                if (currIndex + 1 < nKeyframes && curve.getKeyframeTime(currIndex + 1) > t) {
                  return currIndex;
                }
              }
            } else {
              for (let i = 0; i < LOOK_FORWARD; i++) {
                const currIndex = cachedIndex - i;
                if (currIndex >= 0 && curve.getKeyframeTime(currIndex - 1) <= t) {
                  return currIndex - 1;
                }
              }
            }
          }
          let left = 0;
          let right = nKeyframes;
          let mid;
          while (right - left > 1) {
            mid = Math.floor((left + right) / 2);
            if (curve.getKeyframeTime(mid) >= t) {
              right = mid;
            } else {
              left = mid;
            }
          }
          return left;
        }
      });
      AnimationCurve.defaultKF = [{
        time: 0,
        value: 1,
        inTangent: 0,
        outTangent: 0
      }, {
        time: 1,
        value: 1,
        inTangent: 0,
        outTangent: 0
      }];
      CCClass.fastDefine('cc.AnimationCurve', AnimationCurve, {
        _curve: null
      });

      /**
       * @engineInternal
       */
      (function (WrapModeMask) {
        WrapModeMask[WrapModeMask["Default"] = 0] = "Default";
        WrapModeMask[WrapModeMask["Normal"] = 1] = "Normal";
        WrapModeMask[WrapModeMask["Loop"] = 2] = "Loop";
        WrapModeMask[WrapModeMask["ShouldWrap"] = 4] = "ShouldWrap";
        WrapModeMask[WrapModeMask["Clamp"] = 8] = "Clamp";
        WrapModeMask[WrapModeMask["PingPong"] = 22] = "PingPong";
        WrapModeMask[WrapModeMask["Reverse"] = 36] = "Reverse";
      })(WrapModeMask || _export("WrapModeMask", WrapModeMask = {}));
    }
  };
});