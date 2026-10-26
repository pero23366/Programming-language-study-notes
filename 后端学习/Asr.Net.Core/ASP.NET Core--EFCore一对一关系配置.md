==一：概念==

**一对一的物理难题**

一对多在数据库里很自然：外键放"多"那边就行。一对一却有个物理约束：

> **两张表不能互相指。**

如果 `Books` 存 `DetailId`、`BookDetails` 又存 `BookId`，就形成循环依赖 —— 第一行数据根本插不进去（插书要先有详情，插详情要先有书）。

所以必须选一边当**依赖方**，只有它存外键：

```
Books                          BookDetails
┌────┬────────────┐            ┌────┬─────────┬────────┐
│ Id │   Title    │            │ Id │ Summary │ BookId │
├────┼────────────┤            ├────┼─────────┼────────┤
│ 1  │ C# 入门     │ ←──────────│ 1  │ "..."   │   1    │
└────┴────────────┘            └────┴─────────┴────────┘
       主体                           依赖（外键在这，且必须 UNIQUE）
```

| 角色 | 谁 | 判断依据 |
|---|---|---|
| 主体 Principal | `Book` | 有独立主键，被别人指 |
| 依赖 Dependent | `BookDetail` | 存外键 `BookId`，且这一列**必须唯一** |

---

**一对一和一对多差在哪：就差一条唯一约束**

| | 一对多 | 一对一 |
|---|---|---|
| 外键在依赖方 | ✅ | ✅ |
| 外键列唯一 | ❌ 允许重复 | ✅ **必须** |
| 主体导航 | `List<Book>` 集合 | `BookDetail?` **单个对象** |
| 配置方法 | `HasOne().WithMany()` | `HasOne().WithOne()` |

**EF 会自动给一对一的外键建 UNIQUE 索引**，所以数据库层面真的能保证"一本书只有一个详情"。

---

**为什么要把字段拆出去（业务理由）**

| 理由 | 例子 |
|---|---|
| **冷热分离** | `Books` 常查（列表页要 Title/Price），`Summary` 大文本很少查 → 拆出去让主表更小更快 |
| **权限隔离** | 用户表公开可查，`UserProfile`（身份证、手机号）单独一张表、单独控制 |
| **字段太多** | 一张表 60 列，其中 15 列是"详情类" → 拆成主表 + 详情表 |

**注意**：一对一不是"看起来高级"，把两个字段硬拆成两张表只会多一次 JOIN。

---

**这一节唯一必须记住的语法细节**

> **`HasForeignKey` 在一对一里必须写泛型参数。**

因为 `HasOne(b => b.Detail).WithOne(d => d.Book)` 两边都给了 lambda，EF **无法判断哪个是依赖** —— 两边看起来地位对等。必须在 `HasForeignKey<BookDetail>(...)` 里明确说："依赖方是 `BookDetail`"。

这是整个关系映射里**唯一必须写泛型**的场景（一对多的泛型通常可省）。

---

**共享主键方案（更省一个索引）**

如果让依赖方的**主键同时当外键**，就不需要额外的 `BookId` 列和唯一索引：

```
BookDetails
┌────┬─────────┐
│ Id │ Summary │   ← Id 既是主键，又是外键（= Books.Id）
└────┴─────────┘
```

好处：少一列、少一个索引。
坏处：插入时必须先拿到主体的 Id，`Id` 不能由数据库自增。

---

**符号逐个拆解（本节新增）**

| 符号 | 是什么 | 关键点 | 不写会怎样 |
|---|---|---|---|
| `HasOne().WithOne()` | 一对一构建器，返回 `ReferenceReferenceBuilder<TEntity, TRelated>` | 两个 `Reference`，没有集合 | 写成 `WithMany` 就是一对多 |
| `HasForeignKey<TDependent>(expr)` | **必须显式指定依赖类型** | 一对一无法推断方向 | 编译失败 `The type arguments cannot be inferred` |
| `BookDetail? Detail` | 一对一的主体侧导航 | 是**对象**，不是 `List<>` | 写成集合会让 `WithOne` 报错 |
| `UNIQUE INDEX` | EF 自动为一对一外键创建 | 保证"只有一个" | 手删了约束后一对一就退化成一对多 |
| `ValueGeneratedNever()` | 告诉 EF"这个主键不由数据库生成" | 共享主键方案必备 | 插入时 `Id` 被 IDENTITY 覆盖 |
| `DeleteBehavior.Cascade` | 删主体时连带删依赖 | 一对一常用 | 删书后详情变孤儿 |

==二：格式==

**1. 标准写法：独立主键 + 外键**
```csharp
builder.HasOne(d => d.Book)                       // 详情 → 1 本书
       .WithOne(b => b.Detail)                    // 书 → 1 个详情
       .HasForeignKey<BookDetail>(d => d.BookId)  // 泛型必写
       .OnDelete(DeleteBehavior.Cascade);
```

**2. 共享主键写法**
```csharp
builder.HasOne(d => d.Book)
       .WithOne(b => b.Detail)
       .HasForeignKey<BookDetail>(d => d.Id);     // 主键即外键
builder.Property(d => d.Id).ValueGeneratedNever();
```

**3. 可选的一对一（书可能还没填详情）**
```csharp
public BookDetail? Detail { get; set; }     // 主体侧可空
// 依赖侧外键保持 long BookId（只要 Book 存在就一定有 BookId）
```

==三：代码==

**第 1 步：实体**

```csharp
// Models/Book.cs —— 加一个导航
public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }
    public DateTime PubTime { get; set; }

    public long AuthorId { get; set; }
    public Author Author { get; set; } = null!;

    public BookDetail? Detail { get; set; }     // 一对一（单个对象，可空）
}
```

