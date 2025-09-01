# My Counter - Sui智能合约与TypeScript测试

这是一个简单的计数器智能合约项目，使用Sui Move语言编写，并配备了完整的TypeScript测试套件。

## 项目结构

```
my_counter/
├── sources/                 # Move源代码
│   └── Counter.move        # 计数器合约
├── tests/                  # TypeScript测试
│   ├── counter.test.ts     # 主要测试文件
│   ├── setup.ts           # 测试设置
│   └── utils/
│       └── sui-client.ts   # Sui客户端工具
├── scripts/               # 部署脚本
│   └── deploy.ts          # 合约部署脚本
├── Move.toml             # Move项目配置
├── package.json          # Node.js依赖
└── jest.config.js        # Jest测试配置
```

## 功能特性

### 智能合约功能
- ✅ 创建新的计数器对象
- ✅ 递增计数器值
- ✅ 读取计数器当前值
- ✅ 对象所有权管理

### 测试覆盖
- ✅ 合约创建测试
- ✅ 计数器递增功能测试
- ✅ 数值读取测试
- ✅ 错误处理测试
- ✅ Gas消耗测试
- ✅ 所有权验证测试
- ✅ 边界条件测试

## 环境要求

- Node.js >= 18
- Sui CLI >= 1.50.0
- TypeScript >= 5.0

## 安装和设置

### 1. 安装依赖

```bash
# 安装Node.js依赖
pnpm install

# 确保Sui CLI已安装
sui --version
```

### 2. 设置Sui环境

```bash
# 初始化Sui配置（如果还没有）
sui client

# 切换到本地网络（用于测试）
sui client switch --env localnet

# 启动本地Sui网络（在另一个终端）
sui start
```

### 3. 获取测试代币

```bash
# 请求测试SUI代币
sui client faucet

# 检查余额
sui client balance
```

## 部署和测试

### 自动部署和测试

```bash
# 使用部署脚本自动发布合约
npm run deploy

# 运行所有测试
npm test
```

## 测试命令

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 运行特定测试文件
npx jest counter.test.ts

# 运行特定测试用例
npx jest -t "应该能够成功创建新的Counter对象"
```

## 测试用例详解

### 1. Counter创建测试
```typescript
describe('Counter Creation Tests', () => {
  test('应该能够成功创建新的Counter对象')
  test('应该为每次创建分配不同的对象ID')
  test('创建的Counter对象应该属于交易发送者')
})
```

### 2. 递增功能测试
```typescript
describe('Counter Increment Tests', () => {
  test('应该能够成功递增计数器')
  test('多次递增应该正确累加计数值')
  test('应该处理大量递增操作') // 压力测试
})
```

### 3. 数值读取测试
```typescript
describe('Counter Value Reading Tests', () => {
  test('新创建的Counter初始值应该为0')
  test('应该能够正确读取递增后的值')
})
```

### 4. 错误处理测试
```typescript
describe('Error Handling Tests', () => {
  test('使用无效对象ID应该抛出错误')
  test('使用错误类型的对象应该失败')
})
```

### 5. Gas消耗测试
```typescript
describe('Gas Cost Tests', () => {
  test('创建Counter的Gas消耗应该在合理范围内')
  test('递增操作的Gas消耗应该在合理范围内')
})
```

### 6. 所有权测试
```typescript
describe('Ownership Tests', () => {
  test('只有对象所有者才能修改Counter')
})
```

## 边界条件和压力测试

- **并发测试**: 同时执行100个递增操作
- **大数值测试**: 测试计数器能否处理大量递增
- **错误输入测试**: 使用无效对象ID和错误类型对象
- **Gas优化测试**: 验证操作的Gas消耗在合理范围内

## 配置文件说明

### `.env`文件配置
```bash
# Sui网络配置
SUI_NETWORK=localnet

# 包ID（发布后自动设置）
PACKAGE_ID=0x你的包ID

# 测试私钥（可选，留空将自动生成）
TEST_PRIVATE_KEY=
```

### Jest配置
- 30秒测试超时
- TypeScript支持
- 覆盖率报告
- 并行测试执行

## 故障排除

### 常见问题

1. **包ID未设置错误**
   ```
   解决方案：确保.env文件中的PACKAGE_ID已正确设置
   ```

2. **余额不足错误**
   ```bash
   # 请求更多测试代币
   sui client faucet
   ```

3. **网络连接问题**
   ```bash
   # 检查本地网络状态
   sui client envs
   
   # 重启本地网络
   sui start
   ```

4. **编译错误**
   ```bash
   # 清理并重新构建
   sui move clean
   sui move build
   ```

## 进阶使用

### 自定义测试网络

```typescript
// 修改tests/utils/sui-client.ts中的网络配置
const network = 'testnet'; // 或 'devnet', 'mainnet'
```

### 添加新的测试用例

```typescript
test('你的测试用例名称', async () => {
  // 测试逻辑
  const tx = new Transaction();
  // ...
});
```

### 性能监控

测试包含详细的Gas消耗监控，帮助优化合约性能：

```typescript
console.log('创建Counter Gas消耗:', gasUsed.toString());
console.log('递增操作Gas消耗:', gasUsed.toString());
```

## 贡献指南

1. Fork此项目
2. 创建功能分支
3. 编写测试用例
4. 确保所有测试通过
5. 提交Pull Request

## 许可证

MIT License

---

## 联系方式

如有问题或建议，请创建Issue或联系项目维护者。



