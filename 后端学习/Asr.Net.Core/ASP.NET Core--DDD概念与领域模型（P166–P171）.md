==零：补充==

> **这一篇（P166–P171）回答一个问题：当"业务"本身变成最难的部分，代码该怎么组织？**

## 它解决什么问题

**你现在的代码是这样的：**

```
BooksController.GetBooks()   → 查库 → 返回 JSON
BooksController.AddBook()    → 校验 → 插入 → 返回
BooksController.BorrowBook() → 查库存 → 判断 → 扣减 → 写记录
```

**这套结构在"业务简单"时是完美的。** 一个接口对应一次数据库操作，中间夹几行 `if`，谁都看得懂。

**问题是这几行 `if` 会长大。**

假设图书馆要加"借书"规则，第一版可能是：

```csharp
if (book.Stock <= 0) return BadRequest("没库存了");
book.Stock--;
```

三个月后，产品经理陆续提了这些需求：

| 需求 | 加进去的代码 |
|---|---|
| 借书要判断读者证是否有效 | `if (!reader.CardValid) ...` |
| 有逾期未还的书不能借 | `if (reader.HasOverdue) ...` |
| 每人最多借 5 本 | `if (reader.BorrowedCount >= 5) ...` |
| 押金不足不能借 | `if (reader.Deposit < book.Price) ...` |
| 热门书每人只能借 1 本 | `if (book.IsHot && reader.BorrowedThisBook) ...` |
| 借书要给积分 | `reader.Points += 10;` |
| 借书要发通知 | `_notify.Send(...)` |
| 借书要写审计日志 | `_log.Write(...)` |
| 逾期罚金按天算，节假日不算 | 30 行循环 |

**最后这个 `BorrowBook` 方法变成了 200 行。**

**然后真正的麻烦来了：**

```
问题 1：续借也要判断"有没有逾期"，代码复制一遍 → 两份规则，改一处忘一处
问题 2：App 端借书和后台代借书是两套代码 → 规则第三份
问题 3：想给"借书"写单元测试 → 要 new 一堆依赖 + 连数据库 + 造数据
问题 4：新人问"借书到底有哪些规则" → 没人答得上来，只能读代码
问题 5：某个 if 是谁加的、为什么加 → git blame 挖到三年前
```

**这不是"代码写得丑"，是"业务知识没有落脚点"。** 规则散在 Controller、Service、存储过程、前端校验、需求文档里，**每一处都是一份会过期的副本**。

**DDD 要解决的就是这个问题：让业务规则有一个明确的家。**

## 没有它会怎样

**说个你熟的东西：你的练习项目 `BooksController`。**

**现在它是"事务脚本"（Transaction Script）——一句话定义：**

> **一个方法从头到尾做完一件事，业务规则以 `if` 和 `=` 的形式直接写在流程里。**

**它现在的样子（真实结构）：**

```csharp
[HttpPost("borrow/{id}")]
public async Task<IActionResult> Borrow(long id, long readerId)
{
    var book = await _ctx.Books.FindAsync(id);
    if (book == null) return NotFound();
    if (book.Stock <= 0) return BadRequest("没库存");     // 规则 1
    var reader = await _ctx.Readers.FindAsync(readerId);
    if (reader.BorrowedCount >= 5) return BadRequest("超限"); // 规则 2
    book.Stock--;                                          // 状态变更
    _ctx.BorrowRecords.Add(new BorrowRecord { ... });       // 记录
    await _ctx.SaveChangesAsync();
    return Ok();
}
```

**这段代码有问题吗？在只有 2 条规则时，没有。** 它短、直白、能跑、好调试。

**但它有三个隐患，全部跟"规则"有关：**

| 隐患 | 具体表现 |
|---|---|
| **规则不可复用** | 换个入口（定时任务自动续借）就要再写一遍，两份规则必然分叉 |
| **规则不可测试** | 测"超限能不能借"要准备数据库、Reader 行、Book 行，一个测试 40 行准备工作 |
| **规则不可问答** | 你没法运行 `book.CanBorrow(reader)` 去问"为什么不能借"，只能读代码 |

**DDD 的赌注是：把规则搬进对象里，这三个问题会一起消失。**

```csharp
// 规则搬进来之后
var result = book.TryBorrow(reader);        // 规则的家在这里
if (!result.Ok) return BadRequest(result.Reason);
```

**注意区别不是"代码变短了"，而是"问问题的方式变了"。** 现在你可以问 `book` 自己，而不是问 200 行代码。

## 它在生态里的位置

**这一篇最容易被搞混的地方：DDD 不是一个东西，是两层的十几个东西。**

```
┌─────────────────────────────────────────────────────────────┐
│  战略设计（Strategic Design）—— 决定"切几块、怎么切"          │
│                                                              │
│   通用语言 Ubiquitous Language                               │
│   限界上下文 Bounded Context                                 │
│   子域 Subdomain（核心域/支撑域/通用域）                      │
│   上下文映射 Context Mapping（防腐层、共享内核…）              │
├─────────────────────────────────────────────────────────────┤
│  战术设计（Tactical Design）—— 决定"每块里面怎么写"            │
│                                                              │
│   实体 Entity      值对象 Value Object                       │
│   聚合 Aggregate   聚合根 Aggregate Root                     │
│   领域服务 Domain Service    应用服务 Application Service     │
│   领域事件 Domain Event      仓储 Repository                  │
│   工厂 Factory                                               │
└─────────────────────────────────────────────────────────────┘
```

**本批次（P166–P171）只走完"战略 + 半个战术"：**

| P | 内容 | 属于 |
|---|---|---|
| P166 | 软件架构设计的怪现状 | 认知（为什么要学） |
| P167 | 什么是微服务 | 战略（切分的第一种答案） |
| P168 | 什么是 DDD，应该怎么学 | 全景 |
| P169 | 领域模型 vs 事务脚本 | 战术（两条路选一条） |
| P170 | 通用语言、限界上下文 | **战略（最值钱的两节）** |
| P171 | 实体与值对象 | 战术（第一对概念） |

**剩下的：**

| 批次 | 内容 |
|---|---|
| 21（P172–174） | 聚合与聚合根、领域服务与应用服务、领域事件 |
| 22（P175–180） | 贫血 vs 充血模型、EF Core 里怎么落地、值对象比较 |
| 23（P181–187） | 聚合实现、MediatR、RabbitMQ、集成事件 |
| 24（P188–196） | 洋葱架构、DDD 实战七节、强类型 Id |

**还要说清它和邻居的关系——这四个词经常被当成同义词，其实不是：**

| 名词 | 它是什么 | 和 DDD 的关系 |
|---|---|---|
| **分层架构** | 代码按职责切三层/四层 | 和 DDD 无关，DDD 只是"建议"怎么分层 |
| **微服务** | 部署形态：多个独立进程 | **可以**按限界上下文切，但微服务 ≠ DDD |
| **DDD** | 一套**组织业务复杂度**的方法论 | 本身不规定部署形态 |
| **洋葱/整洁架构** | 依赖方向：外层依赖内层 | DDD 的常见搭配，但不是必须 |

> **一句话：微服务是"怎么部署"，DDD 是"怎么想"，洋葱架构是"依赖往哪指"。三者可以任意组合，也可以互不相干。**

## 对你的实际意义

**说实话：这一篇对你现在手上的两个项目，用处完全不同。**

**① DesktopPet（前后端分离 + 聊天）→ 基本用不上**

理由很直接：**它的业务规则总量不到 20 行。**

```csharp
// 整个"领域"大概就这些
消息长度 <= 500 字
一个会话最多 1000 条
用户不能给自己发消息
```

**为了这 4 条规则上 DDD，你要多写：** 实体基类、值对象 5 个、聚合根 2 个、仓储接口 + 实现、领域事件 + 发布器、应用服务、DTO 映射……**净增 1500 行代码，换来的是"改一条规则要动 6 个文件"。**

**这不是夸张，这是 DDD 在小项目上的标准结局。**

**② 你的独立游戏服务端 → 这是 DDD 真正的主场**

假设你做一个有存档、背包、战斗结算、经济系统的游戏。**这里的业务复杂度是天然的、不可压缩的：**

| 游戏系统 | 为什么它就是"领域" |
|---|---|
| 背包 | "32 格、可堆叠、绑定不可交易、超出上限怎么办"——一堆不变式 |
| 战斗结算 | "伤害 = f(攻击, 防御, 暴击, 抗性, buff)"——一堆算法和规则 |
| 经济 | "金币不能为负、交易要原子、防刷"——一堆一致性约束 |
| 存档 | "存档必须整体成功或整体失败"——**这就是聚合** |

**这些规则的共同点：它们不依赖数据库，也不依赖 HTTP，它们只依赖"游戏世界的规则"。** 这正是"领域模型"的定义——**把不依赖任何技术的业务规则，放进不依赖任何技术的类里。**

**所以这一篇对你真正的价值不是"学会写 DDD"，而是：**

> **当你的游戏规则复杂到 `if` 开始互相打架时，你知道有一条叫 DDD 的路，你知道它长什么样、代价多少、什么时候值得走。**

**这个"知道"，比"会用"重要得多。** 因为你迟早会需要它，但你现在不需要它。

## 什么时候其实用不上

**这一节我写得比前面几篇都狠，因为 DDD 是全行业过度设计最严重的重灾区。**

### 判据一：业务规则总共不到 200 行 → 别用

**数一下你的 `if` 和 `switch`。** 如果全部业务判断加起来（不含参数校验、权限判断）**不到 200 行**，DDD 的收益一定小于成本。

**理由：** DDD 的成本是**固定的**（基类、仓储、映射、分层大约 800~1500 行基础设施），收益是**随业务复杂度线性增长**的。规则少的时候，收益曲线还在成本线下面。

### 判据二：CRUD 占比 > 80% → 别用

