System.register("q-bundled:///fs/cocos/physics/physx/joints/physx-configurable-joint.js", ["../../../core/index.js", "../../framework/index.js", "../physx-adapter.js", "../physx-instance.js", "./physx-joint.js"], function (_export, _context) {
  "use strict";

  var Vec3, Quat, Mat4, toRadian, EConstraintMode, EDriverMode, PX, _trans, getTempTransform, _pxtrans, PhysXInstance, PhysXJoint, CC_V3_0, CC_V3_1, CC_QUAT_0, CC_QUAT_1, CC_MAT4_0, PhysXConfigurableJoint;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); } /*
                                                                                                                                                                                                           Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                           
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
                                                                                                                                                                                                            */ /* eslint-disable @typescript-eslint/no-unsafe-return */
  function getConstraintFlag(v) {
    switch (v) {
      case EConstraintMode.FREE:
        return PX.D6Motion.eFREE;
      case EConstraintMode.LIMITED:
        return PX.D6Motion.eLIMITED;
      case EConstraintMode.LOCKED:
        return PX.D6Motion.eLOCKED;
      default:
        return PX.D6Motion.eFREE;
    }
  }
  return {
    setters: [function (_coreIndexJs) {
      Vec3 = _coreIndexJs.Vec3;
      Quat = _coreIndexJs.Quat;
      Mat4 = _coreIndexJs.Mat4;
      toRadian = _coreIndexJs.toRadian;
    }, function (_frameworkIndexJs) {
      EConstraintMode = _frameworkIndexJs.EConstraintMode;
      EDriverMode = _frameworkIndexJs.EDriverMode;
    }, function (_physxAdapterJs) {
      PX = _physxAdapterJs.PX;
      _trans = _physxAdapterJs._trans;
      getTempTransform = _physxAdapterJs.getTempTransform;
      _pxtrans = _physxAdapterJs._pxtrans;
    }, function (_physxInstanceJs) {
      PhysXInstance = _physxInstanceJs.PhysXInstance;
    }, function (_physxJointJs) {
      PhysXJoint = _physxJointJs.PhysXJoint;
    }],
    execute: function () {
      CC_V3_0 = new Vec3();
      CC_V3_1 = new Vec3();
      CC_QUAT_0 = new Quat();
      CC_QUAT_1 = new Quat();
      CC_MAT4_0 = new Mat4();
      _export("PhysXConfigurableJoint", PhysXConfigurableJoint = /*#__PURE__*/function (_PhysXJoint) {
        _inheritsLoose(PhysXConfigurableJoint, _PhysXJoint);
        function PhysXConfigurableJoint() {
          return _PhysXJoint.apply(this, arguments) || this;
        }
        var _proto = PhysXConfigurableJoint.prototype;
        _proto._setLinearLimit = function _setLinearLimit() {
          var linearLimit = this.constraint.linearLimitSettings;
          var limitPairX = PhysXConfigurableJoint._linearLimitX;
          var limitPairY = PhysXConfigurableJoint._linearLimitY;
          var limitPairZ = PhysXConfigurableJoint._linearLimitZ;
          var setLimitPair = function setLimitPair(limitPair) {
            if (linearLimit.enableSoftConstraint) {
              limitPair.stiffness = linearLimit.stiffness;
              limitPair.damping = linearLimit.damping;
            } else {
              limitPair.stiffness = 0;
              limitPair.damping = 0;
            }
            limitPair.bounceThreshold = 0.1;
            limitPair.contactDistance = 0.1;
            limitPair.restitution = linearLimit.restitution;
          };
          setLimitPair(limitPairX);
          setLimitPair(limitPairY);
          setLimitPair(limitPairZ);
          var lower = linearLimit.lower;
          var upper = linearLimit.upper;
          if (linearLimit.xMotion === EConstraintMode.LIMITED) {
            limitPairX.lower = lower.x;
            limitPairX.upper = upper.x;
            this._impl.setLinearLimit(PX.D6Axis.eX, limitPairX);
          }
          if (linearLimit.yMotion === EConstraintMode.LIMITED) {
            limitPairY.lower = lower.y;
            limitPairY.upper = upper.y;
            this._impl.setLinearLimit(PX.D6Axis.eY, limitPairY);
          }
          if (linearLimit.zMotion === EConstraintMode.LIMITED) {
            limitPairZ.lower = lower.z;
            limitPairZ.upper = upper.z;
            this._impl.setLinearLimit(PX.D6Axis.eZ, limitPairZ);
          }
        };
        _proto._setSwingLimit = function _setSwingLimit() {
          var angularLimit = this.constraint.angularLimitSettings;
          var limitCone = PhysXConfigurableJoint._swingLimit;
          if (angularLimit.enableSoftConstraintSwing) {
            limitCone.stiffness = angularLimit.swingStiffness;
            limitCone.damping = angularLimit.swingDamping;
          } else {
            limitCone.stiffness = 0;
            limitCone.springDamping = 0;
          }
          limitCone.yAngle = Math.PI;
          limitCone.zAngle = Math.PI;
          limitCone.contactDistance = 0.1;
          limitCone.bounceThreshold = 0.1;
          limitCone.restitution = angularLimit.swingRestitution;
          if (angularLimit.swingMotion1 === EConstraintMode.LIMITED) {
            limitCone.yAngle = toRadian(Math.max(angularLimit.swingExtent1, 1e-9)) * 0.5;
            this._impl.setSwingLimit(limitCone);
          }
          if (angularLimit.swingMotion2 === EConstraintMode.LIMITED) {
            limitCone.zAngle = toRadian(Math.max(angularLimit.swingExtent2, 1e-9)) * 0.5;
            this._impl.setSwingLimit(limitCone);
          }
        };
        _proto._setTwistLimit = function _setTwistLimit() {
          var angularLimit = this.constraint.angularLimitSettings;
          var limitPair = PhysXConfigurableJoint._twistLimit;
          if (angularLimit.enableSoftConstraintTwist) {
            limitPair.stiffness = angularLimit.twistStiffness;
            limitPair.damping = angularLimit.twistDamping;
          } else {
            limitPair.stiffness = 0;
            limitPair.damping = 0;
          }
          limitPair.contactDistance = 0.1;
          limitPair.bounceThreshold = 0.1;
          limitPair.restitution = angularLimit.twistRestitution;
          if (angularLimit.twistMotion === EConstraintMode.LIMITED) {
            limitPair.lower = toRadian(Math.max(angularLimit.twistExtent, 1e-9)) * -0.5;
            limitPair.upper = toRadian(Math.max(angularLimit.twistExtent, 1e-9)) * 0.5;
            this._impl.setTwistLimit(limitPair);
          }
        };
        _proto._updateDrive = function _updateDrive(idx) {
          var _this = this;
          var axis = PX.D6Axis.eX;
          var driveMode = EDriverMode.DISABLED;
          var com = this.constraint;
          var ld = com.linearDriverSettings;
          var ad = com.angularDriverSettings;
          var getSwingDriveMode = function getSwingDriveMode() {
            var ad = _this.constraint.angularDriverSettings;
            if (ad.swingDrive1 === EDriverMode.INDUCTION || ad.swingDrive2 === EDriverMode.INDUCTION) {
              return EDriverMode.INDUCTION;
            } else if (ad.swingDrive1 === EDriverMode.SERVO || ad.swingDrive2 === EDriverMode.SERVO) {
              return EDriverMode.SERVO;
            } else {
              return EDriverMode.DISABLED;
            }
          };
          switch (idx) {
            case 0:
              axis = PX.D6Drive.eX;
              driveMode = ld.xDrive;
              break;
            case 1:
              axis = PX.D6Drive.eY;
              driveMode = ld.yDrive;
              break;
            case 2:
              axis = PX.D6Drive.eZ;
              driveMode = ld.zDrive;
              break;
            case 3:
              axis = PX.D6Drive.eTWIST;
              driveMode = ad.twistDrive;
              break;
            case 4:
              axis = PX.D6Drive.eSWING;
              driveMode = getSwingDriveMode();
              break;
            case 5:
              axis = PX.D6Drive.eSWING;
              driveMode = getSwingDriveMode();
              break;
            default:
              break;
          }
          var drive = PhysXConfigurableJoint._drive[idx];
          if (idx >= 0 && idx < 3) {
            drive.forceLimit = com.linearDriverSettings.strength;
          } else if (idx < 6) {
            drive.forceLimit = com.angularDriverSettings.strength;
          }
          if (driveMode === EDriverMode.DISABLED) {
            drive.forceLimit = 0;
          } else if (driveMode === EDriverMode.SERVO) {
            drive.damping = 0;
            drive.stiffness = 1000;
          } else if (driveMode === EDriverMode.INDUCTION) {
            drive.damping = 1000;
            drive.stiffness = 0;
          }
          this._impl.setDrive(axis, drive);
        };
        _proto._updateDriveTarget = function _updateDriveTarget() {
          var linearTarget = this.constraint.linearDriverSettings.targetPosition;
          var angularTarget = this.constraint.angularDriverSettings.targetOrientation;
          var quat = Quat.fromEuler(CC_QUAT_0, angularTarget.x, angularTarget.y, angularTarget.z);
          getTempTransform(linearTarget, quat);
          this._impl.setDrivePosition(_pxtrans, true);
        };
        _proto._updateDriveVelocity = function _updateDriveVelocity() {
          var linearVelocity = this.constraint.linearDriverSettings.targetVelocity;
          var angularVelocity = this.constraint.angularDriverSettings.targetVelocity;
          var lv = Vec3.set(CC_V3_0, linearVelocity.x, linearVelocity.y, linearVelocity.z);
          var av = Vec3.set(CC_V3_1, toRadian(-angularVelocity.x), toRadian(-angularVelocity.y), toRadian(-angularVelocity.z));
          this._impl.setDriveVelocity(lv, av, true);
        };
        _proto._updateDriveSettings = function _updateDriveSettings() {
          this._updateDrive(0);
          this._updateDrive(1);
          this._updateDrive(2);
          this._updateDrive(3);
          this._updateDrive(4);
          this._updateDrive(5);
          this._updateDriveTarget();
          this._updateDriveVelocity();
        };
        _proto.setConstraintMode = function setConstraintMode(idx, v) {
          var axis = PX.D6Axis.eX;
          switch (idx) {
            case 0:
              axis = PX.D6Axis.eX;
              break;
            case 1:
              axis = PX.D6Axis.eY;
              break;
            case 2:
              axis = PX.D6Axis.eZ;
              break;
            case 3:
              axis = PX.D6Axis.eTWIST;
              break;
            case 4:
              axis = PX.D6Axis.eSWING1;
              break;
            case 5:
              axis = PX.D6Axis.eSWING2;
              break;
            default:
              break;
          }
          var mode = getConstraintFlag(v);
          this._impl.setMotion(axis, mode);
        };
        _proto.setLinearLimit = function setLinearLimit(idx, lower, upper) {
          this._setLinearLimit();
        };
        _proto.setAngularExtent = function setAngularExtent(twist, swing1, swing2) {
          this._setSwingLimit();
          this._setTwistLimit();
        };
        _proto.setLinearRestitution = function setLinearRestitution(v) {
          this._setLinearLimit();
        };
        _proto.setSwingRestitution = function setSwingRestitution(v) {
          this._setSwingLimit();
        };
        _proto.setTwistRestitution = function setTwistRestitution(v) {
          this._setTwistLimit();
        };
        _proto.setLinearSoftConstraint = function setLinearSoftConstraint(v) {
          this._setLinearLimit();
        };
        _proto.setLinearStiffness = function setLinearStiffness(v) {
          this._setLinearLimit();
        };
        _proto.setLinearDamping = function setLinearDamping(v) {
          this._setLinearLimit();
        };
        _proto.setSwingSoftConstraint = function setSwingSoftConstraint(v) {
          this._setSwingLimit();
        };
        _proto.setSwingStiffness = function setSwingStiffness(v) {
          this._setSwingLimit();
        };
        _proto.setSwingDamping = function setSwingDamping(v) {
          this._setSwingLimit();
        };
        _proto.setTwistSoftConstraint = function setTwistSoftConstraint(v) {
          this._setTwistLimit();
        };
        _proto.setTwistStiffness = function setTwistStiffness(v) {
          this._setTwistLimit();
        };
        _proto.setTwistDamping = function setTwistDamping(v) {
          this._setTwistLimit();
        };
        _proto.setDriverMode = function setDriverMode(idx, v) {
          this._updateDrive(idx);
        };
        _proto.setLinearMotorTarget = function setLinearMotorTarget(v) {
          this._updateDriveTarget();
        };
        _proto.setLinearMotorVelocity = function setLinearMotorVelocity(v) {
          this._updateDriveVelocity();
        };
        _proto.setLinearMotorForceLimit = function setLinearMotorForceLimit(v) {
          this._updateDrive(0);
          this._updateDrive(1);
          this._updateDrive(2);
        };
        _proto.setAngularMotorTarget = function setAngularMotorTarget(v) {
          this._updateDriveTarget();
        };
        _proto.setAngularMotorVelocity = function setAngularMotorVelocity(v) {
          this._updateDriveVelocity();
        };
        _proto.setAngularMotorForceLimit = function setAngularMotorForceLimit(v) {
          this._updateDrive(3);
          this._updateDrive(4);
          this._updateDrive(5);
        };
        _proto.setPivotA = function setPivotA(v) {
          this.updateFrames();
        };
        _proto.setPivotB = function setPivotB(v) {
          this.updateFrames();
        };
        _proto.setAutoPivotB = function setAutoPivotB(v) {
          this.updateFrames();
        };
        _proto.setAxis = function setAxis(v) {
          this.updateFrames();
        };
        _proto.setSecondaryAxis = function setSecondaryAxis(v) {
          this.updateFrames();
        };
        _proto.setBreakForce = function setBreakForce(v) {
          var force = this.constraint.breakForce;
          var torque = this.constraint.breakTorque;
          this._impl.setBreakForce(force, torque);
        };
        _proto.setBreakTorque = function setBreakTorque(v) {
          var force = this.constraint.breakForce;
          var torque = this.constraint.breakTorque;
          this._impl.setBreakForce(force, torque);
        };
        _proto.onComponentSet = function onComponentSet() {
          PhysXConfigurableJoint._initCache();
          var cs = this.constraint;
          this._impl = PX.createD6Joint(PhysXJoint.tempActor, _pxtrans, null, _pxtrans);
          this.setBreakForce(cs.breakForce);
          this.setBreakTorque(cs.breakTorque);
          var ll = cs.linearLimitSettings;
          var al = cs.angularLimitSettings;
          this.setConstraintMode(0, ll.xMotion);
          this.setConstraintMode(1, ll.yMotion);
          this.setConstraintMode(2, ll.zMotion);
          this.setConstraintMode(3, al.twistMotion);
          this.setConstraintMode(4, al.swingMotion1);
          this.setConstraintMode(5, al.swingMotion2);
          this._setLinearLimit();
          this._setSwingLimit();
          this._setTwistLimit();
          this._updateDriveSettings();
          this.updateFrames();
          this.enableDebugVisualization(true);
        };
        _proto.updateFrames = function updateFrames() {
          var cs = this.constraint;
          var node = cs.node;
          var pos = _trans.translation;
          var rot = _trans.rotation;
          var cb = cs.connectedBody;
          var axisX = cs.axis;
          var axisY = cs.secondaryAxis;
          var axisZ = Vec3.cross(CC_V3_0, axisX, axisY);
          var _rot = CC_QUAT_0;
          var mat = Mat4.set(CC_MAT4_0, axisX.x, axisX.y, axisX.z, 0, axisY.x, axisY.y, axisY.z, 0, axisZ.x, axisZ.y, axisZ.z, 0, 0, 0, 0, 1);
          mat.getRotation(_rot);
          Vec3.multiply(pos, cs.node.worldScale, cs.pivotA);
          this._impl.setLocalPose(0, getTempTransform(pos, _rot));
          if (cb) {
            Quat.multiply(_rot, node.worldRotation, _rot);
            Quat.invert(rot, cb.node.worldRotation);
            Quat.multiply(_rot, rot, _rot);
            if (cs.autoPivotB) {
              Vec3.multiply(pos, cs.node.worldScale, cs.pivotA);
              Vec3.transformQuat(pos, pos, node.worldRotation);
              Vec3.add(pos, pos, node.worldPosition);
              Vec3.subtract(pos, pos, cb.node.worldPosition);
              Vec3.transformQuat(pos, pos, rot);
            } else {
              Vec3.multiply(pos, cb.node.worldScale, cs.pivotB);
            }
          } else {
            Vec3.multiply(pos, node.worldScale, cs.pivotA);
            Vec3.transformQuat(pos, pos, node.worldRotation);
            Vec3.add(pos, pos, node.worldPosition);
            Quat.multiply(_rot, node.worldRotation, _rot);
          }
          this._impl.setLocalPose(1, getTempTransform(pos, _rot));
        };
        _proto.updateScale0 = function updateScale0() {
          this.updateFrames();
        };
        _proto.updateScale1 = function updateScale1() {
          this.updateFrames();
        };
        PhysXConfigurableJoint._initCache = function _initCache() {
          if (!PhysXConfigurableJoint._jointToleranceScale) {
            PhysXConfigurableJoint._jointToleranceScale = PhysXInstance.physics.getTolerancesScale();
            PhysXConfigurableJoint._linearLimitX = new PX.PxJointLinearLimitPair(PhysXConfigurableJoint._jointToleranceScale, 0, 0);
            PhysXConfigurableJoint._linearLimitY = new PX.PxJointLinearLimitPair(PhysXConfigurableJoint._jointToleranceScale, 0, 0);
            PhysXConfigurableJoint._linearLimitZ = new PX.PxJointLinearLimitPair(PhysXConfigurableJoint._jointToleranceScale, 0, 0);
            PhysXConfigurableJoint._twistLimit = new PX.PxJointAngularLimitPair(0, 0);
            PhysXConfigurableJoint._swingLimit = new PX.PxJointLimitCone(1.5, 1.5);
            PhysXConfigurableJoint._drive_x = new PX.D6JointDrive();
            PhysXConfigurableJoint._drive_y = new PX.D6JointDrive();
            PhysXConfigurableJoint._drive_z = new PX.D6JointDrive();
            PhysXConfigurableJoint._drive_twist = new PX.D6JointDrive();
            PhysXConfigurableJoint._drive_swing1 = new PX.D6JointDrive();
            PhysXConfigurableJoint._drive_swing2 = new PX.D6JointDrive();
            PhysXConfigurableJoint._drive = [PhysXConfigurableJoint._drive_x, PhysXConfigurableJoint._drive_y, PhysXConfigurableJoint._drive_z, PhysXConfigurableJoint._drive_twist, PhysXConfigurableJoint._drive_swing1, PhysXConfigurableJoint._drive_swing2];
          }
        };
        _createClass(PhysXConfigurableJoint, [{
          key: "constraint",
          get: function get() {
            return this._com;
          }
        }]);
        return PhysXConfigurableJoint;
      }(PhysXJoint));
      PhysXConfigurableJoint._jointToleranceScale = null;
      PhysXConfigurableJoint._linearLimitX = null;
      PhysXConfigurableJoint._linearLimitY = null;
      PhysXConfigurableJoint._linearLimitZ = null;
      PhysXConfigurableJoint._twistLimit = null;
      PhysXConfigurableJoint._swingLimit = null;
      PhysXConfigurableJoint._drive_x = null;
      PhysXConfigurableJoint._drive_y = null;
      PhysXConfigurableJoint._drive_z = null;
      PhysXConfigurableJoint._drive_twist = null;
      PhysXConfigurableJoint._drive_swing1 = null;
      PhysXConfigurableJoint._drive_swing2 = null;
      PhysXConfigurableJoint._drive = [];
    }
  };
});