==一：概念==

**这一节到底在学什么**

数据库里没有"对象"，只有表和列。两个表要建立联系，物理上只有一种办法：**在其中一张表上放一列，存另一张表的主键值**，这一列叫外键（Foreign Key）。

C# 里则完全是另一套语言：对象之间靠**属性引用**联系 —— `book.Author` 直接拿到 Author 对象，`author.Books` 直接拿到集合。

**EF Core 的关系配置，就是把这两套语言对齐**：

```
数据库视角                          对象视角
T_Books                              Book 类
  Id                                   Id
  AuthorId  ─── 外键 ───┐              AuthorId  普通属性（存数字）
  Title                 │              Author    引用导航（存对象）
                        ↓              Title
T_Authors            Author 类
  Id          ←──── 主体主键           Id
  Name                                 Name
                                       Books     List<Book> 集合导航
```

没有关系配置，你要写：

```csharp
var book = ctx.Books.First(b => b.Id == 1);
var author = ctx.Authors.First(a => a.Id == book.AuthorId);  // 手动二次查询
```

配好关系后，一句 `Include` 就够（3-15 详讲）。**所以关系配置解决的是"少写一次手写 JOIN"的问题，顺便还让 EF 知道删除时该怎么处理子数据。**

---

**三个术语，后面几十节一直在用**

| 术语 | 含义 | 本例 | 记忆点 |
|---|---|---|---|
| **主体** Principal | "一"的那一方，被指向的 | `Author` | 有主键，别人来指我 |
| **依赖** Dependent | "多"的那一方，外键住在它身上 | `Book` | 有外键，我指着别人 |
| **外键** ForeignKey | 依赖里指向主体主键的那个**标量属性** | `Book.AuthorId` | 只是个 `long`，不是对象 |

> 一句话：**外键总在"多"的一方**。多的一方"背着"外键，一的一方"收着"集合。

---

**一对多的三件套（缺一件就靠约定补，或者要手写配置）**

| 编号 | 东西 | 住在哪 | 本例代码 | 干什么 |
|---|---|---|---|---|
| ① | 外键属性 | 依赖 | `public long AuthorId { get; set; }` | 存主体的主键值 |
| ② | 引用导航属性 | 依赖 | `public Author Author { get; set; }` | 从书直接拿到作者对象 |
| ③ | 集合导航属性 | 主体 | `public List<Book> Books { get; set; }` | 从作者直接拿到所有书 |

**导航属性不是数据库字段**，它们是 EF 在内存里"连线"用的。`AuthorId` 才是列。

---

**EF Core 的约定（Convention）：它会自己猜**

只要满足下面任意一条，EF Core **不写一行配置**也能认出一对多：

| 情形 | 例子 | 是否识别 |
|---|---|---|
| 外键名 = `<导航属性名>Id` | `Author` + `AuthorId` | ✅ |
| 外键名 = `<主体类名>Id` | `Author` 类 + `AuthorId`（就算没写 `Author` 导航） | ✅ |
| 外键名 = `<主体类名><主体主键名>` | 主体主键叫 `AuthorKey` 时，外键叫 `AuthorAuthorKey` | ✅ |
| 外键名完全对不上 | `Author` + `WriterId` | ❌ 猜不出，会另建一个**影子属性** `AuthorId` |
| 一张表有两个外键指同一主体 | `AuthorId` + `ReviewerId`（都是 Author） | ⚠️ 分不清谁配谁，必须手写 |

**影子属性（Shadow Property）** 值得单独说一句：EF 发现"有个导航属性但没有对应外键列"，就会在模型里凭空造一个 `AuthorId` 列，你 C# 类里根本没有这个属性，读写它只能靠 `ctx.Entry(book).Property("AuthorId").CurrentValue`。这是新手最困惑的现象之一 —— **所以永远显式写出外键属性**。

---

**约定能猜的时候，为什么还要显式配置**

