System.register("q-bundled:///fs/cocos/rendering/forward/forward-stage.js", ["../../core/data/decorators/index.js", "../define.js", "../pass-phase.js", "../render-queue.js", "../../gfx/index.js", "../render-instanced-queue.js", "../render-stage.js", "../enum.js", "../render-additive-light-queue.js", "../../render-scene/core/pass.js", "../pipeline-serialization.js", "../planar-shadow-queue.js", "../ui-phase.js", "../pipeline-funcs.js"], function (_export, _context) {
  "use strict";

  var ccclass, displayOrder, type, serializable, SetIndex, getPhaseID, renderQueueClearFunc, convertRenderQueue, renderQueueSortFunc, ClearFlagBit, Color, Rect, RenderInstancedQueue, RenderStage, ForwardStagePriority, RenderAdditiveLightQueue, BatchingSchemes, RenderQueueDesc, RenderQueueSortMode, PlanarShadowQueue, UIPhase, renderProfiler, _dec, _dec2, _dec3, _class, _class2, _initializer, _class3, colors, ForwardStage;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function _applyDecoratedInitializer(target, property, decorators, initializer) {
    return decorators.slice().reverse().reduce(function (decoratedInitializer, decorator) {
      return decorator(target, property, decoratedInitializer) || decoratedInitializer;
    }, initializer);
  }
  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }
  return {
    setters: [function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
      displayOrder = _coreDataDecoratorsIndexJs.displayOrder;
      type = _coreDataDecoratorsIndexJs.type;
      serializable = _coreDataDecoratorsIndexJs.serializable;
    }, function (_defineJs) {
      SetIndex = _defineJs.SetIndex;
    }, function (_passPhaseJs) {
      getPhaseID = _passPhaseJs.getPhaseID;
    }, function (_renderQueueJs) {
      renderQueueClearFunc = _renderQueueJs.renderQueueClearFunc;
      convertRenderQueue = _renderQueueJs.convertRenderQueue;
      renderQueueSortFunc = _renderQueueJs.renderQueueSortFunc;
    }, function (_gfxIndexJs) {
      ClearFlagBit = _gfxIndexJs.ClearFlagBit;
      Color = _gfxIndexJs.Color;
      Rect = _gfxIndexJs.Rect;
    }, function (_renderInstancedQueueJs) {
      RenderInstancedQueue = _renderInstancedQueueJs.RenderInstancedQueue;
    }, function (_renderStageJs) {
      RenderStage = _renderStageJs.RenderStage;
    }, function (_enumJs) {
      ForwardStagePriority = _enumJs.ForwardStagePriority;
    }, function (_renderAdditiveLightQueueJs) {
      RenderAdditiveLightQueue = _renderAdditiveLightQueueJs.RenderAdditiveLightQueue;
    }, function (_renderSceneCorePassJs) {
      BatchingSchemes = _renderSceneCorePassJs.BatchingSchemes;
    }, function (_pipelineSerializationJs) {
      RenderQueueDesc = _pipelineSerializationJs.RenderQueueDesc;
      RenderQueueSortMode = _pipelineSerializationJs.RenderQueueSortMode;
    }, function (_planarShadowQueueJs) {
      PlanarShadowQueue = _planarShadowQueueJs.PlanarShadowQueue;
    }, function (_uiPhaseJs) {
      UIPhase = _uiPhaseJs.UIPhase;
    }, function (_pipelineFuncsJs) {
      renderProfiler = _pipelineFuncsJs.renderProfiler;
    }],
    execute: function () {
      colors = [new Color(0, 0, 0, 1)];
      /**
       * @en The forward render stage
       * @zh 前向渲染阶段。
       */
      _export("ForwardStage", ForwardStage = (_dec = ccclass('ForwardStage'), _dec2 = type([RenderQueueDesc]), _dec3 = displayOrder(2), _dec(_class = (_class2 = (_class3 = class ForwardStage extends RenderStage {
        constructor() {
          super();
          this.renderQueues = _initializer && _initializer();
          this._renderQueues = [];
          this._renderArea = new Rect();
          this._instancedQueue = void 0;
          this._phaseID = getPhaseID('default');
          this._clearFlag = 0xffffffff;
          this.additiveInstanceQueues = [];
          this._instancedQueue = new RenderInstancedQueue();
          this._uiPhase = new UIPhase();
        }
        addRenderInstancedQueue(queue) {
          if (this.additiveInstanceQueues.includes(queue)) {
            return;
          }
          this.additiveInstanceQueues.push(queue);
        }
        removeRenderInstancedQueue(queue) {
          const index = this.additiveInstanceQueues.indexOf(queue);
          if (index > -1) {
            this.additiveInstanceQueues.splice(index, 1);
          }
        }
        initialize(info) {
          super.initialize(info);
          if (info.renderQueues) {
            this.renderQueues = info.renderQueues;
          }
          return true;
        }
        activate(pipeline, flow) {
          super.activate(pipeline, flow);
          for (let i = 0; i < this.renderQueues.length; i++) {
            this._renderQueues[i] = convertRenderQueue(this.renderQueues[i]);
          }
          this._additiveLightQueue = new RenderAdditiveLightQueue(this._pipeline);
          this._planarQueue = new PlanarShadowQueue(this._pipeline);
          this._uiPhase.activate(pipeline);
        }
        destroy() {
          // do nothing
        }
        render(camera) {
          var _camera$geometryRende;
          this._instancedQueue.clear();
          const pipeline = this._pipeline;
          const device = pipeline.device;
          this._renderQueues.forEach(renderQueueClearFunc);
          const renderObjects = pipeline.pipelineSceneData.renderObjects;
          let m = 0;
          let p = 0;
          let k = 0;
          for (let i = 0; i < renderObjects.length; ++i) {
            const ro = renderObjects[i];
            const subModels = ro.model.subModels;
            for (m = 0; m < subModels.length; ++m) {
              const subModel = subModels[m];
              const passes = subModel.passes;
              for (p = 0; p < passes.length; ++p) {
                const pass = passes[p];
                if (pass.phase !== this._phaseID) continue;
                const batchingScheme = pass.batchingScheme;
                if (batchingScheme === BatchingSchemes.INSTANCING) {
                  const instancedBuffer = pass.getInstancedBuffer();
                  instancedBuffer.merge(subModel, p);
                  this._instancedQueue.queue.add(instancedBuffer);
                } else {
                  for (k = 0; k < this._renderQueues.length; k++) {
                    this._renderQueues[k].insertRenderPass(ro, m, p);
                  }
                }
              }
            }
          }
          this._instancedQueue.sort();
          this._renderQueues.forEach(renderQueueSortFunc);
          const cmdBuff = pipeline.commandBuffers[0];
          pipeline.pipelineUBO.updateShadowUBO(camera);
          for (let i = 0; i < this.additiveInstanceQueues.length; i++) {
            this.additiveInstanceQueues[i].uploadBuffers(cmdBuff);
          }
          this._instancedQueue.uploadBuffers(cmdBuff);
          this._additiveLightQueue.gatherLightPasses(camera, cmdBuff);
          this._planarQueue.gatherShadowPasses(camera, cmdBuff);
          if (camera.clearFlag & ClearFlagBit.COLOR) {
            colors[0].x = camera.clearColor.x;
            colors[0].y = camera.clearColor.y;
            colors[0].z = camera.clearColor.z;
            colors[0].w = camera.clearColor.w;
          }
          pipeline.generateRenderArea(camera, this._renderArea);
          const framebuffer = camera.window.framebuffer;
          const renderPass = pipeline.getRenderPass(camera.clearFlag & this._clearFlag, framebuffer);
          cmdBuff.beginRenderPass(renderPass, framebuffer, this._renderArea, colors, camera.clearDepth, camera.clearStencil);
          cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);
          this._renderQueues[0].recordCommandBuffer(device, renderPass, cmdBuff);
          for (let i = 0; i < this.additiveInstanceQueues.length; i++) {
            this.additiveInstanceQueues[i].recordCommandBuffer(device, renderPass, cmdBuff);
          }
          this._instancedQueue.recordCommandBuffer(device, renderPass, cmdBuff);
          this._additiveLightQueue.recordCommandBuffer(device, renderPass, cmdBuff);
          cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);
          this._planarQueue.recordCommandBuffer(device, renderPass, cmdBuff);
          this._renderQueues[1].recordCommandBuffer(device, renderPass, cmdBuff);
          (_camera$geometryRende = camera.geometryRenderer) === null || _camera$geometryRende === void 0 ? void 0 : _camera$geometryRende.render(renderPass, cmdBuff, pipeline.pipelineSceneData);
          this._uiPhase.render(camera, renderPass);
          renderProfiler(device, renderPass, cmdBuff, pipeline.profiler, camera);
          cmdBuff.endRenderPass();
        }
      }, _class3.initInfo = {
        name: 'ForwardStage',
        priority: ForwardStagePriority.FORWARD,
        tag: 0,
        renderQueues: [{
          isTransparent: false,
          sortMode: RenderQueueSortMode.FRONT_TO_BACK,
          stages: ['default']
        }, {
          isTransparent: true,
          sortMode: RenderQueueSortMode.BACK_TO_FRONT,
          stages: ['default', 'planarShadow']
        }]
      }, _class3), (_initializer = _applyDecoratedInitializer(_class2.prototype, "renderQueues", [_dec2, serializable, _dec3], function () {
        return [];
      })), _class2)) || _class));
    }
  };
});