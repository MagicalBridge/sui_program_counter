// Counter2 - 可升级的计数器智能合约
module my_counter::counter2 {
    use sui::package;

    // 计数器结构体
    public struct Counter2 has key {
        id: sui::object::UID,
        // 计数器的当前值，初始值为0
        value: u64,
    }

    // 一次性见证类型，用于包升级授权
    public struct COUNTER2 has drop {}

    // 全局配置对象，存储合约级别信息
    public struct GlobalConfig has key {
        id: sui::object::UID,
        // 合约版本号，每次升级时递增
        version: u64,
        // 部署者地址
        deployer: address,
        // 最后升级时间戳
        last_upgrade_time: u64,
    }

    // 升级权限对象，只有部署者拥有
    public struct UpgradeCap has key, store {
        id: sui::object::UID,
        // 部署者地址
        deployer: address,
    }

    // === 事件定义 ===
    
    // 计数器递增事件
    public struct CounterIncremented has copy, drop {
        counter_id: sui::object::ID,
        caller: address,
        new_value: u64,
        timestamp: u64,
    }

    // 包初始化函数，在包首次发布时调用
    fun init(otw: COUNTER2, ctx: &mut sui::tx_context::TxContext) {
        // 创建包发布者权限（用于合约升级）
        let publisher = package::claim(otw, ctx);
        
        // 创建全局配置对象
        let global_config = GlobalConfig {
            id: sui::object::new(ctx),
            version: 2, // 升级版本为2
            deployer: sui::tx_context::sender(ctx),
            last_upgrade_time: sui::tx_context::epoch_timestamp_ms(ctx),
        };
        
        // 创建升级权限对象
        let upgrade_cap = UpgradeCap {
            id: sui::object::new(ctx),
            deployer: sui::tx_context::sender(ctx),
        };
        
        // 将发布者权限和升级权限转移给部署者
        sui::transfer::public_transfer(publisher, sui::tx_context::sender(ctx));
        sui::transfer::transfer(upgrade_cap, sui::tx_context::sender(ctx));
        
        // 将全局配置共享，任何人都可以读取
        sui::transfer::share_object(global_config);
    }

    // 创建计数器，初始值为0，任何人都可以调用
    public entry fun create_counter(ctx: &mut sui::tx_context::TxContext) {
        let counter = Counter2 {
            id: sui::object::new(ctx),
            value: 0, // 初始值为0
        };
        // 创建共享对象，这样任何人都可以调用increment函数
        sui::transfer::share_object(counter);
    }

    // 递增函数，每调用一次数值就加1，任何人都可以调用，并发出事件
    public entry fun increment(counter: &mut Counter2, ctx: &sui::tx_context::TxContext) {
        counter.value = counter.value + 1;
        
        // 发出递增事件
        sui::event::emit(CounterIncremented {
            counter_id: sui::object::id(counter),
            caller: sui::tx_context::sender(ctx),
            new_value: counter.value,
            timestamp: sui::tx_context::epoch_timestamp_ms(ctx),
        });
    }

    // 获取计数器当前值
    public fun get_value(counter: &Counter2): u64 {
        counter.value
    }

    // === 版本管理相关函数 ===

    // 获取合约版本号
    public fun get_version(config: &GlobalConfig): u64 {
        config.version
    }

    // 获取部署者地址
    public fun get_deployer(config: &GlobalConfig): address {
        config.deployer
    }

    // 获取最后升级时间
    public fun get_last_upgrade_time(config: &GlobalConfig): u64 {
        config.last_upgrade_time
    }

    // 检查是否为部署者
    public fun is_deployer(config: &GlobalConfig, addr: address): bool {
        config.deployer == addr
    }

    // 升级到指定版本（只有部署者可以调用）
    public entry fun upgrade_to_version(
        config: &mut GlobalConfig, 
        new_version: u64,
        _upgrade_cap: &UpgradeCap,
        ctx: &sui::tx_context::TxContext
    ) {
        // 确保新版本号大于当前版本
        assert!(new_version > config.version, 0);
        config.version = new_version;
        config.last_upgrade_time = sui::tx_context::epoch_timestamp_ms(ctx);
    }

    // 自动递增版本号（只有部署者可以调用）
    public entry fun increment_version(
        config: &mut GlobalConfig, 
        _upgrade_cap: &UpgradeCap,
        ctx: &sui::tx_context::TxContext
    ) {
        config.version = config.version + 1;
        config.last_upgrade_time = sui::tx_context::epoch_timestamp_ms(ctx);
    }

    // 合约升级函数，只有部署者（拥有UpgradeCap）可以调用
    public entry fun authorize_upgrade(_upgrade_cap: &UpgradeCap) {
        // 这个函数的存在本身就是升级授权
        // 只有拥有UpgradeCap的部署者才能调用此函数
        // 实际的升级操作由Sui系统处理
        // 注意：升级后应该调用upgrade_version函数更新版本号
    }
}