| 场景 | 约定的表现 | 为什么必须手写 |
|---|---|---|
| 外键命名不规范（`WriterId`） | 造影子属性，你拿不到值 | 告诉 EF 真正的列 |
| 同一实体两个外键指向同一表 | 直接抛异常 | 明确谁配哪个导航 |
| 想改删除行为 | 默认 `Cascade` | 业务上常常不允许级联删 |
| 想加索引 / 改名 / 指定列类型 | 无 | 约定管不了 |
| 团队协作 | 看代码看不出关系 | 配置就是文档 |

> 实战原则：**能用约定就用约定，关键关系一律显式写 Fluent API**。杨中科课程里的项目全程显式写，就是为了让你形成肌肉记忆。

---

**必选 vs 可选 —— 这是唯一必须想清楚的业务决策**

区别只由一件事决定：**外键属性的类型能不能为 null**。

| 外键写法 | 关系性质 | EF 默认删除行为 | 语义 |
|---|---|---|---|
| `public long AuthorId` | **必选**（NOT NULL） | `Cascade` | 书必须有作者；删作者 → 书跟着删 |
| `public long? AuthorId` | **可选**（可为 NULL） | `ClientSetNull` | 书可以没作者；删作者 → 书的 `AuthorId` 置 NULL |

这不是技术细节，是**业务规则**：

- 订单必须有客户 → 非空 + `Restrict`（不许删有订单的客户，否则账目没了）
- 文章可以没有分类 → 可空 + `SetNull`
- 评论必须属于某篇文章 → 非空 + `Cascade`（文章删了评论留着没意义）

---

**符号逐个拆解（本节新增的全部 API，第一次出现必须讲清）**

| 符号 | 是什么 | 谁调用它 | 不写会怎样 |
|---|---|---|---|
| `DbContext` | EF Core 的**数据库会话**基类，代表"一次工作单元" | 你 `new` 或 DI 注入 | 没有它就无法访问数据库 |
| `DbSet<T>` | 表在内存里的**入口集合**，`ctx.Books` 就代表整张表 | 你写 LINQ 时 | 只能走 `ctx.Set<T>()`，代码难读 |
| `Set<T>()` | `DbContext` 的**泛型方法**，按类型取 `DbSet<T>` | `DbSet<T>` 属性内部 | 每个实体都要显式声明属性 |
| `=>` 表达式体属性 | C# 语法糖：`public DbSet<Book> Books => Set<Book>();` 每次访问都调 `Set` | 编译器展开 | 写成 `{ get; set; }` 也能用，但 EF 需要初始化，容易 NRE |
| `ModelBuilder` | `OnModelCreating` 的参数，**模型构建器**，收集所有映射规则 | 框架在你首次用上下文时调用 | 无模型 → 无法建表 |
| `OnModelCreating(ModelBuilder)` | `DbContext` 的**虚方法**，EF 在构建模型时调用一次 | 框架调用，你重写 | 所有约定之外的配置无处可写 |
| `IEntityTypeConfiguration<T>` | **接口**，把一个实体的全部配置封装成一个类 | 你实现它，EF 读取 | 配置全堆在 `OnModelCreating` 里，几百行 |
| `EntityTypeBuilder<T>` | `Configure` 方法的参数，**单实体的配置入口**（Fluent API 起点） | 框架传入 | — |
| `ApplyConfigurationsFromAssembly(Assembly)` | `ModelBuilder` 的方法，**扫描程序集里所有 `IEntityTypeConfiguration<>` 实现并应用** | 你在 `OnModelCreating` 里调 | 每个配置类都要手写 `ApplyConfiguration` |
| `HasOne(expr)` | 声明"当前实体有 **1 个** 某类型" —— 返回关系构建器 | Fluent 链开头 | — |
| `WithMany(expr)` | 接在 `HasOne` 后，声明"对方有 **N 个** 我" | 链式调用 | 不写 = 对方没有集合导航（单向） |
| `HasMany(expr)` | 反向起点："当前实体有 **N 个** 某类型" | 从主体侧写时用 | — |
| `WithOne(expr)` | 接在 `HasMany` 后，声明"对方只有 **1 个** 我" | 链式调用 | — |
| `HasForeignKey(expr)` | 指定**哪一个是外键属性** | 链式调用 | 靠约定猜，猜不出就造影子属性 |
| `IsRequired(bool)` | 标记导航/属性**必填**（列 NOT NULL） | 链式调用 | 由外键可空性决定 |
| `OnDelete(DeleteBehavior)` | 指定**删除主体时对依赖做什么** | 链式调用 | 用 EF 默认值（必选 Cascade / 可选 ClientSetNull） |
| `DeleteBehavior` | **枚举**，5 个值：`Cascade` `Restrict` `SetNull` `NoAction` `ClientSetNull` | `OnDelete` 的参数 | — |
| `HasIndex(expr)` | 建索引（EF 默认给外键建，配复合索引时手写） | 链式调用 | 外键查询变全表扫 |
| `HasPrincipalKey(expr)` | 主体**主键不是**被引用的那个唯一键时，指定真正的被引用键 | 链式调用 | 只能用主键做外键目标 |
| `Include(expr)` | 查询时**顺便把导航属性一起查出来**（EF Core 的"预加载"） | 你的 LINQ 里 | 导航属性恒为空，且**不报错** |
| `ThenInclude(expr)` | 接在 `Include` 后，**继续下一层**导航 | 链式调用 | 只能带一层 |
| `Expression<Func<T, object?>>` | 参数类型：**表达式树**版的 lambda（不是委托），EF 能解析它、翻译成 SQL | 编译器自动转换 | 传 `Func` 就变成内存执行，SQL 里没有 JOIN |

