System.register("q-bundled:///fs/cocos/core/geometry/distance.js", ["../math/index.js"], function (_export, _context) {
  "use strict";

  var Vec3, X, Y, Z, d, min, max, u, e;
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
   * @en
   * Calculates the distance between a point and a plane.
   * @zh
   * 计算点和平面之间的距离。
   * @param point @en The target point. @zh 目标点。
   * @param plane @en The target plane. @zh 目标平面。
   * @returns @en The distance between the point and the plane. @zh 点和平面之间的距离。
   */
  function point_plane(point, plane_) {
    return Vec3.dot(plane_.n, point) - plane_.d;
  }

  /**
   * @en
   * Calculates the closest point on a plane to a given point.
   * @zh
   * 计算平面上最接近给定点的点。
   * @param out @en The closest point. @zh 最近点。
   * @param point @en The given point. @zh 给定点。
   * @param plane @en The target plane. @zh 平面。
   * @returns @en The result of the closest point, same as the `out` parameter. @zh 存储最近点的向量，与 `out` 参数为同一个对象。
   */
  function pt_point_plane(out, point, plane_) {
    const t = point_plane(point, plane_);
    return Vec3.subtract(out, point, Vec3.multiplyScalar(out, plane_.n, t));
  }

  /**
   * @en
   * Calculates the closest point on an AABB to a given point.
   * @zh
   * 计算 AABB 上最接近给定点的点。
   * @param out @en The closest point. @zh 最近点。
   * @param point @en The given point @zh 给定点。
   * @param aabb @en The target AABB to calculate. @zh 参与计算的 AABB 实例。
   * @returns @en The result of the closest point, same as the `out` parameter. @zh 存储最近点的向量，与 `out` 参数为同一个对象。
   */
  function pt_point_aabb(out, point, aabb_) {
    Vec3.copy(out, point);
    Vec3.subtract(min, aabb_.center, aabb_.halfExtents);
    Vec3.add(max, aabb_.center, aabb_.halfExtents);
    out.x = out.x < min.x ? min.x : out.x;
    out.y = out.y < min.y ? min.y : out.y;
    out.z = out.z < min.z ? min.z : out.z;
    out.x = out.x > max.x ? max.x : out.x;
    out.y = out.y > max.y ? max.y : out.y;
    out.z = out.z > max.z ? max.z : out.z;
    return out;
  }

  /**
   * @en
   * Calculates the closest point on an OBB to a given point.
   * @zh
   * 计算 OBB 上最接近给定点的点。
   * @param out @en The closest point. @zh 最近点。
   * @param point @en The given point. @zh 给定点。
   * @param obb @en The target OBB to calculate. @zh 参与计算的 OBB 实例。
   * @returns @en The result of the closest point, same as the `out` parameter. @zh 存储最近点的向量，与 `out` 参数为同一个对象。
   */
  function pt_point_obb(out, point, obb_) {
    Vec3.set(X, obb_.orientation.m00, obb_.orientation.m01, obb_.orientation.m02);
    Vec3.set(Y, obb_.orientation.m03, obb_.orientation.m04, obb_.orientation.m05);
    Vec3.set(Z, obb_.orientation.m06, obb_.orientation.m07, obb_.orientation.m08);
    u[0] = X;
    u[1] = Y;
    u[2] = Z;
    e[0] = obb_.halfExtents.x;
    e[1] = obb_.halfExtents.y;
    e[2] = obb_.halfExtents.z;
    Vec3.subtract(d, point, obb_.center);

    // Start result at center of obb; make steps from there
    Vec3.set(out, obb_.center.x, obb_.center.y, obb_.center.z);

    // For each OBB axis...
    for (let i = 0; i < 3; i++) {
      // ...project d onto that axis to get the distance
      // along the axis of d from the obb center
      let dist = Vec3.dot(d, u[i]);

      // if distance farther than the obb extents, clamp to the obb
      if (dist > e[i]) {
        dist = e[i];
      }
      if (dist < -e[i]) {
        dist = -e[i];
      }

      // Step that distance along the axis to get world coordinate
      out.x += dist * u[i].x;
      out.y += dist * u[i].y;
      out.z += dist * u[i].z;
    }
    return out;
  }

  /**
   * @en
   * Calculates the closest point on the line, which is from A to B, to the given point.
   * @zh
   * 计算给定点距离线段 AB 上最近的一点。
   * @param out @en The closest point. @zh 最近点。
   * @param point @en The given point. @zh 给定点
   * @param linePointA @en Point A on the line. @zh 线上的某点 A。
   * @param linePointB @en Point B on the line. @zh 线上的某点 B。
   */
  function pt_point_line(out, point, linePointA, linePointB) {
    Vec3.subtract(X, linePointA, linePointB);
    const dir = X.clone();
    const dirSquaredLength = Vec3.lengthSqr(dir);
    if (dirSquaredLength === 0) {
      // The point is at the segment start.
      Vec3.copy(out, linePointA);
    } else {
      // Calculate the projection of the point onto the line extending through the segment.
      Vec3.subtract(X, point, linePointA);
      const t = Vec3.dot(X, dir) / dirSquaredLength;
      if (t < 0) {
        // The point projects beyond the segment start.
        Vec3.copy(out, linePointA);
      } else if (t > 1) {
        // The point projects beyond the segment end.
        Vec3.copy(out, linePointB);
      } else {
        // The point projects between the start and end of the segment.
        Vec3.scaleAndAdd(out, linePointA, dir, t);
      }
    }
  }
  _export({
    point_plane: point_plane,
    pt_point_plane: pt_point_plane,
    pt_point_aabb: pt_point_aabb,
    pt_point_obb: pt_point_obb,
    pt_point_line: pt_point_line
  });
  return {
    setters: [function (_mathIndexJs) {
      Vec3 = _mathIndexJs.Vec3;
    }],
    execute: function () {
      X = new Vec3();
      Y = new Vec3();
      Z = new Vec3();
      d = new Vec3();
      min = new Vec3();
      max = new Vec3();
      u = new Array(3);
      e = new Array(3);
    }
  };
});