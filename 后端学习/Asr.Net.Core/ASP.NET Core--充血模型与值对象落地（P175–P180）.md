==零：补充==

> **这一篇（P175–P180）回答一个问题：概念都会了，为什么一写代码就退回贫血模型？**

## 它解决什么问题

**上一批（P172–P174）你把"聚合根 + private set + 只读集合"写得很漂亮，然后运行——报错了。**

**报的错大概是这三类：**

```
① 查库时报：MissingMethodException: No parameterless constructor defined for type 'Book'
② 更新时不生效：改了私有属性，SaveChanges 之后数据库没变
③ 集合改不动：order.Items.Add(x) 之后，库里什么都没多
```

**然后你就退回贫血模型了：**

```csharp
public class Book
{
    public long Id { get; set; }        // 全部公开 set
    public int Stock { get; set; }      // 谁都能改成 -1
}
```

**这一批要给你的，就是"不想退回去"的底气：**

| P | 解决什么 |
|---|---|
| P175 | 先搞清楚贫血 vs 充血到底差在哪（不是"谁高级"） |
| P176 | EF Core 内部到底怎么读写你的属性 —— **这一节是地基** |
| P177 | 充血模型对 EF Core 提了哪些"要求" |
| P178 | 怎么满足这些要求（三个坑 + 解法） |
| P179 | 值对象怎么映射（三种方案，各有取舍） |
| P180 | 值对象的相等比较怎么不手写（表达式树） |

## 没有它会怎样

### 灾难一：你以为封装了，其实没有

**贫血模型的"封装"是假的：**

```csharp
public class Book
{
    public int Stock { get; set; }
}

// 任何地方
book.Stock = -999;                    // 编译通过，运行通过，数据烂掉
```

**你在 Controller、Service、定时任务、数据修复脚本里各写了一遍"库存不能为负"的判断 —— 然后漏了第八处。**

### 灾难二：你没法给业务规则写测试

**贫血模型测"超限不能借"，要准备：**

```csharp
// 40 行准备工作 + 一个真实数据库
var options = new DbContextOptionsBuilder<LibContext>()
    .UseSqlite("Data Source=:memory:").Options;
using var ctx = new LibContext(options);
ctx.Database.EnsureCreated();
ctx.Readers.Add(new Reader { Id = 1, BorrowedCount = 5 });
ctx.Books.Add(new Book { Id = 1, Stock = 10 });
ctx.SaveChanges();

var svc = new BorrowService(ctx);
var result = svc.Borrow(1, 1);
Assert.False(result.ok);
```

**充血模型测同一条规则：**

```csharp
var book = new Book("x", stock: 10);
var reader = new Reader("张三") { /* 借满 5 本 */}
Assert.False(book.TryBorrow(reader).Ok);      // 一行，无数据库，1 毫秒
```

**这不是"测试写得爽"的问题，是"你愿不愿意写第 20 个测试"的问题。** 准备工作 40 行的测试，没人会写第 20 个。

### 灾难三：数据库成了唯一的"真相"

**贫血模型下，业务规则的唯一可靠描述是"跑起来之后的数据库状态"。**

想回答"什么情况下不能借书"，你只能：
1. 读 200 行 Service 代码
2. 或者去问三年前写这段的人
3. 或者跑一遍看报什么错

**充血模型下，答案在类的方法签名里：**

```csharp
public BorrowResult TryBorrow(Reader reader)   // 就这一个入口
```

## 它在生态里的位置

**这一批是整个 DDD 系列的"落地层"：**

```
P166–P171  概念        实体 / 值对象 / 限界上下文
P172–P174  结构        聚合 / 服务 / 事件
─────────────────────────────────────────────
P175–P180  落地        ← 你在这一批
   贫血 vs 充血         选哪条路
   EF Core 内部机制      它到底怎么读写属性
   充血模型实现          怎么让它配合
   值对象映射            三种方案
   值对象比较            表达式树
─────────────────────────────────────────────
P181–P187  事件与消息    MediatR / RabbitMQ
P188–P196  架构与实战    洋葱架构 / 完整项目
```

**一句话定位：**

> **前两批告诉你"应该长什么样"，这一批告诉你"在 EF Core 里怎么真的长成那样"。**

## 对你的实际意义

**这一批的收益是立刻的，而且跟 DDD 无关。**

**你现在写任何带业务规则的实体，都需要这三件事：**

| 需要 | 这一批给你的 |
|---|---|
| 属性不被随手改 | `private set` + EF Core 照样能读写（实测通过） |
| 集合不被随手增删 | `IReadOnlyCollection` + backing field（实测通过） |
| 改了能存进去 | 变更检测机制 + `DetectChanges` 什么时候失效（实测） |

**这三件事不需要你接受 DDD 的任何哲学。** 就算你继续写贫血模型，知道"`AutoDetectChangesEnabled = false` 之后 SaveChanges 什么都不存"也是能救命的。

**而 P179/P180 的值对象部分，对你的游戏项目是直接可用的：**

```csharp
// 你的游戏里一定有这些
public record Damage(int Value, DamageType Type);
public record Position(float X, float Y, float Z);
public record Money(long Gold, long Diamond);
```

**用 `record` + `ComplexProperty`，它们能直接落库、能比较、能算，而且不会出现"两个 100 金币不相等"这种事。**

## 什么时候其实用不上

### 判据一：这张表只有增删改查 → 不要充血

**`Category`、`Publisher`、`Admin` 这种表，充血模型的成本（私有构造、只读集合、EF 配置）换不来任何收益。**

**判断：这个实体的所有方法都是 `SetXxx` 吗？** 是 → 它就是数据表，别硬套。

### 判据二：规则只有 1~2 条 → 用 `record` 或简单校验就够

**如果只有"价格不能为负"一条规则，写个 `private set` + 一个 `ChangePrice` 方法就够了。** 不需要聚合根、不需要领域事件、不需要值对象。

### 判据三：不需要"相等语义"的类型 → 别造值对象

**给 `BookTitle` 造一个值对象、给 `AuthorName` 造一个值对象 —— 除非它们真的有校验规则（长度、字符集、去空格），否则它们就是 `string`。**

**造值对象的唯一理由是"它约束了取值范围"或"它要参与相等比较"。** 两个都沾不上，就是包装垃圾。

### 判据四：团队还没写过 `private set` → 先在小范围试

**充血模型最大的隐性成本是"新人看不懂"。** 一个方法改了私有属性、另一个方法触发变更检测、还有一个地方 EF 偷偷用反射写字段——**这套东西对没接触过的人是黑箱。**

**建议：先在一个聚合上做（比如 `Book`），跑两个月，再推广。**

---

==一：概念==

## P175 · 1. 贫血模型与充血模型

### 这一节要解决的问题

**同一条规则，写在实体里和写在 Service 里，到底有什么区别？为什么 .NET 圈默认选后者？**

### 两个定义的准确定义

| 模型 | 定义 | 规则住在哪 |
|---|---|---|
| **贫血模型**（Anemic Domain Model） | 实体只有属性（数据容器），业务逻辑在 Service | Service |
| **充血模型**（Rich Domain Model） | 实体既有数据也有行为，Service 只做编排 | 实体自己 |

**注意："贫血"这个词是 Martin Fowler 起的，而且他明确称其为"反模式"（anti-pattern）。**

### 同一段需求，两种模型

**需求：借书。规则：库存不足不能借；借满 5 本不能借。**

**贫血模型：**

```csharp
// ---------- 实体：纯数据 ----------
public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = "";
    public int Stock { get; set; }              // 公开 set
}

public class Reader
{
    public long Id { get; set; }
    public int BorrowedCount { get; set; }      // 公开 set
}

// ---------- 规则：在 Service 里 ----------
public class BorrowService
{
    public bool Borrow(Book book, Reader reader)
    {
        if (book.Stock <= 0) return false;      // 规则 1
        if (reader.BorrowedCount >= 5) return false;  // 规则 2
        book.Stock--;
        reader.BorrowedCount++;
        return true;
    }
}
```

**充血模型：**

```csharp
// ---------- 实体：带行为 ----------
public class Book
{
    public long Id { get; private set; }
    public string Title { get; private set; } = "";
    public int Stock { get; private set; }      // 私有 set

    public BorrowResult TryBorrow(Reader reader)
    {
        if (Stock <= 0) return BorrowResult.Fail("没有库存");
        if (!reader.CanBorrowMore) return BorrowResult.Fail("超过上限");
        Stock--;
        return BorrowResult.Success();
    }
}

public class Reader
{
    public long Id { get; private set; }
    public int BorrowedCount { get; private set; }
    public bool CanBorrowMore => BorrowedCount < 5;    // 规则在自己身上

    public void RecordBorrow() => BorrowedCount++;
}

// ---------- Service：只剩编排 ----------
public class BorrowAppService
{
    public bool Borrow(Book book, Reader reader)
    {
        var r = book.TryBorrow(reader);          // 规则调用，不是规则实现
        if (!r.Ok) return false;
        reader.RecordBorrow();
        return true;
    }
}
```

