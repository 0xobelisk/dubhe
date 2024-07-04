System.register("q-bundled:///fs/cocos/core/math/vec3.js", ["../data/class.js", "../value-types/value-type.js", "./utils.js", "../global-exports.js"], function (_export, _context) {
  "use strict";

  var CCClass, ValueType, clamp, EPSILON, lerp, random, legacyCC, Vec3, _class, rotateAxisAngle;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function v3(x, y, z) {
    return new Vec3(x, y, z);
  }

  /**
   * Rotates `input` around `axis` for `angle` radians.
   */
  _export({
    Vec3: void 0,
    v3: v3
  });
  return {
    setters: [function (_dataClassJs) {
      CCClass = _dataClassJs.CCClass;
    }, function (_valueTypesValueTypeJs) {
      ValueType = _valueTypesValueTypeJs.ValueType;
    }, function (_utilsJs) {
      clamp = _utilsJs.clamp;
      EPSILON = _utilsJs.EPSILON;
      lerp = _utilsJs.lerp;
      random = _utilsJs.random;
    }, function (_globalExportsJs) {
      legacyCC = _globalExportsJs.legacyCC;
    }],
    execute: function () {
      /**
       * @en Representation of 3D vectors and points.
       * @zh 三维向量。
       */
      _export("Vec3", Vec3 = class Vec3 extends ValueType {
        /**
         * @en return a Vec3 object with x = 0, y = 0, z = 0.
         * @zh 将目标赋值为零向量
         */
        static zero(out) {
          out.x = 0;
          out.y = 0;
          out.z = 0;
          return out;
        }

        /**
         * @en Obtains a clone of the given vector object
         * @zh 获得指定向量的拷贝
         */
        static clone(a) {
          return new Vec3(a.x, a.y, a.z);
        }

        /**
         * @en Copy the target vector and save the results to out vector object
         * @zh 复制目标向量
         */
        static copy(out, a) {
          out.x = a.x;
          out.y = a.y;
          out.z = a.z;
          return out;
        }

        /**
         * @en Sets the out vector with the given x, y and z values
         * @zh 设置向量值
         */
        static set(out, x, y, z) {
          out.x = x;
          out.y = y;
          out.z = z;
          return out;
        }

        /**
         * @en Element-wise vector addition and save the results to out vector object
         * @zh 逐元素向量加法
         */
        static add(out, a, b) {
          out.x = a.x + b.x;
          out.y = a.y + b.y;
          out.z = a.z + b.z;
          return out;
        }

        /**
         * @en Element-wise vector subtraction and save the results to out vector object
         * @zh 逐元素向量减法
         */
        static subtract(out, a, b) {
          out.x = a.x - b.x;
          out.y = a.y - b.y;
          out.z = a.z - b.z;
          return out;
        }

        /**
         * @en Element-wise vector multiplication and save the results to out vector object
         * @zh 逐元素向量乘法 (分量积)
         */
        static multiply(out, a, b) {
          out.x = a.x * b.x;
          out.y = a.y * b.y;
          out.z = a.z * b.z;
          return out;
        }

        /**
         * @en Element-wise vector division and save the results to out vector object
         * @zh 逐元素向量除法
         */
        static divide(out, a, b) {
          out.x = a.x / b.x;
          out.y = a.y / b.y;
          out.z = a.z / b.z;
          return out;
        }

        /**
         * @en Rounds up by elements of the vector and save the results to out vector object
         * @zh 逐元素向量向上取整
         */
        static ceil(out, a) {
          out.x = Math.ceil(a.x);
          out.y = Math.ceil(a.y);
          out.z = Math.ceil(a.z);
          return out;
        }

        /**
         * @en Element-wise rounds down of the current vector and save the results to the out vector
         * @zh 逐元素向量向下取整
         */
        static floor(out, a) {
          out.x = Math.floor(a.x);
          out.y = Math.floor(a.y);
          out.z = Math.floor(a.z);
          return out;
        }

        /**
         * @en Calculates element-wise minimum values and save to the out vector
         * @zh 逐元素向量最小值
         */
        static min(out, a, b) {
          out.x = Math.min(a.x, b.x);
          out.y = Math.min(a.y, b.y);
          out.z = Math.min(a.z, b.z);
          return out;
        }

        /**
         * @en Calculates element-wise maximum values and save to the out vector
         * @zh 逐元素向量最大值
         */
        static max(out, a, b) {
          out.x = Math.max(a.x, b.x);
          out.y = Math.max(a.y, b.y);
          out.z = Math.max(a.z, b.z);
          return out;
        }

        /**
         * @en Calculates element-wise round results and save to the out vector
         * @zh 逐元素向量四舍五入取整
         */
        static round(out, a) {
          out.x = Math.round(a.x);
          out.y = Math.round(a.y);
          out.z = Math.round(a.z);
          return out;
        }

        /**
         * @en Vector scalar multiplication and save the results to out vector object
         * @zh 向量标量乘法
         */
        static multiplyScalar(out, a, b) {
          out.x = a.x * b;
          out.y = a.y * b;
          out.z = a.z * b;
          return out;
        }

        /**
         * @en Element-wise multiplication and addition with the equation: a + b * scale
         * @zh 逐元素向量乘加: A + B * scale
         */
        static scaleAndAdd(out, a, b, scale) {
          out.x = a.x + b.x * scale;
          out.y = a.y + b.y * scale;
          out.z = a.z + b.z * scale;
          return out;
        }

        /**
         * @en Calculates the euclidean distance of two vectors
         * @zh 求两向量的欧氏距离
         */
        static distance(a, b) {
          const x = b.x - a.x;
          const y = b.y - a.y;
          const z = b.z - a.z;
          return Math.sqrt(x * x + y * y + z * z);
        }

        /**
         * @en Calculates the squared euclidean distance of two vectors
         * @zh 求两向量的欧氏距离平方
         */
        static squaredDistance(a, b) {
          const x = b.x - a.x;
          const y = b.y - a.y;
          const z = b.z - a.z;
          return x * x + y * y + z * z;
        }

        /**
         * @en Calculates the length of the vector
         * @zh 求向量长度
         */
        static len(a) {
          const x = a.x;
          const y = a.y;
          const z = a.z;
          return Math.sqrt(x * x + y * y + z * z);
        }

        /**
         * @en Calculates the squared length of the vector
         * @zh 求向量长度平方
         */
        static lengthSqr(a) {
          const x = a.x;
          const y = a.y;
          const z = a.z;
          return x * x + y * y + z * z;
        }

        /**
         * @en Sets each element to its negative value
         * @zh 逐元素向量取负
         */
        static negate(out, a) {
          out.x = -a.x;
          out.y = -a.y;
          out.z = -a.z;
          return out;
        }

        /**
         * @en Sets each element to its inverse value, zero value will become Infinity
         * @zh 逐元素向量取倒数，接近 0 时返回 Infinity
         */
        static invert(out, a) {
          out.x = 1.0 / a.x;
          out.y = 1.0 / a.y;
          out.z = 1.0 / a.z;
          return out;
        }

        /**
         * @en Sets each element to its inverse value, zero value will remain zero
         * @zh 逐元素向量取倒数，接近 0 时返回 0
         */
        static invertSafe(out, a) {
          const x = a.x;
          const y = a.y;
          const z = a.z;
          if (Math.abs(x) < EPSILON) {
            out.x = 0;
          } else {
            out.x = 1.0 / x;
          }
          if (Math.abs(y) < EPSILON) {
            out.y = 0;
          } else {
            out.y = 1.0 / y;
          }
          if (Math.abs(z) < EPSILON) {
            out.z = 0;
          } else {
            out.z = 1.0 / z;
          }
          return out;
        }

        /**
         * @en Sets the normalized vector to the out vector, returns a zero vector if input is a zero vector.
         * @zh 归一化向量，输入零向量将会返回零向量。
         */
        static normalize(out, a) {
          const x = a.x;
          const y = a.y;
          const z = a.z;
          let len = x * x + y * y + z * z;
          if (len > 0) {
            len = 1 / Math.sqrt(len);
            out.x = x * len;
            out.y = y * len;
            out.z = z * len;
          } else {
            out.x = 0;
            out.y = 0;
            out.z = 0;
          }
          return out;
        }

        /**
         * @en Calculates the dot product of the vector
         * @zh 向量点积（数量积）
         */
        static dot(a, b) {
          return a.x * b.x + a.y * b.y + a.z * b.z;
        }

        /**
         * @en Calculates the cross product of the vector
         * @zh 向量叉积（向量积）
         */
        static cross(out, a, b) {
          const {
            x: ax,
            y: ay,
            z: az
          } = a;
          const {
            x: bx,
            y: by,
            z: bz
          } = b;
          out.x = ay * bz - az * by;
          out.y = az * bx - ax * bz;
          out.z = ax * by - ay * bx;
          return out;
        }

        /**
         * @en Calculates the linear interpolation between two vectors with a given ratio: A + t * (B - A)
         * @zh 逐元素向量线性插值： A + t * (B - A)
         */
        static lerp(out, a, b, t) {
          out.x = a.x + t * (b.x - a.x);
          out.y = a.y + t * (b.y - a.y);
          out.z = a.z + t * (b.z - a.z);
          return out;
        }

        /**
         * @zh 球面线性插值。多用于插值两个方向向量。
         * @en Spherical linear interpolation. Commonly used in interpolation between directional vectors.
         * @param out @zh 输出向量。 @en Output vector.
         * @param from @zh 起点向量。 @en Start vector.
         * @param to @zh 终点向量。 @en Destination vector.
         * @param t @zh 插值参数。@en Interpolation parameter.
         * @returns `out`
         * @description
         * @zh
         * - 如果 `from`、`to` 中任何一个接近零向量，则结果就是 `from` 到 `to` 线性插值的结果；
         *
         * - 否则，如果 `from`、`to` 方向刚好接近相反，
         * 则结果向量是满足以下条件的一个向量：结果向量和两个输入向量的夹角之比是 `t`，其长度是 `from` 到 `to` 的长度线性插值的结果；
         *
         * - 否则，结果是从标准化后的 `from` 到 标准化后的 `to`
         * 进行球面线性插值的结果乘以 `from` 到 `to` 的长度线性插值后的长度。
         * @en
         * - If either `from` or `to` is close to zero vector,
         * the result would be the (non-spherical) linear interpolation result from `from` to `to`.
         *
         * - Otherwise, if `from` and `to` have almost opposite directions,
         * the result would be such a vector so that:
         * The angle ratio between result vector and input vectors is `t`,
         * the length of result vector is the linear interpolation of lengths from `from` to `to`.
         *
         * - Otherwise, the result would be the spherical linear interpolation result
         * from normalized `from` to normalized `to`,
         * then scaled by linear interpolation of lengths from `from` to `to`.
         */

        /**
         * @en Generates a uniformly distributed random vector points from center to the surface of the unit sphere
         * @zh 生成一个在单位球体上均匀分布的随机向量
         * @param scale vector length
         */
        static random(out, scale) {
          scale = scale || 1.0;
          const phi = random() * 2.0 * Math.PI;
          const cosTheta = random() * 2 - 1;
          const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
          out.x = sinTheta * Math.cos(phi) * scale;
          out.y = sinTheta * Math.sin(phi) * scale;
          out.z = cosTheta * scale;
          return out;
        }

        /**
         * @en Vector and fourth order matrix multiplication, will complete the vector with a fourth value as one
         * @zh 向量与四维矩阵乘法，默认向量第四位为 1。
         */
        static transformMat4(out, a, m) {
          const x = a.x;
          const y = a.y;
          const z = a.z;
          let rhw = m.m03 * x + m.m07 * y + m.m11 * z + m.m15;
          rhw = rhw ? 1 / rhw : 1;
          out.x = (m.m00 * x + m.m04 * y + m.m08 * z + m.m12) * rhw;
          out.y = (m.m01 * x + m.m05 * y + m.m09 * z + m.m13) * rhw;
          out.z = (m.m02 * x + m.m06 * y + m.m10 * z + m.m14) * rhw;
          return out;
        }

        /**
         * @en Vector and fourth order matrix multiplication, will complete the vector with a fourth element as one
         * @zh 向量与四维矩阵乘法，默认向量第四位为 0。
         */
        static transformMat4Normal(out, a, m) {
          const x = a.x;
          const y = a.y;
          const z = a.z;
          let rhw = m.m03 * x + m.m07 * y + m.m11 * z;
          rhw = rhw ? 1 / rhw : 1;
          out.x = (m.m00 * x + m.m04 * y + m.m08 * z) * rhw;
          out.y = (m.m01 * x + m.m05 * y + m.m09 * z) * rhw;
          out.z = (m.m02 * x + m.m06 * y + m.m10 * z) * rhw;
          return out;
        }

        /**
         * @en Vector and third order matrix multiplication
         * @zh 向量与三维矩阵乘法
         */
        static transformMat3(out, a, m) {
          const x = a.x;
          const y = a.y;
          const z = a.z;
          out.x = x * m.m00 + y * m.m03 + z * m.m06;
          out.y = x * m.m01 + y * m.m04 + z * m.m07;
          out.z = x * m.m02 + y * m.m05 + z * m.m08;
          return out;
        }

        /**
         * @en Affine transformation vector
         * @zh 向量仿射变换
         */
        static transformAffine(out, v, m) {
          const x = v.x;
          const y = v.y;
          const z = v.z;
          out.x = m.m00 * x + m.m04 * y + m.m08 * z + m.m12;
          out.y = m.m01 * x + m.m05 * y + m.m09 * z + m.m13;
          out.z = m.m02 * x + m.m06 * y + m.m10 * z + m.m14;
          return out;
        }

        /**
         * @en Vector quaternion multiplication: q*a*q^{-1}.
         * @zh 向量四元数乘法：q*a*q^{-1}。
         */
        static transformQuat(out, a, q) {
          // benchmarks: http://jsperf.com/quaternion-transform-Vec3-implementations

          // calculate quat * vec
          const ix = q.w * a.x + q.y * a.z - q.z * a.y;
          const iy = q.w * a.y + q.z * a.x - q.x * a.z;
          const iz = q.w * a.z + q.x * a.y - q.y * a.x;
          const iw = -q.x * a.x - q.y * a.y - q.z * a.z;

          // calculate result * inverse quat
          out.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
          out.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
          out.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;
          return out;
        }

        /**
         * @en Transforms the current vector with given scale, rotation and translation in order
         * @zh 以缩放 -> 旋转 -> 平移顺序变换向量
         */
        static transformRTS(out, a, r, t, s) {
          const x = a.x * s.x;
          const y = a.y * s.y;
          const z = a.z * s.z;
          const ix = r.w * x + r.y * z - r.z * y;
          const iy = r.w * y + r.z * x - r.x * z;
          const iz = r.w * z + r.x * y - r.y * x;
          const iw = -r.x * x - r.y * y - r.z * z;
          out.x = ix * r.w + iw * -r.x + iy * -r.z - iz * -r.y + t.x;
          out.y = iy * r.w + iw * -r.y + iz * -r.x - ix * -r.z + t.y;
          out.z = iz * r.w + iw * -r.z + ix * -r.y - iy * -r.x + t.z;
          return out;
        }

        /**
         * @en Transforms the current vector with given scale, rotation and translation in reverse order
         * @zh 以平移 -> 旋转 -> 缩放顺序逆变换向量
         */
        static transformInverseRTS(out, a, r, t, s) {
          const x = a.x - t.x;
          const y = a.y - t.y;
          const z = a.z - t.z;
          const ix = r.w * x - r.y * z + r.z * y;
          const iy = r.w * y - r.z * x + r.x * z;
          const iz = r.w * z - r.x * y + r.y * x;
          const iw = r.x * x + r.y * y + r.z * z;
          out.x = (ix * r.w + iw * r.x + iy * r.z - iz * r.y) / s.x;
          out.y = (iy * r.w + iw * r.y + iz * r.x - ix * r.z) / s.y;
          out.z = (iz * r.w + iw * r.z + ix * r.y - iy * r.x) / s.z;
          return out;
        }

        /**
         * @en Rotates the vector with specified angle around X axis
         * @zh 绕 X 轴旋转向量指定弧度
         * @param v rotation vector
         * @param o center of rotation
         * @param a radiance of rotation
         */
        static rotateX(out, v, o, a) {
          // Translate point to the origin
          const x = v.x - o.x;
          const y = v.y - o.y;
          const z = v.z - o.z;

          // perform rotation
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          const rx = x;
          const ry = y * cos - z * sin;
          const rz = y * sin + z * cos;

          // translate to correct position
          out.x = rx + o.x;
          out.y = ry + o.y;
          out.z = rz + o.z;
          return out;
        }

        /**
         * @en Rotates the vector with specified angle around Y axis
         * @zh 绕 Y 轴旋转向量指定弧度
         * @param v rotation vector
         * @param o center of rotation
         * @param a radiance of rotation
         */
        static rotateY(out, v, o, a) {
          // Translate point to the origin
          const x = v.x - o.x;
          const y = v.y - o.y;
          const z = v.z - o.z;

          // perform rotation
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          const rx = z * sin + x * cos;
          const ry = y;
          const rz = z * cos - x * sin;

          // translate to correct position
          out.x = rx + o.x;
          out.y = ry + o.y;
          out.z = rz + o.z;
          return out;
        }

        /**
         * @en Rotates the vector with specified angle around Z axis
         * @zh 绕 Z 轴旋转向量指定弧度
         * @param v rotation vector
         * @param o center of rotation
         * @param a radiance of rotation
         */
        static rotateZ(out, v, o, a) {
          // Translate point to the origin
          const x = v.x - o.x;
          const y = v.y - o.y;
          const z = v.z - o.z;

          // perform rotation
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          const rx = x * cos - y * sin;
          const ry = x * sin + y * cos;
          const rz = z;

          // translate to correct position
          out.x = rx + o.x;
          out.y = ry + o.y;
          out.z = rz + o.z;
          return out;
        }

        /**
         * @en Rotates the vector with specified angle around any n axis
         * @zh 绕任意 n 轴旋转向量指定弧度
         * @param v rotation vector
         * @param o center of rotation
         * @param n axis of rotation
         * @param a radiance of rotation
         */
        static rotateN(out, v, o, n, a) {
          // Translate point to the origin
          const x = v.x - o.x;
          const y = v.y - o.y;
          const z = v.z - o.z;

          // perform rotation
          const nx = n.x;
          const ny = n.y;
          const nz = n.z;
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          const rx = x * (nx * nx * (1.0 - cos) + cos) + y * (nx * ny * (1.0 - cos) - nz * sin) + z * (nx * nz * (1.0 - cos) + ny * sin);
          const ry = x * (nx * ny * (1.0 - cos) + nz * sin) + y * (ny * ny * (1.0 - cos) + cos) + z * (ny * nz * (1.0 - cos) - nx * sin);
          const rz = x * (nx * nz * (1.0 - cos) - ny * sin) + y * (ny * nz * (1.0 - cos) + nx * sin) + z * (nz * nz * (1.0 - cos) + cos);

          // translate to correct position
          out.x = rx + o.x;
          out.y = ry + o.y;
          out.z = rz + o.z;
          return out;
        }

        /**
         * @en Converts the given vector to an array
         * @zh 向量转数组
         * @param ofs Array Start Offset
         */
        static toArray(out, v, ofs = 0) {
          out[ofs + 0] = v.x;
          out[ofs + 1] = v.y;
          out[ofs + 2] = v.z;
          return out;
        }

        /**
         * @en Converts the given array to a vector
         * @zh 数组转向量
         * @param ofs Array Start Offset
         */
        static fromArray(out, arr, ofs = 0) {
          out.x = arr[ofs + 0];
          out.y = arr[ofs + 1];
          out.z = arr[ofs + 2];
          return out;
        }

        /**
         * @en Check the equality of the two given vectors
         * @zh 向量等价判断
         */
        static strictEquals(a, b) {
          return a.x === b.x && a.y === b.y && a.z === b.z;
        }

        /**
         * @en Check whether the two given vectors are approximately equivalent
         * @zh 排除浮点数误差的向量近似等价判断
         */
        static equals(a, b, epsilon = EPSILON) {
          const {
            x: a0,
            y: a1,
            z: a2
          } = a;
          const {
            x: b0,
            y: b1,
            z: b2
          } = b;
          return Math.abs(a0 - b0) <= epsilon * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= epsilon * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= epsilon * Math.max(1.0, Math.abs(a2), Math.abs(b2));
        }

        /**
         * @en Calculates the radian angle between two vectors
         * @zh 求两向量夹角弧度
         */
        static angle(a, b) {
          const magSqr1 = a.x * a.x + a.y * a.y + a.z * a.z;
          const magSqr2 = b.x * b.x + b.y * b.y + b.z * b.z;
          if (magSqr1 === 0 || magSqr2 === 0) {
            return 0.0;
          }
          const dot = a.x * b.x + a.y * b.y + a.z * b.z;
          let cosine = dot / Math.sqrt(magSqr1 * magSqr2);
          cosine = clamp(cosine, -1.0, 1.0);
          return Math.acos(cosine);
        }

        /**
         * @zh 计算 `a`、`b` 两向量之间的有符号夹角。
         *
         * 不妨假设 `a`、`b` 是钟表上的两根指针，其中 `a` 指向 12 点整，`normal` 是任何从钟表正面指出的向量。
         * 当 `b` **逆时针** 从 12 点走到 6 点的过程中，它们的角度变化范围为 (0°, 180°)；
         * 当 `b` **顺时针** 从 12 点走到 6 点的过程中，它们的角度变化范围为 (0°, -180°)。
         *
         * 反之，如果 `normal` 是任何从钟表反面指出的向量，两种范围将对调。
         *
         * @en Calculates the signed angle between the two vectors `a`, `b`.
         *
         * Suppose that `a` and `b` are two hands on a clock, where pointing at 12 o'clock,
         * and `normal` is arbitrary vector pointing out from the dial side of the clock.
         * As `b` goes counterclockwise from 12 o'clock to 6 o'clock, their angle varies in the range (0°, 180°);
         * As `b` goes clockwise from 12 o'clock to 6 o'clock, their angle varies in the range (0°, -180°).
         *
         * Instead, if `normal` is arbitrary vector pointing out from the opposite side of the clock,
         * the two ranges would swap.
         *
         * @param a @zh 向量 `a`。 @en The vector `a`.
         * @param b @zh 向量 `b`。 @en The vector `b`.
         * @param normal @zh 参考向量。 @en The reference vector.
         * @returns @zh 向量 `a` 和 `b` 之间的有符号夹角。 @en The signed angle between `a`, `b`.
         */

        /**
         * @en Calculates the projection vector on the specified plane
         * @zh 计算向量在指定平面上的投影
         * @param a projection vector
         * @param n the normal line of specified plane
         */
        static projectOnPlane(out, a, n) {
          return Vec3.subtract(out, a, Vec3.project(out, a, n));
        }

        /**
         * @en Calculates the projection on the specified vector
         * @zh 计算向量在指定向量上的投影
         * @param a projection vector
         * @param b target vector
         */
        static project(out, a, b) {
          const sqrLen = Vec3.lengthSqr(b);
          if (sqrLen < 0.000001) {
            return Vec3.set(out, 0, 0, 0);
          } else {
            return Vec3.multiplyScalar(out, b, Vec3.dot(a, b) / sqrLen);
          }
        }

        /**
         * @en Calculates a new position from current to target no more than `maxStep` distance.
         * @zh 计算一个新位置从当前位置移动不超过 `maxStep` 距离到目标位置。
         * @param current current position
         * @param target target position
         * @param maxStep maximum moving distance
         */
        static moveTowards(out, current, target, maxStep) {
          const deltaX = target.x - current.x;
          const deltaY = target.y - current.y;
          const deltaZ = target.z - current.z;
          const distanceSqr = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
          if (distanceSqr === 0 || maxStep >= 0 && distanceSqr < maxStep * maxStep) {
            out.x = target.x;
            out.y = target.y;
            out.z = target.z;
            return out;
          }
          const distance = Math.sqrt(distanceSqr);
          const scale = maxStep / distance;
          out.x = current.x + deltaX * scale;
          out.y = current.y + deltaY * scale;
          out.z = current.z + deltaZ * scale;
          return out;
        }

        /**
         * @zh 生成指定向量的一个正交单位向量。如果指定的向量 **精确地** 是零向量，则返回 **精确的** 零向量。
         * @en Generates an unit vector orthogonal to specified vector.
         * If the specified vector is **strictly** zero vector, the result is **strict** zero vector.
         * @param out @zh 生成的向量。@en The generated vector.
         * @param n @zh 输入向量。该向量 **不必** 是标准化的。 @en The input vector. **Need not** to be normalized.
         * @returns `out`
         */
        static generateOrthogonal(out, n) {
          const {
            x,
            y,
            z
          } = n;
          // 1. Drop the component with minimal magnitude.
          // 2. Negate one of the remain components.
          // 3. Swap the remain components.
          const absX = Math.abs(x);
          const absY = Math.abs(y);
          const absZ = Math.abs(z);
          if (absX < absY && absX < absZ) {
            Vec3.set(out, 0.0, z, -y);
          } else if (absY < absZ) {
            Vec3.set(out, z, 0.0, -x);
          } else {
            Vec3.set(out, y, -x, 0.0);
          }
          return Vec3.normalize(out, out);
        }

        /**
         * @en x component.
         * @zh x 分量。
         */

        /**
         * @en y component.
         * @zh y 分量。
         */

        /**
         * @en z component.
         * @zh z 分量。
         */

        constructor(x, y, z) {
          super();
          if (typeof x === 'object') {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
          } else {
            this.x = x || 0;
            this.y = y || 0;
            this.z = z || 0;
          }
        }

        /**
         * @en clone a Vec3 value
         * @zh 克隆当前向量。
         */
        clone() {
          return new Vec3(this.x, this.y, this.z);
        }

        /**
         * @en Set the current vector value with the given vector.
         * @zh 设置当前向量使其与指定向量相等。
         * @param other Specified vector
         * @returns `this`
         */

        /**
         * @en Set the value of each component of the current vector.
         * @zh 设置当前向量的具体分量值。
         * @param x x value
         * @param y y value
         * @param z z value
         * @returns `this`
         */

        set(x, y, z) {
          if (typeof x === 'object') {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
          } else {
            this.x = x || 0;
            this.y = y || 0;
            this.z = z || 0;
          }
          return this;
        }

        /**
         * @en Check whether the vector approximately equals another one.
         * @zh 判断当前向量是否在误差范围内与指定向量相等。
         * @param other Specified vector
         * @param epsilon The error allowed. It`s should be a non-negative number.
         * @returns Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
         */
        equals(other, epsilon = EPSILON) {
          return Math.abs(this.x - other.x) <= epsilon && Math.abs(this.y - other.y) <= epsilon && Math.abs(this.z - other.z) <= epsilon;
        }

        /**
         * @en Check whether the vector approximately equals another one.
         * @zh 判断当前向量是否在误差范围内与指定分量的向量相等。
         * @param x The x value of specified vector
         * @param y The y value of specified vector
         * @param z The z value of specified vector
         * @param epsilon The error allowed. It`s should be a non-negative number.
         * @returns Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
         */
        equals3f(x, y, z, epsilon = EPSILON) {
          return Math.abs(this.x - x) <= epsilon && Math.abs(this.y - y) <= epsilon && Math.abs(this.z - z) <= epsilon;
        }

        /**
         * @en Check whether the current vector strictly equals another Vec3.
         * @zh 判断当前向量是否与指定向量相等。
         * @param other specified vector
         * @returns Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
         */
        strictEquals(other) {
          return this.x === other.x && this.y === other.y && this.z === other.z;
        }

        /**
         * @en Check whether the current vector strictly equals another Vec3.
         * @zh 判断当前向量是否与指定分量的向量相等。
         * @param x The x value of specified vector
         * @param y The y value of specified vector
         * @param z The z value of specified vector
         * @returns Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
         */
        strictEquals3f(x, y, z) {
          return this.x === x && this.y === y && this.z === z;
        }

        /**
         * @en Transform to string with vector information.
         * @zh 返回当前向量的字符串表示。
         * @returns The string with vector information
         */
        toString() {
          return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
        }

        /**
         * @en Calculate linear interpolation result between this vector and another one with given ratio.
         * @zh 根据指定的插值比率，从当前向量到目标向量之间做插值。
         * @param to Target vector
         * @param ratio The interpolation coefficient.The range is [0,1].
         */
        lerp(to, ratio) {
          this.x += ratio * (to.x - this.x);
          this.y += ratio * (to.y - this.y);
          this.z += ratio * (to.z - this.z);
          return this;
        }

        /**
         * @en Adds the current vector with another one and return this
         * @zh 向量加法。将当前向量与指定向量的相加
         * @param other specified vector
         */
        add(other) {
          this.x += other.x;
          this.y += other.y;
          this.z += other.z;
          return this;
        }

        /**
         * @en Adds the current vector with another one and return this
         * @zh 向量加法。将当前向量与指定分量的向量相加
         * @param x The x value of specified vector
         * @param y The y value of specified vector
         * @param z The z value of specified vector
         */
        add3f(x, y, z) {
          this.x += x;
          this.y += y;
          this.z += z;
          return this;
        }

        /**
         * @en Subtracts one vector from this, and returns this.
         * @zh 向量减法。将当前向量减去指定向量的结果。
         * @param other specified vector
         */
        subtract(other) {
          this.x -= other.x;
          this.y -= other.y;
          this.z -= other.z;
          return this;
        }

        /**
         * @en Subtracts one vector from this, and returns this.
         * @zh 向量减法。将当前向量减去指定分量的向量
         * @param x The x value of specified vector
         * @param y The y value of specified vector
         * @param z The z value of specified vector
         */
        subtract3f(x, y, z) {
          this.x -= x;
          this.y -= y;
          this.z -= z;
          return this;
        }

        /**
         * @en Multiplies the current vector with a number, and returns this.
         * @zh 向量数乘。将当前向量数乘指定标量
         * @param scalar scalar number
         */
        multiplyScalar(scalar) {
          // TODO: can not use cc.warn, or will cause circular dependency.
          // eslint-disable-next-line no-console
          if (typeof scalar === 'object') {
            console.warn('should use Vec3.multiply for vector * vector operation');
          }
          this.x *= scalar;
          this.y *= scalar;
          this.z *= scalar;
          return this;
        }

        /**
         * @en Multiplies the current vector with another one and return this
         * @zh 向量乘法。将当前向量乘以与指定向量的结果赋值给当前向量。
         * @param other specified vector
         */
        multiply(other) {
          // TODO: can not use cc.warn, or will cause circular dependency.
          // eslint-disable-next-line no-console
          if (typeof other !== 'object') {
            console.warn('should use Vec3.scale for vector * scalar operation');
          }
          this.x *= other.x;
          this.y *= other.y;
          this.z *= other.z;
          return this;
        }

        /**
         * @en Multiplies the current vector with another one and return this
         * @zh 向量乘法。将当前向量与指定分量的向量相乘的结果赋值给当前向量。
         * @param x The x value of specified vector
         * @param y The y value of specified vector
         * @param z The z value of specified vector
         */
        multiply3f(x, y, z) {
          this.x *= x;
          this.y *= y;
          this.z *= z;
          return this;
        }

        /**
         * @en Element-wisely divides this vector with another one, and return this.
         * @zh 向量逐元素相除。将当前向量与指定分量的向量相除的结果赋值给当前向量。
         * @param other specified vector
         */
        divide(other) {
          this.x /= other.x;
          this.y /= other.y;
          this.z /= other.z;
          return this;
        }

        /**
         * @en Element-wisely divides this vector with another one, and return this.
         * @zh 向量逐元素相除。将当前向量与指定分量的向量相除的结果赋值给当前向量。
         * @param x The x value of specified vector
         * @param y The y value of specified vector
         * @param z The z value of specified vector
         */
        divide3f(x, y, z) {
          this.x /= x;
          this.y /= y;
          this.z /= z;
          return this;
        }

        /**
         * @en Sets each component of this vector with its negative value
         * @zh 将当前向量的各个分量取反
         */
        negative() {
          this.x = -this.x;
          this.y = -this.y;
          this.z = -this.z;
          return this;
        }

        /**
         * @en Clamp the vector between minInclusive and maxInclusive.
         * @zh 设置当前向量的值，使其各个分量都处于指定的范围内。
         * @param minInclusive Minimum value allowed
         * @param maxInclusive Maximum value allowed
         * @returns `this`
         */
        clampf(minInclusive, maxInclusive) {
          this.x = clamp(this.x, minInclusive.x, maxInclusive.x);
          this.y = clamp(this.y, minInclusive.y, maxInclusive.y);
          this.z = clamp(this.z, minInclusive.z, maxInclusive.z);
          return this;
        }

        /**
         * @en Calculates the dot product with another vector
         * @zh 向量点乘。
         * @param other specified vector
         * @returns The result of calculates the dot product with another vector
         */
        dot(other) {
          return this.x * other.x + this.y * other.y + this.z * other.z;
        }

        /**
         * @en Calculates the cross product with another vector.
         * @zh 向量叉乘。将当前向量左叉乘指定向量
         * @param other specified vector
         */
        cross(other) {
          const {
            x: ax,
            y: ay,
            z: az
          } = this;
          const {
            x: bx,
            y: by,
            z: bz
          } = other;
          this.x = ay * bz - az * by;
          this.y = az * bx - ax * bz;
          this.z = ax * by - ay * bx;
          return this;
        }

        /**
         * @en Returns the length of this vector.
         * @zh 计算向量的长度（模）。
         * @returns Length of vector
         */
        length() {
          return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        }

        /**
         * @en Returns the squared length of this vector.
         * @zh 计算向量长度（模）的平方。
         * @returns the squared length of this vector
         */
        lengthSqr() {
          return this.x * this.x + this.y * this.y + this.z * this.z;
        }

        /**
         * @en Normalize the current vector.
         * @zh 将当前向量归一化
         */
        normalize() {
          const x = this.x;
          const y = this.y;
          const z = this.z;
          let len = x * x + y * y + z * z;
          if (len > 0) {
            len = 1 / Math.sqrt(len);
            this.x = x * len;
            this.y = y * len;
            this.z = z * len;
          }
          return this;
        }

        /**
         * @en Transforms the vec3 with a mat4. 4th vector component is implicitly '1'
         * @zh 将当前向量视为 w 分量为 1 的四维向量，应用四维矩阵变换到当前矩阵
         * @param matrix matrix to transform with
         */
        transformMat4(matrix) {
          const x = this.x;
          const y = this.y;
          const z = this.z;
          let rhw = matrix.m03 * x + matrix.m07 * y + matrix.m11 * z + matrix.m15;
          rhw = rhw ? 1 / rhw : 1;
          this.x = (matrix.m00 * x + matrix.m04 * y + matrix.m08 * z + matrix.m12) * rhw;
          this.y = (matrix.m01 * x + matrix.m05 * y + matrix.m09 * z + matrix.m13) * rhw;
          this.z = (matrix.m02 * x + matrix.m06 * y + matrix.m10 * z + matrix.m14) * rhw;
          return this;
        }
      });
      _class = Vec3;
      Vec3.UNIT_X = Object.freeze(new _class(1, 0, 0));
      Vec3.UNIT_Y = Object.freeze(new _class(0, 1, 0));
      Vec3.UNIT_Z = Object.freeze(new _class(0, 0, 1));
      Vec3.RIGHT = Object.freeze(new _class(1, 0, 0));
      Vec3.UP = Object.freeze(new _class(0, 1, 0));
      Vec3.FORWARD = Object.freeze(new _class(0, 0, -1));
      // we use -z for view-dir
      Vec3.ZERO = Object.freeze(new _class(0, 0, 0));
      Vec3.ONE = Object.freeze(new _class(1, 1, 1));
      Vec3.NEG_ONE = Object.freeze(new _class(-1, -1, -1));
      Vec3.slerp = (() => {
        const cacheV1 = new _class();
        const cacheV2 = new _class();
        const cacheV3 = new _class();
        return (out, from, to, t) => {
          const EPSILON = 1e-5;
          const lenFrom = _class.len(from);
          const lenTo = _class.len(to);
          if (lenFrom < EPSILON || lenTo < EPSILON) {
            return _class.lerp(out, from, to, t);
          }
          const lenLerped = lerp(lenFrom, lenTo, t);
          const dot = _class.dot(from, to) / (lenFrom * lenTo);
          if (dot > 1.0 - EPSILON) {
            // If the directions are almost same, slerp should be close to lerp.
            return _class.lerp(out, from, to, t);
          } else if (dot < -1.0 + EPSILON) {
            // If the directions are almost opposite,
            // every vector that orthonormal to the directions can be the rotation axis.
            const fromNormalized = _class.multiplyScalar(cacheV1, from, 1.0 / lenFrom);
            const axis = _class.generateOrthogonal(cacheV2, fromNormalized);
            const angle = Math.PI * t;
            rotateAxisAngle(cacheV3, fromNormalized, axis, angle);
            _class.multiplyScalar(out, cacheV3, lenLerped);
            return out;
          } else {
            // Do not have to clamp. We done it before.
            const dotClamped = dot;
            const theta = Math.acos(dotClamped) * t;
            const fromNormalized = _class.multiplyScalar(cacheV1, from, 1.0 / lenFrom);
            const toNormalized = _class.multiplyScalar(cacheV2, to, 1.0 / lenTo);
            _class.scaleAndAdd(cacheV3, toNormalized, fromNormalized, -dotClamped);
            _class.normalize(cacheV3, cacheV3);
            _class.multiplyScalar(cacheV3, cacheV3, Math.sin(theta));
            _class.scaleAndAdd(cacheV3, cacheV3, fromNormalized, Math.cos(theta));
            _class.multiplyScalar(out, cacheV3, lenLerped);
            return out;
          }
        };
      })();
      Vec3.signedAngle = (() => {
        const cacheCross = new _class();
        return (a, b, normal) => {
          const angle = _class.angle(a, b);
          const cross = _class.cross(cacheCross, a, b);
          const dot = _class.dot(cross, normal);
          return dot < 0 ? -angle : angle;
        };
      })();
      CCClass.fastDefine('cc.Vec3', Vec3, {
        x: 0,
        y: 0,
        z: 0
      });
      legacyCC.Vec3 = Vec3;
      rotateAxisAngle = (() => {
        // TODO: can this cause v8 hidden class problem?
        const cacheQ = {
          x: 0.0,
          y: 0.0,
          z: 0.0,
          w: 0.0
        };
        return (out, input, axis, angle) => {
          // This should be equivalent to `Quat.fromAxisAngle(cacheQ, axis, angle)`.
          // Here we duplicate the code to avoid circular reference.

          const rad = angle * 0.5;
          const s = Math.sin(rad);
          cacheQ.x = s * axis.x;
          cacheQ.y = s * axis.y;
          cacheQ.z = s * axis.z;
          cacheQ.w = Math.cos(rad);
          Vec3.transformQuat(out, input, cacheQ);
          return out;
        };
      })();
      legacyCC.v3 = v3;
    }
  };
});