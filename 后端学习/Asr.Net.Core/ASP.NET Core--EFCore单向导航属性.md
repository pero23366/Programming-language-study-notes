==一：概念==

**什么叫"单向"**

我们一直用的是**双向**导航：

```csharp
public Author Author { get; set; }      // 书 → 作者
public List<Book> Books { get; set; }   // 作者 → 书
```

单向就是**只留一边**：

| 单向形式 | 留下的导航 | 删掉的导航 | 常见场景 |
|---|---|---|---|
| 多 → 一 | `Book.Author` | `Author.Books` | 最常见：从订单能找到客户，但不给客户挂上"所有订单"这种集合 |
| 一 → 多 | `Author.Books` | `Book.Author` | 较少：从父级往下遍历，不需要反向 |
| 两边都没有 | 无 | 无 | 关系只存在于数据库，代码里靠外键字段自己查 |

---

**为什么真的需要单向（不是为了省一行代码）**

| 理由 | 具体问题 |
|---|---|
| **集合太大** | 用户表有 100 万订单，`User.Orders` 一旦被序列化或误用 `Include`，内存直接炸 |
| **JSON 循环引用** | WebAPI 返回 `Book` 带 `Author`，`Author` 带 `Books`，每本书又带 `Author` → `A possible object cycle was detected` |
| **聚合边界** | DDD 里"订单"是聚合根、"客户"是另一个聚合，客户不该有订单集合 |

> WebAPI 项目里，第二条是**必踩**的。

---

**最重要的一句话**

> **单向导航只是"C# 里少一个属性"，数据库完全不变。**

外键列、外键约束、索引、级联规则，**一个都不会少**。关系仍然是一对多，只是少了一个走过去的入口。

验证方式很直接：改完跑 `Add-Migration`，生成的 `Up()` 是**空的**。

---

**单向的代价：反方向查不了**

- 从**有**导航的一方查：`Include` 照常好用
- 从**没有**导航的一方查：没有属性可用，只能子查询或手动 join

```csharp
// 想从作者查他的书，但没有 Author.Books 了
var authors = await _ctx.Authors
    .Where(a => _ctx.Books.Any(b => b.AuthorId == a.Id))
    .ToListAsync();
```

**这就是单向真正的成本**：查询变啰嗦。所以选哪边单向，看"哪边更常被查询"。

---

**`Include` 的方向由导航属性位置决定，和配置无关**

| 你有 | 能写 |
|---|---|
| `Book.Author` | `Include(b => b.Author)` ✅ |
| 没有 `Author.Books` | `Include(a => a.Books)` ❌ 编译不过 |

---

**符号逐个拆解（本节新增）**

| 符号 | 是什么 | 关键点 | 不写会怎样 |
|---|---|---|---|
| `WithMany()` **空参数** | "对方**没有**集合导航属性" | 和 `WithMany(a => a.Books)` 不是一回事 | 写 `WithMany(a => a.Books)` 但 `Author` 里没这属性 → 编译报错 |
| `WithOne()` **空参数** | "对方**没有**引用导航属性" | 同上 | 同上 |
| `HasOne<T>()` **泛型无 lambda** | 当前实体有一个 `T`，但**没有导航属性**指向它 | 用于"两边都没导航" | 只能靠外键字段硬写 SQL |
| `HasMany<T>()` | 反向泛型版，当前实体有多个 `T` | 从主体侧配置时用 | — |
| `HasForeignKey<T>(expr)` | 当**当前 builder 不是依赖方**时必须用泛型指定依赖实体 | 见格式第 3 条 | 编译报"找不到属性" |

==二：格式==

**1. 多 → 一：只留 `Book.Author`**
```csharp
builder.HasOne(b => b.Author)
       .WithMany()                     // 空参 = 对方没有集合导航
       .HasForeignKey(b => b.AuthorId);
```

**2. 一 → 多：只留 `Author.Books`**
```csharp
builder.HasMany(a => a.Books)
       .WithOne()                      // 空参 = 对方没有引用导航
       .HasForeignKey<Book>(b => b.AuthorId);
```

**3. 两边都没有导航属性**
```csharp
builder.HasOne<Author>()               // 泛型版，不给 lambda
       .WithMany()
       .HasForeignKey(b => b.AuthorId);
```

> **`HasForeignKey` 的泛型什么时候要加**：看 `builder` 是不是"多"的那一方。
> - 在 `EntityTypeBuilder<Book>` 里配 → `HasForeignKey(b => b.AuthorId)` 就够（`b` 已推断为 `Book`）
> - 在 `EntityTypeBuilder<Author>` 里配，但有 `WithOne(b => b.Author)` 指认了依赖方 → 也能推断，泛型可省
> - 两边都没有导航、全靠 `<T>` 指认 → **必须** `HasForeignKey<Book>(...)`