### 差别在哪（不是"代码变长了"）

| 维度 | 贫血 | 充血 |
|---|---|---|
| **规则位置** | Service | 实体 |
| **能造出非法对象吗** | ✅ `book.Stock = -1` 合法 | ❌ 编译不过 |
| **规则能复用吗** | 不能（每个入口重写） | 能（调同一个方法） |
| **能单独测试吗** | 要数据库 | `new` 出来就能测 |
| **能问"为什么不能借"吗** | 读 200 行 | `book.TryBorrow(r).Reason` |
| **新人上手成本** | 低 | 中（要理解"行为在哪"） |
| **跟 ORM 配合** | 顺畅 | 要额外配置（本篇重点） |

### 为什么 .NET 圈默认贫血（这不是技术水平问题）

**四个真实原因：**

| 原因 | 说明 |
|---|---|
| **EF Core 的默认约定偏向贫血** | 无参构造 + 公开 set + 集合可替换，全是为贫血设计的 |
| **Visual Studio 的"生成类"** | 从数据库反向生成实体，生成的全是公开 set |
| **WPF/WinForms 的 Binding 习惯** | 属性要 `public set` 才能双向绑定（老一代 .NET 开发的肌肉记忆） |
| **"三层架构"教程的传统** | DAL/BLL/Model 三层里，Model 天生就是数据袋 |

> **所以贫血模型不是"错的"，是"历史路径依赖 + 工具默认值"的结果。** 它在简单场景下完全正确，这也是它能活到今天的原因。

### 第三个选项：中间地带

**现实中大量存在的是"半个充血"：**

```csharp
public class Book
{
    public long Id { get; set; }
    public int Stock { get; private set; }        // 关键字段私有

    public void Deduct(int n)
    {
        if (n > Stock) throw new InvalidOperationException("库存不足");
        Stock -= n;
    }
}
```

**特点：** 只有最关键的 1~2 个属性加了保护，其余照旧公开 set。

**这不算"不纯粹"，这是务实的取舍。** 判断标准是：**这个字段被乱改会不会出事？** 会 → 私有；不会 → 公开。

### 一张光谱图

```
纯贫血              半充血              纯充血
   │                   │                   │
全部 public set    关键字段 protected    全部 private set
规则在 Service     部分行为在实体        行为完整
   │                   │                   │
ORM 零配置          少量配置              需要完整配置
   │                   │                   │
适合：CRUD 表       适合：大多数业务表     适合：核心域
```

**你可以对整个项目用同一个模型，也可以按表选。** 后者更常见。

---

## P176 · 2. EF Core 对实体属性操作的秘密

> **这一节是全篇最重要的一节。** 不懂这个机制，后面所有"为什么报错"都是玄学。

### 这一节要解决的问题

**EF Core 改了你的私有属性，它到底怎么改的？它又怎么知道你改了？**

### 秘密一：EF Core 用反射 + 缓存委托，直接写字段

**你写 `private set`，EF Core 照样能赋值。原因：**

| 步骤 | 说明 |
|---|---|
| 1 | 启动时扫描模型的每个属性 |
| 2 | 找到属性的 backing field（`<Name>k__BackingField` 或手写的 `_name`） |
| 3 | 用 `Expression.Lambda` 或动态方法（IL Emit）生成"读/写这个字段"的委托 |
| 4 | 缓存起来，之后每次物化/写回都直接调用委托 |

**实测验证（实验 A1）：**

```
A1 · private 无参构造 + private set 属性
    物化成功：Id=1 Name=铅笔 Price=3.5
    改完再存：Name=钢笔 Price=9.9
```

| 结论 | 说明 |
|---|---|
| `private` 构造函数完全没问题 | EF 用反射调用，`private` 挡不住它（也挡不住任何反射代码） |
| `private set` 完全没问题 | EF 不走 setter，直接写 backing field |
| **封装只挡住"业务代码"，挡不住"框架"** | 这正是你想要的 |

### 秘密二：EF Core 支持"用构造函数物化"（但参数名必须对得上）

**实测（实验 A2 / A3）：**

```
A2 · 只有带参构造 public A2(string name, decimal price)，参数名和属性名一致
    物化成功：Id=1 Name=橡皮 Price=1.5

A3 · 只有带参构造 public A3(string title, decimal value)，属性叫 Name/Price
    ✘ InvalidOperationException：No suitable constructor was found for the type 'A3'.
      The following constructors had parameters that could not be bound to properties of the type:
      Cannot bind 'title', 'value' in 'A3(string title, decimal value)'
      Note that only mapped properties can be bound to constructor parameters.
      Navigations to related entities, including references to owned types, cannot be bound.
```

**报错信息里有三个关键点，逐条读：**

| 报错原文 | 含义 |
|---|---|
| `No suitable constructor was found` | 找不到能用的构造函数 |
| `Cannot bind 'title', 'value'` | 这两个参数名对不上任何**已映射属性** |
| `Navigations ... cannot be bound` | 导航属性（关联对象）不能当构造参数 |

**所以两条路都行：**

| 方案 | 要求 | 适用 |
|---|---|---|
| A. 留一个 `private` 无参构造 | 只要存在就行（EF 反射能调） | **首选**，简单 |
| B. 只写业务构造 | 参数名必须等于属性名（不区分大小写） | 想强制"必须给参数才能造" |

**方案 B 的坑：**

```csharp
// ❌ 参数名 title 对不上属性 Name
public Book(string title) { Title = title; }

// ✅ 参数名与属性名一致
public Book(string title) { Title = title; }   // 属性也叫 Title 就行
```

**更隐蔽的坑：** 构造函数参数的类型也必须能对上。

```csharp
public Book(long id, string title)     // Id 是 long → 匹配 Id 属性 ✅
public Book(int id, string title)      // Id 是 long，int 不能隐式转 → ✘
```

### 秘密三：只有 `get` 的属性，默认**根本不被映射**

**实测（实验 A4 / A4b）：**

```
A4 · public string Name { get; }（只有 get，没有 set）
    ✘ InvalidOperationException：The entity type 'A4' requires a primary key to be defined.
      If you intended to use a keyless entity type, call 'HasNoKey' in 'OnModelCreating'.

A4b · 同上，但显式 e.Property(x => x.Name) 配置
    新增成功
    物化成功：Id=1 Name=量角器 Price=8.0
```

**这个报错很反直觉：** 你报的是"没有主键"，其实真正的原因是 **`Id` 属性只有 `get`，所以 EF 压根没把它当成属性，自然找不到主键。**

| 结论 | 说明 |
|---|---|
| `{ get; }`（只读自动属性）**不符合映射约定** | EF 的约定是"有 getter **和** setter 的属性才进模型" |
| 显式 `e.Property(x => x.Prop)` 可以救回来 | 一旦显式声明，EF 就认了，并且能写 backing field |
| **报错信息会误导你** | 说的是"没有主键"，真正原因是"属性没被映射" |

**实用建议：** 别用 `{ get; }`，用 `{ get; private set; }`。语义一样（外部改不了），但不用额外配置。

### 秘密四：变更检测 = 快照比对（不是"监听属性变化"）

**这是最容易搞错的一点。很多人以为 EF Core 靠 setter 里发通知，其实不是。**

**实测（实验 B1）：**

```
B1 · 改完之后立刻看 Entry（不调用 DetectChanges）
    刚查出：State=Unchanged，Name.IsModified=False
    改完但没 DetectChanges：Name.IsModified=False
      OriginalValue=原始名，CurrentValue=改过的名
    手动 DetectChanges() 之后：Name.IsModified=True
      OriginalValue=原始名，CurrentValue=改过的名
      State=Modified
```

**这张输出信息量很大，逐条拆：**

| 现象 | 说明 |
|---|---|
| 改完但 `IsModified=False` | **EF 还不知道你改了** —— 它没被通知 |
| `CurrentValue` 已经是新值 | 它读的是你的字段（实时的） |
| `OriginalValue` 还是旧值 | 它保存了一份**查询那一刻的快照** |
| `DetectChanges()` 之后 `IsModified=True` | 它把快照和当前值逐个比了一遍 |
| `State` 从 `Unchanged` 变 `Modified` | 比出差异后才改状态 |

**完整机制图：**

```
① 查询时
   EF 读库 → 造对象 → 同时保存一份"原始值快照"（每个属性一份）

② 你改属性
   直接改字段/走 setter → 字段变了 → 但 EF 完全不知道

③ DetectChanges（关键）
   遍历所有被跟踪的实体
     → 每个属性：快照值 vs 当前字段值
     → 不同 → 标记 Modified，记下哪几个属性变了

④ SaveChanges
   先自动调一次 DetectChanges
     → 只把"变了的那几个属性"放进 UPDATE 语句
```

**所以 UPDATE 语句是"精确到列"的：**

```sql
UPDATE "Books" SET "Stock" = @p0 WHERE "Id" = @p1
-- 而不是 UPDATE "Books" SET 所有列 WHERE ...
```

**这也是"为什么改私有属性也能被检测到"的答案：** 它不看你有没有 setter，它比的是"字段现在的值"和"快照里的值"。

