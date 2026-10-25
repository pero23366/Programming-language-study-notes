# 练习 01｜迁移体系综合练习（P56–62）

> **一句话题面**：做一个"图书管理"的最小 Web API，用 8 个步骤把 P56–62 的 7 个知识点全部亲手走一遍。
> **项目模板**：ASP.NET Core Web API（控制器版）
> **规则**：代码必须自己敲，不许复制笔记；每步的「验收标准」不达标就**不要往下走**。

---

## 0. 这一练在练什么

| 步骤 | 对应知识点 | 视频 | 你会做出的东西 |
|---|---|---|---|
| Step 1 | 环境搭建 | — | 能跑起来的 Web API 项目 + `dotnet ef` 可用 |
| Step 2 | 3-7 迁移深入 | P56 | 第一次迁移，`__EFMigrationsHistory` 里有一条记录 |
| Step 3 | 3-7 迁移深入 | P56 | 第二次迁移 + **真实回滚一次** |
| Step 4 | 3-8 其他迁移命令 | P57 | `list` / `script --idempotent` / `remove` / `update 0` 全用一遍 |
| Step 5 | 3-10 + 3-12 | P59 / P61 | 控制台看得见每一条 SQL |
| Step 6 | 3-13 方言差异 | P62 | 同一句 LINQ 在 SQL Server / SQLite 下的两份 SQL |
| Step 7 | 3-11 越界 | P60 | 两个耗时数字 + 一条窗口函数 SQL |
| Step 8 | 3-9 反向工程 | P58 | 从数据库反向生成的实体和 DbContext |

---

## 0.5 开工前的地基：三个角色各管一件事

后面 8 步会反复碰到"谁在动、动了什么"，先建立这张地图，否则 Step 3 和 Step 6 一定会混。

| 层 | 本质 | 管什么 | 何时运行 | 碰数据吗 |
|---|---|---|---|---|
| **迁移** Migration | 数据库结构的版本控制（给 schema 装 Git） | 模型差分 → DDL → 记账 | 设计时 / 部署时 | ❌ 只碰结构 |
| **ORM** DbContext | 对象 ↔ 值的翻译官 | 表达式树 → SQL、物化、跟踪 | 每次 CRUD | ✅ 全是数据 |
| **Provider** | 方言适配器 | 同一份模型 → 目标库的 SQL | 上面两者都调用它 | — |

**一条判据，别记混**

> 涉及"表有几个字段" → **迁移**
> 涉及"这一行存什么值" → **ORM**
> 涉及"这句 SQL 长什么样" → **Provider**

**建筑比喻**

- **迁移 = 盖楼**，含**改建与竣工档案**：加房间是 `AddColumn`，拆墙是 `DropColumn`，`__EFMigrationsHistory` 就是竣工档案。
- **Provider = 各地施工队**：同一张图纸，南方做防潮、北方做保温。SQL Server 队用 `OFFSET/FETCH`，SQLite 队用 `LIMIT`（Step 6 亲眼看到）。
- **ORM = 住在楼里的生活**：每天搬进搬出、取用摆放。它不是"软装"——软装一次做完就完事，ORM 是高频在跑的。

**三个必须先掐掉的误解**

1. ❌ 迁移是"EF 和数据库之间的协议" → 迁移跟通信无关，只改结构；EF 发 SQL 靠的是 ADO.NET。
2. ❌ C# 代码会被存进数据库 → 库里只有**值**。`class Book` 变成一张表（结构），`new Book{...}` 变成一行值；方法体、LINQ、`HasQueryFilter` 全都不进库。
3. ❌ EF 把不同的 SQL "统一"了 → 恰恰相反，同一句 LINQ 在 SQL Server / MySQL 下生成**不同**的 SQL。EF 统一的是**你的 C# 写法**，不是 SQL。

**用比喻看故障（与文末速查表互为印证）**

