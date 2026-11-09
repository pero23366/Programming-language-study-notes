# 图形化工具 DataGrip

> 来源：P11《11. 基础-SQL-图形化界面工具DataGrip》 · 档位 A 几乎重叠
> 与我已知的关系：就是 MySQL 世界的 SSMS，会连数据库就会用它

==一：意义与概念==

MySQL 装完只有命令行，DataGrip 是给它的图形客户端。角色和 SSMS 对 SQL Server 完全一致：**写 SQL、看表结构、看执行结果、看执行计划**。

连接只要四个参数，和你写 `appsettings.json` 里的连接串一一对应：

| 字段 | 值 | 对应连接串片段 |
|---|---|---|
| Host | `localhost` | `Server=localhost` |
| Port | `3306` | `Port=3306` |
| User | `root` | `User Id=root` |
| Password | 安装时设的 | `Password=***` |

.NET 连接串（Pomelo 驱动）：`Server=localhost;Port=3306;Database=demo;User Id=root;Password=***;`

**这篇可以跳过**：VS 有 MySQL 插件、命令行 `mysql` 也能干同样的事，用哪个纯看顺手。后续课程的截图都是 DataGrip，看不习惯时对着命令行敲一样的效果。

==四：总结归纳==

- 四个参数：localhost / 3306 / root / 密码。
- 记忆锚：SSMS 换成 DataGrip，脑子里那套操作不用变。
- 自测：连接串里 `Database=demo` 对应 DataGrip 的哪个设置项？