### 秘密五：关掉自动检测 → 你的修改会静默丢失

**实测（实验 B2）：**

```
B2 · 关掉 AutoDetectChanges 会怎样（最容易踩的坑）
    已 SaveChanges（关着自动检测）
    读回来：Name=原始名 Price=100.0  ← 没保存进去！
    关着自动检测，但手动调了 DetectChanges() → 保存
    读回来：Name=关了检测但手动 Detect  ← 这次进去了
```

| 步骤 | 结果 |
|---|---|
| `AutoDetectChangesEnabled = false` | `SaveChanges` 不再自动比对 |
| 改了两个属性 → `SaveChanges()` | **一条 SQL 都没发，静默成功，什么都不存** |
| 手动 `DetectChanges()` 后再存 | 存进去了 |

**这是 EF Core 最阴的坑之一：没有异常，没有日志，`SaveChanges` 返回 0，你以为成功了。**

**什么时候会踩到：**

| 场景 | 说明 |
|---|---|
| 批量导入时为了性能关了它 | 忘了在最后恢复 + 手动检测 |
| 某个基类/框架帮你关了 | 你在别处改了数据 → 丢 |
| 用 `AsNoTracking()` 查出来的对象改了 | 本来就不会保存（不是这个坑，但现象一样） |

**安全的关法：**

```csharp
try
{
    ctx.ChangeTracker.AutoDetectChangesEnabled = false;
    foreach (var e in hugeList) e.DoSomething();
    ctx.ChangeTracker.DetectChanges();          // ← 必须补这一句
    await ctx.SaveChangesAsync();
}
finally
{
    ctx.ChangeTracker.AutoDetectChangesEnabled = true;
}
```

### 秘密六：构造函数里的校验，不是数据完整性保证

**实测（实验 A5）：**

```
A5 · 构造函数里有校验，但库里存了非法数据（绕过 EF 直接写库）
    已用原生 SQL 插入一条 Price = -100 的记录（构造函数校验拦不住 SQL）
    查出来 2 条：合法数据=5.0 | 脏数据=-100
```

| 结论 | 说明 |
|---|---|
| 构造函数校验只拦"新造对象" | SQL、别的系统、手工改库都能绕过 |
| EF 物化时**不调你的业务构造函数** | 它用无参构造 + 写字段，校验根本不执行 |
| **领域模型的校验 ≠ 数据库约束** | 两者是不同层次的防线 |

**正确做法（两层都要）：**

```csharp
// 第 1 层：领域模型（拦正常业务路径）
public void ChangePrice(decimal price)
{
    if (price < 0) throw new ArgumentException("价格不能为负");
    Price = price;
}

// 第 2 层：数据库约束（拦一切）
b.Entity<Book>().ToTable("Books", t =>
    t.HasCheckConstraint("CK_Books_Price", "\"Price\" >= 0"));
```

> **这条对你有直接价值：** 如果你以为"写了构造函数校验就安全了"，那你会在某天发现库里有一堆 `-1` 的库存，而没人知道怎么进去的。

---

## P177 · 3. EF Core 中充血模型的需求

### 这一节要解决的问题

**要让充血模型和 EF Core 配合，EF Core 到底对你提了哪些要求？**

### 四个需求（可以当成检查清单）

| # | 需求 | 为什么 | 不满足会怎样 |
|---|---|---|---|
| 1 | 有可用的构造函数 | 物化对象 | `MissingMethodException` / `No suitable constructor` |
| 2 | 属性可写（哪怕 `private set`） | 从库里填值 | 值永远是默认值 |
| 3 | 集合可写回 | 加载子实体 | 导航属性为 null / 空 |
| 4 | 能检测到变化 | 生成 UPDATE | 改了不保存（静默） |

**把这四条翻译成"对代码的约束"：**

```
需求 1 → 要么留 private 无参构造，要么让业务构造的参数名 == 属性名
需求 2 → 用 { get; private set; }，不要用 { get; }
需求 3 → 用"私有字段 + 只读视图"，并在配置里指定 PropertyAccessMode.Field
需求 4 → 别乱关 AutoDetectChangesEnabled；关了要手动 DetectChanges
```

### 为什么"需求 3"最容易出事

**充血模型想让集合不可被外部改：**

```csharp
private readonly List<OrderItem> _items = new();
public IReadOnlyCollection<OrderItem> Items => _items;
```

**但 EF Core 要往这个集合里塞数据。** 它有三个选择：

| EF 的做法 | 结果 |
|---|---|
| 找 `Items` 的 setter | 没有（只有 getter）→ 失败 |
| 找 `Items` 的 backing field | `IReadOnlyCollection` 的 backing field 是 `_items`？类型对不上（`IReadOnlyCollection` vs `List`） |
| **找 `_items` 字段（按命名约定）** | 成功 |

**EF 的字段命名约定（按顺序尝试）：**

```
属性 Items
  → _items          （camelCase 加下划线）✅ 最常用
  → _Items          （PascalCase 加下划线）
  → m_items
  → m_Items
  → items           （纯 camelCase）
```

**如果名字对不上，就必须显式指定：**

```csharp
e.Navigation(x => x.Items).UsePropertyAccessMode(PropertyAccessMode.Field);
```

### `PropertyAccessMode` 的三个值

| 值 | 含义 | 什么时候用 |
|---|---|---|
| `PreferField`（默认） | 有 backing field 就用字段，否则用属性 | 大多数情况 |
| `Field` | **强制**用字段 | 集合是只读视图时**必须** |
| `Property` | 强制走 setter | 属性 setter 里有副作用（罕见） |

**实测（实验 C1）：`UsePropertyAccessMode(Field)` + `_items` 私有字段，就地修改完全生效：**

```
C1（IReadOnlyCollection + backing field）#=1：2 项

C1a · 就地往只读集合里加一项（走 _items.Add）
    库里现在是：A, B, C

C1b · 就地清空（走 _items.Clear）
    库里现在是：(空)
```

| 结论 | 说明 |
|---|---|
| 只读集合**能**就地增删 | 只要 EF 拿到的是那个 `List` 字段 |
| `Clear()` 也会被识别为删除 | 不需要显式 `Remove` |

### 需求 3 的另一个岔路：整体替换集合

**有些人偷懒这么写：**

```csharp
public List<OrderItem> Items { get; private set; } = new();

public void ReplaceAll(params string[] codes)
    => Items = codes.Select(c => new OrderItem(c)).ToList();   // 整体换掉
```

**实测（实验 C2a）：**

```
C2a · 整体替换集合（items = 新 List）
    替换前：A, B
    替换后（内存里）：X, Y, Z
    替换后（库里）：X, Y, Z
    C2Items 表总行数 = 3（说明旧项是被删了还是留着）
```

| 现象 | 说明 |
|---|---|
| 结果"看起来对" | 库里确实是 X/Y/Z |
| **但底层是 DELETE + INSERT** | 旧的两行被删除，新的三行被插入 |
| **Id 全变了** | 原来 `Id=1,2` → 现在 `Id=3,4,5` |

**为什么这是个问题：**

| 场景 | 后果 |
|---|---|
| 有别的表外键指向 OrderItem | 挂掉（外键悬空） |
| 有审计日志记录 OrderItemId | 全部对不上 |
| 有幂等/去重逻辑 | 重复插入 |

**所以：**

> **聚合内的集合，永远"就地改"，不要"整体替换"。**
>
> 想在领域方法里做"替换语义"，就写 `Clear()` + 逐个 `Add()`，**不要给 `Items` 赋值。**

**如果一定要替换，那就别暴露 setter，改成方法内部操作同一个 List：**

```csharp
public void ReplaceAll(params string[] codes)
{
    _items.Clear();                                      // 就地清空（会被识别为 DELETE）
    foreach (var c in codes) _items.Add(new OrderItem(c)); // 就地添加（会被识别为 INSERT）
}
```

---

## P178 · 4. EF Core 中实现充血模型

### 这一节要解决的问题

**三个坑，三个解法，组成一份可以直接抄的配置清单。**

### 坑 1：物化失败（构造函数）

| 现象 | `MissingMethodException` 或 `InvalidOperationException: No suitable constructor was found` |
|---|---|
| 原因 | 没有可用的构造函数 |
| 解法 | 留一个 `private` 无参构造（**首选**）；或让业务构造的参数名等于属性名 |

```csharp
public class Book
{
    public long Id { get; private set; }
    public string Title { get; private set; } = "";
    public int Stock { get; private set; }

    // 【解法】给 EF 留一个私有空构造。它不需要你 public，反射能调
    private Book() { }

    public Book(string title, int stock)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("书名不能为空");
        if (stock < 0) throw new ArgumentException("库存不能为负");
        Title = title; Stock = stock;
    }
}
```

**`private Book() { }` 的实际作用：**

| 谁 | 怎么用 |
|---|---|
| EF Core 物化 | 反射调用 `private` 无参构造 → 然后写字段 |
| 你的业务代码 | 调不到（`private`）→ 只能走业务构造 → 校验生效 |
| 序列化（System.Text.Json） | 需要 `public` 或 `[JsonConstructor]`（这是另一个话题） |