| 现象 | 用三层解释 |
|---|---|
| 实体加了字段，报"列不存在" | 图纸改了，**没让施工队动工**（漏 `migrations add`） |
| 手改库后迁移差分很怪 | 房子被私自改建，**档案没跟上**（快照漂移） |
| 换数据库后迁移报错 | 换了施工队，**老工艺不适用** |
| 有表但查不到数据 | 房子盖好，**没人住进去** |
| 删列回滚后数据没了 | 墙能重砌，**墙里的东西找不回来** |

---

## 1. 你的环境现状（我已确认，不用再查）

```
.NET SDK        10.0.401                    ✅ 已装（项目会自动用 net10.0）
SQL Server      本地实例 + MSSQLLocalDB      ✅ 已装，连 (localdb)\MSSQLLocalDB 即可
dotnet-ef 工具  ❌ 未安装                     ← Step 1 要装
```

---

## 2. 开始前先建一个记录文件

在项目根目录建 `docs/练习记录.md`，**每一步做完写三行**：

```markdown
## Step N
- 我做了什么：
- 我看到了什么（贴关键输出/报错）：
- 我踩的坑：
```

这份记录比代码重要 —— 一周后你只会记得坑，不会记得代码。

---

## Step 1｜建项目 + 装工具

**目标**：拿到一个能 `F5` 就出 Swagger 的 Web API 项目，并让 `dotnet ef` 命令可用。

**要做的事**

```bash
# ① 建项目（注意 --use-controllers）
dotnet new webapi -n BookApi --use-controllers
cd BookApi

# ② 装两个 EF Core 包
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design

# ③ 装 EF 命令行工具（全局，只装一次）
dotnet tool install --global dotnet-ef
```

> 用 Visual Studio 建的话：新建项目 → **ASP.NET Core Web API** → 取消勾选"使用控制器"**不要**取消（要勾上/或选"控制器"选项），框架选 `net10.0`。

**验收标准**

- [ ] 项目里有 `Controllers/` 文件夹（有 `WeatherForecastController.cs`）
- [ ] `dotnet ef --version` 打印出 `Entity Framework Core .NET Command-line Tools 10.x`
- [ ] `F5` 或 `dotnet run` 能打开 Swagger 页面

**卡住了看这里**

- 出现 `Controllers/` 里只有 minimal API 的 `Program.cs` 路由 → 建项目时漏了 `--use-controllers`，删掉重来，别在错的模板上硬改。
- `dotnet ef` 找不到 → `dotnet tool install --global dotnet-ef` 之后要**重开一个终端**（PATH 才刷新）。

---

## Step 2｜第一个实体 + 第一次迁移

**目标**：让数据库里真的出现 `Books` 表和 `__EFMigrationsHistory` 表。

**要做的事（三处改动）**

1. 新建 `Models/Book.cs`：`long Id`、`string Title`、`double Price`
2. 新建 `Data/BookContext.cs`：继承 `DbContext`，暴露 `DbSet<Book> Books`
   - **不要**在 `OnConfiguring` 里写连接串（那是控制台程序的做法，Web 项目走 DI）
3. 改 `appsettings.json` 加 `ConnectionStrings:Default`，连接串用：
   ```
   Server=(localdb)\MSSQLLocalDB;Database=BookDemo;Trusted_Connection=True;TrustServerCertificate=True
   ```
4. 改 `Program.cs`：`builder.Services.AddDbContext<BookContext>(opt => opt.UseSqlServer(...))`
   - 读连接串用 `builder.Configuration.GetConnectionString("Default")`

**然后跑迁移**

```bash
dotnet ef migrations add Init
dotnet ef database update
```

**验收标准**

- [ ] `Migrations/` 下出现**三个**文件：`xxx_Init.cs`、`xxx_Init.Designer.cs`、`BookContextModelSnapshot.cs`
- [ ] `dotnet ef migrations list` 里 `Init` 后面带 `(Applied)`（或 `Applied` 标记）
- [ ] 用 VS 的「SQL Server 对象资源管理器」或 `dotnet ef dbcontext info` 确认库名是 `BookDemo`
- [ ] 能在库里看到 `Books` 和 `__EFMigrationsHistory` 两张表，后者有一行记录

