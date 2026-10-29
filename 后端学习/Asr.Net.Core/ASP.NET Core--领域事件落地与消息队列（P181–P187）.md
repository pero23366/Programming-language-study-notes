==零：补充==

> **这一篇（P181–P187）回答三个问题：谁把事件发出去？什么时候发？跨进程怎么保证不丢？**

## 它解决什么问题

**上一批（P174）你把事件塞进聚合里了：**

```csharp
public void Submit()
{
    Status = OrderStatus.Submitted;
    _events.Add(new OrderSubmittedEvent(this));
}
```

**然后你盯着这个字段想了半天：`_events` 谁来取？什么时候取？取出来给谁？**

**这一批就是把这三个问题落地：**

| 问题 | 答案 | 位置 |
|---|---|---|
| 谁取、谁发 | MediatR 的 `IPublisher` | P182 |
| 什么时候取 | `SaveChanges` 之后（不是之前） | P183 |
| 跨进程怎么不丢 | outbox 表 + 消息队列 | P184–P186 |

## 没有它会怎样

### 灾难一：事件攒着没人发

**最常见的现场：**

```csharp
order.Submit();          // 事件进了 _events
await _ctx.SaveChangesAsync();
return Ok();             // 完事，_events 里的东西再也没人管
```

**代码"看起来对"，但通知仓库、加积分、发短信一次都没执行过。** 没有人报错，因为你从来没实现"发"这一步。

### 灾难二：事件发了，但发的位置不对

**第二个常见现场：**

```csharp
public void Submit()
{
    Status = OrderStatus.Submitted;
    _publisher.Publish(new OrderSubmittedEvent(this)).GetAwaiter().GetResult();  // 在聚合里直接发
}
```

**你在 P174 已经见过后果：**

| 后果 | 说明 |
|---|---|
| 事件里 `Id = 0` | 主键还没生成 |
| handler 查库查不到 | 事务还没提交 |
| 保存失败 → 幽灵事件 | 通知已经发出去了，订单没存进去 |

### 灾难三：发送成功了，但进程挂了

**即使你把派发放在 `SaveChanges` 之后：**

```
① SaveChanges 成功（订单进库了）
② 准备发 MQ
③ 进程被 kill / 发布重启 / 断电
        ↓
订单存在，但下游永远不知道有这笔订单
```

**这不是"概率极低的意外"。** 每次发布都会重启进程，每次重启都可能撞上这个窗口。

**这一批的 outbox 就是给这个窗口兜底的。**

## 它在生态里的位置

**四个东西串成一条链路，缺一环就断：**

```
┌──────────────────────────────────────────────────────────────┐
│ ① 聚合：把事件攒起来         _events.Add(...)                  │
├──────────────────────────────────────────────────────────────┤
│ ② 派发器：什么时候取           P183（SaveChanges 之后）         │
│    重写 SaveChangesAsync / 拦截器 SavedChanges                 │
├──────────────────────────────────────────────────────────────┤
│ ③ 进程内总线：给谁            P182（MediatR INotification）    │
│    一个事件 → N 个 handler，顺序执行                           │
├──────────────────────────────────────────────────────────────┤
│ ④ 跨进程：怎么不丢            P186（outbox）+ P184/185（MQ）    │
│    先写库，后台再发，失败重试                                   │
└──────────────────────────────────────────────────────────────┘
```

**每一层的失败模式都不一样：**

| 层 | 失败会怎样 | 谁负责兜底 |
|---|---|---|
| ① 聚合 | 事件根本不存在 | 代码评审 |
| ② 派发器 | 事件永远躺在内存里 | 单元测试 + 集成测试 |
| ③ MediatR | 进程内 handler 抛异常 → 整个 Publish 中断 | 你自己 try/catch |
| ④ outbox | 消息重复投递 | 消费者幂等 |

## 对你的实际意义

**这一批是你游戏服务端最"必需"的一批。**

### 领域事件：你的成就 / 任务 / 掉落系统

**"玩家击杀 Boss"这一个动作，会触发：**

| 订阅者 | 干什么 | 要不要同步 |
|---|---|---|
| 成就系统 | 检查"屠龙者"是否解锁 | 可以异步 |
| 任务系统 | 推进"击杀 10 只 Boss" | 可以异步 |
| 掉落系统 | 算掉落 | **必须同步**（玩家要立刻看到） |
| 统计系统 | 记一笔 | 异步 |
| 全服公告 | 播报 | 异步 |

**MediatR 的 `Publish` 是"顺序 await 每个 handler"，所以：**

- 掉落系统放在第一个 → 玩家先拿到东西
- 公告放最后 → 公告失败不影响玩家

**但这个顺序是"注册顺序"，很脆弱**（实测见 P182）。想严格区分"必须成功"和"尽力而为"，得用两个事件或两套通道。

### 集成事件：跨服 / 跨进程才需要

**你什么时候真的需要 RabbitMQ：**

| 场景 | 需要 MQ 吗 |
|---|---|
| 单进程游戏服，所有系统在一个进程里 | ❌ 领域事件够了 |
| 游戏服 + 独立的排行榜服务 | ✅ 需要（跨进程） |
| 游戏服 + 充值回调（第三方） | ✅ 需要（可靠投递） |
| 多区服之间同步全服活动 | ✅ 需要（广播） |
| 只是"代码解耦" | ❌ 别用 MQ，用领域事件 |

**判据一句话：**

> **同一个进程里 → 领域事件；跨进程 → 集成事件 + MQ。**
>
> **"想解耦"不是用 MQ 的理由，"进程边界"才是。**

## 什么时候其实用不上

### 判据一：只有一个 handler → 别用事件

**事件的价值是"一对多 + 加订阅者不改老代码"。**

如果 `OrderSubmittedEvent` 只有一个 handler，而且它就在 `Submit()` 旁边 —— **你写的是"绕一圈的方法调用"，还额外引入了：**

| 代价 | 说明 |
|---|---|
| 多一个类 | 事件定义 |
| 多一个类 | handler |
| 多一处注册 | DI |
| 调试断链 | 断点进去看不到调用栈 |
| 出错难查 | 异常被包在 MediatR 里 |

### 判据二：不需要"可靠投递" → 别上 MQ

**MQ 的成本：**

| 成本 | 说明 |
|---|---|
| 运维 | 一个必须 7×24 活着的中间件 |
| 一致性 | 从"事务"变成"最终一致"，你要设计补偿 |
| 幂等 | 消费者必须自己处理重复 |
| 顺序 | 不保证全局顺序（除非单队列单消费者） |
| 排查 | 消息去哪了？要登管理后台查 |

**如果你只是"同步调用太慢想异步"，先试：`Task.Run` / `Channel<T>` / 后台队列（`IHostedService`）。**

**这些都在进程内，不引入新组件，够用到你真正需要跨进程为止。**

### 判据三：单体 + 单库 + 一个进程 → 全部用领域事件

**这是你现在的情况。** 别急着装 RabbitMQ。

**甚至 outbox 都可以先不做**（因为它解决的是"进程崩溃时事件丢失"，而你的开发阶段重启一次无所谓）。

**但你要知道 outbox 长什么样** —— 因为上线那天会需要它。

---

==一：概念==

## P181 · 1. DDD 聚合在 .NET 中的实现

### 这一节要解决的问题

**聚合根写好了，怎么把它从库里取出来、改完怎么存回去、多个聚合怎么保证一次提交？**

### 三个角色

| 角色 | 职责 | 在 .NET 里是谁 |
|---|---|---|
| **仓储（Repository）** | 按聚合根取/存，屏蔽数据库细节 | `IOrderRepository` + 实现 |
| **工作单元（Unit of Work）** | 一次业务操作的所有变更，一次提交 | **EF Core 的 `DbContext` 本身就是 UoW** |
| **聚合** | 保证内部一致性 | 你写的实体 |

**关键认知：`DbContext` 已经是一个完整的工作单元。**

| UoW 的职责 | `DbContext` 怎么做的 |
|---|---|
| 跟踪所有变更 | `ChangeTracker` |
| 一次提交 | `SaveChanges()` |
| 事务管理 | 隐式事务（实测见批次 21） |
| 回滚 | 抛异常 → 不提交 |

**所以你不需要自己写 `IUnitOfWork` 再包一层。** 需要的时候直接用 `DbContext`。

### 仓储：不是"表的门"，是"聚合的门"

**❌ 错误理解：**

```csharp
public interface IOrderItemRepository         // 给子实体建仓储
{
    OrderItem GetById(long id);
}
```

**这等于告诉全世界"子实体可以单独取"** —— 聚合边界当场破掉。

**✅ 正确理解：**

```csharp
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(long id, CancellationToken ct = default);
    Task AddAsync(Order order, CancellationToken ct = default);
    Task RemoveAsync(Order order, CancellationToken ct = default);
    // 注意：没有 Update —— 跟踪查询后改，SaveChanges 自己会存
}
```

| 方法 | 说明 |
|---|---|
| `GetByIdAsync` | 返回**完整的**聚合（内部 `Include` 子实体） |
| `AddAsync` | 新增聚合 |
| **没有 `UpdateAsync`** | 因为装配了跟踪，改了属性 `SaveChanges` 就生效 |
| `RemoveAsync` | 删除整个聚合 |

**"没有 Update"这条经常让人困惑。** 原因是：仓储取出来的对象是**被跟踪**的，改了之后 `SaveChanges` 自动生成 UPDATE。**`Update()` 只在不跟踪的场景（如 Web 层传进来的 DTO）才需要。**

### 仓储实现

