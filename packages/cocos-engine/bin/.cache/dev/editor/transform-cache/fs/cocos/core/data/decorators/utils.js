System.register("q-bundled:///fs/cocos/core/data/decorators/utils.js", ["../../../../../virtual/internal%253Aconstants.js", "../class.js", "../../platform/debug.js", "../../utils/js-typed.js"], function (_export, _context) {
  "use strict";

  var DEV, CCClass, error, getClassName, emptyDecorator, emptyDecoratorFn, emptySmartClassDecorator, CACHE_KEY;
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
  /**
   * @en
   * Make a smart class decorator which can properly handle the following form decorator syntax:
   * - `@x`
   * - `@x(arg0)`
   *
   * and forward both the decorated class and the `arg0` (in the first form, `arg0` is forwarded as `undefined`) to
   * `decorate`.
   * @zh
   * 创建一个智能类装饰器，它能正确地处理以下形式的装饰器语法：
   * - `@x`
   * - `@x(arg0)`
   *
   * 并且，将被装饰的类和 `arg0`（若是第一种形式，`arg0` 就是 `undefined`）一起转发给 `decorate`。
   * @param decorate
   */
  function makeSmartClassDecorator(decorate) {
    return proxyFn;
    function proxyFn(target) {
      if (typeof target === 'function') {
        // If no parameter specified
        return decorate(target);
      } else {
        return function (constructor) {
          return decorate(constructor, target);
        };
      }
    }
  }
  function writeEditorClassProperty(constructor, propertyName, value) {
    const cache = getClassCache(constructor, propertyName);
    if (cache) {
      const proto = getSubDict(cache, 'proto');
      getSubDict(proto, 'editor')[propertyName] = value;
    }
  }

  /**
   * @en
   * Make a function that accepts an argument value and returns a class decorator.
   * The decorator sets the editor property `propertyName`, on the decorated class, into that argument value.
   * @zh
   * 创建一个函数，该函数接受一个参数值并返回一个类装饰器。
   * 该装饰器将被装饰类的编辑器属性 `propertyName` 设置为该参数的值。
   * @param propertyName The editor property.
   */
  function makeEditorClassDecoratorFn(propertyName) {
    return value => constructor => {
      writeEditorClassProperty(constructor, propertyName, value);
    };
  }

  /**
   * Make a smart class decorator.
   * The smart decorator sets the editor property `propertyName`, on the decorated class, into:
   * - `defaultValue` if the decorator is called with `@x` form, or
   * - the argument if the decorator is called with an argument, eg, the `@x(arg0)` form.
   * @zh
   * 创建一个智能类装饰器。
   * 该智能类装饰器将根据以下情况来设置被装饰类的编辑器属性 `propertyName`：
   * - 如果该装饰器是以 `@x` 形式调用的，该属性将被设置为 `defaultValue`。
   * - 如果该装饰器是以一个参数的形式，即 `@x(arg0)` 的形式调用的，该属性将被设置为传入的参数值。
   * @param propertyName The editor property.
   */
  function makeSmartEditorClassDecorator(propertyName, defaultValue) {
    return makeSmartClassDecorator((constructor, decoratedValue) => {
      writeEditorClassProperty(constructor, propertyName, defaultValue !== undefined ? defaultValue : decoratedValue);
    });
  }

  // caches for class construction

  function getClassCache(ctor, decoratorName) {
    if (DEV && CCClass._isCCClass(ctor)) {
      error('`@%s` should be used after @ccclass for class "%s"', decoratorName, getClassName(ctor));
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return getSubDict(ctor, CACHE_KEY);
  }
  function getSubDict(obj, key) {
    return obj[key] || (obj[key] = {});
  }
  _export({
    makeSmartClassDecorator: makeSmartClassDecorator,
    makeEditorClassDecoratorFn: makeEditorClassDecoratorFn,
    makeSmartEditorClassDecorator: makeSmartEditorClassDecorator,
    getClassCache: getClassCache,
    getSubDict: getSubDict
  });
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      DEV = _virtualInternal253AconstantsJs.DEV;
    }, function (_classJs) {
      CCClass = _classJs.CCClass;
    }, function (_platformDebugJs) {
      error = _platformDebugJs.error;
    }, function (_utilsJsTypedJs) {
      getClassName = _utilsJsTypedJs.getClassName;
    }],
    execute: function () {
      /**
       * @en
       * The signature is compatible with both the TypeScript legacy decorator and the Babel legacy decorator.
       * The third argument is `descriptor` in the Babel case.
       * For some engine internally optimized decorators, the third argument is the initializer.
       * @zh
       * 该签名同时兼容 TypeScript legacy 装饰器以及 Babel legacy 装饰器。
       * 第三个参数在 Babel 情况下，会传入 descriptor。对于一些被优化的引擎内部装饰器，会传入 initializer。
       */
      /**
       * @en
       * A class(or property) decorator which does nothing.
       * @zh
       * 一个什么也不做的类（或属性）装饰器。
       */
      _export("emptyDecorator", emptyDecorator = () => {});
      /**
       * @en
       * A function that ignores all arguments and returns the `emptyDecorator`.
       * @zh
       * 一个忽略所有参数并且返回 `emptyDecorator` 的函数。
       */
      _export("emptyDecoratorFn", emptyDecoratorFn = () => emptyDecorator);
      /**
       * @en
       * Acts like `emptyDecorator` if called in form of `@x`;
       * acts like `emptyDecoratorFn` if called in form of `@x(...args)`.
       * @zh
       * 当以 `@x` 形式调用时表现如同 `emptyDecorator`，当以 `@x(...args)` 形式调用时表现如同 `emptyDecoratorFn`。
       */
      _export("emptySmartClassDecorator", emptySmartClassDecorator = makeSmartClassDecorator(() => {}));
      _export("CACHE_KEY", CACHE_KEY = '__ccclassCache__');
    }
  };
});