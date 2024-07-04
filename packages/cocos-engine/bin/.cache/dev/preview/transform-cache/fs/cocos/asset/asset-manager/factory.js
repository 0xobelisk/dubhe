System.register("q-bundled:///fs/cocos/asset/asset-manager/factory.js", ["../../../../virtual/internal%253Aconstants.js", "../assets/image-asset.js", "../assets/json-asset.js", "../assets/text-asset.js", "../assets/asset.js", "../assets/buffer-asset.js", "./bundle.js", "./cache.js", "./shared.js", "./utilities.js", "../../core/index.js"], function (_export, _context) {
  "use strict";

  var EDITOR, ImageAsset, JsonAsset, TextAsset, Asset, BufferAsset, Bundle, resources, Cache, assets, BuiltinBundleName, bundles, cache, js, Factory;
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
  function createImageAsset(id, data, options, onComplete) {
    var out = null;
    var err = null;
    try {
      out = new ImageAsset();
      out._nativeUrl = id;
      out._nativeAsset = data;
    } catch (e) {
      err = e;
    }
    onComplete(err, out);
  }
  function createJsonAsset(id, data, options, onComplete) {
    var out = new JsonAsset();
    out.json = data;
    onComplete(null, out);
  }
  function createTextAsset(id, data, options, onComplete) {
    var out = new TextAsset();
    out.text = data;
    onComplete(null, out);
  }
  function createBufferAsset(id, data, options, onComplete) {
    var out = new BufferAsset();
    out._nativeUrl = id;
    out._nativeAsset = data;
    onComplete(null, out);
  }
  function createAsset(id, data, options, onComplete) {
    var out = new Asset();
    out._nativeUrl = id;
    out._nativeAsset = data;
    onComplete(null, out);
  }
  function createBundle(id, data, options, onComplete) {
    var bundle = bundles.get(data.name);
    if (!bundle) {
      bundle = data.name === BuiltinBundleName.RESOURCES ? resources : new Bundle();
      data.base = data.base || id + "/";
      bundle.init(data);
    }
    //HACK: Can not import scripts in GameView due to the difference of Scripting System between the GameView and Preview
    if (!EDITOR) {
      _context["import"]("virtual:///prerequisite-imports/" + bundle.name).then(function () {
        onComplete(null, bundle);
      })["catch"](onComplete);
    } else {
      onComplete(null, bundle);
    }
  }
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
    }, function (_assetsImageAssetJs) {
      ImageAsset = _assetsImageAssetJs.ImageAsset;
    }, function (_assetsJsonAssetJs) {
      JsonAsset = _assetsJsonAssetJs.default;
    }, function (_assetsTextAssetJs) {
      TextAsset = _assetsTextAssetJs.TextAsset;
    }, function (_assetsAssetJs) {
      Asset = _assetsAssetJs.Asset;
    }, function (_assetsBufferAssetJs) {
      BufferAsset = _assetsBufferAssetJs.BufferAsset;
    }, function (_bundleJs) {
      Bundle = _bundleJs.default;
      resources = _bundleJs.resources;
    }, function (_cacheJs) {
      Cache = _cacheJs.default;
    }, function (_sharedJs) {
      assets = _sharedJs.assets;
      BuiltinBundleName = _sharedJs.BuiltinBundleName;
      bundles = _sharedJs.bundles;
    }, function (_utilitiesJs) {
      cache = _utilitiesJs.cache;
    }, function (_coreIndexJs) {
      js = _coreIndexJs.js;
    }],
    execute: function () {
      _export("Factory", Factory = /*#__PURE__*/function () {
        function Factory() {
          this._creating = new Cache();
          this._producers = {
            // Images
            '.png': createImageAsset,
            '.jpg': createImageAsset,
            '.bmp': createImageAsset,
            '.jpeg': createImageAsset,
            '.gif': createImageAsset,
            '.ico': createImageAsset,
            '.tiff': createImageAsset,
            '.webp': createImageAsset,
            '.image': createImageAsset,
            '.pvr': createImageAsset,
            '.pkm': createImageAsset,
            // Txt
            '.txt': createTextAsset,
            '.xml': createTextAsset,
            '.vsh': createTextAsset,
            '.fsh': createTextAsset,
            '.atlas': createTextAsset,
            '.tmx': createTextAsset,
            '.tsx': createTextAsset,
            '.fnt': createTextAsset,
            '.json': createJsonAsset,
            '.ExportJson': createJsonAsset,
            // Binary
            '.binary': createBufferAsset,
            '.bin': createBufferAsset,
            '.dbbin': createBufferAsset,
            '.skel': createBufferAsset,
            bundle: createBundle,
            "default": createAsset
          };
        }
        var _proto = Factory.prototype;
        _proto.register = function register(type, handler) {
          if (typeof type === 'object') {
            js.mixin(this._producers, type);
          } else {
            this._producers[type] = handler;
          }
        };
        _proto.create = function create(id, data, type, options, onComplete) {
          var _this = this;
          var handler = this._producers[type] || this._producers["default"];
          var asset = assets.get(id);
          if (!options.reloadAsset && asset) {
            onComplete(null, asset);
            return;
          }
          var creating = this._creating.get(id);
          if (creating) {
            creating.push(onComplete);
            return;
          }
          this._creating.add(id, [onComplete]);
          handler(id, data, options, function (err, result) {
            if (!err && result instanceof Asset) {
              result._uuid = id;
              cache(id, result, options.cacheAsset);
            }
            var callbacks = _this._creating.remove(id);
            for (var i = 0, l = callbacks.length; i < l; i++) {
              callbacks[i](err, result);
            }
          });
        };
        return Factory;
      }());
      _export("default", new Factory());
    }
  };
});