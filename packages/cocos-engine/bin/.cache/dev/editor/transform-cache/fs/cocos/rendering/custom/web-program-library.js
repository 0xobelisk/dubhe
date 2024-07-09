System.register("q-bundled:///fs/cocos/rendering/custom/web-program-library.js", ["../../gfx/index.js", "../../render-scene/core/program-utils.js", "../../render-scene/index.js", "./layout-graph.js", "./types.js", "./web-types.js", "./layout-graph-utils.js", "../../core/platform/debug.js", "../define.js"], function (_export, _context) {
  "use strict";

  var Attribute, DescriptorType, DESCRIPTOR_BUFFER_TYPE, DESCRIPTOR_SAMPLER_TYPE, MemoryAccessBit, PipelineLayoutInfo, ShaderInfo, ShaderStage, ShaderStageFlagBit, Type, Uniform, UniformBlock, UniformInputAttachment, UniformSampler, UniformSamplerTexture, UniformStorageBuffer, UniformStorageImage, UniformTexture, deviceManager, DescriptorSetLayoutInfo, DescriptorSetInfo, genHandles, getActiveAttributes, getCombinationDefines, getShaderInstanceName, getSize, getVariantKey, populateMacros, prepareDefines, getDeviceShaderVersion, DescriptorBlockData, DescriptorData, DescriptorSetData, DescriptorSetLayoutData, LayoutGraphDataValue, ShaderProgramData, DescriptorTypeOrder, UpdateFrequency, ProgramGroup, ProgramInfo, getCustomPassID, getCustomPhaseID, getOrCreateDescriptorSetLayout, getEmptyDescriptorSetLayout, getEmptyPipelineLayout, initializeDescriptorSetLayoutInfo, makeDescriptorSetLayoutData, getDescriptorSetLayout, getOrCreateDescriptorID, getDescriptorTypeOrder, getProgramID, getDescriptorNameID, getDescriptorName, INVALID_ID, ENABLE_SUBPASS, getCustomSubpassID, generateConstantMacros, populatePipelineLayoutInfo, assert, error, UBOSkinning, localDescriptorSetLayout, WebProgramProxy, WebProgramLibrary, _setIndex;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /* eslint-disable no-console */ /****************************************************************************
                                                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                                                            
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
                                                                                                                                                                                                                                                                                                                                                                                                                            ****************************************************************************/ /* eslint-disable max-len */
  // make IProgramInfo from IShaderInfo
  function makeProgramInfo(effectName, shader) {
    const programInfo = {
      ...shader
    };
    programInfo.effectName = effectName;
    populateMacros(programInfo);
    return programInfo;
  }
  function findBinding(shaderInfo, name) {
    for (const v of shaderInfo.blocks) {
      if (v.name === name) {
        return {
          set: v.set,
          binding: v.binding
        };
      }
    }
    for (const v of shaderInfo.buffers) {
      if (v.name === name) {
        return {
          set: v.set,
          binding: v.binding
        };
      }
    }
    for (const v of shaderInfo.samplerTextures) {
      if (v.name === name) {
        return {
          set: v.set,
          binding: v.binding
        };
      }
    }
    for (const v of shaderInfo.samplers) {
      if (v.name === name) {
        return {
          set: v.set,
          binding: v.binding
        };
      }
    }
    for (const v of shaderInfo.textures) {
      if (v.name === name) {
        return {
          set: v.set,
          binding: v.binding
        };
      }
    }
    for (const v of shaderInfo.images) {
      if (v.name === name) {
        return {
          set: v.set,
          binding: v.binding
        };
      }
    }
    for (const v of shaderInfo.subpassInputs) {
      if (v.name === name) {
        return {
          set: v.set,
          binding: v.binding
        };
      }
    }
    // eslint-disable-next-line no-console
    throw error('binding not found in shaderInfo!');
  }
  function overwriteShaderSourceBinding(shaderInfo, source) {
    let code = source;
    const samplerExp = /layout\s*\(([^)])+\)\s+uniform\s+(\b\w+\b\s+)?sampler(\w+)\s+(\b\w+\b)/g;
    let samplerIter = samplerExp.exec(code);
    while (samplerIter) {
      const name = samplerIter[4];
      const {
        set,
        binding
      } = findBinding(shaderInfo, name);
      const precStr = samplerIter[2] ? samplerIter[2] : '';
      const replaceStr = `layout(set = ${set}, binding = ${binding}) uniform ${precStr} sampler${samplerIter[3]} ${samplerIter[4]}`;
      code = code.replace(samplerIter[0], replaceStr);
      samplerIter = samplerExp.exec(code);
    }
    const blockExp = /layout\s*\(([^)]+)\)\s*(readonly|writeonly)?\s*\b((uniform\s*|buffer\s*|image2D\s*){1,2})\b\s*(\b\w+\b)\s*[{;]/g;
    let blockIter = blockExp.exec(code);
    while (blockIter) {
      const name = blockIter[5];
      const {
        set,
        binding
      } = findBinding(shaderInfo, name);
      const accessStr = blockIter[2] ? blockIter[2] : '';
      let endStr = ' {';
      if (blockIter[3].includes('image')) {
        endStr = `;`;
      }
      let desc = blockIter[1];
      desc = desc.replace(/set\s*=\s*\d+/g, `set = ${set}`);
      desc = desc.replace(/binding\s*=\s*\d+/g, `binding = ${binding}`);
      const replaceStr = `layout(${desc}) ${accessStr} ${blockIter[3]} ${blockIter[5]}${endStr}`;
      code = code.replace(blockIter[0], replaceStr);
      blockIter = blockExp.exec(code);
    }
    return code;
  }
  function overwriteShaderProgramBinding(shaderInfo, programInfo) {
    const version = getDeviceShaderVersion(deviceManager.gfxDevice);
    if (version !== 'glsl4') {
      return;
    }
    if (programInfo.glsl4.vert) {
      programInfo.glsl4.vert = overwriteShaderSourceBinding(shaderInfo, programInfo.glsl4.vert);
    }
    if (programInfo.glsl4.frag) {
      programInfo.glsl4.frag = overwriteShaderSourceBinding(shaderInfo, programInfo.glsl4.frag);
    }
    if (programInfo.glsl4.compute) {
      programInfo.glsl4.compute = overwriteShaderSourceBinding(shaderInfo, programInfo.glsl4.compute);
    }
  }

  // overwrite IProgramInfo using gfx.ShaderInfo
  function overwriteProgramBlockInfo(shaderInfo, programInfo) {
    overwriteShaderProgramBinding(shaderInfo, programInfo);
    const set = _setIndex[UpdateFrequency.PER_BATCH];
    for (const block of programInfo.blocks) {
      let found = false;
      for (const src of shaderInfo.blocks) {
        if (src.set !== set) {
          continue;
        }
        if (src.name === block.name) {
          block.binding = src.binding;
          found = true;
          break;
        }
      }
      if (!found) {
        error(`Block ${block.name} not found in shader ${shaderInfo.name}`);
      }
    }
  }

  // add descriptor to size-reserved descriptor set
  function populateGroupedShaderInfo(layout, descriptorInfo, set, shaderInfo, blockSizes) {
    for (const descriptorBlock of layout.descriptorBlocks) {
      const visibility = descriptorBlock.visibility;
      let binding = descriptorBlock.offset;
      switch (descriptorBlock.type) {
        case DescriptorTypeOrder.UNIFORM_BUFFER:
          for (const block of descriptorInfo.blocks) {
            if (block.stageFlags !== visibility) {
              continue;
            }
            blockSizes.push(getSize(block.members));
            shaderInfo.blocks.push(new UniformBlock(set, binding, block.name, block.members.map(m => new Uniform(m.name, m.type, m.count)), 1) // count is always 1 for UniformBlock
            );

            ++binding;
          }
          break;
        case DescriptorTypeOrder.DYNAMIC_UNIFORM_BUFFER:
          // not implemented yet
          break;
        case DescriptorTypeOrder.SAMPLER_TEXTURE:
          for (const tex of descriptorInfo.samplerTextures) {
            if (tex.stageFlags !== visibility) {
              continue;
            }
            shaderInfo.samplerTextures.push(new UniformSamplerTexture(set, binding, tex.name, tex.type, tex.count));
            ++binding;
          }
          break;
        case DescriptorTypeOrder.SAMPLER:
          for (const sampler of descriptorInfo.samplers) {
            if (sampler.stageFlags !== visibility) {
              continue;
            }
            shaderInfo.samplers.push(new UniformSampler(set, binding, sampler.name, sampler.count));
            ++binding;
          }
          break;
        case DescriptorTypeOrder.TEXTURE:
          for (const texture of descriptorInfo.textures) {
            if (texture.stageFlags !== visibility) {
              continue;
            }
            shaderInfo.textures.push(new UniformTexture(set, binding, texture.name, texture.type, texture.count));
            ++binding;
          }
          break;
        case DescriptorTypeOrder.STORAGE_BUFFER:
          for (const buffer of descriptorInfo.buffers) {
            if (buffer.stageFlags !== visibility) {
              continue;
            }
            shaderInfo.buffers.push(new UniformStorageBuffer(set, binding, buffer.name, 1, buffer.memoryAccess)); // effect compiler guarantees buffer count = 1
            ++binding;
          }
          break;
        case DescriptorTypeOrder.DYNAMIC_STORAGE_BUFFER:
          // not implemented yet
          break;
        case DescriptorTypeOrder.STORAGE_IMAGE:
          for (const image of descriptorInfo.images) {
            if (image.stageFlags !== visibility) {
              continue;
            }
            shaderInfo.images.push(new UniformStorageImage(set, binding, image.name, image.type, image.count, image.memoryAccess));
            ++binding;
          }
          break;
        case DescriptorTypeOrder.INPUT_ATTACHMENT:
          for (const subpassInput of descriptorInfo.subpassInputs) {
            if (subpassInput.stageFlags !== visibility) {
              continue;
            }
            shaderInfo.subpassInputs.push(new UniformInputAttachment(set, subpassInput.binding, subpassInput.name, subpassInput.count));
            ++binding;
          }
          break;
        default:
      }
    }
  }

  // add merged descriptor to gfx.ShaderInfo
  function populateMergedShaderInfo(valueNames, layout, set, shaderInfo, blockSizes) {
    for (const descriptorBlock of layout.descriptorBlocks) {
      let binding = descriptorBlock.offset;
      switch (descriptorBlock.type) {
        case DescriptorTypeOrder.UNIFORM_BUFFER:
          for (const block of descriptorBlock.descriptors) {
            const uniformBlock = layout.uniformBlocks.get(block.descriptorID);
            if (uniformBlock === undefined) {
              error(`Failed to find uniform block ${block.descriptorID} in layout`);
              continue;
            }
            blockSizes.push(getSize(uniformBlock.members));
            shaderInfo.blocks.push(new UniformBlock(set, binding, valueNames[block.descriptorID], uniformBlock.members.map(m => new Uniform(m.name, m.type, m.count)), 1) // count is always 1 for UniformBlock
            );

            ++binding;
          }
          if (binding !== descriptorBlock.offset + descriptorBlock.capacity) {
            error(`Uniform buffer binding mismatch for set ${set}`);
          }
          break;
        case DescriptorTypeOrder.DYNAMIC_UNIFORM_BUFFER:
          // not implemented yet
          break;
        case DescriptorTypeOrder.SAMPLER_TEXTURE:
          for (const tex of descriptorBlock.descriptors) {
            shaderInfo.samplerTextures.push(new UniformSamplerTexture(set, binding, valueNames[tex.descriptorID], tex.type, tex.count));
            ++binding;
          }
          break;
        case DescriptorTypeOrder.SAMPLER:
          for (const sampler of descriptorBlock.descriptors) {
            shaderInfo.samplers.push(new UniformSampler(set, binding, valueNames[sampler.descriptorID], sampler.count));
            ++binding;
          }
          break;
        case DescriptorTypeOrder.TEXTURE:
          for (const texture of descriptorBlock.descriptors) {
            shaderInfo.textures.push(new UniformTexture(set, binding, valueNames[texture.descriptorID], texture.type, texture.count));
            ++binding;
          }
          break;
        case DescriptorTypeOrder.STORAGE_BUFFER:
          for (const buffer of descriptorBlock.descriptors) {
            shaderInfo.buffers.push(new UniformStorageBuffer(set, binding, valueNames[buffer.descriptorID], 1, MemoryAccessBit.READ_WRITE /*buffer.memoryAccess*/)); // effect compiler guarantees buffer count = 1
            ++binding;
          }
          break;
        case DescriptorTypeOrder.DYNAMIC_STORAGE_BUFFER:
          // not implemented yet
          break;
        case DescriptorTypeOrder.STORAGE_IMAGE:
          for (const image of descriptorBlock.descriptors) {
            shaderInfo.images.push(new UniformStorageImage(set, binding, valueNames[image.descriptorID], image.type, image.count, MemoryAccessBit.READ_WRITE /*image.memoryAccess*/));

            ++binding;
          }
          break;
        case DescriptorTypeOrder.INPUT_ATTACHMENT:
          for (const subpassInput of descriptorBlock.descriptors) {
            shaderInfo.subpassInputs.push(new UniformInputAttachment(set, binding, valueNames[subpassInput.descriptorID], subpassInput.count));
            ++binding;
          }
          break;
        default:
      }
    }
  }

  // add descriptor from effect to gfx.ShaderInfo
  function populateShaderInfo(descriptorInfo, set, shaderInfo, blockSizes) {
    for (let i = 0; i < descriptorInfo.blocks.length; i++) {
      const block = descriptorInfo.blocks[i];
      blockSizes.push(getSize(block.members));
      shaderInfo.blocks.push(new UniformBlock(set, block.binding, block.name, block.members.map(m => new Uniform(m.name, m.type, m.count)), 1)); // effect compiler guarantees block count = 1
    }

    for (let i = 0; i < descriptorInfo.samplerTextures.length; i++) {
      const samplerTexture = descriptorInfo.samplerTextures[i];
      shaderInfo.samplerTextures.push(new UniformSamplerTexture(set, samplerTexture.binding, samplerTexture.name, samplerTexture.type, samplerTexture.count));
    }
    for (let i = 0; i < descriptorInfo.samplers.length; i++) {
      const sampler = descriptorInfo.samplers[i];
      shaderInfo.samplers.push(new UniformSampler(set, sampler.binding, sampler.name, sampler.count));
    }
    for (let i = 0; i < descriptorInfo.textures.length; i++) {
      const texture = descriptorInfo.textures[i];
      shaderInfo.textures.push(new UniformTexture(set, texture.binding, texture.name, texture.type, texture.count));
    }
    for (let i = 0; i < descriptorInfo.buffers.length; i++) {
      const buffer = descriptorInfo.buffers[i];
      shaderInfo.buffers.push(new UniformStorageBuffer(set, buffer.binding, buffer.name, 1, buffer.memoryAccess)); // effect compiler guarantees buffer count = 1
    }

    for (let i = 0; i < descriptorInfo.images.length; i++) {
      const image = descriptorInfo.images[i];
      shaderInfo.images.push(new UniformStorageImage(set, image.binding, image.name, image.type, image.count, image.memoryAccess));
    }
    for (let i = 0; i < descriptorInfo.subpassInputs.length; i++) {
      const subpassInput = descriptorInfo.subpassInputs[i];
      shaderInfo.subpassInputs.push(new UniformInputAttachment(set, subpassInput.binding, subpassInput.name, subpassInput.count));
    }
  }

  // add fixed local descriptors to gfx.ShaderInfo
  function populateLocalShaderInfo(target, source, shaderInfo, blockSizes) {
    const set = _setIndex[UpdateFrequency.PER_INSTANCE];
    for (let i = 0; i < target.blocks.length; i++) {
      const block = target.blocks[i];
      const info = source.layouts[block.name];
      const binding = info && source.bindings.find(bd => bd.binding === info.binding);
      if (!info || !binding || !(binding.descriptorType & DESCRIPTOR_BUFFER_TYPE)) {
        console.warn(`builtin UBO '${block.name}' not available!`);
        continue;
      }
      blockSizes.push(getSize(block.members));
      shaderInfo.blocks.push(new UniformBlock(set, binding.binding, block.name, block.members.map(m => new Uniform(m.name, m.type, m.count)), 1)); // effect compiler guarantees block count = 1
    }

    for (let i = 0; i < target.samplerTextures.length; i++) {
      const samplerTexture = target.samplerTextures[i];
      const info = source.layouts[samplerTexture.name];
      const binding = info && source.bindings.find(bd => bd.binding === info.binding);
      if (!info || !binding || !(binding.descriptorType & DESCRIPTOR_SAMPLER_TYPE)) {
        console.warn(`builtin samplerTexture '${samplerTexture.name}' not available!`);
        continue;
      }
      shaderInfo.samplerTextures.push(new UniformSamplerTexture(set, binding.binding, samplerTexture.name, samplerTexture.type, samplerTexture.count));
    }
  }
  function getIDescriptorSetLayoutInfoUniformBlockCapacity(info) {
    let capacity = 0;
    for (const binding of info.bindings) {
      if (binding.descriptorType === DescriptorType.UNIFORM_BUFFER || binding.descriptorType === DescriptorType.DYNAMIC_UNIFORM_BUFFER) {
        capacity += binding.count;
      }
    }
    return capacity;
  }
  function getIDescriptorSetLayoutInfoSamplerTextureCapacity(info) {
    let capacity = 0;
    for (const binding of info.bindings) {
      if (binding.descriptorType !== DescriptorType.UNIFORM_BUFFER && binding.descriptorType !== DescriptorType.DYNAMIC_UNIFORM_BUFFER) {
        capacity += binding.count;
      }
    }
    return capacity;
  }
  function setFlattenedUniformBlockBinding(setOffsets, descriptors) {
    for (const d of descriptors) {
      d.flattened = setOffsets[d.set] + d.binding;
    }
  }
  function setFlattenedSamplerTextureBinding(setOffsets, uniformBlockCapacities, descriptors) {
    for (const d of descriptors) {
      d.flattened = setOffsets[d.set] + d.binding - uniformBlockCapacities[d.set];
    }
  }
  function calculateFlattenedBinding(descriptorSets, fixedInstanceDescriptorSetLayout, shaderInfo) {
    // Descriptors of UniformBlock starts from 0, and Descriptors of SamplerTexture starts from the end of UniformBlock.
    const uniformBlockCapacities = new Array(4);
    {
      var _descriptorSets$Updat, _descriptorSets$Updat2, _descriptorSets$Updat3, _descriptorSets$Updat4;
      const passCapacity = ((_descriptorSets$Updat = descriptorSets[UpdateFrequency.PER_PASS]) === null || _descriptorSets$Updat === void 0 ? void 0 : _descriptorSets$Updat.uniformBlockCapacity) || 0;
      const phaseCapacity = ((_descriptorSets$Updat2 = descriptorSets[UpdateFrequency.PER_PHASE]) === null || _descriptorSets$Updat2 === void 0 ? void 0 : _descriptorSets$Updat2.uniformBlockCapacity) || 0;
      const batchCapacity = ((_descriptorSets$Updat3 = descriptorSets[UpdateFrequency.PER_BATCH]) === null || _descriptorSets$Updat3 === void 0 ? void 0 : _descriptorSets$Updat3.uniformBlockCapacity) || 0; // dynamic size
      const instanceCapacity = fixedInstanceDescriptorSetLayout ? getIDescriptorSetLayoutInfoUniformBlockCapacity(fixedInstanceDescriptorSetLayout) : ((_descriptorSets$Updat4 = descriptorSets[UpdateFrequency.PER_INSTANCE]) === null || _descriptorSets$Updat4 === void 0 ? void 0 : _descriptorSets$Updat4.uniformBlockCapacity) || 0;

      // update uniform block capacities
      uniformBlockCapacities[_setIndex[UpdateFrequency.PER_PASS]] = passCapacity;
      uniformBlockCapacities[_setIndex[UpdateFrequency.PER_PHASE]] = phaseCapacity;
      uniformBlockCapacities[_setIndex[UpdateFrequency.PER_BATCH]] = batchCapacity;
      uniformBlockCapacities[_setIndex[UpdateFrequency.PER_INSTANCE]] = instanceCapacity;

      // calculate uniform block offsets
      const passOffset = 0;
      const phaseOffset = passOffset + passCapacity;
      const instanceOffset = phaseOffset + phaseCapacity;
      const batchOffset = instanceOffset + instanceCapacity;

      // save uniform block offsets by set index
      const uniformBlockOffsets = new Array(4);
      uniformBlockOffsets[_setIndex[UpdateFrequency.PER_PASS]] = passOffset;
      uniformBlockOffsets[_setIndex[UpdateFrequency.PER_PHASE]] = phaseOffset;
      uniformBlockOffsets[_setIndex[UpdateFrequency.PER_BATCH]] = batchOffset;
      uniformBlockOffsets[_setIndex[UpdateFrequency.PER_INSTANCE]] = instanceOffset;

      // update flattened uniform block binding
      setFlattenedUniformBlockBinding(uniformBlockOffsets, shaderInfo.blocks);
    }
    {
      var _descriptorSets$Updat5, _descriptorSets$Updat6, _descriptorSets$Updat7;
      // calculate sampler texture capacities
      const passCapacity = ((_descriptorSets$Updat5 = descriptorSets[UpdateFrequency.PER_PASS]) === null || _descriptorSets$Updat5 === void 0 ? void 0 : _descriptorSets$Updat5.samplerTextureCapacity) || 0;
      const phaseCapacity = ((_descriptorSets$Updat6 = descriptorSets[UpdateFrequency.PER_PHASE]) === null || _descriptorSets$Updat6 === void 0 ? void 0 : _descriptorSets$Updat6.samplerTextureCapacity) || 0;
      // const batchCapacity = descriptorSets[UpdateFrequency.PER_BATCH]?.capacity || 0; // dynamic size
      const instanceCapacity = fixedInstanceDescriptorSetLayout ? getIDescriptorSetLayoutInfoSamplerTextureCapacity(fixedInstanceDescriptorSetLayout) : ((_descriptorSets$Updat7 = descriptorSets[UpdateFrequency.PER_INSTANCE]) === null || _descriptorSets$Updat7 === void 0 ? void 0 : _descriptorSets$Updat7.samplerTextureCapacity) || 0;

      // calculate sampler texture offsets
      const passOffset = 0;
      const phaseOffset = passOffset + passCapacity;
      const instanceOffset = phaseOffset + phaseCapacity;
      const batchOffset = instanceOffset + instanceCapacity;

      // save sampler texture offsets by set index
      const samplerTextureOffsets = new Array(4);
      samplerTextureOffsets[_setIndex[UpdateFrequency.PER_PASS]] = passOffset;
      samplerTextureOffsets[_setIndex[UpdateFrequency.PER_PHASE]] = phaseOffset;
      samplerTextureOffsets[_setIndex[UpdateFrequency.PER_BATCH]] = batchOffset;
      samplerTextureOffsets[_setIndex[UpdateFrequency.PER_INSTANCE]] = instanceOffset;

      // update flattened sampler texture binding
      setFlattenedSamplerTextureBinding(samplerTextureOffsets, uniformBlockCapacities, shaderInfo.samplerTextures);
    }
  }

  // make gfx.ShaderInfo
  function makeShaderInfo(lg, passLayouts, phaseLayouts, srcShaderInfo, programData, fixedLocal) {
    const descriptorSets = [null, null, null, null];
    let fixedInstanceDescriptorSetLayout = null;
    const shaderInfo = new ShaderInfo();
    const blockSizes = new Array();
    {
      // pass
      const passLayout = passLayouts.descriptorSets.get(UpdateFrequency.PER_PASS);
      if (passLayout) {
        descriptorSets[UpdateFrequency.PER_PASS] = passLayout.descriptorSetLayoutData;
        populateMergedShaderInfo(lg.valueNames, passLayout.descriptorSetLayoutData, _setIndex[UpdateFrequency.PER_PASS], shaderInfo, blockSizes);
      }
    }
    {
      // phase
      const phaseLayout = phaseLayouts.descriptorSets.get(UpdateFrequency.PER_PHASE);
      if (phaseLayout) {
        descriptorSets[UpdateFrequency.PER_PHASE] = phaseLayout.descriptorSetLayoutData;
        populateMergedShaderInfo(lg.valueNames, phaseLayout.descriptorSetLayoutData, _setIndex[UpdateFrequency.PER_PHASE], shaderInfo, blockSizes);
      }
    }
    {
      // batch
      const batchInfo = srcShaderInfo.descriptors[UpdateFrequency.PER_BATCH];
      if (programData) {
        const perBatch = programData.layout.descriptorSets.get(UpdateFrequency.PER_BATCH);
        if (perBatch) {
          descriptorSets[UpdateFrequency.PER_BATCH] = perBatch.descriptorSetLayoutData;
          populateMergedShaderInfo(lg.valueNames, perBatch.descriptorSetLayoutData, _setIndex[UpdateFrequency.PER_BATCH], shaderInfo, blockSizes);
        }
      } else {
        const batchLayout = phaseLayouts.descriptorSets.get(UpdateFrequency.PER_BATCH);
        if (batchLayout) {
          descriptorSets[UpdateFrequency.PER_BATCH] = batchLayout.descriptorSetLayoutData;
          populateGroupedShaderInfo(batchLayout.descriptorSetLayoutData, batchInfo, _setIndex[UpdateFrequency.PER_BATCH], shaderInfo, blockSizes);
        }
      }
    }
    {
      // instance
      const instanceInfo = srcShaderInfo.descriptors[UpdateFrequency.PER_INSTANCE];
      if (programData) {
        if (fixedLocal) {
          fixedInstanceDescriptorSetLayout = localDescriptorSetLayout;
          populateLocalShaderInfo(instanceInfo, localDescriptorSetLayout, shaderInfo, blockSizes);
        } else {
          const perInstance = programData.layout.descriptorSets.get(UpdateFrequency.PER_INSTANCE);
          if (perInstance) {
            descriptorSets[UpdateFrequency.PER_INSTANCE] = perInstance.descriptorSetLayoutData;
            populateMergedShaderInfo(lg.valueNames, perInstance.descriptorSetLayoutData, _setIndex[UpdateFrequency.PER_INSTANCE], shaderInfo, blockSizes);
          }
        }
      } else {
        const instanceLayout = phaseLayouts.descriptorSets.get(UpdateFrequency.PER_INSTANCE);
        if (instanceLayout) {
          descriptorSets[UpdateFrequency.PER_INSTANCE] = instanceLayout.descriptorSetLayoutData;
          populateGroupedShaderInfo(instanceLayout.descriptorSetLayoutData, instanceInfo, _setIndex[UpdateFrequency.PER_INSTANCE], shaderInfo, blockSizes);
        }
      }
    }
    calculateFlattenedBinding(descriptorSets, fixedInstanceDescriptorSetLayout, shaderInfo);
    shaderInfo.stages.push(new ShaderStage(ShaderStageFlagBit.VERTEX, ''));
    shaderInfo.stages.push(new ShaderStage(ShaderStageFlagBit.FRAGMENT, ''));
    return [shaderInfo, blockSizes];
  }
  function getGLSLSource(info, version) {
    if (version === 'glsl1') return info.glsl1;
    if (version === 'glsl3') return info.glsl3;
    if (version === 'glsl4') return info.glsl4;
    return {
      vert: '',
      frag: ''
    };
  }
  // find name and type from local descriptor set info
  function getDescriptorNameAndType(source, binding) {
    for (const name in source.layouts) {
      const v = source.layouts[name];
      if (v.binding === binding) {
        assert(v.name === name);
        let type = Type.UNKNOWN;
        if (v instanceof UniformSamplerTexture) {
          type = v.type;
        } else if (v instanceof UniformStorageImage) {
          type = v.type;
        }
        return [v.name, type];
      }
    }
    error('descriptor not found');
    return ['', Type.UNKNOWN];
  }

  // make DescriptorSetLayoutData from local descriptor set info
  function makeLocalDescriptorSetLayoutData(lg, source) {
    const data = new DescriptorSetLayoutData();
    for (const b of source.bindings) {
      const [name, type] = getDescriptorNameAndType(source, b.binding);
      const nameID = getOrCreateDescriptorID(lg, name);
      const order = getDescriptorTypeOrder(b.descriptorType);
      const block = new DescriptorBlockData(order, b.stageFlags, b.count);
      block.offset = b.binding;
      block.descriptors.push(new DescriptorData(nameID, type, b.count));
      data.descriptorBlocks.push(block);
      const binding = data.bindingMap.get(nameID);
      if (binding !== undefined) {
        error(`duplicate descriptor name '${name}'`);
      }
      data.bindingMap.set(nameID, b.binding);
      const v = source.layouts[name];
      if (v instanceof UniformBlock) {
        data.uniformBlocks.set(nameID, v);
      }
    }
    return data;
  }

  // make descriptor sets for ShaderProgramData (PerBatch, PerInstance)
  function buildProgramData(programName, srcShaderInfo, lg, phase, programData, fixedLocal) {
    {
      const perBatch = makeDescriptorSetLayoutData(lg, UpdateFrequency.PER_BATCH, _setIndex[UpdateFrequency.PER_BATCH], srcShaderInfo.descriptors[UpdateFrequency.PER_BATCH]);
      const setData = new DescriptorSetData(perBatch);
      initializeDescriptorSetLayoutInfo(setData.descriptorSetLayoutData, setData.descriptorSetLayoutInfo);
      programData.layout.descriptorSets.set(UpdateFrequency.PER_BATCH, setData);
    }
    if (fixedLocal) {
      const perInstance = makeLocalDescriptorSetLayoutData(lg, localDescriptorSetLayout);
      const setData = new DescriptorSetData(perInstance);
      initializeDescriptorSetLayoutInfo(setData.descriptorSetLayoutData, setData.descriptorSetLayoutInfo);
      if (localDescriptorSetLayout.bindings.length !== setData.descriptorSetLayoutInfo.bindings.length) {
        error('local descriptor set layout inconsistent');
      } else {
        for (let k = 0; k !== localDescriptorSetLayout.bindings.length; ++k) {
          const b = localDescriptorSetLayout.bindings[k];
          const b2 = setData.descriptorSetLayoutInfo.bindings[k];
          if (b.binding !== b2.binding || b.descriptorType !== b2.descriptorType || b.count !== b2.count || b.stageFlags !== b2.stageFlags) {
            error('local descriptor set layout inconsistent');
          }
        }
      }
      programData.layout.descriptorSets.set(UpdateFrequency.PER_INSTANCE, setData);
    } else {
      const perInstance = makeDescriptorSetLayoutData(lg, UpdateFrequency.PER_INSTANCE, _setIndex[UpdateFrequency.PER_INSTANCE], srcShaderInfo.descriptors[UpdateFrequency.PER_INSTANCE]);
      const setData = new DescriptorSetData(perInstance);
      initializeDescriptorSetLayoutInfo(setData.descriptorSetLayoutData, setData.descriptorSetLayoutInfo);
      programData.layout.descriptorSets.set(UpdateFrequency.PER_INSTANCE, setData);
    }
    const shaderID = phase.shaderPrograms.length;
    phase.shaderIndex.set(programName, shaderID);
    phase.shaderPrograms.push(programData);
  }

  // get or create PerProgram gfx.DescriptorSetLayout
  function getOrCreateProgramDescriptorSetLayout(device, lg, phaseID, programName, rate) {
    assert(rate < UpdateFrequency.PER_PHASE);
    const phase = lg.getRenderPhase(phaseID);
    const programID = phase.shaderIndex.get(programName);
    if (programID === undefined) {
      return getEmptyDescriptorSetLayout();
    }
    const programData = phase.shaderPrograms[programID];
    const layout = programData.layout.descriptorSets.get(rate);
    if (layout === undefined) {
      return getEmptyDescriptorSetLayout();
    }
    if (layout.descriptorSetLayout) {
      return layout.descriptorSetLayout;
    }
    layout.descriptorSetLayout = device.createDescriptorSetLayout(layout.descriptorSetLayoutInfo);
    return layout.descriptorSetLayout;
  }

  // get PerProgram gfx.DescriptorSetLayout
  function getProgramDescriptorSetLayout(device, lg, phaseID, programName, rate) {
    assert(rate < UpdateFrequency.PER_PHASE);
    const phase = lg.getRenderPhase(phaseID);
    const programID = phase.shaderIndex.get(programName);
    if (programID === undefined) {
      return null;
    }
    const programData = phase.shaderPrograms[programID];
    const layout = programData.layout.descriptorSets.get(rate);
    if (layout === undefined) {
      return null;
    }
    if (layout.descriptorSetLayout) {
      return layout.descriptorSetLayout;
    }
    layout.descriptorSetLayout = device.createDescriptorSetLayout(layout.descriptorSetLayoutInfo);
    return layout.descriptorSetLayout;
  }

  // find shader program in LayoutGraphData
  function getEffectShader(lg, effect, pass) {
    const programName = pass.program;
    const passID = getCustomPassID(lg, pass.pass);
    if (passID === INVALID_ID) {
      error(`Invalid render pass, program: ${programName}`);
      return [INVALID_ID, INVALID_ID, INVALID_ID, null, INVALID_ID];
    }
    const enableSubpass = pass.subpass && pass.subpass !== '' && ENABLE_SUBPASS;
    const subpassID = enableSubpass ? getCustomSubpassID(lg, passID, pass.subpass) : INVALID_ID;
    if (enableSubpass && subpassID === INVALID_ID) {
      error(`Invalid render subpass, program: ${programName}`);
      return [INVALID_ID, INVALID_ID, INVALID_ID, null, INVALID_ID];
    }
    const phaseID = getCustomPhaseID(lg, subpassID === INVALID_ID ? passID : subpassID, pass.phase);
    if (phaseID === INVALID_ID) {
      error(`Invalid render phase, program: ${programName}`);
      return [INVALID_ID, INVALID_ID, INVALID_ID, null, INVALID_ID];
    }
    let srcShaderInfo = null;
    let shaderID = INVALID_ID;
    for (let i = 0; i < effect.shaders.length; ++i) {
      const shaderInfo = effect.shaders[i];
      if (shaderInfo.name === programName) {
        srcShaderInfo = shaderInfo;
        shaderID = i;
        break;
      }
    }
    return [passID, subpassID, phaseID, srcShaderInfo, shaderID];
  }

  // valid IShaderInfo is compatible
  function validateShaderInfo(srcShaderInfo) {
    // source shader info
    if (srcShaderInfo.descriptors === undefined) {
      error(`No descriptors in shader: ${srcShaderInfo.name}, please reimport ALL effects`);
      return 1;
    }
    return 0;
  }
  _export({
    makeProgramInfo: makeProgramInfo,
    overwriteProgramBlockInfo: overwriteProgramBlockInfo,
    makeShaderInfo: makeShaderInfo,
    getGLSLSource: getGLSLSource,
    WebProgramProxy: void 0,
    makeLocalDescriptorSetLayoutData: makeLocalDescriptorSetLayoutData,
    buildProgramData: buildProgramData,
    getOrCreateProgramDescriptorSetLayout: getOrCreateProgramDescriptorSetLayout,
    getProgramDescriptorSetLayout: getProgramDescriptorSetLayout,
    getEffectShader: getEffectShader,
    validateShaderInfo: validateShaderInfo,
    WebProgramLibrary: void 0
  });
  return {
    setters: [function (_gfxIndexJs) {
      Attribute = _gfxIndexJs.Attribute;
      DescriptorType = _gfxIndexJs.DescriptorType;
      DESCRIPTOR_BUFFER_TYPE = _gfxIndexJs.DESCRIPTOR_BUFFER_TYPE;
      DESCRIPTOR_SAMPLER_TYPE = _gfxIndexJs.DESCRIPTOR_SAMPLER_TYPE;
      MemoryAccessBit = _gfxIndexJs.MemoryAccessBit;
      PipelineLayoutInfo = _gfxIndexJs.PipelineLayoutInfo;
      ShaderInfo = _gfxIndexJs.ShaderInfo;
      ShaderStage = _gfxIndexJs.ShaderStage;
      ShaderStageFlagBit = _gfxIndexJs.ShaderStageFlagBit;
      Type = _gfxIndexJs.Type;
      Uniform = _gfxIndexJs.Uniform;
      UniformBlock = _gfxIndexJs.UniformBlock;
      UniformInputAttachment = _gfxIndexJs.UniformInputAttachment;
      UniformSampler = _gfxIndexJs.UniformSampler;
      UniformSamplerTexture = _gfxIndexJs.UniformSamplerTexture;
      UniformStorageBuffer = _gfxIndexJs.UniformStorageBuffer;
      UniformStorageImage = _gfxIndexJs.UniformStorageImage;
      UniformTexture = _gfxIndexJs.UniformTexture;
      deviceManager = _gfxIndexJs.deviceManager;
      DescriptorSetLayoutInfo = _gfxIndexJs.DescriptorSetLayoutInfo;
      DescriptorSetInfo = _gfxIndexJs.DescriptorSetInfo;
    }, function (_renderSceneCoreProgramUtilsJs) {
      genHandles = _renderSceneCoreProgramUtilsJs.genHandles;
      getActiveAttributes = _renderSceneCoreProgramUtilsJs.getActiveAttributes;
      getCombinationDefines = _renderSceneCoreProgramUtilsJs.getCombinationDefines;
      getShaderInstanceName = _renderSceneCoreProgramUtilsJs.getShaderInstanceName;
      getSize = _renderSceneCoreProgramUtilsJs.getSize;
      getVariantKey = _renderSceneCoreProgramUtilsJs.getVariantKey;
      populateMacros = _renderSceneCoreProgramUtilsJs.populateMacros;
      prepareDefines = _renderSceneCoreProgramUtilsJs.prepareDefines;
    }, function (_renderSceneIndexJs) {
      getDeviceShaderVersion = _renderSceneIndexJs.getDeviceShaderVersion;
    }, function (_layoutGraphJs) {
      DescriptorBlockData = _layoutGraphJs.DescriptorBlockData;
      DescriptorData = _layoutGraphJs.DescriptorData;
      DescriptorSetData = _layoutGraphJs.DescriptorSetData;
      DescriptorSetLayoutData = _layoutGraphJs.DescriptorSetLayoutData;
      LayoutGraphDataValue = _layoutGraphJs.LayoutGraphDataValue;
      ShaderProgramData = _layoutGraphJs.ShaderProgramData;
    }, function (_typesJs) {
      DescriptorTypeOrder = _typesJs.DescriptorTypeOrder;
      UpdateFrequency = _typesJs.UpdateFrequency;
    }, function (_webTypesJs) {
      ProgramGroup = _webTypesJs.ProgramGroup;
      ProgramInfo = _webTypesJs.ProgramInfo;
    }, function (_layoutGraphUtilsJs) {
      getCustomPassID = _layoutGraphUtilsJs.getCustomPassID;
      getCustomPhaseID = _layoutGraphUtilsJs.getCustomPhaseID;
      getOrCreateDescriptorSetLayout = _layoutGraphUtilsJs.getOrCreateDescriptorSetLayout;
      getEmptyDescriptorSetLayout = _layoutGraphUtilsJs.getEmptyDescriptorSetLayout;
      getEmptyPipelineLayout = _layoutGraphUtilsJs.getEmptyPipelineLayout;
      initializeDescriptorSetLayoutInfo = _layoutGraphUtilsJs.initializeDescriptorSetLayoutInfo;
      makeDescriptorSetLayoutData = _layoutGraphUtilsJs.makeDescriptorSetLayoutData;
      getDescriptorSetLayout = _layoutGraphUtilsJs.getDescriptorSetLayout;
      getOrCreateDescriptorID = _layoutGraphUtilsJs.getOrCreateDescriptorID;
      getDescriptorTypeOrder = _layoutGraphUtilsJs.getDescriptorTypeOrder;
      getProgramID = _layoutGraphUtilsJs.getProgramID;
      getDescriptorNameID = _layoutGraphUtilsJs.getDescriptorNameID;
      getDescriptorName = _layoutGraphUtilsJs.getDescriptorName;
      INVALID_ID = _layoutGraphUtilsJs.INVALID_ID;
      ENABLE_SUBPASS = _layoutGraphUtilsJs.ENABLE_SUBPASS;
      getCustomSubpassID = _layoutGraphUtilsJs.getCustomSubpassID;
      generateConstantMacros = _layoutGraphUtilsJs.generateConstantMacros;
      populatePipelineLayoutInfo = _layoutGraphUtilsJs.populatePipelineLayoutInfo;
    }, function (_corePlatformDebugJs) {
      assert = _corePlatformDebugJs.assert;
      error = _corePlatformDebugJs.error;
    }, function (_defineJs) {
      UBOSkinning = _defineJs.UBOSkinning;
      localDescriptorSetLayout = _defineJs.localDescriptorSetLayout;
    }],
    execute: function () {
      _setIndex = [2, 1, 3, 0];
      _export("WebProgramProxy", WebProgramProxy = class WebProgramProxy {
        constructor(shader, pipelineStateIn = null) {
          this.shader = void 0;
          this.pipelineState = null;
          this.shader = shader;
          this.pipelineState = pipelineStateIn;
        }
        get name() {
          return this.shader.name;
        }
      });
      _export("WebProgramLibrary", WebProgramLibrary = class WebProgramLibrary {
        constructor(lg) {
          this.layoutGraph = void 0;
          this.phases = new Map();
          this.mergeHighFrequency = false;
          this.fixedLocal = true;
          this.localLayoutData = new DescriptorSetLayoutData();
          this.localDescriptorSetLayout = null;
          this.emptyDescriptorSetLayout = null;
          this.emptyPipelineLayout = null;
          this.pipeline = null;
          this.device = null;
          this.layoutGraph = lg;
          for (const v of lg.vertices()) {
            if (lg.holds(LayoutGraphDataValue.RenderPhase, v)) {
              this.phases.set(v, new ProgramGroup());
            }
          }
        }
        init(deviceIn) {
          if (this.device === deviceIn) {
            return;
          }
          this.device = deviceIn;
          this.emptyDescriptorSetLayout = this.device.createDescriptorSetLayout(new DescriptorSetLayoutInfo());
          this.emptyPipelineLayout = this.device.createPipelineLayout(new PipelineLayoutInfo());

          // update ubo
          // tips: for compatibility with old version, when maxVertexUniformVectors is 128, maxJoints = 30
          let maxJoints = (this.device.capabilities.maxVertexUniformVectors - 38) / 3;
          maxJoints = maxJoints < 256 ? maxJoints : 256;
          UBOSkinning.initLayout(maxJoints);

          // init layout graph
          const lg = this.layoutGraph;
          for (const v of lg.vertices()) {
            const layout = lg.get('Layout').get(v);
            for (const [update, set] of layout.descriptorSets) {
              initializeDescriptorSetLayoutInfo(set.descriptorSetLayoutData, set.descriptorSetLayoutInfo);
              set.descriptorSetLayout = this.device.createDescriptorSetLayout(set.descriptorSetLayoutInfo);
              assert(!!set.descriptorSetLayout);
              set.descriptorSet = this.device.createDescriptorSet(new DescriptorSetInfo(set.descriptorSetLayout));
              assert(!!set.descriptorSet);
            }
          }
          for (const v of lg.vertices()) {
            if (!lg.holds(LayoutGraphDataValue.RenderPhase, v)) {
              continue;
            }
            const phaseID = v;
            const subpassOrPassID = lg.getParent(phaseID);
            const passLayout = lg.getLayout(subpassOrPassID);
            const phaseLayout = lg.getLayout(phaseID);
            const info = new PipelineLayoutInfo();
            populatePipelineLayoutInfo(passLayout, UpdateFrequency.PER_PASS, info);
            populatePipelineLayoutInfo(phaseLayout, UpdateFrequency.PER_PHASE, info);
            populatePipelineLayoutInfo(phaseLayout, UpdateFrequency.PER_BATCH, info);
            populatePipelineLayoutInfo(phaseLayout, UpdateFrequency.PER_INSTANCE, info);
            const phase = lg.getRenderPhase(phaseID);
            phase.pipelineLayout = this.device.createPipelineLayout(info);
          }

          // init local descriptor set
          {
            const localSetLayout = localDescriptorSetLayout;
            this.localLayoutData = makeLocalDescriptorSetLayoutData(lg, localSetLayout);
            const info = new DescriptorSetLayoutInfo();
            initializeDescriptorSetLayoutInfo(this.localLayoutData, info);
            this.localDescriptorSetLayout = this.device.createDescriptorSetLayout(info);
            assert(!!this.localDescriptorSetLayout);
            let numUniformBuffers = 0;
            for (const block of this.localLayoutData.descriptorBlocks) {
              if (block.type !== DescriptorTypeOrder.UNIFORM_BUFFER && block.type !== DescriptorTypeOrder.DYNAMIC_UNIFORM_BUFFER) {
                continue;
              }
              for (const d of block.descriptors) {
                numUniformBuffers += d.count;
              }
            }
            assert(numUniformBuffers === 7); // 7 is currently max uniform binding
          }

          // generate constant macros string
          generateConstantMacros(this.device, this.layoutGraph.constantMacros);
        }
        // add effect to database
        addEffect(effect) {
          const lg = this.layoutGraph;
          for (const tech of effect.techniques) {
            for (const pass of tech.passes) {
              const programName = pass.program;
              const [passID, subpassID, phaseID, srcShaderInfo] = getEffectShader(lg, effect, pass);
              if (srcShaderInfo === null || validateShaderInfo(srcShaderInfo)) {
                error(`program: ${programName} not found`);
                continue;
              }
              assert(passID !== INVALID_ID && phaseID !== INVALID_ID);
              const subpassOrPassID = subpassID === INVALID_ID ? passID : subpassID;
              const passLayout = lg.getLayout(subpassOrPassID);
              const phaseLayout = lg.getLayout(phaseID);

              // programs
              let group = this.phases.get(phaseID);
              if (group === undefined) {
                group = new ProgramGroup();
                this.phases.set(phaseID, group);
              }
              const phasePrograms = group.programInfos;

              // build program
              const programInfo = makeProgramInfo(effect.name, srcShaderInfo);

              // collect program descriptors
              let programData = null;
              if (!this.mergeHighFrequency) {
                const phase = lg.getRenderPhase(phaseID);
                programData = new ShaderProgramData();
                buildProgramData(programName, srcShaderInfo, lg, phase, programData, this.fixedLocal);
              }

              // shaderInfo and blockSizes
              const [shaderInfo, blockSizes] = makeShaderInfo(lg, passLayout, phaseLayout, srcShaderInfo, programData, this.fixedLocal);

              // overwrite programInfo
              overwriteProgramBlockInfo(shaderInfo, programInfo);

              // handle map
              const handleMap = genHandles(shaderInfo);
              // attributes
              const attributes = new Array();
              for (const attr of programInfo.attributes) {
                attributes.push(new Attribute(attr.name, attr.format, attr.isNormalized, 0, attr.isInstanced, attr.location));
              }
              // create programInfo
              const info = new ProgramInfo(programInfo, shaderInfo, attributes, blockSizes, handleMap);
              phasePrograms.set(srcShaderInfo.name, info);
            }
          }
        }
        // precompile effect
        precompileEffect(device, effect) {
          const lg = this.layoutGraph;
          for (const tech of effect.techniques) {
            for (const pass of tech.passes) {
              const programName = pass.program;
              const [passID, subpassID, phaseID, srcShaderInfo, shaderID] = getEffectShader(lg, effect, pass);
              if (srcShaderInfo === null || validateShaderInfo(srcShaderInfo)) {
                error(`program: ${programName} not valid`);
                continue;
              }
              assert(passID !== INVALID_ID && phaseID !== INVALID_ID && shaderID !== INVALID_ID);
              const combination = effect.combinations[shaderID];
              if (!combination) {
                continue;
              }
              const defines = getCombinationDefines(combination);
              defines.forEach(defines => this.getProgramVariant(device, phaseID, programName, defines));
            }
          }
        }
        // get IProgramInfo
        getProgramInfo(phaseID, programName) {
          assert(phaseID !== INVALID_ID);
          const group = this.phases.get(phaseID);
          const info = group.programInfos.get(programName);
          return info.programInfo;
        }

        // get gfx.ShaderInfo
        getShaderInfo(phaseID, programName) {
          assert(phaseID !== INVALID_ID);
          const group = this.phases.get(phaseID);
          const info = group.programInfos.get(programName);
          return info.shaderInfo;
        }
        // get shader key
        getKey(phaseID, programName, defines) {
          assert(phaseID !== INVALID_ID);
          // get phase
          const group = this.phases.get(phaseID);
          if (group === undefined) {
            error(`Invalid render phase, program: ${programName}`);
            return '';
          }
          // get info
          const info = group.programInfos.get(programName);
          if (info === undefined) {
            error(`Invalid program, program: ${programName}`);
            return '';
          }
          return getVariantKey(info.programInfo, defines);
        }
        // get program variant
        getProgramVariant(device, phaseID, name, defines, key = null) {
          var _this$pipeline;
          Object.assign(defines, (_this$pipeline = this.pipeline) === null || _this$pipeline === void 0 ? void 0 : _this$pipeline.macros);
          assert(phaseID !== INVALID_ID);
          // get phase
          const group = this.phases.get(phaseID);
          if (group === undefined) {
            error(`Invalid render phase, program: ${name}`);
            return null;
          }
          // get info
          const info = group.programInfos.get(name);
          if (info === undefined) {
            error(`Invalid program, program: ${name}`);
            return null;
          }
          const programInfo = info.programInfo;
          if (key === null) {
            key = getVariantKey(programInfo, defines);
          }

          // try get program
          const programHosts = group.programProxies;
          const programHost = programHosts.get(key);
          if (programHost !== undefined) {
            return programHost;
          }

          // prepare variant
          const macroArray = prepareDefines(defines, programInfo.defines);
          const prefix = this.layoutGraph.constantMacros + programInfo.constantMacros + macroArray.reduce((acc, cur) => `${acc}#define ${cur.name} ${cur.value}\n`, '');
          let src = programInfo.glsl3;
          const deviceShaderVersion = getDeviceShaderVersion(device);
          if (deviceShaderVersion) {
            src = programInfo[deviceShaderVersion];
          } else {
            error('Invalid GFX API!');
          }

          // prepare shader info
          const shaderInfo = info.shaderInfo;
          if (src.compute) {
            shaderInfo.stages[0].source = prefix + src.compute;
            shaderInfo.stages[0].stage = ShaderStageFlagBit.COMPUTE;
            shaderInfo.stages.length = 1;
          } else {
            shaderInfo.stages[0].source = prefix + src.vert;
            shaderInfo.stages[1].source = prefix + src.frag;
          }
          shaderInfo.attributes = getActiveAttributes(programInfo, info.attributes, defines);
          shaderInfo.name = getShaderInstanceName(name, macroArray);

          // create shader
          const shader = device.createShader(shaderInfo);

          // create program host and register
          const host = new WebProgramProxy(shader);
          programHosts.set(key, host);

          // create
          return host;
        }
        // get material descriptor set layout
        getMaterialDescriptorSetLayout(device, phaseID, programName) {
          if (this.mergeHighFrequency) {
            assert(phaseID !== INVALID_ID);
            const subpassOrPassID = this.layoutGraph.getParent(phaseID);
            return getOrCreateDescriptorSetLayout(this.layoutGraph, subpassOrPassID, phaseID, UpdateFrequency.PER_BATCH);
          }
          return getOrCreateProgramDescriptorSetLayout(device, this.layoutGraph, phaseID, programName, UpdateFrequency.PER_BATCH);
        }
        // get local descriptor set layout
        getLocalDescriptorSetLayout(device, phaseID, programName) {
          if (this.mergeHighFrequency) {
            assert(phaseID !== INVALID_ID);
            const subpassOrPassID = this.layoutGraph.getParent(phaseID);
            return getOrCreateDescriptorSetLayout(this.layoutGraph, subpassOrPassID, phaseID, UpdateFrequency.PER_INSTANCE);
          }
          return getOrCreateProgramDescriptorSetLayout(device, this.layoutGraph, phaseID, programName, UpdateFrequency.PER_INSTANCE);
        }
        // get related uniform block sizes
        getBlockSizes(phaseID, programName) {
          assert(phaseID !== INVALID_ID);
          const group = this.phases.get(phaseID);
          if (!group) {
            error(`Invalid render phase, program: ${programName}`);
            return [];
          }
          const info = group.programInfos.get(programName);
          if (!info) {
            error(`Invalid program, program: ${programName}`);
            return [];
          }
          return info.blockSizes;
        }
        // get property handle map
        getHandleMap(phaseID, programName) {
          assert(phaseID !== INVALID_ID);
          const group = this.phases.get(phaseID);
          if (!group) {
            error(`Invalid render phase, program: ${programName}`);
            return {};
          }
          const info = group.programInfos.get(programName);
          if (!info) {
            error(`Invalid program, program: ${programName}`);
            return {};
          }
          return info.handleMap;
        }
        // get shader pipeline layout
        getPipelineLayout(device, phaseID, programName) {
          if (this.mergeHighFrequency) {
            assert(phaseID !== INVALID_ID);
            const layout = this.layoutGraph.getRenderPhase(phaseID);
            return layout.pipelineLayout;
          }
          const lg = this.layoutGraph;
          const phase = lg.getRenderPhase(phaseID);
          const programID = phase.shaderIndex.get(programName);
          if (programID === undefined) {
            return getEmptyPipelineLayout();
          }
          const programData = phase.shaderPrograms[programID];
          if (programData.pipelineLayout) {
            return programData.pipelineLayout;
          }

          // get pass
          const subpassOrPassID = lg.getParent(phaseID);
          if (subpassOrPassID === INVALID_ID) {
            return getEmptyPipelineLayout();
          }

          // craete pipeline layout
          const info = new PipelineLayoutInfo();
          const passSet = getDescriptorSetLayout(this.layoutGraph, subpassOrPassID, phaseID, UpdateFrequency.PER_PASS);
          if (passSet) {
            info.setLayouts.push(passSet);
          }
          const phaseSet = getDescriptorSetLayout(this.layoutGraph, subpassOrPassID, phaseID, UpdateFrequency.PER_PHASE);
          if (phaseSet) {
            info.setLayouts.push(phaseSet);
          }
          const batchSet = getProgramDescriptorSetLayout(device, lg, phaseID, programName, UpdateFrequency.PER_BATCH);
          if (batchSet) {
            info.setLayouts.push(batchSet);
          }
          const instanceSet = getProgramDescriptorSetLayout(device, lg, phaseID, programName, UpdateFrequency.PER_INSTANCE);
          if (instanceSet) {
            info.setLayouts.push(instanceSet);
          }
          programData.pipelineLayout = device.createPipelineLayout(info);
          return programData.pipelineLayout;
        }
        getProgramID(phaseID, programName) {
          return getProgramID(this.layoutGraph, phaseID, programName);
        }
        getDescriptorNameID(name) {
          return getDescriptorNameID(this.layoutGraph, name);
        }
        getDescriptorName(nameID) {
          return getDescriptorName(this.layoutGraph, nameID);
        }
      });
    }
  };
});