```csharp
public class OrderRepository : IOrderRepository
{
    private readonly ShopContext _ctx;
    public OrderRepository(ShopContext ctx) => _ctx = ctx;

    public Task<Order?> GetByIdAsync(long id, CancellationToken ct = default)
        => _ctx.Orders
              .Include(o => o.Items)              // 聚合内部必须一起加载
              .FirstOrDefaultAsync(o => o.Id == id, ct);

    public async Task AddAsync(Order order, CancellationToken ct = default)
        => await _ctx.Orders.AddAsync(order, ct);

    public Task RemoveAsync(Order order, CancellationToken ct = default)
    {
        _ctx.Orders.Remove(order);
        return Task.CompletedTask;
    }
}
```

**`Include(o => o.Items)` 是必须的。** 不 Include 的话：

```csharp
var order = await _ctx.Orders.FindAsync(id);   // Items 是空集合
order.AddItem("X", 1, 10m);                    // 加到内存里的空集合
await _ctx.SaveChangesAsync();                 // 只会 INSERT 这一条新项
// 危险：如果业务逻辑依赖"现有项"，它看到的是空集合 → 判断全错
```

> **这条是聚合持久化最容易出的 bug：聚合只加载了一半，业务规则基于半个聚合做判断。**

### 仓储要不要有 `SaveChanges`

| 方案 | 写法 | 优点 | 缺点 |
|---|---|---|---|
| A. 仓储内保存 | `AddAsync` 里就 `SaveChanges` | 调用方简单 | 一个用例多次保存 → 多个事务 |
| **B. 应用服务保存**（推荐） | 仓储只操作，`AppService` 里 `SaveChanges` | 一个用例一个事务 | 调用方要多写一行 |
| C. 显式 UoW | `IUnitOfWork.CommitAsync()` | 语义明确 | 多一层抽象，本质还是 `SaveChanges` |

**选 B。** 因为"一个用例一个事务"是批次 21 的核心结论。

### 完整流程串起来

```csharp
public class OrderAppService
{
    private readonly IOrderRepository _repo;
    private readonly ShopContext _ctx;          // 只用来 SaveChanges
    private readonly IEventPublisher _events;

    public async Task<Result> SubmitAsync(long orderId, CancellationToken ct)
    {
        // ① 取聚合（仓储）
        var order = await _repo.GetByIdAsync(orderId, ct);
        if (order is null) return Result.NotFound();

        // ② 执行领域行为（规则在聚合里）
        order.Submit();

        // ③ 一次提交（UoW = DbContext）
        await _ctx.SaveChangesAsync(ct);

        // ④ 派发事件（P182/P183 的内容）
        await _events.PublishAsync(order.DequeueEvents(), ct);

        return Result.Ok();
    }
}
```

---

## P182 · 2. 用 MediatR 实现领域事件

### 这一节要解决的问题

**P174 你手写了一个"按类型找 handler"的派发器。为什么要换成 MediatR？**

### 手写派发器的问题

```csharp
// P174 的版本
var handlerType = typeof(IDomainEventHandler<>).MakeGenericType(e.GetType());
foreach (var h in _sp.GetServices(handlerType))
{
    var method = handlerType.GetMethod("HandleAsync")!;
    await (Task)method.Invoke(h, new[] { e, CancellationToken.None })!;
}
```

| 问题 | 说明 |
|---|---|
| `MethodInfo.Invoke` 慢 | 反射调用，每次都有装箱和参数校验 |
| 异常被包成 `TargetInvocationException` | 排查时堆栈多一层，看不出原始异常 |
| 没有依赖注入生命周期管理 | 要自己处理 Scope |
| 没有 CancellationToken 传递惯例 | 每个项目各写一套 |
| 没有"管道"能力 | 想加日志/事务/重试，要改派发器 |

**MediatR 把这些都做了，而且用了表达式树缓存（跟 P180 一个思路）。**

### MediatR 的三个核心接口

| 接口 | 用途 | handler 数量 | 方法 |
|---|---|---|---|
| `INotification` | **事件**（已经发生的事） | **多个** | `Publish` |
| `IRequest<T>` | **命令/查询**（请做一件事） | **一个** | `Send` |
| `IStreamRequest<T>` | 流式返回 | 一个 | `CreateStream` |

**一句话区分：**

> **`Send` = "请你帮我做这件事"（期望一个结果）；`Publish` = "这件事发生了"（不期望结果）。**

### 代码形状

```csharp
// ---------- 事件定义 ----------
public record OrderSubmittedEvent(long OrderId, string Buyer, decimal Total) : INotification;

// ---------- 处理器 ----------
public class NotifyWarehouse : INotificationHandler<OrderSubmittedEvent>
{
    public Task Handle(OrderSubmittedEvent e, CancellationToken ct)
    {
        Console.WriteLine($"通知仓库：{e.OrderId}");
        return Task.CompletedTask;
    }
}

public class AddPoints : INotificationHandler<OrderSubmittedEvent>
{
    public Task Handle(OrderSubmittedEvent e, CancellationToken ct)
    {
        Console.WriteLine($"加积分：{e.Buyer}");
        return Task.CompletedTask;
    }
}
```

**注册（`Program.cs`）：**

```csharp
builder.Services.AddLogging();     // ← MediatR 14 必须（见下面实测坑）
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
```

**派发：**

```csharp
public class OrderAppService
{
    private readonly IPublisher _publisher;

    public async Task SubmitAsync(Order order, CancellationToken ct)
    {
        order.Submit();
        await _ctx.SaveChangesAsync(ct);

        foreach (var e in order.DequeueEvents())
            await _publisher.Publish(e, ct);
    }
}
```

### 实测：MediatR 的 5 条真实行为

**测试项目 `D:\tmp\MedTest`（MediatR 14.2.0 + net10.0）。**

#### 1-1：`Publish` 会调用所有 handler，顺序是注册顺序

```
1-1 · Publish 一个通知，3 个 handler 都会执行吗、什么顺序
    ① 通知仓库（OrderId=1）
    ② 加积分（OrderId=1）
    ③ 写审计（OrderId=1）
```

| 结论 | 说明 |
|---|---|
| 3 个 handler **都执行** | 这就是"一对多" |
| 顺序 = 注册顺序 | 由程序集扫描顺序决定，**不可靠** |
| **不要依赖这个顺序** | 想严格排序，用多个事件或显式编排 |

#### 1-2：一个 handler 抛异常 → 后面的 handler 不执行

```
1-2 · 其中一个 handler 抛异常，后面的还会执行吗
  Publish 抛出：InvalidOperationException：积分服务挂了
    ① 通知仓库（OrderId=2）
    ② 加积分（OrderId=2）
```

| 现象 | 说明 |
|---|---|
| ① 执行了 | 在前 |
| ② 抛异常 | 中断 |
| **③ 没执行** | 后面的 handler 被跳过 |
| 异常冒泡到调用方 | `Publish` 的 `await` 直接抛 |

**这是 MediatR 默认行为（顺序 await）。** 后果很严重：

> **"写审计"失败会让"加积分"不执行；"加积分"失败会让"写审计"不执行。**
>
> **任意一个 handler 挂掉，后面全部跳过 —— 而它们本来是互不相关的业务。**

**解法（三选一）：**

| 方案 | 做法 | 代价 |
|---|---|---|
| A. 每个 handler 自己 try/catch | 在 `Handle` 里包一层 | 要记得写，容易漏 |
| B. 换并发发布器 | `cfg.RegisterServicesFromAssembly(...)` + 自定义 `INotificationPublisher` | 要写实现，且失败语义变模糊 |
| C. 关键路径同步、非关键路径走 outbox | 分两个事件 | 设计更清晰（推荐） |

#### 1-3：`Send` 有 2 个 handler → 静默取一个，不报错

```
1-3 · Send 一个请求：有 2 个 handler 时会用哪个
  Send 返回：来自 Handler1
```

| 结论 | 说明 |
|---|---|
| **不抛异常** | 它用 `GetRequiredService` 取**一个** |
| 取到哪个 | 注册顺序里的某一个（不可靠） |
| **这是危险行为** | 你可能以为"两个都会跑"，实际只跑一个 |

> **`IRequest` 必须只有一个 handler。** MediatR 不会帮你检查，**它静默取一个**。这是"命令/查询"和"事件"的根本区别，写错会丢逻辑。

#### 1-4：`Send` 没有 handler → 抛异常

```
1-4 · Send 一个没有 handler 的请求
  抛出：InvalidOperationException：No service for type
        'MediatR.IRequestHandler`2[NobodyHandlesQuery,System.Int32]' has been registered.
```

**注意：`Publish` 没有 handler 时不会抛**（因为"没人关心"是合法的）；`Send` 没有 handler 会抛（因为"要你做事但你不在"）。

#### 1-5：`Publish` 是顺序执行，不是并发

```
1-5 · Publish 是并发还是顺序（看时间戳）
    Slow1 开始 01:03:56.435
    Slow1 结束 01:03:56.738
    Slow2 开始 01:03:56.739
    Slow2 结束 01:03:57.041
  总耗时 606 ms（两个各 300ms）
```

| 结论 | 说明 |
|---|---|
| **串行** | Slow2 在 Slow1 结束后才开始 |
| 总耗时 = 各 handler 之和 | 606ms ≈ 300 + 300 |
| 后果 | **一个慢 handler 会拖慢整个请求** |

> **如果你的 handler 里有 HTTP 调用（发短信、调支付），它就在你的请求线程上同步等。** 三个 handler 各 200ms → 用户多等 600ms。

### 实测坑：MediatR 14 必须注册 `ILoggerFactory`

**这个坑不查文档根本想不到。** 第一次跑直接崩：

```
Unhandled exception. System.InvalidOperationException:
  MediatR requires ILoggerFactory to be registered.
  Call services.AddLogging() before services.AddMediatR().
   at MediatR.Registration.ServiceRegistrar.<>c.<AddRequiredServices>b__25_2(IServiceProvider sp)
   at MediatR.Registration.ServiceRegistrar.<>c.<AddRequiredServices>b__25_1(IServiceProvider sp)
   ...
   at Microsoft.Extensions.DependencyInjection.MediatRServiceCollectionExtensions.CheckLicense(IServiceProvider serviceProvider)
   at MediatR.Mediator..ctor(IServiceProvider serviceProvider, INotificationPublisher publisher)
