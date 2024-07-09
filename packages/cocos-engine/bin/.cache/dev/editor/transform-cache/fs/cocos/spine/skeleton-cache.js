System.register("q-bundled:///fs/cocos/spine/skeleton-cache.js", ["./track-entry-listeners.js", "../2d/renderer/vertex-format.js", "./lib/instantiated.js", "./lib/spine-core.js", "../core/platform/debug.js"], function (_export, _context) {
  "use strict";

  var TrackEntryListeners, vfmtPosUvColor4B, vfmtPosUvTwoColor4B, getAttributeStride, SPINE_WASM, spine, warn, FrameBoneInfo, SpineModel, SpineDrawItem, AnimationCache, SkeletonCache, _class5, MaxCacheTime, FrameTime, spineTag, _useTint, _byteStrideOneColor, _byteStrideTwoColor;
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
  _export({
    FrameBoneInfo: void 0,
    AnimationCache: void 0
  });
  return {
    setters: [function (_trackEntryListenersJs) {
      TrackEntryListeners = _trackEntryListenersJs.TrackEntryListeners;
    }, function (_dRendererVertexFormatJs) {
      vfmtPosUvColor4B = _dRendererVertexFormatJs.vfmtPosUvColor4B;
      vfmtPosUvTwoColor4B = _dRendererVertexFormatJs.vfmtPosUvTwoColor4B;
      getAttributeStride = _dRendererVertexFormatJs.getAttributeStride;
    }, function (_libInstantiatedJs) {
      SPINE_WASM = _libInstantiatedJs.SPINE_WASM;
    }, function (_libSpineCoreJs) {
      spine = _libSpineCoreJs.default;
    }, function (_corePlatformDebugJs) {
      warn = _corePlatformDebugJs.warn;
    }],
    execute: function () {
      MaxCacheTime = 30;
      FrameTime = 1 / 60;
      spineTag = SPINE_WASM;
      _useTint = true;
      _byteStrideOneColor = getAttributeStride(vfmtPosUvColor4B);
      _byteStrideTwoColor = getAttributeStride(vfmtPosUvTwoColor4B);
      _export("FrameBoneInfo", FrameBoneInfo = class FrameBoneInfo {
        constructor() {
          this.a = 0;
          this.b = 0;
          this.c = 0;
          this.d = 0;
          this.worldX = 0;
          this.worldY = 0;
        }
      });
      SpineModel = class SpineModel {
        constructor() {
          this.vCount = 0;
          this.iCount = 0;
          this.vData = null;
          this.iData = null;
          this.meshes = [];
        }
      };
      SpineDrawItem = class SpineDrawItem {
        constructor() {
          this.iCount = 0;
          this.blendMode = 0;
          this.textureID = 0;
        }
      };
      _export("AnimationCache", AnimationCache = class AnimationCache {
        constructor(data) {
          this._instance = null;
          this._state = null;
          this._skeletonData = null;
          this._skeleton = null;
          this._privateMode = false;
          this._curIndex = -1;
          this._isCompleted = false;
          this._maxFrameIdex = 0;
          this._frameIdx = -1;
          this._inited = false;
          this._invalid = true;
          this._enableCacheAttachedInfo = false;
          this._skeletonInfo = null;
          this._animationName = null;
          this.isCompleted = false;
          this.totalTime = 0;
          this.frames = [];
          this._privateMode = false;
          this._inited = false;
          this._invalid = true;
          this._instance = new spine.SkeletonInstance();
          this._instance.isCache = true;
          this._skeletonData = data;
          this._skeleton = this._instance.initSkeleton(data);
          this._instance.setUseTint(_useTint);
        }
        init(skeletonInfo, animationName) {
          this._inited = true;
          this._animationName = animationName;
          this._skeletonInfo = skeletonInfo;
        }
        get skeleton() {
          return this._skeleton;
        }
        setSkin(skinName) {
          if (this._skeleton) this._skeleton.setSkinByName(skinName);
          this._instance.setSkin(skinName);
        }
        setAnimation(animationName) {
          const animations = this._skeletonData.animations;
          let animation = null;
          animations.forEach(element => {
            if (element.name === animationName) {
              animation = element;
            }
          });
          if (!animation) {
            warn(`find no animation named ${animationName} !!!`);
            return;
          }
          this._maxFrameIdex = Math.floor(animation.duration / FrameTime);
          if (this._maxFrameIdex <= 0) this._maxFrameIdex = 1;
          this._instance.setAnimation(0, animationName, false);
        }
        updateToFrame(frameIdx) {
          if (!this._inited) return;
          this.begin();
          if (!this.needToUpdate(frameIdx)) return;
          do {
            // Solid update frame rate 1/60.
            this._frameIdx++;
            this.totalTime += FrameTime;
            this._instance.updateAnimation(FrameTime);
            const model = this._instance.updateRenderData();
            this.updateRenderData(this._frameIdx, model);
            if (this._frameIdx >= this._maxFrameIdex) {
              this.isCompleted = true;
            }
          } while (this.needToUpdate(frameIdx));
        }
        getFrame(frameIdx) {
          const index = frameIdx % this._maxFrameIdex;
          return this.frames[index];
        }
        invalidAnimationFrames() {
          this._curIndex = -1;
          this._isCompleted = false;
          this.frames.length = 0;
        }
        updateRenderData(index, model) {
          const vc = model.vCount;
          const ic = model.iCount;
          const floatStride = (_useTint ? _byteStrideTwoColor : _byteStrideOneColor) / Float32Array.BYTES_PER_ELEMENT;
          const vUint8Buf = new Uint8Array(Float32Array.BYTES_PER_ELEMENT * floatStride * vc);
          const iUint16Buf = new Uint16Array(ic);
          const HEAPU8 = spine.wasmUtil.wasm.HEAPU8;
          const vPtr = model.vPtr;
          const vLength = vc * Float32Array.BYTES_PER_ELEMENT * floatStride;
          // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
          vUint8Buf.set(HEAPU8.subarray(vPtr, vPtr + vLength));
          const iPtr = model.iPtr;
          const iLength = Uint16Array.BYTES_PER_ELEMENT * ic;
          // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
          const iUint8Buf = new Uint8Array(iUint16Buf.buffer);
          iUint8Buf.set(HEAPU8.subarray(iPtr, iPtr + iLength));
          const modelData = new SpineModel();
          modelData.vCount = vc;
          modelData.iCount = ic;
          modelData.vData = vUint8Buf;
          modelData.iData = iUint16Buf;
          const data = model.getData();
          const count = data.size();
          for (let i = 0; i < count; i += 6) {
            const meshData = new SpineDrawItem();
            meshData.iCount = data.get(i + 3);
            meshData.blendMode = data.get(i + 4);
            meshData.textureID = data.get(i + 5);
            modelData.meshes.push(meshData);
          }
          const bones = this._skeleton.bones;
          const boneInfosArray = [];
          bones.forEach(bone => {
            const boneInfo = new FrameBoneInfo();
            boneInfo.a = bone.a;
            boneInfo.b = bone.b;
            boneInfo.c = bone.c;
            boneInfo.d = bone.d;
            boneInfo.worldX = bone.worldX;
            boneInfo.worldY = bone.worldY;
            boneInfosArray.push(boneInfo);
          });
          this.frames[index] = {
            model: modelData,
            boneInfos: boneInfosArray
          };
        }
        begin() {
          if (!this._invalid) return;
          const skeletonInfo = this._skeletonInfo;
          const preAnimationCache = skeletonInfo === null || skeletonInfo === void 0 ? void 0 : skeletonInfo.curAnimationCache;
          if (preAnimationCache && preAnimationCache !== this) {
            if (this._privateMode) {
              // Private cache mode just invalid pre animation frame.
              preAnimationCache.invalidAllFrame();
            } else {
              // If pre animation not finished, play it to the end.
              preAnimationCache.updateToFrame(0);
            }
          }
          const listener = skeletonInfo === null || skeletonInfo === void 0 ? void 0 : skeletonInfo.listener;
          this._instance.setAnimation(0, this._animationName, false);
          this.bind(listener);

          // record cur animation cache
          skeletonInfo.curAnimationCache = this;
          this._frameIdx = -1;
          this.isCompleted = false;
          this.totalTime = 0;
          this._invalid = false;
        }
        end() {
          if (!this.needToUpdate()) {
            // clear cur animation cache
            this._skeletonInfo.curAnimationCache = null;
            this.frames.length = this._frameIdx + 1;
            this.isCompleted = true;
            this.unbind(this._skeletonInfo.listener);
          }
        }
        bind(listener) {
          const completeHandle = entry => {
            if (entry && entry.animation.name === this._animationName) {
              this.isCompleted = true;
            }
          };
          listener.complete = completeHandle;
        }
        unbind(listener) {
          listener.complete = null;
        }
        needToUpdate(toFrameIdx) {
          return !this.isCompleted && this.totalTime < MaxCacheTime && (toFrameIdx === undefined || this._frameIdx < toFrameIdx);
        }
        isInited() {
          return this._inited;
        }
        isInvalid() {
          return this._invalid;
        }
        invalidAllFrame() {
          this.isCompleted = false;
          this._invalid = true;
        }
        enableCacheAttachedInfo() {
          if (!this._enableCacheAttachedInfo) {
            this._enableCacheAttachedInfo = true;
            this.invalidAllFrame();
          }
        }

        // Clear texture quote.
        clear() {
          this._inited = false;
          this.invalidAllFrame();
        }
        destroy() {
          if (this._instance) {
            this._instance.destroy();
            this._instance = null;
          }
        }
      });
      SkeletonCache = class SkeletonCache {
        constructor() {
          this._privateMode = void 0;
          this._skeletonCache = void 0;
          //for shared mode only
          this._animationPool = void 0;
          //for shared mode only, key is asset uuid and value is ref count.
          this._sharedCacheMap = new Map();
          this._privateMode = false;
          this._animationPool = {};
          this._skeletonCache = {};
        }
        enablePrivateMode() {
          this._privateMode = true;
        }
        clear() {
          this._animationPool = {};
          this._skeletonCache = {};
        }
        invalidAnimationCache(uuid) {
          const skeletonInfo = this._skeletonCache[uuid];
          const skeleton = skeletonInfo && skeletonInfo.skeleton;
          if (!skeleton) return;
          const animationsCache = skeletonInfo.animationsCache;
          for (const aniKey in animationsCache) {
            const animationCache = animationsCache[aniKey];
            animationCache.invalidAllFrame();
          }
        }
        destroySkeleton(assetUuid) {
          if (!this._privateMode) {
            let refCount = this._sharedCacheMap.get(assetUuid);
            if (refCount) {
              refCount -= 1;
              if (refCount > 0) {
                this._sharedCacheMap.set(assetUuid, refCount);
                return;
              }
              this._sharedCacheMap.delete(assetUuid);
            }
          }
          const sharedOperate = (aniKey, animationCache) => {
            this._animationPool[`${assetUuid}#${aniKey}`] = animationCache;
            animationCache.clear();
          };
          const privateOperate = (aniKey, animationCache) => {
            animationCache.destroy();
          };
          const operate = this._privateMode ? privateOperate : sharedOperate;
          const skeletonInfo = this._skeletonCache[assetUuid];
          if (!skeletonInfo) return;
          const animationsCache = skeletonInfo.animationsCache;
          for (const aniKey in animationsCache) {
            // Clear cache texture, and put cache into pool.
            // No need to create TypedArray next time.
            const animationCache = animationsCache[aniKey];
            if (!animationCache) continue;
            operate(aniKey, animationCache);
          }
          if (skeletonInfo.skeleton) {
            spine.wasmUtil.destroySpineSkeleton(skeletonInfo.skeleton);
          }
          delete this._skeletonCache[assetUuid];
        }
        createSkeletonInfo(skeletonAsset) {
          const uuid = skeletonAsset.uuid;
          const runtimeData = skeletonAsset.getRuntimeData();
          if (!this._privateMode) {
            let refCount = this._sharedCacheMap.get(uuid);
            if (!refCount) {
              refCount = 1;
            } else {
              refCount += 1;
            }
            this._sharedCacheMap.set(uuid, refCount);
          }
          if (this._skeletonCache[uuid]) {
            return this._skeletonCache[uuid];
          }
          const skeleton = new spine.Skeleton(runtimeData);
          const clipper = null;
          const state = null;
          const listener = new TrackEntryListeners();
          const skeletonInfo = this._skeletonCache[uuid] = {
            skeleton,
            clipper,
            state,
            listener,
            // Cache all kinds of animation frame.
            // When skeleton is dispose, clear all animation cache.
            animationsCache: {},
            curAnimationCache: null,
            assetUUID: uuid
          };
          return skeletonInfo;
        }
        getSkeletonInfo(skeletonAsset) {
          const uuid = skeletonAsset.uuid;
          return this._skeletonCache[uuid];
        }
        getAnimationCache(uuid, animationName) {
          const skeletonInfo = this._skeletonCache[uuid];
          if (!skeletonInfo) return null;
          const animationsCache = skeletonInfo.animationsCache;
          return animationsCache[animationName];
        }
        initAnimationCache(uuid, data, animationName) {
          const spData = data.getRuntimeData();
          if (!spData) return null;
          const skeletonInfo = this._skeletonCache[uuid];
          const skeleton = skeletonInfo && skeletonInfo.skeleton;
          if (!skeleton) return null;
          const animationsCache = skeletonInfo.animationsCache;
          let animationCache = animationsCache[animationName];
          if (!animationCache) {
            // If cache exist in pool, then just use it.
            const poolKey = `${uuid}#${animationName}`;
            animationCache = this._animationPool[poolKey];
            if (animationCache) {
              delete this._animationPool[poolKey];
            } else {
              animationCache = new AnimationCache(spData);
              animationCache._privateMode = this._privateMode;
            }
            animationCache.init(skeletonInfo, animationName);
            animationsCache[animationName] = animationCache;
          }
          animationCache.init(skeletonInfo, animationName);
          animationCache.setAnimation(animationName);
          return animationCache;
        }
        destroyCachedAnimations(uuid) {
          if (uuid) {
            const animationPool = this._animationPool;
            for (const key in animationPool) {
              if (key.includes(uuid)) {
                animationPool[key].destroy();
                delete animationPool[key];
              }
            }
          } else {
            const animationPool = this._animationPool;
            for (const key in animationPool) {
              animationPool[key].destroy();
              delete animationPool[key];
            }
          }
        }
      };
      _class5 = SkeletonCache;
      SkeletonCache.FrameTime = FrameTime;
      SkeletonCache.sharedCache = new _class5();
      _export("default", SkeletonCache);
    }
  };
});