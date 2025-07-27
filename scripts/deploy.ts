import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class ContractDeployer {
  private network: string;

  constructor(network: string = 'localnet') {
    this.network = network;
    console.log(`准备部署到${network}网络`);
  }

  async deployContract(): Promise<string> {
    try {
      // 切换到指定网络
      if (this.network !== 'localnet') {
        console.log(`切换到${this.network}网络...`);
        execSync(`sui client switch --env ${this.network}`, { 
          cwd: process.cwd(), 
          stdio: 'inherit' 
        });
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
      const buildDir = path.join(process.cwd(), 'build', 'my_counter');
      
      if (!fs.existsSync(buildDir)) {
        throw new Error('构建目录不存在，请确保Move项目编译成功');
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
  const network = process.argv[2] || 'localnet';
  const deployer = new ContractDeployer(network);
  
  deployer.deployContract()
    .then(packageId => {
      console.log(`\n✅ 部署完成！`);
      console.log(`📦 包ID: ${packageId}`);
      console.log(`🌐 网络: ${network}`);
      console.log(`\n现在你可以运行测试:`);
      console.log(`npm test`);
    })
    .catch(error => {
      console.error('❌ 部署失败:', error);
      process.exit(1);
    });
} 