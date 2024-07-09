System.register("q-bundled:///fs/cocos/animation/marionette/pose-graph/pose-nodes/sample-motion.js", ["../../../../../../virtual/internal%253Aconstants.js", "../../../../core/index.js", "../../../../core/data/decorators/index.js", "../../../define.js", "../../motion/clip-motion.js", "../../create-eval.js", "../pose-node.js", "../decorator/input.js", "../decorator/node.js", "./menu-common.js", "./play-or-sample-motion-pose-node-shared.js", "../foundation/type-system.js"], function (_export, _context) {
  "use strict";

  var EDITOR, clamp01, ccclass, editable, serializable, CLASS_NAME_PREFIX_ANIM, ClipMotion, createEval, PoseNode, input, poseGraphCreateNodeFactory, poseGraphNodeAppearance, poseGraphNodeCategory, POSE_GRAPH_NODE_MENU_PREFIX_POSE, getEnterInfo, getTileBase, makeCreateNodeFactory, PoseGraphType, SampleMotionWorkspace, _dec, _dec2, _dec3, _dec4, _dec5, _class, _class2, _initializer, _descriptor, _initializer2, PoseNodeSampleMotion;
  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }
  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
  function _applyDecoratedInitializer(target, property, decorators, initializer) {
    return decorators.slice().reverse().reduce(function (decoratedInitializer, decorator) {
      return decorator(target, property, decoratedInitializer) || decoratedInitializer;
    }, initializer);
  }
  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }
  return {
    setters: [function (_virtualInternal253AconstantsJs) {
      EDITOR = _virtualInternal253AconstantsJs.EDITOR;
    }, function (_coreIndexJs) {
      clamp01 = _coreIndexJs.clamp01;
    }, function (_coreDataDecoratorsIndexJs) {
      ccclass = _coreDataDecoratorsIndexJs.ccclass;
      editable = _coreDataDecoratorsIndexJs.editable;
      serializable = _coreDataDecoratorsIndexJs.serializable;
    }, function (_defineJs) {
      CLASS_NAME_PREFIX_ANIM = _defineJs.CLASS_NAME_PREFIX_ANIM;
    }, function (_motionClipMotionJs) {
      ClipMotion = _motionClipMotionJs.ClipMotion;
    }, function (_createEvalJs) {
      createEval = _createEvalJs.createEval;
    }, function (_poseNodeJs) {
      PoseNode = _poseNodeJs.PoseNode;
    }, function (_decoratorInputJs) {
      input = _decoratorInputJs.input;
    }, function (_decoratorNodeJs) {
      poseGraphCreateNodeFactory = _decoratorNodeJs.poseGraphCreateNodeFactory;
      poseGraphNodeAppearance = _decoratorNodeJs.poseGraphNodeAppearance;
      poseGraphNodeCategory = _decoratorNodeJs.poseGraphNodeCategory;
    }, function (_menuCommonJs) {
      POSE_GRAPH_NODE_MENU_PREFIX_POSE = _menuCommonJs.POSE_GRAPH_NODE_MENU_PREFIX_POSE;
    }, function (_playOrSampleMotionPoseNodeSharedJs) {
      getEnterInfo = _playOrSampleMotionPoseNodeSharedJs.getEnterInfo;
      getTileBase = _playOrSampleMotionPoseNodeSharedJs.getTileBase;
      makeCreateNodeFactory = _playOrSampleMotionPoseNodeSharedJs.makeCreateNodeFactory;
    }, function (_foundationTypeSystemJs) {
      PoseGraphType = _foundationTypeSystemJs.PoseGraphType;
    }],
    execute: function () {
      _export("PoseNodeSampleMotion", PoseNodeSampleMotion = (_dec = ccclass(`${CLASS_NAME_PREFIX_ANIM}PoseNodeSampleMotion`), _dec2 = poseGraphNodeCategory(POSE_GRAPH_NODE_MENU_PREFIX_POSE), _dec3 = poseGraphCreateNodeFactory(makeCreateNodeFactory(motion => {
        const node = new PoseNodeSampleMotion();
        node.motion = motion;
        return node;
      })), _dec4 = poseGraphNodeAppearance({
        themeColor: '#D97721'
      }), _dec5 = input({
        type: PoseGraphType.FLOAT
      }), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = (_class2 = class PoseNodeSampleMotion extends PoseNode {
        constructor(...args) {
          super(...args);
          this.motion = _initializer && _initializer();
          _initializerDefineProperty(this, "time", _descriptor, this);
          this.useNormalizedTime = _initializer2 && _initializer2();
          this._workspace = null;
        }
        bind(context) {
          const {
            motion
          } = this;
          if (!motion) {
            return;
          }
          const motionEval = motion[createEval](context, true);
          if (!motionEval) {
            return;
          }
          const workspace = new SampleMotionWorkspace(motionEval, motionEval.createPort());
          this._workspace = workspace;
        }
        settle(context) {
          // Do nothing.
        }
        reenter() {
          // Do nothing.
        }
        doUpdate(context) {
          // Do nothing.
        }
        doEvaluate(context) {
          const {
            _workspace: workspace
          } = this;
          if (!workspace) {
            return context.pushDefaultedPose();
          }
          const time = this.time;
          const normalizedTime = this.useNormalizedTime ? time : time / workspace.motionEval.duration;
          return workspace.motionEvalPort.evaluate(clamp01(normalizedTime), context);
        }
      }, (_initializer = _applyDecoratedInitializer(_class2.prototype, "motion", [serializable, editable], function () {
        return new ClipMotion();
      }), _descriptor = _applyDecoratedDescriptor(_class2.prototype, "time", [serializable, editable, _dec5], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 0.0;
        }
      }), _initializer2 = _applyDecoratedInitializer(_class2.prototype, "useNormalizedTime", [serializable, editable], function () {
        return false;
      })), _class2)) || _class) || _class) || _class) || _class));
      SampleMotionWorkspace = class SampleMotionWorkspace {
        constructor(motionEval, motionEvalPort) {
          this.motionEval = motionEval;
          this.motionEvalPort = motionEvalPort;
        }
      };
      if (EDITOR) {
        PoseNodeSampleMotion.prototype.getTitle = function getTitle() {
          return getTileBase(`ENGINE.classes.${CLASS_NAME_PREFIX_ANIM}PoseNodeSampleMotion.title`, this.motion);
        };
        PoseNodeSampleMotion.prototype.getEnterInfo = getEnterInfo;
      }
    }
  };
});