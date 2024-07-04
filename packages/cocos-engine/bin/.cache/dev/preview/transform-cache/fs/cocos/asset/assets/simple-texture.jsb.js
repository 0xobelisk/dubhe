System.register("q-bundled:///fs/cocos/asset/assets/simple-texture.jsb.js", ["./asset-enum.js", "../asset-manager/depend-util.js", "../../core/index.js", "./texture-base.js", "../../native-binding/decorators.js"], function (_export, _context) {
  "use strict";

  var Filter, PixelFormat, WrapMode, dependUtil, js, macro, cclegacy, patch_cc_SimpleTexture, SimpleTexture, jsbWindow, simpleTextureProto, oldUpdateDataFunc, oldGetGFXTexture;
  return {
    setters: [function (_assetEnumJs) {
      Filter = _assetEnumJs.Filter;
      PixelFormat = _assetEnumJs.PixelFormat;
      WrapMode = _assetEnumJs.WrapMode;
    }, function (_assetManagerDependUtilJs) {
      dependUtil = _assetManagerDependUtilJs.default;
    }, function (_coreIndexJs) {
      js = _coreIndexJs.js;
      macro = _coreIndexJs.macro;
      cclegacy = _coreIndexJs.cclegacy;
    }, function (_textureBaseJs) {}, function (_nativeBindingDecoratorsJs) {
      patch_cc_SimpleTexture = _nativeBindingDecoratorsJs.patch_cc_SimpleTexture;
    }],
    execute: function () {
      /*
       Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.
      
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
      _export("SimpleTexture", SimpleTexture = jsb.SimpleTexture);
      jsbWindow = jsb.window;
      SimpleTexture.Filter = Filter;
      SimpleTexture.PixelFormat = PixelFormat;
      SimpleTexture.WrapMode = WrapMode;
      simpleTextureProto = jsb.SimpleTexture.prototype;
      oldUpdateDataFunc = simpleTextureProto.uploadData;
      simpleTextureProto.uploadData = function (source, level, arrayIndex) {
        if (level === void 0) {
          level = 0;
        }
        if (arrayIndex === void 0) {
          arrayIndex = 0;
        }
        var data;
        if (source instanceof jsbWindow.HTMLCanvasElement) {
          // @ts-ignore
          data = source.data;
        } else if (source instanceof jsbWindow.HTMLImageElement) {
          // @ts-ignore
          data = source._data;
        } else if (ArrayBuffer.isView(source)) {
          data = source.buffer;
        }
        oldUpdateDataFunc.call(this, data, level, arrayIndex);
      };
      simpleTextureProto._ctor = function () {
        jsb.TextureBase.prototype._ctor.apply(this, arguments);
        this._gfxTexture = null;
        this._registerListeners();
      };
      oldGetGFXTexture = simpleTextureProto.getGFXTexture;
      simpleTextureProto.getGFXTexture = function () {
        if (!this._gfxTexture) {
          this._gfxTexture = oldGetGFXTexture.call(this);
        }
        return this._gfxTexture;
      };
      simpleTextureProto._onGFXTextureUpdated = function (gfxTexture) {
        this._gfxTexture = gfxTexture;
      };
      simpleTextureProto._onAfterAssignImage = function (image) {
        if (macro.CLEANUP_IMAGE_CACHE) {
          var deps = dependUtil.getDeps(this._uuid);
          var index = deps.indexOf(image._uuid);
          if (index !== -1) {
            js.array.fastRemoveAt(deps, index);
            image.decRef();
          }
        }
      };
      patch_cc_SimpleTexture({
        SimpleTexture: SimpleTexture
      });
      cclegacy.SimpleTexture = jsb.SimpleTexture;
    }
  };
});