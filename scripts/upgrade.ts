import { ContractDeployer } from './deploy';

/**
 * 合约升级脚本
 * 使用方法：
 * - npm run upgrade (使用当前激活的网络)
 * - npm run upgrade localnet (指定网络)
 * - npx ts-node scripts/upgrade.ts (直接运行)
 * - npx ts-node scripts/upgrade.ts testnet (指定网络)
 */

async function upgradeContract() {
  try {
    // 解析命令行参数
    const networkArg = process.argv[2];
    
    console.log('🚀 开始升级合约...');
    console.log('==================');
    
    // 创建升级部署器
    const deployer = new ContractDeployer(networkArg, true);
    
    // 执行升级
    const newPackageId = await deployer.deployContract();
    
    console.log('==================');
    console.log('🎉 升级成功完成！');
    console.log(`📦 新包ID: ${newPackageId}`);
    console.log(`🌐 网络: ${deployer.getNetwork()}`);
    console.log('');
    console.log('📝 升级后的操作建议：');
    console.log('1. 运行测试确保功能正常：npm test');
    console.log('2. 如果有Counter对象，可以调用upgrade_version函数更新版本号');
    console.log('3. 验证新功能是否正常工作');
    console.log('');
    console.log('💡 新功能：');
    console.log('- increment_by: 批量递增计数器');
    console.log('- decrement: 递减计数器');
    console.log('- reset: 重置计数器（需要管理员权限）');
    console.log('- set_value: 设置计数器值（需要管理员权限）');
    console.log('- transfer_admin: 转移管理员权限');
    
  } catch (error) {
    console.error('❌ 升级失败:', error);
    console.log('');
    console.log('🔧 故障排除：');
    console.log('1. 确保.env文件存在且包含PACKAGE_ID和UPGRADE_CAP_ID');
    console.log('2. 确保当前地址拥有升级权限');
    console.log('3. 确保网络连接正常');
    console.log('4. 检查gas余额是否充足');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  upgradeContract();
}

export { upgradeContract };