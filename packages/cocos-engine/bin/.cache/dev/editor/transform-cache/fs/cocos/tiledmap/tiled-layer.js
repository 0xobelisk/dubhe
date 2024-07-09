System.register("q-bundled:///fs/cocos/tiledmap/tiled-layer.js", ["../core/data/decorators/index.js", "../../../virtual/internal%253Aconstants.js", "../2d/framework/ui-renderer.js", "../scene-graph/index.js", "../core/index.js", "./tiled-tile.js", "../2d/renderer/render-data.js", "./tiled-types.js", "./tiled-utils.js", "../scene-graph/node-event.js", "../2d/renderer/render-entity.js", "../2d/renderer/render-draw-info.js", "../game/index.js"], function (_export, _context) {
  "use strict";

  var ccclass, EDITOR_NOT_IN_PREVIEW, UIRenderer, Component, Node, Mat4, Vec2, Vec3, warn, logID, TiledTile, RenderData, Orientation, StaggerAxis, StaggerIndex, TileFlag, fillTextureGrids, NodeEventType, RenderEntity, RenderEntityType, RenderDrawInfo, RenderDrawInfoType, director, _dec, _class, _dec2, _class3, _mat4_temp, _vec2_temp, _vec3_temp, _vec3_temp2, _tempRowCol, TiledUserNodeData, TiledLayer;
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
  return {
    setters: [function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
    }, function (_virtualInternal253AconstantsJs) {
      EDITOR_NOT_IN_PREVIEW = _virtualInternal253AconstantsJs.EDITOR_NOT_IN_PREVIEW;
    }, function (_dFrameworkUiRendererJs) {
      UIRenderer = _dFrameworkUiRendererJs.UIRenderer;
    }, function (_sceneGraphIndexJs) {
      Component = _sceneGraphIndexJs.Component;
      Node = _sceneGraphIndexJs.Node;
    }, function (_coreIndexJs) {
      Mat4 = _coreIndexJs.Mat4;
      Vec2 = _coreIndexJs.Vec2;
      Vec3 = _coreIndexJs.Vec3;
      warn = _coreIndexJs.warn;
      logID = _coreIndexJs.logID;
    }, function (_tiledTileJs) {
      TiledTile = _tiledTileJs.TiledTile;
    }, function (_dRendererRenderDataJs) {
      RenderData = _dRendererRenderDataJs.RenderData;
    }, function (_tiledTypesJs) {
      Orientation = _tiledTypesJs.Orientation;
      StaggerAxis = _tiledTypesJs.StaggerAxis;
      StaggerIndex = _tiledTypesJs.StaggerIndex;
      TileFlag = _tiledTypesJs.TileFlag;
    }, function (_tiledUtilsJs) {
      fillTextureGrids = _tiledUtilsJs.fillTextureGrids;
    }, function (_sceneGraphNodeEventJs) {
      NodeEventType = _sceneGraphNodeEventJs.NodeEventType;
    }, function (_dRendererRenderEntityJs) {
      RenderEntity = _dRendererRenderEntityJs.RenderEntity;
      RenderEntityType = _dRendererRenderEntityJs.RenderEntityType;
    }, function (_dRendererRenderDrawInfoJs) {
      RenderDrawInfo = _dRendererRenderDrawInfoJs.RenderDrawInfo;
      RenderDrawInfoType = _dRendererRenderDrawInfoJs.RenderDrawInfoType;
    }, function (_gameIndexJs) {
      director = _gameIndexJs.director;
    }],
    execute: function () {
      _mat4_temp = new Mat4();
      _vec2_temp = new Vec2();
      _vec3_temp = new Vec3();
      _vec3_temp2 = new Vec3();
      _tempRowCol = {
        row: 0,
        col: 0
      };
      _export("TiledUserNodeData", TiledUserNodeData = (_dec = ccclass('cc.TiledUserNodeData'), _dec(_class = class TiledUserNodeData extends Component {
        constructor() {
          super();
          this._index = -1;
          this._row = -1;
          this._col = -1;
          this._tiledLayer = null;
        }
      }) || _class));
      /**
        * @en Render the TMX layer.
        * @zh 渲染 TMX layer。
        * @class TiledLayer
        * @extends Component
        */
      _export("TiledLayer", TiledLayer = (_dec2 = ccclass('cc.TiledLayer'), _dec2(_class3 = class TiledLayer extends UIRenderer {
        get cullingRect() {
          return this._cullingRect;
        }
        get rightTop() {
          return this._rightTop;
        }
        get layerSize() {
          return this._layerSize;
        }
        get tiledDataArray() {
          return this._tiledDataArray;
        }
        get leftDownToCenterX() {
          return this._leftDownToCenterX;
        }
        get leftDownToCenterY() {
          return this._leftDownToCenterY;
        }
        requestDrawInfo(idx) {
          if (!this._drawInfoList[idx]) {
            this._drawInfoList[idx] = new RenderDrawInfo();
            this._drawInfoList[idx].setDrawInfoType(RenderDrawInfoType.MIDDLEWARE);
          }
          return this._drawInfoList[idx];
        }
        constructor() {
          super();
          // [row][col] = {count: 0, nodesList: []};
          this._userNodeGrid = {};
          this._userNodeMap = {};
          // [id] = node;
          this._userNodeDirty = false;
          // store the layer tiles node, index is caculated by 'x + width * y', format likes '[0]=tileNode0,[1]=tileNode1, ...'
          this.tiledTiles = [];
          // // store the layer tilesets index array
          // _tilesetIndexArr: number[] = [];
          // // tileset index to array index
          // _tilesetIndexToArrIndex: { [key: number]: number } = {};
          this._viewPort = {
            x: -1,
            y: -1,
            width: -1,
            height: -1
          };
          this._cullingRect = {
            leftDown: {
              row: -1,
              col: -1
            },
            rightTop: {
              row: -1,
              col: -1
            }
          };
          this._cullingDirty = true;
          this._rightTop = {
            row: -1,
            col: -1
          };
          this._layerInfo = null;
          this._mapInfo = null;
          // record max or min tile texture offset,
          // it will make culling rect more large, which insure culling rect correct.
          this._topOffset = 0;
          this._downOffset = 0;
          this._leftOffset = 0;
          this._rightOffset = 0;
          // store the layer tiles, index is caculated by 'x + width * y', format likes '[0]=gid0,[1]=gid1, ...'
          this.tiles = [];
          // vertex array
          this.vertices = [];
          // vertices dirty
          this._verticesDirty = true;
          this._layerName = '';
          this._layerSize = void 0;
          this._minGID = void 0;
          this._maxGID = void 0;
          this._layerOrientation = null;
          this._opacity = void 0;
          this._tintColor = void 0;
          // store all layer gid corresponding texture info, index is gid, format likes '[gid0]=tex-info,[gid1]=tex-info, ...'
          this.texGrids = null;
          // store all tileset texture, index is tileset index, format likes '[0]=texture0, [1]=texture1, ...'
          this._textures = [];
          this._tilesets = [];
          this._leftDownToCenterX = 0;
          this._leftDownToCenterY = 0;
          this._hasTiledNodeGrid = false;
          this._hasAniGrid = false;
          this._animations = null;
          // switch of culling
          this._enableCulling = void 0;
          this.colorChanged = false;
          this._properties = void 0;
          this.renderOrder = void 0;
          this._staggerAxis = void 0;
          this._staggerIndex = void 0;
          this._hexSideLength = void 0;
          this._mapTileSize = void 0;
          this._odd_even = void 0;
          this._diffX1 = void 0;
          this._diffY1 = void 0;
          this._useAutomaticVertexZ = void 0;
          this._vertexZvalue = void 0;
          this._offset = void 0;
          this._tiledDataArray = [];
          this._cameraNode = void 0;
          this._drawInfoList = [];
          /**
            * @en
            * Index of mesh render data array
            * @zh
            * 网格渲染数据数组的索引
            * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
            */
          this._tiledDataArrayIdx = 0;
        }
        hasTiledNode() {
          return this._hasTiledNodeGrid;
        }
        hasAnimation() {
          return this._hasAniGrid;
        }

        /**
          * @en enable or disable culling
          * @zh 开启或关闭裁剪。
          * @method enableCulling
          * @param value
          */
        set enableCulling(value) {
          if (this._enableCulling !== value) {
            this._enableCulling = value;
            this._cullingDirty = true;
            this.markForUpdateRenderData();
          }
        }
        get enableCulling() {
          return this._enableCulling;
        }

        /**
          * @en Adds user's node into layer.
          * @zh 添加用户节点。
          * @method addUserNode
          * @param {cc.Node} node
          * @return {Boolean}
          */
        addUserNode(node) {
          let dataComp = node.getComponent(TiledUserNodeData);
          if (dataComp) {
            warn('CCTiledLayer:addUserNode node has been added');
            return false;
          }
          dataComp = node.addComponent(TiledUserNodeData);
          node.parent = this.node;
          this._userNodeMap[node.uuid] = dataComp;
          dataComp._row = -1;
          dataComp._col = -1;
          dataComp._tiledLayer = this;
          this._nodeLocalPosToLayerPos(node.getPosition(), _vec2_temp);
          this._positionToRowCol(_vec2_temp.x, _vec2_temp.y, _tempRowCol);
          this._addUserNodeToGrid(dataComp, _tempRowCol);
          this._updateCullingOffsetByUserNode(node);
          node.on(NodeEventType.TRANSFORM_CHANGED, this._userNodePosChange, dataComp);
          node.on(NodeEventType.SIZE_CHANGED, this._userNodeSizeChange, dataComp);
          return true;
        }

        /**
          * @en Removes user's node.
          * @zh 移除用户节点。
          * @method removeUserNode
          * @param {cc.Node} node
          * @return {Boolean}
          */
        removeUserNode(node) {
          const dataComp = node.getComponent(TiledUserNodeData);
          if (!dataComp) {
            warn('CCTiledLayer:removeUserNode node is not exist');
            return false;
          }
          node.off(NodeEventType.TRANSFORM_CHANGED, this._userNodePosChange, dataComp);
          node.off(NodeEventType.SIZE_CHANGED, this._userNodeSizeChange, dataComp);
          this._removeUserNodeFromGrid(dataComp);
          delete this._userNodeMap[node.uuid];
          node._removeComponent(dataComp);
          dataComp.destroy();
          node.removeFromParent();
          // node._renderFlag &= ~RenderFlow.FLAG_BREAK_FLOW;
          return true;
        }

        /**
          * @en Destroy user's node.
          * @zh 销毁用户节点。
          * @method destroyUserNode
          * @param {cc.Node} node
          */
        destroyUserNode(node) {
          this.removeUserNode(node);
          node.destroy();
        }

        // acording layer anchor point to calculate node layer pos
        _nodeLocalPosToLayerPos(nodePos, out) {
          out.x = nodePos.x + this._leftDownToCenterX;
          out.y = nodePos.y + this._leftDownToCenterY;
        }
        getNodesByRowCol(row, col) {
          const rowData = this._userNodeGrid[row];
          if (!rowData) return null;
          return rowData[col];
        }
        getNodesCountByRow(row) {
          const rowData = this._userNodeGrid[row];
          if (!rowData) return 0;
          return rowData.count;
        }
        _updateAllUserNode() {
          this._userNodeGrid = {};
          for (const dataId in this._userNodeMap) {
            const dataComp = this._userNodeMap[dataId];
            this._nodeLocalPosToLayerPos(dataComp.node.getPosition(), _vec2_temp);
            this._positionToRowCol(_vec2_temp.x, _vec2_temp.y, _tempRowCol);
            this._addUserNodeToGrid(dataComp, _tempRowCol);
            this._updateCullingOffsetByUserNode(dataComp.node);
          }
        }
        _updateCullingOffsetByUserNode(node_) {
          const node = node_._uiProps.uiTransformComp.contentSize;
          if (this._topOffset < node.height) {
            this._topOffset = node.height;
          }
          if (this._downOffset < node.height) {
            this._downOffset = node.height;
          }
          if (this._leftOffset < node.width) {
            this._leftOffset = node.width;
          }
          if (this._rightOffset < node.width) {
            this._rightOffset = node.width;
          }
        }
        _userNodeSizeChange() {
          const dataComp = this;
          const node = dataComp.node;
          const self = dataComp._tiledLayer;
          self._updateCullingOffsetByUserNode(node);
          self._userNodeDirty = true;
          self.markForUpdateRenderData();
        }
        _userNodePosChange() {
          const dataComp = this;
          const node = dataComp.node;
          const self = dataComp._tiledLayer;
          self._nodeLocalPosToLayerPos(node.getPosition(), _vec2_temp);
          self._positionToRowCol(_vec2_temp.x, _vec2_temp.y, _tempRowCol);
          self._limitInLayer(_tempRowCol);
          // users pos not change
          if (_tempRowCol.row === dataComp._row && _tempRowCol.col === dataComp._col) return;
          self._removeUserNodeFromGrid(dataComp);
          self._addUserNodeToGrid(dataComp, _tempRowCol);
        }
        _removeUserNodeFromGrid(dataComp) {
          const row = dataComp._row;
          const col = dataComp._col;
          const index = dataComp._index;
          const rowData = this._userNodeGrid[row];
          const colData = rowData && rowData[col];
          if (colData) {
            rowData.count--;
            colData.count--;
            colData.list[index] = null;
            if (colData.count <= 0) {
              colData.list.length = 0;
              colData.count = 0;
            }
          }
          dataComp._row = -1;
          dataComp._col = -1;
          dataComp._index = -1;
          this._userNodeDirty = true;
          this.markForUpdateRenderData();
        }
        _limitInLayer(rowCol) {
          const row = rowCol.row;
          const col = rowCol.col;
          if (row < 0) rowCol.row = 0;
          if (row > this._rightTop.row) rowCol.row = this._rightTop.row;
          if (col < 0) rowCol.col = 0;
          if (col > this._rightTop.col) rowCol.col = this._rightTop.col;
        }
        _addUserNodeToGrid(dataComp, tempRowCol) {
          const row = tempRowCol.row;
          const col = tempRowCol.col;
          const rowData = this._userNodeGrid[row] = this._userNodeGrid[row] || {
            count: 0
          };
          const colData = rowData[col] = rowData[col] || {
            count: 0,
            list: []
          };
          dataComp._row = row;
          dataComp._col = col;
          dataComp._index = colData.list.length;
          rowData.count++;
          colData.count++;
          colData.list.push(dataComp);
          this._userNodeDirty = true;
        }
        isUserNodeDirty() {
          return this._userNodeDirty;
        }
        setUserNodeDirty(value) {
          this._userNodeDirty = value;
        }
        _reinstallCamera() {
          const camera = director.root.batcher2D.getFirstRenderCamera(this.node);
          const cameraNode = camera === null || camera === void 0 ? void 0 : camera.node;
          if (this._cameraNode !== cameraNode) {
            this._uninstallCamera();
            if (cameraNode) {
              cameraNode.on(NodeEventType.TRANSFORM_CHANGED, this.updateCulling, this);
              cameraNode.on(NodeEventType.SIZE_CHANGED, this.updateCulling, this);
              this._cameraNode = cameraNode;
            }
          }
          return camera;
        }
        _uninstallCamera() {
          if (this._cameraNode) {
            this._cameraNode.off(NodeEventType.TRANSFORM_CHANGED, this.updateCulling, this);
            this._cameraNode.off(NodeEventType.SIZE_CHANGED, this.updateCulling, this);
            delete this._cameraNode;
          }
        }
        onEnable() {
          super.onEnable();
          this.node.on(NodeEventType.ANCHOR_CHANGED, this._syncAnchorPoint, this);
          this.node.on(NodeEventType.TRANSFORM_CHANGED, this.updateCulling, this);
          this.node.on(NodeEventType.SIZE_CHANGED, this.updateCulling, this);
          this.node.parent.on(NodeEventType.TRANSFORM_CHANGED, this.updateCulling, this);
          this.node.parent.on(NodeEventType.SIZE_CHANGED, this.updateCulling, this);
          this.markForUpdateRenderData();
          // delay 1 frame, since camera's matrix data is dirty
          this.scheduleOnce(this.updateCulling.bind(this));
        }
        onDisable() {
          var _this$node$parent, _this$node$parent2;
          super.onDisable();
          (_this$node$parent = this.node.parent) === null || _this$node$parent === void 0 ? void 0 : _this$node$parent.off(NodeEventType.SIZE_CHANGED, this.updateCulling, this);
          (_this$node$parent2 = this.node.parent) === null || _this$node$parent2 === void 0 ? void 0 : _this$node$parent2.off(NodeEventType.TRANSFORM_CHANGED, this.updateCulling, this);
          this.node.off(NodeEventType.SIZE_CHANGED, this.updateCulling, this);
          this.node.off(NodeEventType.TRANSFORM_CHANGED, this.updateCulling, this);
          this.node.off(NodeEventType.ANCHOR_CHANGED, this._syncAnchorPoint, this);
          this._uninstallCamera();
        }
        _syncAnchorPoint() {
          const node = this.node;
          const trans = node._uiProps.uiTransformComp;
          const scale = node.getScale();
          this._leftDownToCenterX = trans.width * trans.anchorX * scale.x;
          this._leftDownToCenterY = trans.height * trans.anchorY * scale.y;
          this._cullingDirty = true;
          this.markForUpdateRenderData();
        }

        /**
          * @en Gets the layer name.
          * @zh 获取层的名称。
          * @method getLayerName
          * @return {String}
          * @example
          * let layerName = tiledLayer.getLayerName();
          * cc.log(layerName);
          */
        getLayerName() {
          return this._layerName;
        }

        /**
          * @en Set the layer name.
          * @zh 设置层的名称
          * @method setLayerName
          * @param {String} layerName
          * @example
          * tiledLayer.setLayerName("New Layer");
          */
        setLayerName(layerName) {
          this._layerName = layerName;
        }

        /**
          * @en Return the value for the specific property name.
          * @zh 获取指定属性名的值。
          * @method getProperty
          * @param {String} propertyName
          * @return {*}
          * @example
          * let property = tiledLayer.getProperty("info");
          * cc.log(property);
          */
        getProperty(propertyName) {
          return this._properties[propertyName];
        }

        /**
          * @en Returns the position in pixels of a given tile coordinate.
          * @zh 获取指定 tile 的像素坐标。
          * @method getPositionAt
          * @param {Vec2|Number} pos position or x
          * @param {Number} [y]
          * @return {Vec2}
          * @example
          * let pos = tiledLayer.getPositionAt(cc.v2(0, 0));
          * cc.log("Pos: " + pos);
          * let pos = tiledLayer.getPositionAt(0, 0);
          * cc.log("Pos: " + pos);
          */
        getPositionAt(pos, y) {
          let x;
          if (y !== undefined) {
            x = Math.floor(pos);
            y = Math.floor(y);
          } else {
            x = Math.floor(pos.x);
            y = Math.floor(pos.y);
          }
          switch (this._layerOrientation) {
            case Orientation.ORTHO:
              return this._positionForOrthoAt(x, y);
            case Orientation.ISO:
              return this._positionForIsoAt(x, y);
            case Orientation.HEX:
              return this._positionForHexAt(x, y);
          }
          return null;
        }
        isInvalidPosition(x, y) {
          return x >= this._layerSize.width || y >= this._layerSize.height || x < 0 || y < 0;
        }
        _positionForIsoAt(x, y) {
          let offsetX = 0;
          let offsetY = 0;
          const index = Math.floor(x) + Math.floor(y) * this._layerSize.width;
          const gidAndFlags = this.tiles[index];
          if (gidAndFlags) {
            const gid = (gidAndFlags & TileFlag.FLIPPED_MASK) >>> 0;
            const tileset = this.texGrids.get(gid).tileset;
            const offset = tileset.tileOffset;
            offsetX = offset.x;
            offsetY = offset.y;
          }
          return new Vec2(this._mapTileSize.width * 0.5 * (this._layerSize.height + x - y - 1) + offsetX, this._mapTileSize.height * 0.5 * (this._layerSize.width - x + this._layerSize.height - y - 2) - offsetY);
        }
        _positionForOrthoAt(x, y) {
          let offsetX = 0;
          let offsetY = 0;
          const index = Math.floor(x) + Math.floor(y) * this._layerSize.width;
          const gidAndFlags = this.tiles[index];
          if (gidAndFlags) {
            const gid = (gidAndFlags & TileFlag.FLIPPED_MASK) >>> 0;
            const tileset = this.texGrids.get(gid).tileset;
            const offset = tileset.tileOffset;
            offsetX = offset.x;
            offsetY = offset.y;
          }
          return new Vec2(x * this._mapTileSize.width + offsetX, (this._layerSize.height - y - 1) * this._mapTileSize.height - offsetY);
        }
        _positionForHexAt(col, row) {
          const tileWidth = this._mapTileSize.width;
          const tileHeight = this._mapTileSize.height;
          const rows = this._layerSize.height;
          const index = Math.floor(col) + Math.floor(row) * this._layerSize.width;
          const gid = (this.tiles[index] & TileFlag.FLIPPED_MASK) >>> 0;
          let offset;
          if (this.texGrids.get(gid)) {
            offset = this.texGrids.get(gid).tileset.tileOffset;
          } else {
            offset = {
              x: 0,
              y: 0
            };
          }
          const odd_even = this._staggerIndex === StaggerIndex.STAGGERINDEX_ODD ? 1 : -1;
          let x = 0;
          let y = 0;
          let diffX = 0;
          let diffY = 0;
          switch (this._staggerAxis) {
            case StaggerAxis.STAGGERAXIS_Y:
              diffX = 0;
              if (row % 2 === 1) {
                diffX = tileWidth / 2 * odd_even;
              }
              x = col * tileWidth + diffX + offset.x;
              y = (rows - row - 1) * (tileHeight - (tileHeight - this._hexSideLength) / 2) - offset.y;
              break;
            case StaggerAxis.STAGGERAXIS_X:
              diffY = 0;
              if (col % 2 === 1) {
                diffY = tileHeight / 2 * -odd_even;
              }
              x = col * (tileWidth - (tileWidth - this._hexSideLength) / 2) + offset.x;
              y = (rows - row - 1) * tileHeight + diffY - offset.y;
              break;
          }
          return new Vec2(x, y);
        }

        /**
          * @en
          * Sets the tiles gid (gid = tile global id) at a given tiles rect.
          * @zh
          * 设置给定区域的 tile 的 gid (gid = tile 全局 id)，
          * @method setTilesGIDAt
          * @param {Array} gids an array contains gid
          * @param {Number} beginCol begin col number
          * @param {Number} beginRow begin row number
          * @param {Number} totalCols count of column
          * @example
          * tiledLayer.setTilesGIDAt([1, 1, 1, 1], 10, 10, 2)
          */
        setTilesGIDAt(gids, beginCol, beginRow, totalCols) {
          if (!gids || gids.length === 0 || totalCols <= 0) return;
          if (beginRow < 0) beginRow = 0;
          if (beginCol < 0) beginCol = 0;
          let gidsIdx = 0;
          const endCol = beginCol + totalCols;
          for (let row = beginRow;; row++) {
            for (let col = beginCol; col < endCol; col++) {
              if (gidsIdx >= gids.length) return;
              this._updateTileForGID(gids[gidsIdx], col, row);
              gidsIdx++;
            }
          }
        }

        /**
          * @en
          * Sets the tile gid (gid = tile global id) at a given tile coordinate.<br />
          * The Tile GID can be obtained by using the method "tileGIDAt" or by using the TMX editor . Tileset Mgr +1.<br />
          * If a tile is already placed at that position, then it will be removed.
          * @zh
          * 设置给定坐标的 tile 的 gid (gid = tile 全局 id)，
          * tile 的 GID 可以使用方法 “tileGIDAt” 来获得。<br />
          * 如果一个 tile 已经放在那个位置，那么它将被删除。
          * @method setTileGIDAt
          * @param {Number} gid
          * @param {Vec2|Number} posOrX position or x
          * @param {Number} flagsOrY flags or y
          * @param {Number} [flags]
          * @example
          * tiledLayer.setTileGIDAt(1001, 10, 10, 1)
          */
        setTileGIDAt(gid, x, y, flags) {
          const ugid = (gid & TileFlag.FLIPPED_MASK) >>> 0;
          x = Math.floor(x);
          y = Math.floor(y);
          if (this.isInvalidPosition(x, y)) {
            throw new Error('cc.TiledLayer.setTileGIDAt(): invalid position');
          }
          if (!this.tiles || !this._tilesets || this._tilesets.length === 0) {
            logID(7238);
            return;
          }
          if (ugid !== 0 && ugid < this._tilesets[0].firstGid) {
            logID(7239, gid);
            return;
          }
          flags = flags || 0;
          this._updateTileForGID((ugid | flags) >>> 0, x, y);
        }
        _updateTileForGID(gidAndFlags, x, y) {
          const idx = 0 | x + y * this._layerSize.width;
          if (idx >= this.tiles.length) return;
          const oldGIDAndFlags = this.tiles[idx];
          if (gidAndFlags === oldGIDAndFlags) return;
          const gid = (gidAndFlags & TileFlag.FLIPPED_MASK) >>> 0;
          const grid = this.texGrids.get(gid);
          if (grid) {
            this.tiles[idx] = gidAndFlags;
            this._updateVertex(x, y);
          } else {
            this.tiles[idx] = 0;
          }
          this._cullingDirty = true;
        }

        /**
          * @en
          * Returns the tile gid at a given tile coordinate. <br />
          * if it returns 0, it means that the tile is empty. <br />
          * @zh
          * 通过给定的 tile 坐标、flags（可选）返回 tile 的 GID. <br />
          * 如果它返回 0，则表示该 tile 为空。<br />
          * @method getTileGIDAt
          * @param {Vec2} pos
          * @return {Number}
          * @example
          * let tileGid = tiledLayer.getTileGIDAt(0, 0);
          */
        getTileGIDAt(x, y) {
          if (this.isInvalidPosition(x, y)) {
            throw new Error('cc.TiledLayer.getTileGIDAt(): invalid position');
          }
          if (!this.tiles) {
            logID(7237);
            return null;
          }
          const index = Math.floor(x) + Math.floor(y) * this._layerSize.width;
          // Bits on the far end of the 32-bit global tile ID are used for tile flags
          const tile = this.tiles[index];
          return (tile & TileFlag.FLIPPED_MASK) >>> 0;
        }
        /**
          * @en
          * Returns the tile flags at a given tile coordinate. <br />
          * @zh
          * 通过给定的 tile 坐标, 返回 tile 的 flags. <br />
          * 如果它返回 null，则表示该 tile 为空。<br />
          * @method getTileGIDAt
          * @param {number}} x
          * @param {number}} y
          * @return {Number}
          * @example
          * let tileGid = tiledLayer.getTileGIDAt(0, 0);
          */
        getTileFlagsAt(x, y) {
          if (this.isInvalidPosition(x, y)) {
            throw new Error('TiledLayer.getTileFlagsAt: invalid position');
          }
          if (!this.tiles) {
            logID(7240);
            return null;
          }
          const idx = Math.floor(x) + Math.floor(y) * this._layerSize.width;
          // Bits on the far end of the 32-bit global tile ID are used for tile flags
          const tile = this.tiles[idx];
          return (tile & TileFlag.FLIPPED_ALL) >>> 0;
        }
        setCullingDirty(value) {
          this._cullingDirty = value;
        }
        isCullingDirty() {
          return this._cullingDirty;
        }

        // 'x, y' is the position of viewPort, which's anchor point is at the center of rect.
        // 'width, height' is the size of viewPort.
        updateViewPort(x, y, width, height) {
          if (this._viewPort.width === width && this._viewPort.height === height && this._viewPort.x === x && this._viewPort.y === y) {
            return;
          }
          this._viewPort.x = x;
          this._viewPort.y = y;
          this._viewPort.width = width;
          this._viewPort.height = height;

          // if map's type is iso, reserve bottom line is 2 to avoid show empty grid because of iso grid arithmetic
          let reserveLine = 1;
          if (this._layerOrientation === Orientation.ISO) {
            reserveLine = 2;
          }
          const vpx = this._viewPort.x - this._offset.x + this._leftDownToCenterX;
          const vpy = this._viewPort.y - this._offset.y + this._leftDownToCenterY;
          let leftDownX = vpx - this._leftOffset;
          let leftDownY = vpy - this._downOffset;
          const rightTopX = vpx + width + this._rightOffset;
          const rightTopY = vpy + height + this._topOffset;
          const leftDown = this._cullingRect.leftDown;
          const rightTop = this._cullingRect.rightTop;
          if (leftDownX < 0) leftDownX = 0;
          if (leftDownY < 0) leftDownY = 0;

          // calc left down
          this._positionToRowCol(leftDownX, leftDownY, _tempRowCol);
          // make range large
          _tempRowCol.row -= reserveLine;
          _tempRowCol.col -= reserveLine;
          // insure left down row col greater than 0
          _tempRowCol.row = _tempRowCol.row > 0 ? _tempRowCol.row : 0;
          _tempRowCol.col = _tempRowCol.col > 0 ? _tempRowCol.col : 0;
          if (_tempRowCol.row !== leftDown.row || _tempRowCol.col !== leftDown.col) {
            leftDown.row = _tempRowCol.row;
            leftDown.col = _tempRowCol.col;
            this._cullingDirty = true;
          }

          // show nothing
          if (rightTopX < 0 || rightTopY < 0) {
            _tempRowCol.row = -1;
            _tempRowCol.col = -1;
          } else {
            // calc right top
            this._positionToRowCol(rightTopX, rightTopY, _tempRowCol);
            // make range large
            _tempRowCol.row++;
            _tempRowCol.col++;
          }
          if (_tempRowCol.row !== rightTop.row || _tempRowCol.col !== rightTop.col) {
            rightTop.row = _tempRowCol.row;
            rightTop.col = _tempRowCol.col;
            this._cullingDirty = true;
          }
          if (this._cullingDirty) this.markForUpdateRenderData();
        }

        // the result may not precise, but it dose't matter, it just uses to be got range
        _positionToRowCol(x, y, result) {
          const maptw = this._mapTileSize.width;
          const mapth = this._mapTileSize.height;
          const maptw2 = maptw * 0.5;
          const mapth2 = mapth * 0.5;
          let row = 0;
          let col = 0;
          let diffX2 = 0;
          let diffY2 = 0;
          const axis = this._staggerAxis;
          switch (this._layerOrientation) {
            // left top to right dowm
            case Orientation.ORTHO:
              col = Math.floor(x / maptw);
              row = Math.floor(y / mapth);
              break;
            // right top to left down
            // iso can be treat as special hex whose hex side length is 0
            case Orientation.ISO:
              col = Math.floor(x / maptw2);
              row = Math.floor(y / mapth2);
              break;
            // left top to right dowm
            case Orientation.HEX:
              if (axis === StaggerAxis.STAGGERAXIS_Y) {
                row = Math.floor(y / (mapth - this._diffY1));
                diffX2 = row % 2 === 1 ? maptw2 * this._odd_even : 0;
                col = Math.floor((x - diffX2) / maptw);
              } else {
                col = Math.floor(x / (maptw - this._diffX1));
                diffY2 = col % 2 === 1 ? mapth2 * -this._odd_even : 0;
                row = Math.floor((y - diffY2) / mapth);
              }
              break;
          }
          result.row = row;
          result.col = col;
          return result;
        }
        updateCulling() {
          if (EDITOR_NOT_IN_PREVIEW) {
            this.enableCulling = false;
          } else if (this._enableCulling) {
            this.node.updateWorldTransform();
            Mat4.invert(_mat4_temp, this.node.getWorldMatrix());
            const camera = this._reinstallCamera(); // developer should call updateCalling if the camera has changed
            if (camera) {
              _vec3_temp.x = 0;
              _vec3_temp.y = 0;
              _vec3_temp.z = 0;
              _vec3_temp2.x = camera.width;
              _vec3_temp2.y = camera.height;
              _vec3_temp2.z = 0;
              camera.screenToWorld(_vec3_temp, _vec3_temp);
              camera.screenToWorld(_vec3_temp2, _vec3_temp2);
              // camera.getScreenToWorldPoint(_vec2_temp, _vec2_temp);
              // camera.getScreenToWorldPoint(_vec2_temp2, _vec2_temp2);
              Vec3.transformMat4(_vec3_temp, _vec3_temp, _mat4_temp);
              Vec3.transformMat4(_vec3_temp2, _vec3_temp2, _mat4_temp);
              this.updateViewPort(_vec3_temp.x, _vec3_temp.y, _vec3_temp2.x - _vec3_temp.x, _vec3_temp2.y - _vec3_temp.y);
            }
          }
        }

        /**
          * @en Layer orientation, which is the same as the map orientation.
          * @zh 获取 Layer 方向(同地图方向)。
          * @method getLayerOrientation
          * @return {Number}
          * @example
          * let orientation = tiledLayer.getLayerOrientation();
          * cc.log("Layer Orientation: " + orientation);
          */
        getLayerOrientation() {
          return this._layerOrientation;
        }

        /**
          * @en properties from the layer. They can be added using Tiled.
          * @zh 获取 layer 的属性，可以使用 Tiled 编辑器添加属性。
          * @method getProperties
          * @return {Object}
          * @example
          * let properties = tiledLayer.getProperties();
          * cc.log("Properties: " + properties);
          */
        getProperties() {
          return this._properties;
        }
        _updateVertex(col, row) {
          const FLIPPED_MASK = TileFlag.FLIPPED_MASK;
          const vertices = this.vertices;
          const layerOrientation = this._layerOrientation;
          const tiles = this.tiles;
          if (!tiles) {
            return;
          }
          const rightTop = this._rightTop;
          const maptw = this._mapTileSize.width;
          const mapth = this._mapTileSize.height;
          const maptw2 = maptw * 0.5;
          const mapth2 = mapth * 0.5;
          const rows = this._layerSize.height;
          const cols = this._layerSize.width;
          const grids = this.texGrids;
          let left = 0;
          let bottom = 0;
          let axis;
          let diffX1;
          let diffY1;
          let odd_even;
          let diffX2;
          let diffY2;
          if (layerOrientation === Orientation.HEX) {
            axis = this._staggerAxis;
            diffX1 = this._diffX1;
            diffY1 = this._diffY1;
            odd_even = this._odd_even;
          }
          let cullingCol = 0;
          let cullingRow = 0;
          let gridGID = 0;

          // grid border
          let topBorder = 0;
          let downBorder = 0;
          let leftBorder = 0;
          let rightBorder = 0;
          const index = row * cols + col;
          const gid = tiles[index];
          gridGID = (gid & FLIPPED_MASK) >>> 0;
          const grid = grids.get(gridGID);
          if (!grid) {
            return;
          }

          // if has animation, grid must be updated per frame
          if (this._animations.get(gridGID)) {
            this._hasAniGrid = this._hasAniGrid || true;
          }
          switch (layerOrientation) {
            // left top to right dowm
            case Orientation.ORTHO:
              cullingCol = col;
              cullingRow = rows - row - 1;
              left = cullingCol * maptw;
              bottom = cullingRow * mapth;
              break;
            // right top to left down
            case Orientation.ISO:
              // if not consider about col, then left is 'w/2 * (rows - row - 1)'
              // if consider about col then left must add 'w/2 * col'
              // so left is 'w/2 * (rows - row - 1) + w/2 * col'
              // combine expression is 'w/2 * (rows - row + col -1)'
              cullingCol = rows + col - row - 1;
              // if not consider about row, then bottom is 'h/2 * (cols - col -1)'
              // if consider about row then bottom must add 'h/2 * (rows - row - 1)'
              // so bottom is 'h/2 * (cols - col -1) + h/2 * (rows - row - 1)'
              // combine expressionn is 'h/2 * (rows + cols - col - row - 2)'
              cullingRow = rows + cols - col - row - 2;
              left = maptw2 * cullingCol;
              bottom = mapth2 * cullingRow;
              break;
            // left top to right dowm
            case Orientation.HEX:
              diffX2 = axis === StaggerAxis.STAGGERAXIS_Y && row % 2 === 1 ? maptw2 * odd_even : 0;
              diffY2 = axis === StaggerAxis.STAGGERAXIS_X && col % 2 === 1 ? mapth2 * -odd_even : 0;
              left = col * (maptw - diffX1) + diffX2;
              bottom = (rows - row - 1) * (mapth - diffY1) + diffY2;
              cullingCol = col;
              cullingRow = rows - row - 1;
              break;
          }
          const rowData = vertices[cullingRow] = vertices[cullingRow] || {
            minCol: 0,
            maxCol: 0
          };
          const colData = rowData[cullingCol] = rowData[cullingCol] || {
            left: 0,
            bottom: 0,
            index: 0
          };

          // record each row range, it will faster when culling grid
          if (rowData.minCol > cullingCol) {
            rowData.minCol = cullingCol;
          }
          if (rowData.maxCol < cullingCol) {
            rowData.maxCol = cullingCol;
          }

          // record max rect, when viewPort is bigger than layer, can make it smaller
          if (rightTop.row < cullingRow) {
            rightTop.row = cullingRow;
            if (layerOrientation === Orientation.ISO) {
              rightTop.row += 1;
            }
          }
          if (rightTop.col < cullingCol) {
            rightTop.col = cullingCol;
            if (layerOrientation === Orientation.ISO) {
              rightTop.col += 1;
            }
          }

          // _offset is whole layer offset
          // tileOffset is tileset offset which is related to each grid
          // tileOffset coordinate system's y axis is opposite with engine's y axis.
          const tileOffset = grid.tileset.tileOffset;
          left += this._offset.x + tileOffset.x + grid.offsetX;
          bottom += this._offset.y - tileOffset.y - grid.offsetY;
          topBorder = -tileOffset.y + grid.tileset._tileSize.height - mapth;
          topBorder = topBorder < 0 ? 0 : topBorder;
          downBorder = tileOffset.y < 0 ? 0 : tileOffset.y;
          leftBorder = -tileOffset.x < 0 ? 0 : -tileOffset.x;
          rightBorder = tileOffset.x + grid.tileset._tileSize.width - maptw;
          rightBorder = rightBorder < 0 ? 0 : rightBorder;
          if (this._rightOffset < leftBorder) {
            this._rightOffset = leftBorder;
          }
          if (this._leftOffset < rightBorder) {
            this._leftOffset = rightBorder;
          }
          if (this._topOffset < downBorder) {
            this._topOffset = downBorder;
          }
          if (this._downOffset < topBorder) {
            this._downOffset = topBorder;
          }
          colData.left = left;
          colData.bottom = bottom;
          // this index is tiledmap grid index
          colData.index = index;
          this._cullingDirty = true;
        }
        _updateVertices() {
          const vertices = this.vertices;
          vertices.length = 0;
          const tiles = this.tiles;
          if (!tiles) {
            return;
          }
          const rightTop = this._rightTop;
          rightTop.row = -1;
          rightTop.col = -1;
          const rows = this._layerSize.height;
          const cols = this._layerSize.width;
          this._topOffset = 0;
          this._downOffset = 0;
          this._leftOffset = 0;
          this._rightOffset = 0;
          this._hasAniGrid = false;
          for (let row = 0; row < rows; ++row) {
            for (let col = 0; col < cols; ++col) {
              this._updateVertex(col, row);
            }
          }
          this._verticesDirty = false;
        }

        /**
          * @en
          * Get the TiledTile with the tile coordinate.<br/>
          * If there is no tile in the specified coordinate and forceCreate parameter is true, <br/>
          * then will create a new TiledTile at the coordinate.
          * The renderer will render the tile with the rotation, scale, position and color property of the TiledTile.
          * @zh
          * 通过指定的 tile 坐标获取对应的 TiledTile。 <br/>
          * 如果指定的坐标没有 tile，并且设置了 forceCreate 那么将会在指定的坐标创建一个新的 TiledTile 。<br/>
          * 在渲染这个 tile 的时候，将会使用 TiledTile 的节点的旋转、缩放、位移、颜色属性。<br/>
          * @method getTiledTileAt
          * @param {Integer} x
          * @param {Integer} y
          * @param {Boolean} forceCreate
          * @return {cc.TiledTile}
          * @example
          * let tile = tiledLayer.getTiledTileAt(100, 100, true);
          * cc.log(tile);
          */
        getTiledTileAt(x, y, forceCreate) {
          if (this.isInvalidPosition(x, y)) {
            throw new Error('TiledLayer.getTiledTileAt: invalid position');
          }
          if (!this.tiles) {
            logID(7236);
            return null;
          }
          const index = Math.floor(x) + Math.floor(y) * this._layerSize.width;
          let tile = this.tiledTiles[index];
          if (!tile && forceCreate) {
            const node = new Node();
            tile = node.addComponent(TiledTile);
            tile._x = x;
            tile._y = y;
            tile._layer = this;
            tile.updateInfo();
            node.parent = this.node;
            return tile;
          }
          return tile;
        }

        /**
          * @en
          * Change tile to TiledTile at the specified coordinate.
          * @zh
          * 将指定的 tile 坐标替换为指定的 TiledTile。
          * @method setTiledTileAt
          * @param {Integer} x
          * @param {Integer} y
          * @param {cc.TiledTile} tiledTile
          * @return {cc.TiledTile}
          */
        setTiledTileAt(x, y, tiledTile) {
          if (this.isInvalidPosition(x, y)) {
            throw new Error('TiledLayer.setTiledTileAt: invalid position');
          }
          if (!this.tiles) {
            logID(7236);
            return null;
          }
          const index = Math.floor(x) + Math.floor(y) * this._layerSize.width;
          this.tiledTiles[index] = tiledTile;
          this._cullingDirty = true;
          if (tiledTile) {
            this._hasTiledNodeGrid = true;
          } else {
            this._hasTiledNodeGrid = this.tiledTiles.some(tiledNode => !!tiledNode);
          }
          return tiledTile;
        }

        /**
          * @en Return texture.
          * @zh 获取纹理。
          * @method getTexture
          * @param index The index of textures
          * @return {Texture2D}
          */
        getTexture(index) {
          index = index || 0;
          if (this._textures && index >= 0 && this._textures.length > index) {
            return this._textures[index];
          }
          return null;
        }

        /**
          * @en Return texture.
          * @zh 获取纹理。
          * @method getTextures
          * @return {Texture2D}
          */
        getTextures() {
          return this._textures;
        }

        /**
          * @en Set the texture.
          * @zh 设置纹理。
          * @method setTexture
          * @param {SpriteFrame} texture
          */
        setTexture(texture) {
          this.setTextures([texture]);
        }

        /**
          * @en Set the texture.
          * @zh 设置纹理。
          * @method setTexture
          * @param {SpriteFrame} textures
          */
        setTextures(textures) {
          this._textures = textures;
          this.markForUpdateRenderData();
        }

        /**
          * @en Gets layer size.
          * @zh 获得层大小。
          * @method getLayerSize
          * @return {Size}
          * @example
          * let size = tiledLayer.getLayerSize();
          * cc.log("layer size: " + size);
          */
        getLayerSize() {
          return this._layerSize;
        }

        /**
          * @en Size of the map's tile (could be different from the tile's size).
          * @zh 获取 tile 的大小( tile 的大小可能会有所不同)。
          * @method getMapTileSize
          * @return {Size}
          * @example
          * let mapTileSize = tiledLayer.getMapTileSize();
          * cc.log("MapTile size: " + mapTileSize);
          */
        getMapTileSize() {
          return this._mapTileSize;
        }

        /**
          * @en Gets Tile set first information for the layer.
          * @zh 获取 layer 索引位置为0的 Tileset 信息。
          * @method getTileSet
          * @param index The index of tilesets
          * @return {TMXTilesetInfo}
          */
        getTileSet(index) {
          index = index || 0;
          if (this._tilesets && index >= 0 && this._tilesets.length > index) {
            return this._tilesets[index];
          }
          return null;
        }

        /**
          * @en Gets tile set all information for the layer.
          * @zh 获取 layer 所有的 Tileset 信息。
          * @method getTileSet
          * @return {TMXTilesetInfo}
          */
        getTileSets() {
          return this._tilesets;
        }

        /**
          * @en Sets tile set information for the layer.
          * @zh 设置 layer 的 tileset 信息。
          * @method setTileSet
          * @param {TMXTilesetInfo} tileset
          */
        setTileSet(tileset) {
          this.setTileSets([tileset]);
        }

        /**
          * @en Sets Tile set information for the layer.
          * @zh 设置 layer 的 Tileset 信息。
          * @method setTileSets
          * @param {TMXTilesetInfo} tilesets
          */
        setTileSets(tilesets) {
          this._tilesets = tilesets;
          const textures = this._textures = [];
          const texGrids = this.texGrids;
          texGrids.clear();
          for (let i = 0; i < tilesets.length; i++) {
            const tileset = tilesets[i];
            if (tileset) {
              textures[i] = tileset.sourceImage;
            }
          }
          for (let i = 0, l = tilesets.length; i < l; ++i) {
            const tilesetInfo = tilesets[i];
            if (!tilesetInfo) continue;
            fillTextureGrids(tilesetInfo, texGrids, tilesetInfo.sourceImage);
          }
          this._prepareToRender();
        }
        init(layerInfo, mapInfo, tilesets, textures, texGrids) {
          this._cullingDirty = true;
          this._layerInfo = layerInfo;
          this._mapInfo = mapInfo;
          const size = layerInfo.layerSize;

          // layerInfo
          this._layerName = layerInfo.name;
          this.tiles = layerInfo.tiles;
          this._properties = layerInfo.properties;
          this._layerSize = size;
          this._minGID = layerInfo.minGID;
          this._maxGID = layerInfo.maxGID;
          this._opacity = layerInfo.opacity;
          if (layerInfo.tintColor) {
            this._tintColor = layerInfo.tintColor;
            // this.node.color = this._tintColor;
          }

          this.renderOrder = mapInfo.renderOrder;
          this._staggerAxis = mapInfo.getStaggerAxis();
          this._staggerIndex = mapInfo.getStaggerIndex();
          this._hexSideLength = mapInfo.getHexSideLength();
          this._animations = mapInfo.getTileAnimations();

          // tilesets
          this._tilesets = tilesets;
          // textures
          this._textures = textures;
          // grid texture
          this.texGrids = texGrids;

          // mapInfo
          this._layerOrientation = mapInfo.orientation;
          this._mapTileSize = mapInfo.getTileSize();
          const maptw = this._mapTileSize.width;
          const mapth = this._mapTileSize.height;
          const layerW = this._layerSize.width;
          const layerH = this._layerSize.height;
          if (this._layerOrientation === Orientation.HEX) {
            let width = 0;
            let height = 0;
            const tileWidth = maptw & ~1;
            const tileHeight = mapth & ~1;
            this._odd_even = this._staggerIndex === StaggerIndex.STAGGERINDEX_ODD ? 1 : -1;
            if (this._staggerAxis === StaggerAxis.STAGGERAXIS_X) {
              this._diffX1 = (tileWidth - this._hexSideLength) / 2;
              this._diffY1 = 0;
              width = (this._diffX1 + this._hexSideLength) * layerW + this._diffX1;
              height = tileHeight * layerH + tileHeight / 2;
            } else {
              this._diffX1 = 0;
              this._diffY1 = (tileHeight - this._hexSideLength) / 2;
              width = tileWidth * layerW + tileWidth / 2;
              height = (this._diffY1 + this._hexSideLength) * layerH + this._diffY1;
            }
            this.node._uiProps.uiTransformComp.setContentSize(width, height);
          } else if (this._layerOrientation === Orientation.ISO) {
            const wh = layerW + layerH;
            this.node._uiProps.uiTransformComp.setContentSize(maptw * 0.5 * wh, mapth * 0.5 * wh);
          } else {
            this.node._uiProps.uiTransformComp.setContentSize(layerW * maptw, layerH * mapth);
          }

          // offset (after layer orientation is set);
          this._offset = new Vec2(layerInfo.offset.x, -layerInfo.offset.y);
          this._useAutomaticVertexZ = false;
          this._vertexZvalue = 0;
          this._syncAnchorPoint();
          this._prepareToRender();
        }
        _prepareToRender() {
          this._updateVertices();
          this._updateAllUserNode();
        }
        requestTiledRenderData() {
          const arr = this._tiledDataArray;
          while (arr.length > 0 && arr[arr.length - 1].subNodes && arr[arr.length - 1].subNodes.length === 0) {
            arr.pop();
          }
          if (arr.length > 0) {
            const last = arr[arr.length - 1];
            if (last.renderData && last.renderData.vertexCount === 0) {
              return last;
            }
          }
          const comb = {
            renderData: null,
            texture: null
          };
          this._tiledDataArray.push(comb);
          return comb;
        }
        requestSubNodesData() {
          const arr = this._tiledDataArray;
          if (arr.length > 0) {
            if (arr[arr.length - 1].subNodes && arr[arr.length - 1].subNodes.length === 0) {
              return arr[arr.length - 1];
            }
          }
          const renderData = [];
          const comb = {
            subNodes: renderData
          };
          this._tiledDataArray.push(comb);
          return comb;
        }
        destroyRenderData() {
          this._tiledDataArray.forEach(rd => {
            const renderData = rd.renderData;
            if (renderData) RenderData.remove(renderData);
          });
          this._tiledDataArray.length = 0;
          super.destroyRenderData();
        }
        _flushAssembler() {
          const assembler = TiledLayer.Assembler.getAssembler(this);
          if (this._assembler !== assembler) {
            this._assembler = assembler;
            this._assembler.createData(this);
          }
          if (this._tiledDataArray.length === 0) {
            this.markForUpdateRenderData();
            this._updateColor();
          }
        }
        _render(ui) {
          for (let i = 0; i < this._tiledDataArray.length; i++) {
            this._tiledDataArrayIdx = i;
            const m = this._tiledDataArray[i];
            if (m.subNodes) {
              // 提前处理 User Nodes
              m.subNodes.forEach(c => {
                if (c) ui.walk(c.node);
              });
            } else {
              const td = m;
              if (td.texture) {
                // NOTE: 由于 commitComp 只支持单张纹理, 故分多次提交
                ui.commitComp(this, td.renderData, td.texture, this._assembler, null);
              }
            }
          }
          this.node._static = true;
        }
        createRenderEntity() {
          return new RenderEntity(RenderEntityType.CROSSED);
        }
        fillIndicesBuffer(renderData, drawInfo) {
          const iBuf = renderData.chunk.meshBuffer.iData;
          let indexOffset = renderData.chunk.meshBuffer.indexOffset;
          drawInfo.setIndexOffset(indexOffset);
          let vertexId = renderData.chunk.vertexOffset;
          const quadCount = renderData.vertexCount / 4;
          for (let i = 0; i < quadCount; i += 1) {
            iBuf[indexOffset] = vertexId;
            iBuf[indexOffset + 1] = vertexId + 1;
            iBuf[indexOffset + 2] = vertexId + 2;
            iBuf[indexOffset + 3] = vertexId + 2;
            iBuf[indexOffset + 4] = vertexId + 1;
            iBuf[indexOffset + 5] = vertexId + 3;
            indexOffset += 6;
            vertexId += 4;
          }
          renderData.chunk.meshBuffer.indexOffset = indexOffset;
          drawInfo.setIBCount(quadCount * 6);
        }
        prepareDrawData() {
          this._drawInfoList.length = 0;
          const entity = this.renderEntity;
          entity.clearDynamicRenderDrawInfos();
          const tiledDataArray = this._tiledDataArray;
          let idx = 0;
          tiledDataArray.forEach(m => {
            if (m.subNodes) {
              // 提前处理 User Nodes
              m.subNodes.forEach(c => {
                if (c) {
                  if (!this._drawInfoList[idx]) {
                    this._drawInfoList[idx] = new RenderDrawInfo();
                  }
                  const drawInfo = this._drawInfoList[idx];
                  drawInfo.setDrawInfoType(RenderDrawInfoType.SUB_NODE);
                  drawInfo.setSubNode(c.node);
                  entity.setDynamicRenderDrawInfo(drawInfo, idx);
                  idx++;
                }
              });
            } else {
              const td = m;
              if (td.texture) {
                if (!this._drawInfoList[idx]) {
                  this._drawInfoList[idx] = new RenderDrawInfo();
                }
                const drawInfo = this._drawInfoList[idx];
                td.renderData.fillDrawInfoAttributes(drawInfo);
                drawInfo.setTexture(td.texture.getGFXTexture());
                drawInfo.setSampler(td.texture.getGFXSampler());
                drawInfo.setMaterial(this.getRenderMaterial(0));
                this.fillIndicesBuffer(td.renderData, drawInfo);
                entity.setDynamicRenderDrawInfo(drawInfo, idx);
                idx++;
              }
            }
          });
        }
      }) || _class3));
    }
  };
});