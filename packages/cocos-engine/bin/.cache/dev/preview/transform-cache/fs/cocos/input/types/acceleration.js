System.register("q-bundled:///fs/cocos/input/types/acceleration.js", [], function (_export, _context) {
  "use strict";

  var Acceleration;
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
      /**
       * @en the device accelerometer reports values for each axis in units of g-force.
       * @zh 设备重力传感器传递的各个轴的数据。
       */
      _export("Acceleration", Acceleration = function Acceleration(x, y, z, timestamp) {
        if (x === void 0) {
          x = 0;
        }
        if (y === void 0) {
          y = 0;
        }
        if (z === void 0) {
          z = 0;
        }
        if (timestamp === void 0) {
          timestamp = 0;
        }
        this.x = void 0;
        this.y = void 0;
        this.z = void 0;
        this.timestamp = void 0;
        this.x = x;
        this.y = y;
        this.z = z;
        this.timestamp = timestamp;
      });
    }
  };
});