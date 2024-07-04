System.register("q-bundled:///fs/cocos/3d/misc/batch-utils.js", ["../framework/mesh-renderer.js", "../assets/mesh.js", "../../core/index.js"], function (_export, _context) {
  "use strict";

  var MeshRenderer, Mesh, Mat4, BatchingUtility;
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
  function checkMaterialisSame(comp1, comp2) {
    var matNum = comp1.sharedMaterials.length;
    if (matNum !== comp2.sharedMaterials.length) {
      return false;
    }
    for (var i = 0; i < matNum; i++) {
      if (comp1.getRenderMaterial(i) !== comp2.getRenderMaterial(i)) {
        return false;
      }
    }
    return true;
  }

  /**
   * @en Utility for 3d model static batching
   * @zh 服务于 3D 模型静态合批的工具类
   */
  return {
    setters: [function (_frameworkMeshRendererJs) {
      MeshRenderer = _frameworkMeshRendererJs.MeshRenderer;
    }, function (_assetsMeshJs) {
      Mesh = _assetsMeshJs.Mesh;
    }, function (_coreIndexJs) {
      Mat4 = _coreIndexJs.Mat4;
    }],
    execute: function () {
      _export("BatchingUtility", BatchingUtility = /*#__PURE__*/function () {
        function BatchingUtility() {}
        /**
         * @en
         * Collect the Models under `staticModelRoot`,
         * merge all the meshes statically into one (while disabling each component),
         * and attach it to a new Model on `batchedRoot`.
         * The world transform of each model is guaranteed to be preserved.
         *
         * For a more fine-grained control over the process, use `Mesh.merge` directly.
         * @zh
         * 在`staticModelRoot`下收集模型。
         * 将所有的网格静态地合并成一个（同时禁用每个组件）。
         * 并将其附加到 `batchedRoot` 上的一个新模型。
         * 每个模型的世界变换都被保证保留下来。
         * 如果要对这个过程进行更精细的控制，可以直接使用 `Mesh.merge`。
         * @param staticModelRoot root of all the static models to be batched
         * @param batchedRoot the target output node
         */
        BatchingUtility.batchStaticModel = function batchStaticModel(staticModelRoot, batchedRoot) {
          var models = staticModelRoot.getComponentsInChildren(MeshRenderer);
          if (models.length < 2) {
            console.error('the number of static models to batch is less than 2,it needn\'t batch.');
            return false;
          }
          for (var i = 1; i < models.length; i++) {
            if (!models[0].mesh.validateMergingMesh(models[i].mesh)) {
              console.error("the meshes of " + models[0].node.name + " and " + models[i].node.name + " can't be merged");
              return false;
            }
            if (!checkMaterialisSame(models[0], models[i])) {
              console.error("the materials of " + models[0].node.name + " and " + models[i].node.name + " can't be merged");
              return false;
            }
          }
          var batchedMesh = new Mesh();
          var worldMat = new Mat4();
          var rootWorldMatInv = new Mat4();
          staticModelRoot.getWorldMatrix(rootWorldMatInv);
          Mat4.invert(rootWorldMatInv, rootWorldMatInv);
          for (var _i = 0; _i < models.length; _i++) {
            var comp = models[_i];
            comp.node.getWorldMatrix(worldMat);
            Mat4.multiply(worldMat, rootWorldMatInv, worldMat);
            batchedMesh.merge(models[_i].mesh, worldMat);
            comp.enabled = false;
          }
          var batchedModel = batchedRoot.addComponent(MeshRenderer);
          batchedModel.mesh = batchedMesh;
          batchedModel.sharedMaterials = models[0].sharedMaterials;
          return true;
        }

        /**
         * @en
         * Undoes everything `batchStaticModel` did.
         * @zh
         * 回退 `batchStaticModel` 做的工作
         *
         * @param staticModelRoot root of all the static models to be batched
         * @param batchedRoot the target output node
         */;
        BatchingUtility.unbatchStaticModel = function unbatchStaticModel(staticModelRoot, batchedRoot) {
          var models = staticModelRoot.getComponentsInChildren(MeshRenderer);
          for (var i = 0; i < models.length; i++) {
            var comp = models[i];
            comp.enabled = true;
          }
          var batchedModel = batchedRoot.getComponent(MeshRenderer);
          if (batchedModel) {
            if (batchedModel.mesh) {
              batchedModel.mesh.destroyRenderingMesh();
            }
            batchedModel.destroy();
          }
          return true;
        };
        return BatchingUtility;
      }());
    }
  };
});