System.register("q-bundled:///fs/cocos/2d/assembler/label/letter.js", ["../../../../../virtual/internal%253Aconstants.js", "../../../core/index.js", "../utils.js", "./letter-font.js"], function (_export, _context) {
  "use strict";

  var JSB, js, Color, fillMeshVertices3D, letterFont, tempColor, letter;
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      JSB = _virtualInternal253AconstantsJs.JSB;
    }, function (_coreIndexJs) {
      js = _coreIndexJs.js;
      Color = _coreIndexJs.Color;
    }, function (_utilsJs) {
      fillMeshVertices3D = _utilsJs.fillMeshVertices3D;
    }, function (_letterFontJs) {
      letterFont = _letterFontJs.letterFont;
    }],
    execute: function () {
      /*
       Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.
      
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
      tempColor = new Color(255, 255, 255, 255);
      /**
       * letter 组装器
       * 可通过 `UI.letter` 获取该组装器。
       */
      _export("letter", letter = {
        createData: function createData(comp) {
          var renderData = comp.requestRenderData();
          renderData.resize(0, 0);
          return renderData;
        },
        fillBuffers: function fillBuffers(comp, renderer) {
          if (!comp.renderData) {
            return;
          }
          var node = comp.node;
          tempColor.a = node._uiProps.opacity * 255;
          // Fill All
          fillMeshVertices3D(node, renderer, comp.renderData, tempColor);
        },
        updateColor: function updateColor(label) {
          if (JSB) {
            var renderData = label.renderData;
            var vertexCount = renderData.vertexCount;
            if (vertexCount === 0) return;
            var vData = renderData.chunk.vb;
            var stride = renderData.floatStride;
            var colorOffset = 5;
            for (var i = 0; i < vertexCount; i++) {
              vData[colorOffset] = 1;
              vData[colorOffset + 1] = 1;
              vData[colorOffset + 2] = 1;
              vData[colorOffset + 3] = 1;
              colorOffset += stride;
            }
          }
        }
      });
      js.addon(letter, letterFont);
    }
  };
});