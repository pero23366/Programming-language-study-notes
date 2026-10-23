==一：概念==
上一节只用了 `migrations add` 和 `database update` 两个命令。实际项目里，迁移是一个**有生命周期**的过程，每个阶段有不同的命令配套：

| 阶段 | 想干什么 | 该用哪个命令 |
|---|---|---|
| 刚写完，发现写错了、还没执行 | 撤销这张施工单 | `migrations remove` |
| 想看这个项目一共有几张施工单 | 列清单 | `migrations list` |
| 要交付给运维/DBA | 出 SQL 脚本 | `migrations script` |
| 生产库已经落后好几个版本，要一次补上 | **幂等脚本** | `migrations script --idempotent` |
| 学习环境想推倒重来 | 删库 | `database drop` |
| 想看 EF 到底认出了哪些 DbContext / 连的哪个库 | 诊断 | `dbcontext info`、`dbcontext list` |

**核心认知：`remove` 和 `update` 是两个方向的删除，别搞混**

- `migrations remove`：删的是**代码文件**（三件套），数据库完全不动。前提是这张施工单**还没拿去施工**。
- `database update 旧版本`：动的是**数据库结构**（执行 `Down()`），迁移文件还在。

**幂等脚本（`--idempotent`）为什么重要**

普通脚本是"从头到尾 Alter 一遍"，重复执行必然报"列已存在"。幂等脚本会先查 `__EFMigrationsHistory`：

```sql
IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'2023...')
BEGIN
    ALTER TABLE ...
END
```
**已执行就跳过，没执行才跑**。这样运维不管当前库是哪个版本，都能安全执行同一份脚本 —— 生产环境部署的标准做法。

==二：格式==
```bash
# 列出所有迁移及其状态（是否已应用）
dotnet ef migrations list

# 撤销最后一次尚未应用的迁移（删三件套文件）
dotnet ef migrations remove

# 生成普通 SQL 脚本
dotnet ef migrations script -o migrate.sql

# 生成幂等脚本（推荐生产用）
dotnet ef migrations script --idempotent -o migrate.sql

# 只生成【某两个版本之间】的脚本
dotnet ef migrations script 起点迁移名 终点迁移名 -o part.sql

# 删除数据库
dotnet ef database drop
dotnet ef database drop --force     # 不询问，直接删

# 诊断：当前上下文连的是哪个库、有哪些上下文
dotnet ef dbcontext info
dotnet ef dbcontext list

# 通用参数（所有命令都能加）
--no-build          不重新编译，加快执行（刚 build 过才用）
--verbose           输出详细日志，排错用
--project / --startup-project   分层的项目必用
```

**PMC 等价写法**
```powershell
Get-Migration
Remove-Migration
Script-Migration -Idempotent -Output migrate.sql
Drop-Database
```

==三：代码==
**场景：分层的解决方案（DbContext 在 `Demo.EFCore` 项目，启动项目是 `Demo.Web`）**

**1. 分层项目里命令必须指定两个项目**
```bash
dotnet ef migrations add Init \
  --project Demo.EFCore \
  --startup-project Demo.Web
```
> 不指定就会报错：`Unable to create an object of type 'MyDbContext'`。原因是 EF 要**运行启动项目**才能拿到 DI 容器里的 DbContext 配置。

**2. 完整的一个"写错-撤销-重来"回合**
```bash
# ① 生成错了（比如把 Price 写成了 int）
dotnet ef migrations add WrongPriceType

# ② 还没执行过，直接撤销
dotnet ef migrations remove
# 输出：Removing migration '20231023160000_WrongPriceType'.
#      Reverting model snapshot.

# ③ 改好实体后重新生成
dotnet ef migrations add AddPriceAsDecimal
```

**3. 已经执行了怎么办？两套动作**
```bash
# 情况 A：想保留数据，往前滚一格
dotnet ef database update 上一个迁移名   # 执行 Down()，删掉那一列
dotnet ef migrations remove              # 再删代码文件

# 情况 B：学习环境，数据无所谓
dotnet ef database drop --force
dotnet ef database update                # 从零重建
```

**4. 生成幂等脚本并检查内容**
```bash
dotnet ef migrations script --idempotent -o deploy.sql
```
脚本里每个迁移都被 `IF NOT EXISTS` 包住：
```sql
IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20231023153000_AddPubTimeToBook')
BEGIN
    ALTER TABLE [T_Books] ADD [PubTime] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00';
END;
GO
```

**5. 诊断命令的实际输出**
```bash
dotnet ef dbcontext info
```
```
Provider name: Microsoft.EntityFrameworkCore.SqlServer
Database name: DemoDb
Data source: localhost
Options: None
```
> 连错库、连错实例时，这一条命令 3 秒定位问题，比翻 5 个 `appsettings.json` 快。

==四：总结==

| 命令 | 作用对象 | 会不会动数据库 | 典型场景 |
|---|---|---|---|
| `migrations add` | 生成三件套 | ❌ | 每次改完实体 |
| `migrations remove` | 删三件套 | ❌ | 写错且未执行 |
| `migrations list` | 列清单 | ❌ | 确认应用状态 |
| `migrations script` | 出 SQL | ❌ | 交付生产 |
| `migrations script --idempotent` | 出幂等 SQL | ❌ | **生产部署首选** |
| `database update` | 执行差集 | ✅ | 开发环境 |
| `database update 0` | 清空 | ✅ | 推倒重来 |
| `database drop` | 删库 | ✅ | 学习环境 |
| `dbcontext info/list` | 诊断 | ❌ | 连不上库时排错 |

**三个高频坑**

1. **`remove` 报 "The migration has already been applied"** → 先 `database update 上一个迁移`，再 `remove`。
2. **分层项目命令报"创建不了 DbContext"** → 漏了 `--startup-project`。
3. **生产执行报"列已存在"** → 用了普通脚本，改用 `--idempotent`。

**记忆口诀：**

> **remove 删代码，update 删结构。**
> **清单用 list，交付用 script，生产必加 idempotent。**