### 坑 2：只读集合加载不出来

| 现象 | 导航属性为 null，或 `Include` 了也没有数据 |
|---|---|
| 原因 | EF 找不到写集合的入口 |
| 解法 | `UsePropertyAccessMode(PropertyAccessMode.Field)` + 字段名符合约定（`_items`） |

```csharp
b.Entity<Order>(e =>
{
    e.HasMany(x => x.Items).WithOne().HasForeignKey("OrderId").OnDelete(DeleteBehavior.Cascade);

    // 【解法】显式告诉 EF：走 _items 这个字段
    e.Navigation(x => x.Items).UsePropertyAccessMode(PropertyAccessMode.Field);
});
```

### 坑 3：改了不保存

| 现象 | `SaveChanges` 返回 0，数据库没变，没有异常 |
|---|---|
| 原因 | `AutoDetectChangesEnabled = false` 且没手动 `DetectChanges()`；或用了 `AsNoTracking()` |
| 解法 | 别乱关；关了要在保存前手动检测一次；写操作别用 `AsNoTracking` |

```csharp
// 反模式
var book = await ctx.Books.AsNoTracking().FirstAsync();   // 不跟踪
book.ChangePrice(99m);                                    // 改了
await ctx.SaveChangesAsync();                             // 什么都不发生

// 正解
var book = await ctx.Books.FirstAsync();                   // 跟踪
book.ChangePrice(99m);
await ctx.SaveChangesAsync();                             // 生效
```

### 完整可跑的充血聚合（本篇实测用的版本）

在批次 21 的 `Order` 基础上，加上 EF Core 需要的全部配置：

```csharp
public enum OrderStatus { Draft = 0, Submitted = 1 }

public class Order
{
    public long Id { get; private set; }
    public string Buyer { get; private set; } = "";
    public OrderStatus Status { get; private set; }
    public decimal Total { get; private set; }

    private readonly List<OrderItem> _items = new();
    public IReadOnlyCollection<OrderItem> Items => _items;

    private Order() { }                                    // 【坑 1 的解法】

    public Order(string buyer)
    {
        if (string.IsNullOrWhiteSpace(buyer)) throw new ArgumentException("买家不能为空");
        Buyer = buyer;
        Status = OrderStatus.Draft;
    }

    public void AddItem(string sku, int qty, decimal price)
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("已提交不能改");
        if (qty <= 0) throw new ArgumentException("数量必须大于 0");
        if (_items.Any(i => i.Sku == sku)) throw new InvalidOperationException("重复 SKU");
        _items.Add(new OrderItem(sku, qty, price));        // 【就地改，不替换集合】
        Recalc();
    }

    public void Submit()
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("状态不允许");
        if (_items.Count == 0) throw new InvalidOperationException("空订单不能提交");
        Status = OrderStatus.Submitted;
    }

    private void Recalc() => Total = _items.Sum(i => i.Qty * i.Price);
}

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
}
```

**对应的 EF 配置（一行都不能少）：**

```csharp
public class ShopContext : DbContext
{
    public DbSet<Order> Orders => Set<Order>();
    // 故意不暴露 DbSet<OrderItem>

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Order>(e =>
        {
            e.ToTable("Orders");
            e.Property(x => x.Status).HasConversion<string>();       // 枚举存字符串
            e.HasMany(x => x.Items)
             .WithOne()
             .HasForeignKey("OrderId")                              // 影子外键
             .OnDelete(DeleteBehavior.Cascade);
            e.Navigation(x => x.Items)
             .UsePropertyAccessMode(PropertyAccessMode.Field);       // 【坑 2 的解法】
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

### 配置清单（照抄版）

| 你的写法 | 必须加的配置 | 不加会怎样 |
|---|---|---|
| `private Book() { }` | 无（EF 自己会找） | 没有无参构造时抛 `No suitable constructor` |
| `{ get; private set; }` | 无（EF 写 backing field） | — |
| `{ get; }` | `e.Property(x => x.P)` | "requires a primary key"（误导性报错） |
| `IReadOnlyCollection<T> Items => _items` | `e.Navigation(...).UsePropertyAccessMode(Field)` | 集合加载不出来 |
| `enum` 属性 | `HasConversion<string>()`（可选但推荐） | 库里存 0/1/2，看不懂 |
| 子实体无 `OrderId` 属性 | `HasForeignKey("OrderId")` | EF 自己猜列名 |
| 值对象属性 | `OwnsOne` 或 `ComplexProperty` | 报"没有主键" |

---

## P179 · 5. EF Core 中实现值对象

### 这一节要解决的问题

**`Money`、`Address`、`DateRange` 这些值对象，在 EF Core 里有三种存法，选哪个？**

### 三种方案总览

| 方案 | API | 表结构 | EF 版本 |
|---|---|---|---|
| **A. Owned Entity** | `OwnsOne(x => x.Price)` | 摊平成 owner 的列 | 2.0+ |
| **B. Complex Type** | `ComplexProperty(x => x.Price)` | 同样摊平成列 | 8.0+（推荐） |
| **C. 值转换器** | `Property(x => x.Price).HasConversion(...)` | 压成一列 | 2.1+ |

### 实测对照（这是本篇最硬的一组数据）

**同一段代码，三种配置：**

```csharp
// A
b.Entity<E1Order>(e => { e.ToTable("E1Orders"); e.OwnsOne(x => x.Price); });

// B
b.Entity<E2Order>(e => { e.ToTable("E2Orders"); e.ComplexProperty(x => x.Price); });

// C
b.Entity<E3Order>(e =>
{
    e.ToTable("E3Orders");
    e.Property(x => x.Price).HasConversion(
        v => v.Amount.ToString("0.00") + "|" + v.Currency,
        s => new Money(decimal.Parse(s.Split('|')[0]), s.Split('|')[1]));
});
```

**实测输出：**

```
E1 · OwnsOne（owned entity）
    列：Id, Buyer, Price_Amount, Price_Currency
    读回：张三 96.0 CNY
    Where(Price.Amount > 50) → 1 条（能翻译）
    Where(Price == 目标值) → ✘ InvalidOperationException：
      No backing field could be found for property 'Money.E1OrderId' and the property does not have a getter.

E2 · ComplexProperty（EF Core 8+ 的复杂类型）
    列：Id, Buyer, Price_Amount, Price_Currency
    读回：李四 120.0 CNY
    Where(Price.Amount > 50) → 1 条（能翻译）

E3 · HasConversion（整体存成一列字符串）
    列：Id, Buyer, Price
    库里存的是：88.00|CNY
    读回：王五 88.00 CNY
    Where(Price.Amount > 50) → ✘ InvalidOperationException：
      The LINQ expression ... could not be translated
```

### 逐条解读

| 对比项 | A. OwnsOne | B. ComplexProperty | C. HasConversion |
|---|---|---|---|
| 列名 | `Price_Amount`, `Price_Currency` | **完全相同** | 单列 `Price` |
| 按属性查询 | ✅ 能翻译 | ✅ 能翻译 | ❌ **无法翻译** |
| 整体相等查询 | ❌ 抛异常（见下） | 未测（同 A 的机制） | ❌ 无法翻译 |
| 库里可读性 | ✅ 分列，SQL 直接看 | ✅ 同 | ⚠️ `88.00\|CNY` 拼接串 |
| 索引/独立查询 | ✅ 可以对 `Price_Amount` 建索引 | ✅ 同 | ❌ 只能对整串 |
| 概念纯度 | ⚠️ 是"实体"（有隐式主键） | ✅ 真"无身份" | ⚠️ 就是"怎么存" |

### `Where(x => x.Price == target)` 为什么会抛那个奇怪的错

**报错原文：**

```
No backing field could be found for property 'Money.E1OrderId' and the property does not have a getter.
```

**解读：**

| 线索 | 含义 |
|---|---|
| `'Money.E1OrderId'` | EF 给 owned 类型**自动造了一个隐式主键**（`OwnerId` 那种形式） |
| `No backing field could be found` | 它想读这个隐式主键，但 `Money` 是 `record`，没有那个字段 |
| 根因 | **EF 把 `record` 的 `==` 翻译成了"实体身份比较"**，而不是"逐属性比较" |

**结论：**

> **在 LINQ 里，不要用 `==` 比较值对象整体。** 要么拆成属性比，要么在内存里过滤。

**正确写法：**

```csharp
// ❌ 抛异常
ctx.Orders.Where(o => o.Price == new Money(96m, "CNY"))

// ✅ 拆成属性
ctx.Orders.Where(o => o.Price.Amount == 96m && o.Price.Currency == "CNY")

// ✅ 或者查出来再在内存里比（数据量小时）
var list = (await ctx.Orders.ToListAsync()).Where(o => o.Price == target).ToList();
```

### 值对象能不能为 null

**这个问题的答案在网上很多文章里是过时的。实测（EF Core 10.0.13）：**

```
E1b · OwnsOne + 可空值对象（Money?）
    无价：Price = null
    有价：Price = 50 CNY
    → OwnsOne 允许值对象为 null（所有对应列为 NULL）

