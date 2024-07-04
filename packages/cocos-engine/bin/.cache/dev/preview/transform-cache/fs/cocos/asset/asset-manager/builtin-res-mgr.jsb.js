System.register("q-bundled:///fs/cocos/asset/asset-manager/builtin-res-mgr.jsb.js", ["../../../../virtual/internal%253Aconstants.js", "./asset-manager.js", "./shared.js", "./bundle.js", "../../core/index.js", "./release-manager.js"], function (_export, _context) {
  "use strict";

  var TEST, EDITOR, EDITOR_NOT_IN_PREVIEW, assetManager, BuiltinBundleName, Bundle, Settings, settings, cclegacy, releaseManager, Texture2D, ImageAsset, BuiltinResMgr, builtinResMgrProto, builtinResMgr;
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      TEST = _virtualInternal253AconstantsJs.TEST;
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
      EDITOR_NOT_IN_PREVIEW = _virtualInternal253AconstantsJs.EDITOR_NOT_IN_PREVIEW;
    }, function (_assetManagerJs) {
      assetManager = _assetManagerJs.default;
    }, function (_sharedJs) {
      BuiltinBundleName = _sharedJs.BuiltinBundleName;
    }, function (_bundleJs) {
      Bundle = _bundleJs.default;
    }, function (_coreIndexJs) {
      Settings = _coreIndexJs.Settings;
      settings = _coreIndexJs.settings;
      cclegacy = _coreIndexJs.cclegacy;
    }, function (_releaseManagerJs) {
      releaseManager = _releaseManagerJs.releaseManager;
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
      Texture2D = jsb.Texture2D;
      ImageAsset = jsb.ImageAsset;
      BuiltinResMgr = jsb.BuiltinResMgr;
      builtinResMgrProto = BuiltinResMgr.prototype;
      builtinResMgrProto.init = function () {
        this._resources = {};
        this._materialsToBeCompiled = [];
        var resources = this._resources;
        var len = 2;
        var numChannels = 4;
        var blackValueView = new Uint8Array(len * len * numChannels);
        for (var i = 0; i < len * len; i++) {
          var offset = i * numChannels;
          blackValueView[offset] = 0;
          blackValueView[offset + 1] = 0;
          blackValueView[offset + 2] = 0;
          blackValueView[offset + 3] = 255;
        }
        var blackMemImageSource = {
          width: len,
          height: len,
          _data: blackValueView,
          _compressed: false,
          format: Texture2D.PixelFormat.RGBA8888
        };

        // black texture
        var imgAsset = new ImageAsset(blackMemImageSource);
        var blackTexture = new Texture2D();
        blackTexture._uuid = 'black-texture';
        blackTexture.image = imgAsset;
        resources[blackTexture._uuid] = blackTexture;
        if (cclegacy.SpriteFrame) {
          var spriteFrame = new cclegacy.SpriteFrame();
          var image = imgAsset;
          var texture = new Texture2D();
          texture.image = image;
          spriteFrame.texture = texture;
          spriteFrame._uuid = 'default-spriteframe';
          resources[spriteFrame._uuid] = spriteFrame;
        }
        if (EDITOR) {
          var builtinAssets = settings.querySettings(Settings.Category.ENGINE, 'builtinAssets');
          var builtinBundle = new Bundle();
          builtinBundle.init({
            name: BuiltinBundleName.INTERNAL,
            uuids: builtinAssets || [],
            deps: [],
            importBase: '',
            nativeBase: '',
            base: '',
            paths: {},
            scenes: {},
            packs: {},
            versions: {
              "import": [],
              "native": []
            },
            redirect: [],
            debug: false,
            types: [],
            extensionMap: {}
          });
        }
        this.initBuiltinRes();
      };
      builtinResMgrProto.get = function (uuid) {
        var res = this._resources[uuid];
        return res || this.getAsset(uuid);
      };
      builtinResMgrProto.compileBuiltinMaterial = function () {
        // NOTE: Builtin material should be compiled again after the render pipeline setup
        for (var i = 0; i < this._materialsToBeCompiled.length; ++i) {
          var mat = this._materialsToBeCompiled[i];
          for (var j = 0; j < mat.passes.length; ++j) {
            mat.passes[j].tryCompile();
          }
        }
        this._materialsToBeCompiled.length = 0;
      };
      builtinResMgrProto.loadBuiltinAssets = function () {
        var _this = this;
        var builtinAssets = settings.querySettings(Settings.Category.ENGINE, 'builtinAssets');
        if (TEST || !builtinAssets) return Promise.resolve();
        var resources = this._resources;
        return new Promise(function (resolve, reject) {
          assetManager.loadBundle(BuiltinBundleName.INTERNAL, function (err, bundle) {
            if (err) {
              reject(err);
              return;
            }
            assetManager.loadAny(builtinAssets, function (err, assets) {
              if (err) {
                reject(err);
              } else {
                assets.forEach(function (asset) {
                  resources[asset.name] = asset;
                  var url = asset.nativeUrl;
                  // In Editor, no need to ignore asset destroy, we use auto gc to handle destroy
                  if (!EDITOR_NOT_IN_PREVIEW) releaseManager.addIgnoredAsset(asset);
                  _this.addAsset(asset.name, asset);
                  if (asset instanceof cclegacy.Material) {
                    _this._materialsToBeCompiled.push(asset);
                  }
                });
                resolve();
              }
            });
          });
        });
      };
      _export("builtinResMgr", builtinResMgr = cclegacy.builtinResMgr = BuiltinResMgr.getInstance());
    }
  };
});