**什么叫 CRUD？** 一次请求 = 一次数据库操作，中间没有跨表/跨聚合的规则推理。

| 你的接口 | 是 CRUD 吗 |
|---|---|
| 新增一本书 | ✅ 纯 CRUD |
| 按分类查书 | ✅ 纯 CRUD |
| 改一本书的价格 | ✅ 纯 CRUD（除非有"改价要审批"） |
| 借书（含 8 条规则） | ❌ 这是领域逻辑 |

**如果你的 Controller 里有 8 个纯 CRUD + 1 个带规则的，那 1 个用领域模型写，另外 8 个继续 CRUD。** DDD 从来不要求"全项目统一"。

### 判据三：团队 < 3 人 / 项目 < 1 年 → 谨慎

**DDD 的一大半价值在"沟通"**（通用语言让业务和开发说同一种话）。**一个人写代码，没有沟通成本，这半分价值直接归零。**

**而且：** 一个人维护 DDD 项目，最痛苦的时刻是三个月后回来改需求——你要先花半天回忆"这个聚合为什么这么划"。

### 判据四：你自己说不清"这个系统的核心难点是什么" → 先别用

**核心域（Core Domain）是 DDD 的起点。** 如果答不上"我这个系统最值钱的、最复杂的、最区别于同行的那部分业务是什么"，那你还没有可被 DDD 保护的东西。

> **Vaughn Vernon 的建议原话大意是：把最好的开发人员放在核心域上，其他域能买就买、能抄就抄。**

### 一张"要不要上 DDD"的判定表

| 信号 | 指向 |
|---|---|
| 有明确的、会变的、互相牵连的业务规则 | 可以上 |
| 同一个概念在不同场景含义不同（"商品"对销售 vs 对仓库） | **该上**（限界上下文） |
| 业务专家愿意跟你一起推敲规则 | 值得上（通用语言有对象） |
| 需求以增删改查为主，规则以表单校验为主 | 别上 |
| 只有你一个人，且半年内要跑通 | 别上，先事务脚本 |
| 只是"想学 DDD" | **绝对别在正式项目里学**，拿玩具项目练 |

---

==一：概念==

## P166 · 1. 软件架构设计的怪现状

### 这一节要解决的问题

**为什么"架构"这个词，在中文技术圈听起来既高级又可疑？**

### 怪现状清单（每一条你都会遇到）

| 怪现状 | 具体长什么样 | 后果 |
|---|---|---|
| **名词轰炸** | DDD / CQRS / Event Sourcing / 六边形 / 洋葱 / 整洁 / 微服务 / 中台 / Serverless | 名词成了谈判筹码，不是工具 |
| **简历驱动开发** | 选型理由是"简历上想写 Kafka" | 团队被迫维护不熟的技术 |
| **为分层而分层** | 每个项目必有的 `IDAL` / `IBLL` / `DAL` / `BLL` 四件套 | 接口只有一个实现，纯转发 |
| **空壳接口** | `IBookService` → `BookService`（唯一实现，永远不换） | 多 200 行，零收益 |
| **博客驱动架构** | 看了篇《我用 DDD 重构了 3 万行代码》，明天就重构 | 重构到一半，需求压过来了 |
| **规模幻觉** | 日活 100 的系统设计成日活 100 万 | 复杂度指数上升，收益为零 |
| **架构评审表演** | 画一堆方框箭头，没人能说清数据怎么流 | 文档和代码两张皮 |

### 那个经典的"四件套"为什么是错的

**你一定见过这种代码：**

```csharp
// 1. 接口层
public interface IBookDAL
{
    Book GetById(long id);
    void Add(Book book);
}

// 2. 实现层（唯一实现，永远不会换）
public class BookDAL : IBookDAL
{
    public Book GetById(long id) => _ctx.Books.Find(id);   // 一行转发
    public void Add(Book book) => _ctx.Books.Add(book);    // 一行转发
}

// 3. 业务层接口
public interface IBookBLL { Book Get(long id); }

// 4. 业务层实现（又是一行转发）
public class BookBLL : IBookBLL
{
    public Book Get(long id) => _dal.GetById(id);          // 一行转发
}
```

**它宣称的好处 vs 实际情况：**

| 宣称 | 实际 |
|---|---|
| "以后换数据库只改 DAL" | 换数据库要改的是 SQL、类型映射、事务，不是接口 |
| "便于单元测试" | 要 mock 的是一行转发，测了等于没测 |
| "分层清晰" | 变成"改了要动 4 个文件" |
| "多人协作不冲突" | 每个人都在改同一批空壳文件 |

**判断一个抽象该不该存在的标准只有一条：**

> **如果这个接口永远只会有一个实现，而且实现里没有任何"决策"，那它就是噪音。**

**例外（真的需要接口的场景）：**

| 场景 | 为什么需要 |
|---|---|
| 有多个真实实现（SqlServer / Sqlite / 内存版） | 多态有意义 |
| 需要替换外部依赖（支付、短信、对象存储） | 测试要假实现，生产要真实现 |
| 跨进程（RPC / 消息队列） | 接口是契约 |
| 框架要求（`IEmailSender` 之类） | 生态约定 |

### 这一节真正的结论

> **架构不是"加了什么"，是"为了应对某种变化，你愿意提前付出多少代价"。**
>
> **没有变化，就没有架构；只有复杂度。**

**所以每次想加一层，先问三句话：**

1. **它应对的变化，半年内会发生吗？** （不会 → 别加）
2. **不加，最坏结果是什么？** （能忍 → 别加）
3. **加了，删除它要多久？** （超过 1 小时 → 说明它已经扎根了，慎重）

### 我的补充：这个"怪现状"和 DDD 的关系

**有点讽刺：DDD 本身是这个怪现状的最大受害者。**

它被当成"高级架构"贴到一堆 CRUD 项目上，然后死掉，然后被人骂"DDD 没用"。

**DDD 原文（Eric Evans, 2003）说的是：**

> **DDD 是用来对付"领域复杂度"的。如果领域不复杂，DDD 是有害的。**

**这句话在中文技术圈几乎从不被引用。**

---

## P167 · 2. 什么是微服务

### 这一节要解决的问题

**"把单体拆成微服务"——什么时候是解药，什么时候是毒药？**

### 先看两个东西的准确区别

| 维度 | 单体（Monolith） | 微服务（Microservices） |
|---|---|---|
| 部署单元 | 1 个进程 | N 个进程 |
| 数据库 | 通常 1 个库 | **每个服务一个库**（关键） |
| 调用方式 | 方法调用（纳秒级） | HTTP / 消息队列（毫秒级，可能失败） |
| 事务 | 本地事务（ACID，免费） | 分布式事务（Saga / 最终一致，自己写） |
| 改一个功能 | 改完一起部署 | 可能动 3 个服务，协调 3 次发布 |
| 扩容 | 整体扩容 | 只扩热点服务 |
| 故障 | 一处崩全崩 | 一处崩可能只崩一块（也可能雪崩） |
| 排查问题 | 一个调用栈 | 跨 5 个进程的分布式追踪 |

**注意第二行：微服务的定义性特征是"独立的数据所有权"，不是"独立部署"。** 只把代码拆成多个项目但共用一个库，那叫"分布式单体"——**两边的坏处都占了。**

### 微服务真正解决什么

**只有三件事：**

| 解决 | 说明 |
|---|---|
| **独立扩容** | 秒杀时只扩订单服务，不扩用户服务 |
| **独立发布** | 支付团队一天发 10 次，不影响商品团队 |
| **故障隔离** | 评论服务挂了，下单还能走（前提：做了降级） |

**它不解决：**

- ❌ 代码乱（拆开还是乱，只是乱在 5 个仓库里）
- ❌ 需求变更快（拆开变更成本更高）
- ❌ 团队效率低（沟通问题不是技术问题）
- ❌ 性能问题（跨进程调用只会更慢）

### "我们团队小，能不能上微服务"

**反了。微服务的前提是团队足够大。**

**康威定律（Conway's Law, 1968）：**

> **系统的架构，会不可避免地反映出组织的沟通结构。**

**翻译成实操：**

```
你有 3 个人
   ↓
拆成 5 个微服务
   ↓
每个人要负责 1.6 个服务的开发 + 部署 + 监控 + 值班
   ↓
没人有时间写业务
   ↓
系统退化成一堆没人维护的服务
```

**行业经验值（不是定律，但很接近）：**

| 团队规模 | 建议 |
|---|---|
| 1–5 人 | **单体**，模块化清晰就行 |
| 5–15 人 | 单体 + 按模块分包，考虑"模块化单体" |
| 15–50 人 | 可以开始按边界拆 2–3 个服务 |
| 50+ 人 | 微服务有讨论价值 |

**判断标准不是人数，是"有没有独立的发布节奏需求"。** 如果一个团队一天发一次，另一个团队一周发一次，互相阻塞——**这才是拆的理由。**

### 如果想拆，按什么维度拆

**这是本批次和 DDD 的连接点：**

| 拆法 | 结果 |
|---|---|
| 按技术层拆（Controller 服务 / Service 服务 / DAO 服务） | ❌ 灾难，每次需求改三层 |
| 按表拆（Book 表一个服务 / Author 表一个服务） | ❌ 灾难，一次查询要跨 3 个服务 |
| **按业务能力拆**（借阅服务 / 采购服务 / 会员服务） | ✅ 可行 |
| **按限界上下文拆**（DDD 的答案） | ✅ 最稳 |

> **DDD 的限界上下文（P170）回答的是"边界在哪"，微服务回答的是"边界要不要变成进程"。前者是思考，后者是部署。**

### 我的补充：给你的游戏的现实建议

**如果你要做联机游戏，起步一定是："一个游戏服 + 一个 Web 后端 + 一个数据库"。**

**哪怕在线人数涨了，第一选择也不是微服务，而是：**

