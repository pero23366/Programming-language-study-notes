==零：补充==

> **这一篇（P172–P174）回答三个问题：一个事务能改多少东西？规则该放在哪个类？改完了怎么告诉别人？**

## 它解决什么问题

**上一篇（P166–P171）你学会了分辨"实体"和"值对象"，但那只解决了"单个对象怎么建模"。**

**一旦开始写代码，立刻撞上三个新问题：**

| 问题 | 具体长什么样 |
|---|---|
| **边界问题** | `Order` 和 `OrderItem` 是一起改的，`Order` 和 `Inventory` 是不是也该一起改？改到哪为止？ |
| **归属问题** | "下单要检查库存"这条规则，放 `Order` 里？放 `Inventory` 里？还是放 `OrderService` 里？ |
| **通知问题** | 订单提交了，要通知仓库、发短信、加积分、写审计 —— 这些代码塞哪？ |

**这三个问题的答案就是 P172 / P173 / P174：**

```
P172 聚合    → 回答"边界在哪"（一个事务的最小单位 + 最大单位）
P173 服务    → 回答"规则住哪"（聚合内 / 聚合之间 / 用例编排）
P174 事件    → 回答"怎么通知"（进程内 / 跨进程）
```

## 没有它会怎样

**不讲理论，讲三个你现在就可能写出来的代码。**

### 灾难一：事务无限膨胀

**你的直觉写法：**

```csharp
using var tx = await _ctx.Database.BeginTransactionAsync();

var order = await _ctx.Orders.FindAsync(orderId);
order.Status = Submitted;

var inv = await _ctx.Inventories.FirstAsync(i => i.Sku == "BOOK-001");
inv.Available -= 2;                                  // 扣库存

var reader = await _ctx.Readers.FindAsync(readerId);
reader.Points += 10;                                 // 加积分

await _ctx.MsgQueue.AddAsync(new Sms { ... });       // 记录要发的短信
await _ctx.AuditLogs.AddAsync(new AuditLog { ... }); // 写审计

await _ctx.SaveChangesAsync();
await tx.CommitAsync();
```

**这在两个人测试的时候完美运行。** 一千个人同时下单的时候：

| 问题 | 原因 |
|---|---|
| 死锁 | 事务 A 锁了 Order 等 Inventory，事务 B 锁了 Inventory 等 Order |
| 锁等待雪崩 | 一个事务持锁 200ms，1000 并发 → 队列排到 200 秒 |
| 无法扩容 | 这张事务碰了 5 张表 → 这 5 张表永远必须在同一个库里 → **永远拆不开** |
| 一个慢查询拖垮全部 | 审计日志表锁了，所有下单全卡住 |

**这不是"性能优化问题"，是"边界没画"的直接后果。**

### 灾难二：Service 变成上帝类

**没有职责划分，规则会自然堆到 Service 里：**

```csharp
public class OrderService
{
    public void Create() { ... }
    public void Submit() { ... }
    public void Cancel() { ... }
    public void Pay() { ... }
    public void Refund() { ... }
    public void CheckStock() { ... }
    public void CalcDiscount() { ... }
    public void SendSms() { ... }
    public void AddPoints() { ... }
    public void WriteAudit() { ... }
    // … 1800 行
}
```

**判断标准很简单：** 当一个类的方法超过 10 个、行数超过 500 行，它已经不是"服务"，是"杂物间"。

### 灾难三：模块之间直接调用

**订单提交后要通知仓库，最直接的写法：**

```csharp
public class OrderService
{
    private readonly WarehouseService _warehouse;   // 直接依赖另一个模块
    private readonly SmsService _sms;
    private readonly PointService _points;

    public void Submit(Order order)
    {
        order.Status = Submitted;
        _ctx.SaveChanges();

        _warehouse.Outbound(order.Id);    // 同步调用仓库
        _sms.Send(order.Buyer, "已提交");  // 同步发短信
        _points.Add(order.Buyer, 10);     // 同步加积分
    }
}
```

**后果链：**

| 问题 | 说明 |
|---|---|
| 短信接口超时 | 整个下单请求 30 秒才返回（用户以为卡死） |
| 短信接口挂了 | 订单提交失败 —— **但订单其实已经存进库了** |
| 想加"发邮件" | 改 `OrderService`（订单模块不该关心邮件） |
| 想测"下单" | 要 mock 三个外部服务 |
| 仓库模块改了接口 | 订单模块编译不过 |

**这就是"耦合"，不是形容词，是可以数出来的：一次下单要经过 4 个模块的代码。**

**P174 的答案是：订单只需"宣布一件事发生了"，谁关心谁自己订阅。**

## 它在生态里的位置

**这三个概念是一条链，从内往外：**

```
┌──────────────────────────────────────────────────────────────┐
│  应用服务 Application Service                                 │
│    「这个 HTTP 请求要做哪几件事」—— 编排、事务、事件派发        │
│    ┌────────────────────────────────────────────────────┐    │
│    │  领域服务 Domain Service                            │    │
│    │    「这条规则跨了两个聚合」                          │    │
│    │    ┌──────────────────────────────────────────┐    │    │
│    │    │  聚合 Aggregate（边界）                    │    │    │
│    │    │    ┌──────────────┐  ┌──────────────┐    │    │    │
│    │    │    │  聚合根 Order │  │ 子实体 Item  │    │    │    │
│    │    │    │  （唯一入口） │←→│（外面不许碰） │    │    │    │
│    │    │    └──────────────┘  └──────────────┘    │    │    │
│    │    │         ↑                                 │    │    │
│    │    │    领域事件（聚合内部发生了什么）            │    │    │
│    │    └──────────────────────────────────────────┘    │    │
│    └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
        ↓ 跨进程时
   集成事件 Integration Event（消息队列 / outbox）
```

**一句话概括三层：**

| 层 | 一句话 | 数量 |
|---|---|---|
| 聚合 | **一个事务的最小单位** | 多（一个系统几十个） |
| 领域服务 | **跨聚合的规则的家** | 少（只在规则确实不属于任何一个聚合时才有） |
| 应用服务 | **一个用例的执行脚本** | 和用例数相当 |
| 领域事件 | **聚合说"我变了"** | 多 |
| 集成事件 | **系统对外说"我变了"** | 少（跨进程才用） |

## 对你的实际意义

**这两节是你游戏服务端最直接可用的部分。**

### 聚合边界 = 存档边界 = 事务边界

**你的游戏存档一次要写多少东西？**

| 数据 | 该不该在同一个聚合里 |
|---|---|
| 角色属性（HP/MP/等级/经验） | ✅ 同一个聚合（一起变，必须一致） |
| 角色的背包 | ❓ 看设计：如果"捡东西"要同时改角色和背包 → 分开；如果背包是角色的子对象 → 一起 |
| 角色的任务进度 | ❌ 另一个聚合（任务进度落后几秒没人发现） |
| 全服排行榜 | ❌ 绝对不是（最终一致，晚 1 分钟无所谓） |
| 交易记录 | ❌ 另一个聚合（而且必须能追溯） |

**判据：如果两个数据"不一致"会导致玩家立刻发现（比如金币扣了但道具没到），它们在同一个聚合里；如果晚 200ms 一致也没人发现，就分开。**

**这条判据直接决定了你的存档怎么原子提交：**

```
一次 SaveChanges = 一个聚合 = 一个事务 = 一次原子落盘
```

**如果你把整个玩家数据塞进一个聚合，那你的存档会越来越慢、越来越容易死锁。** 这是游戏服务端最常见的架构病。

### 领域事件 = 你的"成就系统"天然实现

**"玩家击杀 Boss" 这件事，会触发：**

| 订阅者 | 干什么 |
|---|---|
| 成就系统 | 检查是否解锁"屠龙者" |
| 任务系统 | 检查"击杀 10 只 Boss"进度 |
| 掉落系统 | 算掉落 |
| 统计系统 | 记一笔 |
| 聊天系统 | 全服公告 |

**如果你在 `CombatService.KillBoss()` 里直接调用这 5 个系统，这个方法是不可维护的。**

