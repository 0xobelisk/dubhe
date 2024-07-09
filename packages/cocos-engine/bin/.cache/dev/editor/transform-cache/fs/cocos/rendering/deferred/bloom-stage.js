System.register("q-bundled:///fs/cocos/rendering/deferred/bloom-stage.js", ["../../core/data/decorators/index.js", "../define.js", "../../asset/assets/material.js", "../../gfx/index.js", "../pipeline-state-manager.js", "../render-stage.js", "../enum.js", "../render-pipeline.js", "./deferred-pipeline-scene-data.js"], function (_export, _context) {
  "use strict";

  var ccclass, displayOrder, serializable, type, SetIndex, Material, BufferInfo, BufferUsageBit, ClearFlagBit, Color, MemoryUsageBit, Rect, PipelineStateManager, RenderStage, CommonStagePriority, MAX_BLOOM_FILTER_PASS_NUM, BLOOM_COMBINEPASS_INDEX, BLOOM_DOWNSAMPLEPASS_INDEX, BLOOM_PREFILTERPASS_INDEX, BLOOM_UPSAMPLEPASS_INDEX, UBOBloom, _class, _dec, _dec2, _dec3, _class2, _class3, _initializer, _class4, colors, BloomStage;
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
      serializable = _coreDataDecoratorsIndexJs.serializable;
      type = _coreDataDecoratorsIndexJs.type;
    }, function (_defineJs) {
      SetIndex = _defineJs.SetIndex;
    }, function (_assetAssetsMaterialJs) {
      Material = _assetAssetsMaterialJs.Material;
    }, function (_gfxIndexJs) {
      BufferInfo = _gfxIndexJs.BufferInfo;
      BufferUsageBit = _gfxIndexJs.BufferUsageBit;
      ClearFlagBit = _gfxIndexJs.ClearFlagBit;
      Color = _gfxIndexJs.Color;
      MemoryUsageBit = _gfxIndexJs.MemoryUsageBit;
      Rect = _gfxIndexJs.Rect;
    }, function (_pipelineStateManagerJs) {
      PipelineStateManager = _pipelineStateManagerJs.PipelineStateManager;
    }, function (_renderStageJs) {
      RenderStage = _renderStageJs.RenderStage;
    }, function (_enumJs) {
      CommonStagePriority = _enumJs.CommonStagePriority;
    }, function (_renderPipelineJs) {
      MAX_BLOOM_FILTER_PASS_NUM = _renderPipelineJs.MAX_BLOOM_FILTER_PASS_NUM;
    }, function (_deferredPipelineSceneDataJs) {
      BLOOM_COMBINEPASS_INDEX = _deferredPipelineSceneDataJs.BLOOM_COMBINEPASS_INDEX;
      BLOOM_DOWNSAMPLEPASS_INDEX = _deferredPipelineSceneDataJs.BLOOM_DOWNSAMPLEPASS_INDEX;
      BLOOM_PREFILTERPASS_INDEX = _deferredPipelineSceneDataJs.BLOOM_PREFILTERPASS_INDEX;
      BLOOM_UPSAMPLEPASS_INDEX = _deferredPipelineSceneDataJs.BLOOM_UPSAMPLEPASS_INDEX;
    }],
    execute: function () {
      colors = [new Color(0, 0, 0, 1)];
      /**
       * @en The uniform buffer object for bloom
       * @zh Bloom UBO。
       */
      UBOBloom = class UBOBloom {};
      /**
       * @en The bloom post-process stage
       * @zh Bloom 后处理阶段。
       */
      _class = UBOBloom;
      UBOBloom.TEXTURE_SIZE_OFFSET = 0;
      UBOBloom.COUNT = _class.TEXTURE_SIZE_OFFSET + 4;
      UBOBloom.SIZE = _class.COUNT * 4;
      _export("BloomStage", BloomStage = (_dec = ccclass('BloomStage'), _dec2 = type(Material), _dec3 = displayOrder(3), _dec(_class2 = (_class3 = (_class4 = class BloomStage extends RenderStage {
        constructor() {
          super();
          this.threshold = 1.0;
          this.intensity = 0.8;
          this.iterations = 2;
          this._bloomMaterial = _initializer && _initializer();
          this._renderArea = new Rect();
          this._bloomUBO = [];
        }
        initialize(info) {
          super.initialize(info);
          return true;
        }
        activate(pipeline, flow) {
          super.activate(pipeline, flow);
          if (this._bloomMaterial) {
            pipeline.pipelineSceneData.bloomMaterial = this._bloomMaterial;
          }
        }
        destroy() {}
        render(camera) {
          var _camera$window;
          const pipeline = this._pipeline;
          pipeline.generateBloomRenderData();
          if (!((_camera$window = camera.window) !== null && _camera$window !== void 0 && _camera$window.swapchain) && !pipeline.macros.CC_PIPELINE_TYPE) {
            return;
          }
          if (!pipeline.bloomEnabled || pipeline.pipelineSceneData.renderObjects.length === 0) return;
          if (this._bloomUBO.length === 0) {
            const passNumber = MAX_BLOOM_FILTER_PASS_NUM * 2 + 2;
            for (let i = 0; i < passNumber; ++i) {
              this._bloomUBO[i] = pipeline.device.createBuffer(new BufferInfo(BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST, MemoryUsageBit.HOST | MemoryUsageBit.DEVICE, UBOBloom.SIZE, UBOBloom.SIZE));
            }
          }
          if (camera.clearFlag & ClearFlagBit.COLOR) {
            colors[0].x = camera.clearColor.x;
            colors[0].y = camera.clearColor.y;
            colors[0].z = camera.clearColor.z;
          }
          colors[0].w = camera.clearColor.w;
          this._prefilterPass(camera, pipeline);
          this._downsamplePass(camera, pipeline);
          this._upsamplePass(camera, pipeline);
          this._combinePass(camera, pipeline);
        }
        _prefilterPass(camera, pipeline) {
          pipeline.generateRenderArea(camera, this._renderArea);
          this._renderArea.width >>= 1;
          this._renderArea.height >>= 1;
          const cmdBuff = pipeline.commandBuffers[0];
          const sceneData = pipeline.pipelineSceneData;
          const builtinBloomProcess = sceneData.bloomMaterial;
          const pass = builtinBloomProcess.passes[BLOOM_PREFILTERPASS_INDEX];
          const renderData = pipeline.getPipelineRenderData();
          const bloomData = renderData.bloom;
          const textureSize = new Float32Array(UBOBloom.COUNT);
          textureSize[UBOBloom.TEXTURE_SIZE_OFFSET + 2] = this.threshold;
          cmdBuff.updateBuffer(this._bloomUBO[0], textureSize);
          cmdBuff.beginRenderPass(bloomData.renderPass, bloomData.prefilterFramebuffer, this._renderArea, colors, 0, 0);
          cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);
          pass.descriptorSet.bindBuffer(0, this._bloomUBO[0]);
          pass.descriptorSet.bindTexture(1, renderData.outputRenderTargets[0]);
          pass.descriptorSet.bindSampler(1, bloomData.sampler);
          pass.descriptorSet.update();
          cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
          const inputAssembler = camera.window.swapchain ? pipeline.quadIAOffscreen : pipeline.quadIAOnscreen;
          let pso = null;
          const shader = pass.getShaderVariant();
          if (pass != null && shader != null && inputAssembler != null) {
            pso = PipelineStateManager.getOrCreatePipelineState(pipeline.device, pass, shader, bloomData.renderPass, inputAssembler);
          }
          if (pso != null) {
            cmdBuff.bindPipelineState(pso);
            cmdBuff.bindInputAssembler(inputAssembler);
            cmdBuff.draw(inputAssembler);
          }
          cmdBuff.endRenderPass();
        }
        _downsamplePass(camera, pipeline) {
          pipeline.generateRenderArea(camera, this._renderArea);
          this._renderArea.width >>= 1;
          this._renderArea.height >>= 1;
          const cmdBuff = pipeline.commandBuffers[0];
          const sceneData = pipeline.pipelineSceneData;
          const builtinBloomProcess = sceneData.bloomMaterial;
          const bloomData = pipeline.getPipelineRenderData().bloom;
          const textureSize = new Float32Array(UBOBloom.COUNT);
          for (let i = 0; i < this.iterations; ++i) {
            textureSize[UBOBloom.TEXTURE_SIZE_OFFSET + 0] = this._renderArea.width;
            textureSize[UBOBloom.TEXTURE_SIZE_OFFSET + 1] = this._renderArea.height;
            cmdBuff.updateBuffer(this._bloomUBO[i + 1], textureSize);
            this._renderArea.width >>= 1;
            this._renderArea.height >>= 1;
            cmdBuff.beginRenderPass(bloomData.renderPass, bloomData.downsampleFramebuffers[i], this._renderArea, colors, 0, 0);
            const pass = builtinBloomProcess.passes[BLOOM_DOWNSAMPLEPASS_INDEX + i];
            const shader = pass.getShaderVariant();
            pass.descriptorSet.bindBuffer(0, this._bloomUBO[i + 1]);
            if (i === 0) {
              pass.descriptorSet.bindTexture(1, bloomData.prefiterTex);
            } else {
              pass.descriptorSet.bindTexture(1, bloomData.downsampleTexs[i - 1]);
            }
            pass.descriptorSet.bindSampler(1, bloomData.sampler);
            pass.descriptorSet.update();
            cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
            const inputAssembler = camera.window.swapchain ? pipeline.quadIAOffscreen : pipeline.quadIAOnscreen;
            let pso = null;
            if (pass != null && shader != null && inputAssembler != null) {
              pso = PipelineStateManager.getOrCreatePipelineState(pipeline.device, pass, shader, bloomData.renderPass, inputAssembler);
            }
            if (pso != null) {
              cmdBuff.bindPipelineState(pso);
              cmdBuff.bindInputAssembler(inputAssembler);
              cmdBuff.draw(inputAssembler);
            }
            cmdBuff.endRenderPass();
          }
        }
        _upsamplePass(camera, pipeline) {
          const bloomData = pipeline.getPipelineRenderData().bloom;
          pipeline.generateRenderArea(camera, this._renderArea);
          this._renderArea.width >>= this.iterations + 1;
          this._renderArea.height >>= this.iterations + 1;
          const cmdBuff = pipeline.commandBuffers[0];
          const sceneData = pipeline.pipelineSceneData;
          const builtinBloomProcess = sceneData.bloomMaterial;
          const textureSize = new Float32Array(UBOBloom.COUNT);
          for (let i = 0; i < this.iterations; ++i) {
            const index = i + MAX_BLOOM_FILTER_PASS_NUM + 1;
            textureSize[UBOBloom.TEXTURE_SIZE_OFFSET + 0] = this._renderArea.width;
            textureSize[UBOBloom.TEXTURE_SIZE_OFFSET + 1] = this._renderArea.height;
            cmdBuff.updateBuffer(this._bloomUBO[index], textureSize);
            this._renderArea.width <<= 1;
            this._renderArea.height <<= 1;
            cmdBuff.beginRenderPass(bloomData.renderPass, bloomData.upsampleFramebuffers[this.iterations - 1 - i], this._renderArea, colors, 0, 0);
            const pass = builtinBloomProcess.passes[BLOOM_UPSAMPLEPASS_INDEX + i];
            const shader = pass.getShaderVariant();
            pass.descriptorSet.bindBuffer(0, this._bloomUBO[index]);
            if (i === 0) {
              pass.descriptorSet.bindTexture(1, bloomData.downsampleTexs[this.iterations - 1]);
            } else {
              pass.descriptorSet.bindTexture(1, bloomData.upsampleTexs[this.iterations - i]);
            }
            pass.descriptorSet.bindSampler(1, bloomData.sampler);
            pass.descriptorSet.update();
            cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
            const inputAssembler = camera.window.swapchain ? pipeline.quadIAOffscreen : pipeline.quadIAOnscreen;
            let pso = null;
            if (pass != null && shader != null && inputAssembler != null) {
              pso = PipelineStateManager.getOrCreatePipelineState(pipeline.device, pass, shader, bloomData.renderPass, inputAssembler);
            }
            if (pso != null) {
              cmdBuff.bindPipelineState(pso);
              cmdBuff.bindInputAssembler(inputAssembler);
              cmdBuff.draw(inputAssembler);
            }
            cmdBuff.endRenderPass();
          }
        }
        _combinePass(camera, pipeline) {
          pipeline.generateRenderArea(camera, this._renderArea);
          const cmdBuff = pipeline.commandBuffers[0];
          const sceneData = pipeline.pipelineSceneData;
          const builtinBloomProcess = sceneData.bloomMaterial;
          const deferredData = pipeline.getPipelineRenderData();
          const bloomData = deferredData.bloom;
          const uboIndex = MAX_BLOOM_FILTER_PASS_NUM * 2 + 1;
          const textureSize = new Float32Array(UBOBloom.COUNT);
          textureSize[UBOBloom.TEXTURE_SIZE_OFFSET + 3] = this.intensity;
          cmdBuff.updateBuffer(this._bloomUBO[uboIndex], textureSize);
          cmdBuff.beginRenderPass(bloomData.renderPass, bloomData.combineFramebuffer, this._renderArea, colors, 0, 0);
          cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);
          const pass = builtinBloomProcess.passes[BLOOM_COMBINEPASS_INDEX];
          pass.descriptorSet.bindBuffer(0, this._bloomUBO[uboIndex]);
          pass.descriptorSet.bindTexture(1, deferredData.outputRenderTargets[0]);
          pass.descriptorSet.bindTexture(2, bloomData.upsampleTexs[0]);
          pass.descriptorSet.bindSampler(1, bloomData.sampler);
          pass.descriptorSet.bindSampler(2, bloomData.sampler);
          pass.descriptorSet.update();
          cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
          const inputAssembler = camera.window.swapchain ? pipeline.quadIAOffscreen : pipeline.quadIAOnscreen;
          let pso = null;
          const shader = pass.getShaderVariant();
          if (pass != null && shader != null && inputAssembler != null) {
            pso = PipelineStateManager.getOrCreatePipelineState(pipeline.device, pass, shader, bloomData.renderPass, inputAssembler);
          }
          if (pso != null) {
            cmdBuff.bindPipelineState(pso);
            cmdBuff.bindInputAssembler(inputAssembler);
            cmdBuff.draw(inputAssembler);
          }
          cmdBuff.endRenderPass();
        }
      }, _class4.initInfo = {
        name: 'BloomStage',
        priority: CommonStagePriority.BLOOM,
        tag: 0
      }, _class4), (_initializer = _applyDecoratedInitializer(_class3.prototype, "_bloomMaterial", [_dec2, serializable, _dec3], function () {
        return null;
      })), _class3)) || _class2));
    }
  };
});