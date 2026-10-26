==一：概念==

**什么是自引用**

普通一对多是**两张表**之间的连线。自引用是**同一张表指向自己**：

```
Categories 表
┌────┬──────────┬──────────┐
│ Id │   Name   │ ParentId │
├────┼──────────┼──────────┤
│ 1  │ 计算机    │   NULL   │ ← 根
│ 2  │ 编程语言  │    1     │ ← 计算机的子
│ 3  │ C#       │    2     │ ← 编程语言的子
└────┴──────────┴──────────┘
        ↑            │
        └────────────┘  外键指向本表的 Id
```

| 名称 | 该叫什么 | 本例 |
|---|---|---|
| 主体 / 依赖 | 仍然是这两个角色，只是**变成同一个类型** | 父节点是主体，子节点是依赖 |
| 外键 | 指向自己的主键 | `ParentId` |
| 引用导航 | 指向父（**0 或 1 个**） | `Category? Parent` |
| 集合导航 | 指向子（**N 个**） | `List<Category> Children` |

能建模的东西：公司部门树、图书分类、评论盖楼、菜单权限树、多级地区（省/市/区）。

---

**三个必须想清楚的点**

**① `ParentId` 必须可空**

根节点没有父 → `long?`，不是 `long`。这不是风格问题，是逻辑必然。

**② 删除行为不能级联**

这是本节最大的坑。如果 `ParentId` 声明成非空 `long`，默认 `Cascade`，迁移直接失败：

```
Introducing FOREIGN KEY constraint 'FK_Categories_Categories_ParentId'
on table 'Categories' may cause cycles or multiple cascade paths.
```

SQL Server 不允许"自己删自己再删自己"这种递归级联 —— 它无法判断终止条件。

用 `long?` 时默认是 `ClientSetNull`，不会报错，但**语义仍然危险**：删掉"编程语言"，它的子分类 `ParentId` 被置成 NULL，变成一堆孤儿根节点。

业务上通常要的是"**有子节点就不许删**"，所以自引用几乎总是显式写：

```csharp
.OnDelete(DeleteBehavior.Restrict)
```

**③ 约定能猜，但猜得提心吊胆**

`Parent` / `ParentId` 这种命名 EF 是认得的。但两个导航**类型完全相同**（都是 `Category`），方向搞反了照样能生成模型，只是行为全错。所以自引用**一律显式配置**。

---

**真正的难点：怎么查出一整棵树**

`Include` 只能"往下走固定层数"：

```csharp
.Include(c => c.Children)                                 // 1 层
.Include(c => c.Children).ThenInclude(c => c.Children)    // 2 层
```

层数不确定就必须换办法。EF Core **没有**递归查询的 LINQ 写法（SQL 的递归 CTE 它不翻译）。三种方案：

| 方案 | 做法 | 适用 |
|---|---|---|
| **内存组装** | 一次把全表查出来，按 `ParentId` 分组，递归拼树 | 节点数不大（几千以内） |
| **递归 CTE 原生 SQL** | `WITH cte AS (...)` + `SqlQueryRaw` | 节点几十万，只取某棵子树 |
| **固定层数 Include** | `ThenInclude` 链到底 | 层数确定（如最多 3 级分类） |

---

**`ToLookup` 为什么是关键**

朴素写法：每层都 `all.Where(x => x.ParentId == id)` → 每取一层扫全表 → O(n²)。

`ToLookup(c => c.ParentId)` 扫**一遍**建好索引，之后每次取子集合是 O(1)。

---

**符号逐个拆解（本节新增）**

