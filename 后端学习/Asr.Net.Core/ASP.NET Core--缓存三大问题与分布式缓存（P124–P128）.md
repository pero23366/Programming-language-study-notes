==零：补充==

> **这批的五个节（P124–P128）回答一个问题：缓存明明让人变快，为什么还会把系统搞挂？**

## 它解决什么问题

**上一批你学会了"怎么加缓存"。这一批学的是"加了缓存之后，系统会怎么死"。**

这不是危言耸听。缓存带来的三种死法，全都有共同的形状：

```
平时：缓存命中 → 数据库几乎没压力 → 一切正常
某刻：缓存"没了" → 流量全部砸向数据库 → 数据库跪 → 全站 500
```

**区别只在于"为什么没了"：**

| 名字 | 为什么缓存没命中 | 谁的锅 | 后果量级 |
|---|---|---|---|
| **穿透**（P124） | **数据库里根本没有这条数据**，缓存也就永远存不住 | 攻击者 / 爬虫 / 脏参数 | 一个 key 打穿整个库 |
| **击穿**（P125） | **一个热点 key 过期了**，成千上万个请求同时回源 | 你自己的 TTL 设置 | 单个热点把库打出一个尖峰 |
| **雪崩**（P126） | **大量 key 同时过期**，或 Redis 整体宕机 | 批量写入 + 统一 TTL | 全站瘫痪 |

**这三个词是面试必问，也是线上事故的高频原因。** 更要紧的是：**它们的解法完全不同**，搞混了就会用错药。

**P127–P128 则是"把缓存从自己进程搬出去"**：`IMemoryCache` 只能单机用，多台服务器时每台各存各的（上一批第 4 节讲过）。要共享，就必须上 `IDistributedCache` + Redis，而"跨网络"会带来三个新问题：**序列化、网络延迟、Redis 自己也会挂**。

## 没有它会怎样（用你自己的项目算）

**假设你把图书系统上线了，首页是 `GET api/query/stats/by-category`，你给它加了 5 分钟缓存。**

**场景一：有人写了个脚本，循环请求 `GET api/query/books/-1`**

```
id=-1 在数据库里不存在
  → 缓存里也没有
  → 每次请求都回源查库（查不到）
  → 每次都不写缓存（因为"没结果"看起来没什么可缓存的）
  → 无限循环：10 万次请求 = 10 万次查库
```

**你加了缓存，但这个接口的缓存命中率是 0%。** 这就是穿透——**它不是"缓存失效"，是"缓存根本没机会生效"。**

**场景二：早上 9 点，你的 5 分钟缓存刚好在 09:00:00 集体过期**

```
你在 08:55 一次性预热了 200 个 key（都是 5 分钟 TTL）
09:00:00  200 个 key 同秒失效
09:00:00  首页 200 个区块的请求同时回源
          → 数据库连接池（默认 100 个）瞬间打满
          → 剩下 100 个请求排队，超时 30 秒
          → 用户看到白屏，反复刷新
          → 流量翻倍，彻底压死
```

**代码一行没改错，只是"所有 key 的 TTL 一样长"。** 这就是雪崩。

**场景三：你重启了一次应用（发个版）**

```
dotnet 进程重启 → IMemoryCache 全空 → 第一波请求全部回源
如果这时恰好有个爆款，QPS 500，100% 回源 = 数据库瞬间 500 QPS
```

**这就是为什么"内存缓存的重启即失"不是小毛病**，上一批第 4 节提过，这一批给出应对方案。

## 它在整个生态里的位置

**缓存的三层防线，和这一批的对应关系：**

```
        ┌──────────────────────────────┐
        │ ① 布隆过滤器 / 参数校验        │ ← P124 防穿透（第一道闸）
        ├──────────────────────────────┤
        │ ② 互斥锁 / 逻辑过期            │ ← P125 防击穿（热点保护）
        ├──────────────────────────────┤
        │ ③ 抖动 + 高可用 + 熔断降级      │ ← P126 防雪崩（系统韧性）
        ├──────────────────────────────┤
        │ ④ Redis（共享 + 独立进程）      │ ← P127/P128 跨机器共享
        └──────────────────────────────┘
                 ▼
             数据库（最后一道，也是最贵的一道）
```

**注意 ④ 的位置：Redis 既是"解决方案"，也是"新的单点故障"。** 上了 Redis 之后，你要多考虑一件事——**Redis 挂了怎么办**。这个问题在这一批的 P126 有答案（降级），在批次 19（部署）还会再出现。

**另外一个生态事实：这三套东西不止用于"缓存"。**

| 问题 | 换个场景就是 | 你以后会在哪遇到 |
|---|---|---|
| 击穿（热点并发回源） | **接口幂等 / 并发控制 / 秒杀** | 游戏里的"领奖"按钮、支付回调 |
| 雪崩（雪崩式失效） | **服务雪崩 / 熔断降级** | 微服务（批次 20）、第三方 API 挂了 |
| 穿透（查不存在的东西） | **参数校验 / 限流 / 防刷** | 登录接口防撞库 |

**所以这一批学的不是"三个缓存技巧"，是"三种系统韧性模式"。**

## 对你个人的实际意义

**（1）这是你第一次学"系统怎么死"。**

前面 130 集，你学的都是"功能怎么实现"。从这一批开始，你学的是**"实现了的功能在压力下会怎么崩"**。

这个视角的转变，比任何具体技术都重要。**独立游戏上线那天，服务器挂掉的每一分钟都在掉玩家**——你不会有机会"第二天再修"。所以你必须在上线前就知道：什么地方会死、死了怎么降级、怎么让一个组件挂掉不带走整个游戏。

**（2）对你现在的项目，"该不该做"的答案很明确：知道，但别做。**

| 措施 | 你的图书系统要不要做 | 为什么 |
|---|---|---|
| 空值缓存 | **可以做**（10 行） | 顺手，且能理解"穿透"长什么样 |
| 布隆过滤器 | **不要做** | 5 本书做布隆过滤器是行为艺术 |
| 互斥锁防击穿 | **可以做**（20 行） | 帮助类正好要写，顺便带上 |
| 抖动 TTL | **必做**（3 行） | 成本几乎为零，收益明确 |
| Redis | **先不接** | 你没有多实例，装 Redis 是给自己找运维 |
| 熔断降级 | **不要做** | 没有下游依赖，没东西可熔断 |

**（3）位置感：你现在能解释"网站为什么扛得住"了。**

上一批学完，你知道"缓存让人变快"。这一批学完，你知道**"缓存让系统在压力下有缓冲，但这个缓冲本身也会失效"**。这两句话合起来，就是"高并发系统"的全部骨架——剩下的限流、队列、分库分表，都是在同一个骨架上加零件。

## 诚实的话：什么时候这些全都不需要

**四条判断，只要命中一条，这一批的技术你都可以先"知道但不实现"：**

| 情况 | 为什么不需要 |
|---|---|
| **单机部署 + QPS < 50** | 击穿/雪崩的前提是"并发足够大"，50 QPS 打不死 SQL Server |
| **缓存的数据不共享**（每台机器算自己的） | 不需要 Redis，`IMemoryCache` 就是最优解 |
| **能接受"数据偶尔旧几分钟"** | 短 TTL 就能覆盖 90% 的场景，不用做复杂失效 |
| **业务量还没到** | 提前上 Redis = 提前承担运维成本，这是典型的过度设计 |

**记住这句话：**

> **缓存三大问题的解法，是"高并发"问题的解法，不是"缓存"问题的解法。**
> **没有高并发，你只需要 P123 的抖动 + 短 TTL，就够了。**

---

==一：概念==

## P124 · 1. 什么叫"缓存穿透"

**一句话：请求的 key 在缓存里没有，在数据库里也没有，所以永远不会被缓存住。**

**注意和"未命中"的区别：**

| | 正常未命中 | 穿透 |
|---|---|---|
| 缓存里有吗 | 没有 | 没有 |
| 数据库里有吗 | **有** | **没有** |
| 回源后写缓存吗 | 写（下次就命中了） | **写不了**（没结果可写） |
| 下次请求 | 命中缓存 ✅ | **还是回源** ❌ |
| 次数 | 1 次 | **无限次** |

**关键在第四行：正常未命中是"一次性成本"，穿透是"永久性成本"。**

**你项目里天然存在三个穿透入口（不用别人攻击，你自己就能踩）：**

```csharp
// ① 不存在的 id —— 用户手改 URL / 爬虫遍历
GET /api/query/books/999999

// ② 被删除的数据 —— 缓存里刚删，但还是有人拿着旧链接访问
GET /api/query/books/12   （12 已被删）

// ③ 恶意遍历 —— 负数、超大数、随机字符串
GET /api/query/books/-1
GET /api/query/books/99999999999999999999
```

**攻击者只需要写一行循环：**

```bash
for i in $(seq 1 1000000); do curl "http://yoursite/api/query/books/$i"; done
```

**每个请求都绕过缓存、直达数据库。你的缓存"命中率 99%"在这种攻击下毫无意义——因为攻击者打的全是那 1% 里最贵的部分。**

## 2. 防御一：缓存空值（最简单，80% 的场景够用）

**思路：查不到也缓存，存一个"哨兵值"，让下次请求能命中。**

