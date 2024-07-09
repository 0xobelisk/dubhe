System.register("q-bundled:///fs/cocos/core/utils/jsb-utils.js", [], function (_export, _context) {
  "use strict";

  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
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

  // export interface IArrayProxy {
  //     owner: any,
  //     arrPropertyName: string,
  //     arrElementType: string,
  //     setArrayElementCB: (index: number, val: any) => void,
  //     getArrayElementCB: (index: number) => any,
  //     setArraySizeCB: (size: number) => void,
  //     getArraySizeCB: () => number,
  // }
  //
  // class ProxyHandler {
  //     private _options: IArrayProxy;
  //     constructor (options: IArrayProxy) {
  //         this._options = options;
  //     }
  //
  //     get (target: any, property: string) {
  //         const i = parseInt(property);
  //         let result;
  //         if (!isNaN(i)) {
  //             result = this._options.getArrayElementCB.call(this._options.owner, i);
  //             if (undefined == result) {
  //                 result = target[property];
  //                 this._options.setArrayElementCB.call(this._options.owner, i, result);
  //             }
  //         } else if (property === 'length') {
  //             result = this._options.getArraySizeCB.call(this._options.owner);
  //         } else if (property === 'push') {
  //             const func = target[property];
  //             result = function () {
  //                 for (let i = 0, len = arguments.length; i < len; ++i) {
  //                     this._options.setArrayElementCB(i, arguments[i]);
  //                 }
  //                 func.apply(target, arguments);
  //             };
  //         } else {
  //             console.error('dont go here....');
  //             result = target[property];
  //         }
  //         console.warn(`==> get [${property}], result: ${result}, for target: ${target}`);
  //         // property is index in this case
  //         return result;
  //     }
  //
  //     set (target: any, property: string, value: any, receiver: any) {
  //         console.warn(`==> set [${property}]=${value}, for target: ${target}`);
  //         const i = parseInt(property);
  //         if (!isNaN(i)) {
  //             if (typeof value === this._options.arrElementType) {
  //                 this._options.setArrayElementCB.call(this._options.owner, i, value);
  //             }
  //         } else if (property === 'length') {
  //             this._options.setArraySizeCB.call(this._options.owner, value);
  //         }
  //
  //         target[property] = value;
  //         // you have to return true to accept the changes
  //         return true;
  //     }
  // }
  //
  // export function defineArrayProxy (options: IArrayProxy) {
  //     const arrProxy = [new Proxy([], new ProxyHandler(options))];
  //     Object.defineProperty(options.owner, options.arrPropertyName, {
  //         enumerable: true,
  //         configurable: true,
  //         get () {
  //             // TODO: get children from native and sync to arrProxy
  //             return arrProxy[0];
  //         },
  //         set (v) {
  //             arrProxy[0] = new Proxy(v, new ProxyHandler(options));
  //             // TODO: resize native array
  //             options.setArraySizeCB.call(options.owner, v.length);
  //             for (let i = 0, len = v.length; i < len; ++i) {
  //                 const e = v[i];
  //                 if (typeof e === options.arrElementType) {
  //                     options.setArrayElementCB(i, e);
  //                 }
  //             }
  //         },
  //     });
  // }

  // TODO: we mark node as type of any, because the properties we access are only implemented on native. @dumganhar
  // issue: https://github.com/cocos/cocos-engine/issues/14644
  // export function syncNodeValues (node: Node) {
  function syncNodeValues(node) {
    var lpos = node._lpos;
    node.setPositionForJS(lpos.x, lpos.y, lpos.z);
    var lscale = node._lscale;
    node.setScaleForJS(lscale.x, lscale.y, lscale.z);
    var lrot = node._lrot;
    node.setRotationForJS(lrot.x, lrot.y, lrot.z, lrot.w);
    var euler = node._euler;
    node.setRotationFromEulerForJS(euler.x, euler.y, euler.z);
  }
  function updateChildrenForDeserialize(node) {
    if (!node) {
      return;
    }
    var children = node.children;
    if (!children) {
      return;
    }
    var len = children.length;
    if (!len) {
      return;
    }

    // NOTE: `_setChildren` is only implemented on native platforms. @dumganhar
    node._setChildren(children);
    for (var i = 0; i < len; ++i) {
      var child = children[i];
      updateChildrenForDeserialize(child);
    }
  }

  // export function updateChildren (node: Node) {
  //     if (!node) {
  //         return;
  //     }
  //
  //     const children = node.getChildren(); // cjh OPTIMIZE:  children is a GC object
  //     for (let i = 0, len = children.length; i < len; ++i) {
  //         const child = children[i];
  //         updateChildren(child);
  //     }
  //
  //     if (node._isChildrenRedefined) {
  //         return;
  //     }
  //
  //     Object.defineProperty(node, '_children', {
  //         enumerable: true,
  //         configurable: true,
  //         get () {
  //             return this.getChildren();
  //         },
  //         set (v) {
  //             this._setChildren(v);
  //         },
  //     });
  //     node._isChildrenRedefined = true;
  // }

  function ExtraEventMethods() {}
  _export({
    syncNodeValues: syncNodeValues,
    updateChildrenForDeserialize: updateChildrenForDeserialize,
    ExtraEventMethods: ExtraEventMethods
  });
  return {
    setters: [],
    execute: function () {
      ExtraEventMethods.prototype.once = function once(type, callback, target) {
        return this.on(type, callback, target, true);
      };
      ExtraEventMethods.prototype.targetOff = function targetOff(typeOrTarget) {
        this.removeAll(typeOrTarget);
      };
    }
  };
});