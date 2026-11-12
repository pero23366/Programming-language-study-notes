# 事务原理：redo log 与 undo log

> 来源：P138–P140《81–83. 进阶-InnoDB引擎-事务原理-概述 / redolog / undolog》 · 档位 C 全新
> 与我已知的关系：09-02 说过"A 靠 undo、D 靠 redo"，这一篇把这两句话拆成可验证的机制

==一：意义与概念==

### 问题：为什么"先写日志再写数据"

如果每次 `COMMIT` 都把 Buffer Pool 里的脏页刷到磁盘，会有两个问题：

1. **慢**：脏页是随机分布的，随机写磁盘极慢。
2. **不安全**：刷到一半断电，页只写了一半（"半写"），数据就坏了。

**WAL（Write-Ahead Logging）解法**：先把"改了什么"顺序写进 redo log（顺序写，快），事务就可以提交了；脏页之后再慢慢刷。断电后靠 redo log 重放恢复。

这就是"**日志先行**"，也是所有现代数据库的共同设计。

### redo log：保证持久性（前滚）

- **物理日志**：记录"表空间 X 的页 Y 的偏移 Z 改成了什么值"，不是 SQL。
- **循环写**：固定大小（如 4 个 1GB 文件），写满就覆盖最旧的（前提是那部分对应的脏页已刷盘）。
- **两阶段**：`prepare` → 写 binlog → `commit`。这个 2PC 保证 redo 与 binlog 一致，否则主从会不一致。

**关键参数**：`innodb_flush_log_at_trx_commit`

| 值 | 提交时行为 | 数据安全性 |
|---|---|---|
| `1`（默认）| 立即 fsync 到磁盘 | 不丢 |
| `0` | 交给后台每秒刷 | 宕机丢 1 秒 |
| `2` | 写到 OS 缓存，由 OS 刷 | 仅断电丢 |

### undo log：保证原子性（回滚）+ 支撑 MVCC

- **逻辑日志**：记录"反向操作"——插入对应删除，更新对应"改回旧值"。
- **回滚**：`ROLLBACK` 时逆序执行 undo 记录。
- **MVCC 的基石**：undo log 里保留了**旧版本的行**，所以别的事务能读到"历史版本"（17-05）。

**两类 undo**：

| 类型 | 用途 | 何时回收 |
|---|---|---|
| `insert undo` | 回滚插入 | 事务提交后**立即**可删（因为没人需要看"不存在的行"）|
| `update undo` | 回滚更新 + MVCC | 要等**没有事务需要这个旧版本**才能删（purge 线程）|

这就是"长事务害人"的机制解释：一个长事务开着，它可能需要看很旧的版本 → 对应的 undo 不能删 → undo 表空间持续增长。

### 三条链的关系（一句话串起来）

```
改数据 → 写 undo（旧值，为了回滚和 MVCC）
       → 写 redo（新值，为了崩溃恢复）
       → 提交时写 binlog（逻辑语句，为了复制）
```

和 EF Core 的关系：这一层完全透明，但解释了一个具体现象——**"我 `SaveChanges()` 成功了，为什么数据还是丢了？"** 可能是：

- `innodb_flush_log_at_trx_commit=0` + 宕机 → 丢最后 1 秒
- 或者根本没有事务（MyISAM 表）→ redo 都没写

排查方向不同，但都要先知道 redo 的存在。

==二：使用格式==

```sql
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
SHOW VARIABLES LIKE 'innodb_log_file_size';
SHOW VARIABLES LIKE 'innodb_log_files_in_group';

SHOW ENGINE INNODB STATUS\G    -- LSN 三个值对比看刷盘进度
```

==三：代码实践==

```sql
-- 观察 redo 写入量（每次事务提交都会增加）
SHOW GLOBAL STATUS LIKE 'Innodb_os_log_written';

-- 观察 undo 表空间
SELECT name, file_size FROM information_schema.innodb_tablespaces
WHERE name LIKE '%undo%';
```

==四：总结归纳==

- 三条：WAL 先把日志顺序写盘再刷脏页；redo 是物理日志、循环写、管崩溃恢复；undo 是逻辑反向操作，管回滚 + MVCC，长事务会阻止 undo 回收。
- 记忆锚：redo 是"往前重放"，undo 是"往回撤销"——一个保已提交，一个撤未提交。
- 自测：① `innodb_flush_log_at_trx_commit=0` 会丢多少数据？② 为什么 `update undo` 不能立刻删？