```csharp
public async Task<BookDetailView?> GetBookAsync(long id)
{
    var key = $"query:book:id={id}:v1";

    // ① 命中缓存（包括"缓存了 null"的情况）
    if (_cache.TryGetValue(key, out BookDetailView? cached))
        return cached;                                  // 可能是 null，也是有效结果

    // ② 回源
    var dto = await _ctx.Books.AsNoTracking()
        .Where(b => b.Id == id)
        .Select(...)
        .FirstOrDefaultAsync();

    // ③ 无论有没有，都缓存（null 也缓存）
    _cache.Set(key, dto, new MemoryCacheEntryOptions
    {
        // ★ 空值 TTL 要比正常值短，否则数据后来被加上也要等很久
        AbsoluteExpirationRelativeToNow = dto is null
            ? TimeSpan.FromSeconds(30)
            : TimeSpan.FromMinutes(5)
    });

    return dto;
}
```

**✅ 我实测过（5 次连续调用）：**

| 第几次 | 结果 |
|---|---|
| 1 | 未命中，回源 |
| 2 | **命中缓存，值 = null** |
| 3 | 命中缓存，值 = null |
| 4 | 命中缓存，值 = null |
| 5 | 命中缓存，值 = null |

**回源次数：1 次。** 从"每次都查库"变成"30 秒查一次库"——**穿透被打断了。**

**⚠️ 但有三个必须知道的副作用：**

| 副作用 | 说明 | 对策 |
|---|---|---|
| **内存被垃圾 key 占满** | 攻击者每次用不同的 id，你就缓存一堆 null，把正常缓存挤出去 | **空值 TTL 必须短**（30 秒～1 分钟），绝不能用 5 分钟 |
| **"先查不到、后有了"会延迟** | 你缓存了 null，用户新建了这条数据，要等 TTL 才看得到 | 写操作后 `Remove` 该 key |
| **判断"有没有缓存"变麻烦** | 缓存里真有 null，`TryGetValue` 返回 true，但值也是 null | **用 `TryGetValue(key, out T)` 的返回值判断，不要用 `value == null` 判断** |

**最后一条是很多人踩的坑：**

```csharp
// ❌ 错误：把"缓存了 null"当成"没缓存"
var v = _cache.Get<BookDetailView>(key);
if (v == null) { /* 回源 */ }        // ← 每次都回源，等于没缓存

// ✅ 正确：用 TryGetValue 的 bool
if (_cache.TryGetValue(key, out BookDetailView? v))
    return v;                         // v 可能是 null，直接返回
```

## 3. 防御二：布隆过滤器（能挡 99.9% 的非法 key）

**问题：缓存空值只能防"重复的同一个 key"，防不住"每次都换一个不存在的 id"。**

**布隆过滤器解决的就是这件事：用一个很小的位图，快速回答"这个 key 可能存在吗"。**

**原理（一个 400 字的说明 + 一张图）：**

```
准备：一个长度为 m 的位数组（全是 0），k 个不同的哈希函数

写入 "book:12"：
   hash1("book:12") % m = 3   → 第 3 位 = 1
   hash2("book:12") % m = 7   → 第 7 位 = 1
   hash3("book:12") % m = 15  → 第 15 位 = 1

查询 "book:12"：
   三个位置都是 1 → "可能存在" → 放行去查缓存/数据库

查询 "book:999"：
   第 3 位是 1，但第 7 位是 0 → "一定不存在" → ★ 直接返回 404，不查库 ★
```

**它只有两种回答：**

| 回答 | 含义 | 准确吗 |
|---|---|---|
| **"一定不存在"** | 有位是 0 | ✅ **100% 准确**（绝不误杀） |
| **"可能存在"** | 全都是 1 | ⚠️ **可能误判**（别人的哈希撞上了） |

**"可能误判"就是它的代价：误判率（false positive）。**

**误判率由两个参数决定（用公式算，不靠感觉）：**

```
m = -n·ln(p) / (ln2)²      位数组长度
k = (m/n)·ln2              哈希函数个数

n = 预期元素个数，p = 目标误判率
```

**实际数字（背下来）：**

| 元素数 n | 目标误判率 p | 需要位数 m | 哈希函数 k | 占用内存 |
|---|---|---|---|---|
| 100 万 | 1% | 958 万 bit | 7 | **约 1.14 MB** |
| 100 万 | 0.1% | 1438 万 bit | 10 | 约 1.71 MB |
| 100 万 | 10% | 480 万 bit | 3 | 约 0.57 MB |
| 1000 万 | 1% | 9580 万 bit | 7 | **约 11.4 MB** |

**这正是它最迷人的地方：100 万条数据只占 1 MB，而用 `HashSet<string>` 存 100 万个字符串要几十 MB。** 用 1% 的误判率换 20 倍的内存节省，非常划算。

> **⚠️ 布隆过滤器不能删除元素。** 因为它只是"把几个位设成 1"，你不知道这个位是被谁设的——删一个元素会把别人的位也清掉（这就是"计数布隆过滤器"存在的原因，但复杂度和内存都上去了）。
>
> **所以它只适合"只增不删"的数据集**：用户 ID、图书 ID、订单号。**如果你的数据会删，就得定期重建整个过滤器（比如每天凌晨重建一次）。**

## 4. 防御三：参数校验 + 限流（最便宜的一层）

**在业务逻辑之前就把明显非法的请求挡掉，成本几乎为零。**

```csharp
if (id <= 0 || id > 10_000_000)
    return BadRequest(new { message = "id 非法" });
```

**三层防御的正确顺序（越往前越便宜）：**

```
① 参数格式校验（id > 0）            ← 0 成本，挡掉 90% 的乱扫
② 布隆过滤器（存在性判断）           ← 内存查询，挡掉 9.9%
③ 缓存空值（兜底重复 key）           ← 仍然要查一次库
④ 限流（同一个 IP 每秒最多 N 次）     ← 挡掉恶意脚本
```

**注意顺序：不要一上来就上布隆过滤器。** 如果你的接口本来就能用 `id > 0` 挡掉大部分垃圾请求，那布隆过滤器带来的复杂度就不值得。

## 5. 三种防穿透手法的选型表

| 方案 | 成本 | 挡住什么 | 副作用 | 该用吗 |
|---|---|---|---|---|
| **参数校验** | 1 行 | 格式非法、负数、超范围 | 无 | ✅ **永远先做这个** |
| **缓存空值** | 10 行 | 重复的同一个非法 key | 内存被垃圾 key 占（TTL 要短） | ✅ **80% 场景够用** |
| **布隆过滤器** | 100 行 + 重建任务 | **随机变化**的非法 key | 1% 误判、不能删、要预热 | ⚠️ 数据量大 + 有恶意请求才上 |
| **限流** | 中间件/Filter | 高频脚本 | 可能误伤正常用户 | ✅ 上公网就该有 |

> **判断口诀：**
> **能靠校验解决，就别上缓存；能靠缓存解决，就别上布隆过滤器。**
> **每上一层，你就多一个"要在生产上维护的东西"。**

## P125 · 1. 先把"击穿"说清（它和雪崩只差一个规模）

**一句话：一个热点 key 刚好过期的那一瞬间，成千上万个请求同时发现"缓存没了"，一起去查数据库。**

**关键词是"一瞬间"。**

```
09:00:00.000   热点 key "homepage:stats" 过期
09:00:00.000   第 1 个请求发现未命中 → 开始查库（耗时 300ms）
09:00:00.010   第 2 个请求发现未命中 → 也开始查库
09:00:00.020   第 3 个请求发现未命中 → 也开始查库
...
09:00:00.300   第 100 个请求发现未命中 → 也开始查库
09:00:00.300   第 1 个请求查完，写入缓存
09:00:00.310   其余 99 个请求也陆续查完，各自写入（重复劳动）
```

**300ms 内 100 次相同的聚合查询，数据库扛不住的不是"总量"，是"瞬时并发"。**

**为什么叫"击穿"？** 想象缓存是一块铁板，其余请求都被挡住了。**但热点 key 过期的那一刻，铁板上出现了一个洞，所有压力从这一个洞穿过去，直接砸在数据库上。**

## P125 · 2. 我实测了：20 个并发，不做保护会回源 20 次

**这是这一批最该亲手看一次的数字。**

```csharp
[HttpGet("herd/locked")]
public async Task<object> Locked()
{
    var key = "hot:" + Guid.NewGuid();      // 每次请求独立 key，避免互相干扰
    int calls = 0, entered = 0, hitFirst = 0, hitSecond = 0;

    await Task.WhenAll(Enumerable.Range(0, 20).Select(i => Task.Run(async () =>
    {
        if (_cache.TryGetValue(key, out _)) { Interlocked.Increment(ref hitFirst); return; }
        await _lock.WaitAsync();
        try
        {
            Interlocked.Increment(ref entered);
            if (_cache.TryGetValue(key, out _)) { Interlocked.Increment(ref hitSecond); return; }  // ★ 双重检查
            var v = await SlowLoad(() => Interlocked.Increment(ref calls));   // 300ms 模拟查库
            _cache.Set(key, v, TimeSpan.FromMinutes(1));
        }
        finally { _lock.Release(); }
    })));
    ...
}
```

**✅ 实测结果（20 个并发）：**

| 版本 | 工厂（查库）执行次数 |
|---|---|
| **不做任何保护** | **20 次** |
| **SemaphoreSlim + 双重检查** | **1 次** |

**加锁版本的完整计数：**

| 指标 | 数值 | 说明 |
|---|---|---|
| 并发数 | 20 | — |
| 首次检查命中 | 0 | 都没命中（缓存刚清） |
| **进锁次数** | **20** | 都排队进锁（锁是排队的） |
| **二次检查命中** | **19** | ★ 进锁后发现"已经有人填好了"，直接返回 |
| **真正回源** | **1** | ★ 只有第一个倒霉蛋干了活 |