---

**五个 `DeleteBehavior` 到底差在哪（面试常问）**

| 值 | 数据库层动作 | EF 内存层动作 | 典型用途 |
|---|---|---|---|
| `Cascade` | `ON DELETE CASCADE` | 把子对象标记 Deleted | 必选关系默认；评论随文章删 |
| `ClientSetNull` | `ON DELETE NO ACTION` | 显式把内存里的 FK 置 `null` | **可选关系默认** |
| `SetNull` | `ON DELETE SET NULL` | 置 `null` | 想让数据库自己处理 |
| `Restrict` | `ON DELETE NO ACTION` | **不删，抛异常** | 有子记录就不许删主体（订单→客户） |
| `NoAction` | `ON DELETE NO ACTION` | 什么都不管 | 交给数据库约束报错 |

> 记忆法：**带 `Client` 前缀 = 只有 EF 在内存里处理，数据库不管**。

==二：格式==

**1. 靠约定（外键名对上就能跑）**
```csharp
public class Author
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<Book> Books { get; set; } = new();   // 集合导航
}

public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public long AuthorId { get; set; }               // 外键 = <导航名>Id
    public Author Author { get; set; } = null!;      // 引用导航
}
```

**2. Fluent API 三步定关系（标准写法）**
```csharp
builder.HasOne(b => b.Author)            // ① 一本书 → 有 1 个 Author
       .WithMany(a => a.Books)           // ② 一个 Author → 有 N 本 Book
       .HasForeignKey(b => b.AuthorId)   // ③ 外键是 Book.AuthorId
       .IsRequired()                     // ④ 必选（!= 外键非空）
       .OnDelete(DeleteBehavior.Cascade);// ⑤ 级联删
```

**3. 反向写法（从主体出发，完全等价）**
```csharp
builder.HasMany(a => a.Books)
       .WithOne(b => b.Author)
       .HasForeignKey(b => b.AuthorId);
```

**4. 没有导航属性时（单向关系，3-17 的伏笔）**
```csharp
builder.HasOne<Author>()                 // 不给 lambda
       .WithMany()
       .HasForeignKey(b => b.AuthorId);
```

