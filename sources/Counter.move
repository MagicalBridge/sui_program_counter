// 声明模块：包名为my_counter，模块名为counter
module my_counter::counter {
    use sui::package;

    // 定义Counter结构体，具有key能力，可作为Sui对象存储在全局状态中
    public struct Counter has key {
        // 每个Sui对象必须有的唯一标识符字段
        id: sui::object::UID,
        // 计数器的当前值，使用64位无符号整数类型
        value: u64,
    }

    // 一次性见证类型，用于包升级授权
    public struct COUNTER has drop {}

    // 全局配置对象，用于存储合约级别的信息
    public struct GlobalConfig has key {
        id: sui::object::UID,
        // 合约版本号，用于跟踪合约升级
        version: u64,
        // 部署者地址（仅用于记录）
        deployer: address,
    }

    // 管理员权限对象，只有部署者拥有，用于管理全局配置
    public struct AdminCap has key, store {
        id: sui::object::UID,
    }

    // 包初始化函数，在包首次发布时调用
    // 这个函数会创建并转移Publisher给发布者
    fun init(otw: COUNTER, ctx: &mut sui::tx_context::TxContext) {
        // 创建包发布者权限（Publisher）
        let publisher = package::claim(otw, ctx);
        
        // 创建全局配置对象
        let global_config = GlobalConfig {
            id: sui::object::new(ctx),
            version: 1,
            deployer: sui::tx_context::sender(ctx),
        };
        
        // 创建管理员权限
        let admin_cap = AdminCap {
            id: sui::object::new(ctx),
        };
        
        // 将发布者权限和管理员权限转移给包发布者
        sui::transfer::public_transfer(publisher, sui::tx_context::sender(ctx));
        sui::transfer::transfer(admin_cap, sui::tx_context::sender(ctx));
        // 将全局配置共享，任何人都可以读取
        sui::transfer::share_object(global_config);
    }

    // 创建新Counter对象的入口函数，任何人都可以调用
    // ctx参数提供交易上下文信息，包括发送者地址等
    public entry fun create(ctx: &mut sui::tx_context::TxContext) {
        // 创建Counter结构体实例，初始化所有字段
        let counter: Counter = Counter {
            // 使用sui::object::new创建新的唯一对象ID
            id: sui::object::new(ctx),  
            // 将计数器初始值设为0
            value: 0,
        };
        // 将新创建的counter对象转移给交易发送者，发送者即为该Counter的所有者
        sui::transfer::transfer(counter, sui::tx_context::sender(ctx));
    }

    // ❌ 错误示例：创建对象但不转移 - 这个函数无法编译通过
    // public entry fun create_without_transfer(ctx: &mut sui::tx_context::TxContext) {
    //     let counter = Counter {
    //         id: sui::object::new(ctx),
    //         value: 0,
    //     };
    //     // 如果这里不进行转移，Move编译器会报错！
    //     // 因为具有'key'能力的对象必须被转移、共享或删除
    // }

    // 递增计数器值的入口函数，接受Counter对象的可变引用
    public entry fun increment(counter: &mut Counter) {
        // 将计数器的值增加1
        counter.value = counter.value + 1;
    }

    // 获取计数器当前值的公共函数，返回u64类型
    // 注意：这不是entry函数，只能被其他Move代码调用
    public fun get_value(counter: &Counter): u64 {
        // 返回计数器的当前值
        return counter.value
    }

    // 获取全局配置版本号
    public fun get_global_version(config: &GlobalConfig): u64 {
        config.version
    }

    // 获取部署者地址
    public fun get_deployer(config: &GlobalConfig): address {
        config.deployer
    }

    // 只有部署者（拥有AdminCap）才能升级全局版本
    public entry fun upgrade_global_version(config: &mut GlobalConfig, _admin_cap: &AdminCap) {
        config.version = config.version + 1;
    }

    // Counter的所有者可以重置自己的计数器（不需要AdminCap）
    public entry fun reset(counter: &mut Counter) {
        counter.value = 0;
    }

    // Counter的所有者可以设置自己的计数器值（不需要AdminCap）
    public entry fun set_value(counter: &mut Counter, new_value: u64) {
        counter.value = new_value;
    }

    // 批量递增函数 - 这是一个可能在升级中添加的新功能
    public entry fun increment_by(counter: &mut Counter, amount: u64) {
        counter.value = counter.value + amount;
    }

    // 递减功能 - 另一个可能在升级中添加的新功能
    public entry fun decrement(counter: &mut Counter) {
        if (counter.value > 0) {
            counter.value = counter.value - 1;
        }
    }

    // 检查是否为部署者
    public fun is_deployer(config: &GlobalConfig, addr: address): bool {
        config.deployer == addr
    }
}