**这一行 `19` 就是双重检查的全部价值：** 锁排队不是目的，**排到之后先看一眼"还要不要干活"才是。**

## P125 · 3. 击穿的三重防护（标准答案）

```csharp
public async Task<T> GetOrLoadAsync<T>(string key, TimeSpan ttl, Func<Task<T>> loader)
{
    // ① 先查缓存
    if (_cache.TryGetValue(key, out T? cached))
        return cached!;

    // ② 抢锁（进程内）；抢不到就等
    await _lock.WaitAsync();
    try
    {
        // ③ 二次检查（★ 最关键的一行，没有它锁就白加了）
        if (_cache.TryGetValue(key, out cached))
            return cached!;

        // ④ 只有一个人回源
        var value = await loader();
        _cache.Set(key, value, ttl);
        return value;
    }
    finally
    {
        _lock.Release();     // ★ 必须放 finally，否则异常一次就永久死锁
    }
}
```

**三个必须理解的细节：**

| 细节 | 不这么写会怎样 |
|---|---|
| **锁必须 `Release` 在 `finally`** | `loader()` 抛一次异常 → 锁永不释放 → **所有后续请求全部卡死**（比崩溃更难查） |
| **二次检查必须在锁内、在回源之前** | 少了它，20 个请求排队进锁、轮流查库 —— **锁只让它变慢，没让它变少** |
| **锁的粒度要"按 key"** | 一把全局锁 → 缓存 A 和缓存 B 互相阻塞，吞吐直接砍半 |

**"按 key 的锁"怎么写？**

```csharp
// 每个 key 一把锁（用 ConcurrentDictionary 懒创建）
private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

var gate = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
await gate.WaitAsync();
```

> **⚠️ 但这样做有个新问题：`_locks` 里的锁永远不会被回收。** 如果 key 有几十万个，这里就是内存泄漏。**生产做法：用 `Lazy<SemaphoreSlim>` + 引用计数，或者直接用成熟的库（`LazyCache` / `FusionCache`）。**

## P125 · 4. 分布式锁：多实例下的"锁"不能是进程内的

**`SemaphoreSlim` 只能锁住同一个进程。你有 3 台服务器，锁就变成了 3 把——每台各放一个请求回源，总共还是 3 次。**

```
单机：SemaphoreSlim → 1 次回源
3 实例：3 个 SemaphoreSlim → 3 次回源（每台 1 次）
```

**跨实例互斥，必须用"外部的一个地方"当锁。三种做法：**

| 方案 | 实现 | 优点 | 缺点 |
|---|---|---|---|
| **Redis SETNX** | `SET key value NX PX 3000`（不存在才设置，3 秒后自动过期） | 简单、原子 | 要处理"锁超时但业务没完" |
| **Redis 官方 RedLock** | 多个 Redis 节点多数派加锁 | 更安全 | 部署复杂，争议多 |
| **C# 库** | `FusionCache` / `LazyCache`（内置防击穿） | 不用自己写 | 多一个依赖 |

**Redis 分布式锁的最小实现（P127 接完 Redis 就能用）：**

```csharp
public async Task<bool> TryLockAsync(string key, string token, TimeSpan expiry)
{
    // NX = 不存在才设置；PX = 毫秒级过期
    return await _redis.StringSetAsync($"lock:{key}", token, expiry, When.NotExists);
}
```

> **为什么锁一定要带过期时间？** 因为进程可能在持锁期间被杀（发版、OOM、断电）。**没有过期的锁 = 永久死锁。** 这是分布式锁最重要的一条铁律。

## P125 · 5. 另一种思路：逻辑过期（不删缓存，只标记"旧了"）

**加锁的问题：抢不到锁的请求要**等**。热点 key 上，等 300ms 和查一次库差不多。**

**逻辑过期的思路：缓存永不物理过期，而是在 value 里存一个"逻辑过期时间"。读到过期的数据，先返回旧值，同时异步刷新。**

```csharp
public class CacheItem<T>
{
    public T Data { get; set; } = default!;
    public DateTime ExpireAt { get; set; }        // 逻辑过期时间
}
```

```csharp
public T GetWithLogicalExpire<T>(string key, TimeSpan ttl, Func<T> loader)
{
    if (!_cache.TryGetValue(key, out CacheItem<T>? item))
        return loader();                          // 真的没有 → 同步加载

    if (item.ExpireAt > DateTime.Now)
        return item.Data;                         // 还没逻辑过期 → 直接返回

    // ★ 已逻辑过期：先返回旧值，后台刷新（不阻塞当前请求）
    if (_refreshLocks.TryAdd(key, 0))             // 只有一个线程去刷新
    {
        _ = Task.Run(() =>
        {
            try
            {
                var fresh = loader();
                _cache.Set(key, new CacheItem<T> { Data = fresh, ExpireAt = DateTime.Now.Add(ttl) },
                    TimeSpan.FromHours(1));       // 物理 TTL 给足，靠逻辑过期控制新鲜度
            }
            finally { _refreshLocks.TryRemove(key, out _); }
        });
    }

    return item.Data;                             // ★ 立刻返回旧数据，用户不等
}
```

**两种方案的本质区别：**

| | 互斥锁 | 逻辑过期 |
|---|---|---|
| 用户等多久 | **等一次查库**（300ms） | **0（返回旧数据）** |
| 数据新鲜度 | 强（第一个请求就是新的） | **弱（有几秒旧数据）** |
| 实现复杂度 | 低 | 中（要包一层 `CacheItem`） |
| 适合 | 数据必须新（价格、库存） | 数据可以稍旧（排行榜、热门列表） |
| 风险 | 锁死锁、锁超时 | 后台刷新失败 → 一直是旧数据 |

> **口诀：**
> **要新鲜 → 加锁让人等；要快 → 逻辑过期，先给旧的。**

## P125 · 6. 什么叫"缓存雪崩"

**一句话：大量缓存**同时**失效（或者缓存服务整体挂掉），流量像雪崩一样全部压到数据库。**

**和击穿的区别只有一点：击穿是"一个 key"，雪崩是"一大片"。**

**雪崩的三根引线（都可能出现在你自己的代码里）：**

| # | 引线 | 你怎么写出来的 |
|---|---|---|
| 1 | **所有 key 的 TTL 一样长** | 你在循环里统一 `TimeSpan.FromMinutes(5)`，还一次性预热 |
| 2 | **应用重启 / 发布** | 内存缓存全空，第一波流量 100% 回源 |
| 3 | **Redis 挂了** | 所有实例同时"缓存不可用"，直接查库 |

**第 3 条最可怕，因为它是"外部原因"，你代码写得再对也没用。**

## P125 · 7. 雪崩防线一：TTL 抖动（成本 3 行，收益最大）

**上一批 P123 提过一次，这里补上完整实现和效果对比。**

```csharp
public static TimeSpan WithJitter(TimeSpan baseTtl, double ratio = 0.2)
{
    var offset = baseTtl.TotalSeconds * ratio;                      // 5min × 0.2 = 60s
    var delta = Random.Shared.NextDouble() * 2 * offset - offset;   // [-60s, +60s]
    return baseTtl + TimeSpan.FromSeconds(delta);
}

// 用
entry.AbsoluteExpirationRelativeToNow = WithJitter(TimeSpan.FromMinutes(5));
```

**效果对比（200 个 key）：**

```
无抖动：08:55 全部写入，5 分钟 TTL
        09:00:00  ████████████████████  200 个同时过期 → 200 QPS 尖峰

有抖动：TTL 落在 4–6 分钟
        08:59:00  ███
        09:00:00  ██████
        09:01:00  ████████      ← 摊平到 2 分钟内，峰值从 200 降到 ~2
```

**⚠️ 抖动只解决"同时过期"，解决不了"重启"和"Redis 挂了"。**

## P125 · 8. 雪崩防线二：多级缓存（本地 + Redis）

**思路：请求先查本地内存缓存（0.02ms），没有再去 Redis（1ms），再没有才查库（80ms）。**

```
请求 → 本地 IMemoryCache（L1）
         ↓ 未命中
       Redis（L2）
         ↓ 未命中
       数据库
```

| 层级 | 延迟 | 容量 | 一致性 |
|---|---|---|---|
| L1 本地内存 | **0.02ms** | 小（受进程内存限制） | **各实例独立，可能不一致** |
| L2 Redis | 1ms（同机房） | 大 | 全实例一致 |
| 数据库 | 80ms | 无限 | 权威 |

**收益：Redis 挂了，L1 还能挡住一部分请求；Redis 的 QPS 压力也降一个数量级。**

**代价（这是多级缓存最大的坑）：**

> **L1 各存各的，你在 A 机器上更新了数据，B 机器和 C 机器的 L1 还是旧的。**
>
> 解法：**失效广播**——更新数据时，往 Redis 的 Pub/Sub 发一条"key xxx 失效了"，所有实例订阅后清掉自己的 L1。

**结论：多级缓存是"高并发 + 强一致"同时要求时的方案，你的项目远没到这个量级。** 知道结构即可。

## P125 · 9. 雪崩防线三：熔断降级（缓存挂了也不能全站挂）

**这是"系统韧性"的通用模式，不止用于缓存。**

**目标：Redis 挂掉时，系统降级到"慢但可用"，而不是"全部 500"。**