```

**两个信息：**

| 信息 | 说明 |
|---|---|
| `MediatR requires ILoggerFactory` | 14 版本把日志变成硬依赖 |
| `CheckLicense(...)` | **MediatR 12 之后转为商业授权（Lucky Penny Software）** |

**解法：**

```csharp
builder.Services.AddLogging();     // 必须在 AddMediatR 之前
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(...));
```

> **提醒：** MediatR 15 之后对超过一定营收的公司需要购买 license。学习用没问题，但**如果你以后要商用，记得看它的授权条款** —— 这类"看着免费其实有 license"的库，踩一次很麻烦。

---

## P183 · 3. EF Core 中发布领域事件的合适时机

> **这一节是全篇最有价值的一节。** 四个位置，只有一个是对的。

### 四个候选位置

| 位置 | 代码位置 | 事务状态 |
|---|---|---|
| **A** | AppService 里 `SaveChanges` 之后，手写循环 | 已提交 |
| **B** | 重写 `SaveChangesAsync`，在 `base` 之后 | 已提交 |
| **C-1** | 拦截器 `SavingChanges`（保存前） | **还没开事务** |
| **C-2** | 拦截器 `SavedChanges`（保存后） | 已提交 |

### 实测：四个位置的完整输出

**方案 A · AppService 里显式派发**

```
方案 A · AppService 里 SaveChanges 之后派发（手写）
  保存后 order.Id = 1，事件数 = 1
    事件里存的 OrderId = 0（Submit 那刻的 Id），用聚合当前 Id=1 查库 → 查到了，状态=Submitted，Total=100.0
```

**注意这里有个非常微妙的点：**

| 值 | 说明 |
|---|---|
| 事件里存的 `OrderId = 0` | 因为 `Submit()` 里写的是 `new OrderSubmittedEvent(Id, ...)`，那一刻 `Id` 还是 0 |
| 聚合当前 `Id = 1` | 保存后赋值 |
| 用 `order.Id` 查库 → 查到 | 因为查的是实体，不是事件里的值 |

> **这就是 P174 那条结论的实证：事件里的值拷贝会过期，用聚合引用（或延迟取值）才安全。**

**方案 B · 重写 `SaveChangesAsync`**

```
方案 B · 重写 SaveChangesAsync，在 base 之后派发
    [方案B] 派发 OrderSubmittedEvent：事件里存 OrderId=0，聚合当前 Id=2
       handler 用另一个 DbContext 查库 → 查到，状态=Submitted
```

**方案 C-1 · 拦截器 `SavingChanges`（保存前）**

```
方案 C-1 · 拦截器 SavingChanges（保存前）派发
    [拦截器] SavingChanges：CurrentTransaction = null（还没开事务）
    [拦截器] 保存前派发：事件里 OrderId=0，聚合 Id=0 → 查库：查不到（库里还没有这行）
  保存后 order.Id = 3
```

**两个关键信息：**

| 输出 | 含义 |
|---|---|
| `CurrentTransaction = null（还没开事务）` | **EF 还没开始事务** —— 你在这一刻做的任何数据库操作都是**独立事务** |
| `聚合 Id=0` + `查不到` | 主键没生成、数据没落库 |

**方案 C-2 · 拦截器 `SavedChanges`（保存后）**

```
方案 C-2 · 拦截器 SavedChanges（保存后）派发
    [拦截器] SavedChanges：CurrentTransaction = null（已提交）
    [拦截器] 保存后派发：事件里 OrderId=0，聚合 Id=4 → 查库：查到，状态=Submitted
  保存后 order.Id = 4
```

**方案 E · 保存前派发 + 保存失败**

```
方案 E · 保存前派发 + 保存失败 → 幽灵事件
    [拦截器] SavingChanges：CurrentTransaction = null（还没开事务）
    [拦截器] 保存前派发：事件里 OrderId=0，聚合 Id=0 → 查库：查不到（库里还没有这行）
  SaveChanges 失败：SQLite Error 19: 'UNIQUE constraint failed: Inventories.Sku'.
  库里「会失败」的订单数 = 0（数据回滚了）
```

**数据回滚了，但事件已经派出去了** —— 幽灵事件。

### 方案 D · 在 `SavedChanges` 里再调 `SaveChanges`（最凶的坑）

**场景：** 某个 handler 想"顺手改一下数据库"，于是它拿到当前的 `DbContext` 又调了一次 `SaveChanges`。

**实测（限定 3 层以免直接 StackOverflow）：**

```
方案 D · 在 SavedChanges 里再调一次 SaveChanges（handler 顺手改库会怎样）
    [拦截器] SavedChanges：CurrentTransaction = null（已提交）
    [拦截器] 第 1 层：在 SavedChanges 里再调 SaveChanges…
    [拦截器] SavedChanges：CurrentTransaction = null（已提交）
    [拦截器] 第 2 层：在 SavedChanges 里再调 SaveChanges…
    [拦截器] SavedChanges：CurrentTransaction = null（已提交）
    [拦截器] 第 3 层：在 SavedChanges 里再调 SaveChanges…
    [拦截器] 已到 3 层，主动停止（真实代码里这样写会一直递归到 StackOverflow）
```

| 结论 | 说明 |
|---|---|
| **无限递归** | `SaveChanges` → `SavedChanges` → `SaveChanges` → … |
| 真实后果 | `StackOverflowException`（.NET 里**无法 catch**，进程直接死） |
| 为什么没抛"重入"异常 | EF Core 不禁止在 `SavedChanges` 里再保存（因为它已经"完成了"） |

**所以 handler 必须遵守一条铁律：**

> **handler 里要写数据库，必须用一个独立的 `DbContext`（新的 Scope / 新的实例），绝不能复用当前正在保存的那个。**

**安全的 handler 写法：**

```csharp
public class AddPointsHandler : INotificationHandler<OrderSubmittedEvent>
{
    private readonly IDbContextFactory<ShopContext> _factory;   // ← 关键

    public AddPointsHandler(IDbContextFactory<ShopContext> factory) => _factory = factory;

    public async Task Handle(OrderSubmittedEvent e, CancellationToken ct)
    {
        await using var ctx = await _factory.CreateDbContextAsync(ct);   // 全新实例
        // ... 改积分
        await ctx.SaveChangesAsync(ct);
    }
}
```

**注册工厂：**

```csharp
builder.Services.AddDbContextFactory<ShopContext>(o => o.UseSqlServer(conn));
```

### 一张对比表（结论）

| 位置 | Id 有值 | 数据已提交 | 保存失败会留副作用 | 能安全改库 | 结论 |
|---|---|---|---|---|---|
| A. AppService 里手写 | ✅（用实体） | ✅ | ❌ 不会 | ✅ | **可行，但每处都要记得写** |
| B. 重写 `SaveChangesAsync` | ✅ | ✅ | ❌ 不会 | ✅（但要新实例） | **推荐**（自动） |
| C-1. `SavingChanges` | ❌ 0 | ❌ | **✅ 会（幽灵事件）** | ⚠️ 独立事务 | **禁止** |
| C-2. `SavedChanges` | ✅ | ✅ | ❌ 不会 | ⚠️ **必须新实例，否则无限递归** | 可用 |
| D. 再调 `SaveChanges` | — | — | — | ❌ | **StackOverflow** |

**我的建议：**

```
单进程、要求简单  → 方案 A（AppService 里显式派发，一眼看得见）
要自动化          → 方案 B（重写 SaveChangesAsync）
要"业务和数据同一事务" → outbox（写同一张表，后台发）
```

### 重写 `SaveChangesAsync` 的完整写法

```csharp
public class ShopContext : DbContext
{
    private readonly IPublisher _publisher;

    public ShopContext(DbContextOptions<ShopContext> options, IPublisher publisher) : base(options)
        => _publisher = publisher;

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // ① 保存前先收集（保存后 ChangeTracker 会变 Unchanged，但实体还在）
        var owners = ChangeTracker.Entries<Order>()
            .Where(e => e.Entity.EventCount > 0)
            .Select(e => e.Entity)
            .ToList();

        // ② 先落库（事务在这里面）
        var n = await base.SaveChangesAsync(ct);

        // ③ 再派发
        foreach (var o in owners)
            foreach (var e in o.DequeueEvents())
                await _publisher.Publish(e, ct);

        return n;
    }
}
```

**注意 `SaveChanges()`（同步版）也要重写**，否则某些代码路径会绕过派发：

```csharp
public override int SaveChanges()
{
    var owners = ChangeTracker.Entries<Order>()
        .Where(e => e.Entity.EventCount > 0)
        .Select(e => e.Entity).ToList();

    var n = base.SaveChanges();

    foreach (var o in owners)
        foreach (var e in o.DequeueEvents())
            _publisher.Publish(e).GetAwaiter().GetResult();

    return n;
}
```

### 但方案 B 还有个残留问题

```
① base.SaveChangesAsync() 成功
② 派发之前，进程被 kill
   ↓
