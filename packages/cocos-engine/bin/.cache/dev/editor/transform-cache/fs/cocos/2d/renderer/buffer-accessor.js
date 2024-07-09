System.register("q-bundled:///fs/cocos/2d/renderer/buffer-accessor.js", ["./vertex-format.js"], function (_export, _context) {
  "use strict";

  var getAttributeStride, BufferAccessor;
  _export("BufferAccessor", void 0);
  return {
    setters: [function (_vertexFormatJs) {
      getAttributeStride = _vertexFormatJs.getAttributeStride;
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
      _export("BufferAccessor", BufferAccessor = class BufferAccessor {
        get attributes() {
          return this._attributes;
        }
        get vertexFormatBytes() {
          return this._vertexFormatBytes;
        }
        get floatsPerVertex() {
          return this._floatsPerVertex;
        }
        constructor(device, attributes) {
          this._device = null;
          this._attributes = null;
          this._vertexFormatBytes = void 0;
          this._floatsPerVertex = void 0;
          this._buffers = [];
          this._device = device;
          this._attributes = attributes;
          this._floatsPerVertex = getAttributeStride(attributes) >> 2;
          this._vertexFormatBytes = this._floatsPerVertex * Float32Array.BYTES_PER_ELEMENT;
        }
        initialize() {}
        reset() {}
        request(vertexCount = 4, indexCount = 6) {}
        appendBuffers(vertices, indices) {}
        uploadBuffers() {}
        destroy() {
          this._attributes.length = 0;
        }
      });
    }
  };
});