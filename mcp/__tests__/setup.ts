// Jest 测试设置文件

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 模拟 console 方法以避免测试输出
const originalConsole = { ...console };

beforeAll(() => {
  // 在测试开始前静默 console 输出
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // 测试结束后恢复 console 输出
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// 全局测试超时设置
jest.setTimeout(10000);
