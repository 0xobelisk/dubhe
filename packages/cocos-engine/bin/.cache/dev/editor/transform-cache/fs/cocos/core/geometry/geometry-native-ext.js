System.register("q-bundled:///fs/cocos/core/geometry/geometry-native-ext.js", ["../../../../virtual/internal%253Aconstants.js", "./line.js", "./plane.js", "./ray.js", "./triangle.js", "./sphere.js", "./aabb.js", "./capsule.js", "./frustum.js", "../platform/debug.js"], function (_export, _context) {
  "use strict";

  var NATIVE, Line, Plane, Ray, Triangle, Sphere, AABB, Capsule, Frustum, assert, defineAttrFloat, defineAttrInt, descOf_type, kls;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                             http://www.cocos.com
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
   * cache jsb attributes in js, reduce cross language invokations.
   */
  function cacheProperty(ctor, property) {
    const propDesc = Object.getOwnPropertyDescriptor(ctor.prototype, property);
    const propCacheKey = `_$cache_${property}`;
    const propRealKey = `_$_${property}`;
    Object.defineProperty(ctor.prototype, propRealKey, propDesc);
    Object.defineProperty(ctor.prototype, property, {
      get() {
        if (this[propCacheKey] === undefined) {
          this[propCacheKey] = this[propRealKey];
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this[propCacheKey];
      },
      set(value) {
        // this[propCacheKey] = value;
        this[propRealKey] = value;
      },
      configurable: true,
      enumerable: true
    });
  }

  /**
   * cache native object's `underlyingData()` result in __data
   */
  function cacheUnderlyingData(ctor) {
    // eslint-disable-next-line func-names
    ctor.prototype._arraybuffer = function () {
      if (!this.__data) {
        this.__data = this.underlyingData();
      }
      return this.__data;
    };
  }

  /**
   * linear layout info of JSB attributes
   *   stored at static field `__nativeFields__`
   * see: `DESC_UNDERLINE_DATA_*` in file jsb_geometry_manual.cpp
   */
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      NATIVE = _virtualInternal253AconstantsJs.NATIVE;
    }, function (_lineJs) {
      Line = _lineJs.Line;
    }, function (_planeJs) {
      Plane = _planeJs.Plane;
    }, function (_rayJs) {
      Ray = _rayJs.Ray;
    }, function (_triangleJs) {
      Triangle = _triangleJs.Triangle;
    }, function (_sphereJs) {
      Sphere = _sphereJs.Sphere;
    }, function (_aabbJs) {
      AABB = _aabbJs.AABB;
    }, function (_capsuleJs) {
      Capsule = _capsuleJs.Capsule;
    }, function (_frustumJs) {
      Frustum = _frustumJs.Frustum;
    }, function (_platformDebugJs) {
      assert = _platformDebugJs.assert;
    }],
    execute: function () {
      /**
       * define accessor for attr, read/write directly to the underlyingData as Float32Array[1]
       */
      defineAttrFloat = (kls, attr) => {
        // __nativeFields__ is defined in jsb_geometry_manual.cpp
        const desc = kls.__nativeFields__[attr];
        const cacheKey = `_$_${attr}`;
        assert(desc.fieldSize === 4, `field ${attr} size ${desc.fieldSize}`);
        Object.defineProperty(kls.prototype, desc.fieldName, {
          configurable: true,
          enumerable: true,
          get() {
            if (this[cacheKey] === undefined) {
              this[cacheKey] = new Float32Array(this._arraybuffer(), desc.fieldOffset, 1);
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this[cacheKey][0];
          },
          set(v) {
            if (this[cacheKey] === undefined) {
              this[cacheKey] = new Float32Array(this._arraybuffer(), desc.fieldOffset, 1);
            }
            this[cacheKey][0] = v;
          }
        });
      };
      /**
       *  define accessor for attr, read/write directly to the underlyingData as Int32Array[1]
       */
      defineAttrInt = (kls, attr) => {
        // __nativeFields__ is defined in jsb_geometry_manual.cpp
        const desc = kls.__nativeFields__[attr];
        if (!desc) {
          console.error(`attr ${attr} not defined in class ${kls.toString()}`);
        }
        const cacheKey = `_$_${attr}`;
        assert(desc.fieldSize === 4, `field ${attr} size ${desc.fieldSize}`);
        Object.defineProperty(kls.prototype, desc.fieldName, {
          configurable: true,
          enumerable: true,
          get() {
            if (this[cacheKey] === undefined) {
              this[cacheKey] = new Int32Array(this._arraybuffer(), desc.fieldOffset, 1);
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this[cacheKey][0];
          },
          set(v) {
            if (this[cacheKey] === undefined) {
              this[cacheKey] = new Int32Array(this._arraybuffer(), desc.fieldOffset, 1);
            }
            this[cacheKey][0] = v;
          }
        });
      };
      if (NATIVE) {
        // Line
        cacheProperty(ns.Line, 's');
        cacheProperty(ns.Line, 'e');
        Object.setPrototypeOf(ns.Line.prototype, Line.prototype);

        // Plane
        cacheUnderlyingData(ns.Plane);
        cacheProperty(ns.Plane, 'n');
        defineAttrFloat(ns.Plane, 'd');
        Object.setPrototypeOf(ns.Plane.prototype, Plane.prototype);

        // Ray
        cacheUnderlyingData(ns.Ray);
        cacheProperty(ns.Ray, 'o');
        cacheProperty(ns.Ray, 'd');
        Object.setPrototypeOf(ns.Ray.prototype, Ray.prototype);

        // Triangle
        cacheUnderlyingData(ns.Triangle);
        cacheProperty(ns.Triangle, 'a');
        cacheProperty(ns.Triangle, 'b');
        cacheProperty(ns.Triangle, 'c');
        Object.setPrototypeOf(ns.Triangle.prototype, Triangle.prototype);

        // Sphere
        cacheUnderlyingData(ns.Sphere);
        cacheProperty(ns.Sphere, '_center');
        defineAttrFloat(ns.Sphere, '_radius');
        Object.setPrototypeOf(ns.Sphere.prototype, Sphere.prototype);

        // AABB
        cacheUnderlyingData(ns.AABB);
        cacheProperty(ns.AABB, 'center');
        cacheProperty(ns.AABB, 'halfExtents');
        Object.setPrototypeOf(ns.AABB.prototype, AABB.prototype);

        // Capsule
        cacheUnderlyingData(ns.Capsule);
        defineAttrFloat(ns.Capsule, 'radius');
        defineAttrFloat(ns.Capsule, 'halfHeight');
        defineAttrInt(ns.Capsule, 'axis');
        cacheProperty(ns.Capsule, 'center');
        cacheProperty(ns.Capsule, 'rotation');
        cacheProperty(ns.Capsule, 'ellipseCenter0');
        cacheProperty(ns.Capsule, 'ellipseCenter1');
        Object.setPrototypeOf(ns.Capsule.prototype, Capsule.prototype);

        // Frustum
        // cacheUnderlyingData(ns.Frustum); // no needed
        cacheProperty(ns.Frustum, 'vertices');
        cacheProperty(ns.Frustum, 'planes');
        Object.setPrototypeOf(ns.Frustum.prototype, Frustum.prototype);

        // fix `_type`
        descOf_type = Object.getOwnPropertyDescriptor(ns.ShapeBase.prototype, '_type');
        for (kls of [ns.Line, ns.Plane, ns.Ray, ns.Triangle, ns.Sphere, ns.AABB, ns.Capsule, ns.Frustum]) {
          Object.defineProperty(kls.prototype, '_type', descOf_type);
        }
      }
    }
  };
});