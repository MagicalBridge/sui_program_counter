import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class ContractDeployer {
  private network: string;

  constructor(network?: string) {
    // 如果用户没有指定网络，则自动检测当前激活的网络
    this.network = network || this.getCurrentActiveNetwork();
    console.log(`准备部署到${this.network}网络`);
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

      // 使用sui client publish发布合约
      console.log('发布合约到Sui网络...');
      
      const publishCommand = 'sui client publish --gas-budget 20000000 --json';
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

      console.log('合约发布成功！');
      console.log('包ID:', packageId);

      // 保存包ID到环境文件
      this.savePackageId(packageId);

      return packageId;
    } catch (error) {
      console.error('部署失败:', error);
      throw error;
    }
  }

  private savePackageId(packageId: string): void {
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

    // 写入.env文件
    fs.writeFileSync(envPath, envContent);
    console.log('配置已保存到.env文件');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 从命令行参数获取网络，如果没有指定则让构造函数自动检测
  const networkArg = process.argv[2];
  const deployer = new ContractDeployer(networkArg);
  
  deployer.deployContract()
    .then(packageId => {
      console.log(`\n✅ 部署完成！`);
      console.log(`📦 包ID: ${packageId}`);
      console.log(`🌐 网络: ${deployer.getNetwork()}`); // 使用实际检测到的网络
      console.log(`\n现在你可以运行测试:`);
      console.log(`npm test`);
    })
    .catch(error => {
      console.error('❌ 部署失败:', error);
      process.exit(1);
    });
} 