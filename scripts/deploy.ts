import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class ContractDeployer {
  private network: string;
  private isUpgrade: boolean;

  constructor(network?: string, isUpgrade: boolean = false) {
    // 如果用户没有指定网络，则自动检测当前激活的网络
    this.network = network || this.getCurrentActiveNetwork();
    this.isUpgrade = isUpgrade;
    console.log(`准备${isUpgrade ? '升级' : '部署'}到${this.network}网络`);
  }

  /**
   * 获取当前使用的网络名称
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * 获取当前激活的 Sui 网络环境
   */
  private getCurrentActiveNetwork(): string {
    try {
      const envsOutput = execSync('sui client envs', { 
        cwd: process.cwd(), 
        encoding: 'utf8' 
      });

      // 解析输出，找到标记为活跃的网络（带 * 标记）
      const lines = envsOutput.split('\n');
      for (const line of lines) {
        if (line.includes('*')) {
          // 提取网络名称（第一列）
          const columns = line.split('│').map(col => col.trim());
          if (columns.length >= 4 && columns[3] === '*') {
            return columns[1]; // 返回网络别名
          }
        }
      }
      
      // 如果没有找到活跃网络，返回默认值
      console.warn('未能检测到当前激活的网络，使用默认的 localnet');
      return 'localnet';
    } catch (error) {
      console.warn('检测网络环境失败，使用默认的 localnet:', error);
      return 'localnet';
    }
  }

  /**
   * 从 Move.toml 文件中读取项目名称
   */
  private getProjectName(): string {
    const moveTomlPath = path.join(process.cwd(), 'Move.toml');
    
    if (!fs.existsSync(moveTomlPath)) {
      throw new Error('Move.toml 文件不存在');
    }

    const moveTomlContent = fs.readFileSync(moveTomlPath, 'utf8');
    
    // 解析 TOML 中的 name 字段
    const nameMatch = moveTomlContent.match(/^name\s*=\s*"([^"]+)"/m);
    
    if (!nameMatch) {
      throw new Error('无法从 Move.toml 中找到项目名称');
    }

    return nameMatch[1];
  }

  /**
   * 从.env文件中读取包ID
   */
  private getPackageIdFromEnv(): string | null {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      return null;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const packageIdMatch = envContent.match(/PACKAGE_ID=(.+)/);
    
    return packageIdMatch ? packageIdMatch[1].trim() : null;
  }

  /**
   * 从.env文件中读取发布者权限对象ID
   */
  private getPublisherIdFromEnv(): string | null {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      return null;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const publisherMatch = envContent.match(/PUBLISHER_ID=(.+)/);
    
    return publisherMatch ? publisherMatch[1].trim() : null;
  }

  async deployContract(): Promise<string> {
    try {
      // 检查当前网络是否与目标网络匹配
      const currentNetwork = this.getCurrentActiveNetwork();
      if (currentNetwork !== this.network) {
        console.log(`当前网络: ${currentNetwork}, 切换到${this.network}网络...`);
        execSync(`sui client switch --env ${this.network}`, { 
          cwd: process.cwd(), 
          stdio: 'inherit' 
        });
      } else {
        console.log(`当前已在${this.network}网络`);
      }

      // 检查当前活跃地址
      console.log('检查当前地址...');
      const activeAddress = execSync('sui client active-address', { 
        cwd: process.cwd(), 
        encoding: 'utf8' 
      }).trim();
      console.log('当前地址:', activeAddress);

      // 检查余额
      const balance = execSync('sui client balance', { 
        cwd: process.cwd(), 
        encoding: 'utf8' 
      });
      console.log('当前余额:', balance);

      // 构建Move项目
      console.log('构建Move项目...');
      execSync('sui move build', { cwd: process.cwd(), stdio: 'inherit' });

      // 读取编译后的字节码
      const projectName = this.getProjectName();
      const buildDir = path.join(process.cwd(), 'build', projectName);
      
      if (!fs.existsSync(buildDir)) {
        throw new Error(`构建目录不存在: ${buildDir}，请确保Move项目编译成功`);
      }

      if (this.isUpgrade) {
        // 升级模式
        return await this.upgradeContract();
      } else {
        // 发布模式
        return await this.publishContract();
      }
    } catch (error) {
      console.error('部署失败:', error);
      throw error;
    }
  }

  /**
   * 发布新合约
   */
  private async publishContract(): Promise<string> {
    console.log('发布合约到Sui网络...');
    
    const publishCommand = 'sui client publish --gas-budget 200000000 --json';
    const result = execSync(publishCommand, { 
      cwd: process.cwd(), 
      encoding: 'utf8' 
    });

    const publishResult = JSON.parse(result);
    
    if (publishResult.effects?.status?.status !== 'success') {
      throw new Error(`合约发布失败: ${publishResult.effects?.status?.error}`);
    }

    // 提取包ID
    const packageId = publishResult.objectChanges?.find(
      (change: any) => change.type === 'published'
    )?.packageId;

    if (!packageId) {
      throw new Error('无法找到已发布的包ID');
    }

    // 提取Publisher ID (用于后续创建UpgradeCap)
    const publisherId = publishResult.objectChanges?.find(
      (change: any) => change.type === 'created' && 
      change.objectType?.includes('Publisher')
    )?.objectId;

    // 提取AdminCap ID
    const adminCapId = publishResult.objectChanges?.find(
      (change: any) => change.type === 'created' && 
      change.objectType?.includes('AdminCap')
    )?.objectId;

    // 提取GlobalConfig ID
    const globalConfigId = publishResult.objectChanges?.find(
      (change: any) => change.type === 'created' && 
      change.objectType?.includes('GlobalConfig')
    )?.objectId;

    console.log('合约发布成功！');
    console.log('包ID:', packageId);
    if (publisherId) {
      console.log('发布者权限ID:', publisherId);
    }
    if (adminCapId) {
      console.log('管理员权限ID:', adminCapId);
    }
    if (globalConfigId) {
      console.log('全局配置ID:', globalConfigId);
    }

    // 保存所有相关ID到环境文件
    this.saveDeploymentInfo(packageId, publisherId, adminCapId, globalConfigId);

    return packageId;
  }

  /**
   * 升级现有合约
   */
  private async upgradeContract(): Promise<string> {
    console.log('升级合约...');

    // 获取现有的包ID和发布者权限ID
    const existingPackageId = this.getPackageIdFromEnv();
    const publisherId = this.getPublisherIdFromEnv();

    if (!existingPackageId) {
      throw new Error('找不到现有的包ID，请先发布合约');
    }

    if (!publisherId) {
      throw new Error('找不到发布者权限ID，无法升级合约');
    }

    console.log('现有包ID:', existingPackageId);
    console.log('发布者权限ID:', publisherId);

    // 首先需要从Publisher创建UpgradeCap
    console.log('正在创建升级权限...');
    const createUpgradeCapCommand = `sui client call --package 0x2 --module package --function authorize_upgrade --args ${publisherId} --gas-budget 10000000 --json`;
    
    const upgradeCapResult = execSync(createUpgradeCapCommand, { 
      cwd: process.cwd(), 
      encoding: 'utf8' 
    });

    const upgradeCapData = JSON.parse(upgradeCapResult);
    
    if (upgradeCapData.effects?.status?.status !== 'success') {
      throw new Error(`创建升级权限失败: ${upgradeCapData.effects?.status?.error}`);
    }

    // 提取UpgradeCap ID
    const upgradeCapId = upgradeCapData.objectChanges?.find(
      (change: any) => change.type === 'created' && 
      change.objectType?.includes('UpgradeCap')
    )?.objectId;

    if (!upgradeCapId) {
      throw new Error('无法找到创建的升级权限ID');
    }

    console.log('升级权限ID:', upgradeCapId);

    // 现在执行升级
    const upgradeCommand = `sui client upgrade --package-id ${existingPackageId} --upgrade-capability ${upgradeCapId} --gas-budget 200000000 --json`;
    const result = execSync(upgradeCommand, { 
      cwd: process.cwd(), 
      encoding: 'utf8' 
    });

    const upgradeResult = JSON.parse(result);
    
    if (upgradeResult.effects?.status?.status !== 'success') {
      throw new Error(`合约升级失败: ${upgradeResult.effects?.status?.error}`);
    }

    // 提取新的包ID
    const newPackageId = upgradeResult.objectChanges?.find(
      (change: any) => change.type === 'published'
    )?.packageId;

    if (!newPackageId) {
      throw new Error('无法找到升级后的包ID');
    }

    console.log('合约升级成功！');
    console.log('新包ID:', newPackageId);

    // 更新环境文件中的包ID
    this.updatePackageId(newPackageId);

    return newPackageId;
  }

  private saveDeploymentInfo(packageId: string, publisherId?: string, adminCapId?: string, globalConfigId?: string): void {
    const envPath = path.join(process.cwd(), '.env');
    
    let envContent = '';
    
    // 如果.env文件存在，读取现有内容
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      // 如果不存在，从示例文件创建
      const envExamplePath = path.join(process.cwd(), 'env.example');
      if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, 'utf8');
      }
    }
    
    // 更新网络配置
    if (envContent.includes('SUI_NETWORK=')) {
      envContent = envContent.replace(/SUI_NETWORK=.*/, `SUI_NETWORK=${this.network}`);
    } else {
      envContent += `\nSUI_NETWORK=${this.network}\n`;
    }
    
    // 更新包ID
    if (envContent.includes('PACKAGE_ID=')) {
      envContent = envContent.replace(/PACKAGE_ID=.*/, `PACKAGE_ID=${packageId}`);
    } else {
      envContent += `\nPACKAGE_ID=${packageId}\n`;
    }

    // 更新发布者权限ID（如果提供）
    if (publisherId) {
      if (envContent.includes('PUBLISHER_ID=')) {
        envContent = envContent.replace(/PUBLISHER_ID=.*/, `PUBLISHER_ID=${publisherId}`);
      } else {
        envContent += `\nPUBLISHER_ID=${publisherId}\n`;
      }
    }

    // 更新管理员权限ID（如果提供）
    if (adminCapId) {
      if (envContent.includes('ADMIN_CAP_ID=')) {
        envContent = envContent.replace(/ADMIN_CAP_ID=.*/, `ADMIN_CAP_ID=${adminCapId}`);
      } else {
        envContent += `\nADMIN_CAP_ID=${adminCapId}\n`;
      }
    }

    // 更新全局配置ID（如果提供）
    if (globalConfigId) {
      if (envContent.includes('GLOBAL_CONFIG_ID=')) {
        envContent = envContent.replace(/GLOBAL_CONFIG_ID=.*/, `GLOBAL_CONFIG_ID=${globalConfigId}`);
      } else {
        envContent += `\nGLOBAL_CONFIG_ID=${globalConfigId}\n`;
      }
    }

    // 写入.env文件
    fs.writeFileSync(envPath, envContent);
    console.log('配置已保存到.env文件');
  }

  private updatePackageId(newPackageId: string): void {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      throw new Error('.env文件不存在，无法更新包ID');
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // 更新包ID
    if (envContent.includes('PACKAGE_ID=')) {
      envContent = envContent.replace(/PACKAGE_ID=.*/, `PACKAGE_ID=${newPackageId}`);
    } else {
      envContent += `\nPACKAGE_ID=${newPackageId}\n`;
    }

    // 写入.env文件
    fs.writeFileSync(envPath, envContent);
    console.log('包ID已更新到.env文件');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 解析命令行参数
  const args = process.argv.slice(2);
  let networkArg: string | undefined;
  let isUpgrade = false;

  // 检查是否有 --upgrade 参数
  const upgradeIndex = args.indexOf('--upgrade');
  if (upgradeIndex !== -1) {
    isUpgrade = true;
    args.splice(upgradeIndex, 1); // 移除 --upgrade 参数
  }

  // 剩下的参数作为网络名称
  networkArg = args[0];

  const deployer = new ContractDeployer(networkArg, isUpgrade);
  
  deployer.deployContract()
    .then(packageId => {
      if (isUpgrade) {
        console.log(`\n✅ 升级完成！`);
        console.log(`📦 新包ID: ${packageId}`);
      } else {
        console.log(`\n✅ 部署完成！`);
        console.log(`📦 包ID: ${packageId}`);
      }
      console.log(`🌐 网络: ${deployer.getNetwork()}`);
      console.log(`\n现在你可以运行测试:`);
      console.log(`npm test`);
    })
    .catch(error => {
      console.error(isUpgrade ? '❌ 升级失败:' : '❌ 部署失败:', error);
      process.exit(1);
    });
} 