System.register("q-bundled:///fs/cocos/spine/assembler/index.js", ["../skeleton.js", "./simple.js"], function (_export, _context) {
  "use strict";

  var Skeleton, simple, simpleSpineAssembler;
  return {
    setters: [function (_skeletonJs) {
      Skeleton = _skeletonJs.Skeleton;
    }, function (_simpleJs) {
      simple = _simpleJs.simple;
    }],
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
      // Inline all type switch to avoid jit deoptimization during inlined function change
      /**
       * @internal Since v3.7.2 this is an engine private object.
       */
      _export("simpleSpineAssembler", simpleSpineAssembler = {
        getAssembler() {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return simple;
        }
      });
      Skeleton.Assembler = simpleSpineAssembler;
    }
  };
});