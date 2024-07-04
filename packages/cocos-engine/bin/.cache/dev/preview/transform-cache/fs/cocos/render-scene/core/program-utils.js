System.register("q-bundled:///fs/cocos/render-scene/core/program-utils.js", ["../../gfx/base/define.js", "../../rendering/define.js", "./pass-utils.js"], function (_export, _context) {
  "use strict";

  var GetTypeSize, UBOForwardLight, UBOSkinning, genHandle, defaultUniformCounts;
  function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /****************************************************************************
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
                                                                                                                                                                                                                                                                                                                                                                                            ****************************************************************************/
  function mapDefine(info, def) {
    switch (info.type) {
      case 'boolean':
        return typeof def === 'number' ? def.toString() : def ? '1' : '0';
      case 'string':
        return def !== undefined ? def : info.options[0];
      case 'number':
        return def !== undefined ? def.toString() : info.range[0].toString();
      default:
        console.warn("unknown define type '" + info.type + "'");
        return '-1';
      // should neven happen
    }
  }

  function prepareDefines(defs, tDefs) {
    var macros = [];
    for (var i = 0; i < tDefs.length; i++) {
      var tmpl = tDefs[i];
      var name = tmpl.name;
      var v = defs[name];
      var value = mapDefine(tmpl, v);
      var isDefault = !v || v === '0';
      macros.push({
        name: name,
        value: value,
        isDefault: isDefault
      });
    }
    return macros;
  }
  function getShaderInstanceName(name, macros) {
    return name + macros.reduce(function (acc, cur) {
      return cur.isDefault ? acc : acc + "|" + cur.name + cur.value;
    }, '');
  }
  function dependencyCheck(dependencies, defines) {
    for (var i = 0; i < dependencies.length; i++) {
      var d = dependencies[i];
      if (d[0] === '!') {
        // negative dependency
        if (defines[d.slice(1)]) {
          return false;
        }
      } else if (!defines[d]) {
        return false;
      }
    }
    return true;
  }
  function getActiveAttributes(tmpl, gfxAttributes, defines) {
    var out = [];
    var attributes = tmpl.attributes;
    for (var i = 0; i < attributes.length; i++) {
      if (!dependencyCheck(attributes[i].defines, defines)) {
        continue;
      }
      out.push(gfxAttributes[i]);
    }
    return out;
  }
  function getVariantKey(programInfo, defines) {
    var tmplDefs = programInfo.defines;
    if (programInfo.uber) {
      var _key = '';
      for (var i = 0; i < tmplDefs.length; i++) {
        var tmplDef = tmplDefs[i];
        var value = defines[tmplDef.name];
        if (!value || !tmplDef._map) {
          continue;
        }
        var mapped = tmplDef._map(value);
        var offset = tmplDef._offset;
        _key += "" + offset + mapped + "|";
      }
      return "" + _key + programInfo.hash;
    }
    var key = 0;
    for (var _i = 0; _i < tmplDefs.length; _i++) {
      var _tmplDef = tmplDefs[_i];
      var _value = defines[_tmplDef.name];
      if (!_value || !_tmplDef._map) {
        continue;
      }
      var _mapped = _tmplDef._map(_value);
      var _offset = _tmplDef._offset;
      key |= _mapped << _offset;
    }
    return key.toString(16) + "|" + programInfo.hash;
  }
  function getUniformSize(prevSize, m) {
    if (m.count) {
      return prevSize + GetTypeSize(m.type) * m.count;
    } else {
      var count = defaultUniformCounts.get(m.name);
      if (count !== undefined) {
        return prevSize + GetTypeSize(m.type) * count;
      }
      console.error("uniform '" + m.name + "' must have a count");
    }
    return prevSize;
  }
  function getSize(blockMembers) {
    return blockMembers.reduce(getUniformSize, 0);
  }
  function genHandles(tmpl) {
    var handleMap = {};
    // block member handles
    for (var i = 0; i < tmpl.blocks.length; i++) {
      var block = tmpl.blocks[i];
      var members = block.members;
      var offset = 0;
      for (var j = 0; j < members.length; j++) {
        var uniform = members[j];
        handleMap[uniform.name] = genHandle(block.binding, uniform.type, uniform.count, offset);
        offset += (GetTypeSize(uniform.type) >> 2) * uniform.count; // assumes no implicit padding, which is guaranteed by effect compiler
      }
    }
    // samplerTexture handles
    for (var _i2 = 0; _i2 < tmpl.samplerTextures.length; _i2++) {
      var samplerTexture = tmpl.samplerTextures[_i2];
      handleMap[samplerTexture.name] = genHandle(samplerTexture.binding, samplerTexture.type, samplerTexture.count);
    }
    return handleMap;
  }
  function getBitCount(cnt) {
    return Math.ceil(Math.log2(Math.max(cnt, 2)));
  }
  function populateMacros(tmpl) {
    // calculate option mask offset
    var offset = 0;
    var _loop = function _loop() {
      var def = tmpl.defines[i];
      var cnt = 1;
      if (def.type === 'number') {
        var range = def.range;
        cnt = getBitCount(range[1] - range[0] + 1); // inclusive on both ends
        def._map = function (value) {
          return value - range[0];
        };
      } else if (def.type === 'string') {
        cnt = getBitCount(def.options.length);
        def._map = function (value) {
          return Math.max(0, def.options.findIndex(function (s) {
            return s === value;
          }));
        };
      } else if (def.type === 'boolean') {
        def._map = function (value) {
          return value ? 1 : 0;
        };
      }
      def._offset = offset;
      offset += cnt;
    };
    for (var i = 0; i < tmpl.defines.length; i++) {
      _loop();
    }
    if (offset > 31) {
      tmpl.uber = true;
    }
    // generate constant macros
    tmpl.constantMacros = '';
    for (var key in tmpl.builtins.statistics) {
      tmpl.constantMacros += "#define " + key + " " + tmpl.builtins.statistics[key] + "\n";
    }
  }
  function getCombinationDefines(combination) {
    var defines = Object.keys(combination).reduce(function (out, name) {
      return out.reduce(function (acc, cur) {
        var choices = combination[name];
        for (var i = 0; i < choices.length; ++i) {
          var _defines = _extends({}, cur);
          _defines[name] = choices[i];
          acc.push(_defines);
        }
        return acc;
      }, []);
    }, [{}]);
    return defines;
  }
  function addEffectDefaultProperties(effect) {
    for (var i = 0; i < effect.techniques.length; i++) {
      var tech = effect.techniques[i];
      for (var j = 0; j < tech.passes.length; j++) {
        var pass = tech.passes[j];
        // grab default property declaration if there is none
        if (pass.propertyIndex !== undefined && pass.properties === undefined) {
          pass.properties = tech.passes[pass.propertyIndex].properties;
        }
      }
    }
  }
  _export({
    prepareDefines: prepareDefines,
    getShaderInstanceName: getShaderInstanceName,
    getActiveAttributes: getActiveAttributes,
    getVariantKey: getVariantKey,
    getSize: getSize,
    genHandles: genHandles,
    populateMacros: populateMacros,
    getCombinationDefines: getCombinationDefines,
    addEffectDefaultProperties: addEffectDefaultProperties
  });
  return {
    setters: [function (_gfxBaseDefineJs) {
      GetTypeSize = _gfxBaseDefineJs.GetTypeSize;
    }, function (_renderingDefineJs) {
      UBOForwardLight = _renderingDefineJs.UBOForwardLight;
      UBOSkinning = _renderingDefineJs.UBOSkinning;
    }, function (_passUtilsJs) {
      genHandle = _passUtilsJs.genHandle;
    }],
    execute: function () {
      defaultUniformCounts = new Map();
      defaultUniformCounts.set('cc_joints', UBOSkinning.LAYOUT.members[0].count);
      defaultUniformCounts.set('cc_lightPos', UBOForwardLight.LIGHTS_PER_PASS);
      defaultUniformCounts.set('cc_lightColor', UBOForwardLight.LIGHTS_PER_PASS);
      defaultUniformCounts.set('cc_lightSizeRangeAngle', UBOForwardLight.LIGHTS_PER_PASS);
      defaultUniformCounts.set('cc_lightDir', UBOForwardLight.LIGHTS_PER_PASS);
      defaultUniformCounts.set('cc_lightBoundingSizeVS', UBOForwardLight.LIGHTS_PER_PASS);
    }
  };
});