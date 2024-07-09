System.register("q-bundled:///fs/cocos/scene-graph/deprecated.js", ["../../../virtual/internal%253Aconstants.js", "../core/data/decorators/index.js", "../core/utils/x-deprecated.js", "./layers.js", "./node.js", "../core/math/vec2.js", "../core/math/size.js", "../core/global-exports.js", "../core/data/object.js", "../core/platform/debug.js", "./scene-globals.js", "../input/types/index.js", "../input/index.js", "./node-ui-properties.js"], function (_export, _context) {
  "use strict";

  var EDITOR, ccclass, replaceProperty, removeProperty, Layers, Node, Vec2, Size, legacyCC, CCObject, warnID, SceneGlobals, SystemEventType, SystemEvent, NodeUIProperties, _dec, _class, HideInHierarchy, DontSave, PrivateNode;
  function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
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
                                                                                                                                                                                                                                                                                                                                                                                            */
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
    }, function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
    }, function (_coreUtilsXDeprecatedJs) {
      replaceProperty = _coreUtilsXDeprecatedJs.replaceProperty;
      removeProperty = _coreUtilsXDeprecatedJs.removeProperty;
    }, function (_layersJs) {
      Layers = _layersJs.Layers;
    }, function (_nodeJs) {
      Node = _nodeJs.Node;
    }, function (_coreMathVec2Js) {
      Vec2 = _coreMathVec2Js.Vec2;
    }, function (_coreMathSizeJs) {
      Size = _coreMathSizeJs.Size;
    }, function (_coreGlobalExportsJs) {
      legacyCC = _coreGlobalExportsJs.legacyCC;
    }, function (_coreDataObjectJs) {
      CCObject = _coreDataObjectJs.CCObject;
    }, function (_corePlatformDebugJs) {
      warnID = _corePlatformDebugJs.warnID;
    }, function (_sceneGlobalsJs) {
      SceneGlobals = _sceneGlobalsJs.SceneGlobals;
    }, function (_inputTypesIndexJs) {
      SystemEventType = _inputTypesIndexJs.SystemEventType;
    }, function (_inputIndexJs) {
      SystemEvent = _inputIndexJs.SystemEvent;
    }, function (_nodeUiPropertiesJs) {
      NodeUIProperties = _nodeUiPropertiesJs.NodeUIProperties;
    }],
    execute: function () {
      replaceProperty(Node.prototype, 'Node', [{
        name: 'childrenCount',
        newName: 'children.length',
        customGetter: function customGetter() {
          return this.children.length;
        }
      }]);
      replaceProperty(Node.prototype, 'Node', [{
        name: 'width',
        targetName: 'node.getComponent(UITransform)',
        customGetter: function customGetter() {
          return this._uiProps.uiTransformComp.width;
        },
        customSetter: function customSetter(value) {
          this._uiProps.uiTransformComp.width = value;
        }
      }, {
        name: 'height',
        targetName: 'node.getComponent(UITransform)',
        customGetter: function customGetter() {
          return this._uiProps.uiTransformComp.height;
        },
        customSetter: function customSetter(value) {
          this._uiProps.uiTransformComp.height = value;
        }
      }, {
        name: 'anchorX',
        targetName: 'node.getComponent(UITransform)',
        customGetter: function customGetter() {
          return this._uiProps.uiTransformComp.anchorX;
        },
        customSetter: function customSetter(value) {
          this._uiProps.uiTransformComp.anchorX = value;
        }
      }, {
        name: 'anchorY',
        targetName: 'node.getComponent(UITransform)',
        customGetter: function customGetter() {
          return this._uiProps.uiTransformComp.anchorY;
        },
        customSetter: function customSetter(value) {
          this._uiProps.uiTransformComp.anchorY = value;
        }
      }, {
        name: 'getAnchorPoint',
        targetName: 'node.getComponent(UITransform)',
        customFunction: function customFunction(out) {
          if (!out) {
            out = new Vec2();
          }
          out.set(this._uiProps.uiTransformComp.anchorPoint);
          return out;
        }
      }, {
        name: 'setAnchorPoint',
        targetName: 'node.getComponent(UITransform)',
        customFunction: function customFunction(point, y) {
          this._uiProps.uiTransformComp.setAnchorPoint(point, y);
        }
      }, {
        name: 'getContentSize',
        targetName: 'node.getComponent(UITransform)',
        customFunction: function customFunction(out) {
          if (!out) {
            out = new Size();
          }
          out.set(this._uiProps.uiTransformComp.contentSize);
          return out;
        }
      }, {
        name: 'setContentSize',
        targetName: 'node.getComponent(UITransform)',
        customFunction: function customFunction(size, height) {
          if (typeof size === 'number') {
            this._uiProps.uiTransformComp.setContentSize(size, height);
          } else {
            this._uiProps.uiTransformComp.setContentSize(size);
          }
        }
      }]);
      removeProperty(SceneGlobals.prototype, 'SceneGlobals.prototype', [{
        name: 'aspect'
      }, {
        name: 'selfShadow'
      }, {
        name: 'linear'
      }, {
        name: 'packing'
      }, {
        name: 'autoAdapt'
      }, {
        name: 'fixedArea'
      }, {
        name: 'pcf'
      }, {
        name: 'bias'
      }, {
        name: 'normalBias'
      }, {
        name: 'near'
      }, {
        name: 'far'
      }, {
        name: 'shadowDistance'
      }, {
        name: 'invisibleOcclusionRange'
      }, {
        name: 'orthoSize'
      }, {
        name: 'saturation'
      }]);
      replaceProperty(SceneGlobals.prototype, 'SceneGlobals.prototype', [{
        name: 'distance',
        newName: 'planeHeight'
      }, {
        name: 'normal',
        newName: 'planeDirection'
      }, {
        name: 'size',
        newName: 'shadowMapSize'
      }]);
      removeProperty(Node.prototype, 'Node.prototype', [{
        name: 'addLayer'
      }, {
        name: 'removeLayer'
      }]);
      replaceProperty(NodeUIProperties.prototype, 'NodeUIProperties', [{
        name: 'opacityDirty',
        newName: 'colorDirty'
      }]);
      removeProperty(Layers, 'Layers', [{
        name: 'All'
      }, {
        name: 'RaycastMask'
      }, {
        name: 'check'
      }]);
      replaceProperty(Layers, 'Layers', [{
        name: 'Default',
        newName: 'DEFAULT',
        target: Layers.Enum,
        targetName: 'Layers.Enum'
      }, {
        name: 'Always',
        newName: 'ALWAYS',
        target: Layers.Enum,
        targetName: 'Layers.Enum'
      }, {
        name: 'IgnoreRaycast',
        newName: 'IGNORE_RAYCAST',
        target: Layers.Enum,
        targetName: 'Layers.Enum'
      }, {
        name: 'Gizmos',
        newName: 'GIZMOS',
        target: Layers.Enum,
        targetName: 'Layers.Enum'
      }, {
        name: 'Editor',
        newName: 'EDITOR',
        target: Layers.Enum,
        targetName: 'Layers.Enum'
      }, {
        name: 'UI',
        newName: 'UI_3D',
        target: Layers.Enum,
        targetName: 'Layers.Enum'
      }, {
        name: 'UI2D',
        newName: 'UI_2D',
        target: Layers.Enum,
        targetName: 'Layers.Enum'
      }, {
        name: 'SceneGizmo',
        newName: 'SCENE_GIZMO',
        target: Layers.Enum,
        targetName: 'Layers.Enum'
      }, {
        name: 'makeInclusiveMask',
        newName: 'makeMaskInclude',
        target: Layers,
        targetName: 'Layers'
      }, {
        name: 'makeExclusiveMask',
        newName: 'makeMaskExclude',
        target: Layers,
        targetName: 'Layers'
      }]);
      removeProperty(Layers.Enum, 'Layers.Enum', [{
        name: 'ALWAYS'
      }]);
      removeProperty(Layers.BitMask, 'Layers.BitMask', [{
        name: 'ALWAYS'
      }]);
      HideInHierarchy = CCObject.Flags.HideInHierarchy;
      DontSave = CCObject.Flags.DontSave;
      /**
       * @internal
       * @deprecated since v3.5
       */
      _export("PrivateNode", PrivateNode = (_dec = ccclass('cc.PrivateNode'), _dec(_class = /*#__PURE__*/function (_Node) {
        _inheritsLoose(PrivateNode, _Node);
        function PrivateNode(name) {
          var _this;
          _this = _Node.call(this, name) || this;
          warnID(12003, _this.name);
          _this.hideFlags |= DontSave | HideInHierarchy;
          return _this;
        }
        return PrivateNode;
      }(Node)) || _class));
      if (EDITOR) {
        // check components to avoid missing node reference serialied in previous version
        PrivateNode.prototype._onBatchCreated = function onBatchCreated(dontSyncChildPrefab) {
          for (var _iterator = _createForOfIteratorHelperLoose(this._components), _step; !(_step = _iterator()).done;) {
            var comp = _step.value;
            comp.node = this;
          }
          Node.prototype._onBatchCreated.call(this, dontSyncChildPrefab);
        };
      }
      replaceProperty(SystemEventType, 'SystemEventType', ['MOUSE_ENTER', 'MOUSE_LEAVE', 'TRANSFORM_CHANGED', 'SCENE_CHANGED_FOR_PERSISTS', 'SIZE_CHANGED', 'ANCHOR_CHANGED', 'COLOR_CHANGED', 'CHILD_ADDED', 'CHILD_REMOVED', 'PARENT_CHANGED', 'NODE_DESTROYED', 'LAYER_CHANGED', 'SIBLING_ORDER_CHANGED'].map(function (name) {
        return {
          name: name,
          target: Node.EventType,
          targetName: 'Node.EventType'
        };
      }));
      replaceProperty(Node.EventType, 'Node.EventType', [{
        name: 'DEVICEMOTION',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType'
      }, {
        name: 'KEY_DOWN',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType'
      }, {
        name: 'KEY_UP',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType'
      }]);
      legacyCC.PrivateNode = PrivateNode;
    }
  };
});