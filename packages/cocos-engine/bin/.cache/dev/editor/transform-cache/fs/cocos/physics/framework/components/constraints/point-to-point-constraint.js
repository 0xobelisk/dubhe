System.register("q-bundled:///fs/cocos/physics/framework/components/constraints/point-to-point-constraint.js", ["../../../../core/data/decorators/index.js", "../../../../../../virtual/internal%253Aconstants.js", "./constraint.js", "../../../../core/index.js", "../../physics-enum.js"], function (_export, _context) {
  "use strict";

  var ccclass, help, menu, type, serializable, tooltip, EDITOR_NOT_IN_PREVIEW, Constraint, Vec3, EConstraintType, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _class, _class2, _initializer, _initializer2, PointToPointConstraint;
  function _applyDecoratedInitializer(target, property, decorators, initializer) {
    return decorators.slice().reverse().reduce(function (decoratedInitializer, decorator) {
      return decorator(target, property, decoratedInitializer) || decoratedInitializer;
    }, initializer);
  }
  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }
  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
  return {
    setters: [function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
      help = _coreDataDecoratorsIndexJs.help;
      menu = _coreDataDecoratorsIndexJs.menu;
      type = _coreDataDecoratorsIndexJs.type;
      serializable = _coreDataDecoratorsIndexJs.serializable;
      tooltip = _coreDataDecoratorsIndexJs.tooltip;
    }, function (_virtualInternal253AconstantsJs) {
      EDITOR_NOT_IN_PREVIEW = _virtualInternal253AconstantsJs.EDITOR_NOT_IN_PREVIEW;
    }, function (_constraintJs) {
      Constraint = _constraintJs.Constraint;
    }, function (_coreIndexJs) {
      Vec3 = _coreIndexJs.Vec3;
    }, function (_physicsEnumJs) {
      EConstraintType = _physicsEnumJs.EConstraintType;
    }],
    execute: function () {
      /**
       * @en The point to point constraint.
       * It locks the relative position of the pivots between two rigid bodies.
       * @zh 点对点约束。
       * 点对点约束会锁定两个刚体间的连接点的相对位置。
       */
      _export("PointToPointConstraint", PointToPointConstraint = (_dec = ccclass('cc.PointToPointConstraint'), _dec2 = help('i18n:cc.PointToPointConstraint'), _dec3 = menu('Physics/PointToPointConstraint(beta)'), _dec4 = type(Vec3), _dec5 = tooltip('i18n:physics3d.constraint.pivotA'), _dec6 = type(Vec3), _dec7 = tooltip('i18n:physics3d.constraint.pivotB'), _dec(_class = _dec2(_class = _dec3(_class = (_class2 = class PointToPointConstraint extends Constraint {
        /**
         * @en
         * The pivot point of the constraint in the local coordinate system of the attached rigid body.
         * @zh
         * 约束关节在连接刚体本地坐标系中的位置。
         */
        get pivotA() {
          return this._pivotA;
        }
        set pivotA(v) {
          Vec3.copy(this._pivotA, v);
          if (!EDITOR_NOT_IN_PREVIEW) {
            this.constraint.setPivotA(this._pivotA);
          }
        }

        /**
         * @en
         * The pivot point of the constraint in the local coordinate system of the connected rigid body.
         * @zh
         * 约束关节在连接刚体本地坐标系中的位置。
         */
        get pivotB() {
          return this._pivotB;
        }
        set pivotB(v) {
          Vec3.copy(this._pivotB, v);
          if (!EDITOR_NOT_IN_PREVIEW) {
            this.constraint.setPivotB(this._pivotB);
          }
        }
        get constraint() {
          return this._constraint;
        }
        constructor() {
          super(EConstraintType.POINT_TO_POINT);
          this._pivotA = _initializer && _initializer();
          this._pivotB = _initializer2 && _initializer2();
        }
      }, (_applyDecoratedDescriptor(_class2.prototype, "pivotA", [_dec4, _dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "pivotA"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "pivotB", [_dec6, _dec7], Object.getOwnPropertyDescriptor(_class2.prototype, "pivotB"), _class2.prototype), _initializer = _applyDecoratedInitializer(_class2.prototype, "_pivotA", [serializable], function () {
        return new Vec3();
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "_pivotB", [serializable], function () {
        return new Vec3();
      })), _class2)) || _class) || _class) || _class));
    }
  };
});