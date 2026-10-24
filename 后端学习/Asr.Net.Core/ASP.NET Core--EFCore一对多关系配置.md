==一：概念==
**一对多是什么**

一个作者写多本书，一本书只属于一个作者 —— 这就是一对多（1:N）。数据库里靠"**多的一方存外键**"来实现：

```
T_Authors            T_Books
---------            ---------------------------
Id (PK)  ←──────────  AuthorId (FK)
Name                 Title
```

**EF Core 的三个术语（后面一直用）**

| 术语 | 含义 | 本例 |
|---|---|---|
| **主体** Principal | "一"的那一方 | `Author` |
| **依赖** Dependent | "多"的那一方，外键住在它身上 | `Book` |
| **外键** FK | 依赖实体里指向主体的那个属性 | `Book.AuthorId` |

**配一对多，只需要凑齐三样东西**

1. **外键属性**：`public long AuthorId { get; set; }`（住在"多"的一方）
2. **集合导航属性**：`public List<Book> Books { get; set; }`（住在"一"的一方）
3. **引用导航属性**：`public Author Author { get; set; }`（住在"多"的一方）

三样齐了，EF Core 就能拼出关系。**少一样也不是不能配**，但要靠 Fluent API 补齐（见下一节 3-17 单向导航）。

**为什么还要显式配置**

EF Core 有一套**约定（Convention）**：只要外键叫 `<导航属性名>Id` 或 `<主体类名>Id`，它自己就能猜出来。

但现实中会猜错：
- 外键叫 `WriterId`（对不上 `Author` 也不是 `AuthorId`）→ 猜不出来
- 有两个外键都要指向同一张表（比如"作者"和"审稿人"都是 `Author`）→ 分不清谁是谁
- 想改删除行为、想加索引 → 约定里没有

所以真正项目里：**能用约定就用约定，关键关系一律显式写 Fluent API**。

**必选 vs 可选（这是唯一必须想清楚的一件事）**

| 外键类型 | 关系 | 默认删除行为 | 意思 |
|---|---|---|---|
| `long AuthorId`（非空） | **必选** | `Cascade` | 书必须有作者；删作者 → 书一起删 |
| `long? AuthorId`（可空） | **可选** | `ClientSetNull` | 书可以没有作者；删作者 → 书的 `AuthorId` 置 NULL |

**这个选择是业务决策，不是技术细节**：订单必须有客户 → 非空 + `Restrict`（不许删有订单的客户）；文章可以没有分类 → 可空 + `SetNull`。

**`IEntityTypeConfiguration` 为什么比写在 `OnModelCreating` 里好**

```
OnModelCreating 里写 30 张表的配置 → 一个 800 行的巨型方法
拆成 30 个 XxxConfig 类          → 每张表的规则独立成文件，增删表不动别人
```
最后在 `DbContext` 里一句 `ApplyConfigurationsFromAssembly` 全部加载 —— 这是企业项目的标准写法，也是后面 4-36 多层项目的基础。

==二：格式==
**1. 靠约定（最省事，外键命名对就能用）**
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
    public long AuthorId { get; set; }               // 外键：<导航名>Id
    public Author Author { get; set; } = null!;      // 引用导航
}
```

**2. Fluent API 三步定关系（标准写法）**
```csharp
builder.HasOne(b => b.Author)          // ① 从"多"出发：一本书有 1 个作者
       .WithMany(a => a.Books)         // ② 一个作者有 N 本书
       .HasForeignKey(b => b.AuthorId) // ③ 外键在 Book 上
       .IsRequired()                   // ④ 必选（外键非空）
       .OnDelete(DeleteBehavior.Cascade); // ⑤ 级联删除
```

**3. 反向写法（从"一"出发，完全等价）**
```csharp
builder.HasMany(a => a.Books)          // 一个作者有 N 本书
       .WithOne(b => b.Author)         // 一本书有 1 个作者
       .HasForeignKey(b => b.AuthorId);
```

**4. 配置类 + 自动加载（项目里都用这个）**
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

**5. 删除行为可选值**
```csharp
.OnDelete(DeleteBehavior.Cascade)      // 级联删（必选关系默认）
.OnDelete(DeleteBehavior.Restrict)     // 有子记录就禁止删
.OnDelete(DeleteBehavior.SetNull)      // 子记录外键置 NULL（外键必须可空）
.OnDelete(DeleteBehavior.NoAction)     // 什么都不做，交给数据库约束
.OnDelete(DeleteBehavior.ClientSetNull)// 内存里置 NULL（可选关系默认）
```

==三：代码==
**场景**：控制台项目，`Author` 一对多 `Book`，跑通"建表 → 插入 → 查询 → 级联删除"。

**第 1 步：实体**
```csharp
public class Author
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<Book> Books { get; set; } = new();
}

