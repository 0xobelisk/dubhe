System.register("q-bundled:///fs/cocos/physics/bullet/constraints/bullet-hinge-constraint.js", ["./bullet-constraint.js", "../../../core/index.js", "../../framework/index.js", "../bullet-cache.js", "../instantiated.js", "../bullet-utils.js", "../../../core/math/index.js"], function (_export, _context) {
  "use strict";

  var BulletConstraint, Quat, Vec3, PhysicsSystem, BulletCache, CC_QUAT_0, CC_QUAT_1, CC_V3_0, bt, cocos2BulletQuat, cocos2BulletVec3, force2Impulse, toRadian, BulletHingeConstraint;
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
                                                                                                                                                                                                                                                                                                                                                                                            */ /* eslint-disable new-cap */
  _export("BulletHingeConstraint", void 0);
  return {
    setters: [function (_bulletConstraintJs) {
      BulletConstraint = _bulletConstraintJs.BulletConstraint;
    }, function (_coreIndexJs) {
      Quat = _coreIndexJs.Quat;
      Vec3 = _coreIndexJs.Vec3;
    }, function (_frameworkIndexJs) {
      PhysicsSystem = _frameworkIndexJs.PhysicsSystem;
    }, function (_bulletCacheJs) {
      BulletCache = _bulletCacheJs.BulletCache;
      CC_QUAT_0 = _bulletCacheJs.CC_QUAT_0;
      CC_QUAT_1 = _bulletCacheJs.CC_QUAT_1;
      CC_V3_0 = _bulletCacheJs.CC_V3_0;
    }, function (_instantiatedJs) {
      bt = _instantiatedJs.bt;
    }, function (_bulletUtilsJs) {
      cocos2BulletQuat = _bulletUtilsJs.cocos2BulletQuat;
      cocos2BulletVec3 = _bulletUtilsJs.cocos2BulletVec3;
      force2Impulse = _bulletUtilsJs.force2Impulse;
    }, function (_coreMathIndexJs) {
      toRadian = _coreMathIndexJs.toRadian;
    }],
    execute: function () {
      _export("BulletHingeConstraint", BulletHingeConstraint = class BulletHingeConstraint extends BulletConstraint {
        setPivotA(v) {
          this.updateFrames();
        }
        setPivotB(v) {
          this.updateFrames();
        }
        setAxis(v) {
          this.updateFrames();
        }
        setLimitEnabled(v) {
          if (this.constraint.limitEnabled) {
            bt.HingeConstraint_setLimit(this._impl, toRadian(this.constraint.lowerLimit), toRadian(this.constraint.upperLimit), 0.9, 0.3, 1.0);
          } else {
            bt.HingeConstraint_setLimit(this._impl, 1, 0, 0.9, 0.3, 1.0);
          }
        }
        setLowerLimit(min) {
          if (this.constraint.limitEnabled) {
            bt.HingeConstraint_setLimit(this._impl, toRadian(this.constraint.lowerLimit), toRadian(this.constraint.upperLimit), 0.9, 0.3, 1.0);
          }
        }
        setUpperLimit(max) {
          if (this.constraint.limitEnabled) {
            bt.HingeConstraint_setLimit(this._impl, toRadian(this.constraint.lowerLimit), toRadian(this.constraint.upperLimit), 0.9, 0.3, 1.0);
          }
        }
        setMotorEnabled(v) {
          bt.HingeConstraint_enableMotor(this._impl, v);
          const velocity = -this.constraint.motorVelocity / 60.0;
          const impulse = force2Impulse(this.constraint.motorForceLimit, PhysicsSystem.instance.fixedTimeStep);
          bt.HingeConstraint_setMotorVelocity(this._impl, velocity);
          bt.HingeConstraint_setMaxMotorImpulse(this._impl, impulse);
        }
        setMotorVelocity(v) {
          if (this.constraint.motorEnabled) {
            const velocity = -v / 60.0;
            bt.HingeConstraint_setMotorVelocity(this._impl, velocity);
          }
        }
        setMotorForceLimit(v) {
          if (this.constraint.motorEnabled) {
            const impulse = force2Impulse(v, PhysicsSystem.instance.fixedTimeStep);
            bt.HingeConstraint_setMaxMotorImpulse(this._impl, impulse);
          }
        }
        get constraint() {
          return this._com;
        }
        onComponentSet() {
          const cb = this.constraint.connectedBody;
          const bodyA = this._rigidBody.body.impl;
          const bodyB = cb ? cb.body.impl : bt.TypedConstraint_getFixedBody();
          const trans0 = BulletCache.instance.BT_TRANSFORM_0;
          const trans1 = BulletCache.instance.BT_TRANSFORM_1;
          this._impl = bt.HingeConstraint_new(bodyA, bodyB, trans0, trans1);
          this.setLimitEnabled(this.constraint.limitEnabled);
          this.setLowerLimit(this.constraint.lowerLimit);
          this.setUpperLimit(this.constraint.upperLimit);
          this.setMotorEnabled(this.constraint.motorEnabled);
          this.setMotorVelocity(this.constraint.motorVelocity);
          this.setMotorForceLimit(this.constraint.motorForceLimit);
          this.updateFrames();
          this.updateDebugDrawSize();
        }
        updateFrames() {
          const cs = this.constraint;
          const node = cs.node;
          const v3_0 = CC_V3_0;
          const rot_0 = CC_QUAT_0;
          const rot_1 = CC_QUAT_1;
          const trans0 = BulletCache.instance.BT_TRANSFORM_0;

          // offset of axis in local frame of bodyA
          Vec3.multiply(v3_0, node.worldScale, cs.pivotA);
          cocos2BulletVec3(bt.Transform_getOrigin(trans0), v3_0);
          // rotation of axis in local frame of bodyA
          const quat = BulletCache.instance.BT_QUAT_0;
          Vec3.normalize(v3_0, cs.axis);
          Quat.rotationTo(rot_1, Vec3.UNIT_Z, v3_0);
          cocos2BulletQuat(quat, rot_1);
          bt.Transform_setRotation(trans0, quat);
          const trans1 = BulletCache.instance.BT_TRANSFORM_1;
          const cb = this.constraint.connectedBody;
          if (cb) {
            // offset of axis in local frame of bodyB
            Vec3.multiply(v3_0, cb.node.worldScale, cs.pivotB);
            // rotation of axis in local frame of bodyB
            Quat.multiply(rot_1, node.worldRotation, rot_1);
            Quat.invert(rot_0, cb.node.worldRotation);
            Quat.multiply(rot_1, rot_0, rot_1);
          } else {
            // offset of axis in local frame of bodyB
            Vec3.multiply(v3_0, node.worldScale, cs.pivotA);
            Vec3.transformQuat(v3_0, v3_0, node.worldRotation);
            Vec3.add(v3_0, v3_0, node.worldPosition);
            // rotation of axis in local frame of bodyB
            Quat.multiply(rot_1, node.worldRotation, rot_1);
          }
          cocos2BulletVec3(bt.Transform_getOrigin(trans1), v3_0);
          cocos2BulletQuat(quat, rot_1);
          bt.Transform_setRotation(trans1, quat);
          bt.HingeConstraint_setFrames(this._impl, trans0, trans1);
        }
        updateScale0() {
          this.updateFrames();
        }
        updateScale1() {
          this.updateFrames();
        }
      });
    }
  };
});