==一：概念==

**这一节在补 P63 留下的一个洞**

P63 里 `Book` 只有**一个**外键 `AuthorId`，关系一目了然。但真实业务里，一张表经常要指向同一个目标表**好几次**：

| 场景 | 两个外键 | 都指向 |
|---|---|---|
| 图书管理系统 | `AuthorId`（作者）/ `ReviewerId`（审稿人） | `Authors` |
| 请假单 | `RequesterId`（申请人）/ `ApproverId`（审批人） | `Users` |
| 订单 | `BuyerId`（买家）/ `SellerId`（卖家） | `Users` |
| 文章 | `AuthorId`（作者）/ `LastEditorId`（最后修改人） | `Users` |

**每多一个外键，就多一条独立的一对多关系。** 一个实体身上的外键数量没有上限，但每一条关系都要单独配置。

---

**"额外"这个词的两层含义（别搞混）**

| 类型 | 例子 | 是什么 | 归属 |
|---|---|---|---|
| **额外外键字段** | `Book.ReviewerId` | 指向另一条关系的外键 | 本节内容，是**关系** |
| **业务冗余字段** | `Book.AuthorName`（连名字一起存） | 为查询方便复制一份数据 | 不是关系，无需配置，但要自己保证同步 |

本节只讲第一种。

---

**约定在这里为什么会失效**

EF Core 的约定只看两样：**导航属性名** + **外键名**。

| 情况 | 能不能自动配对 |
|---|---|
| 导航叫 `Author` / `Reviewer`，外键叫 `AuthorId` / `ReviewerId` | ✅ 能，`<导航名>Id` 一一对上 |
| 导航叫 `Author` / `Reviewer`，外键叫 `AuthorId` / `CheckerId` | ❌ `CheckerId` 对不上任何导航 |
| 只写两个导航，外键一个都没写 | ❌ 造两个影子属性，还可能配错 |

对不上的后果不是"少一条关系"，而是**直接抛异常**：

```
InvalidOperationException: Cannot create a relationship between 'Author.Books' and 'Book.Reviewer'
because a relationship already exists between 'Author.Books' and 'Book.Author'.
```

翻译：**`Author.Books` 这个集合已经被 `Book.Author` 占用了，第二个导航不能再指向它。**

> 本节最重要的一句话：**两个导航不能共享同一个集合导航属性。**

---

**所以集合导航也必须拆成两个**

```csharp
public List<Book> Books { get; set; }          // 我写的书（被 Book.Author 占用）
public List<Book> ReviewedBooks { get; set; }  // 我审的书（给 Book.Reviewer 用）
```

---

**必选还是可选，只看外键的 C# 类型**

| 外键写法 | 关系性质 | 默认删除行为 | 语义 |
|---|---|---|---|
| `public long AuthorId` | 必选（NOT NULL） | `Cascade` | 书必须有作者 |
| `public long? ReviewerId` | 可选（可为 NULL） | `ClientSetNull` | 书可以还没审稿人 |

---

**符号逐个拆解（本节新增）**

| 符号 | 是什么 | 为什么这里必须写 | 不写会怎样 |
|---|---|---|---|
| `long?` 可空值类型 | `Nullable<long>` 的简写，能存 `null` | 表示"这本书还没有审稿人" | 只能存 0，语义错，外键约束会拦 |
| `IsRequired(false)` | 显式声明关系**可选** | 外键已经 `long?` 时可省 | 与外键可空性冲突会抛异常 |
| `HasForeignKey(b => b.ReviewerId)` | 指定**这一条**关系用哪个外键 | 两个外键时约定分不清 | 造影子属性 / 配错对象 |
| `WithMany(a => a.ReviewedBooks)` | 指定**这一条**关系用哪个集合导航 | 两个导航争一个集合会抛异常 | `Cannot create a relationship...` |

==二：格式==

**1. 一个实体，两条关系，各配各的**
```csharp
builder.HasOne(b => b.Author)
       .WithMany(a => a.Books)          // 作者收 Books
       .HasForeignKey(b => b.AuthorId);

builder.HasOne(b => b.Reviewer)
       .WithMany(a => a.ReviewedBooks)  // 审稿人收 ReviewedBooks
       .HasForeignKey(b => b.ReviewerId);
```

**2. 可选关系（外键可空）**
```csharp
public long? ReviewerId { get; set; }
public Author? Reviewer { get; set; }   // 导航也要可空
```

**3. 查询：每个导航各 Include 一次**
```csharp
ctx.Books.Include(b => b.Author).Include(b => b.Reviewer)
```

==三：代码==

**第 1 步：实体改动**

```csharp
// Models/Author.cs
public class Author
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public List<Book> Books { get; set; } = new();          // 我写的
    public List<Book> ReviewedBooks { get; set; } = new();  // 我审的
}
```

```csharp
// Models/Book.cs
public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }
    public DateTime PubTime { get; set; }

    public long AuthorId { get; set; }              // 必选
    public Author Author { get; set; } = null!;

    public long? ReviewerId { get; set; }           // 可选（可空）
    public Author? Reviewer { get; set; }           // 注意这里也要可空
}
```

