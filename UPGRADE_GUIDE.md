# Sui Move 合约升级指南

本指南将帮助您了解如何使用新增的升级功能来升级您的Counter智能合约。

## 🆕 新增功能

### 合约升级支持
- ✅ 使用`Publisher`和`UpgradeCap`实现合约升级
- ✅ 部署者权限控制（只有部署者可以升级合约）
- ✅ 全局版本跟踪
- ✅ 自动化升级脚本

### 权限模型
- **任何人都可以**: 创建Counter、使用自己的Counter（increment、decrement、reset、set_value等）
- **只有部署者可以**: 升级合约、管理全局配置

### 新增合约功能

#### 任何人都可以使用的功能：
- `create()`: 创建新的Counter对象
- `increment(counter)`: 递增自己的计数器
- `increment_by(counter, amount)`: 批量递增自己的计数器
- `decrement(counter)`: 递减自己的计数器
- `reset(counter)`: 重置自己的计数器
- `set_value(counter, value)`: 设置自己的计数器值
- `get_value(counter)`: 获取计数器值

#### 只有部署者可以使用的功能：
- `upgrade_global_version(config, admin_cap)`: 升级全局版本号

#### 公共查询功能：
- `get_global_version(config)`: 获取全局版本号
- `get_deployer(config)`: 获取部署者地址
- `is_deployer(config, addr)`: 检查是否为部署者

## 📋 前置条件

1. **已部署的合约**: 确保您已经有一个部署的Counter合约
2. **升级权限**: 您必须拥有`UpgradeCap`对象
3. **充足余额**: 确保账户有足够的SUI用于gas费用
4. **环境配置**: `.env`文件包含必要的配置信息

## 🚀 升级步骤

### 1. 首次部署（获取升级权限）

如果这是您的首次部署：

```bash
# 部署到本地网络
npm run deploy

# 或部署到测试网
npm run deploy:testnet
```

部署成功后，您将获得：
- 📦 **包ID**: 合约的唯一标识符
- 🔑 **Publisher ID**: 发布者权限对象ID（用于创建升级权限）
- 👑 **AdminCap ID**: 管理员权限对象ID（只有部署者拥有）
- 🌐 **GlobalConfig ID**: 全局配置对象ID（共享对象，任何人都可以读取）

这些信息会自动保存到`.env`文件中。

### 2. 修改合约代码

在`sources/Counter.move`中进行您想要的修改。例如：
- 添加新函数
- 修改现有逻辑
- 添加新字段（注意：不能删除现有字段）

### 3. 执行升级

```bash
# 升级到当前激活的网络
npm run upgrade

# 或升级到特定网络
npm run upgrade:testnet
npm run upgrade:devnet
```

### 4. 验证升级

升级完成后：
1. 运行测试确保功能正常：`npm test`
2. 检查新的包ID已更新到`.env`文件
3. 验证新功能是否正常工作

## 📁 环境配置

确保您的`.env`文件包含以下配置：

```env
# 网络配置
SUI_NETWORK=localnet

# 包ID
PACKAGE_ID=0x...

# 发布者权限对象ID
PUBLISHER_ID=0x...

# 管理员权限对象ID（只有部署者拥有）
ADMIN_CAP_ID=0x...

# 全局配置对象ID（共享对象，任何人都可以读取）
GLOBAL_CONFIG_ID=0x...
```

## 🛠️ 升级脚本使用

### 基本用法

```bash
# 使用当前激活的网络
npm run upgrade

# 指定网络
npm run upgrade:testnet
npm run upgrade:devnet
npm run upgrade:localnet
```

### 直接使用TypeScript

```bash
# 使用当前网络
npx ts-node scripts/upgrade.ts

# 指定网络
npx ts-node scripts/upgrade.ts testnet
```

## 🔧 故障排除

### 常见错误及解决方案

1. **找不到包ID**
   ```
   错误: 找不到现有的包ID，请先发布合约
   解决: 确保.env文件存在且包含PACKAGE_ID
   ```

2. **找不到发布者权限**
   ```
   错误: 找不到发布者权限ID，无法升级合约
   解决: 确保.env文件包含PUBLISHER_ID，且当前地址拥有该对象
   ```

3. **权限不足**
   ```
   错误: 合约升级失败
   解决: 确保当前地址是升级权限的所有者
   ```

4. **Gas不足**
   ```
   错误: 交易失败
   解决: 确保账户有足够的SUI余额
   ```

### 检查命令

```bash
# 检查当前地址
sui client active-address

# 检查余额
sui client balance

# 检查拥有的对象
sui client objects

# 检查网络环境
sui client envs
```

## ⚠️ 注意事项

1. **向后兼容性**: 升级时不能删除现有的公共函数或更改其签名
2. **数据结构**: 不能删除结构体中的现有字段，只能添加新字段
3. **权限管理**: 妥善保管您的`Publisher`对象，它是升级合约的唯一凭证
4. **测试**: 在主网升级前，请在测试网充分测试
5. **备份**: 升级前请备份重要数据和配置
6. **权限分离**: 
   - 合约升级权限：只有部署者拥有（通过Publisher/UpgradeCap）
   - Counter使用权限：任何人都可以创建和管理自己的Counter对象
   - 全局配置管理：只有部署者可以修改（通过AdminCap）

## 📝 升级日志

建议在每次升级后记录：
- 升级时间
- 新包ID
- 升级内容
- 测试结果

这有助于跟踪合约的演进历史。

## 🎯 最佳实践

1. **渐进式升级**: 每次升级包含少量更改，便于调试
2. **充分测试**: 在升级前进行全面测试
3. **文档更新**: 及时更新相关文档
4. **版本管理**: 使用`upgrade_version`函数跟踪版本
5. **权限分离**: 考虑将升级权限和日常管理权限分开

## 📖 使用示例

### 普通用户使用Counter

```bash
# 任何用户都可以创建自己的Counter
sui client call --package $PACKAGE_ID --module counter --function create

# 使用自己的Counter（需要Counter对象ID）
sui client call --package $PACKAGE_ID --module counter --function increment --args $COUNTER_ID

# 批量递增
sui client call --package $PACKAGE_ID --module counter --function increment_by --args $COUNTER_ID 5

# 重置自己的Counter
sui client call --package $PACKAGE_ID --module counter --function reset --args $COUNTER_ID

# 设置自己的Counter值
sui client call --package $PACKAGE_ID --module counter --function set_value --args $COUNTER_ID 100
```

### 部署者管理全局配置

```bash
# 只有部署者可以升级全局版本（需要AdminCap）
sui client call --package $PACKAGE_ID --module counter --function upgrade_global_version --args $GLOBAL_CONFIG_ID $ADMIN_CAP_ID

# 任何人都可以查询全局信息
sui client call --package $PACKAGE_ID --module counter --function get_global_version --args $GLOBAL_CONFIG_ID
sui client call --package $PACKAGE_ID --module counter --function get_deployer --args $GLOBAL_CONFIG_ID
```

### 权限验证

```bash
# 检查某个地址是否为部署者
sui client call --package $PACKAGE_ID --module counter --function is_deployer --args $GLOBAL_CONFIG_ID $ADDRESS
```

## 🔗 相关链接

- [Sui Move 官方文档](https://docs.sui.io/concepts/sui-move-concepts)
- [包升级指南](https://docs.sui.io/concepts/sui-move-concepts/packages/upgrade)
- [Sui CLI 参考](https://docs.sui.io/references/cli)