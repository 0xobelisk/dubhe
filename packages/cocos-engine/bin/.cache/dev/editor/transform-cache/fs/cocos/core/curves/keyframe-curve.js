System.register("q-bundled:///fs/cocos/core/curves/keyframe-curve.js", ["../algorithm/binary-search.js", "../data/class.js", "../data/utils/asserts.js", "../math/index.js"], function (_export, _context) {
  "use strict";

  var binarySearchEpsilon, CCClass, assertIsTrue, approx, KeyframeCurve, _Symbol$iterator;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function isSorted(values) {
    return values.every((value, index, array) => index === 0 || value > array[index - 1] || approx(value, array[index - 1], 1e-6));
  }
  _export("KeyframeCurve", void 0);
  return {
    setters: [function (_algorithmBinarySearchJs) {
      binarySearchEpsilon = _algorithmBinarySearchJs.binarySearchEpsilon;
    }, function (_dataClassJs) {
      CCClass = _dataClassJs.CCClass;
    }, function (_dataUtilsAssertsJs) {
      assertIsTrue = _dataUtilsAssertsJs.assertIsTrue;
    }, function (_mathIndexJs) {
      approx = _mathIndexJs.approx;
    }],
    execute: function () {
      _Symbol$iterator = Symbol.iterator;
      /**
       * @en
       * Keyframe curve.
       * @zh
       * 关键帧曲线。
       */
      _export("KeyframeCurve", KeyframeCurve = class KeyframeCurve {
        constructor() {
          // Times are always sorted and 1-1 correspond to values.
          this._times = [];
          this._values = [];
        }
        /**
         * @en
         * Gets the count of keyframes.
         * @zh
         * 获取关键帧数量。
         */
        get keyFramesCount() {
          return this._times.length;
        }

        /**
         * @en
         * Gets the minimal keyframe time on this curve.
         * @zh
         * 获取此曲线上最小的关键帧时间。
         */
        get rangeMin() {
          return this._times[0];
        }

        /**
         * @en
         * Gets the maximum keyframe time on this curve.
         * @zh
         * 获取此曲线上最大的关键帧时间。
         */
        get rangeMax() {
          return this._times[this._values.length - 1];
        }

        /**
         * @en
         * Returns an iterator to keyframe pairs.
         * @zh
         * 返回关键帧对的迭代器。
         */
        [_Symbol$iterator]() {
          let index = 0;
          return {
            next: () => {
              if (index >= this._times.length) {
                return {
                  done: true,
                  value: undefined
                };
              } else {
                const value = [this._times[index], this._values[index]];
                ++index;
                return {
                  done: false,
                  value
                };
              }
            }
          };
        }

        /**
         * @en
         * Returns an iterator to keyframe pairs.
         * @zh
         * 返回关键帧对的迭代器。
         */
        keyframes() {
          return this;
        }

        /**
         * @en
         * Returns an iterator to keyframe times.
         * @zh
         * 返回关键帧时间的迭代器。
         */
        times() {
          return this._times;
        }

        /**
         * @en
         * Returns an iterator to keyframe values.
         * @zh
         * 返回关键帧值的迭代器。
         */
        values() {
          return this._values;
        }

        /**
         * @en
         * Gets the time of specified keyframe.
         * @zh
         * 获取指定关键帧上的时间。
         * @param index Index to the keyframe.
         * @returns The keyframe 's time.
         */
        getKeyframeTime(index) {
          return this._times[index];
        }

        /**
         * @en
         * Gets the value of specified keyframe.
         * @zh
         * 获取指定关键帧上的值。
         * @param index Index to the keyframe.
         * @returns The keyframe 's value.
         */
        getKeyframeValue(index) {
          return this._values[index];
        }

        /**
         * @en
         * Adds a keyframe into this curve.
         * @zh
         * 添加一个关键帧到此曲线中。
         * @param time Time of the keyframe.
         * @param keyframeValue Value of the keyframe.
         * @returns The index to the new keyframe.
         */
        addKeyFrame(time, keyframeValue) {
          return this._insertNewKeyframe(time, keyframeValue);
        }

        /**
         * @en
         * Removes a keyframe from this curve.
         * @zh
         * 移除此曲线的一个关键帧。
         * @param index Index to the keyframe.
         */
        removeKeyframe(index) {
          this._times.splice(index, 1);
          this._values.splice(index, 1);
        }

        /**
         * @en
         * Searches for the keyframe at specified time.
         * @zh
         * 搜索指定时间上的关键帧。
         * @param time Time to search.
         * @returns Index to the keyframe or negative number if not found.
         */
        indexOfKeyframe(time) {
          return binarySearchEpsilon(this._times, time);
        }

        /**
         * @en
         * Updates the time of a keyframe.
         * @zh
         * 更新关键帧的时间。
         * @param index Index to the keyframe.
         * @param time New time.
         */
        updateTime(index, time) {
          const value = this._values[index];
          this.removeKeyframe(index);
          this._insertNewKeyframe(time, value);
        }

        /**
         * @en
         * Assigns all keyframes.
         * @zh
         * 赋值所有关键帧。
         * @param keyframes An iterable to keyframes. The keyframes should be sorted by their time.
         */

        /**
         * @en
         * Assigns all keyframes.
         * @zh
         * 赋值所有关键帧。
         * @param times Times array. Should be sorted.
         * @param values Values array. Corresponding to each time in `times`.
         */

        assignSorted(times, values) {
          if (values !== undefined) {
            assertIsTrue(Array.isArray(times));
            this.setKeyframes(times.slice(), values.slice());
          } else {
            const keyframes = Array.from(times);
            this.setKeyframes(keyframes.map(([time]) => time), keyframes.map(([, value]) => value));
          }
        }

        /**
         * @en
         * Removes all key frames.
         * @zh
         * 移除所有关键帧。
         */
        clear() {
          this._times.length = 0;
          this._values.length = 0;
        }
        searchKeyframe(time) {
          return binarySearchEpsilon(this._times, time);
        }
        setKeyframes(times, values) {
          assertIsTrue(times.length === values.length);
          assertIsTrue(isSorted(times));
          this._times = times;
          this._values = values;
        }
        _insertNewKeyframe(time, value) {
          const times = this._times;
          const values = this._values;
          const nFrames = times.length;
          const index = binarySearchEpsilon(times, time);
          if (index >= 0) {
            return index;
          }
          const iNext = ~index;
          if (iNext === 0) {
            times.unshift(time);
            values.unshift(value);
          } else if (iNext === nFrames) {
            times.push(time);
            values.push(value);
          } else {
            assertIsTrue(nFrames > 1);
            times.splice(iNext - 1, 0, time);
            values.splice(iNext - 1, 0, value);
          }
          return iNext;
        }
      });
      CCClass.fastDefine('cc.KeyframeCurve', KeyframeCurve, {
        _times: [],
        _values: []
      });
    }
  };
});