System.register("q-bundled:///fs/cocos/spine/skeleton-system.js", ["../game/director.js", "../core/index.js", "../core/global-exports.js"], function (_export, _context) {
  "use strict";

  var director, System, legacyCC, SkeletonSystem;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
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
  _export("SkeletonSystem", void 0);
  return {
    setters: [function (_gameDirectorJs) {
      director = _gameDirectorJs.director;
    }, function (_coreIndexJs) {
      System = _coreIndexJs.System;
    }, function (_coreGlobalExportsJs) {
      legacyCC = _coreGlobalExportsJs.legacyCC;
    }],
    execute: function () {
      _export("SkeletonSystem", SkeletonSystem = class SkeletonSystem extends System {
        constructor() {
          super();
          this._skeletons = new Set();
        }

        /**
         * @en
         * Gets the instance of the Spine Skeleton system.
         * @zh
         * 获取 Spine 骨骼系统的单例。
         */
        static getInstance() {
          if (!SkeletonSystem._instance) {
            SkeletonSystem._instance = new SkeletonSystem();
            director.registerSystem(SkeletonSystem.ID, SkeletonSystem._instance, System.Priority.HIGH);
          }
          return SkeletonSystem._instance;
        }
        add(skeleton) {
          if (!skeleton) return;
          if (!this._skeletons.has(skeleton)) {
            this._skeletons.add(skeleton);
          }
        }
        remove(skeleton) {
          if (!skeleton) return;
          if (this._skeletons.has(skeleton)) {
            this._skeletons.delete(skeleton);
          }
        }
        postUpdate(dt) {
          if (!this._skeletons) {
            return;
          }
          this._skeletons.forEach(skeleton => {
            skeleton.updateAnimation(dt);
          });
        }
        prepareRenderData() {
          if (!this._skeletons) {
            return;
          }
          this._skeletons.forEach(skeleton => {
            skeleton.markForUpdateRenderData();
          });
        }
      });
      /**
       * @en
       * The ID flag of the system.
       * @zh
       * 此系统的 ID 标记。
       */
      SkeletonSystem.ID = 'SKELETON';
      SkeletonSystem._instance = void 0;
      legacyCC.internal.SpineSkeletonSystem = SkeletonSystem;
    }
  };
});