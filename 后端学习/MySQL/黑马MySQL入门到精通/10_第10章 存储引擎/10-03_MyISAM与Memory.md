# MyISAM 与 Memory

> 来源：P62《05. 进阶-存储引擎-MyISAM和Memory》 · 档位 C 全新
> 与我已知的关系：这两个引擎是"反面教材"，理解它们能反推出 InnoDB 每个设计在解决什么问题

==一：意义与概念==

除了 InnoDB，还有两个你会遇到（尤其在老项目和临时表里）：

**MyISAM** —— MySQL 5.5 之前的默认引擎。特点：

| 维度 | MyISAM | InnoDB | 意味着什么 |
|---|---|---|---|
| 事务 | ❌ 不支持 | ✅ | MyISAM 的 `ROLLBACK` 是空操作 |
| 锁粒度 | **表锁** | 行锁 | 一个人改一行，全表都不能写 |
| 外键 | ❌ 不支持 | ✅ | 写了也会被忽略 |
| MVCC | ❌ | ✅ | 读写互相阻塞 |
| 索引结构 | B+ 树，但**数据和索引分离** | B+ 树，**数据即主键索引** | MyISAM 主键查询要多一次"定位"|
| 崩溃恢复 | ❌ 差 | ✅ 靠 redo log | 断电后 MyISAM 表可能损坏 |
| 全文索引 | ✅（5.6 前唯一选择）| 5.6 起支持 | 现在没必要为全文用 MyISAM |

MyISAM 唯一的残留优势：**表级锁的实现简单，全表扫描和 `COUNT(*)`（无 WHERE）极快**，因为它维护了一个行数计数器。所以统计类、只读的日志归档表在老系统里偶尔还能见到。**新项目没有任何理由用它。**

**Memory** —— 数据全放内存，服务重启就没了：

| 维度 | Memory | 说明 |
|---|---|---|
| 存储位置 | RAM | 重启/崩溃 = 数据全丢 |
| 索引 | **默认 Hash 索引** | 只能等值查询，不支持范围 |
| 锁 | 表锁 | 并发差 |
| 适用 | 临时中间表、会话缓存、小字典表 | 数据量小、可重建的场景 |

Memory 的定位很窄：一次性的统计中间结果、配置字典这类"丢了能重算"的东西。它**不能存 TEXT/BLOB**（变长类型不支持），字段只能是定长。

和 EF Core 的关系：你在 EF Core 里写的 `.UseMySql()` 默认就是 InnoDB，几乎不会碰到这两个。真正的风险是**迁移老库**——老项目的日志表、统计表可能是 MyISAM，迁过来后你以为有事务，实际没有。检查方法很简单：`SELECT table_name, engine FROM information_schema.tables WHERE engine <> 'InnoDB';`

==二：使用格式==

```sql
CREATE TABLE t (id INT, PRIMARY KEY(id)) ENGINE=MyISAM;
CREATE TABLE cache (k VARCHAR(32) PRIMARY KEY, v VARCHAR(255)) ENGINE=MEMORY;
```

==三：代码实践==

```sql
-- 找出库里所有非 InnoDB 的表（迁移前必查）
SELECT table_schema, table_name, engine
FROM information_schema.tables
WHERE table_schema NOT IN ('mysql','sys','information_schema','performance_schema')
  AND engine <> 'InnoDB';

-- Memory 表的典型用途：中间统计结果
CREATE TEMPORARY TABLE tmp_stat (
  dept_id INT PRIMARY KEY, cnt INT
) ENGINE=MEMORY;
```

==四：总结归纳==

- 三条：MyISAM 无事务无行锁无外键，`ROLLBACK` 是空操作；Memory 数据在内存、默认 Hash 索引、只能等值查；迁移老库先查 `engine <> 'InnoDB'`。
- 记忆锚：MyISAM 是"只读时代的引擎"，Memory 是"草稿纸"。
- 自测：① MyISAM 上执行 `ROLLBACK` 会发生什么？② Memory 表为什么建 `VARCHAR` 主键会有问题？
