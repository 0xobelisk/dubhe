System.register("q-bundled:///fs/cocos/physics-2d/box2d-wasm/joints/relative-joint.js", ["../instantiated.js", "./joint-2d.js", "../../framework/physics-types.js", "../../../core/index.js"], function (_export, _context) {
  "use strict";

  var B2, B2Joint, PHYSICS_2D_PTM_RATIO, toRadian, tempB2Vec2, B2RelativeJoint;
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); } /*
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
      B2 = _instantiatedJs.B2;
    }, function (_joint2dJs) {
      B2Joint = _joint2dJs.B2Joint;
    }, function (_frameworkPhysicsTypesJs) {
      PHYSICS_2D_PTM_RATIO = _frameworkPhysicsTypesJs.PHYSICS_2D_PTM_RATIO;
    }, function (_coreIndexJs) {
      toRadian = _coreIndexJs.toRadian;
    }],
    execute: function () {
      tempB2Vec2 = {
        x: 0,
        y: 0
      }; //new b2.Vec2();
      _export("B2RelativeJoint", B2RelativeJoint = /*#__PURE__*/function (_B2Joint) {
        _inheritsLoose(B2RelativeJoint, _B2Joint);
        function B2RelativeJoint() {
          return _B2Joint.apply(this, arguments) || this;
        }
        var _proto = B2RelativeJoint.prototype;
        _proto.setMaxForce = function setMaxForce(v) {
          if (this._b2joint) {
            this._b2joint.SetMaxForce(v);
          }
        };
        _proto.setAngularOffset = function setAngularOffset(v) {
          if (this._b2joint) {
            this._b2joint.SetAngularOffset(toRadian(v));
          }
        };
        _proto.setLinearOffset = function setLinearOffset(v) {
          if (this._b2joint) {
            tempB2Vec2.x = v.x / PHYSICS_2D_PTM_RATIO;
            tempB2Vec2.y = v.y / PHYSICS_2D_PTM_RATIO;
            this._b2joint.SetLinearOffset(tempB2Vec2);
          }
        };
        _proto.setCorrectionFactor = function setCorrectionFactor(v) {
          if (this._b2joint) {
            this._b2joint.SetCorrectionFactor(v);
          }
        };
        _proto.setMaxTorque = function setMaxTorque(v) {
          if (this._b2joint) {
            this._b2joint.SetMaxTorque(v);
          }
        };
        _proto._createJointDef = function _createJointDef() {
          var comp = this._jointComp;
          var def = new B2.MotorJointDef();
          def.linearOffset = {
            x: comp.linearOffset.x / PHYSICS_2D_PTM_RATIO,
            y: comp.linearOffset.y / PHYSICS_2D_PTM_RATIO
          };
          def.angularOffset = toRadian(comp.angularOffset);
          def.maxForce = comp.maxForce;
          def.maxTorque = comp.maxTorque;
          def.correctionFactor = comp.correctionFactor;
          return def;
        };
        return B2RelativeJoint;
      }(B2Joint));
    }
  };
});