**做完记一笔**：打开 `xxx_Init.cs`，把 `Up()` 里**建表**那几行抄进练习记录 —— 这就是 EF 替你生成的 DDL。

**卡住了看这里**

- `Unable to create a DbContext` → 八成是没装 `Design` 包，或者 `Program.cs` 里没 `AddDbContext`。
- `A network-related or instance-specific error` → LocalDB 没起：`sqllocaldb start MSSQLLocalDB`。
- 证书错误 → 连接串补 `TrustServerCertificate=True`。

---

## Step 3｜改模型 + 第二次迁移（重点：真回滚一次）

**目标**：体会"迁移可回滚"到底是怎么实现的。

**要做的事**

1. 给 `Book` 加一个 `DateTime PubTime`（出版时间）
2. 用 Fluent API 给 `Title` 加约束：最长 100、必填
   - 提示：写在 `BookContext.OnModelCreating` 里，`builder.Entity<Book>(e => { ... })`
3. `dotnet ef migrations add AddPubTime`
4. **先别 update**，打开新生成的 `xxx_AddPubTime.cs`，把 `Up()` 和 `Down()` 各读一遍
5. `dotnet ef database update`
6. **回滚**：`dotnet ef database update Init`
7. 去库里确认 `PubTime` 列没了
8. **前滚**：`dotnet ef database update`

**验收标准**

- [ ] 你能不看笔记说出：第 6 步执行的是哪个方法（Up 还是 Down）
- [ ] 库里 `Books` 表的 `Title` 列长度是 100、`PubTime` 列是 `datetime2`
- [ ] 练习记录里写下了 `Up()` 的 `AddColumn` 那一句长什么样

**卡住了看这里**

- `database update Init` 报找不到迁移 → 迁移名写全（`Init` 就是带时间戳那个文件的后半段名字）。

---

## Step 4｜命令扫荡（3-8）

**目标**：把 5 个命令各用一遍，搞清"谁动代码、谁动数据库"。

**要做的事**（按顺序，每条都跑）

```bash
# ① 看清单和状态
dotnet ef migrations list

# ② 生成幂等脚本并打开看
dotnet ef migrations script --idempotent -o deploy.sql

# ③ 故意写错一个迁移，再撤销
dotnet ef migrations add WrongOne
dotnet ef migrations remove

# ④ 诊断：当前连的是哪个库
dotnet ef dbcontext info

# ⑤ 推倒重来（会删库！只在练习库上做）
dotnet ef database update 0
dotnet ef database update
```

**验收标准**

- [ ] `deploy.sql` 里每条迁移都被 `IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] ...)` 包住，能指着给同学讲这是干什么的
- [ ] `remove` 之后，`Migrations/` 下那个 `WrongOne` 三件套消失了，但**数据库一点没变**
- [ ] `update 0` 之后表全没了，`update` 之后又回来
- [ ] 你能一句话说清 `migrations remove` 和 `database update 0` 的区别

> ④⑤ 之间如果 `remove` 报 `The migration ... has already been applied` —— 说明你在**已应用**的迁移上做 remove。先 `database update` 回上一个版本再 remove。这个报错**故意让你遇到一次**。

---

## Step 5｜让 SQL 现形（3-10 + 3-12）

**目标**：以后每条查询都能亲眼看到它变成什么 SQL。

**要做的事**

1. `Program.cs` 里给 `AddDbContext` 链上：
   - `.LogTo(Console.WriteLine, LogLevel.Information)`
   - `.EnableSensitiveDataLogging()`
2. 写 `Controllers/BooksController.cs`（自己敲，别抄）：
   - `GET /api/books` → 返回全部（价格倒序）
   - `GET /api/books/{id}` → 按 id 查单条
   - `POST /api/books` → 新增一条
   - 注入 `BookContext`（构造函数注入，复习 Part2 的 DI）
3. 用 Swagger 依次调用三个接口，**盯着控制台**
4. 在控制器里加一个临时接口，用 `ToQueryString()` 把某条查询的 SQL 直接返回给前端看
5. 再加一个临时接口，打印 `ctx.Database.GetDbConnection().GetType().FullName`

