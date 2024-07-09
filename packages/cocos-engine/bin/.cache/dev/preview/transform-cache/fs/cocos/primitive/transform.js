System.register("q-bundled:///fs/cocos/primitive/transform.js", ["../gfx/index.js"], function (_export, _context) {
  "use strict";

  var PrimitiveMode;
  /*
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

  /**
   * @en
   * Translate the geometry.
   * @zh
   * 平移几何体。
   * @param geometry @zh 几何体信息。@en The geometry to be translated
   * @param offset @zh 偏移量。@en The translation
   */
  function translate(geometry, offset) {
    var x = offset.x || 0;
    var y = offset.y || 0;
    var z = offset.z || 0;
    var nVertex = Math.floor(geometry.positions.length / 3);
    for (var iVertex = 0; iVertex < nVertex; ++iVertex) {
      var iX = iVertex * 3;
      var iY = iVertex * 3 + 1;
      var iZ = iVertex * 3 + 2;
      geometry.positions[iX] += x;
      geometry.positions[iY] += y;
      geometry.positions[iZ] += z;
    }
    if (geometry.minPos) {
      geometry.minPos.x += x;
      geometry.minPos.y += y;
      geometry.minPos.z += z;
    }
    if (geometry.maxPos) {
      geometry.maxPos.x += x;
      geometry.maxPos.y += y;
      geometry.maxPos.z += z;
    }
    return geometry;
  }

  /**
   * @en
   * Scale the geometry.
   * @zh
   * 缩放几何体。
   * @param geometry @zh 几何体信息。 @en The geometry to be scaled
   * @param value @zh 缩放量。@en The scaling size
   */
  function scale(geometry, value) {
    var _value$x, _value$y, _value$z;
    var x = (_value$x = value.x) !== null && _value$x !== void 0 ? _value$x : 1.0;
    var y = (_value$y = value.y) !== null && _value$y !== void 0 ? _value$y : 1.0;
    var z = (_value$z = value.z) !== null && _value$z !== void 0 ? _value$z : 1.0;
    var nVertex = Math.floor(geometry.positions.length / 3);
    for (var iVertex = 0; iVertex < nVertex; ++iVertex) {
      var iX = iVertex * 3;
      var iY = iVertex * 3 + 1;
      var iZ = iVertex * 3 + 2;
      geometry.positions[iX] *= x;
      geometry.positions[iY] *= y;
      geometry.positions[iZ] *= z;
    }
    var minPos = geometry.minPos,
      maxPos = geometry.maxPos;
    if (minPos) {
      minPos.x *= x;
      minPos.y *= y;
      minPos.z *= z;
    }
    if (maxPos) {
      maxPos.x *= x;
      maxPos.y *= y;
      maxPos.z *= z;
    }
    if (minPos && maxPos) {
      // Negative scaling causes min-max to be swapped.
      if (x < 0) {
        var tmp = minPos.x;
        minPos.x = maxPos.x;
        maxPos.x = tmp;
      }
      if (y < 0) {
        var _tmp = minPos.y;
        minPos.y = maxPos.y;
        maxPos.y = _tmp;
      }
      if (z < 0) {
        var _tmp2 = minPos.z;
        minPos.z = maxPos.z;
        maxPos.z = _tmp2;
      }
    }
    if (typeof geometry.boundingRadius !== 'undefined') {
      geometry.boundingRadius *= Math.max(Math.max(Math.abs(x), Math.abs(y)), Math.abs(z));
    }
    return geometry;
  }

  /**
   * @en
   * Converts geometry to wireframe mode. Only geometry with triangle topology is supported.
   * @zh
   * 将几何体转换为线框模式，仅支持三角形拓扑的几何体。
   * @param geometry @zh 几何体信息。@en The geometry to be converted to wireframe
   */
  function wireframed(geometry) {
    var indices = geometry.indices;
    if (!indices) {
      return geometry;
    }

    // We only support triangles' wireframe.
    if (geometry.primitiveMode && geometry.primitiveMode !== PrimitiveMode.TRIANGLE_LIST) {
      return geometry;
    }
    var offsets = [[0, 1], [1, 2], [2, 0]];
    var lines = [];
    var lineIDs = {};
    for (var i = 0; i < indices.length; i += 3) {
      for (var k = 0; k < 3; ++k) {
        var i1 = indices[i + offsets[k][0]];
        var i2 = indices[i + offsets[k][1]];

        // check if we already have the line in our lines
        var id = i1 > i2 ? i2 << 16 | i1 : i1 << 16 | i2;
        if (lineIDs[id] === undefined) {
          lineIDs[id] = 0;
          lines.push(i1, i2);
        }
      }
    }
    geometry.indices = lines;
    geometry.primitiveMode = PrimitiveMode.LINE_LIST;
    return geometry;
  }
  _export({
    translate: translate,
    scale: scale,
    wireframed: wireframed
  });
  return {
    setters: [function (_gfxIndexJs) {
      PrimitiveMode = _gfxIndexJs.PrimitiveMode;
    }],
    execute: function () {}
  };
});