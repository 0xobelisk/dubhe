System.register("q-bundled:///fs/cocos/physics-2d/framework/components/joints/spring-joint-2d.js", ["./joint-2d.js", "../../physics-types.js", "../../../../core/index.js", "../../../../core/data/decorators/index.js"], function (_export, _context) {
  "use strict";

  var Joint2D, EJoint2DType, CCBoolean, CCFloat, Vec3, _decorator, help, serializable, tooltip, type, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _class, _class2, _initializer, _initializer2, _initializer3, _initializer4, ccclass, property, menu, SpringJoint2D;
  function _applyDecoratedInitializer(target, property, decorators, initializer) {
    return decorators.slice().reverse().reduce(function (decoratedInitializer, decorator) {
      return decorator(target, property, decoratedInitializer) || decoratedInitializer;
    }, initializer);
  }
  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }
  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
  return {
    setters: [function (_joint2dJs) {
      Joint2D = _joint2dJs.Joint2D;
    }, function (_physicsTypesJs) {
      EJoint2DType = _physicsTypesJs.EJoint2DType;
    }, function (_coreIndexJs) {
      CCBoolean = _coreIndexJs.CCBoolean;
      CCFloat = _coreIndexJs.CCFloat;
      Vec3 = _coreIndexJs.Vec3;
      _decorator = _coreIndexJs._decorator;
    }, function (_coreDataDecoratorsIndexJs) {
      help = _coreDataDecoratorsIndexJs.help;
      serializable = _coreDataDecoratorsIndexJs.serializable;
      tooltip = _coreDataDecoratorsIndexJs.tooltip;
      type = _coreDataDecoratorsIndexJs.type;
    }],
    execute: function () {
      ({
        ccclass,
        property,
        menu
      } = _decorator);
      _export("SpringJoint2D", SpringJoint2D = (_dec = ccclass('cc.SpringJoint2D'), _dec2 = help('i18n:cc.Joint2D'), _dec3 = menu('Physics2D/Joints/SpringJoint2D'), _dec4 = type(CCFloat), _dec5 = tooltip('i18n:physics2d.joint.frequency'), _dec6 = type(CCFloat), _dec7 = tooltip('i18n:physics2d.joint.dampingRatio'), _dec8 = type(CCFloat), _dec9 = tooltip('i18n:physics2d.joint.distance'), _dec10 = type(CCBoolean), _dec11 = tooltip('i18n:physics2d.joint.autoCalcDistance'), _dec(_class = _dec2(_class = _dec3(_class = (_class2 = class SpringJoint2D extends Joint2D {
        constructor(...args) {
          super(...args);
          this.TYPE = EJoint2DType.SPRING;
          /// private properties
          this._frequency = _initializer && _initializer();
          this._dampingRatio = _initializer2 && _initializer2();
          this._distance = _initializer3 && _initializer3();
          this._autoCalcDistance = _initializer4 && _initializer4();
        }
        /**
         * @en
         * The spring frequency.
         * @zh
         * 弹性系数。
         */
        get frequency() {
          return this._frequency;
        }
        set frequency(v) {
          this._frequency = v;
          if (this._joint) {
            this._joint.setFrequency(v);
          }
        }

        /**
         * @en
         * The damping ratio.
         * @zh
         * 阻尼，表示关节变形后，恢复到初始状态受到的阻力。
         */
        get dampingRatio() {
          return this._dampingRatio;
        }
        set dampingRatio(v) {
          this._dampingRatio = v;
          if (this._joint) {
            this._joint.setDampingRatio(v);
          }
        }

        /**
         * @en
         * The distance separating the two ends of the joint.
         * @zh
         * 关节两端的距离。
         */
        get distance() {
          if (this._autoCalcDistance) {
            if (this.connectedBody) {
              return Vec3.distance(this.node.worldPosition, this.connectedBody.node.worldPosition);
            } else {
              //if connected body is not set, use scene origin as connected body
              return Vec3.len(this.node.worldPosition);
            }
          }
          return this._distance;
        }
        set distance(v) {
          this._distance = v;
          if (this._joint) {
            this._joint.setDistance(v);
          }
        }

        /**
         * @en
         * Auto calculate the distance between the connected two rigid bodies.
         * @zh
         * 自动计算关节连接的两个刚体间的距离。
         */
        get autoCalcDistance() {
          return this._autoCalcDistance;
        }
        set autoCalcDistance(v) {
          this._autoCalcDistance = v;
        }
      }, (_applyDecoratedDescriptor(_class2.prototype, "frequency", [_dec4, _dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "frequency"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "dampingRatio", [_dec6, _dec7], Object.getOwnPropertyDescriptor(_class2.prototype, "dampingRatio"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "distance", [_dec8, _dec9], Object.getOwnPropertyDescriptor(_class2.prototype, "distance"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "autoCalcDistance", [_dec10, _dec11], Object.getOwnPropertyDescriptor(_class2.prototype, "autoCalcDistance"), _class2.prototype), _initializer = _applyDecoratedInitializer(_class2.prototype, "_frequency", [serializable], function () {
        return 5;
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "_dampingRatio", [serializable], function () {
        return 0.7;
      }), _initializer3 = _applyDecoratedInitializer(_class2.prototype, "_distance", [serializable], function () {
        return 10;
      }), _initializer4 = _applyDecoratedInitializer(_class2.prototype, "_autoCalcDistance", [serializable], function () {
        return true;
      })), _class2)) || _class) || _class) || _class));
    }
  };
});