System.register("q-bundled:///fs/cocos/physics-2d/framework/components/colliders/collider-2d.js", ["../../../../../../virtual/internal%253Aconstants.js", "../../../../core/index.js", "../../../../physics/framework/physics-enum.js", "../rigid-body-2d.js", "../../physics-selector.js", "../../physics-types.js", "../../../../scene-graph/index.js"], function (_export, _context) {
  "use strict";

  var EDITOR_NOT_IN_PREVIEW, Vec2, Rect, _decorator, Eventify, tooltip, serializable, CCFloat, CCBoolean, PhysicsGroup, RigidBody2D, createShape, ECollider2DType, Component, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _dec14, _dec15, _dec16, _class, _class2, _initializer, _initializer2, _initializer3, _initializer4, _initializer5, _initializer6, _initializer7, _initializer8, ccclass, editable, property, type, Collider2D;
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
  function _applyDecoratedInitializer(target, property, decorators, initializer) {
    return decorators.slice().reverse().reduce(function (decoratedInitializer, decorator) {
      return decorator(target, property, decoratedInitializer) || decoratedInitializer;
    }, initializer);
  }
  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR_NOT_IN_PREVIEW = _virtualInternal253AconstantsJs.EDITOR_NOT_IN_PREVIEW;
    }, function (_coreIndexJs) {
      Vec2 = _coreIndexJs.Vec2;
      Rect = _coreIndexJs.Rect;
      _decorator = _coreIndexJs._decorator;
      Eventify = _coreIndexJs.Eventify;
      tooltip = _coreIndexJs.tooltip;
      serializable = _coreIndexJs.serializable;
      CCFloat = _coreIndexJs.CCFloat;
      CCBoolean = _coreIndexJs.CCBoolean;
    }, function (_physicsFrameworkPhysicsEnumJs) {
      PhysicsGroup = _physicsFrameworkPhysicsEnumJs.PhysicsGroup;
    }, function (_rigidBody2dJs) {
      RigidBody2D = _rigidBody2dJs.RigidBody2D;
    }, function (_physicsSelectorJs) {
      createShape = _physicsSelectorJs.createShape;
    }, function (_physicsTypesJs) {
      ECollider2DType = _physicsTypesJs.ECollider2DType;
    }, function (_sceneGraphIndexJs) {
      Component = _sceneGraphIndexJs.Component;
    }],
    execute: function () {
      ccclass = _decorator.ccclass;
      editable = _decorator.editable;
      property = _decorator.property;
      type = _decorator.type;
      _export("Collider2D", Collider2D = (_dec = ccclass('cc.Collider2D'), _dec2 = tooltip('i18n:physics2d.collider.editing'), _dec3 = type(CCFloat), _dec4 = tooltip('i18n:physics2d.collider.tag'), _dec5 = type(PhysicsGroup), _dec6 = tooltip('i18n:physics2d.collider.group'), _dec7 = type(CCFloat), _dec8 = tooltip('i18n:physics2d.collider.density'), _dec9 = type(CCBoolean), _dec10 = tooltip('i18n:physics2d.collider.sensor'), _dec11 = type(CCFloat), _dec12 = tooltip('i18n:physics2d.collider.friction'), _dec13 = type(CCFloat), _dec14 = tooltip('i18n:physics2d.collider.restitution'), _dec15 = type(Vec2), _dec16 = tooltip('i18n:physics2d.collider.offset'), _dec(_class = (_class2 = /*#__PURE__*/function (_Eventify) {
        _inheritsLoose(Collider2D, _Eventify);
        function Collider2D() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Eventify.call.apply(_Eventify, [this].concat(args)) || this;
          _this.editing = _initializer && _initializer();
          /**
           * @en Tag. If a node has several collider components, you can judge which type of collider is collided according to the tag.
           * @zh 标签。当一个节点上有多个碰撞组件时，在发生碰撞后，可以使用此标签来判断是节点上的哪个碰撞组件被碰撞了。
           */
          _this.tag = _initializer2 && _initializer2();
          _this.TYPE = ECollider2DType.None;
          // protected properties
          _this._shape = null;
          _this._body = null;
          _this._group = _initializer3 && _initializer3();
          _this._density = _initializer4 && _initializer4();
          _this._sensor = _initializer5 && _initializer5();
          _this._friction = _initializer6 && _initializer6();
          _this._restitution = _initializer7 && _initializer7();
          _this._offset = _initializer8 && _initializer8();
          return _this;
        }
        var _proto = Collider2D.prototype;
        /// COMPONENT LIFECYCLE ///
        _proto.onLoad = function onLoad() {
          if (!EDITOR_NOT_IN_PREVIEW) {
            this._shape = createShape(this.TYPE);
            this._shape.initialize(this);
            if (this._shape.onLoad) {
              this._shape.onLoad();
            }
            this._body = this.getComponent(RigidBody2D);
          }
        };
        _proto.onEnable = function onEnable() {
          if (this._shape) {
            this._shape.onEnable();
          }
        };
        _proto.onDisable = function onDisable() {
          if (this._shape && this._shape.onDisable) {
            this._shape.onDisable();
          }
        };
        _proto.onDestroy = function onDestroy() {
          if (this._shape && this._shape.onDestroy) {
            this._shape.onDestroy();
          }
        }

        /**
         * @en
         * If the physics engine is box2d, need to call this function to apply current changes to collider, this will regenerate inner box2d fixtures.
         * @zh
         * 如果物理引擎是 box2d, 需要调用此函数来应用当前 collider 中的修改，调用此函数会重新生成 box2d 的夹具。
         */;
        _proto.apply = function apply() {
          if (this._shape && this._shape.apply) {
            this._shape.apply();
          }
        }

        /**
         * @en
         * Get the world aabb of the collider.
         * @zh
         * 获取碰撞体的世界坐标系下的包围盒。
         */;
        _createClass(Collider2D, [{
          key: "group",
          get:
          /**
           * @en
           * Gets or sets the group of the rigid body.
           * @zh
           * 获取或设置分组。
           */
          function get() {
            return this._group;
          },
          set: function set(v) {
            this._group = v;
            if (this._shape && this._shape.onGroupChanged) {
              this._shape.onGroupChanged();
            }
          }

          /**
           * @en The density.
           * @zh 密度。
           */
        }, {
          key: "density",
          get: function get() {
            return this._density;
          },
          set: function set(v) {
            this._density = v;
          }

          /**
           * @en
           * A sensor collider collects contact information but never generates a collision response
           * @zh
           * 一个传感器类型的碰撞体会产生碰撞回调，但是不会发生物理碰撞效果。
           */
        }, {
          key: "sensor",
          get: function get() {
            return this._sensor;
          },
          set: function set(v) {
            this._sensor = v;
          }

          /**
           * @en
           * The friction coefficient, usually in the range [0,1].
           * @zh
           * 摩擦系数，取值一般在 [0, 1] 之间。
           */
        }, {
          key: "friction",
          get: function get() {
            return this._friction;
          },
          set: function set(v) {
            this._friction = v;
          }

          /**
           * @en
           * The restitution (elasticity) usually in the range [0,1].
           * @zh
           * 弹性系数，取值一般在 [0, 1]之间。
           */
        }, {
          key: "restitution",
          get: function get() {
            return this._restitution;
          },
          set: function set(v) {
            this._restitution = v;
          }
          /**
           * @en Position offset
           * @zh 位置偏移量
           */
        }, {
          key: "offset",
          get: function get() {
            return this._offset;
          },
          set: function set(v) {
            this._offset = v;
          }

          /**
           * @en
           * Physics collider will find the rigidbody component on the node and set to this property.
           * @zh
           * 碰撞体会在初始化时查找节点上是否存在刚体，如果查找成功则赋值到这个属性上。
           */
        }, {
          key: "body",
          get: function get() {
            return this._body;
          }
        }, {
          key: "impl",
          get: function get() {
            return this._shape;
          }
        }, {
          key: "worldAABB",
          get: function get() {
            if (this._shape) {
              return this._shape.worldAABB;
            }
            return new Rect();
          }
        }]);
        return Collider2D;
      }(Eventify(Component)), (_initializer = _applyDecoratedInitializer(_class2.prototype, "editing", [editable, _dec2], function () {
        return false;
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "tag", [_dec3, serializable, _dec4], function () {
        return 0;
      }), _applyDecoratedDescriptor(_class2.prototype, "group", [_dec5, _dec6], Object.getOwnPropertyDescriptor(_class2.prototype, "group"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "density", [_dec7, _dec8], Object.getOwnPropertyDescriptor(_class2.prototype, "density"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "sensor", [_dec9, _dec10], Object.getOwnPropertyDescriptor(_class2.prototype, "sensor"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "friction", [_dec11, _dec12], Object.getOwnPropertyDescriptor(_class2.prototype, "friction"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "restitution", [_dec13, _dec14], Object.getOwnPropertyDescriptor(_class2.prototype, "restitution"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "offset", [_dec15, _dec16], Object.getOwnPropertyDescriptor(_class2.prototype, "offset"), _class2.prototype), _initializer3 = _applyDecoratedInitializer(_class2.prototype, "_group", [serializable], function () {
        return PhysicsGroup.DEFAULT;
      }), _initializer4 = _applyDecoratedInitializer(_class2.prototype, "_density", [serializable], function () {
        return 1.0;
      }), _initializer5 = _applyDecoratedInitializer(_class2.prototype, "_sensor", [serializable], function () {
        return false;
      }), _initializer6 = _applyDecoratedInitializer(_class2.prototype, "_friction", [serializable], function () {
        return 0.2;
      }), _initializer7 = _applyDecoratedInitializer(_class2.prototype, "_restitution", [serializable], function () {
        return 0;
      }), _initializer8 = _applyDecoratedInitializer(_class2.prototype, "_offset", [serializable], function () {
        return new Vec2();
      })), _class2)) || _class));
    }
  };
});