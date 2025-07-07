// 核心类型和接口
export * from './core/types';

// 核心实现
export { DefaultExtensionManager } from './core/ExtensionManager';
export { ExtensionSystem } from './core/ExtensionSystem';

// 拓展点枚举
export {
  ExtensionPoint,
  ExtensionPriority,
  ExtensionStatus,
} from './core/types';

// 示例拓展
export { ValidationExtension } from './extensions/validation/ValidationExtension';

// 工具函数
export * from './utils/helpers';

// 默认导出
export { ExtensionSystem as default } from './core/ExtensionSystem';