==三：代码==

把图书管理系统改成**单向**：删掉 `Author.Books`，只留 `Book.Author`。

**第 1 步：实体删一行**
```csharp
public class Author
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;

    // public List<Book> Books { get; set; } = new();   ← 删掉
}

public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }
    public DateTime PubTime { get; set; }

    public long AuthorId { get; set; }
    public Author Author { get; set; } = null!;    // ← 保留
}
```

**第 2 步：配置 `WithMany` 改空参**
```csharp
modelBuilder.Entity<Book>(entity =>
{
    entity.Property(b => b.Title).HasMaxLength(100).IsRequired();

    entity.HasOne(b => b.Author)
          .WithMany()                    // 原来是 .WithMany(a => a.Books)
          .HasForeignKey(b => b.AuthorId);
});
```

**第 3 步：迁移是空的**
```powershell
Add-Migration MakeAuthorNavigationUnidirectional
```
```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    // 空 —— 数据库不认识你 C# 里有没有导航属性
}
```
**这就是本节最好的证据**：数据库层面一个字节都没改。

**第 4 步：正向照旧**
```csharp
var books = await _ctx.Books.Include(b => b.Author).ToListAsync();
foreach (var b in books)
    Console.WriteLine($"{b.Title} —— {b.Author.Name}");
```

**第 5 步：反向编译不过**
```csharp
var authors = await _ctx.Authors.Include(a => a.Books).ToListAsync();
// CS1061: 'Author' does not contain a definition for 'Books'
```

**第 6 步：替代写法**
```csharp
// 写法一：子查询，只查"有书的作者"
var authorsWithBooks = await _ctx.Authors
    .Where(a => _ctx.Books.Any(b => b.AuthorId == a.Id))
    .ToListAsync();

// 写法二：从书那边查，再按作者分组
var grouped = (await _ctx.Books.Include(b => b.Author).ToListAsync())
              .GroupBy(b => b.Author.Name)
              .Select(g => new { 作者 = g.Key, 书数 = g.Count() })
              .ToList();
```

**第 7 步：顺手解决 JSON 循环引用**
```csharp
[HttpGet]
public async Task<ActionResult<IEnumerable<Book>>> GetAll()
{
    var books = await _ctx.Books.Include(b => b.Author).ToListAsync();
    return Ok(books);
}
```
返回干净：
```json
[
  {
    "id": 1, "title": "C# 入门", "price": 49, "authorId": 1,
    "author": { "id": 1, "name": "张三" }
  }
]
```
如果 `Author` 上还有 `Books`，这里会变成 `author.books[].author.books[]...`，直到 `System.Text.Json` 抛 cycle 异常。

==四：总结==

**一页速查**

| 要点 | 结论 |
|---|---|
| 单向的本质 | C# 少一个导航属性，**数据库完全不变** |
| 怎么配单向 | `WithMany()` 或 `WithOne()` **空参数** |
| 两边都没导航 | `HasOne<Author>().WithMany().HasForeignKey(b => b.AuthorId)` |
| 迁移影响 | `Up()` 为空，没有 DDL 变化 |
| `Include` | 有导航才能 `Include`；没导航就得靠 `Any` 子查询 |
| 最大收益 | 杜绝 JSON 循环引用、防止集合爆内存 |
| 最大代价 | 反向查询变复杂 |

**四个易错点**

1. **`WithMany()` 忘了传 lambda，但实体里还留着 `Books` 属性** → EF 认为"对方没导航"，`Books` 变成永远空着的无用属性，不报错、不警告。
2. **`WithOne()` 空参配在"多"方** → 方向搞反。`HasOne(x => x.A)` 配 `WithOne()` 是 1:1，配 `WithMany()` 才是 1:N。
3. **以为单向省了外键列** → 迁移是空的就说明白了，外键列照样在，`AuthorId` 不写还是 NOT NULL 错。
4. **单向之后还用 `Entry(author).Collection(a => a.Books)`** → 编译失败。但 `Entry(book).Reference(b => b.Author)` 可以，因为那个导航还在。

**记忆口诀**

> **单向不是断关系，只是少写一个属性；数据库的外键、约束、索引一个不少。**
> **`WithMany()` 空着 = 对方没集合；`WithOne()` 空着 = 对方没引用。**
> **省掉一个集合，换来干净的 JSON；代价是反查要写子查询。**
