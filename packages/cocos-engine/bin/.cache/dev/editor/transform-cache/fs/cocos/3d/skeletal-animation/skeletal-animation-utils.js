System.register("q-bundled:///fs/cocos/3d/skeletal-animation/skeletal-animation-utils.js", ["../../../../virtual/internal%253Aconstants.js", "./skeletal-animation-data-hub.js", "../../animation/transform-utils.js", "../../core/index.js", "../../gfx/index.js", "../../rendering/define.js", "../../render-scene/core/texture-buffer-pool.js", "../misc/joint-texture-sampler-info.js"], function (_export, _context) {
  "use strict";

  var EDITOR, JSB, SkelAnimDataHub, getWorldTransformUntilRoot, geometry, Mat4, Quat, Vec3, BufferUsageBit, Format, FormatInfos, MemoryUsageBit, BufferInfo, FormatFeatureBit, UBOSkinningAnimation, TextureBufferPool, jointTextureSamplerInfo, JointTexturePool, JointAnimationInfo, uploadJointData, MINIMUM_JOINT_TEXTURE_SIZE, dq_0, dq_1, v3_1, qt_1, v3_2, v3_3, v3_4, v3_min, v3_max, m4_1, m4_2, ab_1, Inf;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             http://www.cocos.com
                                                                                                                                                                                                                                                                                                                                                                                            
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
  // have to be multiples of 12

  function selectJointsMediumFormat(device) {
    if (device.getFormatFeatures(Format.RGBA32F) & FormatFeatureBit.SAMPLED_TEXTURE) {
      return Format.RGBA32F;
    }
    return Format.RGBA8;
  }

  // Linear Blending Skinning
  function uploadJointDataLBS(out, base, mat, firstBone) {
    out[base + 0] = mat.m00;
    out[base + 1] = mat.m01;
    out[base + 2] = mat.m02;
    out[base + 3] = mat.m12;
    out[base + 4] = mat.m04;
    out[base + 5] = mat.m05;
    out[base + 6] = mat.m06;
    out[base + 7] = mat.m13;
    out[base + 8] = mat.m08;
    out[base + 9] = mat.m09;
    out[base + 10] = mat.m10;
    out[base + 11] = mat.m14;
  }
  // Dual Quaternion Skinning
  function uploadJointDataDQS(out, base, mat, firstBone) {
    Mat4.toRTS(mat, qt_1, v3_1, v3_2);
    // sign consistency
    if (firstBone) {
      Quat.copy(dq_0, qt_1);
    } else if (Quat.dot(dq_0, qt_1) < 0) {
      Quat.multiplyScalar(qt_1, qt_1, -1);
    }
    // conversion
    Quat.set(dq_1, v3_1.x, v3_1.y, v3_1.z, 0);
    Quat.multiplyScalar(dq_1, Quat.multiply(dq_1, dq_1, qt_1), 0.5);
    // upload
    out[base + 0] = qt_1.x;
    out[base + 1] = qt_1.y;
    out[base + 2] = qt_1.z;
    out[base + 3] = qt_1.w;
    out[base + 4] = dq_1.x;
    out[base + 5] = dq_1.y;
    out[base + 6] = dq_1.z;
    out[base + 7] = dq_1.w;
    out[base + 8] = v3_2.x;
    out[base + 9] = v3_2.y;
    out[base + 10] = v3_2.z;
  }
  function roundUpTextureSize(targetLength, formatSize) {
    const formatScale = 4 / Math.sqrt(formatSize);
    return Math.ceil(Math.max(MINIMUM_JOINT_TEXTURE_SIZE * formatScale, targetLength) / 12) * 12;
  }
  _export({
    selectJointsMediumFormat: selectJointsMediumFormat,
    JointTexturePool: void 0,
    JointAnimationInfo: void 0
  });
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
      JSB = _virtualInternal253AconstantsJs.JSB;
    }, function (_skeletalAnimationDataHubJs) {
      SkelAnimDataHub = _skeletalAnimationDataHubJs.SkelAnimDataHub;
    }, function (_animationTransformUtilsJs) {
      getWorldTransformUntilRoot = _animationTransformUtilsJs.getWorldTransformUntilRoot;
    }, function (_coreIndexJs) {
      geometry = _coreIndexJs.geometry;
      Mat4 = _coreIndexJs.Mat4;
      Quat = _coreIndexJs.Quat;
      Vec3 = _coreIndexJs.Vec3;
    }, function (_gfxIndexJs) {
      BufferUsageBit = _gfxIndexJs.BufferUsageBit;
      Format = _gfxIndexJs.Format;
      FormatInfos = _gfxIndexJs.FormatInfos;
      MemoryUsageBit = _gfxIndexJs.MemoryUsageBit;
      BufferInfo = _gfxIndexJs.BufferInfo;
      FormatFeatureBit = _gfxIndexJs.FormatFeatureBit;
    }, function (_renderingDefineJs) {
      UBOSkinningAnimation = _renderingDefineJs.UBOSkinningAnimation;
    }, function (_renderSceneCoreTextureBufferPoolJs) {
      TextureBufferPool = _renderSceneCoreTextureBufferPoolJs.TextureBufferPool;
    }, function (_miscJointTextureSamplerInfoJs) {
      jointTextureSamplerInfo = _miscJointTextureSamplerInfoJs.jointTextureSamplerInfo;
    }],
    execute: function () {
      // change here and cc-skinning.chunk to use other skinning algorithms
      _export("uploadJointData", uploadJointData = uploadJointDataLBS);
      _export("MINIMUM_JOINT_TEXTURE_SIZE", MINIMUM_JOINT_TEXTURE_SIZE = EDITOR ? 2040 : 480);
      dq_0 = new Quat();
      dq_1 = new Quat();
      v3_1 = new Vec3();
      qt_1 = new Quat();
      v3_2 = new Vec3();
      _export("jointTextureSamplerInfo", jointTextureSamplerInfo);
      v3_3 = new Vec3();
      v3_4 = new Vec3();
      v3_min = new Vec3();
      v3_max = new Vec3();
      m4_1 = new Mat4();
      m4_2 = new Mat4();
      ab_1 = new geometry.AABB();
      // Have to use some big number to replace the actual 'Infinity'.
      // For (Infinity - Infinity) evaluates to NaN
      Inf = Number.MAX_SAFE_INTEGER;
      /**
       * The pool for joint textures.
       * @internal
       */
      _export("JointTexturePool", JointTexturePool = class JointTexturePool {
        // hash -> chunkIdx

        get pixelsPerJoint() {
          return this._pixelsPerJoint;
        }
        constructor(device) {
          this._device = void 0;
          this._pool = void 0;
          this._textureBuffers = new Map();
          // per skeleton per clip
          this._formatSize = void 0;
          this._pixelsPerJoint = void 0;
          this._customPool = void 0;
          this._chunkIdxMap = new Map();
          this._device = device;
          const format = selectJointsMediumFormat(this._device);
          this._formatSize = FormatInfos[format].size;
          this._pixelsPerJoint = 48 / this._formatSize;
          this._pool = new TextureBufferPool(device);
          this._pool.initialize({
            format,
            roundUpFn: roundUpTextureSize
          });
          this._customPool = new TextureBufferPool(device);
          this._customPool.initialize({
            format,
            roundUpFn: roundUpTextureSize
          });
        }
        clear() {
          this._pool.destroy();
          this._textureBuffers.clear();
        }
        registerCustomTextureLayouts(layouts) {
          for (let i = 0; i < layouts.length; i++) {
            const layout = layouts[i];
            let textureLength = layout.textureLength;
            if (!(this._device.getFormatFeatures(Format.RGBA32F) & FormatFeatureBit.SAMPLED_TEXTURE)) {
              textureLength *= 2; // RGBA8 format textures need 4 times the memory.
            }

            const chunkIdx = this._customPool.createChunk(textureLength);
            for (let j = 0; j < layout.contents.length; j++) {
              const content = layout.contents[j];
              const {
                skeleton
              } = content;
              this._chunkIdxMap.set(skeleton, chunkIdx); // include default pose too
              for (let k = 0; k < content.clips.length; k++) {
                const clip = content.clips[k];
                this._chunkIdxMap.set(skeleton ^ clip, chunkIdx);
              }
            }
          }
        }

        /**
         * @en
         * Get joint texture for the default pose.
         * @zh
         * 获取默认姿势的骨骼贴图。
         */
        getDefaultPoseTexture(skeleton, mesh, skinningRoot) {
          const hash = skeleton.hash ^ 0; // may not equal to skeleton.hash
          let texture = this._textureBuffers.get(hash) || null;
          if (texture && texture.bounds.has(mesh.hash)) {
            texture.refCount++;
            return texture;
          }
          const {
            joints,
            bindposes
          } = skeleton;
          let textureBuffer = null;
          let buildTexture = false;
          const jointCount = joints.length;
          if (!texture) {
            const bufSize = jointCount * 12;
            const customChunkIdx = this._chunkIdxMap.get(hash);
            const handle = customChunkIdx !== undefined ? this._customPool.alloc(bufSize * Float32Array.BYTES_PER_ELEMENT, customChunkIdx) : this._pool.alloc(bufSize * Float32Array.BYTES_PER_ELEMENT);
            if (!handle) {
              return texture;
            }
            texture = {
              pixelOffset: handle.start / this._formatSize,
              refCount: 1,
              bounds: new Map(),
              skeletonHash: skeleton.hash,
              clipHash: 0,
              readyToBeDeleted: false,
              handle
            };
            textureBuffer = new Float32Array(bufSize);
            buildTexture = true;
          } else {
            texture.refCount++;
          }
          Vec3.set(v3_min, Inf, Inf, Inf);
          Vec3.set(v3_max, -Inf, -Inf, -Inf);
          const boneSpaceBounds = mesh.getBoneSpaceBounds(skeleton);
          for (let j = 0, offset = 0; j < jointCount; j++, offset += 12) {
            const node = skinningRoot.getChildByPath(joints[j]);
            const mat = node ? getWorldTransformUntilRoot(node, skinningRoot, m4_1) : skeleton.inverseBindposes[j];
            const bound = boneSpaceBounds[j];
            if (bound) {
              geometry.AABB.transform(ab_1, bound, mat);
              ab_1.getBoundary(v3_3, v3_4);
              Vec3.min(v3_min, v3_min, v3_3);
              Vec3.max(v3_max, v3_max, v3_4);
            }
            if (buildTexture) {
              if (node) {
                Mat4.multiply(mat, mat, bindposes[j]);
              }
              uploadJointData(textureBuffer, offset, node ? mat : Mat4.IDENTITY, j === 0);
            }
          }
          const bounds = [new geometry.AABB()];
          texture.bounds.set(mesh.hash, bounds);
          geometry.AABB.fromPoints(bounds[0], v3_min, v3_max);
          if (buildTexture) {
            this._pool.update(texture.handle, textureBuffer.buffer);
            this._textureBuffers.set(hash, texture);
          }
          return texture;
        }

        /**
         * @en
         * Get joint texture for the specified animation clip.
         * @zh
         * 获取指定动画片段的骨骼贴图。
         */
        getSequencePoseTexture(skeleton, clip, mesh, skinningRoot) {
          const hash = skeleton.hash ^ clip.hash;
          let texture = this._textureBuffers.get(hash) || null;
          if (texture && texture.bounds.has(mesh.hash)) {
            texture.refCount++;
            return texture;
          }
          const {
            joints,
            bindposes
          } = skeleton;
          const clipData = SkelAnimDataHub.getOrExtract(clip);
          const {
            frames
          } = clipData;
          let textureBuffer = null;
          let buildTexture = false;
          const jointCount = joints.length;
          if (!texture) {
            const bufSize = jointCount * 12 * frames;
            const customChunkIdx = this._chunkIdxMap.get(hash);
            const handle = customChunkIdx !== undefined ? this._customPool.alloc(bufSize * Float32Array.BYTES_PER_ELEMENT, customChunkIdx) : this._pool.alloc(bufSize * Float32Array.BYTES_PER_ELEMENT);
            if (!handle) {
              return null;
            }
            const animInfos = this._createAnimInfos(skeleton, clip, skinningRoot);
            texture = {
              pixelOffset: handle.start / this._formatSize,
              refCount: 1,
              bounds: new Map(),
              skeletonHash: skeleton.hash,
              clipHash: clip.hash,
              readyToBeDeleted: false,
              handle,
              animInfos
            };
            textureBuffer = new Float32Array(bufSize);
            buildTexture = true;
          } else {
            texture.refCount++;
          }
          const boneSpaceBounds = mesh.getBoneSpaceBounds(skeleton);
          const bounds = [];
          texture.bounds.set(mesh.hash, bounds);
          for (let f = 0; f < frames; f++) {
            bounds.push(new geometry.AABB(Inf, Inf, Inf, -Inf, -Inf, -Inf));
          }
          for (let f = 0, offset = 0; f < frames; f++) {
            const bound = bounds[f];
            for (let j = 0; j < jointCount; j++, offset += 12) {
              const {
                curveData,
                downstream,
                bindposeIdx,
                bindposeCorrection
              } = texture.animInfos[j];
              let mat;
              let transformValid = true;
              if (curveData && downstream) {
                // curve & static two-way combination
                mat = Mat4.multiply(m4_1, curveData[f], downstream);
              } else if (curveData) {
                // there is a curve directly controlling the joint
                mat = curveData[f];
              } else if (downstream) {
                // fallback to default pose if no animation curve can be found upstream
                mat = downstream;
              } else {
                // bottom line: render the original mesh as-is
                mat = skeleton.inverseBindposes[bindposeIdx];
                transformValid = false;
              }
              const boneSpaceBound = boneSpaceBounds[j];
              if (boneSpaceBound) {
                const transform = bindposeCorrection ? Mat4.multiply(m4_2, mat, bindposeCorrection) : mat;
                geometry.AABB.transform(ab_1, boneSpaceBound, transform);
                ab_1.getBoundary(v3_3, v3_4);
                Vec3.min(bound.center, bound.center, v3_3);
                Vec3.max(bound.halfExtents, bound.halfExtents, v3_4);
              }
              if (buildTexture) {
                if (transformValid) {
                  Mat4.multiply(m4_1, mat, bindposes[bindposeIdx]);
                }
                uploadJointData(textureBuffer, offset, transformValid ? m4_1 : Mat4.IDENTITY, j === 0);
              }
            }
            geometry.AABB.fromPoints(bound, bound.center, bound.halfExtents);
          }
          if (buildTexture) {
            this._pool.update(texture.handle, textureBuffer.buffer);
            this._textureBuffers.set(hash, texture);
          }
          return texture;
        }
        releaseHandle(handle) {
          if (handle.refCount > 0) {
            handle.refCount--;
          }
          if (!handle.refCount && handle.readyToBeDeleted) {
            const hash = handle.skeletonHash ^ handle.clipHash;
            const customChunkIdx = this._chunkIdxMap.get(hash);
            (customChunkIdx !== undefined ? this._customPool : this._pool).free(handle.handle);
            if (this._textureBuffers.get(hash) === handle) {
              this._textureBuffers.delete(hash);
            }
          }
        }
        releaseSkeleton(skeleton) {
          const it = this._textureBuffers.values();
          let res = it.next();
          while (!res.done) {
            const handle = res.value;
            if (handle.skeletonHash === skeleton.hash) {
              handle.readyToBeDeleted = true;
              if (handle.refCount) {
                // delete handle record immediately so new allocations with the same asset could work
                this._textureBuffers.delete(handle.skeletonHash ^ handle.clipHash);
              } else {
                this.releaseHandle(handle);
              }
            }
            res = it.next();
          }
        }
        releaseAnimationClip(clip) {
          const it = this._textureBuffers.values();
          let res = it.next();
          while (!res.done) {
            const handle = res.value;
            if (handle.clipHash === clip.hash) {
              handle.readyToBeDeleted = true;
              if (handle.refCount) {
                // delete handle record immediately so new allocations with the same asset could work
                this._textureBuffers.delete(handle.skeletonHash ^ handle.clipHash);
              } else {
                this.releaseHandle(handle);
              }
            }
            res = it.next();
          }
        }
        _createAnimInfos(skeleton, clip, skinningRoot) {
          const animInfos = [];
          const {
            joints,
            bindposes
          } = skeleton;
          const jointCount = joints.length;
          const clipData = SkelAnimDataHub.getOrExtract(clip);
          for (let j = 0; j < jointCount; j++) {
            let animPath = joints[j];
            let source = clipData.joints[animPath];
            let animNode = skinningRoot.getChildByPath(animPath);
            let downstream;
            let correctionPath;
            while (!source) {
              const idx = animPath.lastIndexOf('/');
              animPath = animPath.substring(0, idx);
              source = clipData.joints[animPath];
              if (animNode) {
                if (!downstream) {
                  downstream = new Mat4();
                }
                Mat4.fromRTS(m4_1, animNode.rotation, animNode.position, animNode.scale);
                Mat4.multiply(downstream, m4_1, downstream);
                animNode = animNode.parent;
              } else {
                // record the nearest curve path if no downstream pose is present
                correctionPath = animPath;
              }
              if (idx < 0) {
                break;
              }
            }
            // the default behavior, just use the bindpose for current joint directly
            let bindposeIdx = j;
            let bindposeCorrection;
            /**
             * It is regularly observed that developers may choose to delete the whole
             * skeleton node tree for skinning models that only use baked animations
             * as an effective optimization strategy (substantial improvements on both
             * package size and runtime efficiency).
             *
             * This becomes troublesome in some cases during baking though, e.g. when a
             * skeleton joint node is not directly controlled by any animation curve,
             * but its parent nodes are. Due to lack of proper downstream default pose,
             * the joint transform can not be calculated accurately.
             *
             * We address this issue by employing some pragmatic approximation.
             * Specifically, by multiplying the bindpose of the joint corresponding to
             * the nearest curve, instead of the actual target joint. This effectively
             * merges the skinning influence of the 'incomplete' joint into its nearest
             * parent with accurate transform data.
             * It gives more visually-plausible results compared to the naive approach
             * for most cases we've covered.
             */
            if (correctionPath !== undefined && source) {
              // just use the previous joint if the exact path is not found
              bindposeIdx = j - 1;
              for (let t = 0; t < jointCount; t++) {
                if (joints[t] === correctionPath) {
                  bindposeIdx = t;
                  bindposeCorrection = new Mat4();
                  Mat4.multiply(bindposeCorrection, bindposes[t], skeleton.inverseBindposes[j]);
                  break;
                }
              }
            }
            animInfos.push({
              curveData: source && source.transforms,
              downstream,
              bindposeIdx,
              bindposeCorrection
            });
          }
          return animInfos;
        }
      });
      _export("JointAnimationInfo", JointAnimationInfo = class JointAnimationInfo {
        constructor(device) {
          this._pool = new Map();
          // per node
          this._device = void 0;
          this._device = device;
        }
        getData(nodeID = '-1') {
          const res = this._pool.get(nodeID);
          if (res) {
            return res;
          }
          const buffer = this._device.createBuffer(new BufferInfo(BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST, MemoryUsageBit.HOST | MemoryUsageBit.DEVICE, UBOSkinningAnimation.SIZE, UBOSkinningAnimation.SIZE));
          const data = new Float32Array([0, 0, 0, 0]);
          buffer.update(data);
          const info = {
            buffer,
            data,
            dirty: false,
            dirtyForJSB: new Uint8Array([0]),
            currentClip: null
          };
          this._pool.set(nodeID, info);
          return info;
        }
        destroy(nodeID) {
          const info = this._pool.get(nodeID);
          if (!info) {
            return;
          }
          info.buffer.destroy();
          this._pool.delete(nodeID);
        }
        switchClip(info, clip) {
          info.currentClip = clip;
          info.data[0] = 0; // reset default frame 0
          info.buffer.update(info.data);
          info.dirty = false;
          if (JSB) {
            info.dirtyForJSB[0] = 0;
          }
          return info;
        }
        clear() {
          for (const info of this._pool.values()) {
            info.buffer.destroy();
          }
          this._pool.clear();
        }
      });
    }
  };
});