System.register("q-bundled:///fs/cocos/2d/components/rich-text.js", ["../../core/data/decorators/index.js", "../../../../virtual/internal%253Aconstants.js", "../assets/index.js", "../../core/index.js", "../utils/html-text-parser.js", "../../scene-graph/index.js", "./label.js", "./label-outline.js", "./sprite.js", "../framework/index.js", "../../scene-graph/component.js", "../../scene-graph/node-event.js", "../utils/text-utils.js"], function (_export, _context) {
  "use strict";

  var ccclass, executeInEditMode, executionOrder, help, menu, tooltip, multiline, type, displayOrder, serializable, DEBUG, DEV, EDITOR, Font, SpriteAtlas, TTFFont, assert, warnID, Color, Vec2, CCObject, cclegacy, js, HtmlTextParser, Node, CacheMode, HorizontalTextAlignment, Label, VerticalTextAlignment, LabelOutline, Sprite, UITransform, Component, NodeEventType, BASELINE_RATIO, fragmentText, isUnicodeCJK, isUnicodeSpace, getEnglishWordPartAtFirst, getEnglishWordPartAtLast, getSymbolAt, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _dec14, _dec15, _dec16, _dec17, _dec18, _dec19, _dec20, _dec21, _dec22, _dec23, _class, _class2, _initializer, _initializer2, _initializer3, _initializer4, _initializer5, _initializer6, _initializer7, _initializer8, _initializer9, _initializer10, _initializer11, _initializer12, _initializer13, _initializer14, _class3, _htmlTextParser, RichTextChildName, RichTextChildImageName, _tempSize, _tempSizeLeft, labelPool, imagePool, RichText;
  function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
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
  function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
  function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2013-2016 Chukong Technologies Inc.
                                                                                                                                                                                                                                                                                                                                                                                             Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.
                                                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                             http://www.cocos.com
                                                                                                                                                                                                                                                                                                                                                                                            
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
  //
  function createSegment(type) {
    return {
      node: new Node(type),
      comp: null,
      lineCount: 0,
      styleIndex: 0,
      imageOffset: '',
      clickParam: '',
      clickHandler: '',
      type: type
    };
  }
  function getSegmentByPool(type, content) {
    var seg;
    if (type === RichTextChildName) {
      seg = labelPool._get();
    } else if (type === RichTextChildImageName) {
      seg = imagePool._get();
    }
    seg = seg || createSegment(type);
    var node = seg.node;
    if (!node) {
      node = new Node(type);
    }
    node.hideFlags |= CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
    node.active = true; // Reset node state when use node
    if (type === RichTextChildImageName) {
      seg.comp = node.getComponent(Sprite) || node.addComponent(Sprite);
      seg.comp.spriteFrame = content;
      seg.comp.type = Sprite.Type.SLICED;
      seg.comp.sizeMode = Sprite.SizeMode.CUSTOM;
    } else {
      // RichTextChildName
      seg.comp = node.getComponent(Label) || node.addComponent(Label);
      seg.comp.string = content;
      seg.comp.horizontalAlign = HorizontalTextAlignment.LEFT;
      seg.comp.verticalAlign = VerticalTextAlignment.TOP;
      seg.comp.underlineHeight = 2;
    }
    node.setPosition(0, 0, 0);
    var trans = node._uiProps.uiTransformComp;
    trans.setAnchorPoint(0.5, 0.5);
    seg.node = node;
    seg.lineCount = 0;
    seg.styleIndex = 0;
    seg.imageOffset = '';
    seg.clickParam = '';
    seg.clickHandler = '';
    return seg;
  }
  return {
    setters: [function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
      executeInEditMode = _coreDataDecoratorsIndexJs.executeInEditMode;
      executionOrder = _coreDataDecoratorsIndexJs.executionOrder;
      help = _coreDataDecoratorsIndexJs.help;
      menu = _coreDataDecoratorsIndexJs.menu;
      tooltip = _coreDataDecoratorsIndexJs.tooltip;
      multiline = _coreDataDecoratorsIndexJs.multiline;
      type = _coreDataDecoratorsIndexJs.type;
      displayOrder = _coreDataDecoratorsIndexJs.displayOrder;
      serializable = _coreDataDecoratorsIndexJs.serializable;
    }, function (_virtualInternal253AconstantsJs) {
      DEBUG = _virtualInternal253AconstantsJs.DEBUG;
      DEV = _virtualInternal253AconstantsJs.DEV;
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
    }, function (_assetsIndexJs) {
      Font = _assetsIndexJs.Font;
      SpriteAtlas = _assetsIndexJs.SpriteAtlas;
      TTFFont = _assetsIndexJs.TTFFont;
    }, function (_coreIndexJs) {
      assert = _coreIndexJs.assert;
      warnID = _coreIndexJs.warnID;
      Color = _coreIndexJs.Color;
      Vec2 = _coreIndexJs.Vec2;
      CCObject = _coreIndexJs.CCObject;
      cclegacy = _coreIndexJs.cclegacy;
      js = _coreIndexJs.js;
    }, function (_utilsHtmlTextParserJs) {
      HtmlTextParser = _utilsHtmlTextParserJs.HtmlTextParser;
    }, function (_sceneGraphIndexJs) {
      Node = _sceneGraphIndexJs.Node;
    }, function (_labelJs) {
      CacheMode = _labelJs.CacheMode;
      HorizontalTextAlignment = _labelJs.HorizontalTextAlignment;
      Label = _labelJs.Label;
      VerticalTextAlignment = _labelJs.VerticalTextAlignment;
    }, function (_labelOutlineJs) {
      LabelOutline = _labelOutlineJs.LabelOutline;
    }, function (_spriteJs) {
      Sprite = _spriteJs.Sprite;
    }, function (_frameworkIndexJs) {
      UITransform = _frameworkIndexJs.UITransform;
    }, function (_sceneGraphComponentJs) {
      Component = _sceneGraphComponentJs.Component;
    }, function (_sceneGraphNodeEventJs) {
      NodeEventType = _sceneGraphNodeEventJs.NodeEventType;
    }, function (_utilsTextUtilsJs) {
      BASELINE_RATIO = _utilsTextUtilsJs.BASELINE_RATIO;
      fragmentText = _utilsTextUtilsJs.fragmentText;
      isUnicodeCJK = _utilsTextUtilsJs.isUnicodeCJK;
      isUnicodeSpace = _utilsTextUtilsJs.isUnicodeSpace;
      getEnglishWordPartAtFirst = _utilsTextUtilsJs.getEnglishWordPartAtFirst;
      getEnglishWordPartAtLast = _utilsTextUtilsJs.getEnglishWordPartAtLast;
      getSymbolAt = _utilsTextUtilsJs.getSymbolAt;
    }],
    execute: function () {
      _htmlTextParser = new HtmlTextParser();
      RichTextChildName = 'RICHTEXT_CHILD';
      RichTextChildImageName = 'RICHTEXT_Image_CHILD';
      _tempSize = new Vec2();
      _tempSizeLeft = new Vec2();
      /**
       * 富文本池。<br/>
       */
      labelPool = new js.Pool(function (seg) {
        if (DEV) {
          assert(!seg.node.parent, 'Recycling node\'s parent should be null!');
        }
        if (!cclegacy.isValid(seg.node)) {
          return false;
        } else {
          var outline = seg.node.getComponent(LabelOutline);
          if (outline) {
            outline.width = 0;
          }
        }
        return true;
      }, 20);
      imagePool = new js.Pool(function (seg) {
        if (DEV) {
          assert(!seg.node.parent, 'Recycling node\'s parent should be null!');
        }
        return cclegacy.isValid(seg.node);
      }, 10);
      /**
       * @en
       * The RichText Component.
       *
       * @zh
       * 富文本组件。
       */
      _export("RichText", RichText = (_dec = ccclass('cc.RichText'), _dec2 = help('i18n:cc.RichText'), _dec3 = executionOrder(110), _dec4 = menu('2D/RichText'), _dec5 = tooltip('i18n:richtext.string'), _dec6 = type(HorizontalTextAlignment), _dec7 = tooltip('i18n:richtext.horizontal_align'), _dec8 = type(VerticalTextAlignment), _dec9 = tooltip('i18n:richtext.vertical_align'), _dec10 = tooltip('i18n:richtext.font_size'), _dec11 = type(Color), _dec12 = tooltip('i18n:richtext.font_family'), _dec13 = type(Font), _dec14 = tooltip('i18n:richtext.font'), _dec15 = tooltip('i18n:richtext.use_system_font'), _dec16 = displayOrder(12), _dec17 = type(CacheMode), _dec18 = tooltip('i18n:richtext.cache_mode'), _dec19 = tooltip('i18n:richtext.max_width'), _dec20 = tooltip('i18n:richtext.line_height'), _dec21 = type(SpriteAtlas), _dec22 = tooltip('i18n:richtext.image_atlas'), _dec23 = tooltip('i18n:richtext.handleTouchEvent'), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = executeInEditMode(_class = (_class2 = (_class3 = /*#__PURE__*/function (_Component) {
        _inheritsLoose(RichText, _Component);
        // only ISegment

        function RichText() {
          var _this;
          _this = _Component.call(this) || this;
          _this._lineHeight = _initializer && _initializer();
          _this._string = _initializer2 && _initializer2();
          // protected _updateRichTextStatus =
          _this._horizontalAlign = _initializer3 && _initializer3();
          _this._verticalAlign = _initializer4 && _initializer4();
          _this._fontSize = _initializer5 && _initializer5();
          _this._fontColor = _initializer6 && _initializer6();
          _this._maxWidth = _initializer7 && _initializer7();
          _this._fontFamily = _initializer8 && _initializer8();
          _this._font = _initializer9 && _initializer9();
          _this._isSystemFontUsed = _initializer10 && _initializer10();
          _this._userDefinedFont = _initializer11 && _initializer11();
          _this._cacheMode = _initializer12 && _initializer12();
          _this._imageAtlas = _initializer13 && _initializer13();
          _this._handleTouchEvent = _initializer14 && _initializer14();
          _this._textArray = [];
          _this._segments = [];
          _this._labelSegmentsCache = [];
          _this._linesWidth = [];
          _this._lineCount = 1;
          _this._labelWidth = 0;
          _this._labelHeight = 0;
          _this._layoutDirty = true;
          _this._lineOffsetX = 0;
          _this._updateRichTextStatus = void 0;
          _this._labelChildrenNum = 0;
          if (EDITOR) {
            _this._userDefinedFont = null;
          }
          _this._updateRichTextStatus = _this._updateRichText;
          return _this;
        }
        var _proto = RichText.prototype;
        _proto.onLoad = function onLoad() {
          this.node.on(NodeEventType.LAYER_CHANGED, this._applyLayer, this);
          this.node.on(NodeEventType.ANCHOR_CHANGED, this._updateRichTextPosition, this);
        };
        _proto.onEnable = function onEnable() {
          if (this.handleTouchEvent) {
            this._addEventListeners();
          }
          this._updateRichText();
          this._activateChildren(true);
        };
        _proto.onDisable = function onDisable() {
          if (this.handleTouchEvent) {
            this._removeEventListeners();
          }
          this._activateChildren(false);
        };
        _proto.onRestore = function onRestore() {
          if (!EDITOR) {
            return;
          }

          // TODO: refine undo/redo system
          // Because undo/redo will not call onEnable/onDisable,
          // we need call onEnable/onDisable manually to active/disactive children nodes.
          if (this.enabledInHierarchy) {
            this.onEnable();
          } else {
            this.onDisable();
          }
        };
        _proto.onDestroy = function onDestroy() {
          for (var _iterator = _createForOfIteratorHelperLoose(this._segments), _step; !(_step = _iterator()).done;) {
            var seg = _step.value;
            seg.node.removeFromParent();
            if (seg.type === RichTextChildName) {
              labelPool.put(seg);
            } else if (seg.type === RichTextChildImageName) {
              imagePool.put(seg);
            }
          }
          this.node.off(NodeEventType.ANCHOR_CHANGED, this._updateRichTextPosition, this);
          this.node.off(NodeEventType.LAYER_CHANGED, this._applyLayer, this);
        };
        _proto._addEventListeners = function _addEventListeners() {
          this.node.on(NodeEventType.TOUCH_END, this._onTouchEnded, this);
        };
        _proto._removeEventListeners = function _removeEventListeners() {
          this.node.off(NodeEventType.TOUCH_END, this._onTouchEnded, this);
        };
        _proto._updateLabelSegmentTextAttributes = function _updateLabelSegmentTextAttributes() {
          var _this2 = this;
          this._segments.forEach(function (item) {
            _this2._applyTextAttribute(item);
          });
        };
        _proto._createFontLabel = function _createFontLabel(str) {
          return getSegmentByPool(RichTextChildName, str);
        };
        _proto._createImage = function _createImage(spriteFrame) {
          return getSegmentByPool(RichTextChildImageName, spriteFrame);
        };
        _proto._onTTFLoaded = function _onTTFLoaded() {
          if (this._font instanceof TTFFont) {
            this._layoutDirty = true;
            this._updateRichText();
          } else {
            this._layoutDirty = true;
            this._updateRichText();
          }
        }

        /**
        * @engineInternal
        */;
        _proto.splitLongStringApproximatelyIn2048 = function splitLongStringApproximatelyIn2048(text, styleIndex) {
          var approxSize = text.length * this.fontSize;
          var partStringArr = [];
          // avoid that many short richtext still execute _calculateSize so that performance is low
          // we set a threshold as 2048 * 0.8, if the estimated size is less than it, we can skip _calculateSize precisely
          if (approxSize <= 2048 * 0.8) {
            partStringArr.push(text);
            return partStringArr;
          }
          this._calculateSize(_tempSize, styleIndex, text);
          if (_tempSize.x < 2048) {
            partStringArr.push(text);
          } else {
            var multilineTexts = text.split('\n');
            for (var i = 0; i < multilineTexts.length; i++) {
              this._calculateSize(_tempSize, styleIndex, multilineTexts[i]);
              if (_tempSize.x < 2048) {
                partStringArr.push(multilineTexts[i]);
              } else {
                var thisPartSplitResultArr = this.splitLongStringOver2048(multilineTexts[i], styleIndex);
                partStringArr.push.apply(partStringArr, thisPartSplitResultArr);
              }
            }
          }
          return partStringArr;
        }

        /**
        * @engineInternal
        */;
        _proto.splitLongStringOver2048 = function splitLongStringOver2048(text, styleIndex) {
          var partStringArr = [];
          var longStr = text;
          var curStart = 0;
          var curEnd = longStr.length / 2;
          var curString = longStr.substring(curStart, curEnd);
          var leftString = longStr.substring(curEnd);
          var curStringSize = this._calculateSize(_tempSize, styleIndex, curString);
          var leftStringSize = this._calculateSize(_tempSizeLeft, styleIndex, leftString);
          var maxWidth = this._maxWidth;
          if (this._maxWidth === 0) {
            maxWidth = 2047.9; // Callback when maxWidth is 0
          }

          // a line should be an unit to split long string
          var lineCountForOnePart = 1;
          var sizeForOnePart = lineCountForOnePart * maxWidth;

          // divide text into some pieces of which the size is less than sizeForOnePart
          while (curStringSize.x > sizeForOnePart) {
            curEnd /= 2;
            // at least one char can be an entity, step back.
            if (curEnd < 1) {
              curEnd *= 2;
              break;
            }
            curString = curString.substring(curStart, curEnd);
            leftString = longStr.substring(curEnd);
            this._calculateSize(curStringSize, styleIndex, curString);
          }

          // avoid too many loops
          var leftTryTimes = 1000;
          // the minimum step of expansion or reduction
          var curWordStep = 1;
          while (leftTryTimes && curStart < text.length) {
            while (leftTryTimes && curStringSize.x < sizeForOnePart) {
              var nextPartExec = getEnglishWordPartAtFirst(leftString);
              // add a character, unless there is a complete word at the beginning of the next line
              if (nextPartExec && nextPartExec.length > 0) {
                curWordStep = nextPartExec[0].length;
              }
              curEnd += curWordStep;
              curString = longStr.substring(curStart, curEnd);
              leftString = longStr.substring(curEnd);
              this._calculateSize(curStringSize, styleIndex, curString);
              leftTryTimes--;
            }

            // reduce condition：size > maxwidth && curString.length >= 2
            while (leftTryTimes && curString.length >= 2 && curStringSize.x > sizeForOnePart) {
              curEnd -= curWordStep;
              curString = longStr.substring(curStart, curEnd);
              this._calculateSize(curStringSize, styleIndex, curString);
              // after the first reduction, the step should be 1.
              curWordStep = 1;
              leftTryTimes--;
            }

            // consider there is a part of a word at the end of this line, it should be moved to the next line
            if (curString.length >= 2) {
              var lastWordExec = getEnglishWordPartAtLast(curString);
              if (lastWordExec && lastWordExec.length > 0
              // to avoid endless loop when there is only one word in this line
              && curString !== lastWordExec[0]) {
                curEnd -= lastWordExec[0].length;
                curString = longStr.substring(curStart, curEnd);
              }
            }

            // curStart and curEnd can be float since they are like positions of pointer,
            // but step must be integer because we split the complete characters of which the unit is integer.
            // it is reasonable that using the length of this result to estimate the next result.
            partStringArr.push(curString);
            var partStep = curString.length;
            curStart = curEnd;
            curEnd += partStep;
            curString = longStr.substring(curStart, curEnd);
            leftString = longStr.substring(curEnd);
            this._calculateSize(leftStringSize, styleIndex, leftString);
            this._calculateSize(curStringSize, styleIndex, curString);
            leftTryTimes--;

            // Exit: If the left part string size is less than 2048, the method will finish.
            if (leftStringSize.x < 2048 && curStringSize.x < sizeForOnePart) {
              partStringArr.push(curString);
              curStart = text.length;
              curEnd = text.length;
              curString = leftString;
              if (leftString !== '') {
                partStringArr.push(curString);
              }
              break;
            }
          }
          return partStringArr;
        };
        _proto._measureText = function _measureText(styleIndex, string) {
          var _this3 = this;
          var func = function func(s) {
            var width = _this3._calculateSize(_tempSize, styleIndex, s).x;
            return width;
          };
          if (string) {
            return func(string);
          } else {
            return func;
          }
        }

        /**
        * @engineInternal
        */;
        _proto._calculateSize = function _calculateSize(out, styleIndex, s) {
          var label;
          if (this._labelSegmentsCache.length === 0) {
            label = this._createFontLabel(s);
            this._labelSegmentsCache.push(label);
          } else {
            label = this._labelSegmentsCache[0];
            label.node.getComponent(Label).string = s;
          }
          label.styleIndex = styleIndex;
          this._applyTextAttribute(label);
          var size = label.node._uiProps.uiTransformComp.contentSize;
          Vec2.set(out, size.x, size.y);
          return out;
        };
        _proto._onTouchEnded = function _onTouchEnded(event) {
          var _this4 = this;
          var components = this.node.getComponents(Component);
          var _loop = function _loop() {
            var seg = _step2.value;
            var clickHandler = seg.clickHandler;
            var clickParam = seg.clickParam;
            if (clickHandler && _this4._containsTouchLocation(seg, event.touch.getUILocation())) {
              components.forEach(function (component) {
                var func = component[clickHandler];
                if (component.enabledInHierarchy && func) {
                  func.call(component, event, clickParam);
                }
              });
              event.propagationStopped = true;
            }
          };
          for (var _iterator2 = _createForOfIteratorHelperLoose(this._segments), _step2; !(_step2 = _iterator2()).done;) {
            _loop();
          }
        };
        _proto._containsTouchLocation = function _containsTouchLocation(label, point) {
          var comp = label.node.getComponent(UITransform);
          if (!comp) {
            return false;
          }
          var myRect = comp.getBoundingBoxToWorld();
          return myRect.contains(point);
        };
        _proto._resetState = function _resetState() {
          var children = this.node.children;
          for (var i = children.length - 1; i >= 0; i--) {
            var child = children[i];
            if (child.name === RichTextChildName || child.name === RichTextChildImageName) {
              if (DEBUG) {
                assert(child.parent === this.node);
              }
              child.parent = null;
              var segment = createSegment(child.name);
              segment.node = child;
              if (child.name === RichTextChildName) {
                segment.comp = child.getComponent(Label);
                labelPool.put(segment);
              } else {
                segment.comp = child.getComponent(Sprite);
                imagePool.put(segment);
              }
              this._labelChildrenNum--;
            }
          }
          this._segments.length = 0;
          this._labelSegmentsCache.length = 0;
          this._linesWidth.length = 0;
          this._lineOffsetX = 0;
          this._lineCount = 1;
          this._labelWidth = 0;
          this._labelHeight = 0;
          this._layoutDirty = true;
        };
        _proto._activateChildren = function _activateChildren(active) {
          for (var i = this.node.children.length - 1; i >= 0; i--) {
            var child = this.node.children[i];
            if (child.name === RichTextChildName || child.name === RichTextChildImageName) {
              child.active = active;
            }
          }
        };
        _proto._addLabelSegment = function _addLabelSegment(stringToken, styleIndex) {
          var labelSegment;
          if (this._labelSegmentsCache.length === 0) {
            labelSegment = this._createFontLabel(stringToken);
          } else {
            labelSegment = this._labelSegmentsCache.pop();
            var label = labelSegment.node.getComponent(Label);
            if (label) {
              label.string = stringToken;
            }
          }

          // set vertical alignments
          // because horizontal alignment is applied with line offsets in method "_updateRichTextPosition"
          var labelComp = labelSegment.comp;
          if (labelComp.verticalAlign !== this._verticalAlign) {
            labelComp.verticalAlign = this._verticalAlign;
          }
          labelSegment.styleIndex = styleIndex;
          labelSegment.lineCount = this._lineCount;
          labelSegment.node._uiProps.uiTransformComp.setAnchorPoint(0, 0);
          labelSegment.node.layer = this.node.layer;
          this.node.insertChild(labelSegment.node, this._labelChildrenNum++);
          this._applyTextAttribute(labelSegment);
          this._segments.push(labelSegment);
          return labelSegment;
        };
        _proto._updateRichTextWithMaxWidth = function _updateRichTextWithMaxWidth(labelString, labelWidth, styleIndex) {
          var fragmentWidth = labelWidth;
          var labelSegment;
          if (this._lineOffsetX > 0 && fragmentWidth + this._lineOffsetX > this._maxWidth) {
            // concat previous line
            var checkStartIndex = 0;
            while (this._lineOffsetX <= this._maxWidth) {
              var checkEndIndex = this._getFirstWordLen(labelString, checkStartIndex, labelString.length);
              var checkString = labelString.substr(checkStartIndex, checkEndIndex);
              var checkStringWidth = this._measureText(styleIndex, checkString);
              if (this._lineOffsetX + checkStringWidth <= this._maxWidth) {
                this._lineOffsetX += checkStringWidth;
                checkStartIndex += checkEndIndex;
              } else {
                if (checkStartIndex > 0) {
                  var remainingString = labelString.substr(0, checkStartIndex);
                  this._addLabelSegment(remainingString, styleIndex);
                  labelString = labelString.substr(checkStartIndex, labelString.length);
                  fragmentWidth = this._measureText(styleIndex, labelString);
                }
                this._updateLineInfo();
                break;
              }
            }
          }
          if (fragmentWidth > this._maxWidth) {
            var fragments = fragmentText(labelString, fragmentWidth, this._maxWidth, this._measureText(styleIndex));
            for (var k = 0; k < fragments.length; ++k) {
              var splitString = fragments[k];
              labelSegment = this._addLabelSegment(splitString, styleIndex);
              var labelSize = labelSegment.node._uiProps.uiTransformComp.contentSize;
              this._lineOffsetX += labelSize.width;
              if (fragments.length > 1 && k < fragments.length - 1) {
                this._updateLineInfo();
              }
            }
          } else {
            this._lineOffsetX += fragmentWidth;
            this._addLabelSegment(labelString, styleIndex);
          }
        };
        _proto._isLastComponentCR = function _isLastComponentCR(stringToken) {
          return stringToken.length - 1 === stringToken.lastIndexOf('\n');
        };
        _proto._updateLineInfo = function _updateLineInfo() {
          this._linesWidth.push(this._lineOffsetX);
          this._lineOffsetX = 0;
          this._lineCount++;
        };
        _proto._needsUpdateTextLayout = function _needsUpdateTextLayout(newTextArray) {
          if (this._layoutDirty || !this._textArray || !newTextArray) {
            return true;
          }
          if (this._textArray.length !== newTextArray.length) {
            return true;
          }
          for (var i = 0; i < this._textArray.length; i++) {
            var oldItem = this._textArray[i];
            var newItem = newTextArray[i];
            if (oldItem.text !== newItem.text) {
              return true;
            } else {
              var oldStyle = oldItem.style;
              var newStyle = newItem.style;
              if (oldStyle) {
                if (newStyle) {
                  if (!!newStyle.outline !== !!oldStyle.outline) {
                    return true;
                  }
                  if (oldStyle.size !== newStyle.size || oldStyle.italic !== newStyle.italic || oldStyle.isImage !== newStyle.isImage) {
                    return true;
                  }
                  if (oldStyle.src !== newStyle.src || oldStyle.imageAlign !== newStyle.imageAlign || oldStyle.imageHeight !== newStyle.imageHeight || oldStyle.imageWidth !== newStyle.imageWidth || oldStyle.imageOffset !== newStyle.imageOffset) {
                    return true;
                  }
                } else if (oldStyle.size || oldStyle.italic || oldStyle.isImage || oldStyle.outline) {
                  return true;
                }
              } else if (newStyle) {
                if (newStyle.size || newStyle.italic || newStyle.isImage || newStyle.outline) {
                  return true;
                }
              }
            }
          }
          return false;
        };
        _proto._addRichTextImageElement = function _addRichTextImageElement(richTextElement) {
          if (!richTextElement.style) {
            return;
          }
          var style = richTextElement.style;
          var spriteFrameName = style.src;
          var spriteFrame = this._imageAtlas && spriteFrameName && this._imageAtlas.getSpriteFrame(spriteFrameName);
          if (!spriteFrame) {
            warnID(4400);
          } else {
            var segment = this._createImage(spriteFrame);
            var sprite = segment.comp;
            switch (style.imageAlign) {
              case 'top':
                segment.node._uiProps.uiTransformComp.setAnchorPoint(0, 1);
                break;
              case 'center':
                segment.node._uiProps.uiTransformComp.setAnchorPoint(0, 0.5);
                break;
              default:
                segment.node._uiProps.uiTransformComp.setAnchorPoint(0, 0);
                break;
            }
            if (style.imageOffset) {
              segment.imageOffset = style.imageOffset;
            }
            segment.node.layer = this.node.layer;
            this.node.insertChild(segment.node, this._labelChildrenNum++);
            this._segments.push(segment);
            var spriteRect = spriteFrame.rect.clone();
            var scaleFactor = 1;
            var spriteWidth = spriteRect.width;
            var spriteHeight = spriteRect.height;
            var expectWidth = style.imageWidth || 0;
            var expectHeight = style.imageHeight || 0;
            if (expectHeight > 0) {
              scaleFactor = expectHeight / spriteHeight;
              spriteWidth *= scaleFactor;
              spriteHeight *= scaleFactor;
            } else {
              scaleFactor = this._lineHeight / spriteHeight;
              spriteWidth *= scaleFactor;
              spriteHeight *= scaleFactor;
            }
            if (expectWidth > 0) {
              spriteWidth = expectWidth;
            }
            if (this._maxWidth > 0) {
              if (this._lineOffsetX + spriteWidth > this._maxWidth) {
                this._updateLineInfo();
              }
              this._lineOffsetX += spriteWidth;
            } else {
              this._lineOffsetX += spriteWidth;
              if (this._lineOffsetX > this._labelWidth) {
                this._labelWidth = this._lineOffsetX;
              }
            }
            segment.node._uiProps.uiTransformComp.setContentSize(spriteWidth, spriteHeight);
            segment.lineCount = this._lineCount;
            segment.clickHandler = '';
            segment.clickParam = '';
            var event = style.event;
            if (event) {
              segment.clickHandler = event.click;
              segment.clickParam = event.param;
            }
          }
        };
        _proto._updateTextDefaultColor = function _updateTextDefaultColor() {
          for (var i = 0; i < this._segments.length; ++i) {
            var _this$_textArray$segm, _this$_textArray$segm2;
            var segment = this._segments[i];
            var label = segment.node.getComponent(Label);
            if (!label) {
              continue;
            }
            if ((_this$_textArray$segm = this._textArray[segment.styleIndex]) !== null && _this$_textArray$segm !== void 0 && (_this$_textArray$segm2 = _this$_textArray$segm.style) !== null && _this$_textArray$segm2 !== void 0 && _this$_textArray$segm2.color) {
              continue;
            }
            label.color = this._fontColor;
          }
        };
        _proto._updateRichText = function _updateRichText() {
          if (!this.enabledInHierarchy) {
            return;
          }
          var newTextArray = _htmlTextParser.parse(this._string);
          if (!this._needsUpdateTextLayout(newTextArray)) {
            this._textArray = newTextArray.slice();
            this._updateLabelSegmentTextAttributes();
            return;
          }
          this._textArray = newTextArray.slice();
          this._resetState();
          var lastEmptyLine = false;
          var label;
          for (var i = 0; i < this._textArray.length; ++i) {
            var richTextElement = this._textArray[i];
            var text = richTextElement.text;
            if (text === undefined) {
              continue;
            }

            // handle <br/> <img /> tag
            if (text === '') {
              if (richTextElement.style && richTextElement.style.isNewLine) {
                this._updateLineInfo();
                continue;
              }
              if (richTextElement.style && richTextElement.style.isImage && this._imageAtlas) {
                this._addRichTextImageElement(richTextElement);
                continue;
              }
            }
            var splitArr = this.splitLongStringApproximatelyIn2048(text, i);
            text = splitArr.join('\n');
            var multilineTexts = text.split('\n');
            for (var j = 0; j < multilineTexts.length; ++j) {
              var labelString = multilineTexts[j];
              if (labelString === '') {
                // for continues \n
                if (this._isLastComponentCR(text) && j === multilineTexts.length - 1) {
                  continue;
                }
                this._updateLineInfo();
                lastEmptyLine = true;
                continue;
              }
              lastEmptyLine = false;
              if (this._maxWidth > 0) {
                var labelWidth = this._measureText(i, labelString);
                this._updateRichTextWithMaxWidth(labelString, labelWidth, i);
                if (multilineTexts.length > 1 && j < multilineTexts.length - 1) {
                  this._updateLineInfo();
                }
              } else {
                label = this._addLabelSegment(labelString, i);
                this._lineOffsetX += label.node._uiProps.uiTransformComp.width;
                if (this._lineOffsetX > this._labelWidth) {
                  this._labelWidth = this._lineOffsetX;
                }
                if (multilineTexts.length > 1 && j < multilineTexts.length - 1) {
                  this._updateLineInfo();
                }
              }
            }
          }
          if (!lastEmptyLine) {
            this._linesWidth.push(this._lineOffsetX);
          }
          if (this._maxWidth > 0) {
            this._labelWidth = this._maxWidth;
          }
          this._labelHeight = (this._lineCount + BASELINE_RATIO) * this._lineHeight;

          // trigger "size-changed" event
          this.node._uiProps.uiTransformComp.setContentSize(this._labelWidth, this._labelHeight);
          this._updateRichTextPosition();
          this._layoutDirty = false;
        };
        _proto._getFirstWordLen = function _getFirstWordLen(text, startIndex, textLen) {
          var character = getSymbolAt(text, startIndex);
          if (isUnicodeCJK(character) || isUnicodeSpace(character)) {
            return 1;
          }
          var len = 1;
          for (var index = startIndex + 1; index < textLen; ++index) {
            character = getSymbolAt(text, index);
            if (isUnicodeSpace(character) || isUnicodeCJK(character)) {
              break;
            }
            len++;
          }
          return len;
        };
        _proto._updateRichTextPosition = function _updateRichTextPosition() {
          var nextTokenX = 0;
          var nextLineIndex = 1;
          var totalLineCount = this._lineCount;
          var trans = this.node._uiProps.uiTransformComp;
          var anchorX = trans.anchorX;
          var anchorY = trans.anchorY;
          for (var i = 0; i < this._segments.length; ++i) {
            var segment = this._segments[i];
            var lineCount = segment.lineCount;
            if (lineCount > nextLineIndex) {
              nextTokenX = 0;
              nextLineIndex = lineCount;
            }
            var lineOffsetX = this._labelWidth * (this._horizontalAlign * 0.5 - anchorX);
            switch (this._horizontalAlign) {
              case HorizontalTextAlignment.LEFT:
                break;
              case HorizontalTextAlignment.CENTER:
                lineOffsetX -= this._linesWidth[lineCount - 1] / 2;
                break;
              case HorizontalTextAlignment.RIGHT:
                lineOffsetX -= this._linesWidth[lineCount - 1];
                break;
              default:
                break;
            }
            var pos = segment.node.position;
            segment.node.setPosition(nextTokenX + lineOffsetX, this._lineHeight * (totalLineCount - lineCount) - this._labelHeight * anchorY, pos.z);
            if (lineCount === nextLineIndex) {
              nextTokenX += segment.node._uiProps.uiTransformComp.width;
            }
            var sprite = segment.node.getComponent(Sprite);
            if (sprite) {
              var position = segment.node.position.clone();
              // adjust img align (from <img align=top|center|bottom>)
              var lineHeightSet = this._lineHeight;
              var lineHeightReal = this._lineHeight * (1 + BASELINE_RATIO); // single line node height
              switch (segment.node._uiProps.uiTransformComp.anchorY) {
                case 1:
                  position.y += lineHeightSet + (lineHeightReal - lineHeightSet) / 2;
                  break;
                case 0.5:
                  position.y += lineHeightReal / 2;
                  break;
                default:
                  position.y += (lineHeightReal - lineHeightSet) / 2;
                  break;
              }
              // adjust img offset (from <img offset=12|12,34>)
              if (segment.imageOffset) {
                var offsets = segment.imageOffset.split(',');
                if (offsets.length === 1 && offsets[0]) {
                  var offsetY = parseFloat(offsets[0]);
                  if (Number.isInteger(offsetY)) position.y += offsetY;
                } else if (offsets.length === 2) {
                  var offsetX = parseFloat(offsets[0]);
                  var _offsetY = parseFloat(offsets[1]);
                  if (Number.isInteger(offsetX)) position.x += offsetX;
                  if (Number.isInteger(_offsetY)) position.y += _offsetY;
                }
              }
              segment.node.position = position;
            }

            // adjust y for label with outline
            var outline = segment.node.getComponent(LabelOutline);
            if (outline) {
              var _position = segment.node.position.clone();
              _position.y -= outline.width;
              segment.node.position = _position;
            }
          }
        };
        _proto._convertLiteralColorValue = function _convertLiteralColorValue(color) {
          var colorValue = color.toUpperCase();
          if (Color[colorValue]) {
            var colorUse = Color[colorValue];
            return colorUse;
          } else {
            var out = new Color();
            return out.fromHEX(color);
          }
        };
        _proto._applyTextAttribute = function _applyTextAttribute(labelSeg) {
          var label = labelSeg.node.getComponent(Label);
          if (!label) {
            return;
          }
          this._resetLabelState(label);
          var index = labelSeg.styleIndex;
          var textStyle;
          if (this._textArray[index]) {
            textStyle = this._textArray[index].style;
          }
          if (textStyle) {
            if (textStyle.color) {
              label.color = this._convertLiteralColorValue(textStyle.color);
            } else {
              label.color = this._fontColor;
            }
            label.isBold = !!textStyle.bold;
            label.isItalic = !!textStyle.italic;
            // TODO: temporary implementation, the italic effect should be implemented in the internal of label-assembler.
            // if (textStyle.italic) {
            //     labelNode.skewX = 12;
            // }

            label.isUnderline = !!textStyle.underline;
            if (textStyle.outline) {
              var labelOutline = labelSeg.node.getComponent(LabelOutline);
              if (!labelOutline) {
                labelOutline = labelSeg.node.addComponent(LabelOutline);
              }
              labelOutline.color = this._convertLiteralColorValue(textStyle.outline.color);
              labelOutline.width = textStyle.outline.width;
            }
            label.fontSize = textStyle.size || this._fontSize;
            labelSeg.clickHandler = '';
            labelSeg.clickParam = '';
            var event = textStyle.event;
            if (event) {
              labelSeg.clickHandler = event.click || '';
              labelSeg.clickParam = event.param || '';
            }
          }
          label.cacheMode = this._cacheMode;
          var isAsset = this._font instanceof Font;
          if (isAsset && !this._isSystemFontUsed) {
            label.font = this._font;
          } else {
            label.fontFamily = this._fontFamily;
          }
          label.useSystemFont = this._isSystemFontUsed;
          label.lineHeight = this._lineHeight;
          label.updateRenderData(true);
        };
        _proto._applyLayer = function _applyLayer() {
          for (var _iterator3 = _createForOfIteratorHelperLoose(this._segments), _step3; !(_step3 = _iterator3()).done;) {
            var seg = _step3.value;
            seg.node.layer = this.node.layer;
          }
        };
        _proto._resetLabelState = function _resetLabelState(label) {
          label.fontSize = this._fontSize;
          label.color = this._fontColor;
          label.isBold = false;
          label.isItalic = false;
          label.isUnderline = false;
        };
        _createClass(RichText, [{
          key: "string",
          get:
          /**
           * @en
           * Content string of RichText.
           *
           * @zh
           * 富文本显示的文本内容。
           */
          function get() {
            return this._string;
          },
          set: function set(value) {
            if (this._string === value) {
              return;
            }
            this._string = value;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * Horizontal Alignment of each line in RichText.
           *
           * @zh
           * 文本内容的水平对齐方式。
           */
        }, {
          key: "horizontalAlign",
          get: function get() {
            return this._horizontalAlign;
          },
          set: function set(value) {
            if (this.horizontalAlign === value) {
              return;
            }
            this._horizontalAlign = value;
            this._layoutDirty = true;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * Vertical Alignment of each line in RichText.
           *
           * @zh
           * 文本内容的竖直对齐方式。
           */
        }, {
          key: "verticalAlign",
          get: function get() {
            return this._verticalAlign;
          },
          set: function set(value) {
            if (this._verticalAlign === value) {
              return;
            }
            this._verticalAlign = value;
            this._layoutDirty = true;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * Font size of RichText.
           *
           * @zh
           * 富文本字体大小。
           */
        }, {
          key: "fontSize",
          get: function get() {
            return this._fontSize;
          },
          set: function set(value) {
            if (this._fontSize === value) {
              return;
            }
            this._fontSize = value;
            this._layoutDirty = true;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * Font color of RichText. Works when the text content does not have a color parameter set. Transparency cascade is not supported.
           *
           * @zh
           * 富文本默认文字颜色。在文本内容没有设置颜色参数时生效。暂不支持颜色级联。
           */
        }, {
          key: "fontColor",
          get: function get() {
            return this._fontColor;
          },
          set: function set(value) {
            if (this._fontColor === value) {
              return;
            }
            this._fontColor = value;
            this._updateTextDefaultColor();
          }

          /**
           * @en
           * Custom System font of RichText.
           *
           * @zh
           * 富文本定制系统字体。
           */
        }, {
          key: "fontFamily",
          get: function get() {
            return this._fontFamily;
          },
          set: function set(value) {
            if (this._fontFamily === value) return;
            this._fontFamily = value;
            this._layoutDirty = true;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * Custom System font of RichText.
           *
           * @zh
           * 富文本定制字体。
           */
        }, {
          key: "font",
          get: function get() {
            return this._font;
          },
          set: function set(value) {
            if (this._font === value) {
              return;
            }
            this._font = value;
            this._layoutDirty = true;
            if (this._font) {
              if (EDITOR) {
                this._userDefinedFont = this._font;
              }
              this.useSystemFont = false;
              this._onTTFLoaded();
            } else {
              this.useSystemFont = true;
            }
            this._updateRichTextStatus();
          }

          /**
           * @en
           * Whether use system font name or not.
           *
           * @zh
           * 是否使用系统字体。
           */
        }, {
          key: "useSystemFont",
          get: function get() {
            return this._isSystemFontUsed;
          },
          set: function set(value) {
            if (this._isSystemFontUsed === value) {
              return;
            }
            this._isSystemFontUsed = value;
            if (EDITOR) {
              if (value) {
                this._font = null;
              } else if (this._userDefinedFont) {
                this._font = this._userDefinedFont;
                return;
              }
            }
            this._layoutDirty = true;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * The cache mode of label. This mode only supports system fonts.
           *
           * @zh
           * 文本缓存模式, 该模式只支持系统字体。
           */
        }, {
          key: "cacheMode",
          get: function get() {
            return this._cacheMode;
          },
          set: function set(value) {
            if (this._cacheMode === value) {
              return;
            }
            this._cacheMode = value;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * The maximize width of the RichText.
           *
           * @zh
           * 富文本的最大宽度。
           */
        }, {
          key: "maxWidth",
          get: function get() {
            return this._maxWidth;
          },
          set: function set(value) {
            if (this._maxWidth === value) {
              return;
            }
            this._maxWidth = value;
            this._layoutDirty = true;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * Line Height of RichText.
           *
           * @zh
           * 富文本行高。
           */
        }, {
          key: "lineHeight",
          get: function get() {
            return this._lineHeight;
          },
          set: function set(value) {
            if (this._lineHeight === value) {
              return;
            }
            this._lineHeight = value;
            this._layoutDirty = true;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * The image atlas for the img tag. For each src value in the img tag, there should be a valid spriteFrame in the image atlas.
           *
           * @zh
           * 对于 img 标签里面的 src 属性名称，都需要在 imageAtlas 里面找到一个有效的 spriteFrame，否则 img tag 会判定为无效。
           */
        }, {
          key: "imageAtlas",
          get: function get() {
            return this._imageAtlas;
          },
          set: function set(value) {
            if (this._imageAtlas === value) {
              return;
            }
            this._imageAtlas = value;
            this._layoutDirty = true;
            this._updateRichTextStatus();
          }

          /**
           * @en
           * Once checked, the RichText will block all input events (mouse and touch) within
           * the bounding box of the node, preventing the input from penetrating into the underlying node.
           *
           * @zh
           * 选中此选项后，RichText 将阻止节点边界框中的所有输入事件（鼠标和触摸），从而防止输入事件穿透到底层节点。
           */
        }, {
          key: "handleTouchEvent",
          get: function get() {
            return this._handleTouchEvent;
          },
          set: function set(value) {
            if (this._handleTouchEvent === value) {
              return;
            }
            this._handleTouchEvent = value;
            if (this.enabledInHierarchy) {
              if (this.handleTouchEvent) {
                this._addEventListeners();
              } else {
                this._removeEventListeners();
              }
            }
          }
          /**
           * @en Enum for horizontal text alignment.
           *
           * @zh 文本横向对齐类型。
           */
        }]);
        return RichText;
      }(Component), _class3.HorizontalAlign = HorizontalTextAlignment, _class3.VerticalAlign = VerticalTextAlignment, _class3), (_applyDecoratedDescriptor(_class2.prototype, "string", [multiline, _dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "string"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "horizontalAlign", [_dec6, _dec7], Object.getOwnPropertyDescriptor(_class2.prototype, "horizontalAlign"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "verticalAlign", [_dec8, _dec9], Object.getOwnPropertyDescriptor(_class2.prototype, "verticalAlign"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "fontSize", [_dec10], Object.getOwnPropertyDescriptor(_class2.prototype, "fontSize"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "fontColor", [_dec11], Object.getOwnPropertyDescriptor(_class2.prototype, "fontColor"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "fontFamily", [_dec12], Object.getOwnPropertyDescriptor(_class2.prototype, "fontFamily"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "font", [_dec13, _dec14], Object.getOwnPropertyDescriptor(_class2.prototype, "font"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "useSystemFont", [_dec15, _dec16], Object.getOwnPropertyDescriptor(_class2.prototype, "useSystemFont"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "cacheMode", [_dec17, _dec18], Object.getOwnPropertyDescriptor(_class2.prototype, "cacheMode"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "maxWidth", [_dec19], Object.getOwnPropertyDescriptor(_class2.prototype, "maxWidth"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "lineHeight", [_dec20], Object.getOwnPropertyDescriptor(_class2.prototype, "lineHeight"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "imageAtlas", [_dec21, _dec22], Object.getOwnPropertyDescriptor(_class2.prototype, "imageAtlas"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "handleTouchEvent", [_dec23], Object.getOwnPropertyDescriptor(_class2.prototype, "handleTouchEvent"), _class2.prototype), _initializer = _applyDecoratedInitializer(_class2.prototype, "_lineHeight", [serializable], function () {
        return 40;
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "_string", [serializable], function () {
        return '<color=#00ff00>Rich</color><color=#0fffff>Text</color>';
      }), _initializer3 = _applyDecoratedInitializer(_class2.prototype, "_horizontalAlign", [serializable], function () {
        return HorizontalTextAlignment.LEFT;
      }), _initializer4 = _applyDecoratedInitializer(_class2.prototype, "_verticalAlign", [serializable], function () {
        return VerticalTextAlignment.TOP;
      }), _initializer5 = _applyDecoratedInitializer(_class2.prototype, "_fontSize", [serializable], function () {
        return 40;
      }), _initializer6 = _applyDecoratedInitializer(_class2.prototype, "_fontColor", [serializable], function () {
        return Color.WHITE.clone();
      }), _initializer7 = _applyDecoratedInitializer(_class2.prototype, "_maxWidth", [serializable], function () {
        return 0;
      }), _initializer8 = _applyDecoratedInitializer(_class2.prototype, "_fontFamily", [serializable], function () {
        return 'Arial';
      }), _initializer9 = _applyDecoratedInitializer(_class2.prototype, "_font", [serializable], function () {
        return null;
      }), _initializer10 = _applyDecoratedInitializer(_class2.prototype, "_isSystemFontUsed", [serializable], function () {
        return true;
      }), _initializer11 = _applyDecoratedInitializer(_class2.prototype, "_userDefinedFont", [serializable], function () {
        return null;
      }), _initializer12 = _applyDecoratedInitializer(_class2.prototype, "_cacheMode", [serializable], function () {
        return CacheMode.NONE;
      }), _initializer13 = _applyDecoratedInitializer(_class2.prototype, "_imageAtlas", [serializable], function () {
        return null;
      }), _initializer14 = _applyDecoratedInitializer(_class2.prototype, "_handleTouchEvent", [serializable], function () {
        return true;
      })), _class2)) || _class) || _class) || _class) || _class) || _class));
      cclegacy.RichText = RichText;
    }
  };
});