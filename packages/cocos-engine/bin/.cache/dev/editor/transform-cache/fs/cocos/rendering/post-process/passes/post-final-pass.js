System.register("q-bundled:///fs/cocos/rendering/post-process/passes/post-final-pass.js", ["../../../core/index.js", "../../../gfx/index.js", "../../custom/define.js", "../utils/pass-context.js", "./base-pass.js"], function (_export, _context) {
  "use strict";

  var Vec4, ClearFlagBit, Format, getCameraUniqueID, passContext, BasePass, PostFinalPass;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  _export("PostFinalPass", void 0);
  return {
    setters: [function (_coreIndexJs) {
      Vec4 = _coreIndexJs.Vec4;
    }, function (_gfxIndexJs) {
      ClearFlagBit = _gfxIndexJs.ClearFlagBit;
      Format = _gfxIndexJs.Format;
    }, function (_customDefineJs) {
      getCameraUniqueID = _customDefineJs.getCameraUniqueID;
    }, function (_utilsPassContextJs) {
      passContext = _utilsPassContextJs.passContext;
    }, function (_basePassJs) {
      BasePass = _basePassJs.BasePass;
    }],
    execute: function () {
      _export("PostFinalPass", PostFinalPass = class PostFinalPass extends BasePass {
        constructor(...args) {
          super(...args);
          this.name = 'PostFinalPass';
          this.outputNames = ['PostFinalColor'];
          this.effectName = 'pipeline/post-process/post-final';
          this.enableInAllEditorCamera = true;
        }
        render(camera, ppl) {
          if (!this.lastPass) {
            return;
          }
          passContext.clearFlag = camera.clearFlag & ClearFlagBit.COLOR;
          Vec4.set(passContext.clearColor, camera.clearColor.x, camera.clearColor.y, camera.clearColor.z, camera.clearColor.w);
          passContext.material = this.material;
          const cameraID = getCameraUniqueID(camera);
          const input0 = this.lastPass.slotName(camera, 0);
          const slot0 = this.slotName(camera, 0);
          const isOffScreen = false; //director.root!.mainWindow !== camera.window;

          const fb = camera.window.framebuffer;
          const ct = fb && fb.colorTextures[0];
          const format = ct ? ct.format : Format.RGBA8;
          const shadingScale = passContext.shadingScale;
          passContext.updatePassViewPort(1 / shadingScale, 1 / shadingScale).addRenderPass('post-final', `${this.name}${cameraID}`).setPassInput(input0, 'inputTexture').addRasterView(slot0, format, isOffScreen).blitScreen(0);
          this.renderProfiler(camera);
        }
      });
    }
  };
});