```
1. 加缓存（Redis）
2. 读请求加从库
3. 按"区/服"水平分片（天然隔离，业务无感）
4. 拆出最热的独立模块（比如战斗结算、匹配）
5. 最后才考虑微服务化
```

**游戏行业拆分的天然单位是"区服"，不是"微服务"。** 因为玩家之间数据天然隔离，这比任何架构设计都有效。

---

## P168 · 3. 什么是 DDD，应该怎么学

### 这一节要解决的问题

**DDD 到底是什么？为什么那么多人学了没用？**

### 一句话定义

> **DDD（Domain-Driven Design，领域驱动设计）是一套"把复杂的业务知识，用代码精确表达出来"的方法论。**

**三个关键词逐个拆：**

| 词 | 含义 | 反例 |
|---|---|---|
| **领域（Domain）** | 你这个软件要解决的那块现实问题 | "电商"是领域，"订单"是领域里的概念 |
| **驱动（Driven）** | 代码结构由领域模型决定，不由数据库表决定 | 反例：先建表，再照着表写类 |
| **设计（Design）** | 它是一套设计决策的方法，不是一个框架 | 反例：装了 `MediatR` 就以为用了 DDD |

**它明确不是什么：**

- ❌ 不是一个 NuGet 包
- ❌ 不是"四层架构"
- ❌ 不是必须配 CQRS / Event Sourcing / MediatR
- ❌ 不是"必须充血模型"（贫血也能算 DDD 的一种妥协）
- ❌ 不是微服务的前置条件

### 它的来源

| 时间 | 事件 |
|---|---|
| 2003 | Eric Evans 出版《Domain-Driven Design: Tackling Complexity in the Heart of Software》（"蓝皮书"） |
| 2013 | Vaughn Vernon 出版《Implementing Domain-Driven Design》（"红皮书"，偏落地） |
| 2014 | Martin Fowler & James Lewis 发表微服务文章，DDD 被拉去当拆微服务的理论依据 |
| 2015+ | CQRS / Event Sourcing / 事件风暴（Event Storming）流行，DDD 被越绑越重 |

> **注意：DDD 比微服务早 11 年。** 现在很多人以为"DDD 是为微服务服务的"，完全颠倒。

### 学习顺序（这一节最重要的部分）

**绝大多数人学 DDD 的顺序是错的：**

```
❌ 错误顺序
   看到"CQRS + MediatR + 事件溯源"的博客
        ↓
   照着搭一个"DDD 项目模板"
        ↓
   项目里出现 AggregateRoot、DomainEvent、Repository、UnitOfWork
        ↓
   但业务规则还是写在 Service 里
        ↓
   结论："DDD 就是一堆没用的抽象"
```

```
✅ 正确顺序
   1. 通用语言（P170）—— 先能跟业务说同一种话
        ↓
   2. 限界上下文（P170）—— 先能把系统切成不打架的几块
        ↓
   3. 领域模型 vs 事务脚本（P169）—— 先能判断这块该不该建模型
        ↓
   4. 实体与值对象（P171）—— 先能分清"有身份"和"没身份"
        ↓
   5. 聚合（P172）—— 先能找到"一致性边界"
        ↓
   6. 领域服务 / 应用服务（P173）—— 再谈职责划分
        ↓
   7. 领域事件（P174+）—— 最后才谈解耦
        ↓
   8. 基础设施（仓储、工作单元）—— 最后才写代码
```

**为什么顺序必须这样：**

| 跳步 | 后果 |
|---|---|
| 跳过 1、2 直接学战术 | 你会在一堆错误的边界上建正确的模型 → 全废 |
| 跳过 3 直接建模型 | 你会给 CRUD 建模型 → 过度设计 |
| 跳过 5 直接写仓储 | 你的"聚合"其实是一个随机分组的实体集合 → 事务边界乱 |

> **DDD 的失败，90% 败在战略（1–2），不是战术（3–7）。**

### 战略 vs 战术，一句话区分

| | 战略设计 | 战术设计 |
|---|---|---|
| 回答 | **切成几块？边界在哪？** | **每块里面怎么组织代码？** |
| 产物 | 上下文地图、通用语言表 | 实体、值对象、聚合、事件 |
| 出错代价 | **极高**（整个系统结构错） | 中（局部重构可救） |
| 谁参与 | 业务专家 + 架构师 | 开发 |
| 本批次覆盖 | P167、P170 | P169、P171 |

### 我的补充：怎么"练"DDD

**唯一有效的练法：找一个你熟到不用想的业务，用两种写法各写一遍，然后对比。**

**推荐的练习对象（复杂度刚好）：**

| 练习对象 | 为什么合适 |
|---|---|
| 图书馆借阅 | 规则多、不变式清晰（库存不能负、超限不能借） |
| 会议室预订 | 时间冲突检测是天然的领域规则 |
| 电商下单 | 库存、优惠、运费互相牵连 |
| **游戏背包** | 堆叠、上限、绑定、消耗——你自己最有热情 |

**不要用"用户注册登录"练。** 那个领域太薄，练不出东西。

---

## P169 · 4. 领域模型 vs 事务脚本

### 这一节要解决的问题

**同一个"借书"需求，两种写法，差在哪？什么时候用哪个？**

### 两种模式的定义（来自 Martin Fowler《企业应用架构模式》）

| 模式 | 定义 | 代码形态 |
|---|---|---|
| **事务脚本**（Transaction Script） | 一个过程处理一个请求，业务逻辑写在过程里 | 一个方法从头做到尾 |
| **领域模型**（Domain Model） | 把业务规则放进对象，对象自己保护自己的状态 | 对象有行为，服务只做编排 |

**还有第三种（Fowler 也列了），但本课程把重点放在前两种：**

| 模式 | 说明 |
|---|---|
| **表模块**（Table Module） | 一个类对应一张表，方法处理整批行（DataSet 时代的产物，今天少见） |

### 代码对照：同一个"借书"

**先看需求（就是这 4 条）：**

1. 库存为 0 不能借
2. 每人最多借 5 本
3. 有逾期不能借
4. 借成功 → 库存 -1，借阅数 +1

#### 写法 A：事务脚本（你现在的写法）

```csharp
public class BorrowService
{
    private readonly BookContext _ctx;
    public BorrowService(BookContext ctx) => _ctx = ctx;

    public async Task<(bool ok, string? msg)> BorrowAsync(long bookId, long readerId)
    {
        // ① 取数据
        var book = await _ctx.Books.FindAsync(bookId);
        if (book == null) return (false, "书不存在");

        var reader = await _ctx.Readers.FindAsync(readerId);
        if (reader == null) return (false, "读者不存在");

        // ② 规则判断（全在这里）
        if (book.Stock <= 0) return (false, "没有库存");
        if (reader.BorrowedCount >= 5) return (false, "超过借阅上限");
        if (reader.HasOverdue) return (false, "有逾期未还");

        // ③ 状态变更
        book.Stock--;
        reader.BorrowedCount++;

        // ④ 持久化
        _ctx.BorrowRecords.Add(new BorrowRecord
        {
            BookId = bookId, ReaderId = readerId, BorrowTime = DateTime.Now
        });
        await _ctx.SaveChangesAsync();
        return (true, null);
    }
}
```

**它的特征：**

| 特征 | 说明 |
|---|---|
| 数据是"裸的" | `Book` 只有属性，`Stock--` 谁都能写 |
| 规则住在 Service | Service 是唯一知道规则的地方 |
| 规则顺序敏感 | 判断顺序不同，错误提示不同 |
| 不可复用 | 换个入口（自动续借）要复制 ② 段 |

#### 写法 B：领域模型

**第一步：让 `Book` 自己管库存**

```csharp
public class Book
{
    public long Id { get; private set; }          // 私有 set：外部不能乱改 Id
    public string Title { get; private set; } = "";
    public int Stock { get; private set; }         // 私有 set：库存只能通过方法改
    public bool IsHot { get; private set; }

    private Book() { }                             // 给 EF Core 用的无参构造

    public Book(string title, int stock)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("书名不能为空");
        if (stock < 0) throw new ArgumentException("库存不能为负");
        Title = title;
        Stock = stock;
    }

    // 领域行为：自己判断能不能借，自己改自己的库存
    public BorrowResult TryBorrow(Reader reader)
    {
        if (Stock <= 0) return BorrowResult.Fail("没有库存");
        if (reader.BorrowedCount >= 5) return BorrowResult.Fail("超过借阅上限");
        if (reader.HasOverdue) return BorrowResult.Fail("有逾期未还");

        Stock--;                                   // 只有这里能减
        return BorrowResult.Success();
    }

    public void Return() => Stock++;                // 还书也只能通过方法
}
```

**第二步：让 `Reader` 自己管借阅数**

```csharp
public class Reader
{
    public long Id { get; private set; }
    public string Name { get; private set; } = "";
    public int BorrowedCount { get; private set; }
    public bool HasOverdue { get; private set; }

    private Reader() { }

    public bool CanBorrowMore => BorrowedCount < 5 && !HasOverdue;

    public void RecordBorrow()
    {
        if (!CanBorrowMore) throw new InvalidOperationException("当前不能借书");
        BorrowedCount++;
    }
}
```

**第三步：Service 只剩"编排"，没有"规则"**

```csharp
public class BorrowAppService                    // 注意：叫 AppService 了
{
    private readonly BookContext _ctx;
    public BorrowAppService(BookContext ctx) => _ctx = ctx;

    public async Task<(bool ok, string? msg)> BorrowAsync(long bookId, long readerId)
    {
        var book = await _ctx.Books.FindAsync(bookId);
        if (book == null) return (false, "书不存在");
        var reader = await _ctx.Readers.FindAsync(readerId);
        if (reader == null) return (false, "读者不存在");

        // 规则调用，不是规则实现
        var result = book.TryBorrow(reader);
        if (!result.Ok) return (false, result.Reason);

        reader.RecordBorrow();

        _ctx.BorrowRecords.Add(new BorrowRecord
        {
            BookId = bookId, ReaderId = readerId, BorrowTime = DateTime.Now
        });
        await _ctx.SaveChangesAsync();
        return (true, null);
    }
}
```