**用领域事件：`combat.Raise(new BossKilledEvent(...))`，5 个系统各自订阅。**

**加第 6 个系统（比如"录制精彩回放"）时，战斗代码一行都不改。** 这就是事件的价值——不是"解耦"这个抽象词，是"加功能不用改老代码"这件具体的事。

## 什么时候其实用不上

### 判据一：只有一个实体，没有子实体 → 没有聚合，只有实体

**`Category`（图书分类）这种表：** 没有子项、没有不变式、没有并发冲突 → **它就是一个实体，不需要"聚合根"这个身份。**

给单表实体套 `AggregateRoot` 基类、写 `Repository`、写 `DomainEvent` —— 全是空转。

### 判据二：不需要"跨聚合一致" → 不要领域服务

**领域服务只在"一条规则同时依赖两个聚合"时才有存在价值。**

如果所有规则都能塞进单个聚合根，那你的 `XxxDomainService` 就是**把应用服务的代码复制了一遍**。这是 DDD 项目里最常见的空壳类。

### 判据三：进程内没有第二个消费者 → 不要事件

**如果你 Raise 了一个事件，只有一个 handler，而且这个 handler 就在同一个方法里被同步调用 —— 那它不是事件，是"方法调用绕了一圈"。**

**事件的成本：** 多一个类、多一个派发器、断点调试时调用栈断开、出错时原因不明显。

**事件的价值：** 有 N 个消费者，且 N 会增长，且消费者之间互不关心。

**N = 1 且不会增长 → 直接方法调用。**

### 判据四：单体 + 单库 + 团队小 → 集成事件全部退化成领域事件

**你现在做单体应用，不需要 RabbitMQ。** 领域事件在进程内派发就够了。

**集成事件的门槛是"跨进程"**，不是"架构高级"。

---

==一：概念==

## P172 · 1. 聚合与聚合根

### 这一节要解决的问题

**一堆互相关联的实体，改的时候"改到哪为止"？**

### 定义

| 概念 | 定义 |
|---|---|
| **聚合（Aggregate）** | 一组**必须一起保持一致**的对象的集合 |
| **聚合根（Aggregate Root）** | 聚合的**唯一入口**，是一个实体，外部只能通过它操作聚合内部 |
| **聚合边界** | 聚合根 + 它内部所有对象，构成一个"数据修改的原子单位" |

**三个关键词：**

| 词 | 含义 | 反例 |
|---|---|---|
| **一起** | 同一个事务里改 | 分开改 → 中间状态被看到 |
| **一致** | 有不变式（invariant）约束 | 没有约束 → 不需要聚合 |
| **唯一入口** | 外部拿不到内部对象的引用 | 外部直接改子实体 → 不变式被绕过 |

### 最经典的例子：订单

```
┌─────────────────────── 聚合边界 ───────────────────────┐
│                                                        │
│    Order（聚合根）                                      │
│    ├─ Id                                               │
│    ├─ Buyer                                            │
│    ├─ Status                                           │
│    ├─ Total   ← 冗余字段，由子项算出                     │
│    └─ Items（子实体集合）                                │
│         ├─ OrderItem { Sku, Qty, Price }               │
│         └─ OrderItem { Sku, Qty, Price }               │
│                                                        │
└────────────────────────────────────────────────────────┘

不变式（必须永远成立）：
  ① Total == Σ(Item.Qty × Item.Price)
  ② Items.Count > 0（提交时）
  ③ 同一 Sku 不能出现两次

外部只能：order.AddItem(...) / order.Submit()
外部不能：order.Items.Add(...) / order.Total = 100
```

**为什么 `Order` 和 `OrderItem` 必须在同一个聚合：** 因为不变式 ①。

> **如果你能单独改 `OrderItem.Qty`，而 `Order.Total` 不跟着变，那 `Total` 就是一个会撒谎的字段。**
>
> **这一条就是聚合边界的判据：有不变式横跨这些对象 → 同一个聚合。**

### 找聚合边界的四个问题（实操）

| # | 问题 | 答"是"意味着 |
|---|---|---|
| 1 | 这两个对象之间有不一致就出事的约束吗？ | 同一个聚合 |
| 2 | 它们必须在同一个事务里改吗？ | 同一个聚合 |
| 3 | 其中一个能独立存在、独立查询、独立被别的模块用吗？ | 拆成两个聚合 |
| 4 | 它们的数据量会不会差很多数量级？ | 拆（避免加载聚合根时把一堆明细一起拉出来） |

**举三个真实判断：**

| 场景 | 判断 | 理由 |
|---|---|---|
| 订单 + 订单明细 | 同一聚合 | 总价不变式 |
| 订单 + 库存 | **两个聚合** | 库存可以被别的订单用；订单不该锁住库存表的行 |
| 博客文章 + 评论 | **两个聚合** | 评论可以独立增长到几万条；评论不需要和文章同时一致 |
| 用户 + 用户地址 | 同一聚合（通常） | 地址数量少，且"默认地址唯一"是不变式 |
| 用户 + 用户订单 | **两个聚合** | 订单会无限增长 |

### 规则一：聚合要小

> **Vaughn Vernon 的说法：聚合应该尽量小。小到"刚好满足不变式"就够。**

**为什么"大聚合"是灾难：**

| 大聚合的后果 | 具体表现 |
|---|---|
| 加载慢 | 查订单要把 50 个明细 + 3 个地址 + 2 个优惠券全拉出来 |
| 锁范围大 | 一次 `SaveChanges` 锁住所有相关行 → 并发度骤降 |
| 冲突多 | 两个人同时改订单的不同部分 → 乐观锁冲突 |
| 拆不开 | 未来想拆服务时，这块永远是一个整体 |

**实测（下面代码段实验 1 的真实 SQL）：**

```
事务 BEGIN
INSERT INTO "Orders" ("Buyer", "Status", "Total")        VALUE…
INSERT INTO "OrderItems" ("OrderId", "Price", "Qty", "Sku")   …
INSERT INTO "OrderItems" ("OrderId", "Price", "Qty", "Sku")   …
事务 COMMIT
```

**三条 SQL 在一个事务里 ——** 这是聚合内部一致性在数据库层的真实样子。

### 规则二：一个事务只改一个聚合

**严格说，这条不是"技术上做不到"，而是"这么做你就失去了聚合的意义"。**

**实测（实验 3）：一个 `SaveChanges` 同时改 `Order` 和 `Inventory`，第二个因唯一索引冲突失败 → 第一个也被回滚了。**

```
失败前：订单状态 = Draft
抛 DbUpdateException：SQLite Error 19: 'UNIQUE constraint failed: Inventories.Sku'.
失败后：订单状态 = Draft  → 回滚了吗：True
```

| 结论 | 说明 |
|---|---|
| **技术上能跨聚合** | EF Core 的 `SaveChanges` 是一个隐式事务，跨聚合也能一起提交/回滚 |
| **但代价已经付了** | 事务变长、锁范围变大、两表必须在同一个库 |
| **而且不够用** | 一旦要拆库/拆服务，跨库事务没了，代码要全部重写 |

**"一个事务一个聚合"的真正含义：**

> **不是"数据库不允许你改两个"，是"你的业务设计不应该依赖'两个聚合同时改成功'这个假设"。**

**跨聚合的场景走"最终一致"：**

```
下单流程（最终一致版）

① Order 聚合：order.Submit()  → 保存 → 事务提交 ✔
② 抛出 OrderSubmittedEvent
③ 事件处理器（可以是异步的）：
     检查库存 → Inventory.Deduct()  → 保存 → 各自事务提交 ✔
④ 如果第 ③ 步失败 → 重试 / 补偿（取消订单）
```

**中间存在"订单已提交但库存没扣"的窗口期 —— 这是有意的设计，不是 bug。** 用"订单状态 = 待确认"来表示这个窗口，比"一个巨大事务锁住一切"要可靠得多。

### 规则三：聚合之间用 Id 引用，不用对象引用

**❌ 错误示范：**

```csharp
public class Order
{
    public Inventory Inventory { get; set; }   // 直接持有另一个聚合根的对象引用
}
```

