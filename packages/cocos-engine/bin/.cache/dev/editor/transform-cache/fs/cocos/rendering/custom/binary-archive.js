System.register("q-bundled:///fs/cocos/rendering/custom/binary-archive.js", [], function (_export, _context) {
  "use strict";

  var BinaryOutputArchive, BinaryInputArchive;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  _export({
    BinaryOutputArchive: void 0,
    BinaryInputArchive: void 0
  });
  return {
    setters: [],
    execute: function () {
      /*
       Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.
      
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
      _export("BinaryOutputArchive", BinaryOutputArchive = class BinaryOutputArchive {
        constructor() {
          this.capacity = 0;
          this.size = 0;
          this.buffer = void 0;
          this.dataView = void 0;
          this.capacity = 4096;
          this.buffer = new Uint8Array(this.capacity);
          this.dataView = new DataView(this.buffer.buffer);
        }
        writeBool(value) {
          const newSize = this.size + 1;
          if (newSize > this.capacity) {
            this.reserve(newSize);
          }
          this.dataView.setUint8(this.size, value ? 1 : 0);
          this.size = newSize;
        }
        writeNumber(value) {
          const newSize = this.size + 8;
          if (newSize > this.capacity) {
            this.reserve(newSize);
          }
          this.dataView.setFloat64(this.size, value, true);
          this.size = newSize;
        }
        writeString(value) {
          this.writeNumber(value.length);
          const newSize = this.size + value.length;
          if (newSize > this.capacity) {
            this.reserve(newSize);
          }
          for (let i = 0; i < value.length; i++) {
            this.dataView.setUint8(this.size + i, value.charCodeAt(i));
          }
          this.size = newSize;
        }
        reserve(requiredSize) {
          const newCapacity = Math.max(requiredSize, this.capacity * 2);
          const prevBuffer = this.buffer;
          this.buffer = new Uint8Array(newCapacity);
          this.buffer.set(prevBuffer);
          this.dataView = new DataView(this.buffer.buffer);
          this.capacity = newCapacity;
        }
        get data() {
          return this.buffer.buffer.slice(0, this.size);
        }
      });
      _export("BinaryInputArchive", BinaryInputArchive = class BinaryInputArchive {
        constructor(data) {
          this.offset = 0;
          this.dataView = void 0;
          this.dataView = new DataView(data);
        }
        readBool() {
          return this.dataView.getUint8(this.offset++) !== 0;
        }
        readNumber() {
          const value = this.dataView.getFloat64(this.offset, true);
          this.offset += 8;
          return value;
        }
        readString() {
          const length = this.readNumber();
          // we only support ascii string now, so we can use String.fromCharCode
          // see https://stackoverflow.com/questions/67057689/typscript-type-uint8array-is-missing-the-following-properties-from-type-numb
          // answer on stackoverflow might be wrong.
          // [[wrong]] const str =  String.fromCharCode.apply(null, [...new Uint8Array(this.dataView.buffer, this.offset, length)]);
          const str = String.fromCharCode.apply(null, Array.from(new Uint8Array(this.dataView.buffer, this.offset, length)));
          this.offset += length;
          return str;
        }
      });
    }
  };
});