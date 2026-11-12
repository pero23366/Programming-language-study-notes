# 存储引擎简介与 InnoDB

> 来源：P60–P61《03–04. 进阶-存储引擎-简介 / InnoDB介绍》 · 档位 C 全新
> 与我已知的关系：EF Core 世界里"事务/行锁/外键"是理所当然的，在 MySQL 里它们是**InnoDB 这个引擎给的能力**，换成 MyISAM 就全没了

==一：意义与概念==

存储引擎是**表级**的属性，不是库级、不是实例级。建表时用 `ENGINE=` 指定，不写就用默认（8.0 是 InnoDB）。

为什么这件事重要：MySQL 8.0 里你能用的"现代数据库功能"全部来自 InnoDB。把引擎这件事理解透，你才会明白为什么老项目里有些表"事务回滚不生效"——那不是 bug，是那张表建成了 MyISAM。

InnoDB 的四个招牌能力：

| 能力 | 具体表现 | 你熟悉的对应物 |
|---|---|---|
| **事务** | `START TRANSACTION` / `COMMIT` / `ROLLBACK` 真生效 | EF Core 的 `BeginTransaction()` |
| **行级锁** | 只锁命中的行（前提是走索引）| 比表锁并发高得多 |
| **外键** | 物理外键约束能生效 | EF Core 导航属性生成的外键 |
| **MVCC** | 读不加锁，靠多版本快照 | 类似 SQL Server 的 RCSI 快照隔离，但机制不同 |

InnoDB 的文件组织：每张表一个 `.ibd` 文件（8.0 默认 `innodb_file_per_table=ON`），里面装着**表结构 + 数据 + 索引**（三者合一），再加上共享的 `ibdata` 系统表空间和 `redo log`、`undo log`。

这句话要划重点：**InnoDB 的表就是"一棵以主键组织的 B+ 树"**，数据和主键索引是同一个东西（叫聚簇索引）。这是第 11 章、第 12 章所有优化结论的源头——`ORDER BY 主键` 特别快、主键要短、不要用 UUID 当主键，全从这里来。

和 EF Core 的关系：EF Core 默认建表用的是各数据库的默认引擎，MySQL 上就是 InnoDB，所以你多半无感。但如果你**手工写过 `ENGINE=MyISAM`**（老代码常见），EF Core 的 `SaveChanges()` 事务就会变成"逐条提交"，出错时前面的语句不会回滚——这是最难查的一类数据不一致。

==二：使用格式==

```sql
CREATE TABLE t (...) ENGINE=InnoDB;      -- 建表时指定
ALTER TABLE t ENGINE=MyISAM;             -- 转换引擎（会重建整表，锁表）
SHOW TABLE STATUS LIKE 't'\G             -- 看表用了什么引擎
SHOW CREATE TABLE t;                     -- 更直接
```

| 参数 | 说明 |
|---|---|
| `ENGINE=InnoDB` | 8.0 默认，事务 + 行锁 + 外键 + MVCC |
| `innodb_file_per_table` | `ON` 时每表一个 `.ibd`；`OFF` 时全放共享表空间 |

==三：代码实践==

```sql
-- 确认表引擎
SELECT table_name, engine FROM information_schema.tables
WHERE table_schema = 'demo' AND table_name = 'emp';

-- 验证 InnoDB 的事务能力
CREATE TABLE t_innodb (id INT PRIMARY KEY, v INT) ENGINE=InnoDB;
START TRANSACTION;
INSERT INTO t_innodb VALUES (1, 100);
ROLLBACK;
SELECT * FROM t_innodb;      -- 空，回滚生效

-- 同样操作换成 MyISAM
CREATE TABLE t_myisam (id INT PRIMARY KEY, v INT) ENGINE=MyISAM;
START TRANSACTION;
INSERT INTO t_myisam VALUES (1, 100);
ROLLBACK;
SELECT * FROM t_myisam;      -- 有 1 行！回滚无效
```

==四：总结归纳==

- 三条：引擎是**表级**属性；InnoDB = 事务 + 行锁 + 外键 + MVCC；InnoDB 的表就是主键 B+ 树（数据和索引合一）。
- 记忆锚：MyISAM 是"只会读写的傻瓜引擎"，InnoDB 才是"能上生产的那台"。
- 自测：① 一张表建成 MyISAM，`ROLLBACK` 会怎样？② 为什么"主键要短"这件事在 InnoDB 里格外重要？