| 为什么错 | 说明 |
|---|---|
| 加载陷阱 | 查一个订单会顺带把库存对象拉出来（哪怕你不需要） |
| 边界模糊 | 你能 `order.Inventory.Available--` → 绕过 Inventory 聚合根的不变式 |
| 拆不开 | 内存里连在一起的对象图，拆成两个服务直接崩 |
| 循环引用 | A 引用 B，B 引用 A → 序列化炸、EF 追踪炸 |

**✅ 正确做法：**

```csharp
public class Order
{
    public string Sku { get; private set; }     // 只存 Id（这里是业务主键）
    // 需要库存信息时，通过查询 / 领域服务 / 事件去拿
}
```

**这条规则的实质：聚合边界 = 内存对象图的边界 = 未来的部署边界。**

### 聚合根的"门"怎么关上（三条）

| 手法 | 代码 | 挡住什么 |
|---|---|---|
| 属性 `private set` | `public int Stock { get; private set; }` | `order.Stock = -1` |
| 集合暴露只读视图 | `public IReadOnlyCollection<Item> Items => _items;` | `order.Items.Add(...)` |
| 子实体构造函数 `internal` | `internal OrderItem(...)` | `new OrderItem(...)` 绕过聚合根 |

**实测（实验 2）：这三条都是"约定"，EF Core 一律不强制。**

```
ShopContext 里有公开的 DbSet<OrderItem> 吗？没有（故意的）
但 ctx.Set<OrderItem>() 直接查到了 1 行；第一行 Qty = 2
直接改子实体 Qty=999 并 SaveChanges → 成功了（EF 没有任何拦截）
现在 Orders.Total = 246.0，手算 Σ = 59069.0  → 还一致吗：False
```

**这段实测很重要，它说明三件事：**

| 结论 | 说明 |
|---|---|
| `Set<T>()` 绕过一切封装 | 只要类型是实体，就能拿到 `DbSet` |
| 聚合边界靠**代码纪律**，不靠框架 | 别指望 EF 帮你守门 |
| 绕过后冗余字段立刻失真 | `Total = 246` 但实际 `59069` → 数据已经烂了 |

**所以真正要做的不是"藏 DbSet"，而是"团队知道规矩"。** 结构化一点的辅助手段：

```csharp
// 让子实体的 setter 尽可能少
public class OrderItem
{
    public long Id { get; private set; }
    public string Sku { get; private set; } = "";
    public int Qty { get; private set; }          // private set 挡住"随手改"
    public decimal Price { get; private set; }

    internal void ChangeQty(int qty)              // 只能被聚合根调用（internal）
    {
        if (qty <= 0) throw new ArgumentException("数量必须大于 0");
        Qty = qty;
    }
}
```

### 聚合的"生命周期"由一个仓储负责

| 规则 | 说明 |
|---|---|
| 一个聚合一个仓储 | `IOrderRepository`，没有 `IOrderItemRepository` |
| 仓储只暴露聚合根 | `GetById` 返回 `Order`（内部自动带 `Items`） |
| 事务边界 = 一次仓储操作 | `SaveChanges` 在应用服务层调用一次 |

> **注意：本课程 P175 之后才会讲仓储的具体实现。这一篇先记住"仓储是聚合的门，不是表的门"。**

---

## P173 · 2. 领域服务与应用服务

### 这一节要解决的问题

**一条规则既不属于 Order 也不属于 Inventory，它放哪？一个 HTTP 请求要做 5 件事，代码写哪？**

### 三种"服务"先分清

| 类型 | 英文 | 职责 | 有没有状态 | 依赖什么 |
|---|---|---|---|---|
| **领域服务** | Domain Service | 跨聚合的**业务规则** | 无状态 | 聚合、仓储接口 |
| **应用服务** | Application Service | 一个用例的**编排**（取数据→调规则→存→发事件） | 无状态 | 仓储、领域服务、事件发布器 |
| **基础设施服务** | Infrastructure Service | 技术能力：发邮件、调支付、读文件 | 可能有 | 外部 SDK |

**判断口诀：**

> **领域服务回答"业务上对不对"，应用服务回答"这个请求要做哪几步"，基础设施服务回答"怎么跟外面说话"。**

### 领域服务：什么时候才需要

**判定条件（三条同时满足）：**

| # | 条件 |
|---|---|
| 1 | 这条规则**同时依赖两个以上的聚合**（或者依赖聚合 + 外部查询） |
| 2 | 放任何一个聚合里都**别扭**（会造成聚合之间的相互依赖） |
| 3 | 它是**业务规则**，不是"编排步骤"（换成别的技术栈它依然成立） |

**✅ 典型例子：**

| 场景 | 为什么是领域服务 |
|---|---|
| 下单前检查库存是否足够 | 要读 `Order` + `Inventory`（两个聚合） |
| 转账：检查余额 + 检查对方账户状态 + 算手续费 | 三个聚合 |
| 排课：检查教师时间冲突 + 教室容量 | 两个聚合 + 一个查询 |
| 优惠券能否用于这个订单 | `Coupon` + `Order` |

**❌ 不该是领域服务的例子：**

| 场景 | 该放哪 |
|---|---|
| "订单总价 = Σ 明细" | `Order` 自己（同一聚合内） |
| "库存不能为负" | `Inventory` 自己 |
| "下单要写审计日志" | 应用服务（是技术动作，不是业务规则） |
| "下单成功后发短信" | 事件处理器（副作用） |
| "下单要做参数校验" | Controller/Filter（输入校验不是领域规则） |

### 领域服务的代码形状（实测跑过）

```csharp
public class OrderPlacementService        // 领域服务：注意没有 "App" 前缀
{
    private readonly ShopContext _ctx;    // 严格 DDD 会注入仓储接口，这里为省事直接用 DbContext

    public OrderPlacementService(ShopContext ctx) => _ctx = ctx;

    public string Place(Order order)
    {
        // 规则：下单前逐个 SKU 检查库存
        foreach (var item in order.Items)
        {
            var inv = _ctx.Inventories.FirstOrDefault(i => i.Sku == item.Sku);
            if (inv == null) return $"缺货：{item.Sku} 没有库存记录";
            if (inv.Available < item.Qty)
                return $"库存不足：{item.Sku} 需要 {item.Qty}，只有 {inv.Available}";
        }

        // 校验通过才动状态
        if (order.Status == OrderStatus.Draft) order.Submit();
        _ctx.SaveChanges();
        return "下单成功";
    }
}
```

**实测输出：**

```
新建一个 Draft 订单 #4，要 2 本 BOOK-001
① 第一次 Place()：缺货：BOOK-001 没有库存记录
   订单状态 = Draft（失败不能改状态）
② 补上 BOOK-001 库存 = 5
③ 第二次 Place()：下单成功
   订单状态 = Submitted
④ 已提交后再 AddItem → InvalidOperationException：已提交的订单不能再改
```

**请注意 ① 和 ④ 的分工：**

| 谁挡的 | 挡的是哪条规则 |
|---|---|
| `OrderPlacementService`（领域服务，①） | **跨聚合**规则：库存够不够 |
| `Order.AddItem`（聚合根，④） | **聚合内**规则：已提交不能改 |

> **这就是领域服务和聚合的分工线。** 如果 ④ 的规则跑到领域服务里，那所有改订单的入口都得记得检查一次——**迟早漏一处**。

### 领域服务的三个"不要"

| 不要 | 为什么 |
|---|---|
| ❌ 不要有状态（字段存业务数据） | 领域服务应该是无状态的，每次调用独立 |
| ❌ 不要变成"把所有规则搬出来的地方" | 那叫"贫血模型 + 上帝服务"，是退步不是进步 |
| ❌ 不要包事务 | 事务边界属于应用服务（一个用例一个事务） |

### 应用服务：一个用例的执行脚本

