System.register("q-bundled:///fs/cocos/rendering/deferred/deferred-pipeline.js", ["../../core/data/decorators/index.js", "../../../../virtual/internal%253Aconstants.js", "../../asset/asset-manager/builtin-res-mgr.js", "../render-pipeline.js", "./main-flow.js", "../pipeline-serialization.js", "../shadow/shadow-flow.js", "../../gfx/index.js", "../define.js", "../../core/platform/debug.js", "./deferred-pipeline-scene-data.js", "../pipeline-event.js"], function (_export, _context) {
  "use strict";

  var ccclass, displayOrder, type, serializable, EDITOR, builtinResMgr, RenderPipeline, PipelineRenderData, PipelineInputAssemblerData, MainFlow, RenderTextureConfig, ShadowFlow, Format, StoreOp, ColorAttachment, DepthStencilAttachment, LoadOp, RenderPassInfo, AccessFlagBit, TextureInfo, TextureType, TextureUsageBit, FramebufferInfo, GeneralBarrierInfo, UBOGlobal, UBOCamera, UBOShadow, UNIFORM_SHADOWMAP_BINDING, UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING, errorID, DeferredPipelineSceneData, PipelineEventType, DeferredRenderData, _dec, _dec2, _dec3, _class2, _class3, _initializer, PIPELINE_TYPE, DeferredPipeline;
  function _applyDecoratedInitializer(target, property, decorators, initializer) {
    return decorators.slice().reverse().reduce(function (decoratedInitializer, decorator) {
      return decorator(target, property, decoratedInitializer) || decoratedInitializer;
    }, initializer);
  }
  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }
  _export("DeferredRenderData", void 0);
  return {
    setters: [function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
      displayOrder = _coreDataDecoratorsIndexJs.displayOrder;
      type = _coreDataDecoratorsIndexJs.type;
      serializable = _coreDataDecoratorsIndexJs.serializable;
    }, function (_virtualInternal253AconstantsJs) {
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
    }, function (_assetAssetManagerBuiltinResMgrJs) {
      builtinResMgr = _assetAssetManagerBuiltinResMgrJs.builtinResMgr;
    }, function (_renderPipelineJs) {
      RenderPipeline = _renderPipelineJs.RenderPipeline;
      PipelineRenderData = _renderPipelineJs.PipelineRenderData;
      PipelineInputAssemblerData = _renderPipelineJs.PipelineInputAssemblerData;
    }, function (_mainFlowJs) {
      MainFlow = _mainFlowJs.MainFlow;
    }, function (_pipelineSerializationJs) {
      RenderTextureConfig = _pipelineSerializationJs.RenderTextureConfig;
    }, function (_shadowShadowFlowJs) {
      ShadowFlow = _shadowShadowFlowJs.ShadowFlow;
    }, function (_gfxIndexJs) {
      Format = _gfxIndexJs.Format;
      StoreOp = _gfxIndexJs.StoreOp;
      ColorAttachment = _gfxIndexJs.ColorAttachment;
      DepthStencilAttachment = _gfxIndexJs.DepthStencilAttachment;
      LoadOp = _gfxIndexJs.LoadOp;
      RenderPassInfo = _gfxIndexJs.RenderPassInfo;
      AccessFlagBit = _gfxIndexJs.AccessFlagBit;
      TextureInfo = _gfxIndexJs.TextureInfo;
      TextureType = _gfxIndexJs.TextureType;
      TextureUsageBit = _gfxIndexJs.TextureUsageBit;
      FramebufferInfo = _gfxIndexJs.FramebufferInfo;
      GeneralBarrierInfo = _gfxIndexJs.GeneralBarrierInfo;
    }, function (_defineJs) {
      UBOGlobal = _defineJs.UBOGlobal;
      UBOCamera = _defineJs.UBOCamera;
      UBOShadow = _defineJs.UBOShadow;
      UNIFORM_SHADOWMAP_BINDING = _defineJs.UNIFORM_SHADOWMAP_BINDING;
      UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING = _defineJs.UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING;
    }, function (_corePlatformDebugJs) {
      errorID = _corePlatformDebugJs.errorID;
    }, function (_deferredPipelineSceneDataJs) {
      DeferredPipelineSceneData = _deferredPipelineSceneDataJs.DeferredPipelineSceneData;
    }, function (_pipelineEventJs) {
      PipelineEventType = _pipelineEventJs.PipelineEventType;
    }],
    execute: function () {
      PIPELINE_TYPE = 1;
      _export("DeferredRenderData", DeferredRenderData = class DeferredRenderData extends PipelineRenderData {
        constructor(...args) {
          super(...args);
          this.gbufferFrameBuffer = null;
          this.gbufferRenderTargets = [];
        }
      });
      /**
       * @en The deferred render pipeline
       * @zh 延迟渲染管线。
       */
      _export("DeferredPipeline", DeferredPipeline = (_dec = ccclass('DeferredPipeline'), _dec2 = type([RenderTextureConfig]), _dec3 = displayOrder(2), _dec(_class2 = (_class3 = class DeferredPipeline extends RenderPipeline {
        constructor(...args) {
          super(...args);
          this._gbufferRenderPass = null;
          this._lightingRenderPass = null;
          this.renderTextures = _initializer && _initializer();
        }
        initialize(info) {
          super.initialize(info);
          if (this._flows.length === 0) {
            const shadowFlow = new ShadowFlow();
            shadowFlow.initialize(ShadowFlow.initInfo);
            this._flows.push(shadowFlow);
            const mainFlow = new MainFlow();
            mainFlow.initialize(MainFlow.initInfo);
            this._flows.push(mainFlow);
          }
          return true;
        }
        activate(swapchain) {
          if (EDITOR) {
            console.info('Deferred render pipeline initialized. ' + 'Note that non-transparent materials with no lighting will not be rendered, such as builtin-unlit.');
          }
          this._macros = {
            CC_PIPELINE_TYPE: PIPELINE_TYPE
          };
          this._pipelineSceneData = new DeferredPipelineSceneData();
          if (!super.activate(swapchain)) {
            return false;
          }
          if (!this._activeRenderer(swapchain)) {
            errorID(2402);
            return false;
          }
          return true;
        }
        destroy() {
          this._destroyUBOs();
          this._destroyQuadInputAssembler();
          this._destroyDeferredData();
          const rpIter = this._renderPasses.values();
          let rpRes = rpIter.next();
          while (!rpRes.done) {
            rpRes.value.destroy();
            rpRes = rpIter.next();
          }
          this._commandBuffers.length = 0;
          return super.destroy();
        }
        onGlobalPipelineStateChanged() {
          this.pipelineSceneData.updatePipelineSceneData();
        }
        getPipelineRenderData() {
          if (!this._pipelineRenderData) {
            this._generateDeferredRenderData();
          }
          return this._pipelineRenderData;
        }
        _activeRenderer(swapchain) {
          const device = this.device;
          this._commandBuffers.push(device.commandBuffer);
          const sampler = this.globalDSManager.pointSampler;
          this._descriptorSet.bindSampler(UNIFORM_SHADOWMAP_BINDING, sampler);
          this._descriptorSet.bindTexture(UNIFORM_SHADOWMAP_BINDING, builtinResMgr.get('default-texture').getGFXTexture());
          this._descriptorSet.bindSampler(UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING, sampler);
          this._descriptorSet.bindTexture(UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING, builtinResMgr.get('default-texture').getGFXTexture());
          this._descriptorSet.update();
          let inputAssemblerDataOffscreen = new PipelineInputAssemblerData();
          inputAssemblerDataOffscreen = this._createQuadInputAssembler();
          if (!inputAssemblerDataOffscreen.quadIB || !inputAssemblerDataOffscreen.quadVB || !inputAssemblerDataOffscreen.quadIA) {
            return false;
          }
          this._quadIB = inputAssemblerDataOffscreen.quadIB;
          this._quadVBOffscreen = inputAssemblerDataOffscreen.quadVB;
          this._quadIAOffscreen = inputAssemblerDataOffscreen.quadIA;
          const inputAssemblerDataOnscreen = this._createQuadInputAssembler();
          if (!inputAssemblerDataOnscreen.quadIB || !inputAssemblerDataOnscreen.quadVB || !inputAssemblerDataOnscreen.quadIA) {
            return false;
          }
          this._quadVBOnscreen = inputAssemblerDataOnscreen.quadVB;
          this._quadIAOnscreen = inputAssemblerDataOnscreen.quadIA;
          if (!this._gbufferRenderPass) {
            const colorAttachment0 = new ColorAttachment();
            colorAttachment0.format = Format.RGBA16F;
            colorAttachment0.loadOp = LoadOp.CLEAR; // should clear color attachment
            colorAttachment0.storeOp = StoreOp.STORE;
            const colorAttachment1 = new ColorAttachment();
            colorAttachment1.format = Format.RGBA16F;
            colorAttachment1.loadOp = LoadOp.CLEAR; // should clear color attachment
            colorAttachment1.storeOp = StoreOp.STORE;
            const colorAttachment2 = new ColorAttachment();
            colorAttachment2.format = Format.RGBA16F;
            colorAttachment2.loadOp = LoadOp.CLEAR; // should clear color attachment
            colorAttachment2.storeOp = StoreOp.STORE;
            const depthStencilAttachment = new DepthStencilAttachment();
            depthStencilAttachment.format = Format.DEPTH_STENCIL;
            depthStencilAttachment.depthLoadOp = LoadOp.CLEAR;
            depthStencilAttachment.depthStoreOp = StoreOp.STORE;
            depthStencilAttachment.stencilLoadOp = LoadOp.CLEAR;
            depthStencilAttachment.stencilStoreOp = StoreOp.STORE;
            const renderPassInfo = new RenderPassInfo([colorAttachment0, colorAttachment1, colorAttachment2], depthStencilAttachment);
            this._gbufferRenderPass = device.createRenderPass(renderPassInfo);
          }
          if (!this._lightingRenderPass) {
            const colorAttachment = new ColorAttachment();
            colorAttachment.format = Format.RGBA8;
            colorAttachment.loadOp = LoadOp.CLEAR; // should clear color attachment
            colorAttachment.storeOp = StoreOp.STORE;
            colorAttachment.barrier = device.getGeneralBarrier(new GeneralBarrierInfo(AccessFlagBit.NONE, AccessFlagBit.COLOR_ATTACHMENT_WRITE));
            const depthStencilAttachment = new DepthStencilAttachment();
            depthStencilAttachment.format = Format.DEPTH_STENCIL;
            depthStencilAttachment.depthLoadOp = LoadOp.LOAD;
            depthStencilAttachment.depthStoreOp = StoreOp.DISCARD;
            depthStencilAttachment.stencilLoadOp = LoadOp.LOAD;
            depthStencilAttachment.stencilStoreOp = StoreOp.DISCARD;
            colorAttachment.barrier = device.getGeneralBarrier(new GeneralBarrierInfo(AccessFlagBit.DEPTH_STENCIL_ATTACHMENT_WRITE, AccessFlagBit.DEPTH_STENCIL_ATTACHMENT_WRITE));
            const renderPassInfo = new RenderPassInfo([colorAttachment], depthStencilAttachment);
            this._lightingRenderPass = device.createRenderPass(renderPassInfo);
          }
          this._width = swapchain.width;
          this._height = swapchain.height;
          this._generateDeferredRenderData();
          return true;
        }
        _destroyUBOs() {
          if (this._descriptorSet) {
            this._descriptorSet.getBuffer(UBOGlobal.BINDING).destroy();
            this._descriptorSet.getBuffer(UBOShadow.BINDING).destroy();
            this._descriptorSet.getBuffer(UBOCamera.BINDING).destroy();
            this._descriptorSet.getTexture(UNIFORM_SHADOWMAP_BINDING).destroy();
            this._descriptorSet.getTexture(UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING).destroy();
          }
        }
        _destroyDeferredData() {
          const deferredData = this._pipelineRenderData;
          if (deferredData) {
            if (deferredData.gbufferFrameBuffer) deferredData.gbufferFrameBuffer.destroy();
            if (deferredData.outputFrameBuffer) deferredData.outputFrameBuffer.destroy();
            if (deferredData.outputDepth) deferredData.outputDepth.destroy();
            for (let i = 0; i < deferredData.gbufferRenderTargets.length; i++) {
              deferredData.gbufferRenderTargets[i].destroy();
            }
            deferredData.gbufferRenderTargets.length = 0;
            for (let i = 0; i < deferredData.outputRenderTargets.length; i++) {
              deferredData.outputRenderTargets[i].destroy();
            }
            deferredData.outputRenderTargets.length = 0;
            this._destroyBloomData();
          }
          this._pipelineRenderData = null;
        }
        _ensureEnoughSize(cameras) {
          let newWidth = this._width;
          let newHeight = this._height;
          for (let i = 0; i < cameras.length; ++i) {
            const window = cameras[i].window;
            newWidth = Math.max(window.width, newWidth);
            newHeight = Math.max(window.height, newHeight);
          }
          if (newWidth !== this._width || newHeight !== this._height) {
            this._width = newWidth;
            this._height = newHeight;
            this._destroyDeferredData();
            this._generateDeferredRenderData();
          }
        }
        _generateDeferredRenderData() {
          const device = this.device;
          const data = this._pipelineRenderData = new DeferredRenderData();
          const sceneData = this.pipelineSceneData;
          for (let i = 0; i < 3; ++i) {
            data.gbufferRenderTargets.push(device.createTexture(new TextureInfo(TextureType.TEX2D, TextureUsageBit.COLOR_ATTACHMENT | TextureUsageBit.SAMPLED, Format.RGBA16F,
            // normals need more precision
            this._width * sceneData.shadingScale, this._height * sceneData.shadingScale)));
          }
          data.outputDepth = device.createTexture(new TextureInfo(TextureType.TEX2D, TextureUsageBit.DEPTH_STENCIL_ATTACHMENT | TextureUsageBit.SAMPLED, Format.DEPTH_STENCIL, this._width * sceneData.shadingScale, this._height * sceneData.shadingScale));
          data.gbufferFrameBuffer = device.createFramebuffer(new FramebufferInfo(this._gbufferRenderPass, data.gbufferRenderTargets, data.outputDepth));
          data.outputRenderTargets.push(device.createTexture(new TextureInfo(TextureType.TEX2D, TextureUsageBit.COLOR_ATTACHMENT | TextureUsageBit.SAMPLED, Format.RGBA16F, this._width * sceneData.shadingScale, this._height * sceneData.shadingScale)));
          data.outputFrameBuffer = device.createFramebuffer(new FramebufferInfo(this._lightingRenderPass, data.outputRenderTargets, null));
          data.sampler = this.globalDSManager.pointSampler;

          // Listens when the attachment texture is scaled
          this.on(PipelineEventType.ATTACHMENT_SCALE_CAHNGED, val => {
            data.sampler = val < 1 ? this.globalDSManager.pointSampler : this.globalDSManager.linearSampler;
            data.gbufferFrameBuffer = this.newFramebufferByRatio(data.gbufferFrameBuffer);
            data.gbufferFrameBuffer = this.newFramebufferByRatio(data.outputFrameBuffer);
          });
        }
      }, (_initializer = _applyDecoratedInitializer(_class3.prototype, "renderTextures", [_dec2, serializable, _dec3], function () {
        return [];
      })), _class3)) || _class2));
    }
  };
});