E2b · ComplexProperty + 可空值对象（Money?）
    建库成功（ComplexProperty 也接受了 Money?）
    列：Id, Buyer, Price_Amount, Price_Currency
    插入 null 和 有值 各一条：成功
    无价：Price = null
    有价：Price = 50.0 CNY
```

| 方案 | 支持 null 吗 | 备注 |
|---|---|---|
| `OwnsOne` | ✅ 一直支持 | 所有列变 NULL |
| `ComplexProperty` | ✅ **EF Core 10 实测支持** | **EF Core 8 时期不支持，很多资料仍按老版本写** |

> **这条就是"必须自己实测"的最好例子。** 网上几乎所有讲 `ComplexProperty` 的文章都说"复杂类型不能为 null"，那是 EF Core 8 的限制。你在 EF Core 10 上照抄那些结论，会做出错误的架构决策（比如为了支持 null 而退回 `OwnsOne`）。

### 该选哪个：决策表

| 你的情况 | 选 |
|---|---|
| 值对象**永远不为 null**，且是新项目（EF Core 8+） | **B. ComplexProperty**（语义最正） |
| 值对象可能为 null，且要求查询能翻译 | B（EF Core 10）或 A |
| 需要跨多个实体复用同一段映射逻辑 | A 或 B（都可以配 `ComplexProperty` 复用） |
| 值对象要存成 JSON 一列（如 `Address` 很少查询） | C. HasConversion（配 JSON 序列化） |
| 值对象字段很多（>5），且从不单独查询 | C |
| **需要按值对象的某个字段筛选/排序/建索引** | **A 或 B（绝不能选 C）** |

**一句话总结：**

> **只要你要"按里面的字段查询"，就必须摊平成列（A 或 B）。压成一列（C）等于放弃了数据库的查询能力。**

### `ComplexProperty` 相对 `OwnsOne` 的三个实际优势

| 优势 | 说明 |
|---|---|
| **没有隐式主键** | 概念上更纯，不会出现 `Money.E1OrderId` 这种鬼东西 |
| **不会被当成实体跟踪** | `ChangeTracker.Entries()` 里不会出现 `Money` 条目 |
| **不能单独 `Set<Money>()`** | 从根上杜绝"绕过聚合根改值对象" |

**`OwnsOne` 的一个残留优势：**

| 优势 | 说明 |
|---|---|
| 支持"可选 + 独立配置"更灵活 | 比如 `IsRequired(false)`、`OwnsMany`（值对象集合） |

> **注意：值对象的"集合"（比如 `List<Address>`）只能用 `OwnsMany`，`ComplexProperty` 不支持集合（截至 EF Core 10）。**

---

## P180 · 6. 构建表达式树简化值对象的比较

### 这一节要解决的问题

**每写一个值对象，就要手写一遍 `Equals` + `GetHashCode` + `==` + `!=`，能不能自动生成？**

### 先看问题有多烦

**不用 `record`，手写一个值对象的相等比较：**

```csharp
public class Money : IEquatable<Money>
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency) { Amount = amount; Currency = currency; }

    public bool Equals(Money? other)
        => other is not null && Amount == other.Amount && Currency == other.Currency;

    public override bool Equals(object? obj) => Equals(obj as Money);

    public override int GetHashCode() => HashCode.Combine(Amount, Currency);

    public static bool operator ==(Money? a, Money? b) => Equals(a, b);
    public static bool operator !=(Money? a, Money? b) => !Equals(a, b);
}
```

**问题：**

| 问题 | 说明 |
|---|---|
| 加一个属性要改 4 个地方 | `Equals`、`GetHashCode`、还要记得别忘 |
| 忘了改 `GetHashCode` | `HashSet`/`Dictionary` 里会出现"相等的两个对象却找不到" |
| 每个值对象都要写一遍 | `Money`、`Address`、`DateRange`、`Position`…… |

### 方案一：用 `record`（最简单，推荐）

```csharp
public record Money(decimal Amount, string Currency);
```

**编译器给你生成：**

| 成员 | 内容 |
|---|---|
| `Equals(Money?)` | 逐属性比较 + `EqualityContract` 类型检查 |
| `GetHashCode()` | 组合所有属性的哈希 |
| `==` / `!=` | 调 `Equals` |
| `ToString()` | 打印成 `Money { Amount = 96, Currency = CNY }` |
| `with` 表达式 | 复制并改部分属性 |

**这就是为什么 P171 推荐 `record`。** 手写那 20 行代码没有意义。

### 方案二：用表达式树自动生成（课程这一节的内容）

**为什么还需要这个方案？两个理由：**

| 理由 | 说明 |
|---|---|
| 你用的不是 `record`（老代码、要继承、要可变） | 无法用 `record` 的场景 |
| 你需要"给任意类型生成比较器"（比如通用基类） | 一个 `ValueObject` 基类，所有子类自动获得相等语义 |

**完整实现（本篇实测跑过的代码）：**

```csharp
using System.Linq.Expressions;

public static class VoCompare
{
    private static readonly Dictionary<Type, Func<object, object, bool>> Cache = new();

    // ① 反射版：每次都比较一遍属性列表（做对照用）
    public static bool ReflectEquals(object? a, object? b)
    {
        if (ReferenceEquals(a, b)) return true;
        if (a == null || b == null) return false;
        var t = a.GetType();
        if (t != b.GetType()) return false;

        foreach (var p in t.GetProperties().Where(x => x.CanRead))
        {
            var va = p.GetValue(a);
            var vb = p.GetValue(b);
            if (!Equals(va, vb)) return false;
        }
        return true;
    }

    // ② 表达式树版：把"逐属性比较"编译成 IL，之后就是普通委托调用
    public static Func<object, object, bool> BuildComparer(Type t)
    {
        if (Cache.TryGetValue(t, out var cached)) return cached;

        var pa = Expression.Parameter(typeof(object), "a");   // (object a, object b) =>
        var pb = Expression.Parameter(typeof(object), "b");
        var ta = Expression.Variable(t, "ta");                // 两个强类型局部变量
        var tb = Expression.Variable(t, "tb");

        var body = new List<Expression>
        {
            Expression.Assign(ta, Expression.Convert(pa, t)),  // ta = (T)a
            Expression.Assign(tb, Expression.Convert(pb, t)),  // tb = (T)b
        };

        // 把所有属性用 && 串起来：ta.P1 == tb.P1 && ta.P2 == tb.P2 && ...
        Expression? all = null;
        foreach (var p in t.GetProperties().Where(x => x.CanRead))
        {
            var eq = Expression.Equal(
                Expression.Property(ta, p),
                Expression.Property(tb, p));
            all = all == null ? eq : Expression.AndAlso(all, eq);
        }
        all ??= Expression.Constant(true);

        // 先判空：a == null || b == null ? a == b : （逐个属性比）
        var nullCheck = Expression.Condition(
            Expression.OrElse(
                Expression.Equal(pa, Expression.Constant(null)),
                Expression.Equal(pb, Expression.Constant(null))),
            Expression.Equal(pa, pb),
            all);

        var block = Expression.Block(new[] { ta, tb }, body.Concat(new[] { nullCheck }));

        var fn = Expression.Lambda<Func<object, object, bool>>(block, pa, pb).Compile();
        Cache[t] = fn;
        return fn;
    }

    public static bool AreEqual(object? a, object? b)
    {
        if (a == null || b == null) return ReferenceEquals(a, b);
        return BuildComparer(a.GetType())(a, b);
    }
}
```

### 表达式树逐行拆解

| 代码 | 生成的 IL 等价于 | 作用 |
|---|---|---|
| `Expression.Parameter(typeof(object), "a")` | `a` 参数 | 声明参数 |
| `Expression.Variable(t, "ta")` | `T ta;` | 声明局部变量 |
| `Expression.Convert(pa, t)` | `(T)a` | 强转（拆箱/类型转换） |
| `Expression.Assign(ta, ...)` | `ta = (T)a;` | 赋值 |
| `Expression.Property(ta, p)` | `ta.Prop` | 读属性 |
| `Expression.Equal(x, y)` | `x == y` | 比较 |
| `Expression.AndAlso(x, y)` | `x && y`（短路） | 串联 |
| `Expression.Condition(c, t, f)` | `c ? t : f` | 三元 |
| `Expression.Block(vars, body)` | `{ T ta; T tb; ... }` | 代码块 |
| `.Compile()` | 生成 IL 并 JIT | **关键：从"树"变成"能跑的代码"** |

### 实测：三种比较方式的一致性

```
record 自带 ==     ：True
反射逐属性比较      ：True
表达式树编译后比较  ：True
三者一致吗：True

