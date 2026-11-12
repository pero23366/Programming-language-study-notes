# Linux 版 MySQL 安装

> 来源：P65《08. 进阶-MySQL安装(linux版本)》 · 档位 A 几乎重叠
> 与我已知的关系：本质就是"解压 + 初始化 + 注册服务"，你在 Windows 上装过一遍，这里只差命令

==一：意义与概念==

生产几乎都在 Linux 上，所以要会。流程和 Windows 版是同一套逻辑，只是没有安装向导：

```
下载 tar.xz  → 解压到 /usr/local  → 建 mysql 用户  → 初始化数据目录  → 改配置  → 启动  → 改 root 密码
```

四个 Linux 特有的点：

1. **必须建独立用户 `mysql`**，不能用 root 跑服务（安全 + 文件权限）。
2. **初始化用 `mysqld --initialize`**，会自动生成一个**随机 root 密码写在错误日志里**，不像 Windows 安装向导让你自己设。
3. **配置文件是 `/etc/my.cnf`**（或 `/etc/mysql/my.cnf`），不是注册表。
4. **启动用 `systemctl start mysqld`**，不是 `net start`。

这部分对你当前阶段**可以先跳过**——你本地是 Windows + 图形界面，等要部署到云服务器时再回来照着敲。但有一个知识必须现在记住：**生产库的 `my.cnf` 是性能调优的主战场**（`innodb_buffer_pool_size`、`max_connections`、`slow_query_log` 都在里面），第 12、17 章会反复提到这些参数。

和 EF Core 的关系：连接串里的 `Server=...` 换成服务器 IP，其他不变。区别在于 Linux 上的**表名默认大小写敏感**（`lower_case_table_names=0`），Windows 上不敏感——EF Core 生成的表名如果混了大小写，在 Linux 生产库上会报"表不存在"。

==二：使用格式==

```bash
# 1. 解压
tar -xvf mysql-8.0.xx-linux-glibc2.12-x86_64.tar.xz -C /usr/local
mv /usr/local/mysql-8.0.xx-linux-glibc2.12-x86_64 /usr/local/mysql

# 2. 建用户并授权
useradd -r -s /bin/false mysql
chown -R mysql:mysql /usr/local/mysql

# 3. 初始化（密码会打印到日志）
/usr/local/mysql/bin/mysqld --initialize --user=mysql --basedir=/usr/local/mysql --datadir=/usr/local/mysql/data

# 4. 启动与自启
systemctl start mysqld
systemctl enable mysqld

# 5. 取初始密码并登录
grep 'temporary password' /usr/local/mysql/data/*.err
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY '新密码';
```

| 参数 | 作用 |
|---|---|
| `--basedir` | 安装目录 |
| `--datadir` | 数据目录（**初始化后不能随便换**）|
| `--initialize` | 生成随机 root 密码 |
| `--initialize-insecure` | root 空密码（仅本地测试）|

==四：总结归纳==

- 三条：必须建 `mysql` 用户；`--initialize` 生成随机密码在错误日志里；配置文件在 `/etc/my.cnf`。
- 记忆锚：Windows 是"点下一步"，Linux 是"五条命令走一遍"。
- 自测：① `--initialize` 之后 root 密码从哪拿？② Linux 上表名大小写和 Windows 有区别吗？
