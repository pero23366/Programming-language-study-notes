# MVCC：ReadView 与 RC/RR 的差异

> 来源：P144–P146《87–89. 进阶-InnoDB引擎-MVCC-readview介绍 / 原理分析(RC级别) / 原理分析(RR级别)》 · 档位 C 全新
> 与我已知的关系：这一篇回答"为什么同一份 MVCC 机制，RC 会不可重复读、RR 不会"——差别只在 **ReadView 生成时机**

==一：意义与概念==

### ReadView 里有什么

ReadView 是"事务在某个时刻拍的快照边界"，四个关键字段：

| 字段 | 含义 |
|---|---|
| `m_ids` | 生成 ReadView 时**所有活跃（未提交）事务 ID 的列表** |
| `min_trx_id` | `m_ids` 里的最小值 |
| `max_trx_id` | 生成时**下一个将要分配的事务 ID**（即当前最大 +1）|
| `creator_trx_id` | 自己（生成 ReadView 的这个事务）|

### 可见性判断（四步，按顺序）

拿到一行的 `DB_TRX_ID`（记作 `trx_id`），逐条判断：

1. `trx_id == creator_trx_id` → **可见**（自己改的，当然看得到）
2. `trx_id < min_trx_id` → **可见**（这个事务在我生成快照前就提交了）
3. `trx_id >= max_trx_id` → **不可见**（这个事务在我之后才开始）
4. `min_trx_id <= trx_id < max_trx_id` → 看 `m_ids`：
   - 在 `m_ids` 里 → **不可见**（还是活跃的，没提交）
   - 不在 `m_ids` 里 → **可见**（已经提交了）

不可见就顺着 `DB_ROLL_PTR` 找上一个版本，重复判断，直到找到可见版本或链尾。

### RC 与 RR 的唯一差别：ReadView 生成时机

| 隔离级别 | ReadView 何时生成 | 结果 |
|---|---|---|
| **RC**（读已提交）| **每次 `SELECT` 都生成新的** | 每次都能看到别人新提交的数据 → **不可重复读** |
| **RR**（可重复读）| **事务里第一次 `SELECT` 时生成，之后复用** | 整个事务看到同一份快照 → **可重复读** |

这就是 09-04 那张表的机制解释。同一套 MVCC，只改"什么时候拍快照"，行为就完全不同。

### 那 RR 怎么防幻读？

**快照读**情况下，RR 天然看不到新插入的行（因为快照固定）——所以"读"不会幻读。
**当前读**（`FOR UPDATE`）情况下，靠**临键锁**（16-06）挡住插入。

两者配合，RR 就基本没有幻读。而 RC 没有间隙锁，当前读会幻读。

### 一个细节：RR 下"第一次 SELECT"才生成 ReadView

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
-- 此时还没生成 ReadView
UPDATE emp SET salary = 1 WHERE id = 1;   -- 先做了写（当前读）
SELECT * FROM emp WHERE id = 1;           -- 这里才生成 ReadView
```

所以"事务开始时间"和"快照时间"可能不同。这是 RR 与"标准可重复读"的一个细微差别（MySQL 的 RR 实际是"快照读可重复读"）。

和 EF Core 的关系：`DbContext` 默认不开显式事务，每条 `SaveChanges` 是独立事务。所以：

- 你在一个请求里先 `.ToList()` 再 `.SaveChanges()`，这两步之间用的可能是不同的快照/事务。
- 要保证"读到的和改的是同一个快照"，必须显式 `BeginTransaction()`。

**这解释了一个常见困惑："我明明先查了没超卖，怎么还是超了"** —— 查询和更新不在同一个事务/快照里。

==二：使用格式==

```sql
-- 看当前隔离级别
SELECT @@transaction_isolation;

-- 切换级别验证行为差异
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

==三：代码实践==

```sql
-- RC 下：不可重复读
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT salary FROM emp WHERE id=1;   -- 1000（生成 ReadView A）

-- 另一个会话：UPDATE ... ; COMMIT;

SELECT salary FROM emp WHERE id=1;   -- 2000（生成 ReadView B，看到新提交）
COMMIT;

-- RR 下：可重复读
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT salary FROM emp WHERE id=1;   -- 1000（生成 ReadView，之后复用）

-- 另一个会话：UPDATE ... ; COMMIT;

SELECT salary FROM emp WHERE id=1;   -- 仍是 1000
COMMIT;
```

==四：总结归纳==

- 三条：ReadView 有四个字段（`m_ids`/`min_trx_id`/`max_trx_id`/`creator_trx_id`）；RC 每次 `SELECT` 生成、RR 只在首次生成；RR 防幻读靠"快照固定 + 临键锁"。
- 记忆锚：ReadView 是"拍照时间戳"——RC 每读一次重拍，RR 只拍一次。
- 自测：① RC 与 RR 在实现上的唯一差别是什么？② RR 下"快照读"和"当前读"分别靠什么防幻读？
