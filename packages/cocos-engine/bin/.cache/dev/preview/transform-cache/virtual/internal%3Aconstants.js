System.register("q-bundled:///virtual/internal%253Aconstants.js", [], function (_export, _context) {
  "use strict";

  var TEST, EDITOR, PREVIEW, JSB, NATIVE, HTML5, DEV, EDITOR_NOT_IN_PREVIEW, ANDROID, IOS, MAC, WINDOWS, LINUX, OHOS, OPEN_HARMONY, WECHAT, WECHAT_MINI_PROGRAM, BAIDU, XIAOMI, ALIPAY, TAOBAO, TAOBAO_MINIGAME, BYTEDANCE, OPPO, VIVO, HUAWEI, COCOSPLAY, QTT, LINKSURE, BUILD, DEBUG, SERVER_MODE, MINIGAME, RUNTIME_BASED, SUPPORT_JIT, NOT_PACK_PHYSX_LIBS, NET_MODE, WEBGPU, NATIVE_CODE_BUNDLE_MODE, WASM_SUBPACKAGE, CULL_MESHOPT;
  function tryDefineGlobal(name, value) {
    var _global = typeof window === 'undefined' ? global : window;
    if (typeof _global[name] === 'undefined') {
      return _global[name] = value;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return _global[name];
    }
  }
  function defined(name) {
    var _global = typeof window === 'undefined' ? global : window;
    return typeof _global[name] === 'object';
  }
  return {
    setters: [],
    execute: function () {
      _export("TEST", TEST = tryDefineGlobal('CC_TEST', defined('tap') || defined('QUnit')));
      _export("EDITOR", EDITOR = tryDefineGlobal('CC_EDITOR', defined('Editor') && defined('process') && 'electron' in process.versions));
      _export("PREVIEW", PREVIEW = tryDefineGlobal('CC_PREVIEW', !EDITOR));
      _export("JSB", JSB = tryDefineGlobal('CC_JSB', defined('jsb')));
      _export("NATIVE", NATIVE = JSB);
      _export("HTML5", HTML5 = !(EDITOR && NATIVE));
      _export("DEV", DEV = tryDefineGlobal('CC_DEV', true));
      _export("EDITOR_NOT_IN_PREVIEW", EDITOR_NOT_IN_PREVIEW = EDITOR && !tryDefineGlobal('isPreviewProcess', false));
      _export("ANDROID", ANDROID = false);
      _export("IOS", IOS = false);
      _export("MAC", MAC = false);
      _export("WINDOWS", WINDOWS = false);
      _export("LINUX", LINUX = false);
      _export("OHOS", OHOS = false);
      _export("OPEN_HARMONY", OPEN_HARMONY = false);
      _export("WECHAT", WECHAT = false);
      tryDefineGlobal('CC_WECHAT', false);
      _export("WECHAT_MINI_PROGRAM", WECHAT_MINI_PROGRAM = false);
      _export("BAIDU", BAIDU = false);
      tryDefineGlobal('CC_BAIDU', false);
      _export("XIAOMI", XIAOMI = false);
      tryDefineGlobal('CC_XIAOMI', false);
      _export("ALIPAY", ALIPAY = false);
      tryDefineGlobal('CC_ALIPAY', false);
      _export("TAOBAO", TAOBAO = false);
      _export("TAOBAO_MINIGAME", TAOBAO_MINIGAME = false);
      _export("BYTEDANCE", BYTEDANCE = false);
      tryDefineGlobal('CC_BYTEDANCE', false);
      _export("OPPO", OPPO = false);
      tryDefineGlobal('CC_OPPO', false);
      _export("VIVO", VIVO = false);
      tryDefineGlobal('CC_VIVO', false);
      _export("HUAWEI", HUAWEI = false);
      tryDefineGlobal('CC_HUAWEI', false);
      _export("COCOSPLAY", COCOSPLAY = false);
      tryDefineGlobal('CC_COCOSPLAY', false);
      _export("QTT", QTT = false);
      tryDefineGlobal('CC_QTT', false);
      _export("LINKSURE", LINKSURE = false);
      tryDefineGlobal('CC_LINKSURE', false);
      _export("BUILD", BUILD = false);
      tryDefineGlobal('CC_BUILD', false);
      _export("DEBUG", DEBUG = true);
      tryDefineGlobal('CC_DEBUG', true);
      _export("SERVER_MODE", SERVER_MODE = false);
      _export("MINIGAME", MINIGAME = false);
      tryDefineGlobal('CC_MINIGAME', false);
      _export("RUNTIME_BASED", RUNTIME_BASED = false);
      tryDefineGlobal('CC_RUNTIME_BASED', false);
      _export("SUPPORT_JIT", SUPPORT_JIT = false);
      tryDefineGlobal('CC_SUPPORT_JIT', false);
      _export("NOT_PACK_PHYSX_LIBS", NOT_PACK_PHYSX_LIBS = false);
      _export("NET_MODE", NET_MODE = 0);
      _export("WEBGPU", WEBGPU = false);
      _export("NATIVE_CODE_BUNDLE_MODE", NATIVE_CODE_BUNDLE_MODE = 2);
      _export("WASM_SUBPACKAGE", WASM_SUBPACKAGE = false);
      _export("CULL_MESHOPT", CULL_MESHOPT = false);
    }
  };
});