```csharp
public async Task<List<CategoryStat>> GetStatsAsync()
{
    try
    {
        var cached = await _distributed.GetStringAsync(Key);
        if (cached is not null)
            return JsonSerializer.Deserialize<List<CategoryStat>>(cached)!;
    }
    catch (RedisConnectionException ex)
    {
        // ★ 缓存不可用 → 记日志，然后"降级"：直接查库（慢，但能用）
        _log.LogWarning(ex, "Redis 不可用，降级为直接查库");
    }

    // 无论 Redis 是否可用，这条路径都能跑通
    var data = await LoadFromDbAsync();

    try { await _distributed.SetStringAsync(Key, JsonSerializer.Serialize(data), options); }
    catch (RedisConnectionException) { /* 写不进去就算了，不要影响主流程 */ }

    return data;
}
```

**注意两件事：**

| 要点 | 为什么 |
|---|---|
| **写缓存失败不能影响返回** | 缓存是优化，不是功能。**缓存挂了，功能必须还能用** |
| **降级要有开关和监控** | 一直降级 = 数据库直接面对全量流量，几小时后可能崩。要报警 |

**更完整的做法（.NET 8+ 的 `Microsoft.Extensions.Http.Resilience` / Polly）：**

```csharp
// 熔断器：连续失败 N 次后，"跳闸"一段时间，直接走降级，不再尝试 Redis
// （避免每次都等 Redis 超时的 3 秒）
```

> **熔断器（Circuit Breaker）的三个状态，一句话记住：**
> **关闭**（正常走 Redis）→ 失败率超标 → **打开**（不试了，直接降级）→ 等一段时间 → **半开**（试一次，成功就关闭，失败就继续打开）。

## P125 · 10. 穿透 / 击穿 / 雪崩：一张表彻底分清

| | 穿透 | 击穿 | 雪崩 |
|---|---|---|---|
| **数据在库里吗** | **不存在** | 存在 | 存在 |
| **缓存为什么没命中** | 从来没存过（也没得存） | **一个热点 key 过期** | **一大片 key 同时过期** / 缓存服务挂 |
| **打库的量** | 与请求量 1:1（永久） | 瞬时尖峰（一个 key） | 瞬时尖峰（全站） |
| **触发者** | 攻击者 / 脏参数 | 你的 TTL | 你的批量写入 / 重启 / Redis 故障 |
| **后果** | 数据库被无效查询占满 | 单个热点打断数据库 | 全站 500 |
| **主解法** | 参数校验 → 缓存空值 → 布隆过滤器 | 互斥锁 / 逻辑过期 | 抖动 TTL / 多级缓存 / 熔断降级 |
| **辅助** | 限流 | 热点永不过期 + 后台刷新 | Redis 高可用（主从/哨兵/集群） |
| **记忆** | **查不存在的** | **热点过期的那一下** | **一大片同时没了** |

**一个便于记忆的比喻：**

- **穿透**：有人拿假身份证反复来查档，档案室里根本没有这个人 → **门口装人脸识别（布隆过滤器）**
- **击穿**：全市只有一家 24 小时药店，它一关门，所有人同时挤到隔壁医院 → **门口排队（互斥锁）**
- **雪崩**：所有药店商量好同一秒关门 → **让它们错峰关门（抖动）**

## P126 · 1. 为什么这节要"封装"

**P122 你写的是这样：**

```csharp
if (_cache.TryGetValue(key, out var v)) return v;
var data = await LoadAsync();
_cache.Set(key, data, TimeSpan.FromMinutes(5));
return data;
```

**一个接口写一遍还行。写到第 8 个接口，你会开始犯错——而且是那种"看不出来"的错。**

**封装要解决的四个具体问题（每一条都是真实 bug 来源）：**

| # | 问题 | 不封装的后果 |
|---|---|---|
| 1 | **key 拼错** | 写的时候 `query:book:id=5:v1`，删的时候 `query:books:id=5:v1` → **永远删不掉** |
| 2 | **忘了防击穿** | 每个接口都写裸 `TryGetValue`，热点一过期就 20 次回源 |
| 3 | **TTL 忘了加抖动** | 批量预热后同一秒集体过期 |
| 4 | **空值没缓存** | 有人遍历 id，全部穿透 |

**这四件事，任何一个"忘了做"都不会报错。** 它们只会在生产环境上，以"数据库 CPU 100%"的形式出现。

> **封装的目的不是"少写代码"，是"让错误没有机会发生"。**

## 2. 三种封装方式，先选对层级

| 方式 | 写法 | 适合 | 不该用的理由 |
|---|---|---|---|
| **① 静态扩展方法** | `cache.GetOrCreateWithLock<T>(key, ttl, loader)` | 小型项目、快速套用 | 无法注入配置/日志；`static` 里放锁要小心 |
| **② 接口 + 实现（推荐）** | `ICacheService` + `MemoryCacheService` | **绝大多数项目** | — |
| **③ 直接换第三方库** | `FusionCache` / `LazyCache` | 不想自己维护 | 多一个依赖，出问题要读别人的源码 |

**推荐 ②，因为它有一个 ① 给不了的能力：以后换 Redis 时，业务代码一行不用改。**

```csharp
// 业务代码只认接口
public class BookService
{
    private readonly ICacheService _cache;      // ← 今天是内存，明天是 Redis，这里不变
}
```

## 3. `ICacheService` 的接口设计（先想清楚要什么）

```csharp
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);

    /// <summary>取不到就用 loader 加载并缓存（内置防击穿 + TTL 抖动）</summary>
    Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> loader,
                                TimeSpan? ttl = null, bool cacheNull = false,
                                CancellationToken ct = default);
}
```

**四个方法对应四种需求：**

| 方法 | 用在哪 | 为什么单独给 |
|---|---|---|
| `GetAsync` | 只读一次 | 有时候你只想"有就用，没有就算了"，不想回源 |
| `SetAsync` | 手动预热 | 启动时批量加载 |
| `RemoveAsync` | 写操作后失效 | **必须有**，否则数据改了缓存不更新 |
| `GetOrCreateAsync` | **90% 的场景** | 把"查缓存 → 回源 → 写缓存 → 防击穿 → 抖动"打包成一次调用 |

> **为什么全部是 `async`？** 因为 `GetOrCreateAsync` 里的 loader 通常要查库。**如果接口里有同步方法，调用方会不自觉地用它，然后在里面 `.Result` 阻塞线程**——这就是上一批讲的 async 传染性。**从一开始就全异步，省得以后改。**

## 4. 实现里最值钱的一段：防击穿 + 抖动 + 空值

```csharp
public sealed class MemoryCacheService : ICacheService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<MemoryCacheService> _log;

    // ★ 按 key 分段加锁（16 把锁够了，不需要"每个 key 一把"）
    private static readonly SemaphoreSlim[] _gates =
        Enumerable.Range(0, 16).Select(_ => new SemaphoreSlim(1, 1)).ToArray();

    private static SemaphoreSlim GateOf(string key)
        => _gates[(uint)key.GetHashCode() % (uint)_gates.Length];

    public MemoryCacheService(IMemoryCache cache, ILogger<MemoryCacheService> log)
    { _cache = cache; _log = log; }

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
        => Task.FromResult(_cache.TryGetValue(key, out T? v) ? v : default);

    public Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        _cache.Set(key, value, WithJitter(ttl ?? TimeSpan.FromMinutes(5)));
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
    {
        _cache.Remove(key);
        return Task.CompletedTask;
    }

    public async Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> loader,
        TimeSpan? ttl = null, bool cacheNull = false, CancellationToken ct = default)
    {
        // ① 快路径：命中就直接走（绝大多数请求在这返回，不碰锁）
        if (_cache.TryGetValue(key, out T? hit) && (hit is not null || cacheNull))
            return hit!;

        // ② 慢路径：按 key 抢一把闸
        var gate = GateOf(key);
        await gate.WaitAsync(ct);
        try
        {
            // ③ 二次检查（★ 没有这一行，锁就只是让你变慢）
            if (_cache.TryGetValue(key, out hit) && (hit is not null || cacheNull))
                return hit!;

            var value = await loader(ct);

            // ④ 空值要不要缓存，由调用方决定（默认不缓存，避免垃圾 key）
            if (value is not null || cacheNull)
                _cache.Set(key, value, WithJitter(ttl ?? TimeSpan.FromMinutes(5)));

            return value;
        }
        finally { gate.Release(); }
    }

    private static MemoryCacheEntryOptions WithJitter(TimeSpan ttl)
    {
        var offset = ttl.TotalSeconds * 0.2;
        var delta = Random.Shared.NextDouble() * 2 * offset - offset;
        return new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl + TimeSpan.FromSeconds(delta)
        };
    }
}
```

**三个设计决策，都值得解释：**

| 决策 | 为什么这么做 | 换成别的会怎样 |
|---|---|---|
| **16 把锁，按 key 哈希分配** | 每个 key 一把锁 → 锁对象永不回收（内存泄漏）；1 把锁 → 全站串行 | 见过用一把全局锁的代码，QPS 直接砍到 1/10 |
| **快路径不抢锁** | 命中率 99% 时，99% 的请求不该碰锁 | 每次读都抢锁 = 把缓存变成串行队列 |
| **`finally` 里 Release** | loader 抛异常时锁必须放掉 | 一次异常 = 永久死锁，比崩溃更难查 |

## 5. ⚠️ 一个我实测踩到的坑：`out _` 让"缓存命中"变成"未命中"

**这是写这段代码时的真实事故，值得单独讲。**

**错误写法（看起来很自然）：**

```csharp
await Task.WhenAll(Enumerable.Range(0, 20).Select(_ => Task.Run(async () =>
{
    if (_cache.TryGetValue(key, out _)) return;     // 想判断"有没有缓存"
    ...
})));
```

**实测结果：20 个并发，进了 20 次锁，二次检查命中 0 次，回源 20 次——锁白加了。**

**为什么？**