| 符号 | 是什么 | 在自引用里的特殊之处 |
|---|---|---|
| `HasOne(c => c.Parent)` | 声明"我有 1 个父" | lambda 的 `c` **两边都是 `Category`**，靠属性名区分语义 |
| `WithMany(c => c.Children)` | 声明"父有 N 个子" | 同上，`c` 依然是 `Category`，别被同名参数绕晕 |
| `long?` | 可空外键 | 根节点的唯一表达方式 |
| `DeleteBehavior.Restrict` | 删父节点时**禁止**、抛异常 | 自引用的安全选择 |
| `ThenInclude` 链 | 逐层往下的唯一 LINQ 手段 | 层数必须写死 |
| `ToLookup(keySelector)` | `IEnumerable` 的扩展方法，按 key 分组成**可索引的** `ILookup` | 内存建树的关键工具 |
| `AddRange(params T[])` | `DbSet` 的方法，一次标记多个实体 | 插入整棵树时用 |

==二：格式==

**1. 实体三件套**
```csharp
public long? ParentId { get; set; }
public Category? Parent { get; set; }
public List<Category> Children { get; set; } = new();
```

**2. 配置**
```csharp
builder.HasOne(c => c.Parent)
       .WithMany(c => c.Children)
       .HasForeignKey(c => c.ParentId)
       .OnDelete(DeleteBehavior.Restrict);
```

**3. 查固定层数**
```csharp
ctx.Categories.Include(c => c.Children).ThenInclude(c => c.Children)
```

**4. 查任意层数（内存组装）**
```csharp
var all = await ctx.Categories.ToListAsync();
var lookup = all.ToLookup(c => c.ParentId);
```

==三：代码==

给图书管理系统加一棵**图书分类树**。

**第 1 步：实体**
```csharp
// Models/Category.cs
namespace ASP.NET_Core__图书管理系统.Models
{
    public class Category
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public long? ParentId { get; set; }                    // 根节点为 null
        public Category? Parent { get; set; }                  // 指向父
        public List<Category> Children { get; set; } = new();  // 指向子
    }
}
```

**第 2 步：配置**
```csharp
public DbSet<Category> Categories => Set<Category>();

modelBuilder.Entity<Category>(entity =>
{
    entity.Property(c => c.Name).HasMaxLength(50).IsRequired();

    entity.HasOne(c => c.Parent)
          .WithMany(c => c.Children)
          .HasForeignKey(c => c.ParentId)
          .OnDelete(DeleteBehavior.Restrict);   // 自引用必须显式改成 Restrict
});
```

**第 3 步：迁移生成的 DDL**
```sql
CREATE TABLE [Categories] (
    [Id]       bigint       NOT NULL IDENTITY,
    [Name]     nvarchar(50) NOT NULL,
    [ParentId] bigint       NULL,           -- 可空
    CONSTRAINT [PK_Categories] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Categories_Categories_ParentId]
        FOREIGN KEY ([ParentId]) REFERENCES [Categories] ([Id])   -- 没有 CASCADE
);
CREATE INDEX [IX_Categories_ParentId] ON [Categories] ([ParentId]);
```
三个观察点：`NULL` 可空、**自引用外键**、`Restrict` 让 `ON DELETE` 消失。

**第 4 步：插入三级分类（一次 SaveChanges）**
```csharp
var root = new Category { Name = "计算机" };
var lang = new Category { Name = "编程语言", Parent = root };
var cs   = new Category { Name = "C#", Parent = lang };
var java = new Category { Name = "Java", Parent = lang };

_ctx.Categories.AddRange(root, lang, cs, java);
await _ctx.SaveChangesAsync();
```
EF 自动按拓扑顺序插入：先根 → 再子 → 再孙，`ParentId` 全部回填。

> `AddRange` 只传了四个对象，但它们通过 `Parent` 属性连成了一张图，EF 遍历整张图逐个插入。

**第 5 步：查固定 3 层（最常见）**
```csharp
var tree = await _ctx.Categories
    .Include(c => c.Children)
        .ThenInclude(c => c.Children)
    .AsNoTracking()
    .FirstAsync(c => c.ParentId == null);

void Print(Category c, int depth = 0)
{
    Console.WriteLine(new string(' ', depth * 2) + c.Name);
    foreach (var child in c.Children) Print(child, depth + 1);
}

Print(tree);
```
输出：
```
计算机
  编程语言
    C#
    Java
```

