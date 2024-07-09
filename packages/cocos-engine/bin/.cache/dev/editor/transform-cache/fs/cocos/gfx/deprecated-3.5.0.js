System.register("q-bundled:///fs/cocos/gfx/deprecated-3.5.0.js", ["../core/index.js", "./base/device.js", "./base/define.js"], function (_export, _context) {
  "use strict";

  var removeProperty, replaceProperty, Device, Feature, ColorAttachment, DepthStencilAttachment;
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
  return {
    setters: [function (_coreIndexJs) {
      removeProperty = _coreIndexJs.removeProperty;
      replaceProperty = _coreIndexJs.replaceProperty;
    }, function (_baseDeviceJs) {
      Device = _baseDeviceJs.Device;
    }, function (_baseDefineJs) {
      Feature = _baseDefineJs.Feature;
      ColorAttachment = _baseDefineJs.ColorAttachment;
      DepthStencilAttachment = _baseDefineJs.DepthStencilAttachment;
    }],
    execute: function () {
      // Deprecate format features in gfx Feature.
      removeProperty(Feature, 'Feature', [{
        name: 'COLOR_FLOAT',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.R32F) & FormatFeatureBit.RENDER_TARGET;'
      }, {
        name: 'COLOR_HALF_FLOAT',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.R16F) & FormatFeatureBit.RENDER_TARGET;'
      }, {
        name: 'TEXTURE_FLOAT',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = (device.getFormatFeatures(Format.R32F) & (FormatFeatureBit.RENDER_TARGET' + ' | FormatFeatureBit.SAMPLED_TEXTURE)) === (FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE);'
      }, {
        name: 'TEXTURE_HALF_FLOAT',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = (device.getFormatFeatures(Format.R16F) & (FormatFeatureBit.RENDER_TARGET' + ' | FormatFeatureBit.SAMPLED_TEXTURE)) === (FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE);'
      }, {
        name: 'TEXTURE_FLOAT_LINEAR',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.R32F) & FormatFeatureBit.LINEAR_FILTER;'
      }, {
        name: 'TEXTURE_HALF_FLOAT_LINEAR',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.R16F) & FormatFeatureBit.LINEAR_FILTER;'
      }, {
        name: 'FORMAT_R11G11B10F',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.R11G11B10F) !== FormatFeatureBit.NONE;'
      }, {
        name: 'FORMAT_SRGB',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.SRGB8) !== FormatFeatureBit.NONE;'
      }, {
        name: 'FORMAT_ETC1',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.ETC_RGB8) !== FormatFeatureBit.NONE;'
      }, {
        name: 'FORMAT_ETC2',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.ETC2_RGB8) !== FormatFeatureBit.NONE;'
      }, {
        name: 'FORMAT_DXT',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.BC1) !== FormatFeatureBit.NONE;'
      }, {
        name: 'FORMAT_PVRTC',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.PVRTC_RGB2) !== FormatFeatureBit.NONE;'
      }, {
        name: 'FORMAT_ASTC',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.ASTC_RGBA_4x4) !== FormatFeatureBit.NONE;'
      }, {
        name: 'FORMAT_RGB8',
        suggest: 'Please use device.getFormatFeatures() instead, like: \n' + 'let isSupported = device.getFormatFeatures(Format.RGB8) !== FormatFeatureBit.NONE;'
      }]);
      removeProperty(ColorAttachment.prototype, 'ColorAttachment', [{
        name: 'beginAccesses',
        suggest: 'Please assign to ColorAttachment.barrier instead'
      }, {
        name: 'endAccesses',
        suggest: 'Please assign to ColorAttachment.barrier instead'
      }]);
      removeProperty(DepthStencilAttachment.prototype, 'DepthStencilAttachment', [{
        name: 'beginAccesses',
        suggest: 'Please assign to DepthStencilAttachment.barrier instead'
      }, {
        name: 'endAccesses',
        suggest: 'Please assign to DepthStencilAttachment.barrier instead'
      }]);
      replaceProperty(Device.prototype, 'Device', [{
        name: 'getGlobalBarrier',
        newName: 'getGeneralBarrier'
      }]);
    }
  };
});