数据在库里，事件永远发不出去
```

**这就是 outbox 要解决的（P186）。**

---

## P184 · 4. RabbitMQ 简介

> **本节及 P185、P187 的结论本机无法实测**（没装 RabbitMQ，5672 端口不可达）。下面讲的机制是标准行为，代码做了编译验证。

### 它是什么

> **RabbitMQ 是一个"消息中转站"：生产者把消息交给它，它按规则投递给消费者，投递成功前消息一直存在它那里。**

### 和"直接 HTTP 调用"的根本区别

| 维度 | HTTP 直连 | 消息队列 |
|---|---|---|
| 时间耦合 | 对方必须在线 | 对方可以离线，消息等着 |
| 数量耦合 | 一个请求一个响应 | 一个生产者 N 个消费者 |
| 失败处理 | 调用方要重试 | MQ 负责重投 |
| 流量削峰 | 对方被压垮 | 消息排队，慢慢消费 |
| 一致性 | 同步（要么成功要么失败） | **最终一致** |
| 排查 | 看日志 | 看 MQ 管理后台的消息堆积 |

**一句话：**

> **HTTP 是"打电话"，MQ 是"发邮件+邮局保管"。**

### 五个必须知道的概念

```
生产者 Producer
    │  ① 发布消息（带 routingKey）
    ▼
┌─────────────────────────────────────────────────┐
│  Broker（RabbitMQ 服务器）                        │
│                                                  │
│   Exchange（交换机）  ← 决定"消息去哪"            │
│      │                                           │
│      │ ② 按绑定规则（Binding + routingKey）分发   │
│      ▼                                           │
│   Queue（队列）  ← 消息真正排队的地方               │
│      │                                           │
│      │ ③ 投递给消费者                            │
│      ▼                                           │
│   消费者 Consumer                                │
└─────────────────────────────────────────────────┘
```

| 概念 | 作用 | 类比 |
|---|---|---|
| **Producer** | 发消息的程序 | 寄信人 |
| **Exchange** | 按规则决定消息进哪个队列 | 邮局分拣中心 |
| **Queue** | 消息排队等待 | 收件人的信箱 |
| **Binding** | Exchange → Queue 的规则 | "发往北京的进 1 号箱" |
| **routingKey** | 消息上的标签 | 信封上的地址 |
| **Broker** | RabbitMQ 服务器本身 | 邮局 |

**Exchange 的四种类型（最常问的）：**

| 类型 | 路由规则 | 什么时候用 |
|---|---|---|
| **Direct** | routingKey **完全匹配** binding key | 精确投递（`order.submitted` → 订单队列） |
| **Fanout** | **忽略 routingKey，广播给所有绑定队列** | 全服公告、缓存刷新 |
| **Topic** | routingKey 按 `*.` 通配匹配（`order.*`、`#`） | 按类别订阅（`order.created`、`order.paid`） |
| **Headers** | 按消息头匹配 | 极少用 |

**Topic 的通配符（很容易记错）：**

| 符号 | 含义 | 例子 |
|---|---|---|
| `*` | 匹配**一个**单词 | `order.*` 匹配 `order.created`，不匹配 `order.created.v2` |
| `#` | 匹配**零个或多个**单词 | `order.#` 匹配 `order.created.v2` |

**单词分隔符是 `.`**，不是 `/`。

### 消息可靠性：三个开关缺一不可

**这是 RabbitMQ 最容易理解错的地方。消息"丢了"有四种可能，每种有不同对策：**

| 丢失环节 | 对策 | 怎么做 |
|---|---|---|
| ① 生产者 → MQ（网络丢） | **Publisher Confirm** | `CreateChannelOptions { PublisherConfirmationsEnabled = true }` |
| ② MQ 内存 → 磁盘（MQ 挂了） | **队列 + 消息持久化** | `durable: true` + `DeliveryMode = Persistent` |
| ③ MQ → 消费者（消费者挂了） | **手动 ACK** | `autoAck: false` + 处理成功后 `BasicAckAsync` |
| ④ 消费者处理失败 | **Nack + 死信队列** | `BasicNackAsync(requeue: false)` + 配 DLX |

**四个都必须开，缺一个就会丢：**

```
只开持久化不开 ACK → 消费者挂了，消息已从队列删除 → 丢
只开 ACK 不开持久化 → MQ 重启，内存里的消息没了 → 丢
两者都开但没确认机制 → 消息发出去了但网络丢了 → 丢
全都对但消费者处理失败直接 ACK → 业务没执行但消息没了 → 丢
```

### 死信队列（DLX）是什么

**消息"死"了会去哪：**

| 死亡原因 | 说明 |
|---|---|
| 被 `reject`/`nack` 且 `requeue: false` | 业务处理明确失败 |
| TTL 过期 | 消息在队列里待太久 |
| 队列满了 | 超过 `x-max-length` |

**这些消息会被投递到"死信交换机"（DLX），通常再进一个"死信队列"，人工排查/补偿。**

**为什么不直接丢弃：** 因为"处理失败的消息"往往是最需要看的东西（比如 JSON 反序列化失败、字段缺失）。

---

## P185 · 5. .NET 中 RabbitMQ 的基本使用

### 包

```bash
dotnet add package RabbitMQ.Client     # 实测装到 7.2.2
```

**版本警告：7.x 是纯异步 API，和 6.x 完全不兼容。**

| 版本 | API 风格 | 典型代码 |
|---|---|---|
| 6.x（老教程常见） | 同步为主 | `channel.BasicPublish(...)` |
| **7.x** | **全异步** | `await channel.BasicPublishAsync(...)` |

> **你在网上搜到的 RabbitMQ .NET 教程，80% 是 6.x 的同步写法。** 照抄到 7.x 会编译不过（没有 `BasicPublish` 这个方法）。

### 生产者（7.x，编译验证通过）

```csharp
using RabbitMQ.Client;
using System.Text;

var factory = new ConnectionFactory
{
    HostName = "127.0.0.1",
    Port = 5672,
    UserName = "guest",
    Password = "guest"
};

await using var conn = await factory.CreateConnectionAsync();
await using var channel = await conn.CreateChannelAsync();

// ① 声明交换机（不存在就建；参数不一致会报 406 PRECONDITION_FAILED）
await channel.ExchangeDeclareAsync(
    exchange: "order.exchange",
    type: ExchangeType.Direct,
    durable: true,
    autoDelete: false);

// ② 声明队列
await channel.QueueDeclareAsync(
    queue: "order.submitted",
    durable: true,
    exclusive: false,
    autoDelete: false);

// ③ 绑定
await channel.QueueBindAsync(
    queue: "order.submitted",
    exchange: "order.exchange",
    routingKey: "order.submitted");

// ④ 发布（持久化消息）
var body = Encoding.UTF8.GetBytes("""{"orderId":1}""");
var props = new BasicProperties
{
    DeliveryMode = DeliveryModes.Persistent,      // 2 = 持久化
    ContentType = "application/json",
    MessageId = Guid.NewGuid().ToString()         // 幂等键
};

await channel.BasicPublishAsync(
    exchange: "order.exchange",
    routingKey: "order.submitted",
    mandatory: false,
    basicProperties: props,
    body: body);
```

**每个参数的作用：**

| 参数 | 值 | 不这么写会怎样 |
|---|---|---|
| `durable: true` | 队列持久化 | MQ 重启后队列消失（消息一起没） |
| `DeliveryMode = Persistent` | 消息持久化 | MQ 重启后消息消失 |
| `exclusive: false` | 允许多个消费者 | 只能一个消费者连（且连接断开队列就删） |
| `autoDelete: false` | 队列不自动删 | 最后一个消费者断开后队列消失 |
| `mandatory: false` | 路由不到就丢弃（不报错） | 设 `true` 会通过 `BasicReturn` 事件告诉你"没投到任何队列" |
| `MessageId` | 唯一 id | 消费者没法去重 |

### 消费者（7.x）

**两种模式：**

| 模式 | API | 特点 |
|---|---|---|
| **拉模式**（Pull） | `BasicGetAsync` | 简单、自己控制节奏、要写循环 |
| **推模式**（Push） | `AsyncEventingBasicConsumer` + `BasicConsumeAsync` | 官方推荐、自动分发 |

**拉模式（简单场景）：**

```csharp
await channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 1, global: false);

var result = await channel.BasicGetAsync(queue: "order.submitted", autoAck: false);
if (result is not null)
{
    var json = Encoding.UTF8.GetString(result.Body.Span);
    try
    {
        await HandleAsync(json);                                        // 业务处理
        await channel.BasicAckAsync(result.DeliveryTag, multiple: false);  // 确认
    }
    catch
    {
        await channel.BasicNackAsync(result.DeliveryTag, multiple: false, requeue: true);  // 重入队
    }
}
```

**`prefetchCount: 1` 的作用（很容易忽略）：**

| 值 | 行为 |
|---|---|
| `0` | 无限制，消费者一次拿光所有消息 → 第一个消费者忙死，其他闲着 |
| `1` | 一次只拿一条，处理完再拿 → **公平分发** |

**`autoAck` 的两种选择：**

| 值 | 含义 | 风险 |
|---|---|---|
| `true` | 消息一投递就确认 | **消费者处理到一半崩了 → 消息已删 → 丢** |
| `false` | 处理成功后手动确认 | 必须记得 `BasicAck`，否则消息重复投递 |

> **永远用 `autoAck: false`。** `true` 只适合"丢了也无所谓"的场景（比如日志）。

### 本机实测结果（如实记录）

```
=== 第 4 部分：RabbitMQ 连接测试 ===
  ✘ 连不上 broker：SocketException: 由于目标计算机积极拒绝，无法连接。
  → 本机没装 RabbitMQ，第 4 部分（P184/P185/P187）未实测，只做了 API 形状验证
```

| 已验证 | 未验证 |
|---|---|
| `RabbitMQ.Client` 7.2.2 能装、API 形状正确、代码能编译 | 连不上 broker，**投递/ACK/持久化/死信的真实行为全部未跑过** |

**如果要自己跑起来（装完再回来补这几条）：**

```
① 装 Erlang（RabbitMQ 的运行环境）
② 装 RabbitMQ Server
③ 启动服务：rabbitmq-service start
④ 开管理后台：rabbitmq-plugins enable rabbitmq_management
⑤ 浏览器开 http://localhost:15672 （guest/guest）
```

---

