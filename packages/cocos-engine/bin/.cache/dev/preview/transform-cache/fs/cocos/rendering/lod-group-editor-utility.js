System.register("q-bundled:///fs/cocos/rendering/lod-group-editor-utility.js", ["../core/index.js", "../render-scene/scene/index.js", "../render-scene/index.js"], function (_export, _context) {
  "use strict";

  var Vec3, assertIsTrue, CameraProjection, scene, LODGroupEditorUtility;
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
  return {
    setters: [function (_coreIndexJs) {
      Vec3 = _coreIndexJs.Vec3;
      assertIsTrue = _coreIndexJs.assertIsTrue;
    }, function (_renderSceneSceneIndexJs) {
      CameraProjection = _renderSceneSceneIndexJs.CameraProjection;
    }, function (_renderSceneIndexJs) {
      scene = _renderSceneIndexJs.scene;
    }],
    execute: function () {
      _export("LODGroupEditorUtility", LODGroupEditorUtility = /*#__PURE__*/function () {
        function LODGroupEditorUtility() {}
        /**
         * @en Get the lod level used under the current camera, -1 indicates no lod is used.
         * @zh 获取当前摄像机下，使用哪一级的LOD，-1 表示没有lod被使用
         * @param lodGroup current LOD Group component.
         * @param camera current perspective camera.
         * @returns visible LOD index in lodGroup.
         */
        LODGroupEditorUtility.getVisibleLOD = function getVisibleLOD(lodGroup, camera) {
          var screenOccupancyPercentage = this.getRelativeHeight(lodGroup, camera) || 0;
          var lodIndex = -1;
          for (var i = 0; i < lodGroup.lodCount; ++i) {
            var lod = lodGroup.getLOD(i);
            if (lod && screenOccupancyPercentage >= lod.screenUsagePercentage) {
              lodIndex = i;
              break;
            }
          }
          return lodIndex;
        }

        /**
         * @en Get the percentage of objects used on the screen under the current camera.
         * @zh 获取当前摄像机下，物体在屏幕上的占用比率
         * @param lodGroup current LOD Group component
         * @param camera current perspective camera
         * @returns height of current lod group relative to camera position in screen space, aka. relativeHeight
         */;
        LODGroupEditorUtility.getRelativeHeight = function getRelativeHeight(lodGroup, camera) {
          if (!lodGroup.node) return null;
          var distance;
          if (camera.projectionType === scene.CameraProjection.PERSPECTIVE) {
            distance = Vec3.len(lodGroup.localBoundaryCenter.transformMat4(lodGroup.node.worldMatrix).subtract(camera.node.position));
          }
          return this.distanceToRelativeHeight(camera, distance, this.getWorldSpaceSize(lodGroup));
        };
        LODGroupEditorUtility.distanceToRelativeHeight = function distanceToRelativeHeight(camera, distance, size) {
          if (camera.projectionType === CameraProjection.PERSPECTIVE) {
            assertIsTrue(typeof distance === 'number', 'distance must be present for perspective projection');
            return size * camera.matProj.m05 / (distance * 2.0); // note: matProj.m05 is 1 / tan(fov / 2.0)
          } else {
            return size * camera.matProj.m05 * 0.5;
          }
        };
        LODGroupEditorUtility.relativeHeightToDistance = function relativeHeightToDistance(camera, relativeHeight, size) {
          assertIsTrue(camera.projectionType === CameraProjection.PERSPECTIVE, 'Camera type must be perspective.');
          return size * camera.matProj.m05 / (relativeHeight * 2.0); // note: matProj.m05 is 1 / tan(fov / 2.0)
        };
        LODGroupEditorUtility.getWorldSpaceSize = function getWorldSpaceSize(lodGroup) {
          var scale = lodGroup.node.scale;
          var maxScale = Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
          return maxScale * lodGroup.objectSize;
        };
        return LODGroupEditorUtility;
      }());
    }
  };
});