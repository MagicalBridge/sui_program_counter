// 声明模块：包名为my_counter，模块名为counter
module my_counter::counter {

    // 定义Counter结构体，具有key能力，可作为Sui对象存储在全局状态中
    public struct Counter has key {
        // 每个Sui对象必须有的唯一标识符字段
        id: sui::object::UID,
        // 计数器的当前值，使用64位无符号整数类型
        value: u64,
    }

    // 创建新Counter对象的入口函数，可以直接从交易中调用
    // ctx参数提供交易上下文信息，包括发送者地址等
    public entry fun create(ctx: &mut sui::tx_context::TxContext) {
        // 创建Counter结构体实例，初始化所有字段
        let counter: Counter = Counter {
            // 使用sui::object::new创建新的唯一对象ID
            id: sui::object::new(ctx),  
            // 将计数器初始值设为0
            value: 0,
        };
        // 将新创建的counter对象转移给交易发送者
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
}