**5. 配置类 + 自动扫描（项目里统一这么写）**
```csharp
public class BookConfig : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.HasOne(b => b.Author)
               .WithMany(a => a.Books)
               .HasForeignKey(b => b.AuthorId);
    }
}
```
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ApplyConfigurationsFromAssembly(this.GetType().Assembly);
}
```

**6. 删除行为可选值**
```csharp
.OnDelete(DeleteBehavior.Cascade)        // 级联删（必选关系默认）
.OnDelete(DeleteBehavior.ClientSetNull)  // 内存置 NULL（可选关系默认）
.OnDelete(DeleteBehavior.SetNull)        // 数据库 ON DELETE SET NULL
.OnDelete(DeleteBehavior.Restrict)       // 有子记录就抛异常
.OnDelete(DeleteBehavior.NoAction)       // 交给数据库约束
```

**7. 查询带出子集合**
```csharp
var authors = await ctx.Authors.Include(a => a.Books).ToListAsync();     // 一 → 多
var books   = await ctx.Books.Include(b => b.Author).ToListAsync();      // 多 → 一
var deep    = await ctx.Authors.Include(a => a.Books).ThenInclude(b => b.Tags).ToListAsync(); // 两层
```

==三：代码==

**场景**：控制台项目 `RelationDemo`，`Author` 1:N `Book`，从建表走到"级联删除"和"Restrict 阻止删除"两种结果。

**第 0 步：建项目 + 装包**
```bash
dotnet new console -n RelationDemo
cd RelationDemo
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet tool install --global dotnet-ef
```

**第 1 步：实体**
```csharp
// Models/Author.cs
public class Author
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<Book> Books { get; set; } = new();
}

// Models/Book.cs
public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }

    public long AuthorId { get; set; }              // 非空 → 必选关系
    public Author Author { get; set; } = null!;     // null! 只是骗过可空检查，见下方说明
}
```

> `= null!` 里的 `!` 是**可空抑制符（null-forgiving operator）**：告诉编译器"我知道它现在是 null，但我保证 EF 会在运行时填上"。不写只是编译警告（CS8618），不影响运行；如果不希望出现 null 语义，更干净的做法是 `public Author? Author { get; set; }`。

**第 2 步：两个配置类**
```csharp
// Models/Configs/AuthorConfig.cs
public class AuthorConfig : IEntityTypeConfiguration<Author>
{
    public void Configure(EntityTypeBuilder<Author> builder)
    {
        builder.ToTable("T_Authors");
        builder.Property(a => a.Name).HasMaxLength(50).IsRequired();
    }
}

// Models/Configs/BookConfig.cs
public class BookConfig : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("T_Books");
        builder.Property(b => b.Title).HasMaxLength(100).IsRequired();

        builder.HasOne(b => b.Author)
               .WithMany(a => a.Books)
               .HasForeignKey(b => b.AuthorId)
               .IsRequired()
               .OnDelete(DeleteBehavior.Cascade);
    }
}
```

**第 3 步：DbContext**
```csharp
public class DemoContext : DbContext
{
    public DbSet<Author> Authors => Set<Author>();
    public DbSet<Book> Books => Set<Book>();

    protected override void OnConfiguring(DbContextOptionsBuilder opt)
    {
        opt.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=RelationDemo;Trusted_Connection=True;TrustServerCertificate=True")
           .LogTo(Console.WriteLine, LogLevel.Information)   // 顺手看 SQL（3-12）
           .EnableSensitiveDataLogging();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 扫描当前程序集里所有 IEntityTypeConfiguration<T> 实现，逐个 ApplyConfiguration
        modelBuilder.ApplyConfigurationsFromAssembly(this.GetType().Assembly);
    }
}
```

**第 4 步：生成数据库**
```bash
dotnet ef migrations add AddAuthorBook
dotnet ef database update
```
生成的 DDL（在 `xxx_AddAuthorBook.cs` 的 `Up()` 里能看到）：
```sql
CREATE TABLE [T_Authors] (
    [Id]   bigint       NOT NULL IDENTITY,
    [Name] nvarchar(50) NOT NULL,
    CONSTRAINT [PK_T_Authors] PRIMARY KEY ([Id])
);

