System.register("q-bundled:///fs/cocos/physics-2d/box2d-wasm/joints/joint-2d.js", ["../instantiated.js", "../../framework/index.js", "../../../core/index.js"], function (_export, _context) {
  "use strict";

  var B2ObjectType, addImplPtrReference, addImplPtrReferenceWASM, getImplPtr, removeImplPtrReference, removeImplPtrReferenceWASM, PhysicsSystem2D, RigidBody2D, warn, B2Joint;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                            
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
  return {
    setters: [function (_instantiatedJs) {
      B2ObjectType = _instantiatedJs.B2ObjectType;
      addImplPtrReference = _instantiatedJs.addImplPtrReference;
      addImplPtrReferenceWASM = _instantiatedJs.addImplPtrReferenceWASM;
      getImplPtr = _instantiatedJs.getImplPtr;
      removeImplPtrReference = _instantiatedJs.removeImplPtrReference;
      removeImplPtrReferenceWASM = _instantiatedJs.removeImplPtrReferenceWASM;
    }, function (_frameworkIndexJs) {
      PhysicsSystem2D = _frameworkIndexJs.PhysicsSystem2D;
      RigidBody2D = _frameworkIndexJs.RigidBody2D;
    }, function (_coreIndexJs) {
      warn = _coreIndexJs.warn;
    }],
    execute: function () {
      _export("B2Joint", B2Joint = /*#__PURE__*/function () {
        function B2Joint() {
          this._b2joint = null;
          this._jointComp = null;
          this._body = null;
          this._inited = false;
        }
        var _proto = B2Joint.prototype;
        _proto.initialize = function initialize(comp) {
          this._jointComp = comp;
        };
        _proto.onEnable = function onEnable() {
          PhysicsSystem2D.instance._callAfterStep(this, this._init);
        };
        _proto.onDisable = function onDisable() {
          PhysicsSystem2D.instance._callAfterStep(this, this.destroy);
        }

        // need init after body and connected body init
        ;
        _proto.start = function start() {
          PhysicsSystem2D.instance._callAfterStep(this, this._init);
        };
        _proto.apply = function apply() {
          PhysicsSystem2D.instance._callAfterStep(this, this.destroy);
          if (this.comp.enabledInHierarchy) {
            PhysicsSystem2D.instance._callAfterStep(this, this._init);
          }
        };
        _proto._init = function _init() {
          if (this._inited) return;
          var comp = this._jointComp;
          if (!comp.isValid) {
            return;
          }
          this._body = comp.getComponent(RigidBody2D);
          if (!this._body) {
            warn("Joint2D: Body is not found, can not create joint. Node Name: " + comp.node.name);
            return;
          }
          var def = this._createJointDef();
          if (!def) {
            return;
          }
          def.SetBodyA(this._body.impl.impl);
          var connectedBody = comp.connectedBody;
          //if connected body is set but not active, return
          if (connectedBody && !connectedBody.enabledInHierarchy) {
            return;
          }

          //if connected body is not set, use scene origin as connected body
          if (!connectedBody) {
            def.SetBodyB(PhysicsSystem2D.instance.physicsWorld.groundBodyImpl);
          } else {
            def.SetBodyB(connectedBody.impl.impl);
          }
          def.collideConnected = comp.collideConnected;
          this._b2joint = PhysicsSystem2D.instance.physicsWorld.impl.CreateJoint(def);
          addImplPtrReference(B2ObjectType.Joint, this, getImplPtr(this._b2joint));
          addImplPtrReferenceWASM(B2ObjectType.Joint, this._b2joint, getImplPtr(this._b2joint));
          this._inited = true;
        };
        _proto.destroy = function destroy() {
          if (!this._inited) return;
          removeImplPtrReference(B2ObjectType.Joint, getImplPtr(this._b2joint));
          removeImplPtrReferenceWASM(B2ObjectType.Joint, getImplPtr(this._b2joint));
          PhysicsSystem2D.instance.physicsWorld.impl.DestroyJoint(this._b2joint);
          this._b2joint = null;
          this._inited = false;
        };
        _proto._createJointDef = function _createJointDef() {
          return null;
        };
        _proto.isValid = function isValid() {
          return this._b2joint && this._body && this._body.impl && this._jointComp;
        };
        _createClass(B2Joint, [{
          key: "impl",
          get: function get() {
            return this._b2joint;
          }
        }, {
          key: "comp",
          get: function get() {
            return this._jointComp;
          }
        }, {
          key: "body",
          get: function get() {
            return this._body;
          }
        }]);
        return B2Joint;
      }());
    }
  };
});