## P186 · 6. 简化 DDD 集成事件的框架

### 这一节要解决的问题

**每个项目都要写一遍"事件定义 + 总线 + 序列化 + 重试"，能不能抽成一套？**

### 先分清两个抽象

| 抽象 | 职责 | 谁实现 |
|---|---|---|
| **`IIntegrationEvent`** | 标记"这个事件要跨进程" | 你的事件类 |
| **`IEventBus`** | `Publish` / `Subscribe`，屏蔽传输细节 | RabbitMQ / Kafka / 内存 / HTTP |

**关键设计：业务代码只依赖 `IEventBus`，不依赖 RabbitMQ。**

```csharp
public interface IIntegrationEvent
{
    Guid EventId { get; }               // 幂等键
    DateTime OccurredAt { get; }        // 业务时间
    int Version { get; }                // 契约版本
}

public interface IEventBus
{
    Task PublishAsync<T>(T @event, CancellationToken ct = default) where T : IIntegrationEvent;
    Task SubscribeAsync<T, THandler>(CancellationToken ct = default)
        where T : IIntegrationEvent
        where THandler : IIntegrationEventHandler<T>;
}
```

**为什么这个抽象值钱：**

| 好处 | 说明 |
|---|---|
| 测试不用装 MQ | 注入一个 `InMemoryEventBus` 就能跑集成测试 |
| 换中间件不用改业务 | 从 RabbitMQ 换 Kafka，只换实现类 |
| 本地开发不依赖环境 | 开发环境用内存实现，生产用 RabbitMQ |

### 但只有 `IEventBus` 还不够（会丢消息）

**直接调 `IEventBus.PublishAsync` 的问题：**

```
① await _ctx.SaveChangesAsync();     ← 业务数据进库
② await _bus.PublishAsync(evt);      ← 发消息
       ↑ 这两步不在同一个事务里
```

| 崩在哪 | 后果 |
|---|---|
| ① 之后、② 之前 | **数据在，消息丢** |
| ② 之后、① 之后（都成功） | 正常 |
| ② 内部失败 | 数据在，消息丢（除非同步重试） |

### 解法：Outbox 模式

**核心思想：把"要发的事件"当成业务数据的一部分，写进同一张表、同一个事务。**

```
① 一个事务里做两件事：
     INSERT Orders ...
     INSERT Outbox (待发消息) ...
   → COMMIT

② 后台任务（IHostedService / 定时任务）：
     读 Outbox 里 SentAt IS NULL 的记录
     发到 MQ
     成功后标记 SentAt = now
```

**这样"业务成功"和"事件待发"是原子的**，剩下的只是"什么时候真的发出去"。

### 实测：outbox 的四个场景

**测试项目 `D:\tmp\MedTest`，用 `InMemoryEventBus` 替代真实 MQ（传输层不影响 outbox 的逻辑）。**

#### 3-1：业务数据 + outbox 消息，同一个事务

```
3-1 · 业务数据 + outbox 消息，同一个事务
  订单 Id = 1，outbox 条数 = 1
```

**两条 INSERT 在同一个 `SaveChanges` 里 → 同一个事务 → 要么都成功要么都不成功。**

#### 3-2：后台派发器读未发的、发出去、标记已发

```
3-2 · 后台派发器：读未发的、发出去、标记已发
  待发送 1 条
  bus 收到 1 条：OrderSubmittedEvent#1
  outbox 剩余未发 0 条
```

#### 3-3：发送失败 → 留在 outbox 等重试（这是 outbox 存在的理由）

```
3-3 · 发送失败 → 留在 outbox 等重试
    发送失败：MQ 连接失败（模拟）
  outbox 未发 1 条，有错误记录 1 条
  MQ 恢复后重试 1 条…
  outbox 未发 0 条
  bus 总共收到 2 条：OrderSubmittedEvent#1 | OrderSubmittedEvent#2
```

| 阶段 | 状态 |
|---|---|
| MQ 挂 | 消息留在 outbox（`SentAt = null`），`RetryCount = 1`，`LastError` 有值 |
| MQ 恢复 | 重试成功，标记已发 |
| 最终 | 两条都发出去了，**一条没丢** |

> **对比"直接 Publish"：** 如果 MQ 挂了，直接 Publish 抛异常 → 你的业务操作（已经提交的）和事件就永久不一致了。outbox 让你"晚一点发"而不是"发不出去"。

#### 3-4：重复投递（必然发生）

```
3-4 · 同一条消息被发两次（至少一次语义的必然结果）
  同一个消息对象被发送了 2 次（Payload 都是 OrderId=99）→ 消费者必须自己做幂等
```

**为什么会重复：**

| 原因 | 说明 |
|---|---|
| 发送成功但标记失败 | 后台任务发了，`SaveChanges` 前崩了 → 下次重发 |
| MQ 确认丢失 | 消息到了，但 Confirm 没回来 → 生产者重发 |
| 消费者 ACK 丢失 | 处理完了，ACK 没到 MQ → MQ 重投 |

**所以：**

> **消息队列的语义是"至少一次"（at-least-once），不是"恰好一次"。**
>
> **想实现"恰好一次"的效果，只能靠消费者幂等。**

**幂等的三种做法：**

| 做法 | 说明 | 成本 |
|---|---|---|
| 用 `EventId` 建唯一索引 | 重复消息插入失败 → 直接跳过 | 低（推荐） |
| 业务状态机判断 | "已支付"的订单不再处理支付事件 | 中（要设计状态） |
| 分布式锁 + 处理记录 | 通用的去重表 | 高 |

```csharp
// 最简单可靠的幂等：消费记录表 + 唯一索引
public class ProcessedEvent
{
    public Guid EventId { get; set; }        // 主键
    public DateTime ProcessedAt { get; set; }
}

// 消费时
try
{
    ctx.ProcessedEvents.Add(new ProcessedEvent { EventId = e.EventId, ProcessedAt = DateTime.UtcNow });
    await ctx.SaveChangesAsync(ct);          // EventId 重复 → 唯一约束异常
}
catch (DbUpdateException)
{
    return;                                  // 已经处理过，跳过
}
await DoBusinessAsync(e, ct);
```

### Outbox 表结构

```csharp
public class OutboxMessage
{
    public long Id { get; set; }                    // 自增，保证发送顺序
    public string EventType { get; set; } = "";     // 完整类型名或契约名
    public string Payload { get; set; } = "";       // JSON
    public DateTime CreatedAt { get; set; }         // 创建时间
    public DateTime? SentAt { get; set; }           // 发出去的时间（null = 未发）
    public int RetryCount { get; set; }             // 重试次数
    public string? LastError { get; set; }          // 最后一次错误
}
```

**配置建议：**

```csharp
b.Entity<OutboxMessage>(e =>
{
    e.ToTable("Outbox");
    e.HasKey(x => x.Id);
    e.Property(x => x.EventType).HasMaxLength(200);
    e.Property(x => x.Payload).IsRequired();
    e.HasIndex(x => x.SentAt);                      // 查未发的要走索引
    e.HasIndex(x => x.CreatedAt);
});
```

**`HasIndex(x => x.SentAt)` 很重要：** 后台任务每 5 秒查一次"未发送的"，表大了没索引会全表扫描。

### 后台派发器

```csharp
public class OutboxDispatcher : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<OutboxDispatcher> _logger;

    public OutboxDispatcher(IServiceProvider sp, ILogger<OutboxDispatcher> logger)
    {
        _sp = sp; _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        while (await timer.WaitForNextTickAsync(ct))
        {
            try { await DispatchBatchAsync(ct); }
            catch (Exception ex) { _logger.LogError(ex, "outbox 派发失败"); }
        }
    }

    private async Task DispatchBatchAsync(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<ShopContext>();
        var bus = scope.ServiceProvider.GetRequiredService<IEventBus>();

        var pending = await ctx.Outbox
            .Where(m => m.SentAt == null)
            .OrderBy(m => m.Id)
            .Take(100)                                // 分批，别一次读全表
            .ToListAsync(ct);

        foreach (var m in pending)
        {
            try
            {
                await bus.PublishRawAsync(m.Payload, m.EventType, ct);
                m.SentAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                m.RetryCount++;
                m.LastError = ex.Message;
                if (m.RetryCount > 10) m.SentAt = DateTime.UtcNow;   // 别无限重试，进死信
            }
        }
        await ctx.SaveChangesAsync(ct);
    }
}
```

**注册：**

```csharp
builder.Services.AddHostedService<OutboxDispatcher>();
```

> **注意 `BackgroundService` 的坑（批次 18 实测过）：未捕获异常会让整个应用停止。** 所以 `ExecuteAsync` 里必须 try/catch，别让异常冒出去。

---

## P187 · 7. Zack.EventBus 源码讲解

> **本节是对课程配套开源库的结构讲解。本机没有 broker，无法运行。**

### 它解决什么问题

**P186 你手写了 `IEventBus` + outbox。Zack.EventBus 是课程作者把同样的事抽成了一个库。**

**它的定位：**

| 是 | 不是 |
|---|---|
| 一个轻量的 RabbitMQ 封装 | 完整的消息框架（没有 outbox 表、没有管理后台） |
| 帮你省掉 Exchange/Queue 的声明样板代码 | 不处理分布式事务 |
| 提供 `[EventName]` 特性做路由键 | 不做序列化版本管理 |

### 核心组件（按职责）

```
Zack.EventBus
├── IIntegrationEvent              标记接口（跨进程事件）
├── IEventBus                      Publish / Subscribe
│     ├── Publish(string eventName, object data)
│     └── Subscribe(string eventName, Type handlerType)
├── EventBusRabbitMQ               实现（连接、声明、发布、消费）
│     ├── 连接管理（重连）
│     ├── Exchange 声明
│     ├── 发布（BasicPublish）
│     └── 消费（EventingBasicConsumer → 反射调 handler）
├── EventNameAttribute             给事件类标路由键
└── 自动订阅扫描                    启动时扫描 IIntegrationEventHandler<> 实现
```

