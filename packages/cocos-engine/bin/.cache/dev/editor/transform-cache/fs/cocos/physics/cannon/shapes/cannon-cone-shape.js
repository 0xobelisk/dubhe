System.register("q-bundled:///fs/cocos/physics/cannon/shapes/cannon-cone-shape.js", ["@cocos/cannon", "../../../core/index.js", "./cannon-shape.js", "../../framework/physics-enum.js", "../cannon-util.js"], function (_export, _context) {
  "use strict";

  var CANNON, Vec3, CannonShape, EAxisDirection, commitShapeUpdates, CannonConeShape, v3_0, v3_1;
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
  _export("CannonConeShape", void 0);
  return {
    setters: [function (_cocosCannon) {
      CANNON = _cocosCannon.default;
    }, function (_coreIndexJs) {
      Vec3 = _coreIndexJs.Vec3;
    }, function (_cannonShapeJs) {
      CannonShape = _cannonShapeJs.CannonShape;
    }, function (_frameworkPhysicsEnumJs) {
      EAxisDirection = _frameworkPhysicsEnumJs.EAxisDirection;
    }, function (_cannonUtilJs) {
      commitShapeUpdates = _cannonUtilJs.commitShapeUpdates;
    }],
    execute: function () {
      v3_0 = new Vec3();
      v3_1 = new Vec3();
      _export("CannonConeShape", CannonConeShape = class CannonConeShape extends CannonShape {
        get collider() {
          return this._collider;
        }
        get impl() {
          return this._shape;
        }
        setRadius(v) {
          this.updateProperties(this.collider.radius, this.collider.height, CANNON.CC_CONFIG.numSegmentsCone, this.collider.direction, this.collider.node.worldScale);
          if (this._index !== -1) commitShapeUpdates(this._body);
        }
        setHeight(v) {
          this.updateProperties(this.collider.radius, this.collider.height, CANNON.CC_CONFIG.numSegmentsCone, this.collider.direction, this.collider.node.worldScale);
          if (this._index !== -1) commitShapeUpdates(this._body);
        }
        setDirection(v) {
          this.updateProperties(this.collider.radius, this.collider.height, CANNON.CC_CONFIG.numSegmentsCone, this.collider.direction, this.collider.node.worldScale);
          if (this._index !== -1) commitShapeUpdates(this._body);
        }
        constructor(radius = 0.5, height = 1, direction = EAxisDirection.Y_AXIS) {
          super();
          this._shape = new CANNON.Cylinder(0, radius, height, CANNON.CC_CONFIG.numSegmentsCone, direction === EAxisDirection.Y_AXIS);
        }
        onLoad() {
          super.onLoad();
          this.setRadius(this.collider.radius);
        }
        setScale(scale) {
          super.setScale(scale);
          this.setRadius(this.collider.radius);
        }
        updateProperties(radius, height, numSegments, direction, scale) {
          let wh = height;
          let wr = radius;
          const cos = Math.cos;
          const sin = Math.sin;
          const abs = Math.abs;
          const max = Math.max;
          if (direction === 1) {
            wh = abs(scale.y) * height;
            wr = max(abs(scale.x), abs(scale.z)) * radius;
          } else if (direction === 2) {
            wh = abs(scale.z) * height;
            wr = max(abs(scale.x), abs(scale.y)) * radius;
          } else {
            wh = abs(scale.x) * height;
            wr = max(abs(scale.y), abs(scale.z)) * radius;
          }
          const N = numSegments;
          const hH = wh / 2;
          const vertices = [];
          const indices = [];
          const axes = [];
          const theta = Math.PI * 2 / N;
          if (direction === 1) {
            const bf = [];
            indices.push(bf);
            vertices.push(new CANNON.Vec3(0, hH, 0));
            for (let i = 0; i < N; i++) {
              const x = wr * cos(theta * i);
              const z = wr * sin(theta * i);
              vertices.push(new CANNON.Vec3(x, -hH, z));
            }
            for (let i = 0; i < N; i++) {
              if (i !== 0) bf.push(i);
              let face;
              if (i < N - 1) {
                face = [0, i + 2, i + 1];
              } else {
                face = [0, 1, i + 1];
              }
              indices.push(face);
              Vec3.subtract(v3_0, vertices[0], vertices[face[1]]);
              Vec3.subtract(v3_1, vertices[face[2]], vertices[face[1]]);
              Vec3.cross(v3_0, v3_1, v3_0);
              v3_0.normalize();
              axes.push(new CANNON.Vec3(v3_0.x, v3_0.y, v3_0.z));
            }
            axes.push(new CANNON.Vec3(0, -1, 0));
          } else if (direction === 2) {
            const bf = [];
            indices.push(bf);
            vertices.push(new CANNON.Vec3(0, 0, hH));
            for (let i = 0; i < N; i++) {
              const x = wr * cos(theta * i);
              const y = wr * sin(theta * i);
              vertices.push(new CANNON.Vec3(x, y, -hH));
            }
            for (let i = 0; i < N; i++) {
              if (i !== 0) bf.push(N - i);
              let face;
              if (i < N - 1) {
                face = [0, i + 1, i + 2];
              } else {
                face = [0, i + 1, 1];
              }
              indices.push(face);
              Vec3.subtract(v3_0, vertices[0], vertices[face[1]]);
              Vec3.subtract(v3_1, vertices[face[2]], vertices[face[1]]);
              Vec3.cross(v3_0, v3_0, v3_1);
              v3_0.normalize();
              axes.push(new CANNON.Vec3(v3_0.x, v3_0.y, v3_0.z));
            }
            axes.push(new CANNON.Vec3(0, 0, -1));
          } else {
            const bf = [];
            indices.push(bf);
            vertices.push(new CANNON.Vec3(hH, 0, 0));
            for (let i = 0; i < N; i++) {
              const y = wr * cos(theta * i);
              const z = wr * sin(theta * i);
              vertices.push(new CANNON.Vec3(-hH, y, z));
            }
            for (let i = 0; i < N; i++) {
              if (i !== 0) bf.push(N - i);
              let face;
              if (i < N - 1) {
                face = [0, i + 1, i + 2];
              } else {
                face = [0, i + 1, 1];
              }
              indices.push(face);
              Vec3.subtract(v3_0, vertices[0], vertices[face[1]]);
              Vec3.subtract(v3_1, vertices[face[2]], vertices[face[1]]);
              Vec3.cross(v3_0, v3_0, v3_1);
              v3_0.normalize();
              axes.push(new CANNON.Vec3(v3_0.x, v3_0.y, v3_0.z));
            }
            axes.push(new CANNON.Vec3(-1, 0, 0));
          }
          this.impl.vertices = vertices;
          this.impl.faces = indices;
          this.impl.uniqueAxes = axes;
          this.impl.worldVerticesNeedsUpdate = true;
          this.impl.worldFaceNormalsNeedsUpdate = true;
          this.impl.computeNormals();
          this.impl.computeEdges();
          this.impl.updateBoundingSphereRadius();
        }
      });
    }
  };
});