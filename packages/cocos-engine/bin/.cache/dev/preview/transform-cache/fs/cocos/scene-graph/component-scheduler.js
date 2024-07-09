System.register("q-bundled:///fs/cocos/scene-graph/component-scheduler.js", ["../../../virtual/internal%253Aconstants.js", "../core/data/object.js", "../core/index.js", "../core/utils/misc.js", "../core/global-exports.js", "../core/platform/debug.js"], function (_export, _context) {
  "use strict";

  var EDITOR, SUPPORT_JIT, DEV, TEST, CCObject, js, tryCatchFunctor_EDITOR, legacyCC, error, assert, fastRemoveAt, IsStartCalled, IsOnEnableCalled, IsEditorOnEnableCalled, callerFunctor, callOnEnableInTryCatch, callOnDisableInTryCatch, LifeCycleInvoker, OneOffInvoker, ReusableInvoker, invokeStart, invokeUpdate, invokeLateUpdate, invokeOnEnable, ComponentScheduler;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
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
  function sortedIndex(array, comp) {
    var order = comp.constructor._executionOrder;
    var id = comp._id;
    var l = 0;
    for (var h = array.length - 1, m = h >>> 1; l <= h; m = l + h >>> 1) {
      var test = array[m];
      var testOrder = test.constructor._executionOrder;
      if (testOrder > order) {
        h = m - 1;
      } else if (testOrder < order) {
        l = m + 1;
      } else {
        var testId = test._id;
        if (testId > id) {
          h = m - 1;
        } else if (testId < id) {
          l = m + 1;
        } else {
          return m;
        }
      }
    }
    return ~l;
  }

  // remove disabled and not invoked component from array
  function stableRemoveInactive(iterator, flagToClear) {
    var array = iterator.array;
    var next = iterator.i + 1;
    while (next < array.length) {
      var comp = array[next];
      if (comp.node._activeInHierarchy) {
        ++next;
      } else {
        iterator.removeAt(next);
        if (flagToClear) {
          comp._objFlags &= ~flagToClear;
        }
      }
    }
  }
  function compareOrder(a, b) {
    return a.constructor._executionOrder - b.constructor._executionOrder;
  }

  // for onLoad: sort once all components registered, invoke once

  function enableInEditor(comp) {
    if (!(comp._objFlags & IsEditorOnEnableCalled)) {
      legacyCC.engine.emit('component-enabled', comp.uuid);
      if (!legacyCC.GAME_VIEW) {
        comp._objFlags |= IsEditorOnEnableCalled;
      }
    }
  }

  // return function to simply call each component with try catch protection
  function createInvokeImplJit(code, useDt, ensureFlag) {
    // function (it) {
    //     let a = it.array;
    //     for (it.i = 0; it.i < a.length; ++it.i) {
    //         let c = a[it.i];
    //         // ...
    //     }
    // }
    var body = "" + ('var a=it.array;' + 'for(it.i=0;it.i<a.length;++it.i){' + 'var c=a[it.i];') + code + "}";
    var fastPath = useDt ? Function('it', 'dt', body) : Function('it', body);
    var singleInvoke = Function('c', 'dt', code);
    return createInvokeImpl(singleInvoke, fastPath, ensureFlag);
  }
  function createInvokeImpl(singleInvoke, fastPath, ensureFlag) {
    return function (iterator, dt) {
      try {
        fastPath(iterator, dt);
      } catch (e) {
        // slow path
        legacyCC._throw(e);
        var _array2 = iterator.array;
        if (ensureFlag) {
          _array2[iterator.i]._objFlags |= ensureFlag;
        }
        ++iterator.i; // invoke next callback
        for (; iterator.i < _array2.length; ++iterator.i) {
          try {
            singleInvoke(_array2[iterator.i], dt);
          } catch (e) {
            legacyCC._throw(e);
            if (ensureFlag) {
              _array2[iterator.i]._objFlags |= ensureFlag;
            }
          }
        }
      }
    };
  }
  _export({
    createInvokeImplJit: createInvokeImplJit,
    createInvokeImpl: createInvokeImpl
  });
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
      SUPPORT_JIT = _virtualInternal253AconstantsJs.SUPPORT_JIT;
      DEV = _virtualInternal253AconstantsJs.DEV;
      TEST = _virtualInternal253AconstantsJs.TEST;
    }, function (_coreDataObjectJs) {
      CCObject = _coreDataObjectJs.CCObject;
    }, function (_coreIndexJs) {
      js = _coreIndexJs.js;
    }, function (_coreUtilsMiscJs) {
      tryCatchFunctor_EDITOR = _coreUtilsMiscJs.tryCatchFunctor_EDITOR;
    }, function (_coreGlobalExportsJs) {
      legacyCC = _coreGlobalExportsJs.legacyCC;
    }, function (_corePlatformDebugJs) {
      error = _corePlatformDebugJs.error;
      assert = _corePlatformDebugJs.assert;
    }],
    execute: function () {
      fastRemoveAt = js.array.fastRemoveAt;
      IsStartCalled = CCObject.Flags.IsStartCalled;
      IsOnEnableCalled = CCObject.Flags.IsOnEnableCalled;
      IsEditorOnEnableCalled = CCObject.Flags.IsEditorOnEnableCalled;
      callerFunctor = EDITOR && tryCatchFunctor_EDITOR;
      callOnEnableInTryCatch = EDITOR && callerFunctor('onEnable');
      callOnDisableInTryCatch = EDITOR && callerFunctor('onDisable');
      // This class contains some queues used to invoke life-cycle methods by script execution order
      _export("LifeCycleInvoker", LifeCycleInvoker = /*#__PURE__*/function () {
        function LifeCycleInvoker(invokeFunc) {
          // components which priority === 0 (default)
          this._zero = void 0;
          // components which priority < 0
          this._neg = void 0;
          // components which priority > 0
          this._pos = void 0;
          this._invoke = void 0;
          var Iterator = js.array.MutableForwardIterator;
          this._zero = new Iterator([]);
          this._neg = new Iterator([]);
          this._pos = new Iterator([]);
          if (TEST) {
            assert(typeof invokeFunc === 'function', 'invokeFunc must be type function');
          }
          this._invoke = invokeFunc;
        }
        _createClass(LifeCycleInvoker, [{
          key: "zero",
          get:
          /**
           * @engineInternal `_zero` is a protected property, we provide this public property for engine internal usage.
           */
          function get() {
            return this._zero;
          }
          /**
           * @engineInternal `_neg` is a protected property, we provide this public property for engine internal usage.
           */
        }, {
          key: "neg",
          get: function get() {
            return this._neg;
          }
          /**
           * @engineInternal `_pos` is a protected property, we provide this public property for engine internal usage.
           */
        }, {
          key: "pos",
          get: function get() {
            return this._pos;
          }
        }]);
        return LifeCycleInvoker;
      }());
      LifeCycleInvoker.stableRemoveInactive = stableRemoveInactive;
      _export("OneOffInvoker", OneOffInvoker = /*#__PURE__*/function (_LifeCycleInvoker) {
        _inheritsLoose(OneOffInvoker, _LifeCycleInvoker);
        function OneOffInvoker() {
          return _LifeCycleInvoker.apply(this, arguments) || this;
        }
        var _proto = OneOffInvoker.prototype;
        _proto.add = function add(comp) {
          var order = comp.constructor._executionOrder;
          (order === 0 ? this._zero : order < 0 ? this._neg : this._pos).array.push(comp);
        };
        _proto.remove = function remove(comp) {
          var order = comp.constructor._executionOrder;
          (order === 0 ? this._zero : order < 0 ? this._neg : this._pos).fastRemove(comp);
        };
        _proto.cancelInactive = function cancelInactive(flagToClear) {
          stableRemoveInactive(this._zero, flagToClear);
          stableRemoveInactive(this._neg, flagToClear);
          stableRemoveInactive(this._pos, flagToClear);
        };
        _proto.invoke = function invoke() {
          var compsNeg = this._neg;
          if (compsNeg.array.length > 0) {
            compsNeg.array.sort(compareOrder);
            this._invoke(compsNeg);
            compsNeg.array.length = 0;
          }
          this._invoke(this._zero);
          this._zero.array.length = 0;
          var compsPos = this._pos;
          if (compsPos.array.length > 0) {
            compsPos.array.sort(compareOrder);
            this._invoke(compsPos);
            compsPos.array.length = 0;
          }
        };
        return OneOffInvoker;
      }(LifeCycleInvoker)); // for update: sort every time new component registered, invoke many times
      ReusableInvoker = /*#__PURE__*/function (_LifeCycleInvoker2) {
        _inheritsLoose(ReusableInvoker, _LifeCycleInvoker2);
        function ReusableInvoker() {
          return _LifeCycleInvoker2.apply(this, arguments) || this;
        }
        var _proto2 = ReusableInvoker.prototype;
        _proto2.add = function add(comp) {
          var order = comp.constructor._executionOrder;
          if (order === 0) {
            this._zero.array.push(comp);
          } else {
            var _array = order < 0 ? this._neg.array : this._pos.array;
            var i = sortedIndex(_array, comp);
            if (i < 0) {
              _array.splice(~i, 0, comp);
            } else if (DEV) {
              error('component already added');
            }
          }
        };
        _proto2.remove = function remove(comp) {
          var order = comp.constructor._executionOrder;
          if (order === 0) {
            this._zero.fastRemove(comp);
          } else {
            var _iterator = order < 0 ? this._neg : this._pos;
            var i = sortedIndex(_iterator.array, comp);
            if (i >= 0) {
              _iterator.removeAt(i);
            }
          }
        };
        _proto2.invoke = function invoke(dt) {
          if (this._neg.array.length > 0) {
            this._invoke(this._neg, dt);
          }
          this._invoke(this._zero, dt);
          if (this._pos.array.length > 0) {
            this._invoke(this._pos, dt);
          }
        };
        return ReusableInvoker;
      }(LifeCycleInvoker);
      invokeStart = SUPPORT_JIT ? createInvokeImplJit("c.start();c._objFlags|=" + IsStartCalled, false, IsStartCalled) : createInvokeImpl(function (c) {
        c.start();
        c._objFlags |= IsStartCalled;
      }, function (iterator) {
        var array = iterator.array;
        for (iterator.i = 0; iterator.i < array.length; ++iterator.i) {
          var comp = array[iterator.i];
          comp.start();
          comp._objFlags |= IsStartCalled;
        }
      }, IsStartCalled);
      invokeUpdate = SUPPORT_JIT ? createInvokeImplJit('c.update(dt)', true) : createInvokeImpl(function (c, dt) {
        c.update(dt);
      }, function (iterator, dt) {
        var array = iterator.array;
        for (iterator.i = 0; iterator.i < array.length; ++iterator.i) {
          array[iterator.i].update(dt);
        }
      });
      invokeLateUpdate = SUPPORT_JIT ? createInvokeImplJit('c.lateUpdate(dt)', true) : createInvokeImpl(function (c, dt) {
        c.lateUpdate(dt);
      }, function (iterator, dt) {
        var array = iterator.array;
        for (iterator.i = 0; iterator.i < array.length; ++iterator.i) {
          array[iterator.i].lateUpdate(dt);
        }
      });
      _export("invokeOnEnable", invokeOnEnable = EDITOR ? function (iterator) {
        var compScheduler = legacyCC.director._compScheduler;
        var array = iterator.array;
        for (iterator.i = 0; iterator.i < array.length; ++iterator.i) {
          var comp = array[iterator.i];
          if (comp._enabled) {
            callOnEnableInTryCatch(comp);
            var deactivatedDuringOnEnable = !comp.node._activeInHierarchy;
            if (!deactivatedDuringOnEnable) {
              compScheduler._onEnabled(comp);
            }
          }
        }
      } : function (iterator) {
        var compScheduler = legacyCC.director._compScheduler;
        var array = iterator.array;
        for (iterator.i = 0; iterator.i < array.length; ++iterator.i) {
          var comp = array[iterator.i];
          if (comp._enabled) {
            comp.onEnable();
            var deactivatedDuringOnEnable = !comp.node._activeInHierarchy;
            if (!deactivatedDuringOnEnable) {
              compScheduler._onEnabled(comp);
            }
          }
        }
      });
      /**
       * @en The Manager for Component's life-cycle methods.
       * It collaborates with [[NodeActivator]] to schedule and invoke life cycle methods for components
       * @zh 组件生命周期函数的调度器。
       * 它和 [[NodeActivator]] 一起调度并执行组件的生命周期函数。
       */
      _export("ComponentScheduler", ComponentScheduler = /*#__PURE__*/function () {
        function ComponentScheduler() {
          /**
           * @en The invoker of `start` callback
           * @zh `start` 回调的调度器
           */
          this.startInvoker = void 0;
          /**
           * @en The invoker of `update` callback
           * @zh `update` 回调的调度器
           */
          this.updateInvoker = void 0;
          /**
           * @en The invoker of `lateUpdate` callback
           * @zh `lateUpdate` 回调的调度器
           */
          this.lateUpdateInvoker = void 0;
          // components deferred to schedule
          this._deferredComps = [];
          this._updating = void 0;
          this.unscheduleAll();
        }

        /**
         * @en Cancel all future callbacks, including `start`, `update` and `lateUpdate`
         * @zh 取消所有未来的函数调度，包括 `start`，`update` 和 `lateUpdate`
         */
        var _proto3 = ComponentScheduler.prototype;
        _proto3.unscheduleAll = function unscheduleAll() {
          // invokers
          this.startInvoker = new OneOffInvoker(invokeStart);
          this.updateInvoker = new ReusableInvoker(invokeUpdate);
          this.lateUpdateInvoker = new ReusableInvoker(invokeLateUpdate);

          // during a loop
          this._updating = false;
        }

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto3._onEnabled = function _onEnabled(comp) {
          legacyCC.director.getScheduler().resumeTarget(comp);
          comp._objFlags |= IsOnEnableCalled;

          // schedule
          if (this._updating) {
            this._deferredComps.push(comp);
          } else {
            this._scheduleImmediate(comp);
          }
        }

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto3._onDisabled = function _onDisabled(comp) {
          legacyCC.director.getScheduler().pauseTarget(comp);
          comp._objFlags &= ~IsOnEnableCalled;

          // cancel schedule task
          var index = this._deferredComps.indexOf(comp);
          if (index >= 0) {
            fastRemoveAt(this._deferredComps, index);
            return;
          }

          // unschedule
          if (comp.internalStart && !(comp._objFlags & IsStartCalled)) {
            this.startInvoker.remove(comp);
          }
          if (comp.internalUpdate) {
            this.updateInvoker.remove(comp);
          }
          if (comp.internalLateUpdate) {
            this.lateUpdateInvoker.remove(comp);
          }
        }

        /**
         * @en Enable a component
         * @zh 启用一个组件
         * @param comp The component to be enabled
         * @param invoker The invoker which is responsible to schedule the `onEnable` call
         */;
        _proto3.enableComp = function enableComp(comp, invoker) {
          if (!(comp._objFlags & IsOnEnableCalled)) {
            if (comp.internalOnEnable) {
              if (invoker) {
                invoker.add(comp);
                return;
              } else {
                comp.internalOnEnable();
                var deactivatedDuringOnEnable = !comp.node.activeInHierarchy;
                if (deactivatedDuringOnEnable) {
                  return;
                }
              }
            }
            this._onEnabled(comp);
          }
        }

        /**
         * @en Disable a component
         * @zh 禁用一个组件
         * @param comp The component to be disabled
         */;
        _proto3.disableComp = function disableComp(comp) {
          if (comp._objFlags & IsOnEnableCalled) {
            if (comp.internalOnDisable) {
              comp.internalOnDisable();
            }
            this._onDisabled(comp);
          }
        }

        /**
         * @en Process start phase for registered components
         * @zh 为当前注册的组件执行 start 阶段任务
         */;
        _proto3.startPhase = function startPhase() {
          // Start of this frame
          this._updating = true;

          // call start
          this.startInvoker.invoke();
          // Start components of new activated nodes during start
          this._startForNewComps();
          // if (PREVIEW) {
          //     try {
          //         this.startInvoker.invoke();
          //     }
          //     catch (e) {
          //         // prevent start from getting into infinite loop
          //         this.startInvoker._neg.array.length = 0;
          //         this.startInvoker._zero.array.length = 0;
          //         this.startInvoker._pos.array.length = 0;
          //         throw e;
          //     }
          // }
          // else {
          //     this.startInvoker.invoke();
          // }
        }

        /**
         * @en Process update phase for registered components
         * @zh 为当前注册的组件执行 update 阶段任务
         * @param dt @en Time passed after the last frame in seconds @zh 距离上一帧的时间，以秒计算
         */;
        _proto3.updatePhase = function updatePhase(dt) {
          this.updateInvoker.invoke(dt);
        }

        /**
         * @en Process late update phase for registered components
         * @zh 为当前注册的组件执行 late update 阶段任务
         * @param dt @en Time passed after the last frame in seconds @zh 距离上一帧的时间，以秒计算
         */;
        _proto3.lateUpdatePhase = function lateUpdatePhase(dt) {
          this.lateUpdateInvoker.invoke(dt);

          // End of this frame
          this._updating = false;

          // Start components of new activated nodes during update and lateUpdate
          // They will be running in the next frame
          this._startForNewComps();
        }

        // Call new registered start schedule immediately since last time start phase calling in this frame
        // See cocos-creator/2d-tasks/issues/256
        ;
        _proto3._startForNewComps = function _startForNewComps() {
          if (this._deferredComps.length > 0) {
            this._deferredSchedule();
            this.startInvoker.invoke();
          }
        };
        _proto3._scheduleImmediate = function _scheduleImmediate(comp) {
          if (typeof comp.internalStart === 'function' && !(comp._objFlags & IsStartCalled)) {
            this.startInvoker.add(comp);
          }
          if (typeof comp.internalUpdate === 'function') {
            this.updateInvoker.add(comp);
          }
          if (typeof comp.internalLateUpdate === 'function') {
            this.lateUpdateInvoker.add(comp);
          }
        };
        _proto3._deferredSchedule = function _deferredSchedule() {
          var comps = this._deferredComps;
          for (var i = 0, len = comps.length; i < len; i++) {
            this._scheduleImmediate(comps[i]);
          }
          comps.length = 0;
        };
        return ComponentScheduler;
      }());
      if (EDITOR) {
        ComponentScheduler.prototype.enableComp = function (comp, invoker) {
          // NOTE: _executeInEditMode is dynamically injected on Editor environment
          if (legacyCC.GAME_VIEW || comp.constructor._executeInEditMode) {
            if (!(comp._objFlags & IsOnEnableCalled)) {
              if (comp.internalOnEnable) {
                if (invoker) {
                  invoker.add(comp);
                  enableInEditor(comp);
                  return;
                } else {
                  callOnEnableInTryCatch(comp);
                  var deactivatedDuringOnEnable = !comp.node.activeInHierarchy;
                  if (deactivatedDuringOnEnable) {
                    return;
                  }
                }
              }
              this._onEnabled(comp);
            }
          }
          enableInEditor(comp);
        };
        ComponentScheduler.prototype.disableComp = function (comp) {
          // NOTE: _executeInEditMode is dynamically injected on Editor environment
          if (legacyCC.GAME_VIEW || comp.constructor._executeInEditMode) {
            if (comp._objFlags & IsOnEnableCalled) {
              if (comp.internalOnDisable) {
                callOnDisableInTryCatch(comp);
              }
              this._onDisabled(comp);
            }
          }
          if (comp._objFlags & IsEditorOnEnableCalled) {
            legacyCC.engine.emit('component-disabled', comp.uuid);
            comp._objFlags &= ~IsEditorOnEnableCalled;
          }
        };
      }
    }
  };
});