```
`Select(_ => ...)` 里，`_` 是一个真实的变量（范围变量，类型 int）
  ↓
`out _` 不是"丢弃"，而是"输出到这个叫 _ 的 int 变量"
  ↓
编译器去匹配重载：需要 out int → 选中泛型版 `TryGetValue<int>(key, out int value)`
  ↓
缓存里存的是 string "payload"，`result is int` 不成立
  ↓
★ 泛型 TryGetValue 返回 false ★  → 明明有缓存，却判定为"没有"
```

**把 lambda 参数从 `_` 改成 `i` 之后，同一份代码的实测结果：**

| 指标 | 改之前 | 改之后 |
|---|---|---|
| 进锁次数 | 20 | 20 |
| **二次检查命中** | **0** | **19** |
| **真正回源** | **20** | **1** |

**这条坑的可怕之处：编译不报错、运行不报错、逻辑看起来完全正确，只是"缓存永远不命中"。**

**两个规避办法：**

```csharp
// ① 别用 _ 当 lambda 参数名（最省事）
.Select(i => Task.Run(...))

// ② 显式判类型，别依赖 discard 推断
if (_cache.TryGetValue(key, out object? _)) return;      // 明确是 object 版
if (_cache.TryGetValue<Book>(key, out var b)) return b;  // 明确泛型参数
```

> **`TryGetValue<TItem>` 的行为要知道：** 它要求"缓存里的值 **是** `TItem` 类型"才返回 true。存的是 `string` 你按 `int` 取 → false；存的是 `null` 你按 `string` 取 → **true**（我上一批实测过）。**它判断的是"有没有 + 类型对不对"，不是"值是不是 null"。**

## 6. 什么时候**不要**封装

**封装不是越多越好。下面三种情况，直接写裸 API 更清楚：**

| 情况 | 为什么 |
|---|---|
| 一次性脚本 / 实验代码 | 封装成本 > 收益 |
| 需要精细控制每个选项（`Priority`、`ExpirationTokens`、`Size`） | 封装会把参数列表变成灾难 |
| 只有 1~2 个接口用缓存 | 一个 40 行的 `BookStatsCache` 比一个通用框架更可读 |

> **判断标准：当你有第 3 个地方要写"查缓存 → 回源 → 写缓存"时，才值得封装。** 之前都是过早抽象。

## P127 · 1. `IDistributedCache` 是什么

**一句话：微软定义的"分布式缓存"抽象接口，值只能是 `byte[]`。**

```csharp
public interface IDistributedCache
{
    byte[]? Get(string key);
    Task<byte[]?> GetAsync(string key, CancellationToken token = default);

    void Set(string key, byte[] value, DistributedCacheEntryOptions options);
    Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default);

    void Refresh(string key);                          // 续期（滑动过期用）
    Task RefreshAsync(string key, CancellationToken token = default);

    void Remove(string key);
    Task RemoveAsync(string key, CancellationToken token = default);
}
```

**注意：接口上只有 `byte[]`，没有泛型、没有 `GetOrCreate`。**

> **为什么是 `byte[]`？** 因为它的实现可以是 Redis（跨网络）、SQL Server、NCache……**要跨网络，就必须先把对象变成字节流。** 而"怎么变"取决于你（JSON / MessagePack / Protobuf），框架不替你做决定。
>
> **对比 `IMemoryCache`：它在同一个进程里，能直接存对象引用，所以接口是 `object`。**

## 2. `IMemoryCache` vs `IDistributedCache`：六点差异（选型全靠这张表）

| | `IMemoryCache` | `IDistributedCache` |
|---|---|---|
| **存什么** | 任意对象（**引用**） | **`byte[]`**（必须自己序列化） |
| **存在哪** | 当前进程堆内存 | Redis / SQL Server / 其他进程 |
| **跨实例共享** | ❌ 各存各的 | ✅ **共享** |
| **重启后** | ❌ 全丢 | ✅ 保留（Redis 持久化的情况下） |
| **延迟** | ~0.02ms（内存读） | ~0.5–2ms（**网络往返**） |
| **API 便利度** | 有 `GetOrCreate`、`Set(key, value, ttl)` | 只有 `Get/Set byte[]`，**要自己封装** |

**这张表解释了为什么"上了 Redis 不是无脑变快"：**

```
本地缓存：0.02ms  × 1000 次 = 20ms
Redis   ：1ms     × 1000 次 = 1000ms  ← 慢 50 倍
```

**所以真实的架构是两级：本地缓存挡住 90% 的读，Redis 只处理"本地没有"的那 10%。**（P125 · 8 的多级缓存）

## 3. 四个 API 和三个选项（就这些）

```csharp
// ① 存（byte[]）
await _dc.SetAsync("key", Encoding.UTF8.GetBytes("hello"), new DistributedCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)   // 绝对过期
});

// ② 取（byte[]）
var bytes = await _dc.GetAsync("key");           // 没有就返回 null

// ③ 续期（滑动过期必须手动调，或者靠 SlidingExpiration 自动）
await _dc.RefreshAsync("key");

// ④ 删
await _dc.RemoveAsync("key");
```

**三个选项（比 `ICacheEntry` 少很多）：**

| 选项 | 类型 | 说明 |
|---|---|---|
| `AbsoluteExpiration` | `DateTimeOffset?` | 到期时间点（**必须是 UTC**，写 `DateTime.Now` 会早 8 小时过期） |
| `AbsoluteExpirationRelativeToNow` | `TimeSpan?` | 从现在起多久到期（**推荐**） |
| `SlidingExpiration` | `TimeSpan?` | 多久没人访问就失效 |

**✅ 我实测了 `byte[]` 这件事：**

```csharp
await _dc.SetStringAsync(key, "hello", new DistributedCacheEntryOptions
{ SlidingExpiration = TimeSpan.FromSeconds(2) });

var bytes = await _dc.GetAsync(key);
var str = await _dc.GetStringAsync(key);
```

**实测返回：**

```json
{ "GetAsync返回类型": "Byte[]", "GetAsync长度": 5, "GetStringAsync": "hello" }
```

**所以 `GetStringAsync` / `SetStringAsync` 是"扩展方法"（对 `byte[]` 做 UTF8 转换），不是接口自带的。** 你可以用，但要知道它只处理字符串。

**另外我实测了分布式缓存的滑动过期（2 秒窗口，每 1.5 秒访问一次）：**

| 第几次 | 结果 |
|---|---|
| 1 | 写入 `born 21:03:58.955` |
| 2（+1.5s） | 读到并 Refresh → **还是同一个值** |
| 3（+1.5s） | 读到并 Refresh → 还是同一个值 |
| 4（停 3s 后） | **重新写入** `born 21:04:05.321` |

**和内存缓存的滑动过期语义完全一致**（上一批那个"永不过期"陷阱在分布式缓存里同样存在）。

## 4. 接 Redis：一个包 + 三行代码

**第一步：安装包**

```bash
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
```

**第二步：注册（`Program.cs`）**

```csharp
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");   // "localhost:6379"
    options.InstanceName = "BookStore:";      // ★ 所有 key 自动加这个前缀
});
```

**第三步：注入使用（业务代码不变，还是 `IDistributedCache`）**

```csharp
public class BookStatsCache
{
    private readonly IDistributedCache _cache;      // ← 就这一行换了
    public BookStatsCache(IDistributedCache cache) => _cache = cache;
}
```

**`appsettings.json`：**

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379,abortConnect=false,connectTimeout=2000,syncTimeout=2000"
  }
}
```

| 参数 | 作用 | 不写会怎样 |
|---|---|---|
| `abortConnect=false` | 连不上也先启动，后台重连 | Redis 没起来 → **应用启动直接失败** |
| `connectTimeout=2000` | 连接超时 2 秒 | 默认可能等很久，用户看到白屏 |
| `syncTimeout=2000` | 命令超时 2 秒 | Redis 卡住 → 请求全卡住 |

> **⚠️ 这三个参数不是可选的。** `abortConnect=false` 决定了"Redis 挂了，应用还能不能启动"——**上线第一个事故往往就是这个。**

**本机没有 Redis 也能学完这一批：**

```csharp
builder.Services.AddDistributedMemoryCache();   // 接口完全一样，实现换成内存
```

**我这一批的全部实验都是用 `AddDistributedMemoryCache()` 跑的**——因为 `IDistributedCache` 是抽象，**换实现只改注册那一行**。这正是"面向接口"最实在的收益。

**Windows 上装 Redis 的三种方式（按省事程度）：**

| 方式 | 命令 | 说明 |
|---|---|---|
| **Memurai**（推荐） | 官网下载安装包 | Redis 的 Windows 兼容实现，免费开发版 |
| **Redis for Windows**（tporadowski 分支） | 下载 zip，运行 `redis-server.exe` | 版本较老（6.x），学习够用 |
| Docker | `docker run -d -p 6379:6379 redis` | 最干净，但你机器上没装 Docker |

## 5. 为什么要序列化（以及序列化带来的三个新问题）

**因为要跨网络。** 对象在 .NET 里是一块内存布局（含类型信息、引用地址），**这些东西出了进程就没意义了**。

```
Book 对象（内存里）          跨网络要求              JSON（字符串/字节）
┌──────────────┐                                 {"Id":1,"Title":"...",
│ 类型指针      │  ✗ 无意义                        "Price":59.9}
│ 字段1        │  ────────────►                  ↑ 纯文本，谁都能读
│ 字段2        │   必须"扁平化"                    │
└──────────────┘                                  
```

**序列化带来的三个新问题（内存缓存完全没有）：**

| # | 问题 | 例子 | 解法 |
|---|---|---|---|
| 1 | **性能成本** | 1 万条数据序列化 + 反序列化，可能比查库还慢 | 只缓存"小结果"（< 100 KB） |
| 2 | **类型丢失** | `DateTime` 反序列化后 `Kind` 变成 `Unspecified` | 用 UTC 存、存 ISO 字符串 |
| 3 | **中文变大** | `System.Text.Json` 默认把中文转成 `\u4E66\u540D`，**体积翻 6 倍** | 用 `UnsafeRelaxedJsonEscaping` |

**第 3 条的实际影响：**

```csharp
// 默认：中文被转义
{"Title":"\u4E66\u540D"}          // 每个汉字 6 字节