**验收标准**

- [ ] 控制台出现 `Executed DbCommand (xms)`，能看到 `SELECT` / `INSERT` 原文
- [ ] 说得出 POST 时 EF 生成的 `INSERT` 语句里，`Id` 有没有出现（为什么）
- [ ] `ToQueryString()` 的输出里能看到 `WHERE`，且参数是 `@__p_0` 这种形式
- [ ] 连接对象的类型打印出来是 `Microsoft.Data.SqlClient.SqlConnection`
- [ ] 练习记录里抄下 3 条真实 SQL（查询、插入、ToQueryString 各一条）

**卡住了看这里**

- 控制台没输出 SQL → `LogTo` 加在 `AddDbContext` 的 lambda 里，不是加在 `BookContext` 里。
- 参数显示成 `?` → 忘了 `EnableSensitiveDataLogging()`。
- GET 返回空数组但库里有数据 → 检查是不是查了另一个库（回 Step 4 第 ④ 条）。

---

## Step 6｜同一句 LINQ，两种方言（3-13）

**目标**：亲眼看到 Provider 的翻译差异。

**要做的事**

1. 加 SQLite 包：`dotnet add package Microsoft.EntityFrameworkCore.Sqlite`
2. 写一个临时的类或接口，用 `DbContextOptionsBuilder<BookContext>` 手工构造两个上下文：
   - 一个 `UseSqlServer(连接串)`
   - 一个 `UseSqlite("Data Source=:memory:")`（不连真库，只借它翻译）
3. 对**同一句** LINQ 分别调 `ToQueryString()`，把两份 SQL 打印出来：
   ```csharp
   ctx.Books.Where(b => b.Title.Contains("C#"))
      .OrderByDescending(b => b.PubTime)
      .Skip(2).Take(3)
   ```
4. 对比这三处：分页写法、`Contains` 的翻译、标识符的引号

**验收标准**

- [ ] 两份 SQL 并排贴进练习记录
- [ ] 你能指出 SQL Server 用 `OFFSET/FETCH`、SQLite 用 `LIMIT/OFFSET`
- [ ] 你能说出 `Contains` 在两边分别被翻成了什么

**卡住了看这里**

- SQLite 上下文不用真建库、不用 `EnsureCreated`，**只调 `ToQueryString()` 不会连库**。
- 报"没有 SQLite Provider" → 包没装上，或没 `using Microsoft.EntityFrameworkCore;`。

> 这一节看到的就是 **Provider** 在干活：图纸不动，施工队各按本地规范施工（回看 0.5 的三层分工）。

---

## Step 7｜越界：EF 做不到的事（3-11）

**目标**：亲手制造一次"EF 无能为力"，然后优雅地绕过去。

**要做的事**

**A. 批量改价的性能对比**

1. 先插 5000 条假数据（循环 `Add` + 一次 `SaveChanges`，或用 `ExecuteSqlRaw` 的 `INSERT ... SELECT`）
2. 用 `Stopwatch` 计时方案一：`ToList()` 查出来 → `foreach` 改价 → `SaveChanges()`
3. 用 `Stopwatch` 计时方案二：`ExecuteUpdateAsync(... SetProperty(b => b.Price, b => b.Price * 1.1))`
4. 把两个耗时数字记下来

**B. 一条 EF 翻译不出来的查询**

需求：每个价格档位内按价格排名，取前 3 名。

1. 先试着用 LINQ 写（`GroupBy` + `Select(g => g.OrderBy(...).Take(3))`），**让它报错**
2. 改成原生 SQL：
   ```csharp
   ctx.Database.SqlQueryRaw<RankRow>(@"SELECT ... ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) AS Rnk ...")
   ```
   `RankRow` 自己定义（`long Id`、`string Title`、`double Price`、`int Rnk`）

**验收标准**

- [ ] 两个耗时数字（预期方案二快 1~2 个数量级）
- [ ] LINQ 版本抛出的异常原文抄进记录
- [ ] 窗口函数版本能正确返回每组前 3 条
- [ ] 你能说出：为什么这种查询不该硬用 LINQ 写

