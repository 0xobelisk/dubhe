System.register("q-bundled:///fs/cocos/spine/index.js", ["../core/index.js", "./lib/spine-core.js", "./skeleton.js", "./skeleton-data.js", "./vertex-effect-delegate.js", "./assembler/index.js"], function (_export, _context) {
  "use strict";

  var ccenum, spine, ATTACHMENT_TYPE, AnimationEventType;
  _export({
    ATTACHMENT_TYPE: void 0,
    AnimationEventType: void 0
  });
  return {
    setters: [function (_coreIndexJs) {
      ccenum = _coreIndexJs.ccenum;
    }, function (_libSpineCoreJs) {
      spine = _libSpineCoreJs.default;
    }, function (_skeletonJs) {
      var _exportObj = {};
      for (var _key in _skeletonJs) {
        if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _skeletonJs[_key];
      }
      _export(_exportObj);
    }, function (_skeletonDataJs) {
      var _exportObj2 = {};
      for (var _key2 in _skeletonDataJs) {
        if (_key2 !== "default" && _key2 !== "__esModule") _exportObj2[_key2] = _skeletonDataJs[_key2];
      }
      _export(_exportObj2);
    }, function (_vertexEffectDelegateJs) {
      var _exportObj3 = {};
      for (var _key3 in _vertexEffectDelegateJs) {
        if (_key3 !== "default" && _key3 !== "__esModule") _exportObj3[_key3] = _vertexEffectDelegateJs[_key3];
      }
      _export(_exportObj3);
    }, function (_assemblerIndexJs) {
      var _exportObj4 = {};
      for (var _key4 in _assemblerIndexJs) {
        if (_key4 !== "default" && _key4 !== "__esModule") _exportObj4[_key4] = _assemblerIndexJs[_key4];
      }
      _export(_exportObj4);
    }],
    execute: function () {
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
       * The global main namespace of Spine, all classes, functions,
       * properties and constants of Spine are defined in this namespace
       * @zh
       * Spine 的全局的命名空间，
       * 与 Spine 相关的所有的类，函数，属性，常量都在这个命名空间中定义。
       * @module sp
       * @main sp
       */
      /*
       * Reference:
       * http://esotericsoftware.com/spine-runtime-terminology
       * http://esotericsoftware.com/files/runtime-diagram.png
       * http://en.esotericsoftware.com/spine-using-runtimes
       */
      _export("spine", spine);
      /**
      * @internal Since v3.7.2, this is an engine private type.
      */
      /**
       * @en
       * The attachment type of spine. It contains three type: REGION(0), BOUNDING_BOX(1), MESH(2) and SKINNED_MESH.
       * [REGION] An attachment that displays a textured quadrilateral.
       * [BOUNDING_BOX] An attachment with vertices that make up a polygon. Can be used for hit detection,
       * creating physics bodies, spawning particle effects, and more.
       * [MESH] An attachment that displays a textured mesh.
       * [SKINNED_MESH] No used any more.
       * @zh
       * Attachment 类型枚举。类型包括 REGION, BOUNDING_BOX, MESH, SKINNED_MESH。
       * [REGION] 一个用于显示 texture 四边形的附件。
       * [BOUNDING_BOX] 一个带有顶点的附件。顶点构成的多边形可用于碰撞检测，创建物理实体，生成粒子特效等等。
       * [MESH] 一个可以显示 texture 网格的附件。
       * [SKINNED_MESH] 已废弃。
       */
      (function (ATTACHMENT_TYPE) {
        ATTACHMENT_TYPE[ATTACHMENT_TYPE["REGION"] = 0] = "REGION";
        ATTACHMENT_TYPE[ATTACHMENT_TYPE["BOUNDING_BOX"] = 1] = "BOUNDING_BOX";
        ATTACHMENT_TYPE[ATTACHMENT_TYPE["MESH"] = 2] = "MESH";
        ATTACHMENT_TYPE[ATTACHMENT_TYPE["SKINNED_MESH"] = 3] = "SKINNED_MESH";
      })(ATTACHMENT_TYPE || _export("ATTACHMENT_TYPE", ATTACHMENT_TYPE = {}));
      ccenum(ATTACHMENT_TYPE);

      /**
       * @en The event type of spine skeleton animation.
       * @zh 骨骼动画事件类型。
       * @enum AnimationEventType
       */
      (function (AnimationEventType) {
        AnimationEventType[AnimationEventType["START"] = 0] = "START";
        AnimationEventType[AnimationEventType["INTERRUPT"] = 1] = "INTERRUPT";
        AnimationEventType[AnimationEventType["END"] = 2] = "END";
        AnimationEventType[AnimationEventType["DISPOSE"] = 3] = "DISPOSE";
        AnimationEventType[AnimationEventType["COMPLETE"] = 4] = "COMPLETE";
        AnimationEventType[AnimationEventType["EVENT"] = 5] = "EVENT";
      })(AnimationEventType || _export("AnimationEventType", AnimationEventType = {}));
      ccenum(AnimationEventType);
    }
  };
});