System.register("q-bundled:///fs/cocos/2d/components/graphics.js", ["../../core/data/decorators/index.js", "../../../../virtual/internal%253Aconstants.js", "../../asset/asset-manager/index.js", "../framework/ui-renderer.js", "../../game/director.js", "../../core/index.js", "../../render-scene/index.js", "../assembler/graphics/types.js", "../assembler/graphics/webgl/impl.js", "../../asset/assets/index.js", "../../gfx/index.js", "../renderer/vertex-format.js", "../renderer/native-2d.js", "../renderer/render-entity.js"], function (_export, _context) {
  "use strict";

  var ccclass, help, executionOrder, menu, tooltip, type, visible, override, editable, serializable, JSB, builtinResMgr, InstanceMaterialType, UIRenderer, director, Color, warnID, cclegacy, scene, LineCap, LineJoin, Impl, RenderingSubMesh, Format, PrimitiveMode, Attribute, BufferUsageBit, BufferInfo, MemoryUsageBit, deviceManager, vfmtPosColor, getAttributeStride, getComponentPerVertex, NativeUIModelProxy, RenderEntity, RenderEntityType, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _class, _class2, _initializer, _initializer2, _initializer3, _initializer4, _initializer5, _initializer6, _class3, attributes, componentPerVertex, stride, Graphics;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
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
      executionOrder = _coreDataDecoratorsIndexJs.executionOrder;
      menu = _coreDataDecoratorsIndexJs.menu;
      tooltip = _coreDataDecoratorsIndexJs.tooltip;
      type = _coreDataDecoratorsIndexJs.type;
      visible = _coreDataDecoratorsIndexJs.visible;
      override = _coreDataDecoratorsIndexJs.override;
      editable = _coreDataDecoratorsIndexJs.editable;
      serializable = _coreDataDecoratorsIndexJs.serializable;
    }, function (_virtualInternal253AconstantsJs) {
      JSB = _virtualInternal253AconstantsJs.JSB;
    }, function (_assetAssetManagerIndexJs) {
      builtinResMgr = _assetAssetManagerIndexJs.builtinResMgr;
    }, function (_frameworkUiRendererJs) {
      InstanceMaterialType = _frameworkUiRendererJs.InstanceMaterialType;
      UIRenderer = _frameworkUiRendererJs.UIRenderer;
    }, function (_gameDirectorJs) {
      director = _gameDirectorJs.director;
    }, function (_coreIndexJs) {
      Color = _coreIndexJs.Color;
      warnID = _coreIndexJs.warnID;
      cclegacy = _coreIndexJs.cclegacy;
    }, function (_renderSceneIndexJs) {
      scene = _renderSceneIndexJs.scene;
    }, function (_assemblerGraphicsTypesJs) {
      LineCap = _assemblerGraphicsTypesJs.LineCap;
      LineJoin = _assemblerGraphicsTypesJs.LineJoin;
    }, function (_assemblerGraphicsWebglImplJs) {
      Impl = _assemblerGraphicsWebglImplJs.Impl;
    }, function (_assetAssetsIndexJs) {
      RenderingSubMesh = _assetAssetsIndexJs.RenderingSubMesh;
    }, function (_gfxIndexJs) {
      Format = _gfxIndexJs.Format;
      PrimitiveMode = _gfxIndexJs.PrimitiveMode;
      Attribute = _gfxIndexJs.Attribute;
      BufferUsageBit = _gfxIndexJs.BufferUsageBit;
      BufferInfo = _gfxIndexJs.BufferInfo;
      MemoryUsageBit = _gfxIndexJs.MemoryUsageBit;
      deviceManager = _gfxIndexJs.deviceManager;
    }, function (_rendererVertexFormatJs) {
      vfmtPosColor = _rendererVertexFormatJs.vfmtPosColor;
      getAttributeStride = _rendererVertexFormatJs.getAttributeStride;
      getComponentPerVertex = _rendererVertexFormatJs.getComponentPerVertex;
    }, function (_rendererNative2dJs) {
      NativeUIModelProxy = _rendererNative2dJs.NativeUIModelProxy;
    }, function (_rendererRenderEntityJs) {
      RenderEntity = _rendererRenderEntityJs.RenderEntity;
      RenderEntityType = _rendererRenderEntityJs.RenderEntityType;
    }],
    execute: function () {
      attributes = vfmtPosColor.concat([new Attribute('a_dist', Format.R32F)]);
      componentPerVertex = getComponentPerVertex(attributes);
      stride = getAttributeStride(attributes);
      /**
       * @en
       * Graphics component.
       *
       * @zh
       * 自定义图形类。
       */
      _export("Graphics", Graphics = (_dec = ccclass('cc.Graphics'), _dec2 = help('i18n:cc.Graphics'), _dec3 = executionOrder(110), _dec4 = menu('2D/Graphics'), _dec5 = tooltip('i18n:graphics.lineWidth'), _dec6 = type(LineJoin), _dec7 = tooltip('i18n:graphics.lineJoin'), _dec8 = type(LineCap), _dec9 = tooltip('i18n:graphics.lineCap'), _dec10 = tooltip('i18n:graphics.strokeColor'), _dec11 = tooltip('i18n:graphics.fillColor'), _dec12 = tooltip('i18n:graphics.miterLimit'), _dec13 = visible(false), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = (_class2 = (_class3 = /*#__PURE__*/function (_UIRenderer) {
        _inheritsLoose(Graphics, _UIRenderer);
        function Graphics() {
          var _this;
          _this = _UIRenderer.call(this) || this;
          _this.impl = null;
          /**
           * @deprecated since v3.6.0, this is an engine private interface that will be removed in the future.
           */
          _this.model = null;
          _this._lineWidth = _initializer && _initializer();
          _this._strokeColor = _initializer2 && _initializer2();
          _this._lineJoin = _initializer3 && _initializer3();
          _this._lineCap = _initializer4 && _initializer4();
          _this._fillColor = _initializer5 && _initializer5();
          _this._miterLimit = _initializer6 && _initializer6();
          _this._isDrawing = false;
          _this._isNeedUploadData = true;
          _this._graphicsUseSubMeshes = [];
          _this._instanceMaterialType = InstanceMaterialType.ADD_COLOR;
          _this.impl = new Impl(_assertThisInitialized(_this));
          if (JSB) {
            _this._graphicsNativeProxy = new NativeUIModelProxy();
          }
          return _this;
        }
        var _proto = Graphics.prototype;
        _proto.onRestore = function onRestore() {
          if (!this.impl) {
            this._flushAssembler();
          }
        };
        _proto.onLoad = function onLoad() {
          _UIRenderer.prototype.onLoad.call(this);
          if (JSB) {
            this._graphicsNativeProxy.initModel(this.node);
            this.model = this._graphicsNativeProxy.getModel();
          } else {
            this.model = director.root.createModel(scene.Model);
            this.model.node = this.model.transform = this.node;
          }
          this._flushAssembler();
        };
        _proto.onEnable = function onEnable() {
          _UIRenderer.prototype.onEnable.call(this);
          this._updateMtlForGraphics();
        };
        _proto.onDestroy = function onDestroy() {
          this._sceneGetter = null;
          if (JSB) {
            this._graphicsNativeProxy.destroy();
            this.model = null;
          } else {
            if (this.model) {
              director.root.destroyModel(this.model);
              this.model = null;
            }
            var subMeshLength = this._graphicsUseSubMeshes.length;
            if (subMeshLength > 0) {
              for (var i = 0; i < subMeshLength; ++i) {
                this._graphicsUseSubMeshes[i].destroy();
              }
              this._graphicsUseSubMeshes.length = 0;
            }
          }
          if (this.impl) {
            this._isDrawing = false;
            this.impl.clear();
            this.impl = null;
          }
          _UIRenderer.prototype.onDestroy.call(this);
        }

        /**
         * @en
         * Move path start point to (x,y).
         *
         * @zh
         * 移动路径起点到坐标(x, y)。
         *
         * @param x @en The x-axis coordinate of the target position.
         *          @zh 目标位置的 X 轴坐标。
         * @param y @en The y-axis coordinate of the target position.
         *          @zh 目标位置的 y 轴坐标。
         */;
        _proto.moveTo = function moveTo(x, y) {
          if (!this.impl) {
            return;
          }
          this.impl.moveTo(x, y);
        }

        /**
         * @en
         * Adds a straight line to the path.
         *
         * @zh
         * 绘制直线路径。
         *
         * @param x @en The x-axis coordinate of the target position.
         *          @zh 目标位置的 x 轴坐标。
         * @param y @en The x-axis coordinate of the target position.
         *          @zh 目标位置的 y 轴坐标。
         */;
        _proto.lineTo = function lineTo(x, y) {
          if (!this.impl) {
            return;
          }
          this.impl.lineTo(x, y);
        }

        /**
         * @en
         * Adds a cubic Bézier curve to the path.
         *
         * @zh
         * 绘制三次贝赛尔曲线路径。
         *
         * @param c1x @en The x-axis coordinate of the first control point.
         *            @zh 第一个控制点的 x 轴坐标。
         * @param c1y @en The y-axis coordinate of the first control point.
         *            @zh 第一个控制点的 y 轴坐标。
         * @param c2x @en The x-axis coordinate of the second control point.
         *            @zh 第二个控制点的 x 轴坐标。
         * @param c2y @en The y-axis coordinate of the second control point.
         *            @zh 第二个控制点的 y 轴坐标。
         * @param x @en The x-axis coordinate of the last control point.
         *          @zh 最后一个控制点的 x 轴坐标。
         * @param y @en The y-axis coordinate of the last control point.
         *          @zh 最后一个控制点的 y 轴坐标。
         */;
        _proto.bezierCurveTo = function bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
          if (!this.impl) {
            return;
          }
          this.impl.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
        }

        /**
         * @en
         * Adds a quadratic Bézier curve to the path.
         *
         * @zh
         * 绘制二次贝赛尔曲线路径。
         *
         * @param cx @en The x-axis coordinate of the starting control point.
         *           @zh 起始控制点的 x 轴坐标。
         * @param cy @en The y-axis coordinate of the starting control point.
         *           @zh 起始控制点的 y 轴坐标。
         * @param x @en The x-axis coordinates of the endpoint control point.
         *          @zh 终点控制点的 x 轴坐标。
         * @param y @en The y-axis coordinates of the endpoint control point.
         *          @zh 终点控制点的 x 轴坐标。
         */;
        _proto.quadraticCurveTo = function quadraticCurveTo(cx, cy, x, y) {
          if (!this.impl) {
            return;
          }
          this.impl.quadraticCurveTo(cx, cy, x, y);
        }

        /**
         * @en
         * Adds an arc to the path which is centered at (cx, cy) position with radius r starting at startAngle
         * and ending at endAngle going in the given direction by counterclockwise (defaulting to false).
         *
         * @zh
         * 绘制圆弧路径。圆弧路径的圆心在 (cx, cy) 位置，半径为 r ，根据 counterclockwise （默认为false）指定的方向从 startAngle 开始绘制，到 endAngle 结束。
         *
         * @param cx @en The coordinate x-axis of the central control point.
         *           @zh 中心控制点的坐标 x 轴。
         * @param cy @en The coordinate y-axis of the central control point.
         *           @zh 中心控制点的坐标 y 轴。
         * @param r @en Angle in Radian.
         *          @zh 圆弧弧度。
         * @param startAngle @en The starting angle in radian, measured clockwise from the positive x-axis.
         *                   @zh 弧度起点，从正 x 轴顺时针方向测量。
         * @param endAngle @en The ending angle in radian, measured clockwise from the positive x-axis.
         *                 @zh 弧度终点，从正 x 轴顺时针方向测量。
         * @param counterclockwise @en If true, draws counterclockwise between the two angles. Default is clockwise.
         *                         @zh 如果为真，在两个角度之间逆时针绘制。默认顺时针。
         */;
        _proto.arc = function arc(cx, cy, r, startAngle, endAngle, counterclockwise) {
          if (!this.impl) {
            return;
          }
          this.impl.arc(cx, cy, r, startAngle, endAngle, counterclockwise);
        }

        /**
         * @en
         * Adds an ellipse to the path.
         *
         * @zh
         * 绘制椭圆路径。
         *
         * @param cx @en The x-axis coordinates of the center point.
         *           @zh 中心点的 x 轴坐标。
         * @param cy @en The y-axis coordinates of the center point.
         *           @zh 中心点的 y 轴坐标。
         * @param rx @en The radius of the x-axis of the ellipse.
         *           @zh 椭圆 x 轴半径。
         * @param ry @en The radius of the y-axis of the ellipse.
         *           @zh 椭圆 y 轴半径。
         */;
        _proto.ellipse = function ellipse(cx, cy, rx, ry) {
          if (!this.impl) {
            return;
          }
          this.impl.ellipse(cx, cy, rx, ry);
        }

        /**
         * @en
         * Adds a circle to the path.
         *
         * @zh
         * 绘制圆形路径。
         *
         * @param cx @en The x-axis coordinates of the center point.
         *           @zh 中心点的 x 轴坐标。
         * @param cy @en The y-axis coordinates of the center point.
         *           @zh 中心点的 y 轴坐标。
         * @param r @en Radius.
         *          @zh 圆半径。
         */;
        _proto.circle = function circle(cx, cy, r) {
          if (!this.impl) {
            return;
          }
          this.impl.circle(cx, cy, r);
        }

        /**
         * @en
         * Adds a rectangle to the path.
         *
         * @zh
         * 绘制矩形路径。
         *
         * @param x @en The x-axis coordinate of the top left point of the rectangle.
         *          @zh 矩形起始 x 轴坐标。
         * @param y @en The y-axis coordinate of the top left point of the rectangle.
         *          @zh 矩形起始 y 轴坐标。
         * @param w @en The width of the rectangle.
         *          @zh 矩形宽度。
         * @param h @en The height of the rectangle.
         *          @zh 矩形高度。
         */;
        _proto.rect = function rect(x, y, w, h) {
          if (!this.impl) {
            return;
          }
          this.impl.rect(x, y, w, h);
        }

        /**
         * @en
         * Adds a round corner rectangle to the path.
         *
         * @zh
         * 绘制圆角矩形路径。
         *
         * @param x @en The x-axis coordinate of the top left point of the rectangle.
         *          @zh 矩形起始 x 轴坐标。
         * @param y @en The y-axis coordinate of the top left point of the rectangle.
         *          @zh 矩形起始 y 轴坐标。
         * @param w @en The width of the rectangle.
         *          @zh 矩形宽度。
         * @param h @en The height of the rectangle.
         *          @zh 矩形高度。
         * @param r @en Radius of rectangular rounded corners.
         *          @zh 矩形圆角半径。
         */;
        _proto.roundRect = function roundRect(x, y, w, h, r) {
          if (!this.impl) {
            return;
          }
          this.impl.roundRect(x, y, w, h, r);
        }

        /**
         * @en
         * Draws a filled rectangle.
         *
         * @zh
         * 绘制填充矩形。
         *
         * @param x @en The x-axis coordinate of the top left point of the rectangle.
         *          @zh 矩形起始 x 轴坐标。
         * @param y @en The y-axis coordinate of the top left point of the rectangle.
         *          @zh 矩形起始 y 轴坐标。
         * @param w @en The width of the rectangle.
         *          @zh 矩形宽度。
         * @param h @en The height of the rectangle.
         *          @zh 矩形高度。
         */;
        _proto.fillRect = function fillRect(x, y, w, h) {
          this.rect(x, y, w, h);
          this.fill();
        }

        /**
         * @en
         * Erasing any previously drawn content.
         *
         * @zh
         * 擦除之前绘制的所有内容的方法。
         */;
        _proto.clear = function clear() {
          if (!this.impl) {
            return;
          }
          this.impl.clear();
          this._isDrawing = false;
          if (JSB) {
            this._graphicsNativeProxy.clear(); // need native
          } else if (this.model) {
            for (var i = 0; i < this.model.subModels.length; i++) {
              var subModel = this.model.subModels[i];
              subModel.inputAssembler.indexCount = 0;
            }
          }
          this.markForUpdateRenderData();
        }

        /**
         * @en
         * Causes the point of the pen to move back to the start of the current path.
         * It tries to add a straight line from the current point to the start.
         *
         * @zh
         * 将笔点返回到当前路径起始点的。它尝试从当前点到起始点绘制一条直线。
         */;
        _proto.close = function close() {
          if (!this.impl) {
            return;
          }
          this.impl.close();
        }

        /**
         * @en
         * Strokes the current or given path with the current stroke style.
         *
         * @zh
         * 根据当前的画线样式，绘制当前或已经存在的路径。
         */;
        _proto.stroke = function stroke() {
          if (!this._assembler) {
            this._flushAssembler();
          }
          this._isDrawing = true;
          this._isNeedUploadData = true;
          this._assembler.stroke(this);
        }

        /**
         * @en
         * Fills the current or given path with the current fill style.
         *
         * @zh
         * 根据当前的画线样式，填充当前或已经存在的路径。
         */;
        _proto.fill = function fill() {
          if (!this._assembler) {
            this._flushAssembler();
          }
          this._isDrawing = true;
          this._isNeedUploadData = true;
          this._assembler.fill(this);
        };
        _proto._updateMtlForGraphics = function _updateMtlForGraphics() {
          var mat;
          if (this._customMaterial) {
            mat = this.getMaterialInstance(0);
          } else {
            mat = builtinResMgr.get('ui-graphics-material');
            this.setSharedMaterial(mat, 0);
            mat = this.getMaterialInstance(0);
            mat.recompileShaders({
              USE_LOCAL: true
            });
          }
        }

        /**
         * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
         */;
        _proto.activeSubModel = function activeSubModel(idx) {
          if (!this.model) {
            warnID(4500, this.node.name);
            return;
          }
          if (this.model.subModels.length <= idx) {
            var gfxDevice = deviceManager.gfxDevice;
            var vertexBuffer = gfxDevice.createBuffer(new BufferInfo(BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST, MemoryUsageBit.DEVICE, 65535 * stride, stride));
            var indexBuffer = gfxDevice.createBuffer(new BufferInfo(BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST, MemoryUsageBit.DEVICE, 65535 * Uint16Array.BYTES_PER_ELEMENT * 2, Uint16Array.BYTES_PER_ELEMENT));
            var renderMesh = new RenderingSubMesh([vertexBuffer], attributes, PrimitiveMode.TRIANGLE_LIST, indexBuffer);
            renderMesh.subMeshIdx = 0;
            this.model.initSubModel(idx, renderMesh, this.getMaterialInstance(0));
            this._graphicsUseSubMeshes.push(renderMesh);
          }
        };
        _proto._uploadData = function _uploadData() {
          var impl = this.impl;
          if (!impl) {
            return;
          }
          var renderDataList = impl && impl.getRenderDataList();
          if (renderDataList.length <= 0 || !this.model) {
            return;
          }
          var subModelList = this.model.subModels;
          for (var i = 0; i < renderDataList.length; i++) {
            var renderData = renderDataList[i];
            var ia = subModelList[i].inputAssembler;
            if (renderData.lastFilledVertex === renderData.vertexStart) {
              continue;
            }
            var vb = new Float32Array(renderData.vData.buffer, 0, renderData.vertexStart * componentPerVertex);
            ia.vertexBuffers[0].update(vb);
            ia.vertexCount = renderData.vertexStart;
            var ib = new Uint16Array(renderData.iData.buffer, 0, renderData.indexStart);
            ia.indexBuffer.update(ib);
            ia.indexCount = renderData.indexStart;
            renderData.lastFilledVertex = renderData.vertexStart;
            renderData.lastFilledIndex = renderData.indexStart;
          }
          this._isNeedUploadData = false;
        };
        _proto._render = function _render(render) {
          if (this._isNeedUploadData) {
            if (this.impl) {
              var renderDataList = this.impl.getRenderDataList();
              var len = this.model.subModels.length;
              if (renderDataList.length > len) {
                for (var i = len; i < renderDataList.length; i++) {
                  this.activeSubModel(i);
                }
              }
            }
            this._uploadData();
          }
          render.commitModel(this, this.model, this.getMaterialInstance(0));
        };
        _proto._flushAssembler = function _flushAssembler() {
          var assembler = Graphics.Assembler.getAssembler(this);
          if (this._assembler !== assembler) {
            this._assembler = assembler;
          }
        };
        _proto._canRender = function _canRender() {
          if (!_UIRenderer.prototype._canRender.call(this)) {
            return false;
          }
          if (JSB) {
            return this._isDrawing;
          } else {
            return !!this.model && this._isDrawing;
          }
        }

        /**
         * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
         */;
        _proto.updateRenderer = function updateRenderer() {
          _UIRenderer.prototype.updateRenderer.call(this);
          if (JSB) {
            if (this._isNeedUploadData) {
              if (this.impl) {
                var renderDataList = this.impl.getRenderDataList();
                for (var i = 0; i < renderDataList.length; i++) {
                  renderDataList[i].setRenderDrawInfoAttributes();
                }
                this._graphicsNativeProxy.activeSubModels();
              }
              this._graphicsNativeProxy.uploadData();
              this._isNeedUploadData = false;
            }
          }
        };
        _proto.createRenderEntity = function createRenderEntity() {
          return new RenderEntity(RenderEntityType.DYNAMIC);
        };
        _createClass(Graphics, [{
          key: "lineWidth",
          get:
          /**
           * @en
           * Current line width.
           *
           * @zh
           * 当前线条宽度。
           */
          function get() {
            return this._lineWidth;
          },
          set: function set(value) {
            this._lineWidth = value;
            if (!this.impl) {
              return;
            }
            this.impl.lineWidth = value;
          }

          /**
           * @en
           * Determines how two connecting segments (of lines, arcs or curves) with non-zero lengths in a shape are joined together.
           *
           * @zh
           * 用来设置2个长度不为0的相连部分（线段，圆弧，曲线）如何连接在一起的属性。
           */
        }, {
          key: "lineJoin",
          get: function get() {
            return this._lineJoin;
          },
          set: function set(value) {
            this._lineJoin = value;
            if (!this.impl) {
              return;
            }
            this.impl.lineJoin = value;
          }

          /**
           * @en
           * Determines how the end points of every line are drawn.
           *
           * @zh
           * 指定如何绘制每一条线段末端。
           */
        }, {
          key: "lineCap",
          get: function get() {
            return this._lineCap;
          },
          set: function set(value) {
            this._lineCap = value;
            if (!this.impl) {
              return;
            }
            this.impl.lineCap = value;
          }

          /**
           * @en
           * Brush stroke color.
           *
           * @zh
           * 笔触的颜色。
           */
        }, {
          key: "strokeColor",
          get: function get() {
            return this._strokeColor;
          },
          set: function set(value) {
            if (!this.impl) {
              return;
            }
            this._strokeColor.set(value);
            this.impl.strokeColor = this._strokeColor;
          }

          /**
           * @en
           * Fill paint color.
           *
           * @zh
           * 填充绘画的颜色。
           */
        }, {
          key: "fillColor",
          get: function get() {
            return this._fillColor;
          },
          set: function set(value) {
            if (!this.impl) {
              return;
            }
            this._fillColor.set(value);
            this.impl.fillColor = this._fillColor;
          }

          /**
           * @en
           * Set the miter limit ratio.
           *
           * @zh
           * 设置斜接面限制比例。
           */
        }, {
          key: "miterLimit",
          get: function get() {
            return this._miterLimit;
          },
          set: function set(value) {
            this._miterLimit = value;
            // this.impl.miterLimit = value;
          }
        }, {
          key: "color",
          get: function get() {
            return this._color;
          },
          set: function set(value) {
            if (this._color === value) {
              return;
            }
            this._color.set(value);
          }
        }, {
          key: "graphicsNativeProxy",
          get:
          //nativeObj

          /**
           * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
           */
          function get() {
            return this._graphicsNativeProxy;
          }
        }]);
        return Graphics;
      }(UIRenderer), _class3.LineJoin = LineJoin, _class3.LineCap = LineCap, _class3), (_applyDecoratedDescriptor(_class2.prototype, "lineWidth", [editable, _dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "lineWidth"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "lineJoin", [_dec6, _dec7], Object.getOwnPropertyDescriptor(_class2.prototype, "lineJoin"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "lineCap", [_dec8, _dec9], Object.getOwnPropertyDescriptor(_class2.prototype, "lineCap"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "strokeColor", [_dec10], Object.getOwnPropertyDescriptor(_class2.prototype, "strokeColor"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "fillColor", [_dec11], Object.getOwnPropertyDescriptor(_class2.prototype, "fillColor"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "miterLimit", [_dec12], Object.getOwnPropertyDescriptor(_class2.prototype, "miterLimit"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "color", [override, _dec13], Object.getOwnPropertyDescriptor(_class2.prototype, "color"), _class2.prototype), _initializer = _applyDecoratedInitializer(_class2.prototype, "_lineWidth", [serializable], function () {
        return 1;
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "_strokeColor", [serializable], function () {
        return Color.BLACK.clone();
      }), _initializer3 = _applyDecoratedInitializer(_class2.prototype, "_lineJoin", [serializable], function () {
        return LineJoin.MITER;
      }), _initializer4 = _applyDecoratedInitializer(_class2.prototype, "_lineCap", [serializable], function () {
        return LineCap.BUTT;
      }), _initializer5 = _applyDecoratedInitializer(_class2.prototype, "_fillColor", [serializable], function () {
        return Color.WHITE.clone();
      }), _initializer6 = _applyDecoratedInitializer(_class2.prototype, "_miterLimit", [serializable], function () {
        return 10;
      })), _class2)) || _class) || _class) || _class) || _class));
      cclegacy.Graphics = Graphics;
    }
  };
});