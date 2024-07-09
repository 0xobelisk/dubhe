System.register("q-bundled:///fs/cocos/gfx/base/swapchain.js", ["./define.js"], function (_export, _context) {
  "use strict";

  var GFXObject, ObjectType, SurfaceTransform, Swapchain;
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); } /*
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
  return {
    setters: [function (_defineJs) {
      GFXObject = _defineJs.GFXObject;
      ObjectType = _defineJs.ObjectType;
      SurfaceTransform = _defineJs.SurfaceTransform;
    }],
    execute: function () {
      /**
       * @en GFX Swapchain.
       * @zh GFX 交换链。
       */
      _export("Swapchain", Swapchain = /*#__PURE__*/function (_GFXObject) {
        _inheritsLoose(Swapchain, _GFXObject);
        function Swapchain() {
          var _this;
          _this = _GFXObject.call(this, ObjectType.SWAPCHAIN) || this;
          _this._transform = SurfaceTransform.IDENTITY;
          _this._colorTexture = null;
          _this._depthStencilTexture = null;
          return _this;
        }
        _createClass(Swapchain, [{
          key: "colorTexture",
          get:
          /**
           * @en The color texture of this swapchain.
           * @zh 当前交换链的颜色缓冲。
           */
          function get() {
            return this._colorTexture;
          }

          /**
           * @en The depth stencil texture of this swapchain.
           * @zh 当前交换链的深度模板缓冲。
           */
        }, {
          key: "depthStencilTexture",
          get: function get() {
            return this._depthStencilTexture;
          }

          /**
           * @en The surface transform to be applied in projection matrices.
           * @zh 需要在投影矩阵中应用的表面变换。
           */
        }, {
          key: "surfaceTransform",
          get: function get() {
            return this._transform;
          }
        }, {
          key: "width",
          get: function get() {
            return this._colorTexture.width;
          }
        }, {
          key: "height",
          get: function get() {
            return this._colorTexture.height;
          }
        }]);
        return Swapchain;
      }(GFXObject));
    }
  };
});