```csharp
public class OrderAppService
{
    private readonly ShopContext _ctx;
    private readonly OrderPlacementService _placement;
    private readonly IDomainEventPublisher _events;

    public OrderAppService(ShopContext ctx, OrderPlacementService placement, IDomainEventPublisher events)
    {
        _ctx = ctx; _placement = placement; _events = events;
    }

    // 一个方法 = 一个用例 = 一个 HTTP 请求
    public async Task<PlaceOrderResult> PlaceAsync(long orderId)
    {
        // ① 取聚合（仓储）
        var order = await _ctx.Orders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == orderId);
        if (order is null) return PlaceOrderResult.NotFound();

        // ② 调领域服务（业务判断）
        var msg = _placement.Place(order);
        if (msg != "下单成功") return PlaceOrderResult.Fail(msg);

        // ③ 保存（事务边界）
        await _ctx.SaveChangesAsync();

        // ④ 派发事件（副作用，不在事务里）
        await _events.PublishAsync(order.DequeueEvents());

        return PlaceOrderResult.Ok(order.Id);
    }
}
```

**应用服务的四个特征：**

| 特征 | 说明 |
|---|---|
| 方法名是**用例名** | `PlaceAsync` / `CancelAsync` / `ApproveAsync`，不是 `UpdateAsync` |
| **不写业务判断** | 只有 `if (x is null)` 这类技术判断 |
| **负责事务** | 在哪里 `SaveChanges` 由它决定 |
| **负责调用副作用** | 发事件、发消息、写日志 |

### 应用服务 vs 领域服务：一张对比表

| 维度 | 领域服务 | 应用服务 |
|---|---|---|
| 回答的问题 | 业务上**对不对** | 这个请求要做**哪几步** |
| 换个技术栈还成立吗 | ✅ 成立（纯业务） | ❌ 不成立（HTTP/事务/事件都是技术） |
| 有几个方法 | 少（1~3 个紧密相关的方法） | 和用例数一样多 |
| 事务 | 不开 | **开** |
| 依赖外部系统吗 | ❌ 不应该 | ✅ 可以（事件发布器、缓存、文件） |
| 能被领域服务调用吗 | — | ❌ 应用服务不调用应用服务（除非明确编排） |
| 命名 | `XxxService` / `XxxPolicy` / `XxxChecker` | `XxxAppService` / `XxxUseCase` |

### 一个常被忽略的点：Controller 和 AppService 谁做什么

| 层 | 只做这些 |
|---|---|
| Controller | 解析请求 → 调 AppService → 把结果转成 HTTP 状态码 |
| AppService | 取聚合 → 调规则 → 存 → 发事件 |
| DomainService | 跨聚合的业务判断 |
| 聚合根 | 聚合内的不变式 |

**Controller 里出现 `if (order.Status == Submitted)` 就是越界了。** 那是业务判断，属于领域层。

---

## P174 · 3. 领域事件与集成事件

### 这一节要解决的问题

**"订单提交了"这件事，怎么让仓库、短信、积分、审计都知道，而订单模块不用认识它们？**

### 两种事件的本质区别

| 维度 | 领域事件 Domain Event | 集成事件 Integration Event |
|---|---|---|
| 范围 | **进程内**（同一个应用） | **跨进程**（跨服务/跨系统） |
| 载荷 | 可以带**聚合根对象引用** | 只能带**可序列化的值**（Id + DTO） |
| 传递 | 内存里直接调用 handler | 消息队列 / HTTP / outbox 表 |
| 可靠性 | 尽力而为（进程崩了就没了） | 需要保证（重试 + 幂等 + 至少一次） |
| 消费者 | 同一代码库里的其它模块 | 其它服务/其它团队 |
| 事务关系 | 通常和业务操作同事务或紧随其后 | **不能在业务事务里**（必须 outbox） |
| 命名 | 过去式：`OrderSubmitted` | 过去式 + 版本：`OrderSubmittedV1` |

### 关键差异的实测证明

**实验 5：同一个业务，两种载荷。**

```
领域事件：OrderSubmittedEvent（字段 Order 是对象引用）
集成事件：OrderSubmittedIntegrationEvent
序列化后的集成事件 = {"OrderId":1,"Buyer":"张三","Status":"Submitted","Total":246.0,
                      "Items":[{"Sku":"BOOK-001","Qty":999,"Price":59.0}, ...]}
```

| 结论 | 说明 |
|---|---|
| 领域事件带引用 → **handler 读的时候拿到的是最新状态** | 延迟求值，不会读到过期数据 |
| 集成事件带值 → **创建那一刻就固化了** | 序列化之后再也改不了 |
| 集成事件必须带**全部必要信息** | 因为对方拿不到你的数据库 |

**这条差异会导致一个非常具体的设计决策：**

```csharp
// ❌ 集成事件只带 Id，让对方自己来查
public record OrderSubmittedIntegrationEvent(long OrderId);

// 问题：对方收到消息来查你 → 你可能已经改了/删了/挂了 → 对方拿到的是"现在"而不是"当时"
// 而且这要求对方能访问你的数据库（跨服务时不可能）

// ✅ 集成事件带快照
public record OrderSubmittedIntegrationEvent(
    long OrderId, string Buyer, decimal Total, DateTime OccurredAt,
    List<ItemDto> Items, int Version);
```

### 领域事件：发布时机的三个选项（这是本节最容易搞错的地方）

**选项 A：在聚合方法里立刻派发（最直觉，也是错的）**

```csharp
public void Submit()
{
    Status = OrderStatus.Submitted;
    DomainEvents.Raise(new OrderSubmittedEvent(this));   // 立刻放进队列
}
```

**实测（实验 4a）：在 `SaveChanges` 之前派发 handler 会看到什么**

```
事件里的 Order.Id = 0
handler 按这个 Id 查库 → 查不到（数据库里还没有这行）
SaveChanges 之后，order.Id 变成 2（事件里那个 0 不会自动更新）
```

| 问题 | 说明 |
|---|---|
| **Id 还是 0** | 数据库自增主键在 INSERT 之后才有值 |
| **库里查不到** | 事务还没提交 |
| **事件对象里的值不会自动更新** | 你在 `Submit()` 里放进去的是那一刻的快照 |

**选项 B：`SaveChanges` 之后派发（正确）**

**实测（实验 4b）：**

```
事件里的 Order.Id = 3
handler 查库 → 查到了，状态 = Submitted
```

**为什么这次能查到：** 事务已经提交，Id 已经有值。

**但注意：这次能拿到 Id=3，是因为事件里带的是"聚合根引用"，handler 读的是 `e.Order.Id`（延迟求值）。**

> **如果你在事件里存的是 `long OrderId = this.Id`（值拷贝），那就算在保存后派发，拿到的还是 0。**

### 选项 C：提交前派发 → 幽灵事件（最危险的坑）

**实测（实验 4c）：派发副作用 → 然后 `SaveChanges` 失败。**

```
handler 执行了副作用：已通知仓库：订单 0 提交
事务 BEGIN
SaveChanges 失败：SQLite Error 19: 'UNIQUE constraint failed: Inventories.Sku'.
库里「赵六」的订单数 = 0（数据回滚了）
但副作用列表 = [已通知仓库：订单 0 提交]（没有回滚）
```

**这就是"幽灵事件"：**

```
订单数据        → 回滚了 ✘
仓库通知        → 已经发出去了 ✔   ← 仓库开始给一个不存在的订单备货
短信            → 已经发出去了 ✔   ← 用户收到"下单成功"
```

**而且注意日志里只有 `事务 BEGIN`，没有 `ROLLBACK`：**

| 现象 | 说明 |
|---|---|
| 没看到 ROLLBACK 日志 | 回滚是事务对象被 Dispose 时隐式执行的，不是显式 `ROLLBACK` 语句 |
| 数据确实回滚了 | 订单数为 0 |
| **但这不重要** | 重要的是一次失败的保存，可能会触发致命后果 |

### 三个选项的对比

| 方案 | Id 有值吗 | 数据已提交吗 | 失败会留下副作用吗 | 结论 |
|---|---|---|---|---|
| A. 聚合方法里派发（保存前执行） | ❌ 0 | ❌ | ✅ 会（幽灵事件） | **禁止** |
| B. 保存成功后派发 | ✅ | ✅ | ❌ 不会 | **推荐** |
| C. 保存后派发但进程崩了 | ✅ | ✅ | — | **会丢事件** → 需 outbox |