CREATE TABLE [T_Books] (
    [Id]       bigint        NOT NULL IDENTITY,
    [Title]    nvarchar(100) NOT NULL,
    [Price]    float         NOT NULL,
    [AuthorId] bigint        NOT NULL,
    CONSTRAINT [PK_T_Books] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_T_Books_T_Authors_AuthorId]
        FOREIGN KEY ([AuthorId]) REFERENCES [T_Authors] ([Id]) ON DELETE CASCADE
);
CREATE INDEX [IX_T_Books_AuthorId] ON [T_Books] ([AuthorId]);   -- EF 自动给外键建索引
```
**三件事必须看见**：`AuthorId bigint NOT NULL`（必选）、`ON DELETE CASCADE`（来自 `OnDelete`）、`IX_T_Books_AuthorId`（EF 约定自动建的外键索引）。

**第 5 步：用导航属性一次插入主从数据**
```csharp
using var ctx = new DemoContext();

var author = new Author
{
    Name = "杨中科",
    Books = new List<Book>
    {
        new() { Title = "C# 入门",  Price = 49 },
        new() { Title = "EF Core",  Price = 59 }
    }
};

ctx.Authors.Add(author);        // 只 Add 主体，依赖自动跟进来（图遍历）
await ctx.SaveChangesAsync();

Console.WriteLine($"作者 Id={author.Id}，书1 FK={author.Books[0].AuthorId}，书2 FK={author.Books[1].AuthorId}");
```
输出：
```
作者 Id=1，书1 FK=1，书2 FK=1
```
> **外键是 EF 自动回填的**：先 `INSERT T_Authors` 拿到自增 Id，再把它写进两条 `INSERT T_Books` 的 `AuthorId`。你从没给 `AuthorId` 赋值，它却对了 —— 这就是关系配置在起作用。

**第 6 步：正向查询（1 → N，必须 Include）**
```csharp
var authors = await ctx.Authors.Include(a => a.Books).ToListAsync();
foreach (var a in authors)
{
    Console.WriteLine($"{a.Name} 共 {a.Books.Count} 本：");
    foreach (var b in a.Books) Console.WriteLine($"    - {b.Title} ({b.Price})");
}
```
输出：
```
杨中科 共 2 本：
    - C# 入门 (49)
    - EF Core (59)
```
把 `Include` 删掉，`a.Books.Count` 是 **0**，而且**不报错**。日志里也只剩一条没有 JOIN 的 `SELECT`。

**第 7 步：反向查询（N → 1）**
```csharp
var books = await ctx.Books
    .Include(b => b.Author)
    .Where(b => b.Price > 50)
    .ToListAsync();

foreach (var b in books) Console.WriteLine($"{b.Title} —— {b.Author.Name}");
```
输出：
```
EF Core —— 杨中科
```

**第 8 步：验证级联删除**
```csharp
var a = await ctx.Authors.Include(x => x.Books).FirstAsync(x => x.Id == 1);
ctx.Authors.Remove(a);
await ctx.SaveChangesAsync();

Console.WriteLine($"剩余作者 {await ctx.Authors.CountAsync()}，剩余书 {await ctx.Books.CountAsync()}");
```
输出：
```
剩余作者 0，剩余书 0
```

**第 9 步：改成 Restrict，看它拦住你**

把 `BookConfig` 的 `OnDelete(...)` 改成 `DeleteBehavior.Restrict`，重新迁移：
```bash
dotnet ef migrations add ChangeToRestrict
dotnet ef database update
```
再执行第 8 步相同代码，这次不删了，而是抛：
```
Microsoft.EntityFrameworkCore.DbUpdateException:
  An error occurred while saving the entity changes.
  ---> Microsoft.Data.SqlClient.SqlException:
  The DELETE statement conflicted with the REFERENCE constraint "FK_T_Books_T_Authors_AuthorId".