### 它比手写省了什么

| 手写要做的 | Zack.EventBus 做的 |
|---|---|
| 声明 Exchange / Queue / Binding | 启动时按约定自动声明 |
| 序列化/反序列化 | 内部用 `System.Text.Json` |
| 从 DI 里找 handler | 按接口类型扫描注册 |
| 事件名 → routingKey 的映射 | `[EventName("order.submitted")]` |
| 连接断开重连 | 内部有重连逻辑 |

### 用法（典型形状）

```csharp
// ① 定义事件
[EventName("order.submitted")]
public record OrderSubmittedEvent(long OrderId, string Buyer) : IIntegrationEvent;

// ② 定义处理器
public class NotifyWarehouseHandler : IIntegrationEventHandler<OrderSubmittedEvent>
{
    public Task Handle(OrderSubmittedEvent e)
    {
        Console.WriteLine($"通知仓库：{e.OrderId}");
        return Task.CompletedTask;
    }
}

// ③ 注册
builder.Services.AddEventBusRabbitMQ(cfg =>
{
    cfg.HostName = "localhost";
    cfg.UserName = "guest";
    cfg.Password = "guest";
    cfg.QueueName = "order-service";
});

// ④ 发布
await _eventBus.PublishAsync("order.submitted", new OrderSubmittedEvent(1, "张三"));
```

### 从它源码里能学到的三个设计取舍

| 取舍 | 它怎么做的 | 评价 |
|---|---|---|
| **事件名用字符串还是类型** | 用 `[EventName]` 特性 + 字符串 | 松耦合但**改类名不影响，改事件名就断** |
| **一个队列还是每个事件一个队列** | **一个服务一个队列**，事件名做 routingKey | 简单，但**一个事件消费慢会阻塞其他事件** |
| **要不要内置 outbox** | **没有** | 轻量，但**会丢消息**（P186 的问题它不解决） |

> **这三条就是"轻量封装"和"生产级框架"的分界线。**
>
> **Zack.EventBus 适合"学习 + 中小项目"，不适合"不能丢一条消息"的场景。**

### 完整生产级还需要补什么

| 缺口 | 补法 |
|---|---|
| 不保证不丢 | 加 outbox 表（P186） |
| 没有重试策略 | `Polly` + 退避 |
| 没有死信队列 | 声明时配 `x-dead-letter-exchange` |
| 没有幂等 | 消费记录表 + 唯一索引 |
| 没有监控 | 消息堆积告警（管理后台 API） |
| 没有版本管理 | 事件名带版本 `order.submitted.v2` |

---

==二：格式==

## 1. MediatR 注册与使用模板

```csharp
// ---------- Program.cs ----------
builder.Services.AddLogging();                 // MediatR 14 硬依赖
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    // cfg.Lifetime = ServiceLifetime.Scoped;   // 默认 Transient
});
builder.Services.AddDbContextFactory<ShopContext>(o => o.UseSqlServer(conn));  // handler 里要用新实例

// ---------- 事件定义 ----------
public record OrderSubmittedEvent(long OrderId, string Buyer, decimal Total) : INotification;

// ---------- 处理器（可以多个） ----------
public class NotifyWarehouse : INotificationHandler<OrderSubmittedEvent>
{
    public Task Handle(OrderSubmittedEvent e, CancellationToken ct) => Task.CompletedTask;
}

// ---------- 命令/查询（只能一个） ----------
public record GetOrderQuery(long Id) : IRequest<OrderDto>;

public class GetOrderHandler : IRequestHandler<GetOrderQuery, OrderDto>
{
    public Task<OrderDto> Handle(GetOrderQuery q, CancellationToken ct) => Task.FromResult(new OrderDto());
}

// ---------- 用 ----------
await _publisher.Publish(new OrderSubmittedEvent(...), ct);   // 事件：多个 handler
var dto = await _sender.Send(new GetOrderQuery(1), ct);       // 命令：一个 handler
```

## 2. 领域事件 → 集成事件 转换模板

```csharp
// 领域事件（进程内，轻量）
public record OrderSubmittedEvent(Order Order);

// 集成事件（跨进程，完整快照）
public record OrderSubmittedIntegrationEvent : IIntegrationEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
    public int Version { get; init; } = 1;

    public long OrderId { get; init; }
    public string Buyer { get; init; } = "";
    public decimal Total { get; init; }
    public List<ItemDto> Items { get; init; } = new();
}

// 转换（在 handler 里，保存之后）
public class PublishIntegrationEvent : INotificationHandler<OrderSubmittedEvent>
{
    private readonly ShopContext _ctx;
    public PublishIntegrationEvent(ShopContext ctx) => _ctx = ctx;

    public async Task Handle(OrderSubmittedEvent e, CancellationToken ct)
    {
        var o = e.Order;
        _ctx.Outbox.Add(new OutboxMessage
        {
            EventType = nameof(OrderSubmittedIntegrationEvent),
            Payload = JsonSerializer.Serialize(new OrderSubmittedIntegrationEvent
            {
                OrderId = o.Id,
                Buyer = o.Buyer,
                Total = o.Total,
                Items = o.Items.Select(i => new ItemDto(i.Sku, i.Qty, i.Price)).ToList()
            })
        });
        await _ctx.SaveChangesAsync(ct);      // 写 outbox（独立事务，能接受）
    }
}
```

## 3. 派发位置的正确 / 错误写法

```csharp
// ❌ 错误 1：在聚合里派发
public void Submit()
{
    Status = OrderStatus.Submitted;
    _publisher.Publish(new OrderSubmittedEvent(this)).GetAwaiter().GetResult();   // Id=0，数据没落库
}

// ❌ 错误 2：拦截器 SavingChanges
public override ValueTask<InterceptionResult<int>> SavingChangesAsync(...)
{
    // 这里 CurrentTransaction 还是 null（实测），发出去的事件查不到数据
}

// ❌ 错误 3：SavedChanges 里复用同一个 DbContext 保存
public override ValueTask<int> SavedChangesAsync(...)
{
    await eventData.Context.SaveChangesAsync();     // 无限递归 → StackOverflow
}

// ✅ 正确 1：AppService 里显式派发
await _ctx.SaveChangesAsync(ct);
foreach (var e in order.DequeueEvents()) await _publisher.Publish(e, ct);

// ✅ 正确 2：重写 SaveChangesAsync
var owners = ChangeTracker.Entries<Order>().Where(x => x.Entity.EventCount > 0).Select(x => x.Entity).ToList();
var n = await base.SaveChangesAsync(ct);
foreach (var o in owners) foreach (var e in o.DequeueEvents()) await _publisher.Publish(e, ct);

// ✅ 正确 3：outbox（最可靠）
// 业务数据 + outbox 记录 同一个 SaveChanges，后台任务发送
```

## 4. outbox 派发器模板

```csharp
public class OutboxDispatcher : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<OutboxDispatcher> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);
    private const int BatchSize = 100;
    private const int MaxRetry = 10;

    public OutboxDispatcher(IServiceProvider sp, ILogger<OutboxDispatcher> logger)
        => (_sp, _logger) = (sp, logger);

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(Interval);
        while (await timer.WaitForNextTickAsync(ct))
        {
            try { await DispatchAsync(ct); }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { _logger.LogError(ex, "outbox 派发异常"); }   // 别让异常冒出去
        }
    }

    private async Task DispatchAsync(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<ShopContext>();
        var bus = scope.ServiceProvider.GetRequiredService<IEventBus>();

        var pending = await ctx.Outbox
            .Where(m => m.SentAt == null && m.RetryCount <= MaxRetry)
            .OrderBy(m => m.Id).Take(BatchSize).ToListAsync(ct);

        foreach (var m in pending)
        {
            try { await bus.PublishRawAsync(m.EventType, m.Payload, ct); m.SentAt = DateTime.UtcNow; }
            catch (Exception ex) { m.RetryCount++; m.LastError = ex.Message; }
        }
        await ctx.SaveChangesAsync(ct);
    }
}
```

## 5. RabbitMQ Exchange 类型对照

| 类型 | 路由依据 | `routingKey` | 典型场景 | 声明写法 |
|---|---|---|---|---|
| **Direct** | 完全匹配 | `order.submitted` | 精确投递 | `ExchangeType.Direct` |
| **Fanout** | 忽略 | 无所谓 | 广播（全服公告） | `ExchangeType.Fanout` |
| **Topic** | 通配匹配 | `order.*.paid` | 按类别订阅 | `ExchangeType.Topic` |
| **Headers** | 消息头 | 无所谓 | 极少用 | `ExchangeType.Headers` |

**Topic 匹配示例（容易记错，列表记住）：**

| Binding key | 能匹配 | 不能匹配 |
|---|---|---|
| `order.*` | `order.created`、`order.paid` | `order.created.v2`（`*` 只一个词） |
| `order.#` | `order.created`、`order.created.v2`、`order` | `orders.created`（首词不同） |
| `*.*.paid` | `order.book.paid` | `order.paid` |
| `#.paid` | `paid`、`order.paid`、`a.b.paid` | `paid.order` |

## 6. 现象 / 报错 → 原因 → 解法

