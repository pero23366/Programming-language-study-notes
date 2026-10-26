# 练习 02｜关系映射综合练习（P63–P69）

> **一句话题面**：在同一个"图书管理系统"里，把**一对多、额外外键、单向导航、自引用、一对一**五种关系一次建齐，跑通四类查询，再**故意**把三种约束撞一遍。
> **前置**：练习 01 已完成（迁移体系已跑通，库名 `BookDemo`，`Books` 表 5000 条测试数据）。
> **规则**：代码自己敲；每步「验收」不达标不要往下走。

---

## 0. 这一练在练什么

| 步骤 | 对应知识点 | 视频 | 你要做出什么 |
|---|---|---|---|
| Step 1 | 关系配置 | P63 | 三张新表 + `Books` 三个外键，迁移一次过 |
| Step 2 | 关系数据获取 | P64 / P65 / P66 | 造结构化数据，四类查询全通 |
| Step 3 | 约束与删除行为 | P63 / P65 / P69 | **故意**触发三种报错，看清是谁拦的 |
| Step 4 | 自引用树 | P68 | 任意层分类树 + 子树查书 |
| Step 5 | 综合 | 全部 | 一个接口取全四种关系 |

**这一练的核心判据**

> 关系配对了没有，不看代码写得漂不漂亮，看**迁移生成的 DDL**：外键、索引、`ON DELETE`、`UNIQUE`，四样齐了才算对。

---

## Step 1：把三张表建出来

### 实体（四个文件）

```csharp
// Models/Author.cs —— 两个集合导航，对应"我写的"和"我审的"
public class Author
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public List<Book> Books { get; set; } = new();          // 我写的
    public List<Book> ReviewedBooks { get; set; } = new();  // 我审的
}
```

```csharp
// Models/Category.cs —— 自引用：外键指向本表主键
public class Category
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public long? ParentId { get; set; }              // 根节点为 null
    public Category? Parent { get; set; }
    public List<Category> Children { get; set; } = new();

    // 故意不写 List<Book> Books —— 留给单向导航
}
```

```csharp
// Models/BookDetail.cs —— 一对一，依赖方背外键
public class BookDetail
{
    public long Id { get; set; }
    public string? Summary { get; set; }
    public int PageCount { get; set; }

    public long BookId { get; set; }
    public Book Book { get; set; } = null!;
}
```

```csharp
// Models/Book.cs —— 四种关系全挂在它身上
public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }
    public DateTime PubTime { get; set; }

    public long AuthorId { get; set; }              // 关系一：作者（必选）
    public Author Author { get; set; } = null!;

    public long? ReviewerId { get; set; }           // 关系二：审稿人（可选）
    public Author? Reviewer { get; set; }

    public long? CategoryId { get; set; }           // 关系三：分类（单向）
    public Category? Category { get; set; }

    public BookDetail? Detail { get; set; }         // 关系四：一对一（单个对象）
}
```

### 配置

```csharp
modelBuilder.Entity<Book>(entity =>
{
    entity.Property(b => b.Title).HasMaxLength(100).IsRequired();

    entity.HasOne(b => b.Author)                 // 关系一
          .WithMany(a => a.Books)
          .HasForeignKey(b => b.AuthorId);

    entity.HasOne(b => b.Reviewer)               // 关系二：集合换成 ReviewedBooks
          .WithMany(a => a.ReviewedBooks)
          .HasForeignKey(b => b.ReviewerId);

    entity.HasOne(b => b.Category)               // 关系三：WithMany 空参 = 对方没有集合
          .WithMany()
          .HasForeignKey(b => b.CategoryId);
});

modelBuilder.Entity<Category>(entity =>
{
    entity.HasOne(c => c.Parent)                 // 关系五：自引用
          .WithMany(c => c.Children)
          .HasForeignKey(c => c.ParentId)
          .OnDelete(DeleteBehavior.Restrict);    // 自引用必须显式 Restrict
});

modelBuilder.Entity<BookDetail>(entity =>
{
    entity.HasOne(d => d.Book)                   // 关系四：一对一，泛型必写
          .WithOne(b => b.Detail)
          .HasForeignKey<BookDetail>(d => d.BookId)
          .OnDelete(DeleteBehavior.Cascade);
});
```

### 迁移前必须先删库

`Books` 里已有 5000 行没有 `AuthorId`，直接加 `NOT NULL` 外键会失败：

```
The ALTER TABLE statement conflicted with the FOREIGN KEY constraint "FK_Books_Authors_AuthorId".
```