**卡住了看这里**

- `ExecuteUpdateAsync` / `SqlQueryRaw` 找不到 → 确认项目是 `net10.0` + EF Core 10，这两个 API 都有。
- 5000 条插太慢 → 用一条 `ExecuteSqlRaw` 的 `INSERT INTO ... SELECT ... FROM ...`（配合 `sys.all_objects` 交叉连接）造数据，比循环快得多。

---

## Step 8｜反向工程（3-9）

**目标**：体会"照数据库生成代码"和"从代码生成数据库"刚好相反。

**要做的事**

1. 先备份：把 `Models/Book.cs` 复制成 `Models/Book.Backup.cs.txt`（后缀改掉，别让它参与编译）
2. 删掉 `Models/Book.cs`
3. 从库里反向生成到**另一个文件夹**，避免覆盖你手写的：
   ```bash
   dotnet ef dbcontext scaffold "Server=(localdb)\MSSQLLocalDB;Database=BookDemo;Trusted_Connection=True;TrustServerCertificate=True" Microsoft.EntityFrameworkCore.SqlServer -o Scaffold -t Books --no-onconfiguring -f
   ```
4. 打开 `Scaffold/` 下的两个文件，一行行读
5. 收尾：删掉 `Scaffold/`，把 `Book.Backup.cs.txt` 改回 `Book.cs`

**验收标准**

- [ ] 你能在生成的 `OnModelCreating` 里**找到**你在 Step 3 配的 `HasMaxLength(100)`（它变成了 `entity.Property(e => e.Title).HasMaxLength(100)`）
- [ ] 你能指出哪一句是主键、哪一句是必填
- [ ] 你能说出 `--no-onconfiguring` 漏掉会发生什么（连接串被明文写进代码）
- [ ] 练习记录里写：为什么生成出来的实体类带 `partial`

> 反向工程是"照竣工的房子重画图纸"；日常开发是"改图纸 → 施工"。方向正好相反（回看 0.5 的三层分工）。

---

## 交卷检查表

全部打勾，这一批（P56–62）就算过了：

- [ ] 我的项目用 `dotnet ef migrations list` 能看到 2 条迁移记录，且都是 Applied
- [ ] 我能不看笔记解释三个迁移文件各自的作用
- [ ] 我真实回滚过一次（`database update Init` → 再前滚）
- [ ] 我生成过 `--idempotent` 脚本，并知道它为什么能重复执行
- [ ] 我知道 `remove` 删代码、`update 0` 删结构
- [ ] 我的控制台能打印每条 SQL，并且我看得懂 `Parameters=[@__p_0=...]`
- [ ] 我打印过连接对象，确认它是 `SqlConnection`
- [ ] 我并排对比过 SQL Server 和 SQLite 的 SQL
- [ ] 我实测过 `SaveChanges` 与 `ExecuteUpdate` 的耗时差
- [ ] 我用 `scaffold` 从库里反向生成过代码，并且能定位到自己的配置

---

## 常见报错速查

| 报错 | 真正的原因 | 怎么解 |
|---|---|---|
| `Unable to create a DbContext of type ...` | 没装 `Design` 包 / Program 里没 `AddDbContext` | 装包 + 补注册 |
| `A network-related or instance-specific error` | LocalDB / SQL Server 没启动 | `sqllocaldb start MSSQLLocalDB` |
| `证书链是由不受信任的颁发机构颁发的` | 本地证书没被信任 | 连接串加 `TrustServerCertificate=True` |
| `The migration 'xxx' has already been applied` | 对已应用的迁移做 `remove` | 先 `database update 上一个迁移`，再 `remove` |
| `No project was found` | 终端不在项目目录 | `cd BookApi` |
| `Your target project ... doesn't match your migrations assembly` | 命令跑错项目 | 单项目不会遇到；分层项目要加 `--project`/`--startup-project` |
| `Object reference not set` 在查导航属性时 | 忘了 `Include` | 本练习暂无导航属性，下一批会撞上 |
