System.register("q-bundled:///fs/cocos/animation/marionette/pose-graph/foundation/type-system.js", [], function (_export, _context) {
  "use strict";

  var PoseGraphType;
  _export("PoseGraphType", void 0);
  return {
    setters: [],
    execute: function () {
      (function (PoseGraphType) {
        PoseGraphType[PoseGraphType["FLOAT"] = 0] = "FLOAT";
        PoseGraphType[PoseGraphType["INTEGER"] = 1] = "INTEGER";
        PoseGraphType[PoseGraphType["BOOLEAN"] = 2] = "BOOLEAN";
        PoseGraphType[PoseGraphType["VEC3"] = 3] = "VEC3";
        PoseGraphType[PoseGraphType["QUAT"] = 4] = "QUAT";
        PoseGraphType[PoseGraphType["POSE"] = 5] = "POSE";
      })(PoseGraphType || _export("PoseGraphType", PoseGraphType = {}));
    }
  };
});