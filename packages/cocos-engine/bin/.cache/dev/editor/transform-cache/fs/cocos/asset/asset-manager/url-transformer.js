System.register("q-bundled:///fs/cocos/asset/asset-manager/url-transformer.js", ["../../../../virtual/internal%253Aconstants.js", "../../core/index.js", "./helper.js", "./request-item.js", "./shared.js"], function (_export, _context) {
  "use strict";

  var EDITOR, PREVIEW, warnID, js, path, cclegacy, decodeUuid, RequestItem, assetsOverrideMap, bundles, presets, RequestType, infos;
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
  function parse(task) {
    var _info2;
    const options = task.options;
    const input = Array.isArray(task.input) ? task.input : [task.input];
    task.output = [];
    for (let i = 0; i < input.length; i++) {
      let item = input[i];
      let out = RequestItem.create();
      let config = null;
      let info = null;
      if (typeof item === 'string') {
        item = Object.create(null);
        item[options.__requestType__ || RequestType.UUID] = input[i];
      }
      if (typeof item === 'object') {
        // local options will overlap glabal options
        js.addon(item, options);
        if (item.preset) {
          js.addon(item, presets[item.preset]);
        }
        for (const key in item) {
          switch (key) {
            case RequestType.UUID:
              {
                var _info;
                const uuid = out.uuid = decodeUuid(item.uuid);
                if (!item.bundle) {
                  const bundle = bundles.find(bundle => !!bundle.getAssetInfo(uuid));
                  item.bundle = bundle && bundle.name;
                }
                if (bundles.has(item.bundle)) {
                  config = bundles.get(item.bundle).config;
                  info = config.getAssetInfo(uuid);
                  if (info && info.redirect) {
                    if (!bundles.has(info.redirect)) {
                      throw new Error(`Please load bundle ${info.redirect} first`);
                    }
                    config = bundles.get(info.redirect).config;
                    info = config.getAssetInfo(uuid);
                  }
                  out.config = config;
                  out.info = info;
                }
                out.ext = item.ext || ((_info = info) === null || _info === void 0 ? void 0 : _info.extension) || '.json';
                break;
              }
            case '__requestType__':
            case 'ext':
            case 'bundle':
            case 'preset':
            case 'type':
              break;
            case RequestType.DIR:
              if (bundles.has(item.bundle)) {
                bundles.get(item.bundle).config.getDirWithPath(item.dir, item.type, infos);
                for (const assetInfo of infos) {
                  input.push({
                    uuid: assetInfo.uuid,
                    __isNative__: false,
                    ext: assetInfo.extension || '.json',
                    bundle: item.bundle
                  });
                }
                infos.length = 0;
              }
              out.recycle();
              out = null;
              break;
            case RequestType.PATH:
              if (bundles.has(item.bundle)) {
                config = bundles.get(item.bundle).config;
                info = config.getInfoWithPath(item.path, item.type);
                if (info && info.redirect) {
                  if (!bundles.has(info.redirect)) {
                    throw new Error(`you need to load bundle ${info.redirect} first`);
                  }
                  config = bundles.get(info.redirect).config;
                  info = config.getAssetInfo(info.uuid);
                }
                if (!info) {
                  out.recycle();
                  throw new Error(`Bundle ${item.bundle} doesn't contain ${item.path}`);
                }
                out.config = config;
                out.uuid = info.uuid;
                out.info = info;
              }
              out.ext = item.ext || ((_info2 = info) === null || _info2 === void 0 ? void 0 : _info2.extension) || '.json';
              break;
            case RequestType.SCENE:
              if (!item.bundle) {
                const bundle = bundles.find(bundle => !!bundle.getSceneInfo(item.scene));
                item.bundle = bundle && bundle.name;
              }
              if (bundles.has(item.bundle)) {
                config = bundles.get(item.bundle).config;
                info = config.getSceneInfo(item.scene);
                if (info && info.redirect) {
                  if (!bundles.has(info.redirect)) {
                    throw new Error(`you need to load bundle ${info.redirect} first`);
                  }
                  config = bundles.get(info.redirect).config;
                  info = config.getAssetInfo(info.uuid);
                }
                if (!info) {
                  out.recycle();
                  throw new Error(`Bundle ${config.name} doesn't contain scene ${item.scene}`);
                }
                out.config = config;
                out.uuid = info.uuid;
                out.info = info;
              }
              break;
            case '__isNative__':
              out.isNative = item.__isNative__;
              break;
            case RequestType.URL:
              out.url = item.url;
              out.uuid = item.uuid || item.url;
              out.ext = item.ext || path.extname(item.url);
              out.isNative = item.__isNative__ !== undefined ? item.__isNative__ : true;
              break;
            default:
              out.options[key] = item[key];
          }
          if (!out) {
            break;
          }
        }
      }
      if (!out) {
        continue;
      }
      task.output.push(out);
      if (!out.uuid && !out.url) {
        throw new Error(`Can not parse this input:${JSON.stringify(item)}`);
      }
    }
    return null;
  }
  function replaceOverrideAsset(task) {
    const input = task.output = task.input;
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      if (assetsOverrideMap.has(item.uuid)) {
        const uuid = assetsOverrideMap.get(item.uuid);
        if (EDITOR || PREVIEW) {
          // In EDITOR, there is no bundle, so just change uuid.
          item.overrideUuid = uuid;
          item.ext = item.isNative ? item.ext : '.json';
          continue;
        }
        const bundle = bundles.find(bundle => !!bundle.getAssetInfo(uuid));
        if (bundle) {
          var _info3;
          item.overrideUuid = uuid;
          let config = bundle.config;
          let info = config.getAssetInfo(uuid);
          if (info && info.redirect) {
            if (!bundles.has(info.redirect)) {
              throw new Error(`Please load bundle ${info.redirect} first`);
            }
            config = bundles.get(info.redirect).config;
            info = config.getAssetInfo(uuid);
          }
          item.config = config;
          item.info = info;
          item.ext = item.isNative ? item.ext : ((_info3 = info) === null || _info3 === void 0 ? void 0 : _info3.extension) || '.json';
        } else {
          warnID(16201, uuid, item.uuid);
        }
      }
    }
  }
  function combine(task) {
    const input = task.output = task.input;
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      if (item.url) {
        continue;
      }
      let url = '';
      let base = '';
      const config = item.config;
      if (item.isNative) {
        base = config && config.nativeBase ? config.base + config.nativeBase : cclegacy.assetManager.generalNativeBase;
      } else {
        base = config && config.importBase ? config.base + config.importBase : cclegacy.assetManager.generalImportBase;
      }
      const uuid = item.overrideUuid || item.uuid;
      let ver = '';
      if (item.info) {
        if (item.isNative) {
          ver = item.info.nativeVer ? `.${item.info.nativeVer}` : '';
        } else {
          ver = item.info.ver ? `.${item.info.ver}` : '';
        }
      }

      // ugly hack, WeChat does not support loading font likes 'myfont.dw213.ttf'. So append hash to directory
      if (item.ext === '.ttf') {
        url = `${base}/${uuid.slice(0, 2)}/${uuid}${ver}/${item.options.__nativeName__}`;
      } else {
        url = `${base}/${uuid.slice(0, 2)}/${uuid}${ver}${item.ext}`;
      }
      item.url = url;
    }
    return null;
  }
  _export({
    parse: parse,
    replaceOverrideAsset: replaceOverrideAsset,
    combine: combine
  });
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
      PREVIEW = _virtualInternal253AconstantsJs.PREVIEW;
    }, function (_coreIndexJs) {
      warnID = _coreIndexJs.warnID;
      js = _coreIndexJs.js;
      path = _coreIndexJs.path;
      cclegacy = _coreIndexJs.cclegacy;
    }, function (_helperJs) {
      decodeUuid = _helperJs.decodeUuid;
    }, function (_requestItemJs) {
      RequestItem = _requestItemJs.default;
    }, function (_sharedJs) {
      assetsOverrideMap = _sharedJs.assetsOverrideMap;
      bundles = _sharedJs.bundles;
      presets = _sharedJs.presets;
      RequestType = _sharedJs.RequestType;
    }],
    execute: function () {
      infos = [];
    }
  };
});