**方案 B 的残留问题（P183 会详细讲）：**

```
① SaveChanges 成功（订单已进库）
② 派发事件前，进程被 kill / 断电 / 部署重启
   ↓
订单存在，但"通知仓库"永远没发生
```

**解法是 outbox 模式：**

```
① 业务事务里，同时写 Orders 和 OutboxMessages 两张表（同一个事务）
② 后台任务轮询 OutboxMessages，发到消息队列，发成功就打标记
```

**这样"业务数据"和"待发事件"要么都成功，要么都失败。** 这是集成事件能可靠跨进程的唯一正道。

### 领域事件的命名规范

| 规则 | 好 | 差 |
|---|---|---|
| **过去式**（已经发生） | `OrderSubmitted` | `SubmitOrder`（那是命令） |
| **业务语言**，不是技术语言 | `BookBorrowed` | `DatabaseUpdated` |
| 不带 "Event" 前缀冗余（可选） | `OrderSubmitted` | `OnOrderSubmittedEvent` |
| 一个事件对应一个业务事实 | `PaymentReceived` | `OrderChanged`（太笼统） |

**事件 vs 命令，一句话区分：**

> **命令是"请你做"，事件是"我已经做了"。**
>
> `SubmitOrderCommand` → 可能有副作用、可能被拒绝。
> `OrderSubmittedEvent` → 已经是事实，无法拒绝。

### 领域事件的载荷该带什么

| 方案 | 代码 | 优点 | 缺点 |
|---|---|---|---|
| **带聚合根引用** | `new OrderSubmittedEvent(this)` | 延迟读、永远是最新状态 | 只能进程内用；handler 可能改聚合（危险） |
| 带 Id | `new OrderSubmittedEvent(this.Id)` | 简单、可序列化 | **保存前 Id 是 0** |
| **带快照 DTO** | `new OrderSubmittedEvent(id, buyer, total, items)` | 明确、可序列化、可重放 | 数据可能过期 |

**推荐组合：**

```
领域事件   → 带引用（或 Id + 最小快照），进程内派发
集成事件   → 带完整快照 + 版本号 + OccurredAt
```

### 事件处理器的三条纪律

| 纪律 | 原因 |
|---|---|
| **幂等** | 消息可能重复投递（至少一次语义），同一个事件处理两次不能出错 |
| **不要指望事务** | 事件处理器通常在业务事务之外，它自己成功/失败是独立的事 |
| **不要反过来改同一个聚合** | 事件是"通知"，不是"回调"。需要反过来改 = 你把流程设计错了 |

---

==二：格式==

## 1. 聚合根代码模板

```csharp
public class XxxAggregate                       // 聚合根：一个实体
{
    // ---------- ① 身份与状态：全部 private set ----------
    public long Id { get; private set; }
    public XxxStatus Status { get; private set; }

    // ---------- ② 子实体集合：私有字段 + 只读视图 ----------
    private readonly List<XxxItem> _items = new();
    public IReadOnlyCollection<XxxItem> Items => _items;

    // ---------- ③ 给 EF Core 的无参构造 ----------
    private XxxAggregate() { }

    // ---------- ④ 业务构造：入口校验 ----------
    public XxxAggregate(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("名称不能为空");
        Name = name;
        Status = XxxStatus.Draft;
    }

    // ---------- ⑤ 领域行为：判断 + 变更，一体 ----------
    public void AddItem(string sku, int qty)
    {
        EnsureDraft();                                     // 不变式 1
        if (qty <= 0) throw new ArgumentException("数量必须大于 0");
        if (_items.Any(i => i.Sku == sku)) throw new InvalidOperationException("重复 SKU");
        _items.Add(new XxxItem(sku, qty));
        RecalcTotal();                                     // 维护冗余字段
    }

    public void Submit()
    {
        EnsureDraft();
        if (_items.Count == 0) throw new InvalidOperationException("空聚合不能提交");
        Status = XxxStatus.Submitted;
        _events.Add(new XxxSubmittedEvent(this));          // 先收集，不派发
    }

    // ---------- ⑥ 事件收集：由应用服务在保存后取走 ----------
    private readonly List<object> _events = new();
    public IReadOnlyList<object> DequeueEvents()
    {
        var copy = _events.ToList();
        _events.Clear();
        return copy;
    }

    // ---------- ⑦ 私有辅助 ----------
    private void EnsureDraft()
    {
        if (Status != XxxStatus.Draft) throw new InvalidOperationException("当前状态不允许该操作");
    }

    private void RecalcTotal() => Total = _items.Sum(i => i.Qty * i.Price);
}
```

**模板里每一条的作用：**

| 编号 | 作用 | 不写会怎样 |
|---|---|---|
| ① `private set` | 外部不能直接赋状态 | `order.Status = Submitted` 绕过所有校验 |
| ② 只读集合 | 外部不能 `Items.Add` | 绕过 `AddItem` 里的重复 SKU 检查 |
| ③ 私有无参构造 | EF Core 物化时能用 | 查库抛 `MissingMethodException` |
| ④ 业务构造 | 创建时就保证合法 | 能造出非法对象 |
| ⑤ 行为方法 | 规则唯一入口 | 规则散落各处 |
| ⑥ 事件收集 | 保存后再派发 | 幽灵事件（保存失败但已通知） |
| ⑦ 私有辅助 | 复用不变式检查 | 每个方法各写一遍 → 迟早漏 |

## 2. 聚合边界判定四问

```
拿到一组互相关联的对象
        │
        ▼
Q1 它们之间有不一致就出事的约束吗？
        │
   ┌────┴────┐
   有         没有
   │          │
   ▼          ▼
同一聚合    往下问
        │
        ▼
Q2 必须同一个事务改吗？
        │
   ┌────┴────┐
   是         不是
   │          │
   ▼          ▼
同一聚合    两个聚合
              │
              ▼
        Q3 其中一个能独立查询/被别的模块用吗？
              │
         ┌────┴────┐
         能         不能
         │          │
         ▼          ▼
      拆开     看 Q4
                  │
                  ▼
        Q4 数据量差几个数量级吗？（比如 1 : 10000）
                  │
             ┌────┴────┐
             是         不是
             │          │
             ▼          ▼
           拆开     同一聚合
```

## 3. 三种服务对照

| | 领域服务 | 应用服务 | 基础设施服务 |
|---|---|---|---|
| 一句话 | 跨聚合的业务规则 | 一个用例的执行脚本 | 跟外部世界说话 |
| 例子 | `OrderPlacementService` | `OrderAppService` | `SmsSender`、`PaymentGateway` |
| 事务 | ❌ | ✅ | ❌ |
| 有业务判断吗 | ✅ 全部 | ❌ 只有 null 检查 | ❌ |
| 能被谁调用 | 应用服务、其它领域服务 | Controller / 定时任务 / 消息消费者 | 应用服务、基础设施 |
| 有状态吗 | ❌ | ❌ | 可能有（连接池） |
| 命名 | `XxxService` / `XxxPolicy` | `XxxAppService` | `XxxClient` / `XxxSender` |
| 数量 | 很少 | ≈ 用例数 | 按外部系统算 |

## 4. 领域事件 vs 集成事件

| | 领域事件 | 集成事件 |
|---|---|---|
| 作用域 | 进程内 | 跨进程 |
| 载荷 | 引用或 Id | 完整快照 + 版本 |
| 传输 | 内存队列 / 中介者 | MQ / outbox / HTTP |
| 保证 | 尽力而为 | 至少一次 + 幂等 |
| 事务 | 与业务操作贴近 | **必须 outbox** |
| 命名 | `OrderSubmitted` | `OrderSubmittedV1` |
| 代码位置 | `Domain/Events/` | `Contracts/` 或独立的共享包 |

## 5. 事件载荷模板

