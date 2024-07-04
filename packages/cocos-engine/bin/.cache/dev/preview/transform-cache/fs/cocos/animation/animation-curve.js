System.register("q-bundled:///fs/cocos/animation/animation-curve.js", ["../core/index.js", "./types.js"], function (_export, _context) {
  "use strict";

  var lerp, Quat, errorID, cclegacy, binarySearchEpsilon, ValueType, bezierByTime, easing, isLerpable, RatioSampler, AnimCurve, EventInfo, selectLerpFx;
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
   * @zh
   * 采样动画曲线。
   * @en
   * Samples an animation curve.
   * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
   * @param curve @zh 动画曲线。@en The curve.
   * @param sampler @zh 采样器。@en The sampler.
   * @param ratio @zh 采样比率。@en Sample ratio([0, 1]).
   */
  function sampleAnimationCurve(curve, sampler, ratio) {
    var index = sampler.sample(ratio);
    if (index < 0) {
      index = ~index;
      if (index <= 0) {
        index = 0;
      } else if (index >= sampler.ratios.length) {
        index = sampler.ratios.length - 1;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return curve.valueBetween(ratio, index - 1, sampler.ratios[index - 1], index, sampler.ratios[index]);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return curve.valueAt(index);
  }
  /**
   * @en
   * Compute a new ratio by curve type.
   * @zh
   * 根据曲线类型计算新的比例。
   * @param ratio - The origin ratio
   * @param type - If it's Array, then ratio will be computed with bezierByTime.
   * If it's string, then ratio will be computed with cc.easing function
   * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
   */
  function computeRatioByType(ratio, type) {
    if (typeof type === 'string') {
      var func = easing[type];
      if (func) {
        ratio = func(ratio);
      } else {
        errorID(3906, type);
      }
    } else if (Array.isArray(type)) {
      // bezier curve
      ratio = bezierByTime(type, ratio);
    }
    return ratio;
  }

  /**
   * Use this function if intervals between frames are same.
   */
  function quickFindIndex(ratios, ratio) {
    var length = ratios.length - 1;
    if (length === 0) {
      return 0;
    }
    var start = ratios[0];
    if (ratio < start) {
      return 0;
    }
    var end = ratios[length];
    if (ratio > end) {
      return length;
    }
    ratio = (ratio - start) / (end - start);
    var eachLength = 1 / length;
    var index = ratio / eachLength;
    var floorIndex = index | 0;
    var EPSILON = 1e-6;
    if (index - floorIndex < EPSILON) {
      return floorIndex;
    } else if (floorIndex + 1 - index < EPSILON) {
      return floorIndex + 1;
    }
    return ~(floorIndex + 1);
  }
  _export({
    sampleAnimationCurve: sampleAnimationCurve,
    computeRatioByType: computeRatioByType
  });
  return {
    setters: [function (_coreIndexJs) {
      lerp = _coreIndexJs.lerp;
      Quat = _coreIndexJs.Quat;
      errorID = _coreIndexJs.errorID;
      cclegacy = _coreIndexJs.cclegacy;
      binarySearchEpsilon = _coreIndexJs.binarySearchEpsilon;
      ValueType = _coreIndexJs.ValueType;
      bezierByTime = _coreIndexJs.bezierByTime;
      easing = _coreIndexJs.easing;
    }, function (_typesJs) {
      isLerpable = _typesJs.isLerpable;
    }],
    execute: function () {
      /**
       * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
       */
      _export("RatioSampler", RatioSampler = /*#__PURE__*/function () {
        function RatioSampler(ratios) {
          this.ratios = void 0;
          this._findRatio = void 0;
          this.ratios = ratios;
          // If every piece of ratios are the same, we can use the quick function to find frame index.
          var currRatioDif;
          var lastRatioDif;
          var canOptimize = true;
          var EPSILON = 1e-6;
          for (var i = 1, l = ratios.length; i < l; i++) {
            currRatioDif = ratios[i] - ratios[i - 1];
            if (i === 1) {
              lastRatioDif = currRatioDif;
            } else if (Math.abs(currRatioDif - lastRatioDif) > EPSILON) {
              canOptimize = false;
              break;
            }
          }
          this._findRatio = canOptimize ? quickFindIndex : binarySearchEpsilon;
        }
        var _proto = RatioSampler.prototype;
        _proto.sample = function sample(ratio) {
          return this._findRatio(this.ratios, ratio);
        };
        return RatioSampler;
      }());
      cclegacy.RatioSampler = RatioSampler;

      /**
       * @en
       * Animation curve.
       * @zh
       * 动画曲线。
       * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
       */
      _export("AnimCurve", AnimCurve = /*#__PURE__*/function () {
        AnimCurve.Bezier = function Bezier(controlPoints) {
          return controlPoints;
        };
        function AnimCurve(propertyCurveData, duration) {
          this.types = undefined;
          this.type = null;
          /**
           * The values of the keyframes. (y)
           */
          this._values = [];
          /**
           * Lerp function used. If undefined, no lerp is performed.
           */
          this._lerp = undefined;
          this._duration = void 0;
          this._array = void 0;
          this._duration = duration;

          // Install values.
          this._values = propertyCurveData.values;
          var getCurveType = function getCurveType(easingMethod) {
            if (typeof easingMethod === 'string') {
              return easingMethod;
            } else if (Array.isArray(easingMethod)) {
              if (easingMethod[0] === easingMethod[1] && easingMethod[2] === easingMethod[3]) {
                return AnimCurve.Linear;
              } else {
                return AnimCurve.Bezier(easingMethod);
              }
            } else {
              return AnimCurve.Linear;
            }
          };
          if (propertyCurveData.easingMethod !== undefined) {
            this.type = getCurveType(propertyCurveData.easingMethod);
          } else if (Array.isArray(propertyCurveData.easingMethods)) {
            this.types = propertyCurveData.easingMethods.map(getCurveType);
          } else if (propertyCurveData.easingMethods !== undefined) {
            this.types = new Array(this._values.length).fill(null);
            for (var _i = 0, _Object$keys = Object.keys(propertyCurveData.easingMethods); _i < _Object$keys.length; _i++) {
              var index = _Object$keys[_i];
              this.types[index] = getCurveType(propertyCurveData.easingMethods[index]);
            }
          } else {
            this.type = null;
          }
          var firstValue = propertyCurveData.values[0];
          var interpolate = propertyCurveData.interpolate === undefined ? true : propertyCurveData.interpolate;

          // Setup the lerp function.
          if (interpolate) {
            this._lerp = selectLerpFx(firstValue);
          }
          if (propertyCurveData._arrayLength !== undefined) {
            this._array = new Array(propertyCurveData._arrayLength);
          }
        }
        var _proto2 = AnimCurve.prototype;
        _proto2.hasLerp = function hasLerp() {
          return !!this._lerp;
        };
        _proto2.valueAt = function valueAt(index) {
          if (this._array === undefined) {
            var _value = this._values[index];
            if (_value && _value.getNoLerp) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return _value.getNoLerp();
            } else {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return _value;
            }
          } else {
            for (var i = 0; i < this._array.length; ++i) {
              this._array[i] = this._values[this._array.length * index + i];
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this._array;
          }
        };
        _proto2.valueBetween = function valueBetween(ratio, from, fromRatio, to, toRatio) {
          if (this._lerp) {
            var type = this.types ? this.types[from] : this.type;
            var dRatio = toRatio - fromRatio;
            var ratioBetweenFrames = (ratio - fromRatio) / dRatio;
            if (type) {
              ratioBetweenFrames = computeRatioByType(ratioBetweenFrames, type);
            }
            if (this._array === undefined) {
              var fromVal = this._values[from];
              var toVal = this._values[to];
              var _value2 = this._lerp(fromVal, toVal, ratioBetweenFrames, dRatio * this._duration);
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return _value2;
            } else {
              for (var i = 0; i < this._array.length; ++i) {
                var _fromVal = this._values[this._array.length * from + i];
                var _toVal = this._values[this._array.length * to + i];
                this._array[i] = this._lerp(_fromVal, _toVal, ratioBetweenFrames, dRatio * this._duration);
              }
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return this._array;
            }
          } else if (this._array === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this.valueAt(from);
          } else {
            for (var _i2 = 0; _i2 < this._array.length; ++_i2) {
              this._array[_i2] = this._values[this._array.length * from + _i2];
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this._array;
          }
        };
        _proto2.empty = function empty() {
          return this._values.length === 0;
        }

        /**
         * Returns if this curve only yields constants.
         */;
        _proto2.constant = function constant() {
          return this._values.length === 1;
        };
        return AnimCurve;
      }());
      AnimCurve.Linear = null;
      cclegacy.AnimCurve = AnimCurve;
      _export("EventInfo", EventInfo = /*#__PURE__*/function () {
        function EventInfo() {
          this.events = [];
        }
        var _proto3 = EventInfo.prototype;
        /**
         * @param func event function
         * @param params event params
         */
        _proto3.add = function add(func, params) {
          this.events.push({
            func: func || '',
            params: params || []
          });
        };
        return EventInfo;
      }());
      cclegacy.sampleAnimationCurve = sampleAnimationCurve;
      selectLerpFx = function () {
        function makeValueTypeLerpFx(constructor) {
          var tempValue = new constructor();
          return function (from, to, ratio) {
            // TODO: `ValueType` class doesn't define lerp method
            // please fix the type @Leslie Leigh
            // Tracking issue: https://github.com/cocos/cocos-engine/issues/14640
            constructor.lerp(tempValue, from, to, ratio);
            return tempValue;
          };
        }
        function callLerpable(from, to, t, dt) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return from.lerp(to, t, dt);
        }
        function makeQuatSlerpFx() {
          var tempValue = new Quat();
          return function (from, to, t, dt) {
            return Quat.slerp(tempValue, from, to, t);
          };
        }
        return function (value) {
          if (value === null) {
            return undefined;
          }
          if (typeof value === 'number') {
            return lerp;
          } else if (typeof value === 'object' && value.constructor) {
            if (value instanceof Quat) {
              return makeQuatSlerpFx();
            } else if (value instanceof ValueType) {
              return makeValueTypeLerpFx(value.constructor);
            } else if (value.constructor === Number) {
              return lerp;
            } else if (isLerpable(value)) {
              return callLerpable;
            }
          }
          return undefined;
        };
      }();
    }
  };
});