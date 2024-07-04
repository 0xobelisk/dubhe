System.register("q-bundled:///fs/cocos/2d/assembler/label/bmfontUtils.js", ["../../../../../virtual/internal%253Aconstants.js", "../../assets/bitmap-font.js", "../../components/label.js", "./font-utils.js", "../../utils/dynamic-atlas/atlas-manager.js", "./text-processing.js", "../../../ui/view.js"], function (_export, _context) {
  "use strict";

  var JSB, FontAtlas, Overflow, CacheMode, LetterAtlas, shareLabelInfo, dynamicAtlasManager, TextProcessing, view, _defaultLetterAtlas, _defaultFontAtlas, _comp, _uiTrans, _fntConfig, _spriteFrame, QUAD_INDICES, bmfontUtils;
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      JSB = _virtualInternal253AconstantsJs.JSB;
    }, function (_assetsBitmapFontJs) {
      FontAtlas = _assetsBitmapFontJs.FontAtlas;
    }, function (_componentsLabelJs) {
      Overflow = _componentsLabelJs.Overflow;
      CacheMode = _componentsLabelJs.CacheMode;
    }, function (_fontUtilsJs) {
      LetterAtlas = _fontUtilsJs.LetterAtlas;
      shareLabelInfo = _fontUtilsJs.shareLabelInfo;
    }, function (_utilsDynamicAtlasAtlasManagerJs) {
      dynamicAtlasManager = _utilsDynamicAtlasAtlasManagerJs.dynamicAtlasManager;
    }, function (_textProcessingJs) {
      TextProcessing = _textProcessingJs.TextProcessing;
    }, function (_uiViewJs) {
      view = _uiViewJs.view;
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
      _defaultLetterAtlas = new LetterAtlas(64, 64);
      _defaultFontAtlas = new FontAtlas(null);
      _comp = null;
      _uiTrans = null;
      _fntConfig = null;
      _spriteFrame = null;
      _export("bmfontUtils", bmfontUtils = {
        updateProcessingData: function updateProcessingData(style, layout, outputLayoutData, outputRenderData, comp, trans) {
          style.fontSize = comp.fontSize;
          style.actualFontSize = comp.fontSize;
          style.originFontSize = _fntConfig ? _fntConfig.fontSize : comp.fontSize;
          layout.horizontalAlign = comp.horizontalAlign;
          layout.verticalAlign = comp.verticalAlign;
          layout.spacingX = comp.spacingX;
          var overflow = comp.overflow;
          layout.overFlow = overflow;
          layout.lineHeight = comp.lineHeight;
          outputLayoutData.nodeContentSize.width = trans.width;
          outputLayoutData.nodeContentSize.height = trans.height;

          // should wrap text
          if (overflow === Overflow.NONE) {
            layout.wrapping = false;
            outputLayoutData.nodeContentSize.width += shareLabelInfo.margin * 2;
            outputLayoutData.nodeContentSize.height += shareLabelInfo.margin * 2;
          } else if (overflow === Overflow.RESIZE_HEIGHT) {
            layout.wrapping = true;
            outputLayoutData.nodeContentSize.height += shareLabelInfo.margin * 2;
          } else {
            layout.wrapping = comp.enableWrapText;
          }
          outputRenderData.uiTransAnchorX = trans.anchorX;
          outputRenderData.uiTransAnchorY = trans.anchorY;
          shareLabelInfo.lineHeight = comp.lineHeight;
          shareLabelInfo.fontSize = comp.fontSize;
          style.spriteFrame = _spriteFrame;
          style.fntConfig = _fntConfig;
          style.fontFamily = shareLabelInfo.fontFamily;
          style.color.set(comp.color);
        },
        updateRenderData: function updateRenderData(comp) {
          if (!comp.renderData) {
            return;
          }
          if (_comp === comp) {
            return;
          }
          if (comp.renderData.vertDirty) {
            _comp = comp;
            _uiTrans = _comp.node._uiProps.uiTransformComp;
            var renderData = comp.renderData;
            var processing = TextProcessing.instance;
            var style = comp.textStyle;
            var layout = comp.textLayout;
            var outputLayoutData = comp.textLayoutData;
            var outputRenderData = comp.textRenderData;
            style.fontScale = view.getScaleX();
            this._updateFontFamily(comp);
            this.updateProcessingData(style, layout, outputLayoutData, outputRenderData, comp, _uiTrans);
            this._updateLabelInfo(comp);
            style.fontDesc = shareLabelInfo.fontDesc;

            // TextProcessing
            processing.processingString(true, style, layout, outputLayoutData, comp.string);
            // generateVertex
            outputRenderData.quadCount = 0;
            processing.generateRenderInfo(true, style, layout, outputLayoutData, outputRenderData, comp.string, this.generateVertexData);
            var isResized = false;
            if (renderData.dataLength !== outputRenderData.quadCount) {
              this.resetRenderData(comp);
              renderData.dataLength = outputRenderData.quadCount;
              renderData.resize(renderData.dataLength, renderData.dataLength / 2 * 3);
              isResized = true;
            }
            var datalist = renderData.data;
            for (var i = 0, l = outputRenderData.quadCount; i < l; i++) {
              datalist[i] = outputRenderData.vertexBuffer[i];
            }
            var indexCount = renderData.indexCount;
            this.createQuadIndices(indexCount);
            renderData.chunk.setIndexBuffer(QUAD_INDICES);
            _comp.actualFontSize = style.actualFontSize;
            _uiTrans.setContentSize(outputLayoutData.nodeContentSize);
            this.updateUVs(comp); // dirty need
            // It is reasonable that the '_comp.node._uiProps.colorDirty' interface should be used.
            // But this function is not called when just modifying the opacity.
            // So the value of '_comp.node._uiProps.colorDirty' does not change.
            // And _uiProps.colorDirty is synchronized with renderEntity.colorDirty.
            if (_comp.renderEntity.colorDirty || isResized) {
              this.updateColor(comp); // dirty need
              _comp.node._uiProps.colorDirty = false;
            }
            renderData.vertDirty = false;
            _comp = null;
            this._resetProperties();
          }
          if (comp.spriteFrame) {
            var _renderData = comp.renderData;
            _renderData.updateRenderData(comp, comp.spriteFrame);
          }
        },
        updateUVs: function updateUVs(label) {
          var renderData = label.renderData;
          var vData = renderData.chunk.vb;
          var vertexCount = renderData.vertexCount;
          var dataList = renderData.data;
          var vertexOffset = 3;
          for (var i = 0; i < vertexCount; i++) {
            var vert = dataList[i];
            vData[vertexOffset] = vert.u;
            vData[vertexOffset + 1] = vert.v;
            vertexOffset += 9;
          }
        },
        updateColor: function updateColor(label) {
          if (JSB) {
            var renderData = label.renderData;
            var vertexCount = renderData.vertexCount;
            if (vertexCount === 0) return;
            var vData = renderData.chunk.vb;
            var stride = renderData.floatStride;
            var colorOffset = 5;
            var color = label.color;
            var colorR = color.r / 255;
            var colorG = color.g / 255;
            var colorB = color.b / 255;
            var colorA = color.a / 255;
            for (var i = 0; i < vertexCount; i++) {
              vData[colorOffset] = colorR;
              vData[colorOffset + 1] = colorG;
              vData[colorOffset + 2] = colorB;
              vData[colorOffset + 3] = colorA;
              colorOffset += stride;
            }
          }
        },
        resetRenderData: function resetRenderData(comp) {
          var renderData = comp.renderData;
          renderData.dataLength = 0;
          renderData.resize(0, 0);
        },
        // callBack function
        generateVertexData: function generateVertexData(style, outputLayoutData, outputRenderData, offset, spriteFrame, rect, rotated, x, y) {
          var dataOffset = offset;
          var scale = style.bmfontScale;
          var dataList = outputRenderData.vertexBuffer;
          var texW = spriteFrame.width;
          var texH = spriteFrame.height;
          var rectWidth = rect.width;
          var rectHeight = rect.height;
          var l = 0;
          var b = 0;
          var t = 0;
          var r = 0;
          if (!rotated) {
            l = rect.x / texW;
            r = (rect.x + rectWidth) / texW;
            b = (rect.y + rectHeight) / texH;
            t = rect.y / texH;
            dataList[dataOffset].u = l;
            dataList[dataOffset].v = b;
            dataList[dataOffset + 1].u = r;
            dataList[dataOffset + 1].v = b;
            dataList[dataOffset + 2].u = l;
            dataList[dataOffset + 2].v = t;
            dataList[dataOffset + 3].u = r;
            dataList[dataOffset + 3].v = t;
          } else {
            l = rect.x / texW;
            r = (rect.x + rectHeight) / texW;
            b = (rect.y + rectWidth) / texH;
            t = rect.y / texH;
            dataList[dataOffset].u = l;
            dataList[dataOffset].v = t;
            dataList[dataOffset + 1].u = l;
            dataList[dataOffset + 1].v = b;
            dataList[dataOffset + 2].u = r;
            dataList[dataOffset + 2].v = t;
            dataList[dataOffset + 3].u = r;
            dataList[dataOffset + 3].v = b;
          }
          dataList[dataOffset].x = x;
          dataList[dataOffset].y = y - rectHeight * scale;
          dataList[dataOffset + 1].x = x + rectWidth * scale;
          dataList[dataOffset + 1].y = y - rectHeight * scale;
          dataList[dataOffset + 2].x = x;
          dataList[dataOffset + 2].y = y;
          dataList[dataOffset + 3].x = x + rectWidth * scale;
          dataList[dataOffset + 3].y = y;
        },
        _updateFontFamily: function _updateFontFamily(comp) {
          var fontAsset = comp.font;
          _spriteFrame = fontAsset.spriteFrame;
          _fntConfig = fontAsset.fntConfig;
          shareLabelInfo.fontAtlas = fontAsset.fontDefDictionary;
          if (!shareLabelInfo.fontAtlas) {
            if (comp.cacheMode === CacheMode.CHAR) {
              shareLabelInfo.fontAtlas = _defaultLetterAtlas;
            } else {
              shareLabelInfo.fontAtlas = _defaultFontAtlas;
            }
          }
          dynamicAtlasManager.packToDynamicAtlas(comp, _spriteFrame);
          // TODO update material and uv
        },
        _updateLabelInfo: function _updateLabelInfo(comp) {
          // clear
          shareLabelInfo.hash = '';
          shareLabelInfo.margin = 0;
        },
        _resetProperties: function _resetProperties() {
          _fntConfig = null;
          _spriteFrame = null;
          shareLabelInfo.hash = '';
          shareLabelInfo.margin = 0;
        },
        createQuadIndices: function createQuadIndices(indexCount) {
          if (indexCount % 6 !== 0) {
            console.error('illegal index count!');
            return;
          }
          var quadCount = indexCount / 6;
          QUAD_INDICES = null;
          QUAD_INDICES = new Uint16Array(indexCount);
          var offset = 0;
          for (var i = 0; i < quadCount; i++) {
            QUAD_INDICES[offset++] = 0 + i * 4;
            QUAD_INDICES[offset++] = 1 + i * 4;
            QUAD_INDICES[offset++] = 2 + i * 4;
            QUAD_INDICES[offset++] = 1 + i * 4;
            QUAD_INDICES[offset++] = 3 + i * 4;
            QUAD_INDICES[offset++] = 2 + i * 4;
          }
        }
      });
      _export("default", bmfontUtils);
    }
  };
});