> `= null!` 里的 `!` 是**可空抑制符**：告诉编译器"我知道它现在是 null，EF 会在运行时填上"。不写只是警告 CS8618，不影响运行。

**第 2 步：配置（两条关系，写两遍）**

```csharp
modelBuilder.Entity<Book>(entity =>
{
    entity.Property(b => b.Title).HasMaxLength(100).IsRequired();

    // 关系一：作者
    entity.HasOne(b => b.Author)
          .WithMany(a => a.Books)
          .HasForeignKey(b => b.AuthorId);

    // 关系二：审稿人（可选）
    entity.HasOne(b => b.Reviewer)
          .WithMany(a => a.ReviewedBooks)
          .HasForeignKey(b => b.ReviewerId);
});
```

**第 3 步：迁移后看 DDL**

```sql
ALTER TABLE [Books] ADD [ReviewerId] bigint NULL;
GO
ALTER TABLE [Books] ADD CONSTRAINT [FK_Books_Authors_ReviewerId]
    FOREIGN KEY ([ReviewerId]) REFERENCES [Authors] ([Id]);   -- 没有 ON DELETE CASCADE
GO
CREATE INDEX [IX_Books_ReviewerId] ON [Books] ([ReviewerId]);
```

**三个观察点**：
- `ReviewerId bigint NULL` —— 可空列，来自 `long?`
- **没有** `ON DELETE CASCADE` —— 可选关系默认 `ClientSetNull`
- **多了一个索引** `IX_Books_ReviewerId` —— 每个外键各自一个

**第 4 步：插入（导航赋值，不用管 Id）**

```csharp
var zhangsan = new Author { Name = "张三" };
var lisi     = new Author { Name = "李四" };

var book = new Book
{
    Title = "C# 入门",
    Price = 49,
    PubTime = DateTime.Today,
    Author = zhangsan,      // 作者
    Reviewer = lisi         // 审稿人
};

_ctx.Books.Add(book);
await _ctx.SaveChangesAsync();
// 一次 SaveChanges 插 2 个作者 + 1 本书，两个外键都自动回填
```

**第 5 步：查询（两个导航各 Include 一次）**

```csharp
var books = await _ctx.Books
    .Include(b => b.Author)
    .Include(b => b.Reviewer)      // 漏了这句，b.Reviewer 恒为 null
    .ToListAsync();

foreach (var b in books)
    Console.WriteLine($"{b.Title} / 作者：{b.Author.Name} / 审稿：{b.Reviewer?.Name ?? "无"}");
```
输出：`C# 入门 / 作者：张三 / 审稿：李四`

**第 6 步：反查（走 ReviewedBooks，不是 Books）**

```csharp
var a = await _ctx.Authors
    .Include(x => x.Books)
    .Include(x => x.ReviewedBooks)
    .FirstAsync(x => x.Name == "李四");

Console.WriteLine($"审稿 {a.ReviewedBooks.Count} 本，自己写 {a.Books.Count} 本");
```
输出：`审稿 1 本，自己写 0 本`

> 最容易错的一点：**`a.Books` 和 `a.ReviewedBooks` 是两个完全不同的集合**，各走各的外键。写反了不报错，只是结果不对。

**第 7 步：验证可选关系**

```csharp
var b = await _ctx.Books.FirstAsync();
b.Reviewer = null;          // 清掉审稿人
await _ctx.SaveChangesAsync();
// UPDATE Books SET ReviewerId = NULL WHERE Id = 1
```

==四：总结==

**一页速查**

| 要点 | 结论 |
|---|---|
| 什么算"额外外键" | 同一实体身上有 2 个以上外键（尤其指向同一张表） |
| 约定还能用吗 | 外键名 = `<导航名>Id` 时可以；对不上必须手写 |
| 必写什么 | **每条关系各写一次** `HasOne().WithMany().HasForeignKey()` |
| 集合导航 | 必须**一关系一集合**，两个导航共享一个集合会抛异常 |
| 引用导航 | 可选的对应 `long?` 外键，导航也要 `Author?` |
| 删除行为 | 必选 → `Cascade`；可选 → `ClientSetNull` |
| 索引 | 每个外键各建一个，不用手写 |
| 查询 | 每个导航各 `Include` 一次 |

**四个易错点**

1. **两个导航共用一个集合导航** → `Cannot create a relationship... already exists`。拆集合是唯一解法。
2. **可选关系只把外键改成 `long?`，导航没改成 `Author?`** → 编译警告一堆，语义也不对。
3. **以为"审稿人也算作者，所以算同一关系"** → 数据库里是两列、两个约束、两个索引，完全是两条关系。
4. **`Include(b => b.Author)` 就以为审稿人也带出来了** → `Reviewer` 是另一个导航，得再写一次 `Include`。

**记忆口诀**

> **一个实体多个外键，就是多条关系，一条关系一套配置。**
> **集合导航不能共用：你写的书归 Books，你审的书归 ReviewedBooks。**
> **外键可空 → 关系可选 → 默认置空不级联；外键非空 → 必选 → 默认级联删。**
> **查询一个导航一次 Include，漏一个就是 null。**
