System.register("q-bundled:///fs/cocos/physics/bullet/instantiated.js", ["pal/wasm", "../../../../virtual/internal%253Aconstants.js", "../../game/index.js", "../../core/index.js", "../../misc/webassembly-support.js"], function (_export, _context) {
  "use strict";

  var ensureWasmModuleReady, _instantiateWasm, NATIVE_CODE_BUNDLE_MODE, game, error, log, sys, NativeCodeBundleMode, EBulletType, EBulletTriangleRaycastFlag, EBulletDebugDrawModes, bt, btCache;
  function initWASM(wasmFactory, wasmUrl) {
    return new Promise(function (resolve, reject) {
      var errorMessage = function errorMessage(err) {
        return "[bullet]: bullet wasm lib load failed: " + err;
      };
      wasmFactory({
        instantiateWasm: function instantiateWasm(importObject, receiveInstance) {
          // NOTE: the Promise return by instantiateWasm hook can't be caught.
          _instantiateWasm(wasmUrl, importObject).then(function (result) {
            receiveInstance(result.instance, result.module);
          })["catch"](function (err) {
            return reject(errorMessage(err));
          });
        }
      }).then(function (instance) {
        log('[bullet]:bullet wasm lib loaded.');
        _export("bt", bt = instance);
      }).then(resolve)["catch"](function (err) {
        return reject(errorMessage(err));
      });
    });
  }
  function initASM(asmFactory) {
    if (asmFactory != null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return asmFactory().then(function (instance) {
        log('[bullet]:bullet asm lib loaded.');
        _export("bt", bt = instance);
      });
    } else {
      return new Promise(function (resolve, reject) {
        resolve();
      });
    }
  }
  function shouldUseWasmModule() {
    if (NATIVE_CODE_BUNDLE_MODE === NativeCodeBundleMode.BOTH) {
      return sys.hasFeature(sys.Feature.WASM);
    } else if (NATIVE_CODE_BUNDLE_MODE === NativeCodeBundleMode.WASM) {
      return true;
    } else {
      return false;
    }
  }
  function waitForAmmoInstantiation() {
    var errorReport = function errorReport(msg) {
      error(msg);
    };
    return ensureWasmModuleReady().then(function () {
      if (shouldUseWasmModule()) {
        return Promise.all([_context["import"]('external:emscripten/bullet/bullet.release.wasm.js'), _context["import"]("../../../../virtual/external%253Aemscripten%252Fbullet%252Fbullet.release.wasm.wasm.js")]).then(function (_ref) {
          var bulletWasmFactory = _ref[0]["default"],
            bulletWasmUrl = _ref[1]["default"];
          return initWASM(bulletWasmFactory, bulletWasmUrl);
        });
      } else {
        return _context["import"]('external:emscripten/bullet/bullet.release.asm.js').then(function (_ref2) {
          var bulletAsmFactory = _ref2["default"];
          return initASM(bulletAsmFactory);
        });
      }
    })["catch"](errorReport);
  }
  _export({
    waitForAmmoInstantiation: waitForAmmoInstantiation,
    EBulletType: void 0,
    EBulletTriangleRaycastFlag: void 0,
    EBulletDebugDrawModes: void 0
  });
  return {
    setters: [function (_palWasm) {
      ensureWasmModuleReady = _palWasm.ensureWasmModuleReady;
      _instantiateWasm = _palWasm.instantiateWasm;
    }, function (_virtualInternal253AconstantsJs) {
      NATIVE_CODE_BUNDLE_MODE = _virtualInternal253AconstantsJs.NATIVE_CODE_BUNDLE_MODE;
    }, function (_gameIndexJs) {
      game = _gameIndexJs.game;
    }, function (_coreIndexJs) {
      error = _coreIndexJs.error;
      log = _coreIndexJs.log;
      sys = _coreIndexJs.sys;
    }, function (_miscWebassemblySupportJs) {
      NativeCodeBundleMode = _miscWebassemblySupportJs.NativeCodeBundleMode;
    }],
    execute: function () {
      (function (EBulletType) {
        EBulletType[EBulletType["EBulletTypeVec3"] = 0] = "EBulletTypeVec3";
        EBulletType[EBulletType["EBulletTypeQuat"] = 1] = "EBulletTypeQuat";
        EBulletType[EBulletType["EBulletTypeTransform"] = 2] = "EBulletTypeTransform";
        EBulletType[EBulletType["EBulletTypeMotionState"] = 3] = "EBulletTypeMotionState";
        EBulletType[EBulletType["EBulletTypeCollisionObject"] = 4] = "EBulletTypeCollisionObject";
        EBulletType[EBulletType["EBulletTypeCollisionShape"] = 5] = "EBulletTypeCollisionShape";
        EBulletType[EBulletType["EBulletTypeCharacterController"] = 6] = "EBulletTypeCharacterController";
        EBulletType[EBulletType["EBulletTypeStridingMeshInterface"] = 7] = "EBulletTypeStridingMeshInterface";
        EBulletType[EBulletType["EBulletTypeTriangleMesh"] = 8] = "EBulletTypeTriangleMesh";
        EBulletType[EBulletType["EBulletTypeCollisionDispatcher"] = 9] = "EBulletTypeCollisionDispatcher";
        EBulletType[EBulletType["EBulletTypeDbvtBroadPhase"] = 10] = "EBulletTypeDbvtBroadPhase";
        EBulletType[EBulletType["EBulletTypeSequentialImpulseConstraintSolver"] = 11] = "EBulletTypeSequentialImpulseConstraintSolver";
        EBulletType[EBulletType["EBulletTypeCollisionWorld"] = 12] = "EBulletTypeCollisionWorld";
        EBulletType[EBulletType["EBulletTypeTypedConstraint"] = 13] = "EBulletTypeTypedConstraint";
        EBulletType[EBulletType["EBulletTypeDebugDraw"] = 14] = "EBulletTypeDebugDraw";
      })(EBulletType || _export("EBulletType", EBulletType = {}));
      (function (EBulletTriangleRaycastFlag) {
        EBulletTriangleRaycastFlag[EBulletTriangleRaycastFlag["NONE"] = 0] = "NONE";
        EBulletTriangleRaycastFlag[EBulletTriangleRaycastFlag["FilterBackfaces"] = 1] = "FilterBackfaces";
        EBulletTriangleRaycastFlag[EBulletTriangleRaycastFlag["KeepUnflippedNormal"] = 2] = "KeepUnflippedNormal";
        EBulletTriangleRaycastFlag[EBulletTriangleRaycastFlag["UseSubSimplexConvexCastRaytest"] = 4] = "UseSubSimplexConvexCastRaytest";
        EBulletTriangleRaycastFlag[EBulletTriangleRaycastFlag["UseGjkConvexCastRaytest"] = 8] = "UseGjkConvexCastRaytest";
      })(EBulletTriangleRaycastFlag || _export("EBulletTriangleRaycastFlag", EBulletTriangleRaycastFlag = {}));
      (function (EBulletDebugDrawModes) {
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_NoDebug"] = 0] = "DBG_NoDebug";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DrawWireframe"] = 1] = "DBG_DrawWireframe";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DrawAabb"] = 2] = "DBG_DrawAabb";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DrawFeaturesText"] = 4] = "DBG_DrawFeaturesText";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DrawContactPoints"] = 8] = "DBG_DrawContactPoints";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_NoDeactivation"] = 16] = "DBG_NoDeactivation";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_NoHelpText"] = 32] = "DBG_NoHelpText";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DrawText"] = 64] = "DBG_DrawText";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_ProfileTimings"] = 128] = "DBG_ProfileTimings";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_EnableSatComparison"] = 256] = "DBG_EnableSatComparison";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DisableBulletLCP"] = 512] = "DBG_DisableBulletLCP";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_EnableCCD"] = 1024] = "DBG_EnableCCD";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DrawConstraints"] = 2048] = "DBG_DrawConstraints";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DrawConstraintLimits"] = 4096] = "DBG_DrawConstraintLimits";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_FastWireframe"] = 8192] = "DBG_FastWireframe";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DrawNormals"] = 16384] = "DBG_DrawNormals";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_DrawFrames"] = 32768] = "DBG_DrawFrames";
        EBulletDebugDrawModes[EBulletDebugDrawModes["DBG_MAX_DEBUG_DRAW_MODE"] = 32769] = "DBG_MAX_DEBUG_DRAW_MODE";
      })(EBulletDebugDrawModes || _export("EBulletDebugDrawModes", EBulletDebugDrawModes = {}));
      // eslint-disable-next-line import/no-mutable-exports
      _export("bt", bt = {});
      _export("btCache", btCache = {});
      btCache.BODY_CACHE_NAME = 'body';
      btCache.CCT_CACHE_NAME = 'cct';
      game.onPostInfrastructureInitDelegate.add(waitForAmmoInstantiation);
    }
  };
});