**第四步：结果对象（别用 `bool` + `out string`）**

```csharp
public record BorrowResult(bool Ok, string? Reason)
{
    public static BorrowResult Success() => new(true, null);
    public static BorrowResult Fail(string reason) => new(false, reason);
}
```

### 两种写法逐项对比

| 维度 | 事务脚本（A） | 领域模型（B） |
|---|---|---|
| 代码行数（首次） | **少**（40 行） | 多（120 行） |
| 代码行数（加第 9 条规则） | +3 行，但只在一个入口 | +3 行，**所有入口自动生效** |
| 规则可复用 | ❌ 每个入口复制 | ✅ 调 `book.TryBorrow()` |
| 规则可单元测试 | ❌ 要建库、造数据 | ✅ `new Book("x", 0).TryBorrow(r)` 一行 |
| 规则可被提问 | ❌ 读代码 | ✅ `book.CanBorrow(reader)` |
| 防止非法状态 | ❌ `book.Stock = -5` 合法 | ✅ 编译不过（私有 set） |
| 上手成本 | 低 | 中（要理解"行为在哪"） |
| 适合 | 规则 < 200 行、CRUD 为主 | 规则多、会变、互相牵连 |

### 第三个选项：贫血模型（现实中最常见）

**这是绝大多数"号称 DDD"的项目的真实状态：**

```csharp
// 实体只有属性（贫血）
public class Book
{
    public long Id { get; set; }
    public int Stock { get; set; }        // 公开 set，谁都能改
}

// 规则还是在 Service 里（充血的是 Service，不是实体）
public class BookService
{
    public void Borrow(Book book, Reader reader)
    {
        if (book.Stock <= 0) throw new Exception("没库存");
        book.Stock--;
    }
}
```

| | 贫血模型 |
|---|---|
| 是什么 | 实体 = 数据容器；规则集中在 Service |
| 算 DDD 吗 | **算"妥协版"**，Fowler 明确说过它是"反模式"，但工业界大量在用 |
| 优点 | 上手快、和 EF Core/ORM 配合最顺、团队都好懂 |
| 缺点 | 规则不跟着数据走，还是"知识散落" |
| 什么时候选 | 规则中等复杂、团队不熟 DDD、要快速交付 |

> **本课程后面（P175–P180）会专门讲"贫血 vs 充血"，以及充血模型在 EF Core 里怎么落地。这里先建立一个坐标：事务脚本 → 贫血模型 → 充血模型，是一个连续光谱，不是非黑即白。**

### 怎么选：一张判据表

| 问题 | 答"是"就往右偏 |
|---|---|
| 这块业务的规则超过 10 条吗？ | 领域模型 |
| 规则会经常变吗？ | 领域模型 |
| 同一套规则有 2 个以上入口吗？ | 领域模型 |
| 有"状态不能进入某组合"的约束吗？（不变式） | 领域模型 |
| 主要是表单校验 + 单表读写吗？ | 事务脚本 |
| 这个模块三个月后大概率没人动吗？ | 事务脚本 |
| 团队里没人写过领域模型吗？ | 事务脚本，先跑通 |

---

## P170 · 5. 通用语言、限界上下文

> **这一节是整个 DDD 最值钱的部分。如果只能记住一篇，记这一篇。**

### 这一节要解决的问题

**为什么同一个词，销售说一套、仓库说一套、财务说一套，最后代码里全糊成一坨？**

### 通用语言（Ubiquitous Language）

**定义：**

> **在一个限界上下文内，业务人员、产品、开发、测试、代码、数据库字段、接口文档，全部使用同一套词汇。这套词汇就叫通用语言。**

**关键词是"同一套"。** 不是"我们能沟通"，是"我们说的每个词，在代码里都有对应的东西"。

#### 反面案例：一个真实的词义混乱

**需求文档写："商品下架后，用户不能再下单。"**

**问四个角色"下架"是什么意思：**

| 角色 | 他理解的"下架" |
|---|---|
| 运营 | 前台不展示了 |
| 仓库 | 不再发货了，但库存还在 |
| 财务 | 不再结算了 |
| 开发 | `Product.Status = 0` |

**结果代码里长这样：**

```csharp
public class Product
{
    public int Status { get; set; }        // 0=下架 1=上架 2=待审核 3=已删除？？
    public bool IsVisible { get; set; }    // 这跟 Status 什么关系？
    public bool CanSell { get; set; }      // 又是另一个开关？
    public bool IsDeleted { get; set; }    // 软删除还是硬删除？
}
```

**四个字段描述"一个东西是不是还在卖"，而且互相矛盾。** 这就是没有通用语言的代价。

#### 正确做法：把词定死，并写进代码

**先列表：**

| 词 | 精确定义 | 代码里的名字 |
|---|---|---|
| **上架** | 前台可见 且 可下单 且 可发货 | `Product.Publish()` |
| **下架** | 前台不可见，**已有订单继续履行** | `Product.Unpublish()` |
| **停售** | 前台可见但不可下单（"暂时缺货"） | `Product.SuspendSales()` |
| **删除** | 软删除，不可恢复下单，可查历史 | `Product.Archive()` |

**再写代码——** 注意方法名就是业务词，**不需要注释解释**：

```csharp
public class Product
{
    public ProductStatus Status { get; private set; }

    public void Publish()        => Status = ProductStatus.OnSale;
    public void Unpublish()      => Status = ProductStatus.OffShelf;
    public void SuspendSales()   => Status = ProductStatus.Suspended;
    public void Archive()        => Status = ProductStatus.Archived;

    public bool CanOrder => Status == ProductStatus.OnSale;
    public bool CanShip  => Status is ProductStatus.OnSale or ProductStatus.Suspended;
}
```

**这时候"商品下架后用户不能再下单"这条需求，可以直接翻译成测试：**

```csharp
var p = new Product();
p.Unpublish();
Assert.False(p.CanOrder);    // 需求 → 代码，一一对应
```

> **通用语言的检验标准：把代码念给业务听，他能点头。** 如果代码里是 `Status = 3`，他点不了头。

#### 通用语言的落地清单

| 载体 | 要做的事 |
|---|---|
| 代码 | 类名/方法名/属性名用业务词，不用 `Flag`/`Type`/`Status1` |
| 数据库 | 表名列名用业务词（`OffShelfTime` 而不是 `UpdTime2`） |
| 接口 | `POST /products/{id}/unpublish` 而不是 `POST /products/{id}/updateStatus?status=0` |
| 文档 | 维护一张术语表，新增词必须进表 |
| 沟通 | 开会时禁止用"那个""之前那个字段" |

### 限界上下文（Bounded Context）

**定义：**

> **一个词有明确含义的边界。在边界内，这个词只有一个意思；出了边界，含义可以完全不同。**

**这不是理论，这是现实。** 同一个"商品"，在不同上下文里是完全不同的东西：

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│   销售上下文          │   │   仓储上下文          │   │   财务上下文          │
│                      │   │                      │   │                      │
│  商品 = 标题+图片+价格 │   │  商品 = SKU+体积+重量 │   │  商品 = 税率+成本价   │
│        +描述+促销      │   │        +库位+批次     │   │        +科目          │
│                      │   │                      │   │                      │
│  关注：能不能卖、卖多少 │   │  关注：放哪、怎么拣    │   │  关注：怎么算税、怎么摊 │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
        ↑                          ↑                          ↑
        └──────── 同一个"商品"，三个完全不同的模型 ────────────┘
```

**如果你硬要建一个"大商品表"装下所有字段：**

| 后果 | 具体表现 |
|---|---|
| 表有 80 个字段 | 一半永远是 NULL |
| 每次改需求都动同一张表 | 三个团队抢同一个文件，天天冲突 |
| 字段含义靠注释 | `Price` 是销售价还是成本价？ |
| 谁都不敢删字段 | 怕影响别人，只增不减 |

**这就是"大泥球"（Big Ball of Mud）的形成过程。**

### 怎么找边界：三个实操信号

| 信号 | 说明 | 例子 |
|---|---|---|
| **同一个词有两种意思** | 最强烈的信号 | "订单"在销售里是"客户订单"，在仓储里是"出库单" |
| **两拨人很少说话** | 组织边界 ≈ 上下文边界（康威定律反过来用） | 客服团队不懂结算规则 |
| **两边的数据几乎不需要强一致** | 可以最终一致 → 可以拆 | 商品下架后，仓库晚 5 分钟知道没事 |

### 上下文映射（Context Mapping）

**边界画出来之后，还要说清"它们之间怎么打交道"。** DDD 给了几种标准关系：

| 关系 | 含义 | 代码形态 |
|---|---|---|
| **共享内核**（Shared Kernel） | 两个上下文共用一小块模型 | 一个公共类库（**慎用**，改一处影响两边） |
| **客户-供应商**（Customer-Supplier） | 下游依赖上游，上游要考虑下游需求 | 上游提供 API，下游提需求 |
| **防腐层**（Anticorruption Layer, ACL） | 下游自己写一层转换，隔离上游模型 | `OrderAdapter` 把外部 DTO 转成本地实体 |
| **遵奉者**（Conformist） | 下游直接照抄上游模型 | 直接用上游的 DTO（**省事但会被绑死**） |
| **开放主机服务**（Open Host Service） | 上游提供稳定的公开 API | REST / gRPC |
| **发布语言**（Published Language） | 用共享的、文档化的格式通信 | JSON Schema / Protobuf |

**最常用的是防腐蚀层**，因为它能挡住"上游改字段，下游全崩"。

### 防腐层的代码长什么样

**场景：你的电商系统要调用外部物流公司的 API，返回的字段是 `{"st":"SIGNED","ts":1699999999,"sid":"SF123"}`。**

**❌ 直接扩散（没防腐层）：**

```csharp
// 你的业务代码里到处都是外部字段
if (resp.st == "SIGNED") { ... }
var time = DateTimeOffset.FromUnixTimeSeconds(resp.ts);
```

**外部一改字段名（`st` → `status`），你全项目搜索替换。**

**✅ 有防腐层：**

```csharp
// 1. 外部模型只在最外层出现
public class SfExpressResponse
{
    public string st { get; set; } = "";
    public long ts { get; set; }
    public string sid { get; set; } = "";
}