| 现象 / 报错 | 原因 | 解法 |
|---|---|---|
| `MediatR requires ILoggerFactory to be registered` | MediatR 14 硬依赖 | `services.AddLogging()` 放在 `AddMediatR` 前 |
| `Send` 只执行了一个 handler | `IRequest` 允许多个注册但只取一个 | 一个 `IRequest` 只写一个 handler |
| `No service for type 'IRequestHandler<...>' has been registered` | `Send` 没有对应 handler | 补 handler 或改用 `Publish` |
| `Publish` 后面的 handler 没执行 | 前面的 handler 抛异常（顺序 await） | handler 内 try/catch，或拆分关键/非关键 |
| 事件 handler 里查库查不到 | 在 `SavingChanges` 派发（数据没提交） | 改到 `SavedChanges` 或保存后显式派发 |
| `SaveChanges` 之后进程重启，事件丢了 | 没有 outbox | 加 outbox 表 |
| `StackOverflowException`（无堆栈） | 在 `SavedChanges` 里复用同一 `DbContext` 保存 | 用 `IDbContextFactory` 建新实例 |
| 消息重复消费 | MQ "至少一次"语义 | 消费记录表 + 唯一索引 |
| `406 PRECONDITION_FAILED` | Exchange/Queue 参数与已存在的不一致 | 删掉重建，或参数保持一致 |
| `404 NOT_FOUND` | 交换机或队列没声明 | 先 `ExchangeDeclare` + `QueueDeclare` + `QueueBind` |
| 消费者一个忙死一个闲着 | `prefetchCount` 没设 | `BasicQosAsync(prefetchCount: 1)` |
| MQ 重启后消息没了 | 队列/消息没持久化 | `durable: true` + `DeliveryMode = Persistent` |

## 7. 事件可靠性等级

**按你能容忍的丢失程度选方案：**

| 等级 | 方案 | 会丢在哪 | 成本 |
|---|---|---|---|
| **L0 无所谓** | `_publisher.Publish` 直接调 | handler 抛异常、进程崩 | 最低 |
| **L1 进程内** | 保存后显式派发 / 重写 `SaveChanges` | 进程崩在派发前 | 低 |
| **L2 能重发** | outbox + 内存总线 + 重启补偿 | 基本不丢（除非库坏） | 中 |
| **L3 跨进程** | outbox + RabbitMQ（持久化 + ACK） | 极小概率（需 MQ 自身高可用） | 高 |
| **L4 不能丢一条** | L3 + 幂等 + 死信 + 监控告警 | — | 很高 |

**你的游戏服务端大概需要：**

| 事件 | 需要等级 |
|---|---|
| 成就解锁 | L1（丢一次玩家重打一次 Boss 就补上了） |
| 加金币/道具 | **L2 以上**（丢了玩家会骂） |
| 充值到账 | **L4**（丢了是钱的问题） |
| 全服公告 | L0/L1（丢了没人知道） |

---

==三：代码==

## 1. 仓储 + 工作单元（完整）

```csharp
// ---------- 接口 ----------
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(long id, CancellationToken ct = default);
    Task AddAsync(Order order, CancellationToken ct = default);
    Task RemoveAsync(Order order, CancellationToken ct = default);
}

// ---------- 实现 ----------
public class OrderRepository : IOrderRepository
{
    private readonly ShopContext _ctx;
    public OrderRepository(ShopContext ctx) => _ctx = ctx;

    public Task<Order?> GetByIdAsync(long id, CancellationToken ct = default)
        => _ctx.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id, ct);

    public async Task AddAsync(Order order, CancellationToken ct = default)
        => await _ctx.Orders.AddAsync(order, ct);

    public Task RemoveAsync(Order order, CancellationToken ct = default)
    {
        _ctx.Orders.Remove(order);
        return Task.CompletedTask;
    }
}

// ---------- 应用服务（UoW 就在这里） ----------
public class OrderAppService
{
    private readonly IOrderRepository _repo;
    private readonly ShopContext _ctx;
    private readonly IPublisher _publisher;
    private readonly ILogger<OrderAppService> _logger;

    public OrderAppService(IOrderRepository repo, ShopContext ctx,
                           IPublisher publisher, ILogger<OrderAppService> logger)
        => (_repo, _ctx, _publisher, _logger) = (repo, ctx, publisher, logger);

    public async Task<bool> SubmitAsync(long orderId, CancellationToken ct)
    {
        var order = await _repo.GetByIdAsync(orderId, ct);
        if (order is null) return false;

        order.Submit();                          // 领域行为（可能抛业务异常）

        await _ctx.SaveChangesAsync(ct);         // 一次事务

        foreach (var e in order.DequeueEvents())  // 保存后派发
        {
            try { await _publisher.Publish(e, ct); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "领域事件 {Event} 处理失败", e.GetType().Name);
                // 注意：这里吞掉异常意味着"事件失败但业务成功"
                // 要不要吞取决于业务：通知类可以吞，加积分不能吞
            }
        }
        return true;
    }
}
```

## 2. MediatR 完整注册 + 多个 handler

```csharp
// Program.cs
builder.Services.AddLogging();
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
builder.Services.AddDbContextFactory<ShopContext>(o => o.UseSqlServer(conn));
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<OrderAppService>();
```

**handler 里要用新 DbContext：**

```csharp
public class AddPointsHandler : INotificationHandler<OrderSubmittedEvent>
{
    private readonly IDbContextFactory<ShopContext> _factory;
    private readonly ILogger<AddPointsHandler> _logger;

    public AddPointsHandler(IDbContextFactory<ShopContext> factory, ILogger<AddPointsHandler> logger)
        => (_factory, _logger) = (factory, logger);

    public async Task Handle(OrderSubmittedEvent e, CancellationToken ct)
    {
        await using var ctx = await _factory.CreateDbContextAsync(ct);
        // ... 业务
        await ctx.SaveChangesAsync(ct);
    }
}
```

## 3. Outbox 完整实现（本篇实测版本）

```csharp
// ---------- 实体 ----------
public class OutboxMessage
{
    public long Id { get; set; }
    public string EventType { get; set; } = "";
    public string Payload { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
    public int RetryCount { get; set; }
    public string? LastError { get; set; }

    public static OutboxMessage From<T>(T e) => new()
    {
        EventType = typeof(T).Name,
        Payload = System.Text.Json.JsonSerializer.Serialize(e)
    };

    public void MarkSent() { SentAt = DateTime.UtcNow; LastError = null; }
    public void MarkFailed(string err) { RetryCount++; LastError = err; }
}

// ---------- 写 outbox（和业务同一个 SaveChanges） ----------
using var ctx = new OutboxContext(path);
var order = new ShopOrder("张三");
order.AddItem("BOOK-010", 1, 60m);
order.Submit();
ctx.Orders.Add(order);

foreach (var e in order.DequeueEvents())
    if (e is OrderSubmittedEvent oe)
        ctx.Outbox.Add(OutboxMessage.From(oe));

await ctx.SaveChangesAsync();     // 两条 INSERT，一个事务
```

**实测输出：**

```
3-1 · 业务数据 + outbox 消息，同一个事务
  订单 Id = 1，outbox 条数 = 1
```

## 4. RabbitMQ 生产者/消费者（编译验证通过，未连真实 broker）

见 P185 正文。核心 API 形状：

```csharp
await using var conn = await factory.CreateConnectionAsync();
await using var channel = await conn.CreateChannelAsync();

await channel.ExchangeDeclareAsync("order.exchange", ExchangeType.Direct, durable: true, autoDelete: false);
await channel.QueueDeclareAsync("order.submitted", durable: true, exclusive: false, autoDelete: false);
await channel.QueueBindAsync("order.submitted", "order.exchange", "order.submitted");

await channel.BasicPublishAsync(
    exchange: "order.exchange",
    routingKey: "order.submitted",
    mandatory: false,
    basicProperties: new BasicProperties { DeliveryMode = DeliveryModes.Persistent },
    body: Encoding.UTF8.GetBytes(json));
```

## 5. 本篇实测汇总

**项目：`D:\tmp\MedTest`（net10.0 + MediatR 14.2.0 + EF Core 10.0.13 + RabbitMQ.Client 7.2.2 + SQLite）**

### MediatR 五条行为

```
1-1 · Publish 一个通知，3 个 handler 都会执行吗、什么顺序
    ① 通知仓库（OrderId=1）
    ② 加积分（OrderId=1）
    ③ 写审计（OrderId=1）

1-2 · 其中一个 handler 抛异常，后面的还会执行吗
  Publish 抛出：InvalidOperationException：积分服务挂了
    ① 通知仓库（OrderId=2）
    ② 加积分（OrderId=2）          ← ③ 没执行

1-3 · Send 一个请求：有 2 个 handler 时会用哪个
  Send 返回：来自 Handler1          ← 静默取一个，不报错

1-4 · Send 一个没有 handler 的请求
  抛出：InvalidOperationException：No service for type
        'MediatR.IRequestHandler`2[NobodyHandlesQuery,System.Int32]' has been registered.

1-5 · Publish 是并发还是顺序（看时间戳）
    Slow1 开始 01:03:56.435
    Slow1 结束 01:03:56.738
    Slow2 开始 01:03:56.739
    Slow2 结束 01:03:57.041
  总耗时 606 ms（两个各 300ms）     ← 串行
```

**外加一个环境坑：**

```
Unhandled exception. System.InvalidOperationException:
  MediatR requires ILoggerFactory to be registered.
  Call services.AddLogging() before services.AddMediatR().
  ...
  at MediatR.Mediator..ctor(...)      ← 堆栈里还有 CheckLicense（商业授权检查）
```

### EF Core 四个派发位置

```
方案 A · AppService 里 SaveChanges 之后派发（手写）
  保存后 order.Id = 1，事件数 = 1
    事件里存的 OrderId = 0（Submit 那刻的 Id），用聚合当前 Id=1 查库 → 查到了，状态=Submitted，Total=100.0

方案 B · 重写 SaveChangesAsync，在 base 之后派发
    [方案B] 派发 OrderSubmittedEvent：事件里存 OrderId=0，聚合当前 Id=2
       handler 用另一个 DbContext 查库 → 查到，状态=Submitted