```csharp
// Models/BookDetail.cs
namespace ASP.NET_Core__图书管理系统.Models
{
    public class BookDetail
    {
        public long Id { get; set; }
        public string? Summary { get; set; }     // 简介，大文本
        public int PageCount { get; set; }

        public long BookId { get; set; }         // 外键（EF 会建 UNIQUE 索引）
        public Book Book { get; set; } = null!;
    }
}
```

**第 2 步：配置**
```csharp
public DbSet<BookDetail> BookDetails => Set<BookDetail>();

modelBuilder.Entity<BookDetail>(entity =>
{
    entity.Property(d => d.Summary).HasMaxLength(2000);

    entity.HasOne(d => d.Book)
          .WithOne(b => b.Detail)
          .HasForeignKey<BookDetail>(d => d.BookId)   // 泛型 + 依赖方
          .OnDelete(DeleteBehavior.Cascade);          // 书删了，详情没意义
});
```

**第 3 步：迁移生成的 DDL（注意 UNIQUE）**
```sql
CREATE TABLE [BookDetails] (
    [Id]        bigint         NOT NULL IDENTITY,
    [Summary]   nvarchar(2000) NULL,
    [PageCount] int            NOT NULL,
    [BookId]    bigint         NOT NULL,
    CONSTRAINT [PK_BookDetails] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_BookDetails_Books_BookId]
        FOREIGN KEY ([BookId]) REFERENCES [Books] ([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_BookDetails_BookId] ON [BookDetails] ([BookId]);
```
**唯一的区别就是那个 `UNIQUE`** —— 没有它，一对一就会退化成一对多。

**第 4 步：插入（导航赋值，一次搞定）**
```csharp
var book = new Book
{
    Title = "C# 入门",
    Price = 49,
    PubTime = DateTime.Today,
    Author = new Author { Name = "张三" },
    Detail = new BookDetail
    {
        Summary = "从零开始学 C#，覆盖基础语法与 LINQ。",
        PageCount = 320
    }
};

_ctx.Books.Add(book);
await _ctx.SaveChangesAsync();
// 一次插 3 张表：Authors → Books → BookDetails，BookId 自动回填
```

**第 5 步：查询两个方向**
```csharp
// 书 → 详情
var b = await _ctx.Books
    .Include(x => x.Detail)
    .FirstAsync(x => x.Title == "C# 入门");

Console.WriteLine($"{b.Title}，{b.Detail?.PageCount} 页，{(b.Detail?.Summary ?? "无简介")}");
// 输出：C# 入门，320 页，从零开始学 C#，覆盖基础语法与 LINQ。
```

```csharp
// 详情 → 书
var d = await _ctx.BookDetails.Include(x => x.Book).FirstAsync();
Console.WriteLine($"{d.Book.Title} 的详情");
```

**第 6 步：验证"一对一"真的成立**
```csharp
_ctx.BookDetails.Add(new BookDetail { BookId = 1, Summary = "重复的", PageCount = 1 });
await _ctx.SaveChangesAsync();
```
抛：
```
SqlException: Cannot insert duplicate key row in object 'dbo.BookDetails'
with unique index 'IX_BookDetails_BookId'.
```
**这就是一对一和一对多的分界线**：外键列上那道 UNIQUE 约束。

**第 7 步：共享主键变体（了解即可）**
```csharp
// 配置
entity.HasOne(d => d.Book)
      .WithOne(b => b.Detail)
      .HasForeignKey<BookDetail>(d => d.Id);     // 主键即外键
entity.Property(d => d.Id).ValueGeneratedNever();

// 插入时手动对齐 Id
var book = new Book { Title = "EF Core", Price = 89, PubTime = DateTime.Today };
var detail = new BookDetail { Summary = "深入 EF", PageCount = 400 };

_ctx.Books.Add(book);
_ctx.BookDetails.Add(detail);
await _ctx.SaveChangesAsync();     // 一次保存，EF 会先插 book 再把 Id 填给 detail
```

==四：总结==

**一页速查**

| 要点 | 结论 |
|---|---|
| 外键在哪 | 只能在一方，不能两边都存 |
| 外键必须唯一吗 | 是，EF 自动建 `UNIQUE INDEX` |
| 配置方法 | `HasOne().WithOne()` |
| `HasForeignKey` | **必须写泛型** `<TDependent>`，唯一强制场景 |
| 主体导航类型 | `BookDetail?`（单个对象），不是集合 |
| 删除行为 | 依赖方通常 `Cascade`（主删从删） |
| 共享主键 | `HasForeignKey<BookDetail>(d => d.Id)` + `ValueGeneratedNever()` |
| 拆表理由 | 冷热分离 / 权限隔离 / 字段太多 |

**四个易错点**

1. **两边都存外键** → 循环依赖，插数据插不进去，迁移也可能报循环级联。
2. **`HasForeignKey` 没写泛型** → 编译报 `The type arguments cannot be inferred`（一对一无法判断依赖方向）。
3. **主体导航写成集合 `List<BookDetail>`** → 那就不是一对一了，`WithOne` 要求引用导航。
4. **以为"一对一"就不会有重复数据** → 依赖的是那道 UNIQUE 索引；手改迁移删掉它，数据库就不拦了。

**记忆口诀**

> **一对一：外键只能住一边，外键列必须唯一；主体收单个对象，依赖背着外键走。**
> **`HasOne().WithOne()` + `HasForeignKey<依赖方>`，泛型不写就编译不过。**
> **EF 自动加 UNIQUE，这道约束就是一对一和一对多的分水岭。**
> **拆出去的理由是冷热分离与权限隔离，不是"看起来高级"。**