```csharp
// ---------- 领域事件（进程内） ----------
public record OrderSubmittedEvent(Order Order);        // 带引用：延迟读最新状态

// 或者带最小信息
public record OrderSubmittedEvent(long OrderId, string Buyer, decimal Total);

// ---------- 集成事件（跨进程） ----------
public record OrderSubmittedIntegrationEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();   // 幂等键
    public int Version { get; init; } = 1;                 // 契约版本
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
    public long OrderId { get; init; }
    public string Buyer { get; init; } = "";
    public decimal Total { get; init; }
    public List<OrderItemDto> Items { get; init; } = new();
}

public record OrderItemDto(string Sku, int Qty, decimal Price);
```

**`EventId` / `Version` / `OccurredAt` 三个字段的作用：**

| 字段 | 作用 | 不写的后果 |
|---|---|---|
| `EventId` | 消费者去重（幂等） | 重复消息导致重复扣款 |
| `Version` | 契约演进（加字段/改语义） | 老消费者解析新消息失败 |
| `OccurredAt` | 业务时间（不是发送时间） | 重放/补偿时顺序错乱 |

## 6. 现象 / 错误对照表

| 现象 | 原因 | 解法 |
|---|---|---|
| 事件 handler 里 `db.Orders.Find(id)` 返回 null | 在 `SaveChanges` 前派发，且用的是值拷贝的 Id | 保存后派发；或带聚合根引用 |
| 事件里的 Id 是 0 | 自增主键在 INSERT 后才赋值 | 同上 |
| 订单回滚了但短信发出去了 | 提交前派发副作用 | 保存后派发 + outbox |
| `SaveChanges` 后事件丢了 | 进程在派发前崩溃 | outbox 表 + 后台补偿 |
| 两表改一个失败另一个也回滚了 | EF 的 `SaveChanges` 是一个隐式事务 | 这是预期行为，别依赖它跨聚合 |
| 子实体改了但 `Total` 没变 | 绕过聚合根直接改子实体 | 纪律（或把 `Total` 改成计算属性） |
| `ctx.Set<Item>()` 能查到子实体 | EF 不强制聚合边界 | 靠封装 + 代码评审 |
| 领域服务里啥也没干，只是转发 | 规则其实属于聚合自己 | 删掉这个领域服务 |
| 一个事件只有一个 handler | 这不是事件，是方法调用 | 直接调用 |

## 7. 命名速查

| 类型 | 格式 | 例子 |
|---|---|---|
| 聚合根 | 名词（业务概念） | `Order`、`Player`、`Inventory` |
| 子实体 | 名词 + 归属 | `OrderItem`、`InventorySlot` |
| 值对象 | 名词（无 Id） | `Money`、`Sku`、`DateRange` |
| 领域服务 | `XxxService` / `XxxPolicy` | `OrderPlacementService` |
| 应用服务 | `XxxAppService` / `XxxUseCase` | `OrderAppService` |
| 领域事件 | 过去式 | `OrderSubmitted`、`ItemAdded` |
| 集成事件 | 过去式 + V版本 | `OrderSubmittedV1` |
| 仓储 | `IXxxRepository` | `IOrderRepository` |

---

==三：代码==

## 1. 完整聚合根（本篇实测用的版本，可直接跑）

```csharp
public enum OrderStatus { Draft = 0, Submitted = 1, Cancelled = 2 }

// ---------- 聚合根 ----------
public class Order
{
    public long Id { get; private set; }
    public string Buyer { get; private set; } = "";
    public OrderStatus Status { get; private set; }
    public decimal Total { get; private set; }        // 冗余列：由 Items 算出

    private readonly List<OrderItem> _items = new();
    public IReadOnlyCollection<OrderItem> Items => _items;

    private readonly List<object> _events = new();

    private Order() { }                                // EF Core 用

    public Order(string buyer)
    {
        if (string.IsNullOrWhiteSpace(buyer)) throw new ArgumentException("买家不能为空");
        Buyer = buyer;
        Status = OrderStatus.Draft;
    }

    public void AddItem(string sku, int qty, decimal price)
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("已提交的订单不能再改");
        if (qty <= 0) throw new ArgumentException("数量必须大于 0");
        if (_items.Any(i => i.Sku == sku)) throw new InvalidOperationException("同一 SKU 请用 ChangeQty");
        _items.Add(new OrderItem(sku, qty, price));
        Recalc();
    }

    public void Submit()
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("订单状态不允许提交");
        if (_items.Count == 0) throw new InvalidOperationException("空订单不能提交");
        Status = OrderStatus.Submitted;
        _events.Add(new OrderSubmittedEvent(this));     // 只收集，不派发
    }

    public IReadOnlyList<object> DequeueEvents()
    {
        var copy = _events.ToList();
        _events.Clear();
        return copy;
    }

    private void Recalc() => Total = _items.Sum(i => i.Qty * i.Price);
}

// ---------- 聚合内实体 ----------
public class OrderItem
{
    public long Id { get; private set; }
    public string Sku { get; private set; } = "";
    public int Qty { get; private set; }
    public decimal Price { get; private set; }

    private OrderItem() { }

    internal OrderItem(string sku, int qty, decimal price)   // internal：只有聚合根能造
    {
        Sku = sku; Qty = qty; Price = price;
    }

    internal void ChangeQty(int qty)
    {
        if (qty <= 0) throw new ArgumentException("数量必须大于 0");
        Qty = qty;
    }
}

// ---------- 第二个聚合根 ----------
public class Inventory
{
    public long Id { get; private set; }
    public string Sku { get; private set; } = "";
    public int Available { get; private set; }

    private Inventory() { }

    public Inventory(string sku, int available)
    {
        if (available < 0) throw new ArgumentException("库存不能为负");
        Sku = sku; Available = available;
    }

    public void Deduct(int qty)
    {
        if (qty <= 0) throw new ArgumentException("扣减数量必须大于 0");
        if (qty > Available) throw new InvalidOperationException($"{Sku} 库存不足（{Available} < {qty}）");
        Available -= qty;
    }
}
```

### EF Core 映射（关键三行）

```csharp
public class ShopContext : DbContext
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Inventory> Inventories => Set<Inventory>();
    // 故意不暴露 DbSet<OrderItem>

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Order>(e =>
        {
            e.ToTable("Orders");
            e.Property(x => x.Status).HasConversion<string>();   // ① 枚举存字符串，库里可读
            e.HasMany(x => x.Items)
             .WithOne()
             .HasForeignKey("OrderId")                            // ② 影子外键
             .OnDelete(DeleteBehavior.Cascade);
            e.Navigation(x => x.Items)
             .UsePropertyAccessMode(PropertyAccessMode.Field);    // ③ 走私有字段 _items
        });

        b.Entity<OrderItem>(e =>
        {
            e.ToTable("OrderItems");
            e.Property<long>("OrderId");
            e.HasIndex("OrderId");
        });
    }
}
```

| 行 | 符号 | 作用 | 不写会怎样 |
|---|---|---|---|
| ① | `HasConversion<string>()` | 枚举存成 `"Draft"` 字符串 | 存成 0/1/2，查库看不懂 |
| ② | `HasForeignKey("OrderId")` | 用影子属性做外键（子实体没有 OrderId 属性） | EF 自己猜，列名不可控 |
| ③ | `UsePropertyAccessMode(Field)` | 直接读写 `_items` 字段 | EF 找不到 setter，抛异常或忽略 |

## 2. 领域服务 + 应用服务（完整分工）

```csharp
// ---------- 领域服务：跨聚合规则 ----------
public class OrderPlacementService
{
    private readonly ShopContext _ctx;
    public OrderPlacementService(ShopContext ctx) => _ctx = ctx;

    public string Place(Order order)
    {
        foreach (var item in order.Items)
        {
            var inv = _ctx.Inventories.FirstOrDefault(i => i.Sku == item.Sku);
            if (inv == null) return $"缺货：{item.Sku} 没有库存记录";
            if (inv.Available < item.Qty)
                return $"库存不足：{item.Sku} 需要 {item.Qty}，只有 {inv.Available}";
        }

        if (order.Status == OrderStatus.Draft) order.Submit();
        _ctx.SaveChanges();
        return "下单成功";
    }
}

// ---------- 应用服务：编排 ----------
public class OrderAppService
{
    private readonly ShopContext _ctx;
    private readonly OrderPlacementService _placement;
    private readonly IDomainEventPublisher _publisher;

    public OrderAppService(ShopContext ctx, OrderPlacementService placement, IDomainEventPublisher publisher)
    {
        _ctx = ctx; _placement = placement; _publisher = publisher;
    }

    public async Task<(bool ok, string msg)> PlaceAsync(long orderId)
    {
        var order = await _ctx.Orders.Include(x => x.Items)
                                    .FirstOrDefaultAsync(x => x.Id == orderId);
        if (order is null) return (false, "订单不存在");

        var msg = _placement.Place(order);
        if (msg != "下单成功") return (false, msg);

        await _ctx.SaveChangesAsync();

        // 保存成功之后才派发事件
        var events = order.DequeueEvents();
        if (events.Count > 0) await _publisher.PublishAsync(events);

        return (true, "OK");
    }
}
```