// 2. 转换成你自己的领域语言
public static class SfExpressAdapter
{
    public static DeliveryStatus ToDomain(SfExpressResponse r) => r.st switch
    {
        "SIGNED"  => DeliveryStatus.Signed,
        "INTRANS" => DeliveryStatus.InTransit,
        "REJECT"  => DeliveryStatus.Rejected,
        _         => DeliveryStatus.Unknown
    };
}

// 3. 业务代码只说自己的话
var status = SfExpressAdapter.ToDomain(resp);
if (status == DeliveryStatus.Signed) { ... }
```

**外部改字段，只改 Adapter 一个文件。**

### 我的补充：这一节对个人项目意味着什么

**你可能觉得"限界上下文"是几十人团队才需要的东西。其实不是——它对你一个人也有两个立刻可用的价值：**

**① 帮你决定"要不要拆成两个项目"**

**判据：如果两个模块之间，"同一个词"有两种意思，就该拆成两个命名空间（或两个项目）。**

比如你的游戏：

```
Game.Combat      战斗上下文：Character 有 Attack/Defense/HP
Game.Inventory   背包上下文：Character 只有 Id 和 Capacity
```

**两个上下文里的 `Character` 是两个类，不是同一个。** 这在一开始看着"重复"，但它避免了你三个月后加一个 `if (inCombat) 不能用背包` 的补丁。

**② 帮你判断"这个需求到底属于哪个模块"**

**接到需求先问："它说的是哪个上下文里的词？"**

- "玩家攻击力提升 10%" → 战斗上下文
- "玩家背包容量提升 10%" → 背包上下文
- "玩家战斗力提升 10%" → **这个词不属于任何上下文，是产品发明的** → 先定义清楚

> **最后这条很实用：你会发现很多需求歧义，本质是"用了不存在的通用语言"。**

---

## P171 · 6. 实体与值对象

### 这一节要解决的问题

**一个对象，怎么判断它"是同一个东西"还是"只是长得一样"？**

### 两个定义

| 概念 | 英文 | 判断依据 | 例子 |
|---|---|---|---|
| **实体** | Entity | **有身份标识（Id）**，即使所有属性都变了，还是同一个 | 用户、订单、书、玩家角色 |
| **值对象** | Value Object | **没有身份**，只由属性值定义；值相等就是相等 | 金额、地址、日期区间、颜色、坐标 |

### 一句话判据

> **问："如果它的所有属性都改成别的值，它还是不是原来那个东西？"**
>
> - **是** → 实体（身份证号没变，人还是那个人）
> - **不是** → 值对象（这个 100 元和那个 100 元，没有区别）

### 逐项对比

| 维度 | 实体 Entity | 值对象 Value Object |
|---|---|---|
| 身份 | 有 Id，Id 决定"是不是同一个" | 无 Id，属性值决定相等 |
| 可变性 | 可变（状态会演化） | **应当不可变**（改就是造新的） |
| 相等判断 | 比 Id | 比所有属性 |
| 生命周期 | 长，有状态轨迹 | 短，随用随建 |
| 数据库 | 一张表一行，有主键 | 通常摊平成列，无独立主键 |
| 例子 | `User`、`Order`、`Book` | `Money`、`Address`、`DateRange`、`PhoneNumber` |

### 代码：值对象为什么必须"按值相等"

**这是这一节最容易做错的地方。** 看两段代码：

```csharp
// ❌ 用 class 当值对象（默认引用相等）
public class Money
{
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "";
}

var a = new Money { Amount = 99m, Currency = "CNY" };
var b = new Money { Amount = 99m, Currency = "CNY" };
Console.WriteLine(a == b);        // False ← 灾难
```

**后果：**

```csharp
if (order.Price == expectedPrice) { ... }     // 永远不成立
var set = new HashSet<Money>();               // 永远塞得进重复项
if (order1.Price.Equals(order2.Price)) { }    // 永远 False
```

**正确写法（C# 9+ 用 `record`）：**

```csharp
public record Money(decimal Amount, string Currency);

var a = new Money(99m, "CNY");
var b = new Money(99m, "CNY");
Console.WriteLine(a == b);        // True ← record 自动实现按值相等
```

### 实测：三种"相等"行为对比

**我在 `D:\tmp\DddTest` 里跑出来的真实输出：**

```
=== 实测 1：值对象为什么必须按值相等 ===
record Money(99,CNY) == record Money(99,CNY)  -> True
Equals -> True   GetHashCode 相同 -> True
class  MoneyClass(99,CNY) == class  MoneyClass(99,CNY) -> False
class  Equals(默认实现) -> False
m1 = 99.0 CNY, m3 = 100 CNY    （m1 没变，这是不可变）
```

| 结论 | 说明 |
|---|---|
| `record` 的 `==` 是**逐属性比较** | 编译器自动生成 `Equals` / `GetHashCode` / `==` / `!=` |
| `class` 的 `==` 是**引用比较** | 两个内容一样的对象也不相等 |
| `record` 的 `with` 造的是**新对象** | `m1` 一点没变 → 天然不可变 |

### 实测：值对象就地改属性会怎样

**这一步很关键，因为它解释了"为什么值对象必须不可变"。**

**先看编译器怎么拦你：**

```csharp
var o = new Order { ... };
o.Price.Amount = 999m;
// error CS8852: 只能在对象初始值设定项中或在实例构造函数或 "init" 访问器中的
//               "this" 或 "base" 上分配 init-only 属性或索引器 "Money.Amount"。
```

**`record` 生成的是 `init` 属性，** 只有构造时能赋值 → **编译器直接拦住"就地改写"。**

**如果硬要用可变 `class` 写值对象，EF Core 会怎么表现？实测：**

```
=== 实测 4：可变值对象被就地改写，EF 能否感知 ===
  [ChangeTracker 里所有条目]
    MoneyMut     State=Modified
    MutOrder     State=Unchanged
  只看 owner：Unchanged
读回来：#1 的金额 = 999.0（999 说明就地改也能被检测）
```

| 现象 | 解释 |
|---|---|
| owned 条目是 `Modified` | EF 逐个属性比对快照，发现了差异 |
| **owner 条目却是 `Unchanged`** | 聚合根自己的标量属性没变 |
| 最终存成功了 | EF 提交时不看 owner 状态，看所有条目的状态 |

> **可操作结论：想判断"这个实体的值对象有没有被改"，不能只看 `Entries<Order>().State`，要看具体 owned 条目的状态。** 这个坑在 P176–P178 会详细讲原理。

### 实测：EF Core 怎么存值对象

**配置（`OwnsOne`）：**

```csharp
b.Entity<Order>(e =>
{
    e.ToTable("Orders");
    e.OwnsOne(x => x.Price, p =>
    {
        p.Property(m => m.Amount).HasColumnName("Price_Amount");
        p.Property(m => m.Currency).HasColumnName("Price_Currency");
    });
});
```

**实测出来的真实列（SQLite `pragma_table_info`）：**

```
=== 实测 2：OwnsOne 把值对象摊平成列 ===
[建表 SQL 里的列]
  Id
  Buyer
  Price_Amount
  Price_Currency
```

| 结论 | 说明 |
|---|---|
| 值对象**没有自己的表** | 摊平成 owner 的列 |
| 列名默认是 `导航属性_属性名` | `Price` + `Amount` → `Price_Amount` |
| 值对象**不需要主键** | 它没有身份 |

### 实测：两个实体共享同一个值对象实例 → 报错

**这一条是新踩的坑，值得单独记住：**

```csharp
var shared = new Money(50m, "CNY");
db.Orders.Add(new Order { Id = 1, Buyer = "张三", Price = shared });
db.Orders.Add(new Order { Id = 2, Buyer = "李四", Price = shared });   // 同一个对象实例！
db.SaveChanges();
```

**实测输出：**

```
3a 共享同一实例 -> 抛 DbUpdateException：SQLite Error 19: 'NOT NULL constraint failed: Orders.Price_Amount'.
3b 各自独立实例（内容相等）-> 存成功
  #1 张三 50.0 CNY
  #2 李四 50.0 CNY