public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }

    public long AuthorId { get; set; }        // 外键（非空 → 必选关系）
    public Author Author { get; set; } = null!;
}
```

**第 2 步：关系配置**
```csharp
public class BookConfig : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("T_Books");
        builder.Property(b => b.Title).HasMaxLength(100).IsRequired();

        builder.HasOne(b => b.Author)
               .WithMany(a => a.Books)
               .HasForeignKey(b => b.AuthorId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class AuthorConfig : IEntityTypeConfiguration<Author>
{
    public void Configure(EntityTypeBuilder<Author> builder)
    {
        builder.ToTable("T_Authors");
        builder.Property(a => a.Name).HasMaxLength(50).IsRequired();
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
        opt.UseSqlServer("Server=.;Database=DemoDb;Trusted_Connection=True;TrustServerCertificate=True")
           .LogTo(Console.WriteLine, LogLevel.Information);   // 顺便看 SQL
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(this.GetType().Assembly);
    }
}
```

**第 4 步：生成表结构**
```bash
dotnet ef migrations add AddAuthorBookOneToMany
dotnet ef database update
```
生成的外键就落在 `T_Books` 上：
```sql
ALTER TABLE [T_Books] ADD CONSTRAINT [FK_T_Books_T_Authors_AuthorId]
    FOREIGN KEY ([AuthorId]) REFERENCES [T_Authors] ([Id]) ON DELETE CASCADE;
```

**第 5 步：用导航属性一次插入主从数据**
```csharp
using var ctx = new DemoContext();

var author = new Author
{
    Name = "杨中科",
    Books = new List<Book>
    {
        new() { Title = "C# 入门",   Price = 49 },
        new() { Title = "EF Core",  Price = 59 }
    }
};

ctx.Authors.Add(author);      // 只 Add 主表，子表自动跟着进
await ctx.SaveChangesAsync();
// 关键：不用手动给 Book.AuthorId 赋值，EF 插完主表拿到 Id 后自动回填
Console.WriteLine($"作者 Id = {author.Id}，书 1 的 AuthorId = {author.Books[0].AuthorId}");
```
输出：
```
作者 Id = 1，书 1 的 AuthorId = 1
```

**第 6 步：查询时把子集合带出来（`Include`）**
```csharp
var list = await ctx.Authors
    .Include(a => a.Books)          // 没有这句，a.Books 永远是空集合
    .ToListAsync();

foreach (var a in list)
{
    Console.WriteLine($"{a.Name} 共 {a.Books.Count} 本");
    foreach (var b in a.Books) Console.WriteLine($"    - {b.Title}");
}
```
> **`Include` 是延迟加载关闭时的唯一办法**。忘写不会报错，只会静默返回空集合 —— 这是新手最常见的坑。

**第 7 步：验证级联删除**
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
**两本书跟着作者一起没了** —— 这就是 `Cascade`。如果业务上不允许这么删，改成 `.OnDelete(DeleteBehavior.Restrict)`，删有书的作者时会直接抛异常。

**第 8 步：反向查询（从书找作者）**
```csharp
var books = await ctx.Books
    .Include(b => b.Author)              // 用引用导航
    .Where(b => b.Price > 50)
    .ToListAsync();

foreach (var b in books)
    Console.WriteLine($"{b.Title} —— {b.Author.Name}");
```

==四：总结==

| 要点 | 说明 |
|---|---|
| **一对多实现方式** | 多的一方存外键，一的一方收集合 |
| **三个必需件** | 外键属性 + 集合导航 + 引用导航 |
| **约定规则** | 外键名 = `<导航属性名>Id` 或 `<主体类名>Id` 时自动识别 |
| **三步配置** | `HasOne().WithMany().HasForeignKey()`，从哪一方写都等价 |
| **必选 / 可选** | 外键非空 = 必选（默认 Cascade）；可空 = 可选（默认 ClientSetNull） |
| **删除行为** | `Cascade` / `Restrict` / `SetNull` / `NoAction` / `ClientSetNull` |
| **查询必须 Include** | 不写 `Include` 导航集合永远是空的，而且不报错 |
| **推荐写法** | `IEntityTypeConfiguration<T>` + `ApplyConfigurationsFromAssembly` |
| **外键回填** | `Add` 主表 + `SaveChanges` 后，子表的 `AuthorId` 自动填好 |

**三个易错点**

1. **`IsRequired()` 和外键类型冲突**：外键声明成 `long?` 又调 `.IsRequired()`，EF 会抛 `The property 'AuthorId' ... cannot be nullable`。
2. **`SetNull` 用在非空外键上**：数据库直接报错，因为不能把 NULL 写给非空列。
3. **忘了 `Include`**：查询出一堆空集合，还以为是没插进去 —— 用第 6 节学的 `LogTo` 看 SQL，会发现根本没 `JOIN`。

**记忆口诀：**

> **一对多：多的一方存外键，一的一方收集合。**
> **HasOne → WithMany → HasForeignKey，三步定关系。**
> **外键可空是可选，非空是必选；必选级联删，可选置空。**
> **查询不忘 Include，不然集合永远空。**