## 3. 极简领域事件派发器（本篇实验 4 用的机制）

```csharp
public interface IDomainEventPublisher
{
    Task PublishAsync(IEnumerable<object> events);
}

public class ConsoleDomainEventPublisher : IDomainEventPublisher
{
    private readonly IServiceProvider _sp;
    public ConsoleDomainEventPublisher(IServiceProvider sp) => _sp = sp;

    public async Task PublishAsync(IEnumerable<object> events)
    {
        foreach (var e in events)
        {
            // 按事件类型找 handler（真实项目用 MediatR 或反射扫描）
            var handlerType = typeof(IDomainEventHandler<>).MakeGenericType(e.GetType());
            foreach (var h in _sp.GetServices(handlerType))
            {
                var method = handlerType.GetMethod("HandleAsync")!;
                await (Task)method.Invoke(h, new[] { e, CancellationToken.None })!;
            }
        }
    }
}

public interface IDomainEventHandler<in TEvent>
{
    Task HandleAsync(TEvent e, CancellationToken ct);
}

// ---------- 一个真实 handler ----------
public class NotifyWarehouseWhenOrderSubmitted : IDomainEventHandler<OrderSubmittedEvent>
{
    private readonly ShopContext _ctx;
    public NotifyWarehouseWhenOrderSubmitted(ShopContext ctx) => _ctx = ctx;

    public async Task HandleAsync(OrderSubmittedEvent e, CancellationToken ct)
    {
        // 能安全查库：因为事件是在 SaveChanges 之后派发的
        var exists = await _ctx.Orders.AsNoTracking().AnyAsync(o => o.Id == e.Order.Id, ct);
        if (!exists) return;                       // 兜底：可能被回滚了

        Console.WriteLine($"通知仓库：订单 {e.Order.Id} 待出库（{e.Order.Buyer}）");
    }
}
```

**注册（`Program.cs`）：**

```csharp
builder.Services.AddScoped<IDomainEventPublisher, ConsoleDomainEventPublisher>();
builder.Services.AddScoped<IDomainEventHandler<OrderSubmittedEvent>, NotifyWarehouseWhenOrderSubmitted>();
```

> **注意：这门课后面（P182）会用 MediatR 替掉这个手写派发器。这里手写一遍的价值是让你知道它到底在做什么——它本质上就是"按类型找 handler 并调用"。**

## 4. 本篇实测汇总（全部真跑出来的）

**实测项目：`D:\tmp\AggTest`（net10.0 + EF Core 10.0.13 + SQLite）**

### 实验 1：聚合内一致性的真实 SQL

配置 `LogTo(...)` 抓 `TransactionStarted/Committed` + `CommandExecuted` 后，一次 `SaveChanges` 的完整记录：

```
事务 BEGIN
INSERT INTO "Orders" ("Buyer", "Status", "Total")        VALUE…
INSERT INTO "OrderItems" ("OrderId", "Price", "Qty", "Sku")   …
INSERT INTO "OrderItems" ("OrderId", "Price", "Qty", "Sku")   …
事务 COMMIT
```

```
订单 Id = 1，Total（聚合根冗余计算的）= 246
子实体数量 = 2
从库里读回：Orders.Total = 246.0，Items = BOOK-001×2@59.0, BOOK-002×1@128.0
手算 Σ(Qty*Price) = 246.0  → 和冗余列一致吗：True
```

| 结论 | 说明 |
|---|---|
| **一次 `SaveChanges` = 一个事务** | 无论改几个聚合，都是 `BEGIN ... COMMIT` 包起来 |
| 聚合根 + 子实体的 INSERT 顺序 | 先父后子（EF 自己排的） |
| 冗余字段由聚合根维护 | 从库里读回来仍然一致 |

### 实验 2：EF Core 不强制聚合边界

```
ShopContext 里有公开的 DbSet<OrderItem> 吗？没有（故意的）
但 ctx.Set<OrderItem>() 直接查到了 1 行；第一行 Qty = 2
直接改子实体 Qty=999 并 SaveChanges → 成功了（EF 没有任何拦截）
现在 Orders.Total = 246.0，手算 Σ = 59069.0  → 还一致吗：False
```

生成的 SQL 就是一条裸的 `UPDATE`：

```
UPDATE "OrderItems" SET "Qty" = @p0        WHERE "Id" = @p1
```

| 结论 | 说明 |
|---|---|
| `ctx.Set<T>()` 绕过一切封装 | 只要类型是实体就有一等入口 |
| **聚合边界 = 纪律，不是框架能力** | 别指望 EF 帮你守门 |
| 绕过后冗余字段立刻失真 | `Total=246` vs 实际 `59069`，数据已经烂了 |

### 实验 3：跨聚合的 `SaveChanges` 是一个事务

```
先建一条库存 SKU-X = 10（给下面制造唯一索引冲突用）
失败前：订单状态 = Draft
（派发了 OrderSubmittedEvent）
事务 BEGIN
抛 DbUpdateException：SQLite Error 19: 'UNIQUE constraint failed: Inventories.Sku'.
失败后：订单状态 = Draft  → 回滚了吗：True
```

| 结论 | 说明 |
|---|---|
| **技术上能跨聚合** | EF 会一起提交、一起回滚 |
| **日志里只有 `事务 BEGIN`，没有 ROLLBACK** | 回滚发生在事务对象 Dispose 时（隐式），不是显式 SQL |
| **但这是"能力"，不是"许可"** | 用了就要承担长事务/锁范围/拆不开的代价 |

### 实验 4a：保存前派发 → Id 是 0

```
[Raise] OrderSubmittedEvent
事件里的 Order.Id = 0
handler 按这个 Id 查库 → 查不到（数据库里还没有这行）
SaveChanges 之后，order.Id 变成 2（事件里那个 0 不会自动更新）
```

### 实验 4b：保存后派发 → 一切正常

```
[Raise] OrderSubmittedEvent
事务 BEGIN
INSERT INTO "Orders" ...
INSERT INTO "OrderItems" ...
事务 COMMIT
   事件里的 Order.Id = 3
handler 查库 → 查到了，状态 = Submitted
```

**注意 4b 的日志顺序：`事务 COMMIT` 之后才有 `SELECT`。** 这就是"保存后派发"的样子。

### 实验 4c：幽灵事件

```
[Raise] OrderSubmittedEvent
handler 执行了副作用：已通知仓库：订单 0 提交
事务 BEGIN
SaveChanges 失败：SQLite Error 19: 'UNIQUE constraint failed: Inventories.Sku'.
库里「赵六」的订单数 = 0（数据回滚了）
但副作用列表 = [已通知仓库：订单 0 提交]（没有回滚）
```

| 现象 | 说明 |
|---|---|
| 订单数据回滚 ✔ | 库里没有"赵六"的订单 |
| 副作用没回滚 ✘ | "已通知仓库"照样发生 |
| Id 还是 0 | 连订单号都没有就通知了 |

### 实验 5：领域事件 vs 集成事件的载荷

```
领域事件：OrderSubmittedEvent（字段 Order 是对象引用）
集成事件：OrderSubmittedIntegrationEvent
序列化后的集成事件 = {"OrderId":1,"Buyer":"张三","Status":"Submitted","Total":246.0,
                      "Items":[{"Sku":"BOOK-001","Qty":999,"Price":59.0},
                               {"Sku":"BOOK-002","Qty":1,"Price":128.0}]}
```