两行的金额相等吗：True（值对象按值比较，相等就是相等）
```

| 结论 | 说明 |
|---|---|
| **值对象可以"值相等"，但不要"对象同一"** | 两个 owner 不能共享同一个 owned 实例 |
| 报错是 SQLite 层的 `NOT NULL` | EF 只给其中一个 owner 填了列值，另一个是 NULL |
| 正确做法 | 每个 owner `new` 一个（内容相等没关系） |

> **这就是"值对象没有身份，但在 EF 的对象图里它仍然是一个实例"的矛盾。** 概念上可以共享，实现上不行。

### 值对象的三种 C# 写法

| 写法 | 代码 | 优点 | 缺点 |
|---|---|---|---|
| **`record`** | `public record Money(decimal Amount, string Currency);` | 自动值相等、自动 `with`、最省事 | 参数名即属性名，不能加校验逻辑（除非写构造函数体） |
| **`record struct`** | `public readonly record struct Money(decimal A, string C);` | 栈上分配，无 GC 压力 | 字段多时不划算；有默认值陷阱 |
| **只读 `class`** | 见下面 | 能自由控制相等和校验 | 要手写 `Equals`/`GetHashCode`/`operator ==` |

**带校验的 `record`（推荐写法）：**

```csharp
public record Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency)
    {
        if (string.IsNullOrWhiteSpace(currency)) throw new ArgumentException("币种不能为空");
        if (currency.Length != 3) throw new ArgumentException("币种必须是 3 位");
        Amount = amount;
        Currency = currency.ToUpperInvariant();
    }

    public Money Add(Money other)
    {
        if (other.Currency != Currency) throw new InvalidOperationException("币种不同不能相加");
        return this with { Amount = Amount + other.Amount };
    }

    public static Money Zero(string currency) => new(0m, currency);
}
```

**注意：** 手写构造函数的 `record`，`==` 和 `GetHashCode` **仍然由编译器生成**（按属性比较），校验只管构造时。

### 实体：`private set` 是"充血"的第一步

**贫血实体（你现在的写法）：**

```csharp
public class Book
{
    public long Id { get; set; }
    public int Stock { get; set; }        // 谁都能 book.Stock = -100
}
```

**领域实体：**

```csharp
public class Book
{
    public long Id { get; private set; }
    public int Stock { get; private set; }

    private Book() { }                    // 【必须】EF Core 需要无参构造

    public Book(string title, int stock)
    {
        if (stock < 0) throw new ArgumentException("库存不能为负");
        Title = title;
        Stock = stock;
    }

    public void Borrow(int count = 1)
    {
        if (count <= 0) throw new ArgumentException("借阅数量必须大于 0");
        if (Stock < count) throw new InvalidOperationException("库存不足");
        Stock -= count;
    }
}
```

**`private set` 的好处与代价：**

| 好处 | 代价 |
|---|---|
| 编译器保证外部不能乱改 | EF Core 的 `Add`/`Update` 需要额外配置 |
| 不变式（库存 ≥ 0）有唯一入口 | 写 DTO 映射时不能直接赋值 |
| 改起来"只能走方法"，规则不会被绕开 | 数据迁移/种子数据要多写几行 |

**`private Book() { }` 为什么必须有：**

| 原因 | 说明 |
|---|---|
| EF Core 查库时用无参构造造对象 | 它不知道你的业务构造函数参数怎么来 |
| 反射可以调私有构造 | 所以写 `private` 不影响 EF，但能挡住业务代码 |

### 值对象清单：怎么从需求里找出来

**照这张表过一遍你的需求文档，能找出大部分值对象：**

| 信号 | 值对象候选 |
|---|---|
| 出现"金额 / 价格 / 总价" | `Money(Amount, Currency)` |
| 出现"地址" | `Address(Province, City, Street, Zip)` |
| 出现"时间段 / 有效期" | `DateRange(Start, End)` |
| 出现"手机号 / 邮箱 / 身份证" | `PhoneNumber`、`Email`、`IdCard`（**自带校验**） |
| 出现"数量 + 单位" | `Quantity(Value, Unit)` |
| 出现"百分比 / 折扣" | `Discount(Rate)`、`Percentage` |
| 出现"坐标 / 位置" | `Position(X, Y, Z)` |
| 出现"颜色 / 尺寸" | `Color`、`Size` |

**判断技巧：一个概念如果"改了一个字段，整个概念就变了"，那它是值对象。** 比如 `Address` 改了街道，就不是原来那个地址了（没有 Id 能指认它）——所以它是值对象。

---

==二：格式==

## 1. 三种业务代码组织方式：一张坐标图

```
                    规则住哪？
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   住在 Service     住在 Service     住在实体
   （过程式）        （贫血模型）      （充血模型）
        │               │               │
   事务脚本          贫血模型          领域模型
   ─────────         ─────────        ─────────
   Book.Stock        Book 只有属性     Book.TryBorrow()
   由 Service 改     规则在 Service    规则在 Book 自己

   ←──── 简单 ──────────────────── 复杂 ────→
   ←──── 好上手 ────────────────── 好维护 ──→
```

| 位置 | 名称 | 一句话 |
|---|---|---|
| 最左 | 事务脚本 | 一个方法做完一件事，规则写在流程里 |
| 中间 | 贫血模型 | 实体只是数据袋，规则集中在 Service |
| 最右 | 充血模型 | 实体带行为，服务只做编排 |

## 2. 实体 vs 值对象 判定流程

```
拿到一个概念
     │
     ▼
它有 Id 吗？（数据库主键 / 业务编号 / 唯一标识）
     │
  ┌──┴──┐
 有     没有
  │      │
  ▼      ▼
实体   它的所有属性都改了，它还是"它"吗？
  │      │
  │   ┌──┴──┐
  │  是     不是
  │   │      │
  │   ▼      ▼
  │ 实体   值对象
  │
  ▼
再问：它的状态变化需要"记录历史/审计"吗？
  │
 是 → 更是实体（生命周期有意义）
 不是 → 也可能只是"有 Id 的数据结构"，看业务需要
```

## 3. 值对象三种写法速查

```csharp
// ① 最简：record（无校验）
public record Money(decimal Amount, string Currency);

// ② 带校验：手写构造函数的 record
public record Money
{
    public decimal Amount { get; }
    public string Currency { get; }
    public Money(decimal amount, string currency)
    {
        if (currency?.Length != 3) throw new ArgumentException("币种必须 3 位");
        Amount = amount;
        Currency = currency.ToUpperInvariant();
    }
    public Money Add(Money o) =>
        o.Currency != Currency
            ? throw new InvalidOperationException("币种不同")
            : this with { Amount = Amount + o.Amount };
}

// ③ 极致：readonly record struct（大量创建时用）
public readonly record struct Point(double X, double Y, double Z);
```

| 写法 | 什么时候用 |
|---|---|
| ① `record` | 默认选择，90% 场景 |
| ② 带校验 `record` | 值有约束（币种 3 位、金额非负） |
| ③ `record struct` | 高频创建的小值对象（坐标、颜色），且字段 ≤ 4 个 |

## 4. EF Core 映射值对象的三种方式

| 方式 | 代码 | 适用 | 备注 |
|---|---|---|---|
| **`OwnsOne`** | `e.OwnsOne(x => x.Price, p => { ... })` | 值对象是**引用类型**（record/class） | 摊平成列，EF Core 2.0+ |
| **`ComplexProperty`** | `e.ComplexProperty(x => x.Price)` | EF Core 8+ 的**新方案**，值对象无"身份"语义更纯 | 不支持 null 值对象，需非空 |
| **值转换器** | `e.Property(x => x.Price).HasConversion(...)` | 值对象能序列化成单列（如 `"99 CNY"`） | 无法按 `Amount` 单独查询 |

**`OwnsOne` 模板：**

```csharp
b.Entity<Order>(e =>
{
    e.ToTable("Orders");
    e.OwnsOne(x => x.Price, p =>
    {
        p.Property(m => m.Amount).HasColumnName("Price_Amount").HasPrecision(18, 2);
        p.Property(m => m.Currency).HasColumnName("Price_Currency").HasMaxLength(3);
    });
});
```

**查询时的注意点：**

```csharp
// ✅ 可以按值对象的属性筛选（EF 会翻译成 Price_Amount 列）
var cheap = await ctx.Orders.Where(o => o.Price.Amount < 100).ToListAsync();

// ❌ 不能整体比较（EF 不会翻译 record 的 ==）
// var x = await ctx.Orders.Where(o => o.Price == someMoney).ToListAsync();
```

## 5. 通用语言术语表模板

| 业务词 | 精确定义 | 反例（易混淆） | 代码位置 |
|---|---|---|---|
| 借阅 | 读者把书带离馆，产生一条借阅记录 | 不等于"续借" | `BorrowRecord` / `Book.Borrow()` |
| 续借 | 已在借的书延长归还日期，不产生新记录 | 不等于"先还再借" | `BorrowRecord.Renew()` |
| 归还 | 书回到馆，库存 +1 | 不等于"丢失赔偿" | `Book.Return()` |
| 库存 | 当前可借册数 | 不等于"馆藏总数" | `Book.Stock` |
| 馆藏总数 | 含借出+在架的物理册数 | — | `Book.TotalCopies` |

**这张表的作用：** 每次需求评审，新词必须进表；每次写代码，类名/方法名必须从上表取。

## 6. 术语中英对照（读英文资料用）

| 中文 | 英文 | 缩写 |
|---|---|---|
| 领域驱动设计 | Domain-Driven Design | DDD |
| 通用语言 / 统一语言 | Ubiquitous Language | UL |
| 限界上下文 | Bounded Context | BC |
| 子域 | Subdomain | — |
| 核心域 | Core Domain | — |
| 支撑子域 | Supporting Subdomain | — |
| 通用子域 | Generic Subdomain | — |
| 上下文映射 | Context Map | — |
| 防腐层 | Anticorruption Layer | ACL |
| 实体 | Entity | — |
| 值对象 | Value Object | VO |
| 聚合 / 聚合根 | Aggregate / Aggregate Root | AR |
| 领域服务 | Domain Service | — |
| 应用服务 | Application Service | — |
| 领域事件 | Domain Event | — |
| 集成事件 | Integration Event | — |
| 仓储 | Repository | — |
| 工作单元 | Unit of Work | UoW |
| 事务脚本 | Transaction Script | — |
| 贫血模型 | Anemic Domain Model | — |
| 充血模型 | Rich Domain Model | — |

## 7. 误区对照表

| 误区 | 事实 |
|---|---|
| "DDD 就是四层架构" | 四层是分层方案，DDD 不规定层数 |
| "用了 MediatR 就是 DDD" | MediatR 是进程内消息总线，跟 DDD 无必然关系 |
| "DDD 必须配微服务" | DDD 比微服务早 11 年，单体完全可以用 DDD |
| "DDD 必须充血模型" | 贫血是妥协，但工业界大量使用 |
| "值对象就是没有 Id 的类" | 关键在"按值相等 + 不可变"，不只是没 Id |
| "实体必须有业务方法" | 贫血实体也是实体（只是模型不完整） |
| "限界上下文 = 微服务" | 上下文是"词义的边界"，微服务是"进程的边界" |
| "通用语言 = 起个好名字" | 是"全链路用同一套词"，包括数据库和接口 |
| "DDD 能提升性能" | 恰恰相反，模型越纯，ORM 映射越绕，性能要单独处理 |
| "小项目也能用 DDD" | 能用，但收益 < 成本（见零段判据） |

---

==三：代码==

## 1. 事务脚本版：完整的"借书"（可直接跑）

**这是你练习项目现在的风格，先留一份做对照。**

```csharp
// ============ 模型（贫血，只有属性） ============
public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = "";
    public int Stock { get; set; }
}

