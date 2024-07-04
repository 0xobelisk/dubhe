System.register("q-bundled:///fs/cocos/scene-graph/node.js", ["../core/data/decorators/index.js", "../../../virtual/internal%253Aconstants.js", "./layers.js", "./node-ui-properties.js", "../core/global-exports.js", "./node-dev.js", "../core/math/index.js", "./node-enum.js", "../core/data/index.js", "../core/platform/debug.js", "./component.js", "../core/data/decorators/property.js", "../core/index.js", "./node-event.js"], function (_export, _context) {
  "use strict";

  var ccclass, editable, serializable, type, DEV, DEBUG, EDITOR, EDITOR_NOT_IN_PREVIEW, Layers, NodeUIProperties, legacyCC, nodePolyfill, approx, EPSILON, Mat3, Mat4, Quat, Vec3, MobilityMode, NodeSpace, TransformBit, editorExtrasTag, serializeTag, errorID, warnID, error, log, getError, Component, property, CCObject, js, NodeEventType, _dec, _dec2, _dec3, _class, _class2, _initializer, _initializer2, _initializer3, _initializer4, _initializer5, _initializer6, _initializer7, _initializer8, _initializer9, _initializer10, _initializer11, _class3, Destroying, DontDestroy, Deactivating, TRANSFORM_ON, idGenerator, v3_a, v3_b, q_a, q_b, qt_1, m3_1, m3_scaling, m4_1, m4_2, dirtyNodes, reserveContentsForAllSyncablePrefabTag, globalFlagChangeVersion, Node;
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
  function getConstructor(typeOrClassName) {
    if (!typeOrClassName) {
      errorID(3804);
      return null;
    }
    if (typeof typeOrClassName === 'string') {
      return js.getClassByName(typeOrClassName);
    }
    return typeOrClassName;
  }
  return {
    setters: [function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
      editable = _coreDataDecoratorsIndexJs.editable;
      serializable = _coreDataDecoratorsIndexJs.serializable;
      type = _coreDataDecoratorsIndexJs.type;
    }, function (_virtualInternal253AconstantsJs) {
      DEV = _virtualInternal253AconstantsJs.DEV;
      DEBUG = _virtualInternal253AconstantsJs.DEBUG;
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
      EDITOR_NOT_IN_PREVIEW = _virtualInternal253AconstantsJs.EDITOR_NOT_IN_PREVIEW;
    }, function (_layersJs) {
      Layers = _layersJs.Layers;
    }, function (_nodeUiPropertiesJs) {
      NodeUIProperties = _nodeUiPropertiesJs.NodeUIProperties;
    }, function (_coreGlobalExportsJs) {
      legacyCC = _coreGlobalExportsJs.legacyCC;
    }, function (_nodeDevJs) {
      nodePolyfill = _nodeDevJs.nodePolyfill;
    }, function (_coreMathIndexJs) {
      approx = _coreMathIndexJs.approx;
      EPSILON = _coreMathIndexJs.EPSILON;
      Mat3 = _coreMathIndexJs.Mat3;
      Mat4 = _coreMathIndexJs.Mat4;
      Quat = _coreMathIndexJs.Quat;
      Vec3 = _coreMathIndexJs.Vec3;
    }, function (_nodeEnumJs) {
      MobilityMode = _nodeEnumJs.MobilityMode;
      NodeSpace = _nodeEnumJs.NodeSpace;
      TransformBit = _nodeEnumJs.TransformBit;
    }, function (_coreDataIndexJs) {
      editorExtrasTag = _coreDataIndexJs.editorExtrasTag;
      serializeTag = _coreDataIndexJs.serializeTag;
    }, function (_corePlatformDebugJs) {
      errorID = _corePlatformDebugJs.errorID;
      warnID = _corePlatformDebugJs.warnID;
      error = _corePlatformDebugJs.error;
      log = _corePlatformDebugJs.log;
      getError = _corePlatformDebugJs.getError;
    }, function (_componentJs) {
      Component = _componentJs.Component;
    }, function (_coreDataDecoratorsPropertyJs) {
      property = _coreDataDecoratorsPropertyJs.property;
    }, function (_coreIndexJs) {
      CCObject = _coreIndexJs.CCObject;
      js = _coreIndexJs.js;
    }, function (_nodeEventJs) {
      NodeEventType = _nodeEventJs.NodeEventType;
    }],
    execute: function () {
      Destroying = CCObject.Flags.Destroying;
      DontDestroy = CCObject.Flags.DontDestroy;
      Deactivating = CCObject.Flags.Deactivating;
      _export("TRANSFORM_ON", TRANSFORM_ON = 1 << 0);
      idGenerator = new js.IDGenerator('Node');
      v3_a = new Vec3();
      v3_b = new Vec3();
      q_a = new Quat();
      q_b = new Quat();
      qt_1 = new Quat();
      m3_1 = new Mat3();
      m3_scaling = new Mat3();
      m4_1 = new Mat4();
      m4_2 = new Mat4();
      dirtyNodes = [];
      reserveContentsForAllSyncablePrefabTag = Symbol('ReserveContentsForAllSyncablePrefab');
      globalFlagChangeVersion = 0;
      /**
       * @zh
       * 场景树中的基本节点，基本特性有：
       * * 具有层级关系
       * * 持有各类组件
       * * 维护空间变换（坐标、旋转、缩放）信息
       */
      /**
       * @en
       * Class of all entities in Cocos Creator scenes.
       * Basic functionalities include:
       * * Hierarchy management with parent and children
       * * Components management
       * * Coordinate system with position, scale, rotation in 3d space
       * @zh
       * Cocos Creator 场景中的所有节点类。
       * 基本特性有：
       * * 具有层级关系
       * * 持有各类组件
       * * 维护 3D 空间左边变换（坐标、旋转、缩放）信息
       */
      _export("Node", Node = (_dec = ccclass('cc.Node'), _dec2 = type(Vec3), _dec3 = type(MobilityMode), _dec(_class = (_class2 = (_class3 = /*#__PURE__*/function (_CCObject) {
        _inheritsLoose(Node, _CCObject);
        var _proto = Node.prototype;
        /**
         * @engineInternal please don't use this method.
         */
        _proto._setActiveInHierarchy = function _setActiveInHierarchy(v) {
          this._activeInHierarchy = v;
        }

        /**
         * @en Indicates whether this node is active in the scene.
         * @zh 表示此节点是否在场景中激活。
         */;
        /**
         * Call `_updateScene` of specified node.
         * @internal
         * @param node The node.
         */
        Node._setScene = function _setScene(node) {
          node._updateScene();
        };
        Node._findComponent = function _findComponent(node, constructor) {
          var cls = constructor;
          var comps = node._components;
          // NOTE: internal rtti property
          if (cls._sealed) {
            for (var i = 0; i < comps.length; ++i) {
              var comp = comps[i];
              if (comp.constructor === constructor) {
                return comp;
              }
            }
          } else {
            for (var _i = 0; _i < comps.length; ++_i) {
              var _comp = comps[_i];
              if (_comp instanceof constructor) {
                return _comp;
              }
            }
          }
          return null;
        };
        Node._findComponents = function _findComponents(node, constructor, components) {
          var cls = constructor;
          var comps = node._components;
          // NOTE: internal rtti property
          if (cls._sealed) {
            for (var i = 0; i < comps.length; ++i) {
              var comp = comps[i];
              if (comp.constructor === constructor) {
                components.push(comp);
              }
            }
          } else {
            for (var _i2 = 0; _i2 < comps.length; ++_i2) {
              var _comp2 = comps[_i2];
              if (_comp2 instanceof constructor) {
                components.push(_comp2);
              }
            }
          }
        };
        Node._findChildComponent = function _findChildComponent(children, constructor) {
          for (var i = 0; i < children.length; ++i) {
            var node = children[i];
            var comp = Node._findComponent(node, constructor);
            if (comp) {
              return comp;
            }
            if (node._children.length > 0) {
              comp = Node._findChildComponent(node._children, constructor);
              if (comp) {
                return comp;
              }
            }
          }
          return null;
        };
        Node._findChildComponents = function _findChildComponents(children, constructor, components) {
          for (var i = 0; i < children.length; ++i) {
            var node = children[i];
            Node._findComponents(node, constructor, components);
            if (node._children.length > 0) {
              Node._findChildComponents(node._children, constructor, components);
            }
          }
        };
        /**
         * NOTE: components getter is typeof ReadonlyArray
         * @engineInternal
         */
        _proto.getWritableComponents = function getWritableComponents() {
          return this._components;
        };
        /**
         * Set `_scene` field of this node.
         * The derived `Scene` overrides this method to behavior differently.
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */
        _proto._updateScene = function _updateScene() {
          if (this._parent == null) {
            error('Node %s(%s) has not attached to a scene.', this.name, this.uuid);
          } else {
            this._scene = this._parent._scene;
          }
        }

        /**
         * @en
         * Properties configuration function.
         * All properties in attrs will be set to the node,
         * when the setter of the node is available,
         * the property will be set via setter function.
         * @zh 属性配置函数。在 attrs 的所有属性将被设置为节点属性。
         * @param attrs - Properties to be set to node
         * @example
         * ```
         * var attrs = { name: 'New Name', active: false };
         * node.attr(attrs);
         * ```
         */;
        _proto.attr = function attr(attrs) {
          js.mixin(this, attrs);
        }

        /**
         * @en Get parent of the node.
         * @zh 获取该节点的父节点。
         */;
        _proto.getParent = function getParent() {
          return this._parent;
        }

        /**
         * As there are setter and setParent(), and both of them not just modify _parent, but have
         * other logic. So add a new function that only modify _parent value.
         * @engineInternal
         */;
        _proto.modifyParent = function modifyParent(parent) {
          this._parent = parent;
        }

        /**
         * @en Set parent of the node.
         * @zh 设置该节点的父节点。
         * @param value Parent node
         * @param keepWorldTransform Whether keep node's current world transform unchanged after this operation
         */;
        _proto.setParent = function setParent(value, keepWorldTransform) {
          if (keepWorldTransform === void 0) {
            keepWorldTransform = false;
          }
          if (keepWorldTransform) {
            this.updateWorldTransform();
          }
          if (this._parent === value) {
            return;
          }
          var oldParent = this._parent;
          var newParent = value;
          if (DEBUG && oldParent
          // Change parent when old parent deactivating or activating
          && oldParent._objFlags & Deactivating) {
            errorID(3821);
          }
          this._parent = newParent;
          // Reset sibling index
          this._siblingIndex = 0;
          this._onSetParent(oldParent, keepWorldTransform);
          if (this.emit) {
            this.emit(NodeEventType.PARENT_CHANGED, oldParent);
          }
          if (oldParent) {
            if (!(oldParent._objFlags & Destroying)) {
              var removeAt = oldParent._children.indexOf(this);
              if (DEV && removeAt < 0) {
                errorID(1633);
                return;
              }
              oldParent._children.splice(removeAt, 1);
              oldParent._updateSiblingIndex();
              if (oldParent.emit) {
                oldParent.emit(NodeEventType.CHILD_REMOVED, this);
              }
            }
          }
          if (newParent) {
            if (DEBUG && newParent._objFlags & Deactivating) {
              errorID(3821);
            }
            newParent._children.push(this);
            this._siblingIndex = newParent._children.length - 1;
            if (newParent.emit) {
              newParent.emit(NodeEventType.CHILD_ADDED, this);
            }
          }
          this._onHierarchyChanged(oldParent);
        }

        /**
         * @en Returns a child with the same uuid.
         * @zh 通过 uuid 获取节点的子节点。
         * @param uuid - The uuid to find the child node.
         * @return a Node whose uuid equals to the input parameter
         */;
        _proto.getChildByUuid = function getChildByUuid(uuid) {
          if (!uuid) {
            log('Invalid uuid');
            return null;
          }
          var locChildren = this._children;
          for (var i = 0, len = locChildren.length; i < len; i++) {
            if (locChildren[i]._id === uuid) {
              return locChildren[i];
            }
          }
          return null;
        }

        /**
         * @en Returns a child with the same name.
         * @zh 通过名称获取节点的子节点。
         * @param name - A name to find the child node.
         * @return a CCNode object whose name equals to the input parameter
         * @example
         * ```
         * var child = node.getChildByName("Test Node");
         * ```
         */;
        _proto.getChildByName = function getChildByName(name) {
          if (!name) {
            log('Invalid name');
            return null;
          }
          var locChildren = this._children;
          for (var i = 0, len = locChildren.length; i < len; i++) {
            if (locChildren[i]._name === name) {
              return locChildren[i];
            }
          }
          return null;
        }

        /**
         * @en Returns a child with the given path.
         * @zh 通过路径获取节点的子节点。
         * @param path - A path to find the child node.
         * @return a Node object whose path equals to the input parameter
         * @example
         * ```
         * var child = node.getChildByPath("subNode/Test Node");
         * ```
         */;
        _proto.getChildByPath = function getChildByPath(path) {
          var segments = path.split('/');
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          var lastNode = this;
          var _loop = function _loop() {
              var segment = segments[i];
              if (segment.length === 0) {
                return 0; // continue
              }
              var next = lastNode.children.find(function (childNode) {
                return childNode.name === segment;
              });
              if (!next) {
                return {
                  v: null
                };
              }
              lastNode = next;
            },
            _ret;
          for (var i = 0; i < segments.length; ++i) {
            _ret = _loop();
            if (_ret === 0) continue;
            if (_ret) return _ret.v;
          }
          return lastNode;
        }

        /**
         * @en Add a child to the current node.
         * @zh 添加一个子节点。
         * @param child - the child node to be added
         */;
        _proto.addChild = function addChild(child) {
          child.setParent(this);
        }

        /**
         * @en Inserts a child to the node at a specified index.
         * @zh 插入子节点到指定位置
         * @param child - the child node to be inserted
         * @param siblingIndex - the sibling index to place the child in
         * @example
         * ```
         * node.insertChild(child, 2);
         * ```
         */;
        _proto.insertChild = function insertChild(child, siblingIndex) {
          child.setParent(this);
          child.setSiblingIndex(siblingIndex);
        }

        /**
         * @en Get the sibling index of the current node in its parent's children array.
         * @zh 获取当前节点在父节点的 children 数组中的位置。
         */;
        _proto.getSiblingIndex = function getSiblingIndex() {
          return this._siblingIndex;
        }

        /**
         * @en Set the sibling index of the current node in its parent's children array.
         * @zh 设置当前节点在父节点的 children 数组中的位置。
         */;
        _proto.setSiblingIndex = function setSiblingIndex(index) {
          if (!this._parent) {
            return;
          }
          if (this._parent._objFlags & Deactivating) {
            errorID(3821);
            return;
          }
          var siblings = this._parent._children;
          index = index !== -1 ? index : siblings.length - 1;
          var oldIndex = siblings.indexOf(this);
          if (index !== oldIndex) {
            siblings.splice(oldIndex, 1);
            if (index < siblings.length) {
              siblings.splice(index, 0, this);
            } else {
              siblings.push(this);
            }
            this._parent._updateSiblingIndex();
            if (this._onSiblingIndexChanged) {
              this._onSiblingIndexChanged(index);
            }
            this._eventProcessor.onUpdatingSiblingIndex();
          }
        }

        /**
         * @en Walk though the sub children tree of the current node.
         * Each node, including the current node, in the sub tree will be visited two times,
         * before all children and after all children.
         * This function call is not recursive, it's based on stack.
         * Please don't walk any other node inside the walk process.
         * @zh 遍历该节点的子树里的所有节点并按规则执行回调函数。
         * 对子树中的所有节点，包含当前节点，会执行两次回调，preFunc 会在访问它的子节点之前调用，postFunc 会在访问所有子节点之后调用。
         * 这个函数的实现不是基于递归的，而是基于栈展开递归的方式。
         * 请不要在 walk 过程中对任何其他的节点嵌套执行 walk。
         * @param preFunc The callback to process node when reach the node for the first time
         * @param postFunc The callback to process node when re-visit the node after walked all children in its sub tree
         * @example
         * ```
         * node.walk(function (target) {
         *     console.log('Walked through node ' + target.name + ' for the first time');
         * }, function (target) {
         *     console.log('Walked through node ' + target.name + ' after walked all children in its sub tree');
         * });
         * ```
         */;
        _proto.walk = function walk(preFunc, postFunc) {
          var index = 1;
          var children = null;
          var curr = null;
          var i = 0;
          var stack = Node._stacks[Node._stackId];
          if (!stack) {
            stack = [];
            Node._stacks.push(stack);
          }
          Node._stackId++;
          stack.length = 0;
          stack[0] = this;
          var parent = null;
          var afterChildren = false;
          while (index) {
            index--;
            curr = stack[index];
            if (!curr) {
              continue;
            }
            if (!afterChildren && preFunc) {
              // pre call
              preFunc(curr);
            } else if (afterChildren && postFunc) {
              // post call
              postFunc(curr);
            }

            // Avoid memory leak
            stack[index] = null;
            // Do not repeatedly visit child tree, just do post call and continue walk
            if (afterChildren) {
              if (parent === this._parent) break;
              afterChildren = false;
            } else {
              // Children not proceeded and has children, proceed to child tree
              if (curr._children.length > 0) {
                parent = curr;
                children = curr._children;
                i = 0;
                stack[index] = children[i];
                index++;
              } else {
                stack[index] = curr;
                index++;
                afterChildren = true;
              }
              continue;
            }
            // curr has no sub tree, so look into the siblings in parent children
            if (children) {
              i++;
              // Proceed to next sibling in parent children
              if (children[i]) {
                stack[index] = children[i];
                index++;
              } else if (parent) {
                stack[index] = parent;
                index++;
                // Setup parent walk env
                afterChildren = true;
                if (parent._parent) {
                  children = parent._parent._children;
                  i = children.indexOf(parent);
                  parent = parent._parent;
                } else {
                  // At root
                  parent = null;
                  children = null;
                }

                // ERROR
                if (i < 0) {
                  break;
                }
              }
            }
          }
          stack.length = 0;
          Node._stackId--;
        }

        /**
         * @en
         * Remove itself from its parent node.
         * If the node have no parent, then nothing happens.
         * @zh
         * 从父节点中删除该节点。
         * 如果这个节点是一个孤立节点，那么什么都不会发生。
         */;
        _proto.removeFromParent = function removeFromParent() {
          if (this._parent) {
            this._parent.removeChild(this);
          }
        }

        /**
         * @en Removes a child from the container.
         * @zh 移除节点中指定的子节点。
         * @param child - The child node which will be removed.
         */;
        _proto.removeChild = function removeChild(child) {
          if (this._children.indexOf(child) > -1) {
            // invoke the parent setter
            child.parent = null;
          }
        }

        /**
         * @en Removes all children from the container.
         * @zh 移除节点所有的子节点。
         */;
        _proto.removeAllChildren = function removeAllChildren() {
          // not using detachChild improves speed here
          var children = this._children;
          for (var i = children.length - 1; i >= 0; i--) {
            var node = children[i];
            if (node) {
              node.parent = null;
            }
          }
          this._children.length = 0;
        }

        /**
         * @en Is this node a child of the given node?
         * @zh 是否是指定节点的子节点？
         * @return True if this node is a child, deep child or identical to the given node.
         */;
        _proto.isChildOf = function isChildOf(parent) {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          var child = this;
          do {
            if (child === parent) {
              return true;
            }
            child = child._parent;
          } while (child);
          return false;
        }

        // COMPONENT

        /**
         * @en
         * Returns the component of supplied type if the node has one attached, null if it doesn't.
         * You can also get component in the node by passing in the name of the script.
         * @zh
         * 获取节点上指定类型的组件，如果节点有附加指定类型的组件，则返回，如果没有则为空。
         * 传入参数也可以是脚本的名称。
         * @param classConstructor The class of the target component
         * @example
         * ```
         * // get sprite component.
         * var sprite = node.getComponent(Sprite);
         * ```
         */;
        _proto.getComponent = function getComponent(typeOrClassName) {
          var constructor = getConstructor(typeOrClassName);
          if (constructor) {
            return Node._findComponent(this, constructor);
          }
          return null;
        }

        /**
         * @en Returns all components of given type in the node.
         * @zh 返回节点上指定类型的所有组件。
         * @param classConstructor The class of the target component
         */;
        _proto.getComponents = function getComponents(typeOrClassName) {
          var constructor = getConstructor(typeOrClassName);
          var components = [];
          if (constructor) {
            Node._findComponents(this, constructor, components);
          }
          return components;
        }

        /**
         * @en Returns the component of given type in any of its children using depth first search.
         * @zh 递归查找所有子节点中第一个匹配指定类型的组件。
         * @param classConstructor The class of the target component
         * @example
         * ```
         * var sprite = node.getComponentInChildren(Sprite);
         * ```
         */;
        _proto.getComponentInChildren = function getComponentInChildren(typeOrClassName) {
          var constructor = getConstructor(typeOrClassName);
          if (constructor) {
            return Node._findChildComponent(this._children, constructor);
          }
          return null;
        }

        /**
         * @en Returns all components of given type in self or any of its children.
         * @zh 递归查找自身或所有子节点中指定类型的组件
         * @param classConstructor The class of the target component
         * @example
         * ```
         * var sprites = node.getComponentsInChildren(Sprite);
         * ```
         */;
        _proto.getComponentsInChildren = function getComponentsInChildren(typeOrClassName) {
          var constructor = getConstructor(typeOrClassName);
          var components = [];
          if (constructor) {
            Node._findComponents(this, constructor, components);
            Node._findChildComponents(this._children, constructor, components);
          }
          return components;
        }

        /**
         * @en Adds a component class to the node. You can also add component to node by passing in the name of the script.
         * @zh 向节点添加一个指定类型的组件类，你还可以通过传入脚本的名称来添加组件。
         * @param classConstructor The class of the component to add
         * @throws `TypeError` if the `classConstructor` does not specify a cc-class constructor extending the `Component`.
         * @example
         * ```
         * var sprite = node.addComponent(Sprite);
         * ```
         */;
        _proto.addComponent = function addComponent(typeOrClassName) {
          if (EDITOR && this._objFlags & Destroying) {
            throw Error('isDestroying');
          }

          // get component

          var constructor;
          if (typeof typeOrClassName === 'string') {
            constructor = js.getClassByName(typeOrClassName);
            if (!constructor) {
              if (legacyCC._RF.peek()) {
                errorID(3808, typeOrClassName);
              }
              throw TypeError(getError(3807, typeOrClassName));
            }
          } else {
            if (!typeOrClassName) {
              throw TypeError(getError(3804));
            }
            constructor = typeOrClassName;
          }

          // check component

          if (typeof constructor !== 'function') {
            throw TypeError(getError(3809));
          }
          if (!js.isChildClassOf(constructor, legacyCC.Component)) {
            throw TypeError(getError(3810));
          }
          if (EDITOR && constructor._disallowMultiple) {
            this._checkMultipleComp(constructor);
          }

          // check requirement

          var reqComps = constructor._requireComponent;
          if (reqComps) {
            if (Array.isArray(reqComps)) {
              for (var i = 0; i < reqComps.length; i++) {
                var reqComp = reqComps[i];
                if (!this.getComponent(reqComp)) {
                  this.addComponent(reqComp);
                }
              }
            } else {
              var _reqComp = reqComps;
              if (!this.getComponent(_reqComp)) {
                this.addComponent(_reqComp);
              }
            }
          }

          /// / check conflict
          //
          // if (EDITOR && !_Scene.DetectConflict.beforeAddComponent(this, constructor)) {
          //    return null;
          // }

          //

          var component = new constructor();
          component.node = this; // TODO: HACK here
          this._components.push(component);
          if (EDITOR && EditorExtends.Node && EditorExtends.Component) {
            var node = EditorExtends.Node.getNode(this._id);
            if (node) {
              EditorExtends.Component.add(component._id, component);
            }
          }
          this.emit(NodeEventType.COMPONENT_ADDED, component);
          if (this._activeInHierarchy) {
            legacyCC.director._nodeActivator.activateComp(component);
          }
          if (EDITOR_NOT_IN_PREVIEW) {
            var _component$resetInEdi;
            (_component$resetInEdi = component.resetInEditor) === null || _component$resetInEdi === void 0 ? void 0 : _component$resetInEdi.call(component);
          }
          return component;
        }

        /**
         * @en
         * Removes a component identified by the given name or removes the component object given.
         * You can also use component.destroy() if you already have the reference.
         * @zh
         * 删除节点上的指定组件，传入参数可以是一个组件构造函数或组件名，也可以是已经获得的组件引用。
         * 如果你已经获得组件引用，你也可以直接调用 component.destroy()
         * @param classConstructor The class of the component to remove
         * @deprecated please destroy the component to remove it.
         * @example
         * ```
         * node.removeComponent(Sprite);
         * ```
         */;
        _proto.removeComponent = function removeComponent(component) {
          if (!component) {
            errorID(3813);
            return;
          }
          var componentInstance = null;
          if (component instanceof Component) {
            componentInstance = component;
          } else {
            componentInstance = this.getComponent(component);
          }
          if (componentInstance) {
            componentInstance.destroy();
          }
        }

        // EVENT PROCESSING

        /**
         * @en
         * Register a callback of a specific event type on Node.
         * Use this method to register touch or mouse event permit propagation based on scene graph,
         * These kinds of event are triggered with dispatchEvent, the dispatch process has three steps:
         * 1. Capturing phase: dispatch in capture targets, e.g. parents in node tree, from root to the real target
         * 2. At target phase: dispatch to the listeners of the real target
         * 3. Bubbling phase: dispatch in bubble targets, e.g. parents in node tree, from the real target to root
         * In any moment of the dispatching process, it can be stopped via `event.stopPropagation()` or `event.stopPropagationImmediate()`.
         * You can also register custom event and use `emit` to trigger custom event on Node.
         * For such events, there won't be capturing and bubbling phase,
         * your event will be dispatched directly to its listeners registered on the same node.
         * You can also pass event callback parameters with `emit` by passing parameters after `type`.
         * @zh
         * 在节点上注册指定类型的回调函数，也可以设置 target 用于绑定响应函数的 this 对象。
         * 鼠标或触摸事件会被系统调用 dispatchEvent 方法触发，触发的过程包含三个阶段：
         * 1. 捕获阶段：派发事件给捕获目标，比如，节点树中注册了捕获阶段的父节点，从根节点开始派发直到目标节点。
         * 2. 目标阶段：派发给目标节点的监听器。
         * 3. 冒泡阶段：派发事件给冒泡目标，比如，节点树中注册了冒泡阶段的父节点，从目标节点开始派发直到根节点。
         * 同时您可以将事件派发到父节点或者通过调用 stopPropagation 拦截它。
         * 你也可以注册自定义事件到节点上，并通过 emit 方法触发此类事件，对于这类事件，不会发生捕获冒泡阶段，只会直接派发给注册在该节点上的监听器
         * 你可以通过在 emit 方法调用时在 type 之后传递额外的参数作为事件回调的参数列表
         * @param type - A string representing the event type to listen for.<br>See [[Node.EventType.POSITION_CHANGED]] for all builtin events.
         * @param callback - The callback that will be invoked when the event is dispatched.
         * The callback is ignored if it is a duplicate (the callbacks are unique).
         * @param target - The target (this object) to invoke the callback, can be null
         * @param useCapture - When set to true, the listener will be triggered at capturing phase which is ahead of the final target emit,
         * otherwise it will be triggered during bubbling phase.
         * @return - Just returns the incoming callback so you can save the anonymous function easier.
         * @example
         * ```ts
         * this.node.on(NodeEventType.TOUCH_START, this.memberFunction, this);  // if "this" is component and the "memberFunction" declared in CCClass.
         * node.on(NodeEventType.TOUCH_START, callback, this);
         * node.on(NodeEventType.TOUCH_MOVE, callback, this);
         * node.on(NodeEventType.TOUCH_END, callback, this);
         * ```
         */;
        _proto.on = function on(type, callback, target, useCapture) {
          if (useCapture === void 0) {
            useCapture = false;
          }
          switch (type) {
            case NodeEventType.TRANSFORM_CHANGED:
              this._eventMask |= TRANSFORM_ON;
              break;
            default:
              break;
          }
          this._eventProcessor.on(type, callback, target, useCapture);
        }

        /**
         * @en
         * Removes the callback previously registered with the same type, callback, target and or useCapture.
         * This method is merely an alias to removeEventListener.
         * @zh 删除之前与同类型，回调，目标或 useCapture 注册的回调。
         * @param type - A string representing the event type being removed.
         * @param callback - The callback to remove.
         * @param target - The target (this object) to invoke the callback, if it's not given, only callback without target will be removed
         * @param useCapture - When set to true, the listener will be triggered at capturing phase
         * which is ahead of the final target emit, otherwise it will be triggered during bubbling phase.
         * @example
         * ```ts
         * this.node.off(NodeEventType.TOUCH_START, this.memberFunction, this);
         * node.off(NodeEventType.TOUCH_START, callback, this.node);
         * ```
         */;
        _proto.off = function off(type, callback, target, useCapture) {
          if (useCapture === void 0) {
            useCapture = false;
          }
          this._eventProcessor.off(type, callback, target, useCapture);
          var hasListeners = this._eventProcessor.hasEventListener(type);
          // All listener removed
          if (!hasListeners) {
            switch (type) {
              case NodeEventType.TRANSFORM_CHANGED:
                this._eventMask &= ~TRANSFORM_ON;
                break;
              default:
                break;
            }
          }
        }

        /**
         * @en
         * Register an callback of a specific event type on the Node,
         * the callback will remove itself after the first time it is triggered.
         * @zh
         * 注册节点的特定事件类型回调，回调会在第一时间被触发后删除自身。
         *
         * @param type - A string representing the event type to listen for.
         * @param callback - The callback that will be invoked when the event is dispatched.
         *                              The callback is ignored if it is a duplicate (the callbacks are unique).
         * @param target - The target (this object) to invoke the callback, can be null
         */;
        _proto.once = function once(type, callback, target, useCapture) {
          this._eventProcessor.once(type, callback, target, useCapture);
        }

        /**
         * @en
         * Trigger an event directly with the event name and necessary arguments.
         * @zh
         * 通过事件名发送自定义事件
         * @param type - event type
         * @param arg1 - First argument in callback
         * @param arg2 - Second argument in callback
         * @param arg3 - Third argument in callback
         * @param arg4 - Fourth argument in callback
         * @param arg5 - Fifth argument in callback
         * @example
         * ```ts
         * eventTarget.emit('fire', event);
         * eventTarget.emit('fire', message, emitter);
         * ```
         */;
        _proto.emit = function emit(type, arg0, arg1, arg2, arg3, arg4) {
          this._eventProcessor.emit(type, arg0, arg1, arg2, arg3, arg4);
        }

        /**
         * @en
         * Dispatches an event into the event flow.
         * The event target is the EventTarget object upon which the dispatchEvent() method is called.
         * @zh 分发事件到事件流中。
         * @param event - The Event object that is dispatched into the event flow
         */;
        _proto.dispatchEvent = function dispatchEvent(event) {
          this._eventProcessor.dispatchEvent(event);
        }

        /**
         * @en Checks whether the EventTarget object has any callback registered for a specific type of event.
         * @zh 检查事件目标对象是否有为特定类型的事件注册的回调。
         * @param type - The type of event.
         * @param callback - The callback function of the event listener, if absent all event listeners for the given type will be removed
         * @param target - The callback callee of the event listener
         * @return True if a callback of the specified type is registered; false otherwise.
         */;
        _proto.hasEventListener = function hasEventListener(type, callback, target) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return this._eventProcessor.hasEventListener(type, callback, target);
        }

        /**
         * @en Removes all callbacks previously registered with the same target.
         * @zh 移除目标上的所有注册事件。
         * @param target - The target to be searched for all related callbacks
         */;
        _proto.targetOff = function targetOff(target) {
          this._eventProcessor.targetOff(target);
          // Check for event mask reset
          if (this._eventMask & TRANSFORM_ON && !this._eventProcessor.hasEventListener(NodeEventType.TRANSFORM_CHANGED)) {
            this._eventMask &= ~TRANSFORM_ON;
          }
        };
        _proto.destroy = function destroy() {
          if (_CCObject.prototype.destroy.call(this)) {
            this.active = false;
            return true;
          }
          return false;
        }

        /**
         * @en
         * Destroy all children from the node, and release all their own references to other objects.
         * Actual destruct operation will delayed until before rendering.
         * @zh
         * 销毁所有子节点，并释放所有它们对其它对象的引用。
         * 实际销毁操作会延迟到当前帧渲染前执行。
         */;
        _proto.destroyAllChildren = function destroyAllChildren() {
          var children = this._children;
          for (var i = 0; i < children.length; ++i) {
            children[i].destroy();
          }
        }

        /**
         * Do remove component, only used internally.
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto._removeComponent = function _removeComponent(component) {
          if (!component) {
            errorID(3814);
            return;
          }
          if (!(this._objFlags & Destroying)) {
            var i = this._components.indexOf(component);
            if (i !== -1) {
              this._components.splice(i, 1);
              if (EDITOR && EditorExtends.Component) {
                EditorExtends.Component.remove(component._id);
              }
              this.emit(NodeEventType.COMPONENT_REMOVED, component);
            } else if (component.node !== this) {
              errorID(3815);
            }
          }
        }

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto._updateSiblingIndex = function _updateSiblingIndex() {
          for (var i = 0; i < this._children.length; ++i) {
            this._children[i]._siblingIndex = i;
          }
          this.emit(NodeEventType.CHILDREN_ORDER_CHANGED);
        };
        _proto._instantiate = function _instantiate(cloned, isSyncedNode) {
          if (!cloned) {
            cloned = legacyCC.instantiate._clone(this, this);
          }
          var newPrefabInfo = cloned._prefab;
          if (EDITOR && newPrefabInfo) {
            if (cloned === newPrefabInfo.root) {
              var _EditorExtends$Prefab, _EditorExtends$Prefab2;
              // when instantiate prefab in Editor,should add prefab instance info for root node
              (_EditorExtends$Prefab = (_EditorExtends$Prefab2 = EditorExtends.PrefabUtils).addPrefabInstance) === null || _EditorExtends$Prefab === void 0 ? void 0 : _EditorExtends$Prefab.call(_EditorExtends$Prefab2, cloned);
              // newPrefabInfo.fileId = '';
            } else {
              // var PrefabUtils = Editor.require('scene://utils/prefab');
              // PrefabUtils.unlinkPrefab(cloned);
            }
          }

          // reset and init
          cloned._parent = null;
          cloned._onBatchCreated(isSyncedNode);

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return cloned;
        };
        _proto._onHierarchyChangedBase = function _onHierarchyChangedBase(oldParent) {
          var newParent = this._parent;
          if (this._persistNode && !(newParent instanceof legacyCC.Scene)) {
            legacyCC.game.removePersistRootNode(this);
            if (EDITOR) {
              warnID(1623);
            }
          }
          if (EDITOR) {
            var scene = legacyCC.director.getScene();
            var inCurrentSceneBefore = oldParent && oldParent.isChildOf(scene);
            var inCurrentSceneNow = newParent && newParent.isChildOf(scene);
            if (!inCurrentSceneBefore && inCurrentSceneNow) {
              // attached
              // TODO: `_registerIfAttached` is injected property
              // issue: https://github.com/cocos/cocos-engine/issues/14643
              this._registerIfAttached(true);
            } else if (inCurrentSceneBefore && !inCurrentSceneNow) {
              // detached
              // TODO: `_registerIfAttached` is injected property
              // issue: https://github.com/cocos/cocos-engine/issues/14643
              this._registerIfAttached(false);
            }

            // conflict detection
            // _Scene.DetectConflict.afterAddChild(this);
          }

          var shouldActiveNow = this._active && !!(newParent && newParent._activeInHierarchy);
          if (this._activeInHierarchy !== shouldActiveNow) {
            legacyCC.director._nodeActivator.activateNode(this, shouldActiveNow);
          }
        };
        _proto._onPreDestroyBase = function _onPreDestroyBase() {
          // marked as destroying
          this._objFlags |= Destroying;

          // detach self and children from editor
          var parent = this._parent;
          var destroyByParent = !!parent && (parent._objFlags & Destroying) !== 0;
          if (!destroyByParent && EDITOR) {
            // TODO: `_registerIfAttached` is injected property
            // issue: https://github.com/cocos/cocos-engine/issues/14643
            this._registerIfAttached(false);
          }

          // remove from persist
          if (this._persistNode) {
            legacyCC.game.removePersistRootNode(this);
          }
          if (!destroyByParent) {
            // remove from parent
            if (parent) {
              this.emit(NodeEventType.PARENT_CHANGED, this);
              // During destroy process, sibling index is not reliable
              var childIndex = parent._children.indexOf(this);
              parent._children.splice(childIndex, 1);
              this._siblingIndex = 0;
              parent._updateSiblingIndex();
              if (parent.emit) {
                parent.emit(NodeEventType.CHILD_REMOVED, this);
              }
            }
          }

          // emit node destroy event (this should before event processor destroy)
          this.emit(NodeEventType.NODE_DESTROYED, this);

          // Destroy node event processor
          this._eventProcessor.destroy();

          // destroy children
          var children = this._children;
          for (var i = 0; i < children.length; ++i) {
            // destroy immediate so its _onPreDestroy can be called
            children[i]._destroyImmediate();
          }

          // destroy self components
          var comps = this._components;
          for (var _i3 = 0; _i3 < comps.length; ++_i3) {
            // destroy immediate so its _onPreDestroy can be called
            // TO DO
            comps[_i3]._destroyImmediate();
          }
          return destroyByParent;
        };
        function Node(name) {
          var _this;
          _this = _CCObject.call(this, name) || this;
          _this._parent = _initializer && _initializer();
          _this._children = _initializer2 && _initializer2();
          _this._active = _initializer3 && _initializer3();
          _this._components = _initializer4 && _initializer4();
          /**
           * TODO(PP_Pro): this property should be exported to editor only, we should support editorOnly tag.
           * Tracking issue: https://github.com/cocos/cocos-engine/issues/14613
           */
          _this._prefab = _initializer5 && _initializer5();
          _this._scene = null;
          _this._activeInHierarchy = false;
          _this._id = idGenerator.getNewId();
          _this._name = void 0;
          _this._eventProcessor = new legacyCC.NodeEventProcessor(_assertThisInitialized(_this));
          _this._eventMask = 0;
          _this._siblingIndex = 0;
          /**
           * @en
           * record scene's id when set this node as persist node
           * @zh
           * 当设置节点为常驻节点时记录场景的 id
           * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
           */
          _this._originalSceneId = '';
          /**
           * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
           */
          _this._uiProps = new NodeUIProperties(_assertThisInitialized(_this));
          /**
           * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
           */
          _this._static = false;
          // local transform
          _this._lpos = _initializer6 && _initializer6();
          _this._lrot = _initializer7 && _initializer7();
          _this._lscale = _initializer8 && _initializer8();
          _this._mobility = _initializer9 && _initializer9();
          _this._layer = _initializer10 && _initializer10();
          // the layer this node belongs to
          // local rotation in euler angles, maintained here so that rotation angles could be greater than 360 degree.
          _this._euler = _initializer11 && _initializer11();
          _this._transformFlags = TransformBit.TRS;
          // does the world transform need to update?
          _this._eulerDirty = false;
          _this._flagChangeVersion = 0;
          _this._hasChangedFlags = 0;
          _this._name = name !== undefined ? name : 'New Node';
          _this._pos = new Vec3();
          _this._rot = new Quat();
          _this._scale = new Vec3(1, 1, 1);
          _this._mat = new Mat4();
          return _this;
        }

        /**
         * @en Determine whether the given object is a normal Node. Will return false if [[Scene]] given.
         * @zh 指定对象是否是普通的节点？如果传入 [[Scene]] 会返回 false。
         */
        Node.isNode = function isNode(obj) {
          return obj instanceof Node && (obj.constructor === Node || !(obj instanceof legacyCC.Scene));
        };
        _proto._onPreDestroy = function _onPreDestroy() {
          return this._onPreDestroyBase();
        }

        /**
         * @en Position in local coordinate system
         * @zh 本地坐标系下的坐标
         */
        // @constget
        ;
        /**
         * @internal
         */
        _proto[serializeTag] = function (serializationOutput, context) {
          var _this2 = this;
          if (!EDITOR) {
            serializationOutput.writeThis();
            return;
          }

          // Detects if this node is mounted node of `PrefabInstance`
          // TODO: optimize
          var isMountedChild = function isMountedChild() {
            var _this2$editorExtrasTa;
            return !!((_this2$editorExtrasTa = _this2[editorExtrasTag]) !== null && _this2$editorExtrasTa !== void 0 && _this2$editorExtrasTa.mountedRoot);
          };

          // Returns if this node is under `PrefabInstance`
          // eslint-disable-next-line arrow-body-style
          var isSyncPrefab = function isSyncPrefab() {
            var _this2$_prefab, _this2$_prefab$root, _this2$_prefab$root$_, _this2$_prefab2;
            // 1. Under `PrefabInstance`, but not mounted
            // 2. If the mounted node is a `PrefabInstance`, it's also a "sync prefab".
            return ((_this2$_prefab = _this2._prefab) === null || _this2$_prefab === void 0 ? void 0 : (_this2$_prefab$root = _this2$_prefab.root) === null || _this2$_prefab$root === void 0 ? void 0 : (_this2$_prefab$root$_ = _this2$_prefab$root._prefab) === null || _this2$_prefab$root$_ === void 0 ? void 0 : _this2$_prefab$root$_.instance) && ((_this2 === null || _this2 === void 0 ? void 0 : (_this2$_prefab2 = _this2._prefab) === null || _this2$_prefab2 === void 0 ? void 0 : _this2$_prefab2.instance) || !isMountedChild());
          };
          var canDiscardByPrefabRoot = function canDiscardByPrefabRoot() {
            return !(context.customArguments[reserveContentsForAllSyncablePrefabTag] || !isSyncPrefab() || context.root === _this2);
          };
          if (canDiscardByPrefabRoot()) {
            var _this$_prefab;
            // discard props disallow to synchronize
            var isRoot = ((_this$_prefab = this._prefab) === null || _this$_prefab === void 0 ? void 0 : _this$_prefab.root) === this;
            if (isRoot) {
              // if B prefab is in A prefab,B can be referenced by component.We should discard it.because B is not the root of prefab
              var isNestedPrefab = false;
              var parent = this.getParent();
              while (parent) {
                var _parent$_prefab;
                var nestedRoots = (_parent$_prefab = parent._prefab) === null || _parent$_prefab === void 0 ? void 0 : _parent$_prefab.nestedPrefabInstanceRoots;
                if (nestedRoots && nestedRoots.length > 0) {
                  // if this node is not in nestedPrefabInstanceRoots,it means this node is not the root of prefab,so it should be discarded.
                  isNestedPrefab = !nestedRoots.some(function (root) {
                    return root === _this2;
                  });
                  break;
                }
                parent = parent.getParent();
              }
              if (!isNestedPrefab) {
                serializationOutput.writeProperty('_objFlags', this._objFlags);
                serializationOutput.writeProperty('_parent', this._parent);
                serializationOutput.writeProperty('_prefab', this._prefab);
                if (context.customArguments.keepNodeUuid) {
                  serializationOutput.writeProperty('_id', this._id);
                }
              }
              // TODO: editorExtrasTag may be a symbol in the future
              serializationOutput.writeProperty(editorExtrasTag, this[editorExtrasTag]);
            } else {
              // should not serialize child node of synchronizable prefab
            }
          } else {
            serializationOutput.writeThis();
          }
        }

        // ===============================
        // hierarchy
        // ===============================

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto._onSetParent = function _onSetParent(oldParent, keepWorldTransform) {
          if (keepWorldTransform === void 0) {
            keepWorldTransform = false;
          }
          if (this._parent) {
            if ((oldParent == null || oldParent._scene !== this._parent._scene) && this._parent._scene != null) {
              this.walk(Node._setScene);
            }
          }
          if (keepWorldTransform) {
            var parent = this._parent;
            if (parent) {
              parent.updateWorldTransform();
              if (approx(Mat4.determinant(parent._mat), 0, EPSILON)) {
                warnID(14300);
                this._transformFlags |= TransformBit.TRS;
                this.updateWorldTransform();
              } else {
                Mat4.multiply(m4_1, Mat4.invert(m4_1, parent._mat), this._mat);
                Mat4.toRTS(m4_1, this._lrot, this._lpos, this._lscale);
              }
            } else {
              Vec3.copy(this._lpos, this._pos);
              Quat.copy(this._lrot, this._rot);
              Vec3.copy(this._lscale, this._scale);
            }
            this._eulerDirty = true;
          }
          this.invalidateChildren(TransformBit.TRS);
        };
        _proto._onHierarchyChanged = function _onHierarchyChanged(oldParent) {
          this.eventProcessor.reattach();
          this._onHierarchyChangedBase(oldParent);
        }

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto._onBatchCreated = function _onBatchCreated(dontSyncChildPrefab) {
          this.hasChangedFlags = TransformBit.TRS;
          var len = this._children.length;
          for (var i = 0; i < len; ++i) {
            this._children[i]._siblingIndex = i;
            this._children[i]._onBatchCreated(dontSyncChildPrefab);
          }
        }

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto._onBeforeSerialize = function _onBeforeSerialize() {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          this.eulerAngles; // make sure we save the correct eulerAngles
        }

        /**
         * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
         */;
        _proto._onPostActivated = function _onPostActivated(active) {
          if (active) {
            // activated
            this._eventProcessor.setEnabled(true);
            // in case transform updated during deactivated period
            this.invalidateChildren(TransformBit.TRS);
            // ALL Node renderData dirty flag will set on here
            if (this._uiProps && this._uiProps.uiComp) {
              this._uiProps.uiComp.setNodeDirty();
              this._uiProps.uiComp.setTextureDirty(); // for dynamic atlas
              this._uiProps.uiComp.markForUpdateRenderData();
            }
          } else {
            // deactivated
            this._eventProcessor.setEnabled(false);
          }
        }

        // ===============================
        // transform helper, convenient but not the most efficient
        // ===============================

        /**
         * @en Perform a translation on the node
         * @zh 移动节点
         * @param trans The increment on position
         * @param ns The operation coordinate space
         */;
        _proto.translate = function translate(trans, ns) {
          var space = ns || NodeSpace.LOCAL;
          if (space === NodeSpace.LOCAL) {
            Vec3.transformQuat(v3_a, trans, this._lrot);
            this._lpos.x += v3_a.x;
            this._lpos.y += v3_a.y;
            this._lpos.z += v3_a.z;
          } else if (space === NodeSpace.WORLD) {
            if (this._parent) {
              Quat.invert(q_a, this._parent.worldRotation);
              Vec3.transformQuat(v3_a, trans, q_a);
              var _scale = this.worldScale;
              this._lpos.x += v3_a.x / _scale.x;
              this._lpos.y += v3_a.y / _scale.y;
              this._lpos.z += v3_a.z / _scale.z;
            } else {
              this._lpos.x += trans.x;
              this._lpos.y += trans.y;
              this._lpos.z += trans.z;
            }
          }
          this.invalidateChildren(TransformBit.POSITION);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.POSITION);
          }
        }

        /**
         * @en Perform a rotation on the node
         * @zh 旋转节点
         * @param rot The increment on rotation
         * @param ns The operation coordinate space
         */;
        _proto.rotate = function rotate(rot, ns) {
          var space = ns || NodeSpace.LOCAL;
          Quat.normalize(q_a, rot);
          if (space === NodeSpace.LOCAL) {
            Quat.multiply(this._lrot, this._lrot, q_a);
          } else if (space === NodeSpace.WORLD) {
            var worldRot = this.worldRotation;
            Quat.multiply(q_b, q_a, worldRot);
            Quat.invert(q_a, worldRot);
            Quat.multiply(q_b, q_a, q_b);
            Quat.multiply(this._lrot, this._lrot, q_b);
          }
          this._eulerDirty = true;
          this.invalidateChildren(TransformBit.ROTATION);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
          }
        }

        /**
         * @en Set the orientation of the node to face the target position, the node is facing minus z direction by default
         * @zh 设置当前节点旋转为面向目标位置，默认前方为 -z 方向
         * @param pos Target position
         * @param up Up direction
         */;
        _proto.lookAt = function lookAt(pos, up) {
          this.getWorldPosition(v3_a);
          Vec3.subtract(v3_a, v3_a, pos);
          Vec3.normalize(v3_a, v3_a);
          Quat.fromViewUp(q_a, v3_a, up);
          this.setWorldRotation(q_a);
        }

        /**
         * @en Invalidate the world transform information
         * for this node and all its children recursively
         * @zh 递归标记节点世界变换为 dirty
         * @param dirtyBit The dirty bits to setup to children, can be composed with multiple dirty bits
         */;
        _proto.invalidateChildren = function invalidateChildren(dirtyBit) {
          var i = 0;
          var j = 0;
          var l = 0;
          var cur;
          var children;
          var hasChangedFlags = 0;
          var childDirtyBit = dirtyBit | TransformBit.POSITION;
          dirtyNodes[0] = this;
          while (i >= 0) {
            cur = dirtyNodes[i--];
            hasChangedFlags = cur.hasChangedFlags;
            if (cur.isValid && (cur._transformFlags & hasChangedFlags & dirtyBit) !== dirtyBit) {
              cur._transformFlags |= dirtyBit;
              cur.hasChangedFlags = hasChangedFlags | dirtyBit;
              children = cur._children;
              l = children.length;
              for (j = 0; j < l; j++) {
                dirtyNodes[++i] = children[j];
              }
            }
            dirtyBit = childDirtyBit;
          }
        }

        /**
         * @en Update the world transform information if outdated
         * @zh 更新节点的世界变换信息
         */;
        _proto.updateWorldTransform = function updateWorldTransform() {
          if (!this._transformFlags) {
            return;
          }
          // we need to recursively iterate this
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          var cur = this;
          var i = 0;
          while (cur && cur._transformFlags) {
            // top level node
            dirtyNodes[i++] = cur;
            cur = cur._parent;
          }
          var child;
          var dirtyBits = 0;
          while (i) {
            child = dirtyNodes[--i];
            dirtyBits |= child._transformFlags;
            if (cur) {
              if (dirtyBits & TransformBit.POSITION) {
                Vec3.transformMat4(child._pos, child._lpos, cur._mat);
                child._mat.m12 = child._pos.x;
                child._mat.m13 = child._pos.y;
                child._mat.m14 = child._pos.z;
              }
              if (dirtyBits & TransformBit.RS) {
                Mat4.fromRTS(child._mat, child._lrot, child._lpos, child._lscale);
                Mat4.multiply(child._mat, cur._mat, child._mat);
                var rotTmp = dirtyBits & TransformBit.ROTATION ? child._rot : null;
                Mat4.toRTS(child._mat, rotTmp, null, child._scale);
              }
            } else {
              if (dirtyBits & TransformBit.POSITION) {
                Vec3.copy(child._pos, child._lpos);
                child._mat.m12 = child._pos.x;
                child._mat.m13 = child._pos.y;
                child._mat.m14 = child._pos.z;
              }
              if (dirtyBits & TransformBit.RS) {
                if (dirtyBits & TransformBit.ROTATION) {
                  Quat.copy(child._rot, child._lrot);
                }
                if (dirtyBits & TransformBit.SCALE) {
                  Vec3.copy(child._scale, child._lscale);
                }
                Mat4.fromRTS(child._mat, child._rot, child._pos, child._scale);
              }
            }
            child._transformFlags = TransformBit.NONE;
            cur = child;
          }
        }

        // ===============================
        // transform
        // ===============================

        /**
         * @en Set position in local coordinate system
         * @zh 设置本地坐标
         * @param position Target position
         */;
        _proto.setPosition = function setPosition(val, y, z) {
          if (y === undefined && z === undefined) {
            Vec3.copy(this._lpos, val);
          } else if (z === undefined) {
            Vec3.set(this._lpos, val, y, this._lpos.z);
          } else {
            Vec3.set(this._lpos, val, y, z);
          }
          this.invalidateChildren(TransformBit.POSITION);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.POSITION);
          }
        }

        /**
         * @en Get position in local coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
         * @zh 获取本地坐标，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
         * @param out Set the result to out vector
         * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
         */;
        _proto.getPosition = function getPosition(out) {
          if (out) {
            return Vec3.set(out, this._lpos.x, this._lpos.y, this._lpos.z);
          }
          return Vec3.copy(new Vec3(), this._lpos);
        }

        /**
         * @en Set rotation in local coordinate system with a quaternion representing the rotation.
         * Please make sure the rotation is normalized.
         * @zh 用四元数设置本地旋转, 请确保设置的四元数已归一化。
         * @param rotation Rotation in quaternion
         */;
        _proto.setRotation = function setRotation(val, y, z, w) {
          if (y === undefined || z === undefined || w === undefined) {
            Quat.copy(this._lrot, val);
          } else {
            Quat.set(this._lrot, val, y, z, w);
          }
          this._eulerDirty = true;
          this.invalidateChildren(TransformBit.ROTATION);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
          }
        }

        /**
         * @en Set rotation in local coordinate system with a vector representing euler angles
         * @zh 用欧拉角设置本地旋转
         * @param rotation Rotation in vector
         */;
        _proto.setRotationFromEuler = function setRotationFromEuler(val, y, zOpt) {
          var z = zOpt === undefined ? this._euler.z : zOpt;
          if (y === undefined) {
            Vec3.copy(this._euler, val);
            Quat.fromEuler(this._lrot, val.x, val.y, val.z);
          } else {
            Vec3.set(this._euler, val, y, z);
            Quat.fromEuler(this._lrot, val, y, z);
          }
          this._eulerDirty = false;
          this.invalidateChildren(TransformBit.ROTATION);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
          }
        }

        /**
         * @en Get rotation as quaternion in local coordinate system, please try to pass `out` quaternion and reuse it to avoid garbage.
         * @zh 获取本地旋转，注意，尽可能传递复用的 [[Quat]] 以避免产生垃圾。
         * @param out Set the result to out quaternion
         * @return If `out` given, the return value equals to `out`, otherwise a new quaternion will be generated and return
         */;
        _proto.getRotation = function getRotation(out) {
          if (out) {
            return Quat.set(out, this._lrot.x, this._lrot.y, this._lrot.z, this._lrot.w);
          }
          return Quat.copy(new Quat(), this._lrot);
        }

        /**
         * @en Set scale in local coordinate system
         * @zh 设置本地缩放
         * @param scale Target scale
         */;
        _proto.setScale = function setScale(val, y, z) {
          if (y === undefined && z === undefined) {
            Vec3.copy(this._lscale, val);
          } else if (z === undefined) {
            Vec3.set(this._lscale, val, y, this._lscale.z);
          } else {
            Vec3.set(this._lscale, val, y, z);
          }
          this.invalidateChildren(TransformBit.SCALE);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.SCALE);
          }
        }

        /**
         * @en Get scale in local coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
         * @zh 获取本地缩放，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
         * @param out Set the result to out vector
         * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
         */;
        _proto.getScale = function getScale(out) {
          if (out) {
            return Vec3.set(out, this._lscale.x, this._lscale.y, this._lscale.z);
          }
          return Vec3.copy(new Vec3(), this._lscale);
        }

        /**
         * @en Inversely transform a point from world coordinate system to local coordinate system.
         * @zh 逆向变换一个空间点，一般用于将世界坐标转换到本地坐标系中。
         * @param out The result point in local coordinate system will be stored in this vector
         * @param p A position in world coordinate system
         */;
        _proto.inverseTransformPoint = function inverseTransformPoint(out, p) {
          Vec3.copy(out, p);
          // we need to recursively iterate this
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          var cur = this;
          var i = 0;
          while (cur._parent) {
            dirtyNodes[i++] = cur;
            cur = cur._parent;
          }
          while (i >= 0) {
            Vec3.transformInverseRTS(out, out, cur._lrot, cur._lpos, cur._lscale);
            cur = dirtyNodes[--i];
          }
          return out;
        }

        /**
         * @en Set position in world coordinate system
         * @zh 设置世界坐标
         * @param position Target position
         */;
        _proto.setWorldPosition = function setWorldPosition(val, y, z) {
          if (y === undefined || z === undefined) {
            Vec3.copy(this._pos, val);
          } else {
            Vec3.set(this._pos, val, y, z);
          }
          var parent = this._parent;
          var local = this._lpos;
          if (parent) {
            // TODO: benchmark these approaches
            /* */
            parent.updateWorldTransform();
            Vec3.transformMat4(local, this._pos, Mat4.invert(m4_1, parent._mat));
            /* *
            parent.inverseTransformPoint(local, this._pos);
            /* */
          } else {
            Vec3.copy(local, this._pos);
          }
          this.invalidateChildren(TransformBit.POSITION);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.POSITION);
          }
        }

        /**
         * @en Get position in world coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
         * @zh 获取世界坐标，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
         * @param out Set the result to out vector
         * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
         */;
        _proto.getWorldPosition = function getWorldPosition(out) {
          this.updateWorldTransform();
          if (out) {
            return Vec3.copy(out, this._pos);
          }
          return Vec3.copy(new Vec3(), this._pos);
        }

        /**
         * @en Set rotation in world coordinate system with a quaternion representing the rotation
         * @zh 用四元数设置世界坐标系下的旋转
         * @param rotation Rotation in quaternion
         */;
        _proto.setWorldRotation = function setWorldRotation(val, y, z, w) {
          if (y === undefined || z === undefined || w === undefined) {
            Quat.copy(this._rot, val);
          } else {
            Quat.set(this._rot, val, y, z, w);
          }
          if (this._parent) {
            this._parent.updateWorldTransform();
            Quat.multiply(this._lrot, Quat.conjugate(this._lrot, this._parent._rot), this._rot);
          } else {
            Quat.copy(this._lrot, this._rot);
          }
          this._eulerDirty = true;
          this.invalidateChildren(TransformBit.ROTATION);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
          }
        }

        /**
         * @en Set rotation in world coordinate system with euler angles
         * @zh 用欧拉角设置世界坐标系下的旋转
         * @param x X axis rotation
         * @param y Y axis rotation
         * @param z Z axis rotation
         */;
        _proto.setWorldRotationFromEuler = function setWorldRotationFromEuler(x, y, z) {
          Quat.fromEuler(this._rot, x, y, z);
          if (this._parent) {
            this._parent.updateWorldTransform();
            Quat.multiply(this._lrot, Quat.conjugate(this._lrot, this._parent._rot), this._rot);
          } else {
            Quat.copy(this._lrot, this._rot);
          }
          this._eulerDirty = true;
          this.invalidateChildren(TransformBit.ROTATION);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
          }
        }

        /**
         * @en Get rotation as quaternion in world coordinate system, please try to pass `out` quaternion and reuse it to avoid garbage.
         * @zh 获取世界坐标系下的旋转，注意，尽可能传递复用的 [[Quat]] 以避免产生垃圾。
         * @param out Set the result to out quaternion
         * @return If `out` given, the return value equals to `out`, otherwise a new quaternion will be generated and return
         */;
        _proto.getWorldRotation = function getWorldRotation(out) {
          this.updateWorldTransform();
          if (out) {
            return Quat.copy(out, this._rot);
          }
          return Quat.copy(new Quat(), this._rot);
        }

        /**
         * @en Set scale in world coordinate system
         * @zh 设置世界坐标系下的缩放
         * @param scale Target scale
         */;
        _proto.setWorldScale = function setWorldScale(val, y, z) {
          var parent = this._parent;
          if (parent) {
            this.updateWorldTransform();
          }
          if (y === undefined || z === undefined) {
            Vec3.copy(this._scale, val);
          } else {
            Vec3.set(this._scale, val, y, z);
          }
          if (parent) {
            v3_a.x = this._scale.x / Vec3.set(v3_b, this._mat.m00, this._mat.m01, this._mat.m02).length();
            v3_a.y = this._scale.y / Vec3.set(v3_b, this._mat.m04, this._mat.m05, this._mat.m06).length();
            v3_a.z = this._scale.z / Vec3.set(v3_b, this._mat.m08, this._mat.m09, this._mat.m10).length();
            Mat4.scale(m4_1, this._mat, v3_a);
            Mat4.multiply(m4_2, Mat4.invert(m4_2, parent._mat), m4_1);
            Mat3.fromQuat(m3_1, Quat.conjugate(qt_1, this._lrot));
            Mat3.multiplyMat4(m3_1, m3_1, m4_2);
            this._lscale.x = Vec3.set(v3_a, m3_1.m00, m3_1.m01, m3_1.m02).length();
            this._lscale.y = Vec3.set(v3_a, m3_1.m03, m3_1.m04, m3_1.m05).length();
            this._lscale.z = Vec3.set(v3_a, m3_1.m06, m3_1.m07, m3_1.m08).length();
          } else {
            Vec3.copy(this._lscale, this._scale);
          }
          this.invalidateChildren(TransformBit.SCALE);
          if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.SCALE);
          }
        }

        /**
         * @en Get scale in world coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
         * @zh 获取世界缩放，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
         * @param out Set the result to out vector
         * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
         */;
        _proto.getWorldScale = function getWorldScale(out) {
          this.updateWorldTransform();
          if (out) {
            return Vec3.copy(out, this._scale);
          }
          return Vec3.copy(new Vec3(), this._scale);
        }

        /**
         * @en Get a world transform matrix
         * @zh 获取世界变换矩阵
         * @param out Set the result to out matrix
         * @return If `out` given, the return value equals to `out`, otherwise a new matrix will be generated and return
         */;
        _proto.getWorldMatrix = function getWorldMatrix(out) {
          this.updateWorldTransform();
          var target = out || new Mat4();
          return Mat4.copy(target, this._mat);
        }

        /**
         * @en Get a world transform matrix with only rotation and scale
         * @zh 获取只包含旋转和缩放的世界变换矩阵
         * @param out Set the result to out matrix
         * @return If `out` given, the return value equals to `out`, otherwise a new matrix will be generated and return
         */;
        _proto.getWorldRS = function getWorldRS(out) {
          this.updateWorldTransform();
          var target = out || new Mat4();
          Mat4.copy(target, this._mat);
          target.m12 = 0;
          target.m13 = 0;
          target.m14 = 0;
          return target;
        }

        /**
         * @en Get a world transform matrix with only rotation and translation
         * @zh 获取只包含旋转和位移的世界变换矩阵
         * @param out Set the result to out matrix
         * @return If `out` given, the return value equals to `out`, otherwise a new matrix will be generated and return
         */;
        _proto.getWorldRT = function getWorldRT(out) {
          this.updateWorldTransform();
          var target = out || new Mat4();
          return Mat4.fromRT(target, this._rot, this._pos);
        }

        /**
         * @en Set local transformation with rotation, position and scale separately.
         * @zh 一次性设置所有局部变换（平移、旋转、缩放）信息
         * @param rot The rotation
         * @param pos The position
         * @param scale The scale
         */;
        _proto.setRTS = function setRTS(rot, pos, scale) {
          var dirtyBit = 0;
          if (rot) {
            dirtyBit |= TransformBit.ROTATION;
            if (rot.w !== undefined) {
              Quat.copy(this._lrot, rot);
              this._eulerDirty = true;
            } else {
              Vec3.copy(this._euler, rot);
              Quat.fromEuler(this._lrot, rot.x, rot.y, rot.z);
              this._eulerDirty = false;
            }
          }
          if (pos) {
            Vec3.copy(this._lpos, pos);
            dirtyBit |= TransformBit.POSITION;
          }
          if (scale) {
            Vec3.copy(this._lscale, scale);
            dirtyBit |= TransformBit.SCALE;
          }
          if (dirtyBit) {
            this.invalidateChildren(dirtyBit);
            if (this._eventMask & TRANSFORM_ON) {
              this.emit(NodeEventType.TRANSFORM_CHANGED, dirtyBit);
            }
          }
        }

        /**
         * @en Does the world transform information of this node need to be updated?
         * @zh 这个节点的空间变换信息是否需要更新？
         */;
        _proto.isTransformDirty = function isTransformDirty() {
          return this._transformFlags !== TransformBit.NONE;
        }

        /**
         * @en
         * Pause all system events which is dispatched by [[SystemEvent]].
         * If recursive is set to true, then this API will pause the node system events for the node and all nodes in its sub node tree.
         * @zh
         * 暂停所有 [[SystemEvent]] 派发的系统事件。
         * 如果传递 recursive 为 true，那么这个 API 将暂停本节点和它的子树上所有节点的节点系统事件。
         *
         * @param recursive Whether pause system events recursively for the child node tree
         */;
        _proto.pauseSystemEvents = function pauseSystemEvents(recursive) {
          this._eventProcessor.setEnabled(false, recursive);
        }

        /**
         * @en
         * Resume all paused system events which is dispatched by [[SystemEvent]].
         * If recursive is set to true, then this API will resume the node system events for the node and all nodes in its sub node tree.
         *
         * @zh
         * 恢复所有 [[SystemEvent]] 派发的系统事件。
         * 如果传递 recursive 为 true，那么这个 API 将恢复本节点和它的子树上所有节点的节点系统事件。
         *
         * @param recursive Whether resume system events recursively for the child node tree
         */;
        _proto.resumeSystemEvents = function resumeSystemEvents(recursive) {
          this._eventProcessor.setEnabled(true, recursive);
        }

        /**
         * @en
         * clear all node dirty state.
         * @zh
         * 清除所有节点的脏标记。
         */;
        Node.resetHasChangedFlags = function resetHasChangedFlags() {
          globalFlagChangeVersion += 1;
        }

        /**
         * @en
         * clear node array
         * @zh
         * 清除节点数组
         */;
        Node.clearNodeArray = function clearNodeArray() {
          if (Node.ClearFrame < Node.ClearRound && !EDITOR) {
            Node.ClearFrame++;
          } else {
            Node.ClearFrame = 0;
            dirtyNodes.length = 0;
          }
        }

        /**
         * @en
         * Get the complete path of the current node in the hierarchy.
         *
         * @zh
         * 获得当前节点在 hierarchy 中的完整路径。
         */;
        _proto.getPathInHierarchy = function getPathInHierarchy() {
          var result = this.name;
          var curNode = this.parent;
          while (curNode && !(curNode instanceof legacyCC.Scene)) {
            result = curNode.name + "/" + result;
            curNode = curNode.parent;
          }
          return result;
        };
        _createClass(Node, [{
          key: "components",
          get:
          // --------------------- legacy BaseNode ---------------------
          /**
           * @en Gets all components attached to this node.
           * @zh 获取附加到此节点的所有组件。
           */
          function get() {
            return this._components;
          }

          /**
           * @en If true, the node is an persist node which won't be destroyed during scene transition.
           * If false, the node will be destroyed automatically when loading a new scene. Default is false.
           * @zh 如果为true，则该节点是一个常驻节点，不会在场景转换期间被销毁。
           * 如果为false，节点将在加载新场景时自动销毁。默认为 false。
           * @default false
           * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
           */
        }, {
          key: "_persistNode",
          get: function get() {
            return (this._objFlags & DontDestroy) > 0;
          },
          set: function set(value) {
            if (value) {
              this._objFlags |= DontDestroy;
            } else {
              this._objFlags &= ~DontDestroy;
            }
          }

          // API

          /**
           * @en Name of node.
           * @zh 该节点名称。
           */
        }, {
          key: "name",
          get: function get() {
            return this._name;
          },
          set: function set(value) {
            if (DEV && value.indexOf('/') !== -1) {
              errorID(1632);
              return;
            }
            this._name = value;
          }

          /**
           * @en The uuid for editor, will be stripped after building project.
           * @zh 主要用于编辑器的 uuid，在编辑器下可用于持久化存储，在项目构建之后将变成自增的 id。
           * @readOnly
           */
        }, {
          key: "uuid",
          get: function get() {
            return this._id;
          }

          /**
           * @en All children nodes.
           * @zh 节点的所有子节点。
           * @readOnly
           */
        }, {
          key: "children",
          get: function get() {
            return this._children; // TODO:remove as Node[]?
          }

          /**
           * @en
           * The local active state of this node.
           * Note that a Node may be inactive because a parent is not active, even if this returns true.
           * Use [[activeInHierarchy]]
           * if you want to check if the Node is actually treated as active in the scene.
           * @zh
           * 当前节点的自身激活状态。
           * 值得注意的是，一个节点的父节点如果不被激活，那么即使它自身设为激活，它仍然无法激活。
           * 如果你想检查节点在场景中实际的激活状态可以使用 [[activeInHierarchy]]
           * @default true
           */
        }, {
          key: "active",
          get: function get() {
            return this._active;
          },
          set: function set(isActive) {
            isActive = !!isActive;
            if (this._active !== isActive) {
              this._active = isActive;
              var parent = this._parent;
              if (parent) {
                var couldActiveInScene = parent._activeInHierarchy;
                if (couldActiveInScene) {
                  legacyCC.director._nodeActivator.activateNode(this, isActive);
                }
              }
            }
          }
        }, {
          key: "activeInHierarchy",
          get: function get() {
            return this._activeInHierarchy;
          }

          /**
            * @en The parent node
            * @zh 父节点
            */
        }, {
          key: "parent",
          get: function get() {
            return this._parent;
          },
          set: function set(value) {
            this.setParent(value);
          }

          /**
           * @en Which scene this node belongs to.
           * @zh 此节点属于哪个场景。
           * @readonly
           */
        }, {
          key: "scene",
          get: function get() {
            return this._scene;
          }

          /**
           * @en The event processor of the current node, it provides EventTarget ability.
           * @zh 当前节点的事件处理器，提供 EventTarget 能力。
           * @readonly
           *
           * @deprecated since v3.4.0
           */
        }, {
          key: "eventProcessor",
          get: function get() {
            return this._eventProcessor;
          }

          /**
           * @internal
           */
        }, {
          key: "prefab",
          get:
          /**
           * @engineInternal
           */
          function get() {
            return this._prefab;
          }
        }, {
          key: "id",
          set:
          /**
           * @engineInternal
           */
          function set(v) {
            this._id = v;
          }
        }, {
          key: "siblingIndex",
          get:
          /**
           * @engineInternal
           */
          function get() {
            return this._siblingIndex;
          }
          /**
           * @engineInternal
           */,
          set: function set(val) {
            this._siblingIndex = val;
          }
        }, {
          key: "position",
          get: function get() {
            return this._lpos;
          },
          set: function set(val) {
            this.setPosition(val);
          }

          /**
           * @en Position in world coordinate system
           * @zh 世界坐标系下的坐标
           */
          // @constget
        }, {
          key: "worldPosition",
          get: function get() {
            this.updateWorldTransform();
            return this._pos;
          },
          set: function set(val) {
            this.setWorldPosition(val);
          }

          /**
           * @en Rotation in local coordinate system, represented by a quaternion
           * @zh 本地坐标系下的旋转，用四元数表示
           */
          // @constget
        }, {
          key: "rotation",
          get: function get() {
            return this._lrot;
          },
          set: function set(val) {
            this.setRotation(val);
          }

          /**
           * @en Rotation in local coordinate system, represented by euler angles
           * @zh 本地坐标系下的旋转，用欧拉角表示
           */
        }, {
          key: "eulerAngles",
          get: function get() {
            if (this._eulerDirty) {
              Quat.toEuler(this._euler, this._lrot);
              this._eulerDirty = false;
            }
            return this._euler;
          }

          /**
           * @en Rotation in local coordinate system, represented by euler angles, but limited on z axis
           * @zh 本地坐标系下的旋转，用欧拉角表示，但是限定在 z 轴上。
           */,
          set: function set(val) {
            this.setRotationFromEuler(val.x, val.y, val.z);
          }
        }, {
          key: "angle",
          get: function get() {
            return this._euler.z;
          },
          set: function set(val) {
            Vec3.set(this._euler, 0, 0, val);
            Quat.fromAngleZ(this._lrot, val);
            this._eulerDirty = false;
            this.invalidateChildren(TransformBit.ROTATION);
            if (this._eventMask & TRANSFORM_ON) {
              this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
            }
          }

          /**
           * @en Rotation in world coordinate system, represented by a quaternion
           * @zh 世界坐标系下的旋转，用四元数表示
           */
          // @constget
        }, {
          key: "worldRotation",
          get: function get() {
            this.updateWorldTransform();
            return this._rot;
          },
          set: function set(val) {
            this.setWorldRotation(val);
          }

          /**
           * @en Scale in local coordinate system
           * @zh 本地坐标系下的缩放
           */
          // @constget
        }, {
          key: "scale",
          get: function get() {
            return this._lscale;
          },
          set: function set(val) {
            this.setScale(val);
          }

          /**
           * @en Scale in world coordinate system
           * @zh 世界坐标系下的缩放
           */
          // @constget
        }, {
          key: "worldScale",
          get: function get() {
            this.updateWorldTransform();
            return this._scale;
          },
          set: function set(val) {
            this.setWorldScale(val);
          }

          /**
           * @en Local transformation matrix
           * @zh 本地坐标系变换矩阵
           */
        }, {
          key: "matrix",
          set: function set(val) {
            Mat4.toRTS(val, this._lrot, this._lpos, this._lscale);
            this.invalidateChildren(TransformBit.TRS);
            this._eulerDirty = true;
            if (this._eventMask & TRANSFORM_ON) {
              this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.TRS);
            }
          }

          /**
           * @en World transformation matrix
           * @zh 世界坐标系变换矩阵
           */
          // @constget
        }, {
          key: "worldMatrix",
          get: function get() {
            this.updateWorldTransform();
            return this._mat;
          }

          /**
           * @en The vector representing forward direction in local coordinate system, it's the minus z direction by default
           * @zh 当前节点面向的前方方向，默认前方为 -z 方向
           */
        }, {
          key: "forward",
          get: function get() {
            return Vec3.transformQuat(new Vec3(), Vec3.FORWARD, this.worldRotation);
          },
          set: function set(dir) {
            var len = dir.length();
            Vec3.multiplyScalar(v3_a, dir, -1 / len);
            Quat.fromViewUp(q_a, v3_a);
            this.setWorldRotation(q_a);
          }

          /**
           * @en Return the up direction vertor of this node in world space.
           * @zh 返回当前节点在世界空间中朝上的方向向量
           */
        }, {
          key: "up",
          get: function get() {
            return Vec3.transformQuat(new Vec3(), Vec3.UP, this.worldRotation);
          }

          /**
           * @en Return the right direction vector of this node in world space.
           * @zh 返回当前节点在世界空间中朝右的方向向量
           */
        }, {
          key: "right",
          get: function get() {
            return Vec3.transformQuat(new Vec3(), Vec3.RIGHT, this.worldRotation);
          }
        }, {
          key: "mobility",
          get: function get() {
            return this._mobility;
          }

          /**
           * @en Layer of the current Node, it affects raycast, physics etc, refer to [[Layers]]
           * @zh 节点所属层，主要影响射线检测、物理碰撞等，参考 [[Layers]]
           */,
          set: function set(m) {
            this._mobility = m;
            this.emit(NodeEventType.MOBILITY_CHANGED);
          }
        }, {
          key: "layer",
          get: function get() {
            return this._layer;
          }

          /**
           * @zh 节点的变换改动版本号。
           * @en The transformation change version number of the node.
           * @engineInternal
           * @internal
           */,
          set: function set(l) {
            this._layer = l;
            if (this._uiProps && this._uiProps.uiComp) {
              this._uiProps.uiComp.setNodeDirty();
              this._uiProps.uiComp.markForUpdateRenderData();
            }
            this.emit(NodeEventType.LAYER_CHANGED, this._layer);
          }
        }, {
          key: "flagChangedVersion",
          get: function get() {
            return this._flagChangeVersion;
          }

          /**
           * @en Whether the node's transformation have changed during the current frame.
           * @zh 这个节点的空间变换信息在当前帧内是否有变过？
           */
        }, {
          key: "hasChangedFlags",
          get: function get() {
            return this._flagChangeVersion === globalFlagChangeVersion ? this._hasChangedFlags : 0;
          },
          set: function set(val) {
            this._flagChangeVersion = globalFlagChangeVersion;
            this._hasChangedFlags = val;
          }
        }]);
        return Node;
      }(CCObject), _class3.idGenerator = idGenerator, _class3._stacks = [[]], _class3._stackId = 0, _class3.EventType = NodeEventType, _class3.NodeSpace = NodeSpace, _class3.TransformDirtyBit = TransformBit, _class3.TransformBit = TransformBit, _class3.reserveContentsForAllSyncablePrefabTag = reserveContentsForAllSyncablePrefabTag, _class3.ClearFrame = 0, _class3.ClearRound = 1000, _class3), (_applyDecoratedDescriptor(_class2.prototype, "_persistNode", [property], Object.getOwnPropertyDescriptor(_class2.prototype, "_persistNode"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "name", [editable], Object.getOwnPropertyDescriptor(_class2.prototype, "name"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "children", [editable], Object.getOwnPropertyDescriptor(_class2.prototype, "children"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "active", [editable], Object.getOwnPropertyDescriptor(_class2.prototype, "active"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "activeInHierarchy", [editable], Object.getOwnPropertyDescriptor(_class2.prototype, "activeInHierarchy"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "parent", [editable], Object.getOwnPropertyDescriptor(_class2.prototype, "parent"), _class2.prototype), _initializer = _applyDecoratedInitializer(_class2.prototype, "_parent", [serializable], function () {
        return null;
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "_children", [serializable], function () {
        return [];
      }), _initializer3 = _applyDecoratedInitializer(_class2.prototype, "_active", [serializable], function () {
        return true;
      }), _initializer4 = _applyDecoratedInitializer(_class2.prototype, "_components", [serializable], function () {
        return [];
      }), _initializer5 = _applyDecoratedInitializer(_class2.prototype, "_prefab", [serializable], function () {
        return null;
      }), _initializer6 = _applyDecoratedInitializer(_class2.prototype, "_lpos", [serializable], function () {
        return new Vec3();
      }), _initializer7 = _applyDecoratedInitializer(_class2.prototype, "_lrot", [serializable], function () {
        return new Quat();
      }), _initializer8 = _applyDecoratedInitializer(_class2.prototype, "_lscale", [serializable], function () {
        return new Vec3(1, 1, 1);
      }), _initializer9 = _applyDecoratedInitializer(_class2.prototype, "_mobility", [serializable], function () {
        return MobilityMode.Static;
      }), _initializer10 = _applyDecoratedInitializer(_class2.prototype, "_layer", [serializable], function () {
        return Layers.Enum.DEFAULT;
      }), _initializer11 = _applyDecoratedInitializer(_class2.prototype, "_euler", [serializable], function () {
        return new Vec3();
      }), _applyDecoratedDescriptor(_class2.prototype, "eulerAngles", [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, "eulerAngles"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "angle", [editable], Object.getOwnPropertyDescriptor(_class2.prototype, "angle"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "mobility", [editable, _dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "mobility"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "layer", [editable], Object.getOwnPropertyDescriptor(_class2.prototype, "layer"), _class2.prototype)), _class2)) || _class));
      nodePolyfill(Node);
      legacyCC.Node = Node;
    }
  };
});