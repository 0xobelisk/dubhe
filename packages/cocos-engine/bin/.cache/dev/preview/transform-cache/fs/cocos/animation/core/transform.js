System.register("q-bundled:///fs/cocos/animation/core/transform.js", ["../../core/math/vec3.js", "../../core/math/quat.js", "../../core/index.js"], function (_export, _context) {
  "use strict";

  var Vec3, Quat, EPSILON, Mat4, _class, CACHE_VECTOR_A, CACHE_VECTOR_B, CACHE_QUAT_A, CACHE_QUAT_B, Transform, __applyDeltaTransform, deltaQuat, ZERO_DELTA_TRANSFORM;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  /**
   * Invert each component of scale if it isn't close to zero, or set it to zero otherwise.
   */
  function invScaleOrZero(out, scale, epsilon) {
    var x = scale.x,
      y = scale.y,
      z = scale.z;
    return Vec3.set(out, Math.abs(x) <= epsilon ? 0.0 : 1.0 / x, Math.abs(y) <= epsilon ? 0.0 : 1.0 / y, Math.abs(z) <= epsilon ? 0.0 : 1.0 / z);
  }
  function __calculateDeltaTransform(out, target, base) {
    Vec3.subtract(out.position, target.position, base.position);
    deltaQuat(out.rotation, base.rotation, target.rotation);
    Vec3.subtract(out.scale, target.scale, base.scale);
    return out;
  }
  _export("__calculateDeltaTransform", __calculateDeltaTransform);
  return {
    setters: [function (_coreMathVec3Js) {
      Vec3 = _coreMathVec3Js.Vec3;
    }, function (_coreMathQuatJs) {
      Quat = _coreMathQuatJs.Quat;
    }, function (_coreIndexJs) {
      EPSILON = _coreIndexJs.EPSILON;
      Mat4 = _coreIndexJs.Mat4;
    }],
    execute: function () {
      CACHE_VECTOR_A = new Vec3();
      CACHE_VECTOR_B = new Vec3();
      CACHE_QUAT_A = new Quat();
      CACHE_QUAT_B = new Quat(); // Can not use `Readonly<Transform>`.
      // See: https://github.com/microsoft/TypeScript/issues/50668
      _export("Transform", Transform = /*#__PURE__*/function () {
        function Transform() {
          this._position = new Vec3();
          this._rotation = new Quat();
          this._scale = Vec3.clone(Vec3.ONE);
        }
        Transform.clone = function clone(src) {
          var transform = new Transform();
          Transform.copy(transform, src);
          return transform;
        };
        Transform.setIdentity = function setIdentity(out) {
          Vec3.copy(out._position, Vec3.ZERO);
          Quat.copy(out._rotation, Quat.IDENTITY);
          Vec3.copy(out._scale, Vec3.ONE);
          return out;
        };
        Transform.copy = function copy(out, src) {
          Vec3.copy(out._position, src._position);
          Quat.copy(out._rotation, src._rotation);
          Vec3.copy(out._scale, src._scale);
          return out;
        };
        Transform.equals = function equals(a, b, epsilon) {
          return Vec3.equals(a._position, b._position, epsilon) && Quat.equals(a._rotation, b._rotation, epsilon) && Vec3.equals(a._scale, b._scale, epsilon);
        };
        Transform.strictEquals = function strictEquals(a, b) {
          return Vec3.strictEquals(a._position, b._position) && Quat.strictEquals(a._rotation, b._rotation) && Vec3.strictEquals(a._scale, b._scale);
        };
        Transform.lerp = function lerp(out, from, to, t) {
          if (t === 0.0) {
            return Transform.copy(out, from);
          }
          if (t === 1.0) {
            return Transform.copy(out, to);
          }
          Vec3.lerp(out._position, from._position, to._position, t);
          Quat.slerp(out._rotation, from._rotation, to._rotation, t);
          Vec3.lerp(out._scale, from._scale, to._scale, t);
          return out;
        }

        /**
         * Associate two transforms.
         * The result is as if the `first` transform is applied and then the `second` transform.
         * @param out The result transform.
         * @param first The first transform to apply.
         * @param second The second transform to apply.
         * @returns `out`.
         * @note
         * Much important things to note is that
         * currently the following prerequisites are imposed on scales of both transforms:
         * - The scale should be uniformed, ie. all components should be the same.
         * - Each component of the scale shall be non-negative.
         */;
        Transform.multiply = function multiply(out, second, first) {
          // May reference to https://zhuanlan.zhihu.com/p/119066087
          // for the reason about restrictions on uniform scales.

          var cacheRotation = Quat.multiply(CACHE_QUAT_A, second._rotation, first._rotation);
          var cacheScale = Vec3.multiply(CACHE_VECTOR_A, first._scale, second._scale);

          // T_p + (R_p * (S_p * T_c))
          var cachePosition = Vec3.multiply(CACHE_VECTOR_B, first._position, second._scale);
          Vec3.transformQuat(cachePosition, cachePosition, second._rotation);
          Vec3.add(cachePosition, cachePosition, second._position);
          Vec3.copy(out._position, cachePosition);
          Quat.copy(out._rotation, cacheRotation);
          Vec3.copy(out._scale, cacheScale);
          return out;
        }

        /**
         * Calculates the relative transitions.
         * The result is as if `first` transform is associated by applying the result first then the `second`.
         * @param out The result transform.
         * @param first See description.
         * @param second See description.
         * @returns `out`.
         * @note
         *
         * Note: if scale of second transform contains 0,
         * the result scale's corresponding component would be error.
         *
         * Same restriction is applied to this method like `Transform.multiply`.
         */;
        /**
         * Inverts the transform.
         * @param out Out transform.
         * @param transform Transform to invert.
         */
        Transform.invert = function invert(out, transform) {
          var invRotation = out._rotation,
            invScale = out._scale,
            invPosition = out._position;
          Quat.invert(invRotation, transform._rotation);
          invScaleOrZero(invScale, transform._scale, EPSILON);

          /**
           * Let $b$ be the inverse of $a$, then for the translation term $T$(Vector), rotation term $Q$(Quaternion), scale term $S$(Vector):
           *
           * ```math
           * \begin{equation}
           * \begin{split}
           * T_(a * b) & = T_b + (Q_b \times (S_b \times T_a) \times Q_b^{-1}) = 0 \\
           *      T(b) & = -(Q_b \times S_b \times T_a \times Q_b^{-1}) \\
           *           & = Q_b \times (S_b \times -T_a) \times Q_b^{-1}
           * \end{split}
           * \end{equation}
           * ```
           *
           * Which equals to:
           *   - Translate by $-T_a$
           *   - Then scale by the $S_b$(ie. $S_a^{-1}$)
           *   - Then rotate by $Q_b$(ie. $Q_a^{-1}$)
            */
          Vec3.negate(invPosition, transform._position);
          Vec3.multiply(invPosition, invPosition, invScale);
          Vec3.transformQuat(invPosition, invPosition, invRotation);
          return out;
        };
        Transform.fromMatrix = function fromMatrix(out, matrix) {
          Mat4.toSRT(matrix, out._rotation, out._position, out._scale);
          return out;
        };
        Transform.toMatrix = function toMatrix(out, transform) {
          return Mat4.fromSRT(out, transform._rotation, transform._position, transform._scale);
        };
        _createClass(Transform, [{
          key: "position",
          get: function get() {
            return this._position;
          },
          set: function set(value) {
            Vec3.copy(this._position, value);
          }
        }, {
          key: "rotation",
          get: function get() {
            return this._rotation;
          },
          set: function set(value) {
            Quat.copy(this._rotation, value);
          }
        }, {
          key: "scale",
          get: function get() {
            return this._scale;
          },
          set: function set(value) {
            Vec3.copy(this._scale, value);
          }
        }]);
        return Transform;
      }());
      _class = Transform;
      Transform.IDENTITY = Object.freeze(new _class());
      Transform.ZERO = Object.freeze(function () {
        var transform = new _class();
        Vec3.copy(transform._position, Vec3.ZERO);
        Quat.set(transform._rotation, 0.0, 0.0, 0.0, 0.0);
        Vec3.copy(transform._scale, Vec3.ZERO);
        return transform;
      }());
      Transform.calculateRelative = function () {
        var cacheInvRotation = new Quat();
        var cacheInvScale = new Vec3();
        return function (out, first, second) {
          var invSecondRotation = Quat.invert(cacheInvRotation, second._rotation);
          var invScale = invScaleOrZero(cacheInvScale, second._scale, EPSILON);

          // The inverse process of `T_p + (R_p * (S_p * T_c))`
          var cachePosition = Vec3.subtract(CACHE_VECTOR_B, first._position, second._position);
          Vec3.transformQuat(cachePosition, cachePosition, invSecondRotation);
          Vec3.multiply(cachePosition, cachePosition, invScale);
          Vec3.copy(out._position, cachePosition);
          Quat.multiply(out._rotation, invSecondRotation, first._rotation);
          Vec3.multiply(out._scale, first._scale, invScale);
          return out;
        };
      }();
      _export("__applyDeltaTransform", __applyDeltaTransform = function () {
        var cacheQuat = new Quat();
        return function (out, base, delta, alpha) {
          Vec3.scaleAndAdd(out.position, base.position, delta.position, alpha);
          var weightedDeltaRotation = Quat.slerp(cacheQuat, Quat.IDENTITY, delta.rotation, alpha);
          Quat.multiply(out.rotation, weightedDeltaRotation, base.rotation);
          Vec3.scaleAndAdd(out.scale, base.scale, delta.scale, alpha);
          return out;
        };
      }());
      /**
       * Calculates the delta(relative) rotations between two rotations represented by quaternions.
       * @param out
       * @param from
       * @param to
       */
      deltaQuat = function () {
        var quatMultiInvInverseCache = new Quat();
        return function (out, from, to) {
          var fromInv = Quat.invert(quatMultiInvInverseCache, from);
          return Quat.multiply(out, to, fromInv);
        };
      }();
      _export("ZERO_DELTA_TRANSFORM", ZERO_DELTA_TRANSFORM = Object.freeze(function () {
        var transform = new Transform();
        transform.position = Vec3.ZERO;
        transform.rotation = Quat.IDENTITY;
        transform.scale = Vec3.ZERO;
        return transform;
      }()));
    }
  };
});