public class Reader
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public int BorrowedCount { get; set; }
    public bool HasOverdue { get; set; }
}

public class BorrowRecord
{
    public long Id { get; set; }
    public long BookId { get; set; }
    public long ReaderId { get; set; }
    public DateTime BorrowTime { get; set; }
}

// ============ 服务（事务脚本，规则全在这里） ============
public class BorrowService
{
    private readonly LibContext _ctx;
    public BorrowService(LibContext ctx) => _ctx = ctx;

    public (bool ok, string? msg) Borrow(long bookId, long readerId)
    {
        var book = _ctx.Books.Find(bookId);
        if (book is null) return (false, "书不存在");

        var reader = _ctx.Readers.Find(readerId);
        if (reader is null) return (false, "读者不存在");

        if (book.Stock <= 0) return (false, "没有库存");
        if (reader.HasOverdue) return (false, "有逾期未还");
        if (reader.BorrowedCount >= 5) return (false, "超过借阅上限");

        book.Stock--;
        reader.BorrowedCount++;
        _ctx.BorrowRecords.Add(new BorrowRecord
        {
            BookId = bookId, ReaderId = readerId, BorrowTime = DateTime.Now
        });
        _ctx.SaveChanges();
        return (true, null);
    }
}
```

> **注意这个方法的形状：取数据 → 判规则 → 改状态 → 存。四段式，从头到尾一条直线。** 这就是事务脚本的典型特征。

## 2. 领域模型版：同一个需求

```csharp
// ============ 值对象：借阅结果 ============
public record BorrowResult(bool Ok, string? Reason)
{
    public static BorrowResult Success() => new(true, null);
    public static BorrowResult Fail(string reason) => new(false, reason);
}

// ============ 值对象：金额（顺手加一个，展示值对象什么样） ============
public record Money(decimal Amount, string Currency = "CNY")
{
    public Money Add(Money o) =>
        o.Currency != Currency
            ? throw new InvalidOperationException($"币种不同：{Currency} vs {o.Currency}")
            : this with { Amount = Amount + o.Amount };
    public override string ToString() => $"{Amount:0.00} {Currency}";
}

// ============ 实体：Book 自己保护库存 ============
public class Book
{
    public long Id { get; private set; }
    public string Title { get; private set; } = "";
    public int Stock { get; private set; }

    private Book() { }                        // EF Core 用

    public Book(string title, int stock)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("书名不能为空");
        if (stock < 0) throw new ArgumentException("库存不能为负");
        Title = title; Stock = stock;
    }

    // 领域行为 ①：判断 + 变更，一体
    public BorrowResult TryBorrow(Reader reader)
    {
        if (Stock <= 0) return BorrowResult.Fail("没有库存");
        if (reader.HasOverdue) return BorrowResult.Fail("有逾期未还");
        if (!reader.CanBorrowMore) return BorrowResult.Fail("超过借阅上限");

        Stock--;                               // 唯一能减库存的地方
        return BorrowResult.Success();
    }

    public void Return(int count = 1)
    {
        if (count <= 0) throw new ArgumentException("归还数量必须大于 0");
        Stock += count;
    }

    public void Restock(int count)
    {
        if (count <= 0) throw new ArgumentException("入库数量必须大于 0");
        Stock += count;
    }
}

// ============ 实体：Reader 自己管借阅额度 ============
public class Reader
{
    public long Id { get; private set; }
    public string Name { get; private set; } = "";
    public int BorrowedCount { get; private set; }
    public bool HasOverdue { get; private set; }

    private Reader() { }

    public Reader(string name) => Name = name;

    public bool CanBorrowMore => BorrowedCount < 5 && !HasOverdue;

    public void RecordBorrow()
    {
        if (!CanBorrowMore) throw new InvalidOperationException("当前状态不能借书");
        BorrowedCount++;
    }

    public void RecordReturn() => BorrowedCount = Math.Max(0, BorrowedCount - 1);

    public void MarkOverdue(bool v) => HasOverdue = v;
}

// ============ 应用服务：只剩编排 ============
public class BorrowAppService
{
    private readonly LibContext _ctx;
    public BorrowAppService(LibContext ctx) => _ctx = ctx;

    public (bool ok, string? msg) Borrow(long bookId, long readerId)
    {
        var book = _ctx.Books.Find(bookId);
        if (book is null) return (false, "书不存在");
        var reader = _ctx.Readers.Find(readerId);
        if (reader is null) return (false, "读者不存在");

        var r = book.TryBorrow(reader);        // ← 规则在这里，不在本方法里
        if (!r.Ok) return (false, r.Reason);

        reader.RecordBorrow();
        _ctx.BorrowRecords.Add(new BorrowRecord
        {
            BookId = bookId, ReaderId = readerId, BorrowTime = DateTime.Now
        });
        _ctx.SaveChanges();
        return (true, null);
    }
}
```

**两版对照，只看这个方法的"形状"：**

| 事务脚本版 | 领域模型版 |
|---|---|
| 4 个 `if` 在 Service 里 | 0 个业务 `if` 在 Service 里 |
| `book.Stock--` 直接改 | `book.TryBorrow()` 间接改 |
| 规则只有一份 | 规则只有一份（但在实体里） |

### 关键：`private set` 之后 EF Core 需要额外一句

**如果你直接跑，会碰到一个隐性坑：EF Core 有两种方式给 `private set` 属性赋值（`Add` 时多用构造函数，`Update`/物化时用属性 setter），通常不用配置。但如果 EF 说找不到 setter，加这个：**

```csharp
protected override void OnModelCreating(ModelBuilder b)
{
    b.Entity<Book>(e =>
    {
        // 显式声明"这些属性虽然有 private set，但请用属性方式访问"
        e.Property(x => x.Stock).UsePropertyAccessMode(PropertyAccessMode.Property);
    });
}
```

| 枚举值 | 含义 |
|---|---|
| `PropertyAccessMode.Field` | 直接写 backing field（**推荐给 private set**） |
| `PropertyAccessMode.Property` | 走属性 setter（private 也能反射调用） |
| `PropertyAccessMode.PreferField` | 能用字段就用字段（默认） |

## 3. 值对象完整代码 + 实测输出

**这是我在 `D:\tmp\DddTest` 里跑的完整可运行代码（net10.0 + EF Core 10.0.13 + SQLite）：**

```csharp
using Microsoft.EntityFrameworkCore;

// ---------- 值对象：record，自动按值相等 ----------
public record Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (other.Currency != Currency) throw new InvalidOperationException("币种不同不能相加");
        return this with { Amount = Amount + other.Amount };
    }
    public override string ToString() => $"{Amount} {Currency}";
}

// ---------- 对照：用 class 当值对象（错误示范） ----------
public class MoneyClass
{
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "";
    public MoneyClass(decimal amount, string currency) { Amount = amount; Currency = currency; }
}

// ---------- 实体：Order 持有值对象 ----------
public class Order
{
    public int Id { get; set; }
    public string Buyer { get; set; } = "";
    public Money Price { get; set; } = new(0m, "CNY");     // 值对象
}

// ---------- 可变值对象（只为做对照实测） ----------
public class MutOrder
{
    public int Id { get; set; }
    public string Buyer { get; set; } = "";
    public MoneyMut Price { get; set; } = new(0m, "CNY");
}

public class MoneyMut
{
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "";
    public MoneyMut(decimal amount, string currency) { Amount = amount; Currency = currency; }
    public override string ToString() => $"{Amount} {Currency}";
}

// ---------- DbContext ----------
public class OrderContext : DbContext
{
    private readonly string _path;
    public OrderContext(string path) => _path = path;

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<MutOrder> MutOrders => Set<MutOrder>();

    protected override void OnConfiguring(DbContextOptionsBuilder o)
        => o.UseSqlite($"Data Source={_path}");

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Order>(e =>
        {
            e.ToTable("Orders");
            e.OwnsOne(x => x.Price, p =>
            {
                p.Property(m => m.Amount).HasColumnName("Price_Amount");
                p.Property(m => m.Currency).HasColumnName("Price_Currency");
            });
        });

        b.Entity<MutOrder>(e =>
        {
            e.ToTable("MutOrders");
            e.OwnsOne(x => x.Price, p =>
            {
                p.Property(m => m.Amount).HasColumnName("Price_Amount");
                p.Property(m => m.Currency).HasColumnName("Price_Currency");
            });
        });
    }
}
```

## 4. 本篇实测汇总（全部真跑出来的）

### 实测 ①：record 值相等 vs class 引用相等

```
record Money(99,CNY) == record Money(99,CNY)  -> True
Equals -> True   GetHashCode 相同 -> True
class  MoneyClass(99,CNY) == class  MoneyClass(99,CNY) -> False
class  Equals(默认实现) -> False
m1 = 99.0 CNY, m3 = 100 CNY    （m1 没变，这是不可变）
```

### 实测 ②：`OwnsOne` 生成的真实列名

```
[建表 SQL 里的列]    （SQLite: SELECT name FROM pragma_table_info('Orders')）
  Id
  Buyer
  Price_Amount
  Price_Currency
