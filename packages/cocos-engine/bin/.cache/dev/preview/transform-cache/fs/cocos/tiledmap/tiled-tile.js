System.register("q-bundled:///fs/cocos/tiledmap/tiled-tile.js", ["../core/data/decorators/index.js", "../scene-graph/component.js", "../core/index.js", "../2d/framework/index.js", "../scene-graph/node-event.js"], function (_export, _context) {
  "use strict";

  var ccclass, executeInEditMode, help, menu, requireComponent, type, Component, CCInteger, warn, UITransform, NodeEventType, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _class, _class2, _initializer, _initializer2, TiledTile;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
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
    setters: [function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
      executeInEditMode = _coreDataDecoratorsIndexJs.executeInEditMode;
      help = _coreDataDecoratorsIndexJs.help;
      menu = _coreDataDecoratorsIndexJs.menu;
      requireComponent = _coreDataDecoratorsIndexJs.requireComponent;
      type = _coreDataDecoratorsIndexJs.type;
    }, function (_sceneGraphComponentJs) {
      Component = _sceneGraphComponentJs.Component;
    }, function (_coreIndexJs) {
      CCInteger = _coreIndexJs.CCInteger;
      warn = _coreIndexJs.warn;
    }, function (_dFrameworkIndexJs) {
      UITransform = _dFrameworkIndexJs.UITransform;
    }, function (_sceneGraphNodeEventJs) {
      NodeEventType = _sceneGraphNodeEventJs.NodeEventType;
    }],
    execute: function () {
      _export("TiledTile", TiledTile = (_dec = ccclass('cc.TiledTile'), _dec2 = help('i18n:cc.TiledTile'), _dec3 = menu('TiledMap/TiledTile'), _dec4 = requireComponent(UITransform), _dec5 = type(CCInteger), _dec6 = type(CCInteger), _dec7 = type(CCInteger), _dec8 = type(CCInteger), _dec9 = type(CCInteger), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = executeInEditMode(_class = (_class2 = /*#__PURE__*/function (_Component) {
        _inheritsLoose(TiledTile, _Component);
        function TiledTile() {
          var _this;
          _this = _Component.call(this) || this;
          _this._layer = null;
          _this._x = _initializer && _initializer();
          _this._y = _initializer2 && _initializer2();
          return _this;
        }
        var _proto = TiledTile.prototype;
        _proto.onEnable = function onEnable() {
          var parent = this.node.parent;
          this._layer = parent.getComponent('cc.TiledLayer');
          this.node.on(NodeEventType.TRANSFORM_CHANGED, this._updatePosition, this);
          this.node.on(NodeEventType.SIZE_CHANGED, this._updatePosition, this);
          this._resetTile();
          this.updateInfo();
        };
        _proto.onDisable = function onDisable() {
          this._resetTile();
          this.node.off(NodeEventType.TRANSFORM_CHANGED, this._updatePosition, this);
          this.node.off(NodeEventType.SIZE_CHANGED, this._updatePosition, this);
        };
        _proto._resetTile = function _resetTile() {
          if (this._layer && this._layer.getTiledTileAt(this._x, this._y) === this) {
            this._layer.setTiledTileAt(this._x, this._y, null);
          }
        };
        _proto.updateInfo = function updateInfo() {
          if (!this._layer) return;
          var x = this._x;
          var y = this._y;
          if (this._layer.getTiledTileAt(x, y)) {
            warn('There is already a TiledTile at [%s, %s]', x, y);
            return;
          }
          var p = this._layer.getPositionAt(x, y);
          this.node.setPosition(p.x, p.y);
          this._layer.setTiledTileAt(x, y, this);
          this._layer.markForUpdateRenderData();
        };
        _proto._updatePosition = function _updatePosition() {
          this._layer.markForUpdateRenderData();
        };
        _createClass(TiledTile, [{
          key: "x",
          get:
          /**
           * @en Specify the TiledTile horizontal coordinate，use map tile as the unit.
           * @zh 指定 TiledTile 的横向坐标，以地图块为单位
           * @property {Number} x
           * @default 0
           */

          function get() {
            return this._x;
          },
          set: function set(value) {
            if (value === this._x) return;
            if (this._layer && this._layer.isInvalidPosition(value, this._y)) {
              warn("Invalid x, the valid value is between [%s] ~ [%s]", 0, this._layer.layerSize.width);
              return;
            }
            this._resetTile();
            this._x = value;
            this.updateInfo();
          }

          /**
           * @en Specify the TiledTile vertical coordinate，use map tile as the unit.
           * @zh 指定 TiledTile 的纵向坐标，以地图块为单位
           * @property {Number} y
           * @default 0
           */
        }, {
          key: "y",
          get: function get() {
            return this._y;
          },
          set: function set(value) {
            if (value === this._y) return;
            if (this._layer && this._layer.isInvalidPosition(this._x, value)) {
              warn("Invalid y, the valid value is between [%s] ~ [%s]", 0, this._layer.layerSize.height);
              return;
            }
            this._resetTile();
            this._y = value;
            this.updateInfo();
          }
          /**
           * @en Specify the TiledTile gid.
           * @zh 指定 TiledTile 的 gid 值
           * @property {Number} gid
           * @default 0
           */
        }, {
          key: "grid",
          get: function get() {
            if (this._layer) {
              return this._layer.getTileGIDAt(this._x, this._y);
            }
            return 0;
          },
          set: function set(value) {
            if (this._layer) {
              this._layer.setTileGIDAt(value, this._x, this._y);
            }
          }
        }]);
        return TiledTile;
      }(Component), (_initializer = _applyDecoratedInitializer(_class2.prototype, "_x", [_dec5], function () {
        return 0;
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "_y", [_dec6], function () {
        return 0;
      }), _applyDecoratedDescriptor(_class2.prototype, "x", [_dec7], Object.getOwnPropertyDescriptor(_class2.prototype, "x"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "y", [_dec8], Object.getOwnPropertyDescriptor(_class2.prototype, "y"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "grid", [_dec9], Object.getOwnPropertyDescriptor(_class2.prototype, "grid"), _class2.prototype)), _class2)) || _class) || _class) || _class) || _class) || _class));
    }
  };
});