```bash
cd "D:/code/编程语言学习/后端/练习/ASP.NET Core--图书管理系统/ASP.NET Core--图书管理系统"
dotnet ef database drop -f
dotnet ef migrations add AddRelations
dotnet ef database update
```

### 验收

| 检查项 | 结果 |
|---|---|
| `Books` 新增列 | `AuthorId bigint NOT NULL`、`ReviewerId bigint NULL`、`CategoryId bigint NULL`（**3 列**，`Detail` 不在 Books 上） |
| `BookDetails` 表 | 独立建表，`BookId` 上有 **UNIQUE** 索引 |
| 索引 | `IX_Books_AuthorId`、`IX_Books_ReviewerId`、`IX_Books_CategoryId`、`IX_BookDetails_BookId`(UNIQUE)、`IX_Categories_ParentId` |
| `ON DELETE` | `AuthorId` 是 `CASCADE`；`ReviewerId`/`CategoryId` 无（ClientSetNull）；`ParentId` 无（Restrict） |

---

## Step 2：造数据 + 四类查询

### 数据（故意设计成覆盖所有分支）

| 书 | 作者 | 审稿人 | 分类 | 详情 |
|---|---|---|---|---|
| C# 入门 | 张三 | 李四 | C# | 320 页 |
| EF Core 深入 | 张三 | — | C# | 400 页 |
| 算法导论 | 李四 | 张三 | 编程语言 | — |
| 操作系统 | 李四 | — | 计算机 | — |
| 日语五十音 | 张三 | — | **无** | — |

### ⚠️ 坑一：自增 Id 不是 List 顺序

代码里 `List<Book>` 的顺序是「C# 入门 → EF Core 深入 → 算法导论 → 操作系统 → 日语五十音」，实际入库是：

| Id | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| 书 | 操作系统 | 日语五十音 | 算法导论 | C# 入门 | EF Core 深入 |

原因：`SaveChanges` 会把整个对象图做**拓扑排序**，先插被依赖的实体（Author / Category / BookDetail），同层内顺序 EF **不作承诺**。

> 结论：**任何硬编码 id 的测试都会在某天失效。** 先写一个 `q0-index` 接口把真实 id 打出来，再拿 id 去请求。

### 四类查询

| 接口 | 验证什么 | 关键写法 |
|---|---|---|
| `q1-author-books` | 一对多正向 | `Include(a => a.Books)` |
| `q2-book-author` | 多→一 × 两个外键 | `Include(b => b.Author)` + `Include(b => b.Reviewer)`，**漏一个就是 null** |
| `q3-category-books/{id}` | 单向导航反查 | 从 `Book` 侧 `Where(b => b.CategoryId == id)` |
| `q4-book-detail/{id}` | 一对一 | `Include(b => b.Detail)` |

### 实测结果

```
q1 → 张三：日语五十音 / C# 入门 / EF Core 深入（3 本）
     李四：操作系统 / 算法导论（2 本）

q3-category-books/2 → { "分类":"编程语言", "直接子分类":["C#"], "本书":["算法导论"] }

q4-book-detail/4 → { "title":"C# 入门", "有详情":true, "页数":320 }
q4-book-detail/1 → { "title":"操作系统", "有详情":false, "页数":null }
```

### ⚠️ 坑二：`q3` 只查出一本，不是 bug

《C# 入门》和《EF Core 深入》挂在**子分类“C#”**上（`CategoryId = 3`），不是“编程语言”（`= 2`）。`Include(c => c.Children)` 只把子分类带出来，**不会**把子分类的书算进父分类 —— 这就是 Step 4 要解决的问题。

---

## Step 3：三个故意报错

### ① 两个导航抢一个集合 → 模型构建就崩

故意改成 `.WithMany(a => a.Books)`：

```
InvalidOperationException: Cannot create a relationship between 'Author.Books'
and 'Book.Reviewer' because a relationship already exists between 'Author.Books'
and 'Book.Author'. Navigations can only participate in a single relationship.
```

| 观察点 | 说明 |
|---|---|
| 崩溃时机 | **模型构建时**，还没连库、还没发 SQL |
| 拦它的是谁 | EF 自己的模型校验，**不是数据库** |
| 关键句 | `Navigations can only participate in a single relationship` |

### ② 一对一插重复 → UNIQUE 索引报错

```csharp
_ctx.BookDetails.Add(new BookDetail { BookId = 4, Summary = "重复", PageCount = 1 });
await _ctx.SaveChangesAsync();
```