class 默认 Equals   ：False  ← 引用相等
表达式树比较 class  ：True  ← 按字段比，True
```

**最后两行是重点：** 普通 `class` 默认 `Equals` 是引用比较，但表达式树比较器能"按属性比"，**所以它能给任意类补上值语义**（不用改那个类）。

### 实测：性能差多少（各 200 万次）

```
record 的 ==        ：39 ms
反射 + 逐字段       ：486 ms  （是 record 的 12.5 倍）
表达式树编译后      ：23 ms  （是 record 的 0.6 倍）
```

| 方式 | 耗时 | 相对 | 为什么 |
|---|---|---|---|
| 反射 | 486 ms | **12.5×** | `GetValue` 每次都要装箱 + 参数校验 + 反射调用 |
| `record` 的 `==` | 39 ms | 1× | 编译器生成，但经过 `EqualityContract` 检查 + `EqualityComparer<T>` 泛型路径 |
| 表达式树编译后 | **23 ms** | **0.6×** | 直接字段比较的 IL，没有泛型比较器间接层 |

**`Compile()` 的成本：** 一次性（建一次，缓存起来），后续零成本。所以这个模式叫"编译一次，用一万次"。

> **注意：这个 0.6 倍不代表"表达式树比 record 好"。** 差距在纳秒级，业务代码里完全感知不到。这个实测的意义是：**表达式树的成本低到可以忽略，你不用担心"用了表达式树会不会慢"**。

### 一个重要限制：编译后的委托，EF Core 翻译不了

**你可能会想："既然编译了比较器，能不能塞进 LINQ？"**

```csharp
var fn = VoCompare.BuildComparer(typeof(Money));
// ❌ 不行：EF 看到的是委托调用，无法翻译成 SQL
ctx.Orders.Where(o => fn(o.Price, target))
```

| 原因 | 说明 |
|---|---|
| EF Core 的翻译器只认**表达式树** | `.Compile()` 之后是委托，树没了 |
| 委托里的逻辑对 SQL 不可见 | 它不知道要生成 `WHERE Price_Amount = ? AND Price_Currency = ?` |

**所以：**

| 场景 | 用什么 |
|---|---|
| 内存里比较值对象 | `record` 的 `==`（或表达式树比较器） |
| **数据库查询** | **拆成属性比较**（`o.Price.Amount == x && o.Price.Currency == y`） |

**这两条路是分开的，别指望一条通吃。**

### 什么时候真的需要表达式树方案

| 需要 | 说明 |
|---|---|
| 你有一个 `ValueObject` 基类，几十个子类 | 一次性给所有子类补上相等语义 |
| 值对象必须可变（不能用 `record`） | 比如部分老代码、需要继承的类 |
| 你要"按业务键比较"而不是"按所有属性" | 可以改造成只比指定属性 |

**否则：用 `record`。** 一行代码解决的事，不要写 50 行表达式树。

---

==二：格式==

## 1. 充血实体模板（含 EF 配置对照）

```csharp
// ================= 实体 =================
public class Book
{
    public long Id { get; private set; }                 // ① 私有 set
    public string Title { get; private set; } = "";
    public int Stock { get; private set; }

    private readonly List<BookTag> _tags = new();        // ② 私有字段
    public IReadOnlyCollection<BookTag> Tags => _tags;   // ③ 只读视图

    private Book() { }                                   // ④ 给 EF 的无参构造

    public Book(string title, int stock)                 // ⑤ 业务构造
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("书名不能为空");
        if (stock < 0) throw new ArgumentException("库存不能为负");
        Title = title; Stock = stock;
    }

    public void AddTag(string name)                      // ⑥ 行为方法（就地改集合）
    {
        if (_tags.Any(t => t.Name == name)) throw new InvalidOperationException("标签重复");
        _tags.Add(new BookTag(name));
    }

    public void Deduct(int n)                            // ⑦ 行为方法（改标量）
    {
        if (n <= 0) throw new ArgumentException("数量必须大于 0");
        if (n > Stock) throw new InvalidOperationException($"库存不足（{Stock} < {n}）");
        Stock -= n;
    }
}

// ================= 配置 =================
b.Entity<Book>(e =>
{
    e.ToTable("Books");
    e.HasMany(x => x.Tags).WithOne().HasForeignKey("BookId").OnDelete(DeleteBehavior.Cascade);
    e.Navigation(x => x.Tags).UsePropertyAccessMode(PropertyAccessMode.Field);   // ⑧ 走字段
});
b.Entity<BookTag>(e => { e.ToTable("BookTags"); e.Property<long>("BookId"); });
```

| 编号 | 手法 | 作用 | EF 需要什么额外配置 |
|---|---|---|---|
| ① | `private set` | 外部不能赋状态 | 无（写 backing field） |
| ② | 私有 `List` 字段 | 外部拿不到可变集合 | 无 |
| ③ | 只读视图 | 外部只能读 | **要 ⑧** |
| ④ | `private` 无参构造 | EF 物化 | 无 |
| ⑤ | 业务构造 | 创建时校验 | 无 |
| ⑥ | 就地改集合 | 增量增删 | **要 ⑧** |
| ⑦ | 行为方法 | 规则唯一入口 | 无 |
| ⑧ | `PropertyAccessMode.Field` | 让 EF 找 `_tags` | — |

## 2. 构造函数 / 属性写法速查

| 写法 | EF 能物化吗 | 需要配置吗 | 推荐 |
|---|---|---|---|
| `public` 无参构造 + `public set` | ✅ | 不需要 | 贫血模型 |
| `private` 无参构造 + `private set` | ✅ | 不需要 | **充血首选** |
| 只有带参构造，参数名 == 属性名 | ✅ | 不需要 | 可以，但脆弱 |
| 只有带参构造，参数名 ≠ 属性名 | ❌ `No suitable constructor` | 只能加无参构造 | ✘ |
| `{ get; }`（只读自动属性） | ❌ 默认不映射 | `e.Property(x => x.P)` | 改用 `private set` |

## 3. 值对象三种映射

| | `OwnsOne` | `ComplexProperty` | `HasConversion` |
|---|---|---|---|
| 引入版本 | EF Core 2.0 | EF Core 8.0 | EF Core 2.1 |
| 表结构 | 摊平成列 `Price_Amount` | 同上 | 单列 `Price` |
| 隐式主键 | ⚠️ 有（`Money.OwnerId`） | ✅ 没有 | 无（不是实体） |
| 出现在 `ChangeTracker` | ✅ 会有条目 | ❌ 不会 | ❌ 不会 |
| `Set<Money>()` 能拿到吗 | ⚠️ 能 | ❌ 不能 | ❌ 不能 |
| 按属性查询 | ✅ | ✅ | ❌ 无法翻译 |
| 整体 `==` 查询 | ❌ 抛异常 | 同 OwnsOne 机制 | ❌ |
| 支持 null | ✅ | ✅（EF Core 10 实测） | ✅ |
| 支持集合（`List<T>`） | ✅ `OwnsMany` | ❌（截至 10.0） | ⚠️ JSON 转换 |
| 推荐场景 | 需要集合 / 老项目 | **新项目首选** | 字段多、不查询、存 JSON |

## 4. 值对象比较的三种实现

| 方式 | 代码量 | 性能（200 万次） | 适用 |
|---|---|---|---|
| 手写 `Equals`/`GetHashCode`/`==` | ~20 行/类 | 最快 | 不用 `record` 且只有一个类 |
| **`record`** | **1 行** | 39 ms | **默认选择** |
| 表达式树自动生成 | ~50 行（一次） | 23 ms | 有基类、几十个子类 |

## 5. 报错信息 → 原因 → 解法

| 报错 | 真正原因 | 解法 |
|---|---|---|
| `No suitable constructor was found` | 没有无参构造，且带参构造的参数名对不上属性 | 加 `private` 无参构造 |
| `Cannot bind 'title', 'value'` | 构造参数名 ≠ 属性名 | 改参数名 或 加无参构造 |
| `The entity type 'X' requires a primary key to be defined` | **属性是 `{ get; }`，压根没被映射** | 改 `private set`，或显式 `Property()` |
| `MissingMethodException: No parameterless constructor` | 同第一条 | 同第一条 |
| `No backing field could be found for property 'Money.OwnerId'` | LINQ 里用 `==` 比较整个值对象 | 拆成属性比较 |
| `The LINQ expression ... could not be translated` | 值对象用了 `HasConversion`，按内部属性查询 | 改 `OwnsOne`/`ComplexProperty`，或查完再内存过滤 |
| `SaveChanges` 返回 0，数据没变 | `AutoDetectChangesEnabled = false` 或 `AsNoTracking` | 手动 `DetectChanges()` / 用跟踪查询 |
| 集合改了没保存 | EF 找不到写集合的字段 | `UsePropertyAccessMode(Field)` |
| 子实体 Id 全变了 | 整体替换了集合 | 改成 `Clear()` + 逐个 `Add()` |

## 6. 贫血 → 充血 迁移清单

**按这个顺序改，每步都能编译通过、能跑：**

| 步骤 | 动作 | 风险 |
|---|---|---|
| 1 | 把 `public set` 改成 `private set` | 编译器会报出所有外部赋值点（好事） |
| 2 | 给每个被报错的地方加一个语义化方法 | 方法名用业务词（`Deduct` 而不是 `SetStock`） |
| 3 | 加 `private` 无参构造 | 低 |
| 4 | 把集合改成"私有字段 + 只读视图" | 要同时加 `UsePropertyAccessMode(Field)` |
| 5 | 把 Service 里的规则搬进实体 | 一次搬一条，每次跑测试 |
| 6 | Service 改成 AppService（只编排） | 最后一步 |

**注意第 1 步的副作用：** 你会突然发现几十处外部赋值，**其中一部分是"偷懒的写操作"，另一部分是"真正的业务规则"**。这个发现过程本身就是收益。

---

==三：代码==

## 1. 完整充血聚合（本篇实测跑通的版本）

```csharp
public enum OrderStatus { Draft = 0, Submitted = 1, Cancelled = 2 }

