System.register("q-bundled:///fs/cocos/physics/framework/components/colliders/terrain-collider.js", ["../../../../core/data/decorators/index.js", "./collider.js", "../../../../terrain/terrain-asset.js", "../../physics-enum.js", "../rigid-body.js", "../../../../core/index.js"], function (_export, _context) {
  "use strict";

  var ccclass, help, executeInEditMode, menu, type, serializable, tooltip, Collider, TerrainAsset, EColliderType, ERigidBodyType, RigidBody, warnID, _dec, _dec2, _dec3, _dec4, _dec5, _class, _class2, _initializer, TerrainCollider;
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
      executeInEditMode = _coreDataDecoratorsIndexJs.executeInEditMode;
      menu = _coreDataDecoratorsIndexJs.menu;
      type = _coreDataDecoratorsIndexJs.type;
      serializable = _coreDataDecoratorsIndexJs.serializable;
      tooltip = _coreDataDecoratorsIndexJs.tooltip;
    }, function (_colliderJs) {
      Collider = _colliderJs.Collider;
    }, function (_terrainTerrainAssetJs) {
      TerrainAsset = _terrainTerrainAssetJs.TerrainAsset;
    }, function (_physicsEnumJs) {
      EColliderType = _physicsEnumJs.EColliderType;
      ERigidBodyType = _physicsEnumJs.ERigidBodyType;
    }, function (_rigidBodyJs) {
      RigidBody = _rigidBodyJs.RigidBody;
    }, function (_coreIndexJs) {
      warnID = _coreIndexJs.warnID;
    }],
    execute: function () {
      /**
       * @en
       * Terrain collider component.
       * @zh
       * 地形碰撞器。
       */
      _export("TerrainCollider", TerrainCollider = (_dec = ccclass('cc.TerrainCollider'), _dec2 = help('i18n:cc.TerrainCollider'), _dec3 = menu('Physics/TerrainCollider'), _dec4 = type(TerrainAsset), _dec5 = tooltip('i18n:physics3d.collider.terrain_terrain'), _dec(_class = _dec2(_class = _dec3(_class = executeInEditMode(_class = (_class2 = class TerrainCollider extends Collider {
        /// PUBLIC PROPERTY GETTER\SETTER ///

        /**
         * @en
         * Gets or sets the terrain assets referenced by this collider.
         * @zh
         * 获取或设置此碰撞体引用的网格资源.
         */
        get terrain() {
          return this._terrain;
        }
        set terrain(value) {
          this._terrain = value;
          if (this._shape) this.shape.setTerrain(this._terrain);
        }

        /**
         * @en
         * Gets the wrapper object, through which the lowLevel instance can be accessed.
         * @zh
         * 获取封装对象，通过此对象可以访问到底层实例。
         */
        get shape() {
          return this._shape;
        }
        onEnable() {
          super.onEnable();
          if (this.node) {
            const body = this.node.getComponent(RigidBody);
            if (body && body.isValid && body.type === ERigidBodyType.DYNAMIC) {
              warnID(9630, this.node.name);
            }
          }
        }

        /// PRIVATE PROPERTY ///

        constructor() {
          super(EColliderType.TERRAIN);
          this._terrain = _initializer && _initializer();
        }
      }, (_applyDecoratedDescriptor(_class2.prototype, "terrain", [_dec4, _dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "terrain"), _class2.prototype), _initializer = _applyDecoratedInitializer(_class2.prototype, "_terrain", [serializable], function () {
        return null;
      })), _class2)) || _class) || _class) || _class) || _class));
    }
  };
});