```
SqlException: Cannot insert duplicate key row in object 'dbo.BookDetails'
with unique index 'IX_BookDetails_BookId'. The duplicate key value is (4).
```

| 观察点 | 说明 |
|---|---|
| 拦它的是谁 | **数据库**（`Microsoft.Data.SqlClient`），不是 EF |
| 索引名 | `IX_BookDetails_BookId`，来自 Step 1 迁移里的 `UNIQUE` |
| 没有它会怎样 | 一对一退化成一对多，一本书能有 5 份详情 |

> 一句话：`HasOne().WithOne()` 只在**模型层**声明一对一，真正保证唯一的是数据库上那道 UNIQUE。

### ③ 删分类 → 两道不同的外键

| 删谁 | 报的约束 | 谁在拦 |
|---|---|---|
| 分类 3（C#） | `FK_Books_Categories_CategoryId` | 单向一对多（书 → 分类） |
| 分类 2（编程语言） | `FK_Categories_Categories_ParentId` | 自引用 + `Restrict` |

两条错误信息**约束名不同**，说明一次删除可能同时踩多条外键，SQL Server 只先报一条。

---

## Step 4：任意层分类树

### 树（一次全查 + `ToLookup` + 递归）

```csharp
var all = await _ctx.Categories.AsNoTracking().ToListAsync();
var lookup = all.ToLookup(c => c.ParentId);      // key=父id, value=直接子节点

List<CategoryNode> Build(long? parentId) => lookup[parentId]
    .OrderBy(c => c.Id)
    .Select(c => new CategoryNode
    {
        Id = c.Id, Name = c.Name,
        Children = Build(c.Id)
    })
    .ToList();

return Ok(Build(null));
```

实测输出：

```json
[{"id":1,"name":"计算机","children":[
  {"id":2,"name":"编程语言","children":[
    {"id":3,"name":"C#","children":[]}]}]}]
```

| 为什么这么写 | 不这么写会怎样 |
|---|---|
| `ToLookup` | 每层 `Where` 扫全表 → O(n²) |
| `AsNoTracking` | 只读场景白占跟踪器，还可能被误判为脏数据 |
| 具名 DTO `CategoryNode` | 匿名类型**做不了递归**（自引用） |

### 子树查书（真解）

```csharp
var ids = new List<long>();
void Collect(long cid) { ids.Add(cid); foreach (var child in lookup[cid]) Collect(child.Id); }
Collect(id);

var books = await _ctx.Books
    .Where(b => b.CategoryId != null && ids.Contains(b.CategoryId.Value))
    .Select(b => new { b.Title, 分类 = b.Category!.Name })
    .ToListAsync();
```

实测：

| 请求 | 涉及分类 | 书 | 数量 |
|---|---|---|---|
| `q8-subtree-books/2` | `[2,3]` | 算法导论 / C# 入门 / EF Core 深入 | **3** |
| `q8-subtree-books/1` | `[1,2,3]` | 操作系统 / 算法导论 / C# 入门 / EF Core 深入 | **4** |

> **注意 4 而不是 5**：《日语五十音》没有 `CategoryId`，不在任何分类下。数字对不上时先看“有没有没挂分类的行”，别急着改代码。

> 顺带：`b.Category!.Name` 能投影成 `LEFT JOIN`，说明**单向只砍掉了反方向**——从书往分类照样能走。

### `Include` vs `AsSplitQuery`

```csharp
var join  = _ctx.Authors.Include(a => a.Books).ToQueryString();
var split = _ctx.Authors.Include(a => a.Books).AsSplitQuery().ToQueryString();
```

| | Join 版 | Split 版 |
|---|---|---|
| SELECT 条数 | 1 | 2 |
| 作者字段 | 重复 N 次（N = 他的书数） | 只出现 1 次 |
| 没书的作者 | `LEFT JOIN` 一行、全 NULL | 第二段压根没他 |

`ToQueryString()` 只翻译**不执行**，调试 SQL 时比猜快得多。

---

## Step 5：综合题 —— 作者档案

```csharp
[HttpGet("q10-author-profile/{id}")]
public async Task<ActionResult<object>> Q10(long id)
{
    var author = await _ctx.Authors
        .AsNoTracking()
        .Include(a => a.Books).ThenInclude(b => b.Category)
        .Include(a => a.Books).ThenInclude(b => b.Detail)
        .Include(a => a.ReviewedBooks).ThenInclude(b => b.Category)
        .Include(a => a.ReviewedBooks).ThenInclude(b => b.Detail)
        .AsSplitQuery()
        .FirstOrDefaultAsync(a => a.Id == id);

    if (author == null) return NotFound();

    object Brief(Book b) => new
    {
        b.Id, b.Title,
        分类 = b.Category?.Name ?? "（未分类）",
        页数 = b.Detail?.PageCount
    };

    return Ok(new
    {
        author.Id, author.Name,
        写的书 = author.Books.Select(Brief).ToList(),
        审的书 = author.ReviewedBooks.Select(Brief).ToList()
    });
}
```

