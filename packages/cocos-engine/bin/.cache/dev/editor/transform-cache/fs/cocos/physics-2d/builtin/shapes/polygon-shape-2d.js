System.register("q-bundled:///fs/cocos/physics-2d/builtin/shapes/polygon-shape-2d.js", ["./shape-2d.js", "../../../core/index.js", "../intersection-2d.js"], function (_export, _context) {
  "use strict";

  var BuiltinShape2D, Vec2, Intersection2D, BuiltinPolygonShape, tempVec2;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                            
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
  _export("BuiltinPolygonShape", void 0);
  return {
    setters: [function (_shape2dJs) {
      BuiltinShape2D = _shape2dJs.BuiltinShape2D;
    }, function (_coreIndexJs) {
      Vec2 = _coreIndexJs.Vec2;
    }, function (_intersection2dJs) {
      Intersection2D = _intersection2dJs.default;
    }],
    execute: function () {
      tempVec2 = new Vec2();
      _export("BuiltinPolygonShape", BuiltinPolygonShape = class BuiltinPolygonShape extends BuiltinShape2D {
        constructor(...args) {
          super(...args);
          this._worldPoints = [];
        }
        get worldPoints() {
          return this._worldPoints;
        }
        update() {
          const aabb = this._worldAabb;
          const collider = this.collider;
          const points = collider.points;
          const offset = collider.offset;
          const worldMatrix = collider.node.worldMatrix;
          const worldPoints = this._worldPoints;
          worldPoints.length = points.length;
          let minx = 1e6;
          let miny = 1e6;
          let maxx = -1e6;
          let maxy = -1e6;
          for (let i = 0, l = points.length; i < l; i++) {
            if (!worldPoints[i]) {
              worldPoints[i] = new Vec2();
            }
            tempVec2.x = points[i].x + offset.x;
            tempVec2.y = points[i].y + offset.y;
            Vec2.transformMat4(tempVec2, tempVec2, worldMatrix);
            const x = tempVec2.x;
            const y = tempVec2.y;
            worldPoints[i].x = x;
            worldPoints[i].y = y;
            if (x > maxx) maxx = x;
            if (x < minx) minx = x;
            if (y > maxy) maxy = y;
            if (y < miny) miny = y;
          }
          aabb.x = minx;
          aabb.y = miny;
          aabb.width = maxx - minx;
          aabb.height = maxy - miny;
        }
        containsPoint(p) {
          if (!this.worldAABB.contains(p)) {
            return false;
          }
          return Intersection2D.pointInPolygon(p, this.worldPoints);
        }
        intersectsRect(rect) {
          if (!this.worldAABB.intersects(rect)) {
            return false;
          }
          return Intersection2D.rectPolygon(rect, this.worldPoints);
        }
      });
    }
  };
});