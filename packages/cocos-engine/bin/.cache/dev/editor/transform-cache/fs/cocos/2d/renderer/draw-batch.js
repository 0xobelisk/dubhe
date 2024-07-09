System.register("q-bundled:///fs/cocos/2d/renderer/draw-batch.js", ["../../scene-graph/layers.js", "../../core/index.js", "../../render-scene/core/pass.js"], function (_export, _context) {
  "use strict";

  var Layers, cclegacy, Pass, DrawBatch2D, UI_VIS_FLAG;
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
  _export("DrawBatch2D", void 0);
  return {
    setters: [function (_sceneGraphLayersJs) {
      Layers = _sceneGraphLayersJs.Layers;
    }, function (_coreIndexJs) {
      cclegacy = _coreIndexJs.cclegacy;
    }, function (_renderSceneCorePassJs) {
      Pass = _renderSceneCorePassJs.Pass;
    }],
    execute: function () {
      UI_VIS_FLAG = Layers.Enum.NONE | Layers.Enum.UI_3D;
      _export("DrawBatch2D", DrawBatch2D = class DrawBatch2D {
        constructor() {
          // public bufferBatch: MeshBuffer | null = null; // use less
          // public camera: Camera | null = null; // use less
          // public renderScene: RenderScene | null = null; // use less for now
          this.model = null;
          // for uimodel
          this.texture = null;
          this.sampler = null;
          this.useLocalData = null;
          this.isStatic = false;
          // use less,remove when remove Static batch
          this.textureHash = 0;
          this.samplerHash = 0;
          this._passes = [];
          this._shaders = [];
          this._visFlags = UI_VIS_FLAG;
          this._inputAssembler = null;
          this._descriptorSet = null;
        }
        get inputAssembler() {
          return this._inputAssembler;
        }
        set inputAssembler(ia) {
          this._inputAssembler = ia;
        }
        get descriptorSet() {
          return this._descriptorSet;
        }
        set descriptorSet(ds) {
          this._descriptorSet = ds;
        }
        get visFlags() {
          return this._visFlags;
        }
        set visFlags(vis) {
          this._visFlags = vis;
        }
        get passes() {
          return this._passes;
        }
        get shaders() {
          return this._shaders;
        }
        //private declare _nativeObj: any;

        destroy(ui) {
          this._passes = [];
        }
        clear() {
          // this.bufferBatch = null;
          this._inputAssembler = null;
          this._descriptorSet = null;
          // this.camera = null;
          this.texture = null;
          this.sampler = null;
          this.textureHash = 0;
          this.samplerHash = 0;
          this.model = null;
          this.isStatic = false;
          this.useLocalData = null;
          this.visFlags = UI_VIS_FLAG;
          // this.renderScene = null;
        }

        // object version
        fillPasses(mat, dss, dssHash, patches) {
          if (mat) {
            const passes = mat.passes;
            if (!passes) {
              return;
            }
            const hashFactor = 0;
            let dirty = false;
            this._shaders.length = passes.length;
            for (let i = 0; i < passes.length; i++) {
              if (!this._passes[i]) {
                this._passes[i] = new Pass(cclegacy.director.root);
              }
              const mtlPass = passes[i];
              const passInUse = this._passes[i];
              mtlPass.update();

              // Hack: Cause pass.hash can not check all pass value
              if (!dss) {
                dss = mtlPass.depthStencilState;
                dssHash = 0;
              }
              passInUse._initPassFromTarget(mtlPass, dss, dssHash);
              this._shaders[i] = passInUse.getShaderVariant(patches);
              dirty = true;
            }
          }
        }
      });
    }
  };
});