```

**结论：值对象摊平进 owner 表，列名前缀是导航属性名。**

### 实测 ③：共享实例 vs 独立实例

```
3a 共享同一实例 -> 抛 DbUpdateException：SQLite Error 19: 'NOT NULL constraint failed: Orders.Price_Amount'.
3b 各自独立实例（内容相等）-> 存成功
  #1 张三 50.0 CNY
  #2 李四 50.0 CNY
两行的金额相等吗：True（值对象按值比较，相等就是相等）
```

**结论：值对象概念上可以共享，但 EF 的 owned 映射不允许两个 owner 指向同一个实例。**

### 实测 ④：`record` 的 `init` 属性挡住"就地改写"

```
error CS8852: 只能在对象初始值设定项中或在实例构造函数或 "init" 访问器中的
              "this" 或 "base" 上分配 init-only 属性或索引器 "Money.Amount"。
```

**结论：`record` 天然不可变，这是编译器层面的保证，不是"建议"。**

### 实测 ⑤：可变值对象被就地改写，ChangeTracker 的状态很反直觉

```
[ChangeTracker 里所有条目]
  MoneyMut     State=Modified
  MutOrder     State=Unchanged
只看 owner：Unchanged
读回来：#1 的金额 = 999.0（999 说明就地改也能被检测）
```

| 条目 | 状态 | 说明 |
|---|---|---|
| `MoneyMut`（owned） | `Modified` | EF 属性级快照比对发现了差异 |
| `MutOrder`（owner） | **`Unchanged`** | 它自己的标量属性一个都没动 |
| 最终结果 | 存成功了 | EF 提交看所有条目，不看 owner |

**结论：判断值对象有没有改，不能只看 owner 的 State。**

### 实测 ⑥：值对象自带行为的价值

```
Money(50,CNY) == Money(50,CNY)            -> True
Money(50,CNY) == Money(50,USD)            -> False
Money(50,CNY) 与 Money(50,CNY) 哈希一致   -> True
Money(50,CNY).Add(Money(20,CNY))          -> 70 CNY
Money(50,CNY).Add(Money(20,USD))          -> 抛异常：币种不同不能相加
```

**最后一行是重点：** "币种不同不能相加"这条规则，**住在 `Money` 自己身上**。如果 `Money` 只是两个属性，这条规则就得分散到每个用到金额的地方。

## 5. 练习：给你的图书系统做一次"概念体检"（一次一步）

> **这不是写代码的练习，是"看需求"的练习。做完你会对 P172 的聚合有直觉。**
>
> **一次只做一步，做完把结果发我，我给下一步。**

### Step 1 · 找出 3 个值对象

**打开你的图书系统需求（或者自己想一遍业务），填这张表：**

| 概念 | 为什么是值对象（"改一个字段它就不是它了"） | 打算叫什么 |
|---|---|---|
| ？ | ？ | ？ |
| ？ | ？ | ？ |
| ？ | ？ | ？ |

**提示：图书系统里高概率的值对象有** `Money`（价格）、`Isbn`（ISBN 号，自带校验位）、`PhoneNumber`（读者手机号）、`DateRange`（借阅期限）、`Address`（读者地址）。

### Step 2 · 找出 2 个实体，并标出"哪个属性绝对不能从外部直接改"

| 实体 | 不能直接改的属性 | 为什么 |
|---|---|---|
| `Book` | ？ | ？ |
| `Reader` | ？ | ？ |

### Step 3 · 找出 1 处"同一个词有两种意思"

**这是限界上下文的练习。** 图书系统里常见的：

- "库存"：对读者是"能不能借"，对采购是"要不要补货"
- "借阅记录"：对读者是"我借了什么"，对统计是"本月流通量"
- "罚款"：对财务是"应收款"，对读者是"我还欠多少钱"

**找一个，然后回答：这两个意思如果放在同一个类里，会出什么问题？**

### Step 4 · 判断你的项目该用哪种写法

**按 P169 的判据表逐条打勾，然后告诉我结论。**

| 判据 | 你的项目 |
|---|---|
| 业务规则 > 10 条？ | ？ |
| 规则会经常变？ | ？ |
| 同一规则有多个入口？ | ？ |
| 有"状态不能进入某组合"的约束？ | ？ |
| CRUD 占比 > 80%？ | ？ |

---

==四：总结==

## 1. 六节知识一张表

| P | 主题 | 一句话核心 | 属于 |
|---|---|---|---|
| 166 | 软件架构设计的怪现状 | 架构是"为变化付代价"，没变化就没有架构 | 认知 |
| 167 | 什么是微服务 | 微服务解决"独立扩容/发布/隔离"，前提是团队够大 | 战略 |
| 168 | 什么是 DDD | 用代码精确表达复杂业务；先战略后战术 | 全景 |
| 169 | 领域模型 vs 事务脚本 | 规则住 Service → 事务脚本；规则住对象 → 领域模型 | 战术 |
| 170 | 通用语言、限界上下文 | 一个词一个意思；边界内才成立 | **战略（最值钱）** |
| 171 | 实体与值对象 | 有 Id 是实体，按值相等是值对象 | 战术 |

## 2. 七条硬结论

1. **DDD 的失败 90% 败在战略。** 边界画错，战术做得再漂亮也是垃圾。

2. **DDD 的成本是固定的（约 800–1500 行基础设施），收益随复杂度线性增长。** 规则不到 200 行时，收益一定小于成本。

3. **事务脚本不是"低级写法"，是"简单场景的正确写法"。** 把它当敌人的人，通常正在给 CRUD 项目加聚合根。

4. **值对象的核心不是"没有 Id"，是"按值相等 + 不可变"。** 用 `class` 当值对象是 bug，不是风格问题。

5. **`record` 的 `init` 属性让"不可变"由编译器保证**（实测 CS8852）。这比"约定不要改"强一万倍。

6. **EF Core 的 `OwnsOne` 会把值对象摊平成列**（实测 `Price_Amount` / `Price_Currency`），但**两个 owner 不能共享同一个值对象实例**（实测 `NOT NULL constraint failed`）。

7. **可变值对象被就地改写时，owner 条目显示 `Unchanged`，owned 条目才是 `Modified`**（实测）。别用 owner 状态判断有没有改。

## 3. 决策流程图

```
拿到一个模块，要不要上领域模型？
        │
        ▼
把这模块的业务规则数一遍（只数"业务判断"，不含参数校验）
        │
   ┌────┴────┐
  < 200 行   ≥ 200 行
   │          │
   ▼          ▼
事务脚本    有"不变式"吗？（某些状态组合绝不能出现）
（别折腾）    │
        ┌───┴───┐
       有       没有
        │        │
        ▼        ▼
   找聚合边界   贫血模型 + Service
   （P172）     （够用了）
        │
        ▼
   同一个词在不同场景有不同意思吗？
        │
   ┌────┴────┐
   有         没有
   │          │
   ▼          ▼
拆限界上下文  单上下文内建模型
（先画边界）
        │
        ▼
   团队 < 3 人且项目 < 1 年？
        │
   ┌────┴────┐
   是         否
   │          │
   ▼          ▼
只做"值对象 +  完整战术设计
实体私有 set"  （实体/值对象/聚合/
这个最小集      领域服务/仓储/事件）
```

## 4. 记忆口诀

```
架构不是加东西，是为变化付代价；
微服务解三件事，扩容发布和隔离；
康威定律先看人，三个人的团队别拆进程；
DDD 比微服务老十一年，它不是为拆服务而生；
先战略后战术，边界错了全白干；
事务脚本不丢人，规则两百行以内就用它；
规则住对象叫充血，规则住服务叫贫血，两个都对；
一个词一个意思，出了边界重新定义；
有 Id 是实体，按值相等是值对象；
值对象要不可变，record 的 init 帮你挡；
OwnsOne 摊平成列，列名前缀是导航名；
共享实例会报错，两个 owner 各 new 一个。
```

## 5. 三句话带走

1. **DDD 真正稀缺的不是"聚合根怎么写"，是"边界画在哪"。** 前者查文档就会，后者要在这行待够久、被坑够多才有手感。这一篇给你的六个 P 里，P170 的两个词（通用语言、限界上下文）占了全部价值的 70%。

2. **你现在的图书系统，正确的选择是"事务脚本 + 少量值对象"，不是 DDD。** 但你要**知道** DDD 长什么样——因为你的游戏服务端迟早会撞上"`if` 开始互相打架"的那一天，那时候你会需要它，而不会因为它陌生而绕路。

3. **判断一个架构决策好不好，不要问"它先不先进"，问"它应对的那个变化，我半年内会碰到吗"。** 会 → 值得付代价。不会 → 你付的是纯利息。

---

> **下一篇（批次 21，P172–P174）是「DDD 三件套：聚合 / 服务 / 事件」**：
> **聚合与聚合根**（怎么找一致性边界、为什么"一个事务只改一个聚合"、聚合要小）、
> **领域服务与应用服务**（什么时候规则不属于任何实体、应用服务到底该干几件事）、
> **领域事件与集成事件**（两者的区别、什么时候用、为什么集成事件必须能重试）。
> **这三节是 DDD 战术设计真正落地的骨架，也是后面 P175–P196 全部代码的地基。**
>
> **另外提醒：P165「ASP.NET Core 程序的发布」这一节还没做**（`dotnet publish` 的几种模式、IIS 与 Kestrel、Linux systemd、上线检查清单）。你这次从 P166 直接跳到 DDD，那节我留在这——**哪天要真把项目放到服务器上之前，跟我说一声，我单独补一篇。**