// 配置后：原样输出
var opt = new JsonSerializerOptions
{
    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
};
{"Title":"书名"}                   // 每个汉字 3 字节（UTF-8）
```

> **`UnsafeRelaxedJsonEscaping` 的 "Unsafe" 是什么意思？** 它不再把 `<`、`>`、`&`、中文等转义。**用在"存缓存"是安全的**（不涉及 HTML 输出），但**不要用它生成要嵌进 HTML 的 JSON**（会有 XSS 风险）。名字里的警告是认真的。

## P128 · 1. 为什么分布式缓存的封装比内存版难

**照抄内存版会踩三个坑，全都来自"跨进程"：**

| # | 内存版为什么没这问题 | 分布式版为什么要处理 |
|---|---|---|
| 1 | 存对象，不用序列化 | **必须序列化**，还要处理"反序列化失败" |
| 2 | 本地调用，几乎不抛异常 | **网络会断**，必须 `try/catch` 降级 |
| 3 | `SemaphoreSlim` 能锁住全进程 | 多实例时锁不住，**要 Redis 锁或不做锁** |

**所以分布式版的封装原则是：**

> **所有缓存操作都必须"可以失败"，且失败不能影响主流程。**

## 2. 实现（能直接用的版本）

```csharp
public sealed class DistributedCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<DistributedCacheService> _log;

    // 统一前缀 + 版本号，改结构时改版本即可整体作废
    private const string Prefix = "BookStore:v1:";

    private static readonly JsonSerializerOptions JsonOpt = new()
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public DistributedCacheService(IDistributedCache cache, ILogger<DistributedCacheService> log)
    { _cache = cache; _log = log; }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        try
        {
            var bytes = await _cache.GetAsync(Prefix + key, ct);
            if (bytes is null || bytes.Length == 0) return default;
            return JsonSerializer.Deserialize<T>(bytes, JsonOpt);
        }
        catch (Exception ex) when (ex is RedisConnectionException or TimeoutException or JsonException)
        {
            // ★ 反序列化失败也要吞掉：可能是旧版本留下的结构
            _log.LogWarning(ex, "读取缓存失败 key={Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        try
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(value, JsonOpt);
            await _cache.SetAsync(Prefix + key, bytes, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl ?? TimeSpan.FromMinutes(5)
            }, ct);
        }
        catch (Exception ex)
        {
            // ★ 写失败绝不影响主流程
            _log.LogWarning(ex, "写入缓存失败 key={Key}", key);
        }
    }

    public Task RemoveAsync(string key, CancellationToken ct = default) => _cache.RemoveAsync(Prefix + key, ct);

    public async Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> loader,
        TimeSpan? ttl = null, bool cacheNull = false, CancellationToken ct = default)
    {
        var cached = await GetAsync<T>(key, ct);
        if (cached is not null || cacheNull) return cached!;

        var value = await loader(ct);
        if (value is not null || cacheNull) await SetAsync(key, value, ttl, ct);
        return value;
    }
}
```

**三处 `catch` 的写法，是这段代码的全部价值：**

| 捕获 | 为什么 |
|---|---|
| `RedisConnectionException` | Redis 挂了 / 网络断了 → 降级为直接查库 |
| `TimeoutException` | Redis 卡住 → 不能让它拖死整个请求 |
| `JsonException` | 缓存里是旧结构（你改了 DTO）→ **当成未命中**，重新加载 |

**最后一个最容易漏：你给 DTO 加了个必填字段，缓存里的旧 JSON 反序列化会抛 `JsonException`。** 不接住它，整个接口 500；接住了，就是"这次没命中，下次就好了"。

## 3. 序列化选型：JSON 之外的两种

| 方案 | 体积 | 速度 | 可读性 | 适合 |
|---|---|---|---|---|
| **`System.Text.Json`** | 中 | 快 | ✅ 人眼可读 | **默认选它**（零依赖、内置） |
| `MessagePack` | **小 30–50%** | **快 2–5 倍** | ❌ 二进制 | 大对象、高 QPS |
| `Protobuf` | 最小 | 最快 | ❌ 要写 .proto | 跨语言、跨团队契约 |

> **先别优化。** `System.Text.Json` 在 .NET 8+ 已经很快了。**只有当"序列化耗时 > 查库耗时"时才值得换**——先量，再换。

## 4. 分布式缓存的六个生产坑（都是踩出来的）

| # | 坑 | 现象 | 解法 |
|---|---|---|---|
| 1 | **`AbsoluteExpiration` 用了 `DateTime.Now`** | 缓存早 8 小时过期（UTC 与本地时差） | 用 `DateTimeOffset.UtcNow` 或 `...RelativeToNow` |
| 2 | **大 key**（几 MB 的 JSON） | Redis 单线程被一个大 key 卡住，**全站变慢** | 单 value 控制 < 100 KB；大对象拆开存 |
| 3 | **`KEYS *` 查 key** | Redis 阻塞几百毫秒，全站超时 | 用 `SCAN` 游标遍历，**永远别在生产用 `KEYS`** |
| 4 | **没设 `maxmemory-policy`** | Redis 内存满 → 写入失败 → 你以为是代码 bug | 配 `allkeys-lru`，并监控内存 |
| 5 | **多实例 + 本地锁** | 3 台机器各锁各的，防击穿失效 | 用 Redis `SET NX` 或不做锁 |
| 6 | **缓存里存了 `IDisposable` / 连接对象** | 反序列化后对象是"空壳"，用起来各种 NRE | **只缓存 DTO，不缓存实体/上下文** |

> **第 6 条特别提醒：** 永远不要缓存 `DbContext`、`HttpClient`、`Stream` 这类东西。**缓存只装"数据"，不装"资源"。**

## 5. 什么时候**必须**上分布式缓存

**四个判断，命中任意一条就该上（否则别上）：**

| 判断 | 说明 |
|---|---|
| **部署了 2 个以上实例** | 内存缓存各存各的，用户看到不同数据 |
| **需要跨实例共享会话/限流计数** | 会话放本地 = 用户刷新跳到另一台就掉线 |
| **缓存数据 > 几百 MB** | 放进程内会 GC 压力大、甚至 OOM |
| **需要缓存"能扛住重启"** | 发一次版缓存全清，冷启动可能打崩数据库 |

**反过来，命中这些就别上：**

| 情况 | 为什么 |
|---|---|
| 单机部署 | 多一跳网络，反而慢 |
| 缓存数据极小（几 MB） | 本地内存足够，没必要多一个组件 |
| 团队没人会运维 Redis | **多一个组件 = 多一个半夜报警的来源** |

---

==二：格式==

## P124 · 缓存空值骨架

```csharp
if (_cache.TryGetValue(key, out BookDetailView? cached))
    return cached;                       // null 也是有效结果，直接返回

var dto = await LoadAsync(id);

_cache.Set(key, dto, new MemoryCacheEntryOptions
{
    // 空值 TTL 短、正常值 TTL 长
    AbsoluteExpirationRelativeToNow = dto is null
        ? TimeSpan.FromSeconds(30)
        : TimeSpan.FromMinutes(5)
});

return dto;
```

## P124 · 布隆过滤器骨架（最小实现）

```csharp
public sealed class SimpleBloomFilter
{
    private readonly BitArray _bits;
    private readonly int _bitCount;
    private readonly int _hashCount;

    public SimpleBloomFilter(int expectedItems, double falsePositiveRate = 0.01)
    {
        // m = -n·ln(p) / (ln2)²
        _bitCount = (int)Math.Ceiling(-expectedItems * Math.Log(falsePositiveRate) / (Math.Log(2) * Math.Log(2)));
        // k = (m/n)·ln2
        _hashCount = Math.Max(1, (int)Math.Round((double)_bitCount / expectedItems * Math.Log(2)));
        _bits = new BitArray(_bitCount);
    }

    public void Add(long id)
    {
        foreach (var pos in Positions(id)) _bits[pos] = true;
    }

    public bool MightContain(long id)
    {
        foreach (var pos in Positions(id))
            if (!_bits[pos]) return false;      // 有一个 0 → 一定不存在
        return true;                            // 全 1 → 可能存在
    }

    private IEnumerable<int> Positions(long id)
    {
        // 用两个不同种子模拟 k 个哈希函数（双重哈希法）
        var h1 = (int)((ulong)id * 2654435761UL % (ulong)_bitCount);
        var h2 = (int)((ulong)id * 40503UL % (ulong)_bitCount) | 1;
        for (int i = 0; i < _hashCount; i++)
            yield return (int)((h1 + (long)i * h2) % _bitCount);
    }
}
```

## P125 · 防击穿骨架（双重检查 + 按 key 的闸）

```csharp
if (_cache.TryGetValue(key, out T? v)) return v!;

var gate = GateOf(key);
await gate.WaitAsync();
try
{
    if (_cache.TryGetValue(key, out v)) return v!;   // ★ 关键
    var value = await loader();
    _cache.Set(key, value, ttl);
    return value;
}
finally { gate.Release(); }
```

## P125 · 逻辑过期骨架

```csharp
public sealed class CacheItem<T> { public T Data { get; set; } = default!; public DateTime ExpireAt { get; set; } }

