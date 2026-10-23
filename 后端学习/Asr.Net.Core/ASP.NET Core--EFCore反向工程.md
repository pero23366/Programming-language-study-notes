==一：概念==
**两个相反的开发方向**

| 方向 | 名字 | 起点 | 谁生成谁 |
|---|---|---|---|
| 代码 → 数据库 | **Code First**（代码先行） | 写实体类 | 迁移生成表 |
| 数据库 → 代码 | **DB First**（数据库先行） | 已有数据库 | **反向工程**生成实体类 |

**反向工程（Reverse Engineering / Scaffold）就是"照着数据库，把代码写出来"**：读数据库的表结构、外键、索引，自动生成一套实体类 + 一个 `DbContext`。

WPF 类比：这是"根据已有的 XAML 反推 ViewModel"。你手里已经有了别人做好的界面（数据库），要照它补出代码。

**什么时候真的需要它**

- 接手一个**已经运行多年**的老库（几百张表），不可能手工写实体
- 从别的系统迁移过来，先 Scaffold 出模型，再逐步改造
- 临时查数/做工具，只想快速拿到强类型访问能力

**什么时候不该用它**

- 新项目：**永远 Code First**。反向工程生成的代码风格呆板、注释全无、字段名照搬数据库，越用越乱。
- 需要长期维护：Scaffold 是**一次性**的，之后要手改；再 Scaffold 一次会把你的手改全部冲掉。

**生成的东西长什么样**

1. 每张表一个实体类：`public partial class Book`（`partial` 是留给你的后门，可以在另一个文件里加方法）
2. 一个 `DbContext`：
   - `OnConfiguring`：**连接字符串会被明文写进去**（这是最大的坑）
   - `OnModelCreating`：所有关系、索引、列类型被翻译成 Fluent API 代码
3. 导航属性、`IHashSet<>` 集合初始化、外键字段，全部按数据库真实结构生成

==二：格式==
**1. CLI 标准写法**
```bash
dotnet ef dbcontext scaffold "连接字符串" 数据库提供者包名 [选项]
```
```bash
dotnet ef dbcontext scaffold \
  "Server=.;Database=DemoDb;Trusted_Connection=True;TrustServerCertificate=True" \
  Microsoft.EntityFrameworkCore.SqlServer \
  -o Models
```

**2. 常用选项**

| 选项 | 含义 | 建议 |
|---|---|---|
| `-o Models` | 输出目录 | 必加，别糊在根目录 |
| `-t T_Books` | 只生成指定表（可写多次） | 表多时强烈建议 |
| `--use-database-names` | 列名/表名完全照搬数据库（连下划线都不转） | 按需 |
| `--no-onconfiguring` | **不生成 `OnConfiguring`（不写死连接串）** | **必加** |
| `-f` | 覆盖已存在的文件 | 重新生成时用 |
| `--context MyDbContext` | 指定生成的上下文类名 | 按需 |
| `--schema dbo` | 只生成指定 schema | 多 schema 库用 |
| `--no-build` | 不重新编译 | 已 build 过才用 |

**3. PMC 等价写法**
```powershell
Scaffold-DbContext "Server=.;Database=DemoDb;Trusted_Connection=True;" `
  Microsoft.EntityFrameworkCore.SqlServer -OutputDir Models -Tables T_Books -Force
```

**4. 防止连接串进代码（配套动作）**
```csharp
// 项目里已有 Program.cs 的 DI 配置，就不要再让 OnConfiguring 插手
builder.Services.AddDbContext<DemoDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```

==三：代码==
**场景**：数据库 `DemoDb` 里有 `T_Books`、`T_Authors`，两表一对多。

**第 1 步：只生成这两张表，不要硬编码连接串**
```bash
dotnet ef dbcontext scaffold \
  "Server=.;Database=DemoDb;Trusted_Connection=True;TrustServerCertificate=True" \
  Microsoft.EntityFrameworkCore.SqlServer \
  -o Models \
  -t T_Books -t T_Authors \
  --no-onconfiguring \
  -f
```

**第 2 步：生成的实体（节选，注意 `partial` 和导航属性）**
```csharp
public partial class TBook
{
    public TBook()
    {
        TAuthors = new HashSet<TAuthor>();
    }

    public long Id { get; set; }
    public string Title { get; set; } = null!;
    public double Price { get; set; }
    public long AuthorId { get; set; }

    public virtual TAuthor Author { get; set; } = null!;
    public virtual ICollection<TAuthor> TAuthors { get; set; }
}
```

**第 3 步：利用 `partial` 给它加东西，不要改生成的文件**
```csharp
// Models/TBook.Extend.cs —— 自己新建的文件，重新 Scaffold 也不会被冲掉
public partial class TBook
{
    public string Display => $"{Title}（{Price:C}）";
}
```

**第 4 步：生成的 DbContext（节选，关系被翻译成 Fluent API）**
```csharp
public partial class DemoDbContext : DbContext
{
    public virtual DbSet<TAuthor> TAuthors { get; set; } = null!;
    public virtual DbSet<TBook> TBooks { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TAuthor>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__T_Authors__3214EC07");
            entity.Property(e => e.Name).HasMaxLength(50);
        });

        modelBuilder.Entity<TBook>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__T_Books__3214EC07");
            entity.Property(e => e.Price).HasColumnName("Price");
            entity.Property(e => e.Title).HasMaxLength(100);

            // 外键关系：数据库里的 FK 被还原成导航属性
            entity.HasOne(d => d.Author)
                  .WithMany(p => p.TBooks)
                  .HasForeignKey(d => d.AuthorId)
                  .OnDelete(DeleteBehavior.ClientSetNull)
                  .HasConstraintName("FK_T_Books_T_Authors");
        });
    }
}
```

**第 5 步：在 Program.cs 里用配置注入（而不是让它自己连）**
```csharp
builder.Services.AddDbContext<DemoDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```
```json
// appsettings.json
{
  "ConnectionStrings": {
    "Default": "Server=.;Database=DemoDb;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

**第 6 步：验证能查出来**
```csharp
var books = await ctx.TBooks.Include(b => b.Author).Take(5).ToListAsync();
foreach (var b in books)
    Console.WriteLine($"{b.Title} / {b.Author.Name}");
```

==四：总结==

| 要点 | 说明 |
|---|---|
| **方向** | 反向工程 = DB First，数据库 → 实体类 + DbContext |
| **命令** | `dotnet ef dbcontext scaffold "连接串" 提供者包 -o Models` |
| **指定表** | `-t 表名` 可重复写；表多时必须筛 |
| **必加参数** | `--no-onconfiguring`，避免连接串明文写进代码 |
| **`partial` 的用处** | 生成类都是 `partial`，扩展写在独立文件里，重新生成不被覆盖 |
| **一次性** | Scaffold 之后再跑一次会**覆盖所有手改**，除非加 `-f` 明确知道自己在做什么 |
| **不要混用** | 反向工程的项目不要再对同一批表 `migrations add`，两套模型会打架 |

**记忆口诀：**

> **Code First 写实体生表，DB First 用 scaffold 生实体。**
> **-o 指定目录，-t 挑表，--no-onconfiguring 保命。**
> **生成的文件别改，扩展用 partial。**