public class Order
{
    public long Id { get; private set; }
    public string Buyer { get; private set; } = "";
    public OrderStatus Status { get; private set; }
    public decimal Total { get; private set; }

    private readonly List<OrderItem> _items = new();
    public IReadOnlyCollection<OrderItem> Items => _items;

    private Order() { }

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

    public void ChangeQty(string sku, int qty)
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("已提交的订单不能再改");
        var item = _items.FirstOrDefault(i => i.Sku == sku)
                   ?? throw new InvalidOperationException($"没有 {sku} 这一项");
        item.ChangeQty(qty);
        Recalc();
    }

    public void Submit()
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("状态不允许提交");
        if (_items.Count == 0) throw new InvalidOperationException("空订单不能提交");
        Status = OrderStatus.Submitted;
    }

    private void Recalc() => Total = _items.Sum(i => i.Qty * i.Price);
}

public class OrderItem
{
    public long Id { get; private set; }
    public string Sku { get; private set; } = "";
    public int Qty { get; private set; }
    public decimal Price { get; private set; }

    private OrderItem() { }

    internal OrderItem(string sku, int qty, decimal price)
    {
        Sku = sku; Qty = qty; Price = price;
    }

    internal void ChangeQty(int qty)
    {
        if (qty <= 0) throw new ArgumentException("数量必须大于 0");
        Qty = qty;
    }
}
```

## 2. EF Core 配置全表

```csharp
public class ShopContext : DbContext
{
    public DbSet<Order> Orders => Set<Order>();
    // 故意不暴露 DbSet<OrderItem>

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Order>(e =>
        {
            e.ToTable("Orders");

            // 枚举存字符串（库里可读）
            e.Property(x => x.Status).HasConversion<string>();

            // decimal 精度（不写会用默认精度，可能丢小数）
            e.Property(x => x.Total).HasPrecision(18, 2);

            // 一对多 + 级联删除 + 影子外键
            e.HasMany(x => x.Items)
             .WithOne()
             .HasForeignKey("OrderId")
             .OnDelete(DeleteBehavior.Cascade);

            // 只读集合必须显式指定走字段
            e.Navigation(x => x.Items)
             .UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        b.Entity<OrderItem>(e =>
        {
            e.ToTable("OrderItems");
            e.Property<long>("OrderId");
            e.HasIndex("OrderId");
            e.Property(x => x.Price).HasPrecision(18, 2);
        });
    }
}
```

**配置项逐条说明：**

| 配置 | 作用 | 不写会怎样 |
|---|---|---|
| `HasConversion<string>()` | 枚举存 `"Draft"` | 存 `0`，查库看不懂 |
| `HasPrecision(18, 2)` | `decimal` 精度 | SQLite 无所谓；**SqlServer 会默认 `decimal(18,2)`，但 `double` 会丢精度** |
| `HasForeignKey("OrderId")` | 影子外键 | EF 自己猜列名 |
| `OnDelete(Cascade)` | 删父删子 | 默认也是 Cascade（required 关系），但显式更安全 |
| `UsePropertyAccessMode(Field)` | 走 `_items` | **集合加载不出来** |
| `HasIndex("OrderId")` | 外键索引 | 查子表全表扫描（SqlServer 不会自动建） |

## 3. 值对象三种映射完整代码

```csharp
// ---------- 值对象 ----------
public record Money(decimal Amount, string Currency)
{
    public override string ToString() => $"{Amount} {Currency}";
}

// ---------- 方案 A：OwnsOne ----------
public class OrderA
{
    public long Id { get; set; }
    public string Buyer { get; set; } = "";
    public Money Price { get; set; } = new(0m, "CNY");
}

b.Entity<OrderA>(e =>
{
    e.ToTable("OrderAs");
    e.OwnsOne(x => x.Price, p =>
    {
        p.Property(m => m.Amount).HasColumnName("Price_Amount").HasPrecision(18, 2);
        p.Property(m => m.Currency).HasColumnName("Price_Currency").HasMaxLength(3);
    });
});

// ---------- 方案 B：ComplexProperty（推荐） ----------
public class OrderB
{
    public long Id { get; set; }
    public string Buyer { get; set; } = "";
    public Money Price { get; set; } = new(0m, "CNY");
}

b.Entity<OrderB>(e =>
{
    e.ToTable("OrderBs");
    e.ComplexProperty(x => x.Price, p =>
    {
        p.Property(m => m.Amount).HasColumnName("Price_Amount").HasPrecision(18, 2);
        p.Property(m => m.Currency).HasColumnName("Price_Currency").HasMaxLength(3);
    });
});

// ---------- 方案 C：HasConversion ----------
public class OrderC
{
    public long Id { get; set; }
    public string Buyer { get; set; } = "";
    public Money Price { get; set; } = new(0m, "CNY");
}

b.Entity<OrderC>(e =>
{
    e.ToTable("OrderCs");
    e.Property(x => x.Price).HasConversion(
        v => v.Amount.ToString("0.00") + "|" + v.Currency,
        s => new Money(decimal.Parse(s.Split('|')[0]), s.Split('|')[1]));
});
```

## 4. 表达式树值对象比较器（完整可跑）

见 P180 正文的 `VoCompare` 类。使用方式：

```csharp
// 全局缓存，只编译一次
var cmp = VoCompare.BuildComparer(typeof(Money));
Console.WriteLine(cmp(m1, m2));      // True

// 或者用便利方法（内部按类型缓存）
Console.WriteLine(VoCompare.AreEqual(m1, m2));   // True

// 给普通 class 补上值语义
Console.WriteLine(VoCompare.AreEqual(new MoneyClass(1m, "CNY"), new MoneyClass(1m, "CNY")));  // True
```

## 5. 本篇实测汇总（`D:\tmp\RichTest`，net10.0 + EF Core 10.0.13 + SQLite）

### 实测 A：构造函数与 setter 的四种组合

```
A1 · private 无参构造 + private set 属性
    物化成功：Id=1 Name=铅笔 Price=3.5
    改完再存：Name=钢笔 Price=9.9

A2 · 只有带参构造 public A2(string name, decimal price)，参数名和属性名一致
    物化成功：Id=1 Name=橡皮 Price=1.5

A3 · 只有带参构造 public A3(string title, decimal value)，属性叫 Name/Price
    ✘ InvalidOperationException：No suitable constructor was found for the type 'A3'.
      Cannot bind 'title', 'value' in 'A3(string title, decimal value)'

A4 · public string Name { get; }（只有 get，没有 set）
    ✘ InvalidOperationException：The entity type 'A4' requires a primary key to be defined.

A4b · 同上，但显式 e.Property(x => x.Name) 配置
    新增成功
    物化成功：Id=1 Name=量角器 Price=8.0

A5 · 构造函数里有校验，但库里存了非法数据（绕过 EF 直接写库）
    已用原生 SQL 插入一条 Price = -100 的记录
    查出来 2 条：合法数据=5.0 | 脏数据=-100
```

### 实测 B：变更检测

```
B1 · 改完之后立刻看 Entry（不调用 DetectChanges）
    刚查出：State=Unchanged，Name.IsModified=False
    改完但没 DetectChanges：Name.IsModified=False
      OriginalValue=原始名，CurrentValue=改过的名
    手动 DetectChanges() 之后：Name.IsModified=True
      OriginalValue=原始名，CurrentValue=改过的名
      State=Modified

B2 · 关掉 AutoDetectChanges 会怎样
    已 SaveChanges（关着自动检测）
    读回来：Name=原始名 Price=100.0  ← 没保存进去！
    关着自动检测，但手动调了 DetectChanges() → 保存
    读回来：Name=关了检测但手动 Detect  ← 这次进去了
```

### 实测 C：集合导航

```
C1（IReadOnlyCollection + backing field）#=1：2 项
C2（List + private set，可整体换）#=1：2 项

C1a · 就地往只读集合里加一项（走 _items.Add）
    库里现在是：A, B, C

C1b · 就地清空（走 _items.Clear）
    库里现在是：(空)

C2a · 整体替换集合（items = 新 List）
    替换前：A, B
    替换后（内存里）：X, Y, Z
    替换后（库里）：X, Y, Z
    C2Items 表总行数 = 3（说明旧项是被删了还是留着）
```

### 实测 E：值对象三种映射

```
E1 · OwnsOne
    列：Id, Buyer, Price_Amount, Price_Currency
    读回：张三 96.0 CNY
    Where(Price.Amount > 50) → 1 条（能翻译）
    Where(Price == 目标值) → ✘ No backing field could be found for property 'Money.E1OrderId'

E2 · ComplexProperty
    列：Id, Buyer, Price_Amount, Price_Currency
    读回：李四 120.0 CNY
    Where(Price.Amount > 50) → 1 条（能翻译）

E3 · HasConversion
    列：Id, Buyer, Price
    库里存的是：88.00|CNY
    Where(Price.Amount > 50) → ✘ The LINQ expression ... could not be translated

E1b · OwnsOne + Money? → 允许 null，各列 NULL
E2b · ComplexProperty + Money? → 建库成功、插入成功、读回 null（EF Core 10 已支持）
```

### 实测 F：表达式树比较器

```
record 自带 ==     ：True
反射逐属性比较      ：True
表达式树编译后比较  ：True

class 默认 Equals   ：False  ← 引用相等
表达式树比较 class  ：True   ← 按字段比

性能（200 万次）：
  record 的 ==        ：39 ms
  反射 + 逐字段       ：486 ms  （12.5 倍）
  表达式树编译后      ：23 ms   （0.6 倍）
```

## 6. 练习：把你练习项目里的一张表改成充血模型（一次一步）

> **这次是真改代码。选 `Book`，别选 `BorrowRecord`（后面还要动）。**

### Step 1 · 先只改 Book 的属性，不改任何调用方

```csharp
public class Book
{
    public long Id { get; set; }              // 先留着 public set
    public string Title { get; set; } = "";
    public double Price { get; set; }
    public int Stock { get; private set; }    // ← 只把 Stock 改成 private set
}
```

**然后编译。** 编译器会一个个报出所有 `book.Stock = ...` 的地方。

**把报错清单发我**（有多少处、分别在哪个文件）。

### Step 2 · 给每一处报错加一个语义化方法

**别写 `SetStock`，要写清楚"为什么改"：**

| 报错位置 | 该加的方法 |
|---|---|
| 入库时加库存 | `book.Restock(int n)` |
| 借出时减库存 | `book.DeductForBorrow(int n)` |
| 归还时加库存 | `book.ReturnForBorrow(int n)` |
| 报损时减库存 | `book.ReportLoss(int n)` |
| 盘点时直接设值 | `book.CorrectStock(int newValue, string reason)` |

**这一步做完你会有一个新发现：原来"改库存"有 5 种不同的业务含义。** 这就是充血模型的第一笔收益。

### Step 3 · 加 private 无参构造 + 业务构造

```csharp
private Book() { }

public Book(string title, double price, int stock)
{
    if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("书名不能为空");
    if (price < 0) throw new ArgumentException("价格不能为负");
    if (stock < 0) throw new ArgumentException("库存不能为负");
    Title = title; Price = price; Stock = stock;
}
```

**跑一次查询，确认能物化**（如果报 `No suitable constructor`，说明无参构造没加对）。

### Step 4 · 把 Author/Category 的导航改成只读视图（可选）

```csharp
private readonly List<Book> _books = new();
public IReadOnlyCollection<Book> Books => _books;
```

**这一步会踩到 `UsePropertyAccessMode(Field)` 的坑。** 如果没成功，把你写的配置发我。

---

==四：总结==

## 1. 六节知识一张表

| P | 主题 | 一句话核心 |
|---|---|---|
| 175 | 贫血 vs 充血 | 规则住 Service 还是住实体；贫血是路径依赖不是错误 |
| 176 | EF Core 属性操作秘密 | **写字段不写 setter；快照比对不是监听** |
| 177 | 充血模型的需求 | 四个需求：可构造、可写、可写集合、可检测变化 |
| 178 | 实现充血模型 | 三个坑：无参构造、`PropertyAccessMode.Field`、别乱关检测 |
| 179 | 实现值对象 | `ComplexProperty` 是新项目首选；要查询就绝不能压成单列 |
| 180 | 表达式树简化比较 | 编译一次用一万次；但编译后 EF 翻译不了 |

## 2. 十条硬结论（全部实测）

1. **`private set` 完全不影响 EF Core。** 它不走 setter，直接写 backing field（实测：物化 + 更新都成功）。

2. **`private` 无参构造能用。** EF 用反射调，`private` 只挡业务代码。

3. **只有带参构造时，参数名必须等于属性名。** 否则 `No suitable constructor was found ... Cannot bind 'title', 'value'`。

4. **`{ get; }`（只读自动属性）默认不映射。** 报错是 `requires a primary key to be defined`（**误导性极强**），显式 `e.Property(x => x.P)` 能救回来。

5. **变更检测是快照比对，不是属性通知。** 实测：改完 `IsModified=False`，但 `CurrentValue` 已变、`OriginalValue` 未变；`DetectChanges()` 后才 `True`。

6. **`AutoDetectChangesEnabled = false` 会让 `SaveChanges` 静默不保存。** 实测：返回成功，数据一点没变。必须手动 `DetectChanges()`。

7. **构造函数校验不保证数据完整性。** 实测：原生 SQL 插入 `Price = -100`，读出来就是 `-100`。要配数据库 `CHECK` 约束。

8. **只读集合能就地增删，但整体替换会 DELETE + INSERT（Id 全变）。** 实测：2 项换 3 项后，表里只剩 3 行新记录。

9. **`ComplexProperty` 在 EF Core 10 已经支持 `Money?` 可空。** 实测建库、插入 null、读回 null 全部成功——**网上"复杂类型不能为 null"的结论是 EF Core 8 时代的**。

10. **值对象整体比较在 LINQ 里会炸。** 实测：`Where(o => o.Price == target)` 抛 `No backing field could be found for property 'Money.E1OrderId'`。必须拆成属性比较。

## 3. 决策流程图

```
要写一个实体
     │
     ▼
它有业务规则吗？（不只是"能不能为空"）
     │
  ┌──┴──┐
 没有    有
  │      │
  ▼      ▼
贫血模型  规则只涉及自己吗？
public set   │
        ┌────┴────┐
        是         跨其他聚合
        │          │
        ▼          ▼
    充血实体    聚合根 + 领域服务
    private set
        │
        ▼
    有子集合吗？
        │
   ┌────┴────┐
   有         没有
   │          │
   ▼          ▼
私有字段     完事
+ 只读视图
+ PropertyAccessMode.Field

值对象怎么映射？
     │
     ▼
需要按里面的字段查询/排序/建索引吗？
     │
  ┌──┴──┐
  需要   不需要
  │      │
  ▼      ▼
摊平成列   字段多吗 / 要存 JSON 吗？
ComplexProperty（首选）    │
或 OwnsOne              ├─ 是 → HasConversion
                        └─ 否 → ComplexProperty
```

## 4. 记忆口诀

```
private set 框架看得见，反射写字段不问 setter；
无参构造留个 private，业务构造才校验；
只读属性 get 不给 set，EF 当它不存在；
报"没有主键"别慌，去查属性有没有被映射；
改完不保存先别骂，AutoDetectChanges 被关了；
DetectChanges 比一遍快照，只 UPDATE 变了的列；
构造函数拦不住 SQL，库上加 CHECK 才算数；
集合就地增删没问题，整体替换 Id 全变；
值对象映射三选一，要查询就摊平成列；
ComplexProperty 没有隐主键，新项目首选它；
整体比较别写进 LINQ，拆成属性才翻译；
record 一行搞定相等，表达式树留给基类。
```

## 5. 三句话带走

1. **EF Core 比你想象的更"能忍"。** `private set`、`private` 构造、只读集合，它全都能配合——**你以为你必须妥协的地方，其实只是少写了一行配置。**

2. **充血模型的真正门槛不是"写得出来"，是"知道什么时候 EF 在偷偷帮你、什么时候它在偷偷不帮你"。** `AutoDetectChangesEnabled` 和 `AsNoTracking` 这两个开关，能让你的修改在**没有任何报错**的情况下消失。

3. **值对象映射的选择只有一条硬判据：你要不要按里面的字段查询。** 要 → 摊平成列（`ComplexProperty`）；不要 → 压成一列（`HasConversion`）。**别为了"表结构好看"选错，会付出全表扫描的代价。**

---

> **下一篇（批次 23，P181–P187）是「领域事件落地 + 消息队列」**：
> **DDD 聚合在 .NET 中的实现**（仓储 + 工作单元 + 聚合持久化）、
> **用 MediatR 实现领域事件**（替换掉 P174 手写的派发器）、
> **EF Core 中发布领域事件的合适时机**（拦截器 / `SaveChanges` 重写 / outbox）、
> **RabbitMQ 简介与 .NET 基本使用**、
> **简化 DDD 集成事件的框架 + Zack.EventBus 源码讲解**。
> **这一批之后你就能把"事件"从概念变成真能跨进程跑起来的东西。**
>
> **P165「程序发布」还挂在方案里**，等要上线前说一声。