if (!_cache.TryGetValue(key, out CacheItem<T>? item)) return loader();     // 真没有
if (item.ExpireAt > DateTime.Now) return item.Data;                        // 还新

if (_refreshing.TryAdd(key, 0))
    _ = Task.Run(async () => { /* 后台刷新 */ _refreshing.TryRemove(key, out _); });

return item.Data;      // 先给旧的，不阻塞
```

## P125 · TTL 抖动骨架

```csharp
var offset = ttl.TotalSeconds * 0.2;
var delta = Random.Shared.NextDouble() * 2 * offset - offset;
var real = ttl + TimeSpan.FromSeconds(delta);
```

## P126 · `ICacheService` 注册骨架

```csharp
// 接口在 Core 层
public interface ICacheService { ... }

// Program.cs
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ICacheService, MemoryCacheService>();   // ★ 单例
```

## P127 · 二选一注册（换实现只改这一行）

```csharp
// 方案 A：本地内存版（单机、学习、测试）
builder.Services.AddDistributedMemoryCache();

// 方案 B：Redis（多实例生产）
builder.Services.AddStackExchangeRedisCache(o =>
{
    o.Configuration = builder.Configuration.GetConnectionString("Redis");
    o.InstanceName = "BookStore:";
});
```

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379,abortConnect=false,connectTimeout=2000,syncTimeout=2000"
  }
}
```

## P128 · 分布式封装骨架（读懂这三段 catch）

```csharp
try { var bytes = await _cache.GetAsync(key); ... }
catch (Exception ex) when (ex is RedisConnectionException or TimeoutException or JsonException)
{ _log.LogWarning(ex, "读缓存失败"); return default; }        // 降级

try { await _cache.SetAsync(key, bytes, opts); }
catch (Exception ex) { _log.LogWarning(ex, "写缓存失败"); }    // 不影响主流程
```

## 布隆过滤器容量速查

| 元素数 | 误判率 1% | 误判率 0.1% |
|---|---|---|
| 10 万 | 0.11 MB（k=7） | 0.17 MB（k=10） |
| 100 万 | 1.14 MB（k=7） | 1.71 MB（k=10） |
| 1000 万 | 11.4 MB（k=7） | 17.1 MB（k=10） |

```csharp
// 不想算？用这个近似：p=1% 时 每 100 万元素约 1.2 MB
var bytes = (long)(expectedItems * 1.2 / 8 * 1024 * 1024 / 1_000_000);
```

---

==三：代码==

## 3.1 并发实验：亲眼看到 20 次 vs 1 次（可直接跑）

**这是整批最值得亲手跑一次的代码。**

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Demo;

[ApiController]
[Route("lab")]
public class HerdController : ControllerBase
{
    private static readonly SemaphoreSlim _lock = new(1, 1);
    private readonly IMemoryCache _cache;
    public HerdController(IMemoryCache cache) => _cache = cache;

    private static async Task<string> SlowLoad(Action onCall)
    {
        onCall();
        await Task.Delay(300);          // 模拟一次 300ms 的查库
        return "payload";
    }

    // ① 不保护
    [HttpGet("naive")]
    public async Task<object> Naive()
    {
        var key = "hot:" + Guid.NewGuid();
        int calls = 0;

        await Task.WhenAll(Enumerable.Range(0, 20).Select(i => Task.Run(async () =>
        {
            if (_cache.TryGetValue(key, out _)) return;
            var v = await SlowLoad(() => Interlocked.Increment(ref calls));
            _cache.Set(key, v, TimeSpan.FromMinutes(1));
        })));

        return new { 并发 = 20, 回源次数 = calls };
    }

    // ② 加锁 + 双重检查
    [HttpGet("locked")]
    public async Task<object> Locked()
    {
        var key = "hot:" + Guid.NewGuid();
        int calls = 0, entered = 0, hitSecond = 0;

        await Task.WhenAll(Enumerable.Range(0, 20).Select(i => Task.Run(async () =>
        {
            if (_cache.TryGetValue(key, out _)) return;
            await _lock.WaitAsync();
            try
            {
                Interlocked.Increment(ref entered);
                if (_cache.TryGetValue(key, out _)) { Interlocked.Increment(ref hitSecond); return; }
                var v = await SlowLoad(() => Interlocked.Increment(ref calls));
                _cache.Set(key, v, TimeSpan.FromMinutes(1));
            }
            finally { _lock.Release(); }
        })));

        return new { 并发 = 20, 进锁 = entered, 二次命中 = hitSecond, 回源次数 = calls };
    }
}
```

**`Program.cs`：**

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddMemoryCache();
var app = builder.Build();
app.MapControllers();
app.Run();
```

**✅ 实测输出：**

```
GET /lab/naive   → {"并发":20,"回源次数":20}
GET /lab/locked  → {"并发":20,"进锁":20,"二次命中":19,"回源次数":1}
```

> **⚠️ 跑这个实验时，注意 `Select(i => ...)` 里的参数名不要用 `_`**（见概念 P126 · 5 那个坑）。
> **如果你写成 `Select(_ => ...)` 又用 `out _`，你会得到 `二次命中 = 0`——不是锁没用，是 `out _` 绑定错了。**

## 3.2 布隆过滤器完整实现（能放进你的项目）

```csharp
using System.Collections;

namespace ASP.NET_Core__图书管理系统.Services;

public sealed class SimpleBloomFilter
{
    private readonly BitArray _bits;
    private readonly int _bitCount;
    private readonly int _hashCount;

    public int BitCount => _bitCount;
    public int HashCount => _hashCount;
    public double MemoryKb => Math.Round(_bitCount / 8.0 / 1024, 2);

    public SimpleBloomFilter(int expectedItems, double falsePositiveRate = 0.01)
    {
        if (expectedItems <= 0) throw new ArgumentOutOfRangeException(nameof(expectedItems));

        _bitCount = (int)Math.Ceiling(
            -expectedItems * Math.Log(falsePositiveRate) / (Math.Log(2) * Math.Log(2)));
        _hashCount = Math.Max(1, (int)Math.Round((double)_bitCount / expectedItems * Math.Log(2)));
        _bits = new BitArray(_bitCount);
    }

    public void Add(long id)
    {
        foreach (var pos in Positions(id)) _bits[pos] = true;
    }

    public bool MightContain(long id)
    {
        foreach (var pos in Positions(id))
            if (!_bits[pos]) return false;
        return true;
    }

    private IEnumerable<int> Positions(long id)
    {
        var h1 = (int)((ulong)id * 2654435761UL % (ulong)_bitCount);
        var h2 = (int)((ulong)id * 40503UL % (ulong)_bitCount) | 1;   // |1 保证非 0，避免步长退化
        for (int i = 0; i < _hashCount; i++)
            yield return (int)((h1 + (long)i * h2) % _bitCount);
    }
}
```

| 符号 | 作用 |
|---|---|
| `BitArray` | .NET 内置位数组，**1 亿位只占 12.5 MB**（每字节 8 位），比 `bool[]` 省 8 倍 |
| `% _bitCount` | 把哈希值映射到位数组下标 |
| `| 1` | 保证第二个哈希是奇数，**否则 `h1 + i*h2` 可能始终落在少数几个位置**，误判率暴涨 |

**在启动时预热（图书 ID 是"只增不删"的典型）：**

```csharp
public sealed class BookBloomFilter
{
    private readonly SimpleBloomFilter _filter;
    public BookBloomFilter(BookContext ctx)
    {
        var count = Math.Max(1000, ctx.Books.Count() * 2);       // 预留 2 倍增长空间
        _filter = new SimpleBloomFilter(count, 0.01);
        foreach (var id in ctx.Books.Select(b => b.Id).ToList())
            _filter.Add(id);
    }
    public bool MightExist(long id) => _filter.MightContain(id);
}
```

**用在查询入口：**

```csharp
if (!_bloom.MightExist(id))
    return NotFound();                       // ★ 100% 确定不存在，一次库都不用查

var dto = await _cacheService.GetOrCreateAsync($"book:{id}", ct => LoadAsync(id), ...);
```

> **⚠️ 新增图书后必须 `_bloom.Add(newId)`**，否则新书会被判定为"不存在"。删书不用管（布隆过滤器只能"多地误判"，不会"少地误判"——**删了之后它还认为"可能存在"，只是白查一次库，不会错杀**）。

## 3.3 把 `ICacheService` 用到你的统计接口

**`Program.cs`：**

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<BookContext>(...);
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ICacheService, MemoryCacheService>();   // 通用缓存
builder.Services.AddScoped<BookStatsCache>();                          // 业务缓存
```

**`BookStatsCache` 改写后（比上一批的版本少了一半代码）：**

```csharp
public class BookStatsCache
{
    private readonly BookContext _ctx;
    private readonly ICacheService _cache;
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    public BookStatsCache(BookContext ctx, ICacheService cache) { _ctx = ctx; _cache = cache; }

