System.register("q-bundled:///fs/cocos/core/utils/js.js", ["./id-generator.js", "./js-typed.js", "./pool.js", "./array.js", "../global-exports.js"], function (_export, _context) {
  "use strict";

  var IDGenerator, _idToClass, _nameToClass, _getClassById, _getClassId, _setClassId, addon, clear, createMap, extend, formatStr, get, getClassByName, getClassById, getClassName, getClassId, getPropertyDescriptor, getset, getSuper, isChildClassOf, isNumber, isString, isEmptyObject, mixin, obsolete, obsoletes, set, setClassName, setClassAlias, shiftArguments, unregisterClass, value, Pool, array, legacyCC, js;
  function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); } /*
                                                                                                                                                                                                                                                                                                                                                       Copyright (c) 2008-2010 Ricardo Quesada
                                                                                                                                                                                                                                                                                                                                                       Copyright (c) 2011-2012 cocos2d-x.org
                                                                                                                                                                                                                                                                                                                                                       Copyright (c) 2013-2016 Chukong Technologies Inc.
                                                                                                                                                                                                                                                                                                                                                       Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                                                                                                       http://www.cocos2d-x.org
                                                                                                                                                                                                                                                                                                                                                      
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
    setters: [function (_idGeneratorJs) {
      IDGenerator = _idGeneratorJs.IDGenerator;
      _export("IDGenerator", _idGeneratorJs.IDGenerator);
    }, function (_jsTypedJs) {
      _idToClass = _jsTypedJs._idToClass;
      _nameToClass = _jsTypedJs._nameToClass;
      _getClassById = _jsTypedJs._getClassById;
      _getClassId = _jsTypedJs._getClassId;
      _setClassId = _jsTypedJs._setClassId;
      addon = _jsTypedJs.addon;
      clear = _jsTypedJs.clear;
      createMap = _jsTypedJs.createMap;
      extend = _jsTypedJs.extend;
      formatStr = _jsTypedJs.formatStr;
      get = _jsTypedJs.get;
      getClassByName = _jsTypedJs.getClassByName;
      getClassById = _jsTypedJs.getClassById;
      getClassName = _jsTypedJs.getClassName;
      getClassId = _jsTypedJs.getClassId;
      getPropertyDescriptor = _jsTypedJs.getPropertyDescriptor;
      getset = _jsTypedJs.getset;
      getSuper = _jsTypedJs.getSuper;
      isChildClassOf = _jsTypedJs.isChildClassOf;
      isNumber = _jsTypedJs.isNumber;
      isString = _jsTypedJs.isString;
      isEmptyObject = _jsTypedJs.isEmptyObject;
      mixin = _jsTypedJs.mixin;
      obsolete = _jsTypedJs.obsolete;
      obsoletes = _jsTypedJs.obsoletes;
      set = _jsTypedJs.set;
      setClassName = _jsTypedJs.setClassName;
      setClassAlias = _jsTypedJs.setClassAlias;
      shiftArguments = _jsTypedJs.shiftArguments;
      unregisterClass = _jsTypedJs.unregisterClass;
      value = _jsTypedJs.value;
      var _exportObj = {};
      for (var _key in _jsTypedJs) {
        if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _jsTypedJs[_key];
      }
      _export(_exportObj);
    }, function (_poolJs) {
      Pool = _poolJs.Pool;
      _export("Pool", _poolJs.Pool);
    }, function (_arrayJs) {
      array = _arrayJs;
    }, function (_globalExportsJs) {
      legacyCC = _globalExportsJs.legacyCC;
    }],
    execute: function () {
      _export("array", array);
      /**
       * @deprecated since v3.7.0, `js.js` is deprecated, please access `js` directly instead.
       */
      _export("js", js = {
        IDGenerator: IDGenerator,
        Pool: Pool,
        array: array,
        isNumber: isNumber,
        isString: isString,
        isEmptyObject: isEmptyObject,
        getPropertyDescriptor: getPropertyDescriptor,
        addon: addon,
        mixin: mixin,
        extend: extend,
        getSuper: getSuper,
        isChildClassOf: isChildClassOf,
        clear: clear,
        value: value,
        getset: getset,
        get: get,
        set: set,
        unregisterClass: unregisterClass,
        getClassName: getClassName,
        setClassName: setClassName,
        setClassAlias: setClassAlias,
        getClassByName: getClassByName,
        getClassById: getClassById,
        /**
         * @en All classes registered in the engine, indexed by name.
         * @zh 引擎中已注册的所有类型，通过名称进行索引。
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         * @example
         * ```
         * import { js } from 'cc';
         * // save all registered classes before loading scripts
         * let builtinClassIds = js._registeredClassIds;
         * let builtinClassNames = js._registeredClassNames;
         * // load some scripts that contain CCClass
         * ...
         * // clear all loaded classes
         * js._registeredClassIds = builtinClassIds;
         * js._registeredClassNames = builtinClassNames;
         * ```
         *
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */
        get _registeredClassNames() {
          return _extends({}, _nameToClass);
        },
        set _registeredClassNames(value) {
          clear(_nameToClass);
          Object.assign(_nameToClass, value);
        },
        /**
         * @en All classes registered in the engine, indexed by ID.
         * @zh 引擎中已注册的所有类型，通过 ID 进行索引。
         * @example
         * ```
         * import { js } from 'cc';
         * // save all registered classes before loading scripts
         * let builtinClassIds = js._registeredClassIds;
         * let builtinClassNames = js._registeredClassNames;
         * // load some scripts that contain CCClass
         * ...
         * // clear all loaded classes
         * js._registeredClassIds = builtinClassIds;
         * js._registeredClassNames = builtinClassNames;
         * ```
         *
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */
        get _registeredClassIds() {
          return _extends({}, _idToClass);
        },
        set _registeredClassIds(value) {
          clear(_idToClass);
          Object.assign(_idToClass, value);
        },
        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */
        _getClassId: _getClassId,
        getClassId: getClassId,
        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */
        _setClassId: _setClassId,
        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */
        _getClassById: _getClassById,
        obsolete: obsolete,
        obsoletes: obsoletes,
        formatStr: formatStr,
        shiftArguments: shiftArguments,
        createMap: createMap
      });
      /**
       * @en This module provides some JavaScript utilities. All members can be accessed via `import { js } from 'cc'`.
       * @zh 这个模块封装了 JavaScript 相关的一些实用函数，你可以通过 `import { js } from 'cc'` 来访问这个模块。
       */
      legacyCC.js = js;
    }
  };
});