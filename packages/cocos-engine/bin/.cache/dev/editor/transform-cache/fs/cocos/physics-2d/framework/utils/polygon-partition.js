System.register("q-bundled:///fs/cocos/physics-2d/framework/utils/polygon-partition.js", [], function (_export, _context) {
  "use strict";

  var Vertex;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
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

  //https://github.com/x6ud/poly-partition-js

  /**
  * @en
  * Decompose the polygon into several convex polygon using Hertel-Mehlhorn algorithm.
  * If the polygon is already convex, it will return the original polygon.
  * @zh
  * 使用Hertel-Mehlhorn算法将输入多边形拆分成多个凸多边形。如果输入多边形是凸多边形，将返回原多边形。
  * @param polygon @en one polygon. @zh 一个多边形。
  * @return @en polygon array. @zh 多边形数组。
  */
  function ConvexPartition(polygon) {
    // We force it to CCW as it is a precondition in this algorithm.
    ForceCounterClockWise(polygon);

    //check if the poly is already convex
    let convex = true;
    for (let i = 0, len = polygon.length; i < len; ++i) {
      if (!isConvex(polygon[(i + len - 1) % len], polygon[i], polygon[(i + 1) % len])) {
        convex = false;
        break;
      }
    }
    if (convex) {
      return [polygon];
    }
    const ret = [];
    const triangles = Triangulate(polygon);
    if (!triangles) return null;
    for (; triangles.length;) {
      let poly = triangles.splice(0, 1)[0];
      for (let iPoly = 0, polyLen = poly.length; iPoly < polyLen; ++iPoly) {
        const diag1 = poly[iPoly];
        const diag2 = poly[(iPoly + 1) % polyLen];
        // find diagonal
        let tri3 = null;
        let iTri2 = 0;
        for (; iTri2 < triangles.length; ++iTri2) {
          const triangle = triangles[iTri2];
          for (let i = 0; i < 3; ++i) {
            const tri1 = triangle[i];
            const tri2 = triangle[(i + 1) % 3];
            if (equals(diag1, tri2) && equals(diag2, tri1)) {
              tri3 = triangle[(i + 2) % 3];
              break;
            }
          }
          if (tri3) {
            break;
          }
        }
        if (!tri3) {
          // not a diagonal
          continue;
        }
        if (area(poly[(iPoly + polyLen - 1) % polyLen], diag1, tri3) > 0) {
          // neither convex nor on the same line
          continue;
        }
        if (area(tri3, diag2, poly[(iPoly + 2) % polyLen]) > 0) {
          continue;
        }
        // merge triangle
        const newPoly = [];
        for (let i = (iPoly + 1) % polyLen; i !== iPoly; i = (i + 1) % polyLen) {
          newPoly.push(poly[i]);
        }
        newPoly.push(diag1, tri3);
        poly = newPoly;
        polyLen = newPoly.length;
        iPoly = -1;
        triangles.splice(iTri2, 1);
      }
      ret.push(poly);
    }
    return ret;
  }
  // Signed area.
  function area(a, b, c) {
    return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  }

  // Whether corner of a counterclockwise polygon is convex.
  function isConvex(p1, p2, p3) {
    return area(p1, p2, p3) < 0;
  }
  function equals(a, b) {
    return a.x === b.x && a.y === b.y;
  }
  function isClockwise(polygon) {
    let sum = 0;
    for (let i = 0, len = polygon.length; i < len; ++i) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % len];
      sum += (p2.x - p1.x) * (p2.y + p1.y);
    }
    return sum > 0;
  }

  // Forces counter clock wise order.
  function ForceCounterClockWise(vertices) {
    if (isClockwise(vertices)) {
      vertices.reverse();
    }
  }
  function updateVertex(vertex, vertices) {
    if (!vertex.shouldUpdate) {
      return;
    }
    vertex.shouldUpdate = false;
    const v1 = vertex.prev.point;
    const v2 = vertex.point;
    const v3 = vertex.next.point;
    vertex.isConvex = isConvex(v1, v2, v3);
    let v1x = v1.x - v2.x;
    let v1y = v1.y - v2.y;
    const v1Len = Math.sqrt(v1x * v1x + v1y * v1y);
    v1x /= v1Len;
    v1y /= v1Len;
    let v3x = v3.x - v2.x;
    let v3y = v3.y - v2.y;
    const v3Len = Math.sqrt(v3x * v3x + v3y * v3y);
    v3x /= v3Len;
    v3y /= v3Len;
    vertex.angleCos = v1x * v3x + v1y * v3y;
    if (vertex.isConvex) {
      vertex.isEar = true;
      for (let i = 0, len = vertices.length; i < len; ++i) {
        const curr = vertices[i];
        if (!curr.isActive || curr === vertex) {
          continue;
        }
        const currentPoint = curr.point;
        if (equals(v1, currentPoint) || equals(v2, currentPoint) || equals(v3, currentPoint)) {
          continue;
        }
        const areaA = area(v1, currentPoint, v2);
        const areaB = area(v2, currentPoint, v3);
        const areaC = area(v3, currentPoint, v1);
        if (areaA > 0 && areaB > 0 && areaC > 0) {
          vertex.isEar = false;
          break;
        }
        if (areaA === 0 && areaB >= 0 && areaC >= 0) {
          if (area(v1, curr.prev.point, v2) > 0 || area(v1, curr.next.point, v2) > 0) {
            vertex.isEar = false;
            break;
          }
        }
        if (areaB === 0 && areaA >= 0 && areaC >= 0) {
          if (area(v2, curr.prev.point, v3) > 0 || area(v2, curr.next.point, v3) > 0) {
            vertex.isEar = false;
            break;
          }
        }
        if (areaC === 0 && areaA >= 0 && areaB >= 0) {
          if (area(v3, curr.prev.point, v1) > 0 || area(v3, curr.next.point, v1) > 0) {
            vertex.isEar = false;
            break;
          }
        }
      }
    } else {
      vertex.isEar = false;
    }
  }
  function removeCollinearOrDuplicate(start) {
    for (let curr = start, end = start;;) {
      if (equals(curr.point, curr.next.point) || area(curr.prev.point, curr.point, curr.next.point) === 0) {
        curr.prev.next = curr.next;
        curr.next.prev = curr.prev;
        curr.prev.shouldUpdate = true;
        curr.next.shouldUpdate = true;
        if (curr === curr.next) {
          break;
        }
        end = curr.prev;
        curr = curr.next;
        continue;
      }
      curr = curr.next;
      if (curr === end) {
        break;
      }
    }
  }

  // Triangulation by ear clipping.
  function Triangulate(polygon) {
    ForceCounterClockWise(polygon);
    if (polygon.length < 4) {
      return [polygon];
    }
    const len = polygon.length;
    const vertices = [];
    const triangles = [];
    // init
    for (let i = 0; i < len; ++i) {
      const v = new Vertex();
      v.isActive = true;
      v.isConvex = false;
      v.isEar = false;
      v.point = polygon[i];
      v.angleCos = 0;
      v.shouldUpdate = true;
      v.index = i;
      vertices.push(v);
    }
    for (let i = 0; i < len; ++i) {
      const vertex = vertices[i];
      vertex.prev = vertices[(i + len - 1) % len];
      vertex.next = vertices[(i + 1) % len];
    }
    vertices.forEach(vertex => updateVertex(vertex, vertices));
    for (let i = 0; i < len - 3; ++i) {
      let ear;
      // find the most extruded ear
      for (let j = 0; j < len; ++j) {
        const vertex = vertices[j];
        if (!vertex.isActive || !vertex.isEar) {
          continue;
        }
        if (!ear) {
          ear = vertex;
        } else if (vertex.angleCos > ear.angleCos) {
          ear = vertex;
        }
      }
      if (!ear) {
        for (let i_1 = 0; i_1 < len; ++i_1) {
          const vertex = vertices[i_1];
          if (vertex.isActive) {
            const p1 = vertex.prev.point;
            const p2 = vertex.point;
            const p3 = vertex.next.point;
            if (Math.abs(area(p1, p2, p3)) > 1e-5) {
              console.log('Failed to find ear. There might be self-intersection in the polygon.');
              return null;
            }
          }
        }
        break;
      }
      triangles.push([ear.prev.point, ear.point, ear.next.point]);
      ear.isActive = false;
      ear.prev.next = ear.next;
      ear.next.prev = ear.prev;
      ear.prev.shouldUpdate = true;
      ear.next.shouldUpdate = true;
      removeCollinearOrDuplicate(ear.next);
      if (i === len - 4) {
        break;
      }
      for (let i_2 = 0; i_2 < len; ++i_2) {
        updateVertex(vertices[i_2], vertices);
      }
    }
    for (let i = 0; i < len; ++i) {
      const vertex = vertices[i];
      if (vertex.isActive) {
        vertex.prev.isActive = false;
        vertex.next.isActive = false;
        const p1 = vertex.prev.point;
        const p2 = vertex.point;
        const p3 = vertex.next.point;
        if (Math.abs(area(p1, p2, p3)) > 1e-5) {
          triangles.push([p1, p2, p3]);
        }
      }
    }
    return triangles;
  }
  _export("ConvexPartition", ConvexPartition);
  return {
    setters: [],
    execute: function () {
      Vertex = class Vertex {
        constructor() {
          this.isActive = false;
          this.isConvex = false;
          this.isEar = false;
          this.point = null;
          this.angleCos = 0;
          this.shouldUpdate = false;
          this.index = 0;
          this.prev = null;
          this.next = null;
        }
      };
    }
  };
});