**两个细节值得注意：**

| 细节 | 含义 |
|---|---|
| `"Total":246.0` 但明细加起来是 `59069` | 前面实验 2 绕过聚合根造成的脏数据，被集成事件原样带了出去 |
| `"Qty":999` | 同上 —— **集成事件会把脏数据传播到别的系统**，这是"守住聚合边界"的另一个理由 |

### 实验 6：领域服务 vs 聚合根的分工

```
新建一个 Draft 订单 #4，要 2 本 BOOK-001
① 第一次 Place()：缺货：BOOK-001 没有库存记录
   订单状态 = Draft（失败不能改状态）
② 补上 BOOK-001 库存 = 5
③ 第二次 Place()：下单成功
   订单状态 = Submitted
④ 已提交后再 AddItem → InvalidOperationException：已提交的订单不能再改
```

| 谁挡的 | 挡的规则 |
|---|---|
| 领域服务（①） | 跨聚合：库存够不够 |
| 聚合根（④） | 聚合内：已提交不能改 |

## 5. 练习：给你的图书系统画聚合边界（一次一步）

> **这次是画图 + 判断题，不写代码。做完你就能自己判断"哪些该在一个事务里"。**

### Step 1 · 把候选对象列出来

**列 12~15 个名词（你的图书系统里所有"东西"）：**

```
Book / Author / Category / BookDetail / Reader / BorrowRecord /
Fine / Reservation / Notice / Admin / Shelf / Publisher …
```

### Step 2 · 两两问 Q1：它们之间有不一致就出事的约束吗？

**填这张表（只填有约束的）：**

| 对象 A | 对象 B | 什么约束 |
|---|---|---|
| `Book` | `BookDetail` | 一本书必须有一份详情（一对一） |
| `Book` | `BorrowRecord` | ？ |
| `Reader` | `BorrowRecord` | ？ |
| `BorrowRecord` | `Fine` | 罚款金额必须对应一条借阅记录？ |

### Step 3 · 按 Q1~Q4 划出 3~5 个聚合

**输出格式：**

```
聚合 1：Book（根）
  内含：BookDetail
  不变式：库存不能为负；一本书一份详情

聚合 2：BorrowRecord（根）
  内含：Fine
  不变式：罚款只能属于一条借阅记录，且金额 > 0

聚合 3：Reader（根）
  内含：（无子实体？）
  不变式：借阅数 ≤ 5
```

### Step 4 · 回答三个尖锐问题

| 问题 | 你的答案 |
|---|---|
| 借书时要同时改 `Book.Stock` 和 `Reader.BorrowedCount` —— 这两个在同一个聚合吗？ | ？ |
| 如果不在同一个聚合，"一个事务一个聚合"之后，怎么保证不出现"库存扣了但借阅数没加"？ | ？ |
| 你会把哪条规则放进领域服务？为什么它不能放进任何一个聚合根？ | ？ |

**Step 4 的第二问是这一篇的核心。** 想清楚了，你就真的懂聚合了。

---

==四：总结==

## 1. 三节知识一张表

| P | 主题 | 一句话核心 |
|---|---|---|
| 172 | 聚合与聚合根 | 聚合 = 一个事务的最小单位；边界由"不变式"决定 |
| 173 | 领域服务与应用服务 | 规则跨聚合 → 领域服务；一个用例的编排 → 应用服务 |
| 174 | 领域事件与集成事件 | 进程内说"我变了" → 领域事件；跨进程 → 集成事件 + outbox |

## 2. 十条硬结论（全部实测）

1. **一次 `SaveChanges` = 一个隐式事务。** 实测日志：`事务 BEGIN → INSERT Orders → INSERT OrderItems ×2 → 事务 COMMIT`。

2. **EF Core 完全不强制聚合边界。** `ctx.Set<OrderItem>()` 能直接查改子实体，绕过聚合根后 `Total` 立刻失真（246 vs 59069）。

3. **跨聚合的 `SaveChanges` 技术上是一个事务**（实测第二个失败 → 第一个回滚）。但这是"能力"，不是"许可"。

4. **保存前派发事件 → 事件里的 Id 是 0。** 实测：`事件里的 Order.Id = 0`，handler 查库查不到。

5. **保存后派发 → Id 正常、数据查得到。** 实测：`事件里的 Order.Id = 3`，状态 `Submitted`。

6. **保存前派发会产生"幽灵事件"。** 实测：订单回滚了（库里 0 条），但"已通知仓库"照样执行。

7. **回滚不会打 ROLLBACK 日志。** 实测失败那次只有 `事务 BEGIN`——EF 是在事务对象 Dispose 时隐式回滚的。

8. **集成事件会把脏数据原样传播出去。** 实测序列化结果里 `"Total":246.0`，但 `"Items"` 加起来是 `59069`。

9. **领域事件可以带聚合根引用（延迟读最新状态）**，集成事件只能带当时的值（创建即固化）。

10. **领域服务和聚合根的分工是明确的：** 跨聚合规则归领域服务（库存够不够），聚合内不变式归聚合根（已提交不能改）。

## 3. 决策流程图

```
要改一份数据，先问：这些对象之间有"不一致就出事"的约束吗？
        │
   ┌────┴────┐
   有         没有
   │          │
   ▼          ▼
同一聚合    拆成两个聚合
   │          │
   ▼          ▼
一个事务改   不能用"一个事务"保证
   │          │
   ▼          ▼
改完 Raise   需要最终一致
领域事件        │
                ▼
        ① 先提交 A 聚合（本地事务）
        ② 发事件（同事务写 outbox）
        ③ 消费者改 B 聚合（自己事务）
        ④ 失败就重试 / 补偿

规则该放哪？
        │
   ┌────┴─────────────┬──────────────┐
   只依赖一个聚合      依赖两个以上聚合   只是技术动作
        │                   │              │
        ▼                   ▼              ▼
   聚合根方法          领域服务        应用服务
   （TryBorrow）    （Place、Transfer）（写日志、发事件）
```

## 4. 记忆口诀

```
聚合边界不变式，一起变才在一个圆；
聚合要小别贪多，刚好够用最稳妥；
一个事务一个聚合，跨边界就靠最终一致；
聚合之间用 Id 引，对象引用必踩坑；
private set 关前门，只读集合关后门，EF 一律不拦你，全靠纪律；
领域服务管规则，应用服务管编排，一个管对不对，一个管几步；
领域事件进程内，可以带对象引用；
集成事件跨进程，只能带快照和版本；
保存之前别派发，Id 是零会发空炮；
保存之后派发，进程一崩就丢掉，outbox 兜底；
事件命名用过去式，说"已经发生"不说"请去做"。
```

## 5. 三句话带走

1. **聚合边界不是"哪些表该放在一起"，是"哪些数据不一致会出事"。** 判据只有一条：有没有不变式横跨它们。有 → 一个聚合；没有 → 千万别合。

2. **"一个事务一个聚合"听起来是限制，其实是在保护你未来的拆库/拆服务能力。** 你今天省下的那点"跨聚合一次提交"的方便，会在要拆服务的那天变成一次全量重写。

3. **领域事件的派发时机是一个 0/1 的判断题，答案只有"保存之后"。** 保存之前派发，你就是在拿"可能给不存在的订单发货"去换"少写一行代码"。

---

> **下一篇（批次 22，P175–P180）是「充血模型 + 值对象落地」**：
> **贫血 vs 充血**（为什么 .NET 圈默认贫血、充血到底改变了什么）、
> **EF Core 对实体属性操作的秘密**（快照比对、`DetectChanges`、代理类）、
> **EF Core 中实现充血模型的三个坑**（私有 setter、无参构造、集合替换）、
> **值对象在 EF Core 里的落地**（`OwnsOne` vs `ComplexProperty` vs 值转换器）、
> **构建表达式树简化值对象比较**（复用 P90–P96 的表达式树）。
> **这一批是纯代码批，也是把前面所有概念真正落地的批。**
>
> **另外提醒一次：P165「ASP.NET Core 程序的发布」还挂着**，等要上线前说一声。