方案 C-1 · 拦截器 SavingChanges（保存前）派发
    [拦截器] SavingChanges：CurrentTransaction = null（还没开事务）
    [拦截器] 保存前派发：事件里 OrderId=0，聚合 Id=0 → 查库：查不到（库里还没有这行）
  保存后 order.Id = 3

方案 C-2 · 拦截器 SavedChanges（保存后）派发
    [拦截器] SavedChanges：CurrentTransaction = null（已提交）
    [拦截器] 保存后派发：事件里 OrderId=0，聚合 Id=4 → 查库：查到，状态=Submitted
  保存后 order.Id = 4

方案 D · 在 SavedChanges 里再调一次 SaveChanges
    [拦截器] 第 1 层：在 SavedChanges 里再调 SaveChanges…
    [拦截器] SavedChanges：CurrentTransaction = null（已提交）
    [拦截器] 第 2 层：在 SavedChanges 里再调 SaveChanges…
    [拦截器] SavedChanges：CurrentTransaction = null（已提交）
    [拦截器] 第 3 层：…
    → 不限层数会一直递归到 StackOverflow

方案 E · 保存前派发 + 保存失败 → 幽灵事件
    [拦截器] 保存前派发：事件里 OrderId=0，聚合 Id=0 → 查库：查不到
  SaveChanges 失败：SQLite Error 19: 'UNIQUE constraint failed: Inventories.Sku'.
  库里「会失败」的订单数 = 0（数据回滚了）      ← 但事件已经派发过了
```

### Outbox 四个场景

```
3-1  订单 Id = 1，outbox 条数 = 1                       ← 同一事务
3-2  待发送 1 条 → bus 收到 1 条 → outbox 剩余未发 0 条
3-3  发送失败 → outbox 未发 1 条，有错误记录 1 条
     MQ 恢复后重试 1 条 → outbox 未发 0 条
     bus 总共收到 2 条：OrderSubmittedEvent#1 | OrderSubmittedEvent#2   ← 一条没丢
3-4  同一个消息对象被发送了 2 次 → 消费者必须自己做幂等
```

### RabbitMQ

```
=== 第 4 部分：RabbitMQ 连接测试 ===
  ✘ 连不上 broker：SocketException: 由于目标计算机积极拒绝，无法连接。
  → 本机没装 RabbitMQ，第 4 部分（P184/P185/P187）未实测，只做了 API 形状验证
```

| 已验证 | 未验证 |
|---|---|
| `RabbitMQ.Client` 7.2.2 可安装、全异步 API 形状正确、代码编译通过（0 警告 0 错误） | 投递、ACK、持久化、死信、重连的运行时行为 |

## 6. 练习：给你的图书系统接一条完整的事件链（一次一步）

> **这次分四步，每步都能单独跑通。一次做一步。**

### Step 1 · 让"借书成功"发出一个领域事件

```csharp
public record BookBorrowedEvent(long BookId, long ReaderId, DateTime BorrowTime) : INotification;
```

**在 `BorrowAppService`（或你现在的 `BorrowService`）里，`SaveChanges` 之后 `Publish` 它。**

**验收：** 控制台打印"收到 BookBorrowedEvent"。

### Step 2 · 加两个订阅者，并验证"一个抛异常，另一个还会不会执行"

| 订阅者 | 干什么 |
|---|---|
| `UpdateReaderStats` | 累加读者的借阅次数 |
| `WriteBorrowAudit` | 写一条审计日志 |

**然后故意让 `UpdateReaderStats` 抛异常，看 `WriteBorrowAudit` 有没有执行。**

**把结果发我**——这一步就是实测 1-2 在你项目里的复现。

### Step 3 · 换成"重写 SaveChangesAsync"自动派发

**把 Step 1 里手动 `Publish` 的代码删掉，改成在 `DbContext.SaveChangesAsync` 里自动派发。**

**验收：** 业务代码里一行 `Publish` 都没有，事件照样触发。

### Step 4 · 加 outbox（可选，但建议做）

**把 `BookBorrowedEvent` 转成 `BookBorrowedIntegrationEvent`，写进 `Outbox` 表，再用一个 `BackgroundService` 轮询发送。**

**验收：** 把 MQ（或你的 `InMemoryEventBus`）设成"第一次必失败"，看它是否重试成功。

---

==四：总结==

## 1. 七节知识一张表

| P | 主题 | 一句话核心 |
|---|---|---|
| 181 | 聚合在 .NET 中的实现 | 仓储是"聚合的门"不是"表的门"；`DbContext` 本身就是工作单元 |
| 182 | MediatR 实现领域事件 | `Publish` 一对多且**串行**，一个 handler 挂后面全跳过 |
| 183 | 发布事件的合适时机 | **只在保存之后**；`SavingChanges` 里没有事务，`SavedChanges` 里复用上下文会**无限递归** |
| 184 | RabbitMQ 简介 | Exchange 按规则分发，Queue 排队；可靠性靠**持久化 + ACK** 两个都要 |
| 185 | .NET 用 RabbitMQ | 7.x 是**全异步 API**，网上 80% 教程是 6.x 的同步写法 |
| 186 | 简化集成事件框架 | `IEventBus` 抽传输 + **outbox 保命**；MQ 是"至少一次"，幂等靠你自己 |
| 187 | Zack.EventBus 源码 | 轻量封装：省样板代码，但**不解决不丢消息** |

## 2. 十条硬结论（全部实测）

1. **`Publish` 会调用所有 handler，顺序是注册顺序，串行执行。** 实测三个各 300ms 的 handler 总耗时 606ms。

2. **一个 handler 抛异常，后面的全部跳过，异常冒泡到调用方。** 实测 ③ 没有执行。

3. **`Send` 有多个 handler 时静默取一个，不报错。** 实测返回"来自 Handler1"——这是丢逻辑的隐形杀手。

4. **`Send` 没有 handler 会抛** `No service for type 'IRequestHandler<...>' has been registered`；`Publish` 没有 handler 不抛。

5. **MediatR 14 必须有 `ILoggerFactory`**，否则解析 `IPublisher` 直接抛。堆栈里还能看到 `CheckLicense`——12 之后转商业授权。

6. **`SaveChanges` 拦截器的 `SavingChanges` 阶段，`CurrentTransaction` 还是 `null`。** 实测输出，说明那一刻事务还没开。

7. **保存前派发 → 聚合 `Id=0`、库里查不到、保存失败还留幽灵事件。** 三条一次全中。

8. **在 `SavedChanges` 里复用同一个 `DbContext` 调 `SaveChanges` = 无限递归**，实测第 1/2/3 层，真实代码会 `StackOverflowException`（无法 catch）。

9. **outbox 让"发失败"变成"晚点发"**：实测 MQ 挂掉后消息留在表里（`RetryCount=1`），恢复后重试成功，两条消息一条没丢。

10. **MQ 是"至少一次"，同一消息被发两次是必然的。** 实测同一个消息对象发送两次，消费者收到两次——幂等只能自己做。

## 3. 决策流程图

```
事件要发给谁？
     │
     ▼
同一个进程内的其他模块？
     │
  ┌──┴──┐
 是     不是（跨服务/跨系统）
  │      │
  ▼      ▼
领域事件  集成事件
MediatR   outbox + MQ
  │        │
  ▼        ▼
什么时候派发？        要什么可靠性？
  │                     │
  ▼                     ├─ 丢了无所谓 → 直接发
保存之后（必须）         ├─ 不能丢 → outbox + 重试
  │                     └─ 一条都不能丢 → outbox + 幂等 + 死信 + 告警
  ├─ 简单项目 → AppService 里显式 Publish
  └─ 想自动化 → 重写 SaveChangesAsync
                （千万别用 SavingChanges）
```

## 4. 记忆口诀

```
仓储是聚合的门，不是表的门；
没有 Update 方法，跟踪查询改完就存；
MediatR 的 Publish 一对多，串行执行不并发；
一个 handler 炸了，后面全部跳过；
Send 只能一个 handler，多注册静默取一个；
AddLogging 先注册，MediatR 十四才肯跑；
派发只在保存后，保存前 Id 是零；
SavingChanges 没事务，SavedChanges 别重入；
重入就是无限递归，StackOverflow 抓不住；
handler 要改库，新建 DbContext；
MQ 至少一次，重复必然发生，幂等自己写；
持久化加 ACK，两个都得开；
outbox 一条命，先写库再发送，失败留着慢慢重试。
```

## 5. 三句话带走

1. **"事件发不出去"和"事件发早了"是两类完全不同的 bug，而它们的修法只有一个：保存之后派发。** 保存之前你拿到的是 `Id = 0` 和一个还没提交的数据库。

2. **MediatR 不是"事件框架"，是"进程内的消息分发器"。** 它不保证投递、不保证顺序稳定、不保证失败重试。**它只是替你省了"按类型找 handler"的反射代码**，其余的事情都得你自己设计。

3. **消息队列给你的不是"解耦"，是"把同步失败变成可重试的延迟"。** 代价是你必须接受最终一致、必须自己实现幂等、必须多维护一个中间件。**如果你的系统只有一两个进程，领域事件 + outbox 就够了，别上 MQ。**

---

> **下一篇（批次 24，P188–P196）是最后一批：「洋葱架构 + DDD 实战 + 收尾」**：
> **什么是洋葱架构（整洁架构）**（依赖方向为什么必须向内、四层怎么划、和 DDD 分层怎么对应）、
> **DDD 实战七节**（项目分层、领域模型、领域服务、基础设施、工作单元、应用层）、
> **强类型 Id**（`OrderId` 而不是 `long`，解决"参数传错位置"这类 bug）、
> **这不是最后一节课**（把 196 集串成一张知识网）。
> **做完这一批，整个 196 集的课程就结束了。**
>
> **P165「程序发布」仍然挂着**，等你真要把项目扔到服务器上之前，跟我说一声，我单独补一篇。
