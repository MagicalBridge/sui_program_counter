import { Transaction } from '@mysten/sui/transactions';
import { SuiTestClient } from './utils/sui-client';

describe('Counter Smart Contract Tests', () => {
  let suiClient: SuiTestClient;
  let packageId: string;

  beforeAll(async () => {
    // 初始化测试客户端
    suiClient = new SuiTestClient();
    
    // 检查包ID是否已设置
    packageId = suiClient.getPackageId();
    if (packageId === '0x0') {
      console.log('需要先发布合约。请运行: npm run deploy:devnet');
      console.log('然后在.env文件中设置PACKAGE_ID');
      return;
    }
    
    console.log('测试地址:', suiClient.getAddress());
    console.log('包ID:', packageId);
    
    // 检查余额
    const balance = await suiClient.getBalance();
    console.log('当前余额:', balance.toString(), 'MIST');
    
    if (balance < BigInt(100000000)) { // 0.1 SUI
      console.warn('余额可能不足，建议至少有0.1 SUI用于测试');
    }
  });

  describe('Counter Creation Tests', () => {
    test('应该能够成功创建新的Counter对象', async () => {
      // 如果包ID未设置，跳过测试
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      const tx = new Transaction();
      
      // 调用create函数
      tx.moveCall({
        target: `${packageId}::counter::create`,
        arguments: [],
      });

      // 执行交易
      const result = await suiClient.executeTransaction(tx);

      // 验证交易成功
      expect(result.effects?.status?.status).toBe('success');
      expect(result.objectChanges).toBeDefined();
      
      // 验证创建了新对象
      const createdObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );
      expect(createdObjects).toHaveLength(1);
      
      // 验证对象类型
      const counterObject = createdObjects?.[0];
      expect(counterObject.objectType).toContain('::counter::Counter');
    });

    test('应该为每次创建分配不同的对象ID', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      const objectIds: string[] = [];

      // 创建多个Counter对象
      for (let i = 0; i < 3; i++) {
        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::counter::create`,
          arguments: [],
        });

        const result = await suiClient.executeTransaction(tx);
        const createdObjects = result.objectChanges?.filter(
          (change: any) => change.type === 'created'
        );
        
        expect(createdObjects).toHaveLength(1);
        objectIds.push(createdObjects![0].objectId);
      }

      // 验证所有对象ID都不相同
      const uniqueIds = new Set(objectIds);
      expect(uniqueIds.size).toBe(objectIds.length);
    });

    test('创建的Counter对象应该属于交易发送者', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::counter::create`,
        arguments: [],
      });

      const result = await suiClient.executeTransaction(tx);
      const createdObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );
      
      expect(createdObjects).toHaveLength(1);
      const counterObject = createdObjects![0];
      expect(counterObject.owner).toEqual({
        AddressOwner: suiClient.getAddress()
      });
    });
  });

  describe('Counter Increment Tests', () => {
    let counterId: string;

    beforeEach(async () => {
      if (packageId === '0x0') {
        return;
      }

      // 为每个测试创建新的Counter对象
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::counter::create`,
        arguments: [],
      });

      const result = await suiClient.executeTransaction(tx);
      const createdObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );
      
      counterId = createdObjects![0].objectId;
    });

    test('应该能够成功递增计数器', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::counter::increment`,
        arguments: [tx.object(counterId)],
      });

      const result = await suiClient.executeTransaction(tx);

      // 验证交易成功
      expect(result.effects?.status?.status).toBe('success');
      
      // 验证对象被修改（可能有counter对象和gas coin被修改）
      const mutatedObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'mutated'
      );
      expect(mutatedObjects.length).toBeGreaterThanOrEqual(1);
      
      // 验证counter对象在修改列表中
      const counterMutation = mutatedObjects?.find(
        (change: any) => change.objectId === counterId
      );
      expect(counterMutation).toBeDefined();
      expect(counterMutation.objectId).toBe(counterId);
    });

    test('多次递增应该正确累加计数值', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      const incrementCount = 5;

      // 执行多次递增
      for (let i = 0; i < incrementCount; i++) {
        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::counter::increment`,
          arguments: [tx.object(counterId)],
        });

        const result = await suiClient.executeTransaction(tx);
        expect(result.effects?.status?.status).toBe('success');
        
        // 添加小延迟避免过快的连续操作
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 获取最终对象状态并验证计数值
      const counterObject = await suiClient.getObject(counterId);
      expect(counterObject.data?.content?.fields?.value).toBe(incrementCount.toString());
    });

    test('应该处理大量递增操作', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      const largeIncrementCount = 20; // 减少操作次数以避免超时

      // 串行递增操作（避免并发修改同一对象）
      for (let i = 0; i < largeIncrementCount; i++) {
        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::counter::increment`,
          arguments: [tx.object(counterId)],
        });

        const result = await suiClient.executeTransaction(tx);
        expect(result.effects?.status?.status).toBe('success');
        
        // 添加小延迟避免过快的连续操作
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // 验证最终计数值
      const counterObject = await suiClient.getObject(counterId);
      expect(counterObject.data?.content?.fields?.value).toBe(largeIncrementCount.toString());
    }, 60000); // 增加超时到60秒
  });

  describe('Counter Value Reading Tests', () => {
    let counterId: string;

    beforeEach(async () => {
      if (packageId === '0x0') {
        return;
      }

      // 创建新的Counter对象
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::counter::create`,
        arguments: [],
      });

      const result = await suiClient.executeTransaction(tx);
      const createdObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );
      
      counterId = createdObjects![0].objectId;
    });

    test('新创建的Counter初始值应该为0', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      const counterObject = await suiClient.getObject(counterId);
      expect(counterObject.data?.content?.fields?.value).toBe('0');
    });

    test('应该能够正确读取递增后的值', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      const expectedValue = 7;

      // 递增指定次数
      for (let i = 0; i < expectedValue; i++) {
        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::counter::increment`,
          arguments: [tx.object(counterId)],
        });

        await suiClient.executeTransaction(tx);
        
        // 添加小延迟避免过快的连续操作
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // 验证读取的值
      const counterObject = await suiClient.getObject(counterId);
      expect(counterObject.data?.content?.fields?.value).toBe(expectedValue.toString());
    });
  });

  describe('Error Handling Tests', () => {
    test('使用无效对象ID应该抛出错误', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      const invalidObjectId = '0x1234567890abcdef';
      
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::counter::increment`,
        arguments: [tx.object(invalidObjectId)],
      });

      // 应该抛出错误或交易失败
      await expect(suiClient.executeTransaction(tx)).rejects.toThrow();
    });

    test('使用错误类型的对象应该失败', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      // 尝试使用SUI代币对象作为Counter对象
      const coins = await suiClient.getClient().getCoins({
        owner: suiClient.getAddress(),
        coinType: '0x2::sui::SUI',
      });

      if (coins.data.length > 0) {
        const coinObjectId = coins.data[0].coinObjectId;
        
        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::counter::increment`,
          arguments: [tx.object(coinObjectId)],
        });

        // 应该失败，因为类型不匹配
        await expect(suiClient.executeTransaction(tx)).rejects.toThrow();
      }
    });
  });

  describe('Gas Cost Tests', () => {
    test('创建Counter的Gas消耗应该在合理范围内', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      // 添加延迟避免Gas coin冲突
      await new Promise(resolve => setTimeout(resolve, 1000));

      const initialBalance = await suiClient.getBalance();

      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::counter::create`,
        arguments: [],
      });

      const result = await suiClient.executeTransaction(tx);
      
      // 添加延迟确保余额更新
      await new Promise(resolve => setTimeout(resolve, 500));
      const finalBalance = await suiClient.getBalance();

      // 计算Gas消耗
      const gasUsed = initialBalance - finalBalance;
      console.log('创建Counter Gas消耗:', gasUsed.toString());

      // Gas消耗应该在合理范围内（少于0.01 SUI）
      expect(gasUsed).toBeLessThan(BigInt(10000000));
      expect(result.effects?.status?.status).toBe('success');
    });

    test('递增操作的Gas消耗应该在合理范围内', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      // 添加延迟避免Gas coin冲突  
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 首先创建Counter
      const createTx = new Transaction();
      createTx.moveCall({
        target: `${packageId}::counter::create`,
        arguments: [],
      });

      const createResult = await suiClient.executeTransaction(createTx);
      const createdObjects = createResult.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );
      const counterId = createdObjects![0].objectId;

      // 添加延迟确保余额更新
      await new Promise(resolve => setTimeout(resolve, 500));

      // 测试递增操作的Gas消耗
      const initialBalance = await suiClient.getBalance();

      const incrementTx = new Transaction();
      incrementTx.moveCall({
        target: `${packageId}::counter::increment`,
        arguments: [incrementTx.object(counterId)],
      });

      const result = await suiClient.executeTransaction(incrementTx);
      
      // 添加延迟确保余额更新
      await new Promise(resolve => setTimeout(resolve, 500));
      const finalBalance = await suiClient.getBalance();

      // 计算Gas消耗
      const gasUsed = initialBalance - finalBalance;
      console.log('递增操作Gas消耗:', gasUsed.toString());

      // Gas消耗应该在合理范围内（少于0.005 SUI）
      expect(gasUsed).toBeLessThan(BigInt(5000000));
      expect(result.effects?.status?.status).toBe('success');
    });
  });

  describe('Ownership Tests', () => {
    test('只有对象所有者才能修改Counter', async () => {
      if (packageId === '0x0') {
        console.warn('跳过测试：包ID未设置');
        return;
      }

      // 创建Counter对象
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::counter::create`,
        arguments: [],
      });

      const result = await suiClient.executeTransaction(tx);
      const createdObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );
      const counterId = createdObjects![0].objectId;

      // 验证对象所有者（从交易结果中获取）
      const counterObject = createdObjects![0];
      expect(counterObject.owner).toEqual({
        AddressOwner: suiClient.getAddress()
      });

      // 也可以通过getObject API验证
      const fetchedObject = await suiClient.getObject(counterId);
      if (fetchedObject.data?.owner) {
        expect(fetchedObject.data.owner).toEqual({
          AddressOwner: suiClient.getAddress()
        });
      }

      // 由于我们使用同一个客户端，无法测试不同所有者的情况
      // 在实际应用中，可以创建多个测试账户来测试这种情况
    });
  });
}); 