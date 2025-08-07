# Sui可升级智能合约完整演示流程

## 项目结构

```
sui_program_counter/
├── sources/
│   ├── Counter.move.bak      # 原始版本 (v1)
│   ├── Counter2.move         # 升级版本 (v2)
│   └── Counter.move          # 当前版本 (需要创建)
├── scripts/
│   ├── deploy.ts            # 部署脚本
│   └── upgrade.ts           # 升级脚本
└── Move.toml
```

## 演示步骤

### 1. 环境准备

```bash
# 检查Sui客户端版本
sui client --version

# 检查当前网络环境
sui client envs

# 确保有足够的测试代币
sui client gas
```

### 2. 部署初始版本 (v1)

```bash
# 复制原始版本到Counter.move
cp sources/Counter.move.bak sources/Counter.move

# 部署到localnet
npm run deploy

# 或者指定网络
npm run deploy testnet
```

### 3. 测试初始版本功能

```bash
# 运行测试
npm test

# 或者手动测试
npx ts-node tests/counter.test.ts
```

### 4. 准备升级版本 (v2)

```bash
# 复制升级版本到Counter.move
cp sources/Counter2.move sources/Counter.move

# 查看新增功能
cat sources/Counter2.move
```

### 5. 执行合约升级

```bash
# 升级合约
npm run upgrade

# 或者指定网络
npm run upgrade testnet
```

### 6. 验证升级结果

```bash
# 再次运行测试确保功能正常
npm test

# 检查版本号是否更新
```

## 版本对比

### v1 功能 (Counter.move.bak)
- 基础计数器功能
- 创建、递增、获取值
- 版本管理
- 管理员权限

### v2 新增功能 (Counter2.move)
- 事件系统 (CounterIncremented)
- 批量递增 (increment_by)
- 递减功能 (decrement)
- 重置功能 (reset)
- 设置值功能 (set_value)
- 增强的权限管理

## 关键升级点

1. **兼容性**: 保持原有函数签名不变
2. **新增功能**: 添加更多实用函数
3. **事件系统**: 增加事件追踪
4. **权限管理**: 完善升级权限控制

## 环境变量说明

升级过程中会自动保存到 `.env` 文件：
- `PACKAGE_ID`: 包ID
- `PUBLISHER_ID`: 发布者权限ID
- `ADMIN_CAP_ID`: 管理员权限ID
- `GLOBAL_CONFIG_ID`: 全局配置ID
- `SUI_NETWORK`: 网络环境

## 故障排除

1. **权限不足**: 确保使用部署者地址执行升级
2. **Gas不足**: 检查账户余额
3. **网络错误**: 确认网络连接正常
4. **编译错误**: 检查Move语法是否正确

## 安全注意事项

1. 升级权限 (UpgradeCap) 必须妥善保管
2. 只有部署者可以执行升级
3. 升级前必须充分测试新版本
4. 保持向后兼容性