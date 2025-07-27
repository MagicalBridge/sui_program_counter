import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 设置全局测试超时
jest.setTimeout(30000);

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
}); 