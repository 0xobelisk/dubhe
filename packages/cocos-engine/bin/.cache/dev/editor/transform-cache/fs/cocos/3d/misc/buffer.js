System.register("q-bundled:///fs/cocos/3d/misc/buffer.js", ["../../gfx/index.js", "../../core/index.js"], function (_export, _context) {
  "use strict";

  var Format, FormatInfos, FormatType, sys, _typeMap;
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
  function _getDataViewType(info) {
    const type = _typeMap[info.type] || _typeMap.default;
    const bytes = info.size / info.count * 8;
    return `${type}${bytes}`;
  }

  // default params bahaves just like on an plain, compact Float32Array
  function writeBuffer(target, data, format = Format.R32F, offset = 0, stride = 0) {
    const info = FormatInfos[format];
    if (!stride) {
      stride = info.size;
    }
    const writer = `set${_getDataViewType(info)}`;
    const componentBytesLength = info.size / info.count;
    const nSeg = Math.floor(data.length / info.count);
    const isLittleEndian = sys.isLittleEndian;
    for (let iSeg = 0; iSeg < nSeg; ++iSeg) {
      const x = offset + stride * iSeg;
      for (let iComponent = 0; iComponent < info.count; ++iComponent) {
        const y = x + componentBytesLength * iComponent;
        target[writer](y, data[info.count * iSeg + iComponent], isLittleEndian);
      }
    }
  }
  function readBuffer(target, format = Format.R32F, offset = 0, length = target.byteLength - offset, stride = 0, out = []) {
    const info = FormatInfos[format];
    if (!stride) {
      stride = info.size;
    }
    const reader = `get${_getDataViewType(info)}`;
    const componentBytesLength = info.size / info.count;
    const nSeg = Math.floor(length / stride);
    const isLittleEndian = sys.isLittleEndian;
    for (let iSeg = 0; iSeg < nSeg; ++iSeg) {
      const x = offset + stride * iSeg;
      for (let iComponent = 0; iComponent < info.count; ++iComponent) {
        const y = x + componentBytesLength * iComponent;
        out[info.count * iSeg + iComponent] = target[reader](y, isLittleEndian);
      }
    }
    return out;
  }
  function mapBuffer(target, callback, format = Format.R32F, offset = 0, length = target.byteLength - offset, stride = 0, out) {
    if (!out) {
      out = new DataView(target.buffer.slice(target.byteOffset, target.byteOffset + target.byteLength));
    }
    const info = FormatInfos[format];
    if (!stride) {
      stride = info.size;
    }
    const writer = `set${_getDataViewType(info)}`;
    const reader = `get${_getDataViewType(info)}`;
    const componentBytesLength = info.size / info.count;
    const nSeg = Math.floor(length / stride);
    const isLittleEndian = sys.isLittleEndian;
    for (let iSeg = 0; iSeg < nSeg; ++iSeg) {
      const x = offset + stride * iSeg;
      for (let iComponent = 0; iComponent < info.count; ++iComponent) {
        const y = x + componentBytesLength * iComponent;
        const cur = target[reader](y, isLittleEndian);
        // iComponent is usually more useful than y
        out[writer](y, callback(cur, iComponent, target), isLittleEndian);
      }
    }
    return out;
  }
  _export({
    writeBuffer: writeBuffer,
    readBuffer: readBuffer,
    mapBuffer: mapBuffer
  });
  return {
    setters: [function (_gfxIndexJs) {
      Format = _gfxIndexJs.Format;
      FormatInfos = _gfxIndexJs.FormatInfos;
      FormatType = _gfxIndexJs.FormatType;
    }, function (_coreIndexJs) {
      sys = _coreIndexJs.sys;
    }],
    execute: function () {
      _typeMap = {
        [FormatType.UNORM]: 'Uint',
        [FormatType.SNORM]: 'Int',
        [FormatType.UINT]: 'Uint',
        [FormatType.INT]: 'Int',
        [FormatType.UFLOAT]: 'Float',
        [FormatType.FLOAT]: 'Float',
        default: 'Uint'
      };
    }
  };
});