### 四个判断点（这题的全部难点）

| # | 问题 | 答案 |
|---|---|---|
| ① | 两个集合能一次 Include 完吗 | 能，但两个集合会**笛卡尔积** |
| ② | 每本书还要带分类和详情 | `ThenInclude`，一个 `Include` 走不到底 |
| ③ | 行数怎么控 | `AsSplitQuery()`，一条巨型 JOIN 拆成几条窄查询 |
| ④ | 直接 `return Ok(author)` | `A possible object cycle was detected` —— 必须投影 |

### “一次返回” ≠ “一条 SQL”

接口对调用方是**一次请求**，内部实际发 **3 条左右**的 SQL。这是有意的取舍，不是偷懒。

---

## 环境坑清单（这一步最容易卡住，和 EF 无关）

| 现象 | 真因 | 解法 |
|---|---|---|
| `400` + `The value 'q7-tree' is not valid` | 新接口没生效，请求落到了 `[HttpGet("{id}")]`（`long id` 转换失败） | **重启调试**。热重载不能新增路由 |
| 所有请求只回一个空响应 | 应用跑的是 `https` 配置，`http://localhost:5018` 被 **307** 跳到 `https://localhost:7081` | 注释 `app.UseHttpsRedirection();`，或 `@host` 直接用 https 地址 |
| `.http` 里 `GET {{host}} /api/...` 报解析错 | `{{host}}` 和路径之间**不能有空格** | 写成 `GET {{host}}/api/...` |
| 点「造 5000 条数据」却在改价格 | `[HttpPost("seed")]` 特性孤零零留在注释掉的方法上方，被下一个 `BulkSlow` 继承了 | 特性也要一起注释 |

> **400 与 404 的分界线**（很实用）：
> - 400 + `The value 'xxx' is not valid` → 路由**匹配上了**参数，类型转换失败
> - 404 → 一条路由都没匹配上

---

## 验收总表

| 检查项 | 期望 |
|---|---|
| `Books` 外键 | `AuthorId NOT NULL` / `ReviewerId NULL` / `CategoryId NULL` |
| `BookDetails` | `BookId` 上有 **UNIQUE** 索引 |
| `Categories` | `ParentId NULL` + 自引用外键 + **无** `ON DELETE` |
| `q1` | 张三 3 本、李四 2 本 |
| `q2` | 只有《C# 入门》《算法导论》有审稿人 |
| `q3-category-books/2` | 1 本（只查直接挂载的） |
| `q8-subtree-books/2` | 3 本 |
| `q8-subtree-books/1` | 4 本（不是 5） |
| `q7-tree` | 三层嵌套，叶子 `children: []` |
| 三个报错实验 | 模型冲突 / UNIQUE / 两套不同外键名，全部复现 |
| `q10-author-profile/1` | 写的 3 本 + 审的 1 本，未分类与无详情的字段不炸 |

---

## 一页速查

| 关系 | 配置 | 必写点 |
|---|---|---|
| 一对多 | `HasOne().WithMany()` | 外键非空 → `Cascade`；可空 → `ClientSetNull` |
| 额外外键 | 每条关系各配一次 | 集合导航**不能共用** |
| 单向 | `.WithMany()` 空参 | 数据库**完全不变**，只是反查要子查询 |
| 自引用 | `HasOne(c=>c.Parent).WithMany(c=>c.Children)` | `long? ParentId` + `Restrict` |
| 一对一 | `HasOne().WithOne()` | `HasForeignKey<依赖方>` **泛型必写** + 自动 UNIQUE |

## 记忆口诀

> **一条关系一套配置，两个导航两个集合，共用就崩。**
> **单向不减外键，只是关掉一个入口；反查靠 Where 或子查询。**
> **自引用三件套：可空外键、父用引用子用集合、删除一律 Restrict。**
> **一对一外键只住一边，泛型指定依赖方，UNIQUE 就是它和一对多的分水岭。**
> **自增 Id 不是业务顺序，测试前先打一张 id 对照表。**
> **树用 ToLookup 一次全查，Include 只能走固定层数。**
