# MySQL 安装与启动

> 来源：P3《03. 基础-概述-MySQL安装及启动》 · 档位 A 几乎重叠
> 与我已知的关系：等价于装一次 SQL Server Express，只是装完没有图形界面

==一：意义与概念==

装的是**社区版 8.0**（免费，生产可商用）。安装过程本身没有新知识，你的经验足够直通，只需要留意三件事：

1. **端口 3306** —— 默认值，和 SQL Server 的 1433 不冲突，两个可以共存。
2. **服务名 MySQL80** —— 装完自动注册成 Windows 服务。这点和 SQL Server 一样，但 MySQL 安装包里**不带图形客户端**，客户端要另外装 DataGrip 或命令行。
3. **root 密码** —— 安装时设一次，之后忘了只能重装或改配置，别乱填。

与 SQL Server 的关键差别：SQL Server 是"引擎 + SSMS"两套安装；MySQL 是"引擎自带服务注册 + 你自己挑客户端"。

==二：使用格式==

```bash
# 启动 / 停止（管理员权限）
net start MySQL80
net stop  MySQL80

# 连接（-h 省略则连本机）
mysql -u root -p
# 退出
exit
```

也可以在 `services.msc` 里手动启停。装完直接敲 `mysql -u root -p` 能进就是通了。

==四：总结归纳==

- 要记三样：端口 `3306`、服务名 `MySQL80`、root 密码。
- 记忆锚：MySQL 装完是个"不会说话的引擎"，客户端是你自己配的收音机。
- 自测：① 报错 `ERROR 2003 (HY000)` 先查什么？② 装 MySQL 后不装 DataGrip，能不能用？
- 💡 延伸：8.0 默认认证插件是 `caching_sha2_password`，老版本客户端（含部分 .NET 旧驱动）会报认证失败，用 `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '密码';` 可回退。
