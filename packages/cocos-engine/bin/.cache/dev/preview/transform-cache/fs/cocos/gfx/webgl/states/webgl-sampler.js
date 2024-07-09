System.register("q-bundled:///fs/cocos/gfx/webgl/states/webgl-sampler.js", ["../../base/define.js", "../../base/states/sampler.js"], function (_export, _context) {
  "use strict";

  var Filter, Sampler, WebGLWraps, WebGLSampler;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
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
    setters: [function (_baseDefineJs) {
      Filter = _baseDefineJs.Filter;
    }, function (_baseStatesSamplerJs) {
      Sampler = _baseStatesSamplerJs.Sampler;
    }],
    execute: function () {
      WebGLWraps = [0x2901,
      // WebGLRenderingContext.REPEAT,
      0x8370,
      // WebGLRenderingContext.MIRRORED_REPEAT,
      0x812F,
      // WebGLRenderingContext.CLAMP_TO_EDGE,
      0x812F // WebGLRenderingContext.CLAMP_TO_EDGE,
      ];
      _export("WebGLSampler", WebGLSampler = /*#__PURE__*/function (_Sampler) {
        _inheritsLoose(WebGLSampler, _Sampler);
        function WebGLSampler(info, hash) {
          var _this;
          _this = _Sampler.call(this, info, hash) || this;
          _this._gpuSampler = null;
          var glMinFilter = 0;
          var glMagFilter = 0;
          var minFilter = _this._info.minFilter;
          var magFilter = _this._info.magFilter;
          var mipFilter = _this._info.mipFilter;
          if (minFilter === Filter.LINEAR || minFilter === Filter.ANISOTROPIC) {
            if (mipFilter === Filter.LINEAR || mipFilter === Filter.ANISOTROPIC) {
              glMinFilter = 0x2703; // WebGLRenderingContext.LINEAR_MIPMAP_LINEAR;
            } else if (mipFilter === Filter.POINT) {
              glMinFilter = 0x2701; // WebGLRenderingContext.LINEAR_MIPMAP_NEAREST;
            } else {
              glMinFilter = 0x2601; // WebGLRenderingContext.LINEAR;
            }
          } else if (mipFilter === Filter.LINEAR || mipFilter === Filter.ANISOTROPIC) {
            glMinFilter = 0x2702; // WebGLRenderingContext.NEAREST_MIPMAP_LINEAR;
          } else if (mipFilter === Filter.POINT) {
            glMinFilter = 0x2700; // WebGLRenderingContext.NEAREST_MIPMAP_NEAREST;
          } else {
            glMinFilter = 0x2600; // WebGLRenderingContext.NEAREST;
          }

          if (magFilter === Filter.LINEAR || magFilter === Filter.ANISOTROPIC) {
            glMagFilter = 0x2601; // WebGLRenderingContext.LINEAR;
          } else {
            glMagFilter = 0x2600; // WebGLRenderingContext.NEAREST;
          }

          var glWrapS = WebGLWraps[_this._info.addressU];
          var glWrapT = WebGLWraps[_this._info.addressV];
          var glWrapR = WebGLWraps[_this._info.addressW];
          _this._gpuSampler = {
            glMinFilter: glMinFilter,
            glMagFilter: glMagFilter,
            glWrapS: glWrapS,
            glWrapT: glWrapT,
            glWrapR: glWrapR
          };
          return _this;
        }
        _createClass(WebGLSampler, [{
          key: "gpuSampler",
          get: function get() {
            return this._gpuSampler;
          }
        }]);
        return WebGLSampler;
      }(Sampler));
    }
  };
});