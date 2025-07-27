import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromB64, fromHEX } from '@mysten/sui/utils';

export class SuiTestClient {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private packageId: string;

  constructor() {
    // 初始化客户端，默认使用本地网络
    const network = process.env.SUI_NETWORK || 'localnet';
    this.client = new SuiClient({ 
      url: getFullnodeUrl(network as any) 
    });

    // 创建测试密钥对
    if (process.env.TEST_PRIVATE_KEY) {
      const privateKey = process.env.TEST_PRIVATE_KEY;
      
      if (privateKey.startsWith('suiprivkey')) {
        // 处理sui格式的私钥
        this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
      } else {
        // 处理base64格式的私钥
        const privateKeyBytes = fromB64(privateKey);
        this.keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
      }
    } else {
      // 生成新的密钥对用于测试
      this.keypair = new Ed25519Keypair();
    }

    this.packageId = process.env.PACKAGE_ID || '0x0';
  }

  getClient(): SuiClient {
    return this.client;
  }

  getKeypair(): Ed25519Keypair {
    return this.keypair;
  }

  getAddress(): string {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  getPackageId(): string {
    return this.packageId;
  }

  setPackageId(packageId: string): void {
    this.packageId = packageId;
  }

  // 获取账户余额
  async getBalance(): Promise<bigint> {
    const balance = await this.client.getBalance({
      owner: this.getAddress(),
    });
    return BigInt(balance.totalBalance);
  }

  // 执行交易并等待确认
  async executeTransaction(txb: Transaction): Promise<any> {
    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });

    if (result.effects?.status?.status !== 'success') {
      throw new Error(`交易失败: ${result.effects?.status?.error}`);
    }

    return result;
  }

  // 获取对象信息
  async getObject(objectId: string): Promise<any> {
    return await this.client.getObject({
      id: objectId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      },
    });
  }

  // 获取拥有的对象
  async getOwnedObjects(objectType?: string): Promise<any[]> {
    const response = await this.client.getOwnedObjects({
      owner: this.getAddress(),
      filter: objectType ? { StructType: objectType } : undefined,
      options: {
        showContent: true,
        showType: true,
      },
    });

    return response.data;
  }
} 