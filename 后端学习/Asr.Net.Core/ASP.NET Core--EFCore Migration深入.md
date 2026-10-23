==一：概念==
**迁移（Migration）是什么**

EF Core 里，你只写 C# 实体类，**数据库不会自己跟着变**。迁移就是一套"**给数据库结构做版本控制**"的机制：把每一次模型改动，翻译成一个带时间戳的 C# 类，里面写清楚"怎么升级（Up）"和"怎么退回（Down）"。

类比 WPF：实体类是你画在纸上的界面草图，迁移就是**一份一份可回滚的施工单**。改一处草图就开一张新施工单，数据库按施工单顺序施工。

**`migrations add` 一次生成三个文件**

| 文件 | 作用 |
|---|---|
| `20231023153000_AddBook.cs` | 主角。`Up()` 写建表/加列，`Down()` 写完全相反的操作 |
| `20231023153000_AddBook.Designer.cs` | 迁移时那一刻的**模型快照**（EF 自己读，你别动） |
| `MyDbContextModelSnapshot.cs` | 当前最新模型快照，**只有一个，每次迁移都被覆盖** |

> 三个文件缺一不可，还改不齐就手删三个一起删。

**数据库里还有一张隐形表**

`__EFMigrationsHistory`：记录"哪些迁移已经在当前库里执行过了"。

这就是迁移能"只执行新的、不重复执行旧的"的原因——**EF 拿 `Snapshot` 和这张表做差集**，差出来的才执行。

**跑迁移的三条路**

1. `dotnet ef database update`：立刻把差集执行掉（**开发环境用**）
2. `dotnet ef migrations script`：只生成 SQL 脚本，不执行（**生产环境用**）
3. 直接 `database drop` 删库重建（**学习和测试环境用**，别在生产上试）

**为什么生产环境不许 `database update`**：生产库的结构变更要走 DBA 审核、要有回滚预案、要能在发布窗口里执行。EF 一句命令直连生产库改结构，出问题连"批"都没人批。

==二：格式==
**1. 安装工具（一次性）**
```bash
dotnet tool install --global dotnet-ef
```
> 项目里还要 `Microsoft.EntityFrameworkCore.Design` 这个包，不然命令报"启动项找不到"。

**2. 增删改查迁移的四个核心命令**
```bash
# 生成迁移（模型改完后必做）
dotnet ef migrations add 迁移名

# 应用到数据库（执行差集）
dotnet ef database update

# 撤销最后一次【尚未应用】的迁移
dotnet ef migrations remove

# 生成 SQL 脚本（不执行）
dotnet ef migrations script
```

**3. 包管理器控制台（PMC，Visual Studio）等价写法**
```powershell
Add-Migration 迁移名
Update-Database
Remove-Migration
Script-Migration
```

**4. 回滚到某个迁移**
```bash
dotnet ef database update 上一个迁移名   # 退到指定版本（Down 会被执行）
dotnet ef database update 0              # 退到最初，等于清空所有表
```

**5. 改过迁移名之后**
```bash
dotnet ef database update             # 先把已应用的迁移跑完
dotnet ef migrations remove           # 再撤销
dotnet ef migrations add 新名字        # 重新生成
```
> 顺序不能反。**已应用的迁移不允许 remove**，EF 会直接报错拦你。

==三：代码==
**场景**：已有 `T_Books` 表，现在给 `Book` 加一个 `PubTime` 属性。

**第 1 步：改实体**
```csharp
public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public double Price { get; set; }
    public DateTime PubTime { get; set; }   // ← 新增
}
```

**第 2 步：生成迁移**
```bash
dotnet ef migrations add AddPubTimeToBook
```

**第 3 步：看看它自动写了什么（重点，别不看就执行）**
```csharp
public partial class AddPubTimeToBook : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "PubTime",
            table: "T_Books",
            type: "datetime2",
            nullable: false,
            defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "PubTime", table: "T_Books");
    }
}
```

**第 4 步：执行**
```bash
dotnet ef database update
```
输出里会看到：
```
Applying migration '20231023153000_AddPubTimeToBook'.
Done.
```

**第 5 步：验证回滚真的可用**
```bash
dotnet ef database update 上一个迁移名
```
再去看表结构，`PubTime` 列消失了 —— 这就是 `Down()` 干的活。

**第 6 步：生产环境导出脚本**
```bash
dotnet ef migrations script -o migrate.sql
```
打开 `migrate.sql`，里面就是纯 SQL：
```sql
CREATE TABLE [__EFMigrationsHistory] (...);
GO
ALTER TABLE [T_Books] ADD [PubTime] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00';
GO
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20231023153000_AddPubTimeToBook', N'6.0.0');
GO
```
**注意最后那句 INSERT**：EF 靠它记账，手工改脚本时千万别删。

==四：总结==

| 要点 | 说明 |
|---|---|
| **本质** | 给数据库结构做版本控制，一次模型改动 = 一张可回滚的施工单 |
| **三件套** | `xxx.cs`（Up/Down）、`xxx.Designer.cs`（当次快照）、`ModelSnapshot.cs`（最新快照） |
| **记账表** | 数据库里的 `__EFMigrationsHistory`，决定"哪些已执行" |
| **开发环境** | `migrations add` → `database update` |
| **生产环境** | `migrations script` 出 SQL → 走审核 → 由 DBA/发布流程执行 |
| **回滚** | `database update 目标迁移名`，靠 `Down()` 实现；`update 0` 清空全部 |
| **铁律** | 已应用的迁移不能 `remove`；`Designer.cs`、`Snapshot.cs` 不要手改 |

**记忆口诀：**

> **改实体 → add 生成施工单 → update 施工 → script 上生产。**
> **增删改列看 Up，回滚靠 Down，记账靠 __EFMigrationsHistory。**