```
**这就是"业务规则落到数据库"的样子**：想删作者？先把他的书处理掉。

**第 10 步（选做）：亲眼看到影子属性**

把 `Book.AuthorId` 这一行**注释掉**（保留 `Author` 导航），运行：
```csharp
var b = await ctx.Books.FirstAsync();
Console.WriteLine(b.GetType().GetProperty("AuthorId") is null);       // True：类里真的没有这个属性
Console.WriteLine(ctx.Entry(b).Property("AuthorId").CurrentValue);    // 但模型里有
```
输出：
```
True
1
```
**属性不存在，列却存在** —— 这就是影子属性。它也是"为什么一定要显式写外键属性"的最好证据：值在库里，你拿不到。

==四：总结==

**一页速查**

| 要点 | 结论 |
|---|---|
| 一对多的物理实现 | 外键列住在"多"的一方 |
| 三个术语 | 主体（一）/ 依赖（多）/ 外键（依赖身上的标量属性） |
| 三件套 | 外键属性 + 引用导航（多）+ 集合导航（一） |
| 约定识别规则 | `<导航名>Id`、`<主体类名>Id`、`<主体类名><主体主键名>` |
| 认不出的后果 | 生成**影子属性**，C# 类里没有、库里却有 |
| 标准三步 | `HasOne().WithMany().HasForeignKey()` |
| 反向等价 | `HasMany().WithOne().HasForeignKey()`，写哪边都行 |
| 必选 / 可选 | 只看外键类型：`long` = 必选、`long?` = 可选 |
| 默认删除行为 | 必选 → `Cascade`；可选 → `ClientSetNull` |
| 推荐组织方式 | 一个实体一个 `XxxConfig : IEntityTypeConfiguration<T>`，靠 `ApplyConfigurationsFromAssembly` 加载 |
| 查询 | 正反方向都要 `Include`，不写就静默返回空/`null` |
| 外键索引 | EF 默认自动创建（`IX_<表>_<外键列>`） |

**删除行为对照**

| 值 | 数据库 | EF 内存 | 该用在哪 |
|---|---|---|---|
| `Cascade` | `ON DELETE CASCADE` | 标记子对象删除 | 强从属（评论 → 文章） |
| `ClientSetNull` | `NO ACTION` | FK 置 null | 可选关系默认 |
| `SetNull` | `ON DELETE SET NULL` | 置 null | 想交给数据库 |
| `Restrict` | `NO ACTION` | 抛异常阻止 | 有子记录不许删主体 |
| `NoAction` | `NO ACTION` | 不管 | 有数据库触发器时 |

**五个易错点**

1. **`Author` 导航属性为 `null` 就以为关系没配上** —— 是忘了 `Include`，不是配置错。
2. **外键声明成 `long?` 又调 `.IsRequired()`** —— 报 `The property 'AuthorId' on entity type 'Book' cannot be nullable`。二选一。
3. **`SetNull` 用在非空外键上** —— 数据库层直接报错，因为 `AuthorId` 是 `NOT NULL`，不能写 NULL。
4. **同一张表两个外键（`AuthorId` / `ReviewerId`）都指向 `Author`** —— 只写 `HasOne(a => a.Books)` 不行，必须两边各配一次 `HasOne/WithMany` 明确对应关系。
5. **配置类没被扫描到** —— `ApplyConfigurationsFromAssembly` 传的是**配置类所在的程序集**。配置类放在独立类库、而 `DbContext` 在主项目时，要传那个类库的 `Assembly`（4-36 多层项目必踩）。

**记忆口诀**

> **一对多：多的一方背外键，一的一方收集合。**
> **HasOne → WithMany → HasForeignKey，三步定关系；反向 HasMany → WithOne 一样通。**
> **外键非空是必选、可空是可选；必选默认级联删，可选默认置空。**
> **外键命名对不上，EF 偷偷造影子；影子看不见，所以永远显式写。**
> **查询不忘 Include，不写不报错、只给你空集合。**