**第 6 步：查任意层数（项目里最常用）**
```csharp
[HttpGet("category-tree")]
public async Task<ActionResult<object>> GetTree()
{
    var all = await _ctx.Categories.ToListAsync();     // 一次全量查（分类表通常很小）

    // lookup[null] = 根节点集合；lookup[1] = Id 为 1 的子节点集合
    var lookup = all.ToLookup(c => c.ParentId);

    List<Category> Build(long? parentId)
        => lookup[parentId]
           .Select(c =>
           {
               c.Children = Build(c.Id);   // 递归往下
               return c;
           })
           .ToList();

    return Ok(Build(null));
}
```

**第 7 步：验证 Restrict 真的拦得住**
```csharp
var lang = await _ctx.Categories.FirstAsync(c => c.Name == "编程语言");
_ctx.Categories.Remove(lang);
await _ctx.SaveChangesAsync();
```
抛：
```
Microsoft.Data.SqlClient.SqlException: The DELETE statement conflicted with
the REFERENCE constraint "FK_Categories_Categories_ParentId".
```

想删整棵子树，必须**从叶子往上删**：
```csharp
var all = await _ctx.Categories.ToListAsync();
var lookup = all.ToLookup(c => c.ParentId);

void RemoveSubtree(Category node)
{
    foreach (var child in lookup[node.Id].ToList()) RemoveSubtree(child);  // 先删子
    _ctx.Categories.Remove(node);                                          // 再删自己
}

RemoveSubtree(lang);
await _ctx.SaveChangesAsync();
```

**第 8 步：为什么 `Build` 里要用 `AsNoTracking`（只读场景）**

`ToListAsync()` 查出来的实体被上下文跟踪着。你在 `Build` 里直接改 `c.Children`，EF 会认为集合发生了变化，`SaveChanges` 时可能生成意外的 UPDATE。只读展示加 `AsNoTracking()` 最稳。

==四：总结==

**一页速查**

| 要点 | 结论 |
|---|---|
| 自引用 = 什么 | 外键指向**同一张表**的主键 |
| 三件套 | `long? ParentId` + `Category? Parent` + `List<Category> Children` |
| 外键必须可空吗 | 是，否则根节点无法存在 |
| 删除行为 | 显式 `Restrict`，别用默认 |
| 非空外键 + Cascade | 迁移直接报 `may cause cycles or multiple cascade paths` |
| 查询固定层数 | `Include().ThenInclude()` 链 |
| 查询任意层数 | 全量查出 → `ToLookup(c => c.ParentId)` → 递归组装 |
| 删除子树 | 必须从叶子往上删 |
| 约定 | 能猜，但类型相同容易配反，一律显式写 |

**五个易错点**

1. **`ParentId` 写成 `long` 非空** → 迁移报循环级联错误，或者第一个根节点就插不进去。
2. **`HasOne` 和 `WithMany` 的 lambda 写反**（`HasOne(c => c.Children)`）→ 编译就错，`Children` 是集合不是单个。
3. **以为 `Include` 能带出整棵树** → 只会带出你写的层数，深层静默为空。
4. **递归组装时覆盖了 `Children`，但实体还在变更跟踪里** → 可能触发意外 UPDATE，只读场景加 `AsNoTracking()`。
5. **删父节点时直接 `Remove(lang)`** → 被 `Restrict` 拦住；必须自底向上。

**记忆口诀**

> **自引用：一张表，一个可空外键，两个导航——父用引用，子用集合。**
> **根节点没有父，所以 `ParentId` 必须是 `long?`。**
> **自引用不能级联删，`OnDelete(Restrict)` 显式写，删树从叶子往上删。**
> **`Include` 只能走固定层，无限层靠一次全查 + `ToLookup` 递归拼。**