    public Task<List<CategoryStat>> GetByCategoryAsync(CancellationToken ct = default)
        => _cache.GetOrCreateAsync("stats:by-category", async token =>
        {
            var rows = await _ctx.Books.AsNoTracking()
                .GroupBy(b => b.CategoryId)
                .Select(g => new { CategoryId = g.Key, Cnt = g.Count(), Avg = g.Average(b => b.Price), Max = g.Max(b => b.Price) })
                .ToListAsync(token);

            var names = await _ctx.Categories.AsNoTracking()
                .ToDictionaryAsync(c => c.Id, c => c.Name, token);

            return rows.OrderByDescending(r => r.Cnt).Select(r => new CategoryStat
            {
                CategoryId = r.CategoryId,
                CategoryName = r.CategoryId == null ? "（未分类）"
                             : names.GetValueOrDefault(r.CategoryId.Value, "（分类已删除）"),
                Cnt = r.Cnt,
                AvgPrice = r.Avg,
                MaxPrice = r.Max
            }).ToList();
        }, Ttl, ct: ct);

    public Task InvalidateAsync(CancellationToken ct = default)
        => Task.WhenAll(
            _cache.RemoveAsync("stats:by-category", ct),
            _cache.RemoveAsync("stats:by-author", ct));
}
```

**改动对比：**

| | 上一批（裸 `IMemoryCache`） | 这一批（`ICacheService`） |
|---|---|---|
| 防击穿 | ❌ 无 | ✅ 内置 |
| TTL 抖动 | ❌ 无 | ✅ 内置 |
| 防穿透 | ❌ 无 | ✅ 可选 `cacheNull` |
| 换 Redis | 要改业务代码 | **改一行注册** |
| 代码行数 | ~45 | ~30 |

## 3.4 在内存 / Redis 之间切换（不改编业务代码）

```csharp
// Program.cs —— 用配置开关决定用哪个
var useRedis = builder.Configuration.GetValue<bool>("Cache:UseRedis");

if (useRedis)
{
    builder.Services.AddStackExchangeRedisCache(o =>
    {
        o.Configuration = builder.Configuration.GetConnectionString("Redis");
        o.InstanceName = "BookStore:";
    });
    builder.Services.AddSingleton<ICacheService, DistributedCacheService>();
}
else
{
    builder.Services.AddDistributedMemoryCache();
    builder.Services.AddSingleton<ICacheService, DistributedCacheService>();   // 同一个实现！
}
```

**注意最后一行：两种实现用的是同一个 `DistributedCacheService`。** 因为 `AddDistributedMemoryCache()` 也实现了 `IDistributedCache`——**你的封装只针对接口，不针对 Redis。**

```json
{
  "Cache": { "UseRedis": false },
  "ConnectionStrings": { "Redis": "localhost:6379,abortConnect=false" }
}
```

> **这就是"面向接口"在生产里的真实价值：** 开发用内存（零依赖），上线切 Redis（改一个 `true`），中间不需要回归测试业务逻辑。

## 3.5 验收清单：怎么证明"防击穿真的生效了"

| # | 验证项 | 怎么做 | 通过标准 |
|---|---|---|---|
| 1 | 缓存命中 | 连调两次，看 EF 日志（`LogTo(Console)`） | **第二次没有 SQL** |
| 2 | 防击穿 | 跑 3.1 的 `/lab/locked` | 回源次数 = **1** |
| 3 | 防穿透 | 调 `books/-1` 10 次 | **只有第 1 次有 SQL** |
| 4 | 抖动生效 | 打日志输出 `ExpireAt`，连续写 10 个 key | 过期时间**分散**，不是同一秒 |
| 5 | 缓存失效 | 调 `price-up` 后再调统计 | **数字立刻变**（不是 5 分钟后才变） |
| 6 | Redis 降级 | 停掉 Redis，再调接口 | 接口**仍返回 200**（日志有 warning，速度慢一点） |

**第 6 项是你上线前必须做一次的演练。** 大多数团队从来没试过"Redis 挂了会怎样"，直到它真的挂。

---

==四：总结==

## 4.1 五节核心结论

| 节 | 一句话结论 |
|---|---|
| **P124 穿透** | 库里没有的数据**永远缓存不住**；先参数校验，再缓存空值（短 TTL），数据量大才上布隆过滤器 |
| **P125 雪崩/击穿** | 击穿是**一个热点**过期，雪崩是**一大片**同时没了；击穿用锁/逻辑过期，雪崩用抖动/多级/熔断 |
| **P126 封装内存缓存** | 封装的目的不是少写代码，是**让"忘了加抖动""忘了防击穿"变成不可能** |
| **P127 分布式缓存** | `IDistributedCache` 只存 `byte[]`，**必须序列化**；延迟比内存高 50 倍，所以要多级 |
| **P128 封装分布式缓存** | 所有操作都要**能失败且不影响主流程**：连接断、超时、反序列化失败，三种异常全吞掉 |

## 4.2 线上出问题时，按这个顺序排查

```
数据库 CPU 突然 100%
   │
   ├─ ① 看是不是"同一个 key"在打？
   │     → 是 → 击穿（热点过期）→ 查这个 key 的 TTL 与预热逻辑
   │
   ├─ ② 看是不是"大量 key 同时没了"？
   │     → 是 → 雪崩（TTL 相同 / 重启 / Redis 挂了）→ 查 TTL 分布、重启记录、Redis 监控
   │
   └─ ③ 看是不是"查询的 id 都不存在"？
         → 是 → 穿透（遍历攻击）→ 查访问日志的 key 分布、加限流/布隆过滤器
```

**三步里最有用的第一步：先分清是哪一个。** 三个的解法完全不同，搞混就是白改。

## 4.3 布隆过滤器速查

| 项 | 值 |
|---|---|
| 内存（1% 误判，100 万元素） | **约 1.2 MB** |
| 计算公式 | `m = -n·ln(p)/(ln2)²`，`k = (m/n)·ln2` |
| 能否删除元素 | ❌ **不能**（要删就重建，或用计数布隆） |
| 误判方向 | **只会"说有其实没有"，不会"说没有其实有"** |
| 适合 | 只增不删的 ID 集合（用户、图书、订单号） |
| 不适合 | 会删的数据、元素数波动大的场景、元素很少（< 1 万，直接 `HashSet` 更快） |

## 4.4 内存 vs 分布式：一句话选型

| 你的情况 | 选 |
|---|---|
| 单机 / 开发 / 测试 | `IMemoryCache` |
| 多实例 / 要共享会话 / 缓存 > 几百 MB | `IDistributedCache` + Redis |
| 既要快又要共享 | **两级**（本地 L1 + Redis L2） |

## 4.5 记忆口诀

```
三大问题：
  穿透——查不存在的，库里就没有，缓存也存不住 → 校验 + 空值 + 布隆
  击穿——一个热点过期的那一下 → 加锁（记得二次检查）
  雪崩——一大片同时没了 → 抖动

防击穿三件套：
  先查缓存，再抢闸，闸内再看一眼

失效策略：
  要新鲜就加锁让人等，要快就逻辑过期给旧的

分布式缓存：
  只存 byte[]，必须序列化，网络会断所以必须能降级

布隆过滤器：
  说"没有"一定没有，说"有"可能没有；只增不删
```

## 4.6 八个易错点（含一个我实测踩到的）

| # | 易错点 | 后果 | 正确做法 |
|---|---|---|---|
| 1 | `Select(_ => ...)` 里用 `out _` | **`out _` 绑到 lambda 参数**，走泛型重载，缓存命中被判成未命中 | lambda 参数别叫 `_`；或显式 `out object? _` |
| 2 | 加了锁但**没有二次检查** | 锁只让 20 个请求排队，**回源还是 20 次** | 锁内、回源前，再查一次缓存 |
| 3 | `Release()` 没放 `finally` | loader 一抛异常 → **永久死锁** | 必须 `try/finally` |
| 4 | 空值 TTL 和正常值一样长 | 攻击者用垃圾 key 把正常缓存挤出去 | 空值 TTL 用 30 秒 |
| 5 | 用 `value == null` 判断"有没有缓存" | 缓存了 null 也当成未命中 → 每次都回源 | 用 `TryGetValue` 的**返回值**判断 |
| 6 | 分布式缓存用 `DateTime.Now` 做绝对过期 | 早 8 小时过期（UTC 差） | 用 `...RelativeToNow` 或 `DateTimeOffset.UtcNow` |
| 7 | 缓存里存了 `DbContext` / `Stream` | 反序列化出来是空壳，满屏 NRE | **只缓存 DTO** |
| 8 | `RedisConnection` 没配 `abortConnect=false` | Redis 没起来 → **应用启动直接失败** | 连接串必须带这个参数 |

## 4.7 你下一步可以做的三件事

| # | 做什么 | 预期收获 |
|---|---|---|
| 1 | 跑 3.1 的并发实验（`naive` vs `locked`） | 看到 `20 → 1`，理解"双重检查"到底在防什么 |
| 2 | 把 `BookStatsCache` 换成走 `ICacheService` | 以后换 Redis 只改一行，业务不动 |
| 3 | **停掉 Redis（或用错连接串）调一次接口** | 看到降级日志 + 接口仍 200，你就明白"缓存不能是单点" |

## 4.8 留给下一批的问题（P129–P130）

1. `IConfiguration` 是怎么把 `appsettings.json`、环境变量、命令行参数合并成一份的？
2. 为什么"生产环境的连接串"不能写进 `appsettings.json`？
3. 提交到 GitHub 的密码/密钥，删掉那个 commit 就安全了吗？（**不是**）
4. `dotnet user-secrets` 是怎么做到"本机能读到、仓库里看不到"的？
5. 生产环境用什么？环境变量、Azure Key Vault、还是自建配置中心？
6. `.gitignore` 里到底该忽略哪些配置相关的文件？

**这六个问题是"上线前最后一公里"：配置怎么分层、密钥怎么不进仓库。P130 那个"删了 commit 也不安全"是最容易被忽视的一条——你会在里面看到 GitHub 上真实发生过的事故。**


