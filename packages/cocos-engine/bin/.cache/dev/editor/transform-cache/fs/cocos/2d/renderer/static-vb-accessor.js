System.register("q-bundled:///fs/cocos/2d/renderer/static-vb-accessor.js", ["../../../../virtual/internal%253Aconstants.js", "./mesh-buffer.js", "./buffer-accessor.js", "../../core/index.js", "../../game/index.js"], function (_export, _context) {
  "use strict";

  var JSB, MeshBuffer, BufferAccessor, assertID, errorID, Pool, macro, assertIsTrue, director, StaticVBChunk, StaticVBAccessor, _entryPool;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                            
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
    StaticVBChunk: void 0,
    StaticVBAccessor: void 0
  });
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      JSB = _virtualInternal253AconstantsJs.JSB;
    }, function (_meshBufferJs) {
      MeshBuffer = _meshBufferJs.MeshBuffer;
    }, function (_bufferAccessorJs) {
      BufferAccessor = _bufferAccessorJs.BufferAccessor;
    }, function (_coreIndexJs) {
      assertID = _coreIndexJs.assertID;
      errorID = _coreIndexJs.errorID;
      Pool = _coreIndexJs.Pool;
      macro = _coreIndexJs.macro;
      assertIsTrue = _coreIndexJs.assertIsTrue;
    }, function (_gameIndexJs) {
      director = _gameIndexJs.director;
    }],
    execute: function () {
      _entryPool = new Pool(() => ({
        offset: 0,
        length: 0
      }), 32);
      /**
       * @internal
       */
      _export("StaticVBChunk", StaticVBChunk = class StaticVBChunk {
        // JSB
        get ib() {
          return this._ib;
        }
        constructor(vertexAccessor, bufferId, meshBuffer, vertexOffset, vb, indexCount) {
          this._ib = void 0;
          this.vertexAccessor = vertexAccessor;
          this.bufferId = bufferId;
          this.meshBuffer = meshBuffer;
          this.vertexOffset = vertexOffset;
          this.vb = vb;
          this.indexCount = indexCount;
          this._ib = new Uint16Array(indexCount); // JSB
          assertIsTrue(meshBuffer === vertexAccessor.getMeshBuffer(bufferId));
        }
        setIndexBuffer(indices) {
          if (JSB) {
            // 放到原生
            assertIsTrue(indices.length === this.ib.length);
            for (let i = 0; i < indices.length; ++i) {
              const vid = indices[i];
              this._ib[i] = this.vertexOffset + vid;
            }
          }
        }
      });
      _export("StaticVBAccessor", StaticVBAccessor = class StaticVBAccessor extends BufferAccessor {
        get id() {
          return this._id;
        }
        constructor(device, attributes, vCount, iCount) {
          super(device, attributes);
          this._freeLists = [];
          this._vCount = 0;
          this._iCount = 0;
          this._id = 0;
          this._vCount = vCount || Math.floor(macro.BATCHER2D_MEM_INCREMENT * 1024 / this._vertexFormatBytes);
          this._iCount = iCount || this._vCount * StaticVBAccessor.IB_SCALE;
          this._id = StaticVBAccessor.generateID();
          // Initialize first mesh buffer
          this._allocateBuffer();
        }
        destroy() {
          // Destroy mesh buffers and reuse free entries
          for (let i = 0; i < this._buffers.length; ++i) {
            this._buffers[i].destroy();
            const freeList = this._freeLists[i];
            for (let j = 0; j < freeList.length; ++j) {
              _entryPool.free(freeList[j]);
            }
          }
          this._buffers.length = 0;
          this._freeLists.length = 0;
          super.destroy();
        }
        reset() {
          for (let i = 0; i < this._buffers.length; ++i) {
            const buffer = this._buffers[i];
            // Reset index buffer
            buffer.indexOffset = 0;
            buffer.reset();
          }
        }
        getVertexBuffer(bid) {
          return this._buffers[bid].vData;
        }
        getIndexBuffer(bid) {
          return this._buffers[bid].iData;
        }
        getMeshBuffer(bid) {
          return this._buffers[bid];
        }
        uploadBuffers() {
          for (let i = 0; i < this._buffers.length; ++i) {
            const firstEntry = this._freeLists[i][0];
            const buffer = this._buffers[i];
            // Recognize active buffers
            if (!firstEntry || firstEntry.length < buffer.vData.byteLength) {
              buffer.uploadBuffers();
            }
            // Need destroy empty buffer
          }
        }

        appendIndices(bufferId, indices) {
          const buf = this._buffers[bufferId];
          const iCount = indices.length;
          if (iCount) {
            //make sure iData length enough
            const needLength = buf.indexOffset + indices.length;
            if (buf.iData.length < needLength) {
              const expansionLength = Math.floor(1.25 * needLength);
              const newIData = new Uint16Array(expansionLength);
              newIData.set(buf.iData);
              buf.iData = newIData;
            }
            // Append index buffer
            buf.iData.set(indices, buf.indexOffset);
            buf.indexOffset += indices.length;
          }
        }
        allocateChunk(vertexCount, indexCount) {
          const byteLength = vertexCount * this.vertexFormatBytes;
          if (vertexCount > this._vCount || indexCount > this._iCount) {
            errorID(9004, byteLength);
            return null;
          }
          let buf = null;
          let freeList;
          let bid = 0;
          let eid = -1;
          let entry = null;
          // Loop buffers
          for (let i = 0; i < this._buffers.length; ++i) {
            buf = this._buffers[i];
            freeList = this._freeLists[i];
            // Loop entries
            for (let e = 0; e < freeList.length; ++e) {
              // Found suitable free entry
              if (freeList[e].length >= byteLength) {
                entry = freeList[e];
                bid = i;
                eid = e;
                break;
              }
            }
            if (entry) break;
          }
          // Allocation fail
          if (!entry) {
            bid = this._allocateBuffer();
            buf = this._buffers[bid];
            if (buf) {
              eid = 0;
              entry = this._freeLists[bid][eid];
            }
          }
          // Allocation succeed
          if (entry) {
            const vertexOffset = entry.offset / this.vertexFormatBytes;
            assertIsTrue(Number.isInteger(vertexOffset));
            const vb = new Float32Array(buf.vData.buffer, entry.offset, byteLength >> 2).fill(0);
            this._allocateChunkFromEntry(bid, eid, entry, byteLength);
            return new StaticVBChunk(this, bid, buf, vertexOffset, vb, indexCount);
          } else {
            return null;
          }
        }
        recycleChunk(chunk) {
          const freeList = this._freeLists[chunk.bufferId];
          const buf = this._buffers[chunk.bufferId];
          let offset = chunk.vertexOffset * this.vertexFormatBytes;
          let bytes = chunk.vb.byteLength;
          if (bytes === 0) return;
          let recycled = false;
          let i = 0;
          let prevEntry = null;
          let nextEntry = freeList[i];
          // Loop entries
          while (nextEntry && nextEntry.offset < offset) {
            prevEntry = nextEntry;
            nextEntry = freeList[++i];
          }
          // Found previous entry
          if (prevEntry) {
            const distance = offset - (prevEntry.offset + prevEntry.length);
            // Ensure no overlap with previous chunk
            assertIsTrue(distance >= 0);
            // Can be merged
            if (distance === 0) {
              prevEntry.length += bytes;
              offset = prevEntry.offset;
              bytes = prevEntry.length;

              // Can also merge with next entry
              if (nextEntry && nextEntry.offset - (offset + bytes) === 0) {
                prevEntry.length += nextEntry.length;
                // Free next entry
                freeList.splice(i, 1);
                _entryPool.free(nextEntry);
                nextEntry = null;
              }
              recycled = true;
            }
          }
          // Found next entry
          if (!recycled && nextEntry) {
            const distance = nextEntry.offset - (offset + bytes);
            // Ensure no overlap with next chunk
            assertIsTrue(distance >= 0);
            // Can be merged
            if (distance === 0) {
              nextEntry.offset = offset;
              nextEntry.length += bytes;
            } else {
              // Can not be merged
              const newEntry = _entryPool.alloc();
              newEntry.offset = offset;
              newEntry.length = bytes;
              freeList.splice(i, 0, newEntry);
            }
            recycled = true;
          }
          if (recycled) {
            // If the last chunk is recycled, ensure correct mesh buffer byte offset
            if (offset + bytes === buf.byteOffset) {
              buf.byteOffset = offset;
            }
          } else {
            // Haven't found any entry or any entry after the buffer chunk
            const newEntry = _entryPool.alloc();
            newEntry.offset = offset;
            newEntry.length = bytes;
            freeList.push(newEntry);
          }
        }
        _allocateChunkFromEntry(bid, eid, entry, bytes) {
          const remaining = entry.length - bytes;
          const offset = entry.offset + bytes;
          const buf = this._buffers[bid];
          if (buf.byteOffset < offset) {
            // Ensure buffer length covers all buffer chunks
            buf.byteOffset = offset;
          }
          assertID(remaining >= 0, 9004, bid, entry.offset, entry.length);
          if (remaining === 0) {
            this._freeLists[bid].splice(eid, 1);
            _entryPool.free(entry);
          } else {
            entry.offset += bytes;
            entry.length = remaining;
          }
        }
        _allocateBuffer() {
          // Validate length of buffer array
          assertID(this._buffers.length === this._freeLists.length, 9003);
          const buffer = new MeshBuffer();
          const vFloatCount = this._vCount * this._floatsPerVertex;
          buffer.initialize(this._device, this._attributes, vFloatCount, this._iCount);
          this._buffers.push(buffer);
          const entry = _entryPool.alloc();
          entry.offset = 0;
          entry.length = buffer.vData.byteLength;
          const freeList = [entry];
          this._freeLists.push(freeList);

          //sync to native
          // temporarily batcher transports buffers
          // It is better to put accessor to native
          const batcher = director.root.batcher2D;
          batcher.syncMeshBuffersToNative(this.id, this._buffers);
          return this._buffers.length - 1;
        }
        static generateID() {
          return StaticVBAccessor.ID_COUNT++;
        }
      });
      StaticVBAccessor.IB_SCALE = 4;
      // ib size scale based on vertex count
      StaticVBAccessor.ID_COUNT = 0;
    }
  };
});