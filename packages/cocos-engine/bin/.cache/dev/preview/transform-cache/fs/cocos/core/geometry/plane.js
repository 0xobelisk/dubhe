System.register("q-bundled:///fs/cocos/core/geometry/plane.js", ["../math/index.js", "./enums.js", "../global-exports.js"], function (_export, _context) {
  "use strict";

  var Mat4, Vec3, Vec4, enums, legacyCC, v1, v2, temp_mat, temp_vec4, Plane;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
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
  return {
    setters: [function (_mathIndexJs) {
      Mat4 = _mathIndexJs.Mat4;
      Vec3 = _mathIndexJs.Vec3;
      Vec4 = _mathIndexJs.Vec4;
    }, function (_enumsJs) {
      enums = _enumsJs.default;
    }, function (_globalExportsJs) {
      legacyCC = _globalExportsJs.legacyCC;
    }],
    execute: function () {
      v1 = new Vec3(0, 0, 0);
      v2 = new Vec3(0, 0, 0);
      temp_mat = legacyCC.mat4();
      temp_vec4 = legacyCC.v4();
      /**
       * @en
       * Basic Geometry: Plane.
       * Plane Equation: a*x + b*y + c*z - d = 0.
       * @zh
       * 基础几何：平面。
       * 平面方程: a*x + b*y + c*z - d = 0。
       */
      _export("Plane", Plane = /*#__PURE__*/function () {
        /**
         * @en
         * Creates a new plane.
         * @zh
         * 创建一个新的平面。
         * @param nx @en The x component of normal vector. @zh 法向量的 x 部分。
         * @param ny @en The y component of normal vector. @zh 法向量的 y 部分。
         * @param nz @en The z component of normal vector. @zh 法向量的 z 部分。
         * @param d  @en The distance between normal vector and the origin. @zh 与原点的距离。
         * @returns @en The created plane object. @zh 新创建的平面。
         */
        Plane.create = function create(nx, ny, nz, d) {
          return new Plane(nx, ny, nz, d);
        }

        /**
         * @en
         * Clones a new plane.
         * @zh
         * 克隆一个新的平面。
         * @param p @en The Plane object to be cloned from. @zh 克隆的来源平面对象。
         * @returns @en The cloned Plane object @zh 克隆出的平面对象。
         */;
        Plane.clone = function clone(p) {
          return new Plane(p.n.x, p.n.y, p.n.z, p.d);
        }

        /**
         * @en
         * Copies the values from one plane to another.
         * @zh
         * 复制一个平面的值到另一个。
         * @param out @en The object to be operated on. @zh 接受操作的对象。
         * @param p @en The source of replication. @zh 复制的来源。
         * @returns @en The object to be operated on. @zh 接受操作的对象。
         */;
        Plane.copy = function copy(out, p) {
          Vec3.copy(out.n, p.n);
          out.d = p.d;
          return out;
        }

        /**
         * @en
         * Creates a plane from three points
         * @zh
         * 用三个点创建一个平面。
         * @param out @en The Plane object to be operated on. @zh 接受操作的对象。
         * @param a @en The point a. @zh 点 a。
         * @param b @en The point b. @zh 点 b。
         * @param c @en The point c. @zh 点 c。
         * @returns @en The Plane object to be operated on, same as `out` parameter. @zh 接受操作的对象，与 `out` 相同。
         */;
        Plane.fromPoints = function fromPoints(out, a, b, c) {
          Vec3.subtract(v1, b, a);
          Vec3.subtract(v2, c, a);
          Vec3.normalize(out.n, Vec3.cross(out.n, v1, v2));
          out.d = Vec3.dot(out.n, a);
          return out;
        }

        /**
         * @en
         * Sets the components of a plane to the given values.
         * @zh
         * 将给定平面的属性设置为给定值。
         * @param out @en The Plane object to be operated on. @zh 接受操作的对象。
         * @param nx @en The x component of normal vector. @zh 法向量量的 x 部分。
         * @param ny @en The y component of normal vector. @zh 法向量的 y 部分。
         * @param nz @en The z component of normal vector. @zh 法向量的 z 部分。
         * @param d  @en The distance between normal vector and the origin. @zh 与原点的距离。
         * @returns @en The object to be operated on, same as the `out` parameter. @zh 接受操作的对象，与 `out` 参数相同。
         */;
        Plane.set = function set(out, nx, ny, nz, d) {
          out.n.x = nx;
          out.n.y = ny;
          out.n.z = nz;
          out.d = d;
          return out;
        }

        /**
         * @en
         * Creates plane from normal and point.
         * @zh
         * 用一条法线和一个点创建平面。
         * @param out @en The object to be operated on. @zh 接受操作的对象。
         * @param normal @en The normal of the plane. @zh 平面的法线。
         * @param point @en A point in the plane. @zh 平面上的一点。
         * @returns @en The object to be operated on, same as the `out` parameter. @zh 接受操作的对象，与 `out` 参数相同。
         */;
        Plane.fromNormalAndPoint = function fromNormalAndPoint(out, normal, point) {
          Vec3.copy(out.n, normal);
          out.d = Vec3.dot(normal, point);
          return out;
        }

        /**
         * @en
         * Normalizes a plane.
         * @zh
         * 归一化一个平面。
         * @param out @en The object to be operated on. @zh 接受操作的对象。
         * @param a @en Source data for the operation. @zh 操作的源数据。
         * @returns @en The object to be operated on, sames as the `out` parameter. @zh 接受操作的对象，与 `out` 相同。
         */;
        Plane.normalize = function normalize(out, a) {
          var len = a.n.length();
          Vec3.normalize(out.n, a.n);
          if (len > 0) {
            out.d = a.d / len;
          }
          return out;
        }

        /**
         * @en
         * The normal of the plane.
         * @zh
         * 法线向量。
         */;

        /**
         * @en
         * Constructs a plane.
         * @zh
         * 构造一个平面。
         * @param nx @en The x component of normal vector. @zh 法向量的 x 部分。
         * @param ny @en The y component of normal vector. @zh 法向量的 y 部分。
         * @param nz @en The z component of normal vector. @zh 法向量的 z 部分。
         * @param d @en The distance between normal vector and the origin. @zh 与原点的距离。
         */
        function Plane(nx, ny, nz, d) {
          if (nx === void 0) {
            nx = 0;
          }
          if (ny === void 0) {
            ny = 1;
          }
          if (nz === void 0) {
            nz = 0;
          }
          if (d === void 0) {
            d = 0;
          }
          this.n = void 0;
          this._type = enums.SHAPE_PLANE;
          this.n = new Vec3(nx, ny, nz);
          this.d = d;
        }

        /**
         * @en
         * Transforms this plane by a 4x4 matrix.
         * @zh
         * 使用一个 4x4 矩阵变换此平面。
         * @param mat @en The 4x4 matrix for transformation @zh 用于变换的 4x4 矩阵。
         */
        var _proto = Plane.prototype;
        _proto.transform = function transform(mat) {
          Mat4.invert(temp_mat, mat);
          Mat4.transpose(temp_mat, temp_mat);
          Vec4.set(temp_vec4, this.n.x, this.n.y, this.n.z, -this.d);
          Vec4.transformMat4(temp_vec4, temp_vec4, temp_mat);
          Vec3.set(this.n, temp_vec4.x, temp_vec4.y, temp_vec4.z);
          this.d = -temp_vec4.w;
        };
        _createClass(Plane, [{
          key: "type",
          get:
          /**
           * @en
           * The distance from the origin to the plane.
           * @zh
           * 原点到平面的距离。
           */

          /**
           * @en
           * Gets the type of the Plane, its value is `enums.SHAPE_PLANE`.
           * @zh
           * 获取形状的类型，值为 `enums.SHAPE_PLANE`。
           */
          function get() {
            return this._type;
          }

          // compatibility with vector interfaces
        }, {
          key: "x",
          get: function get() {
            return this.n.x;
          },
          set: function set(val) {
            this.n.x = val;
          }
        }, {
          key: "y",
          get: function get() {
            return this.n.y;
          },
          set: function set(val) {
            this.n.y = val;
          }
        }, {
          key: "z",
          get: function get() {
            return this.n.z;
          },
          set: function set(val) {
            this.n.z = val;
          }
        }, {
          key: "w",
          get: function get() {
            return this.d;
          },
          set: function set(val) {
            this.d = val;
          }
        }]);
        return Plane;
      }());
    }
  };
});