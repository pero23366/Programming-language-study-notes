# update 优化（避免行锁升级为表锁）

> 来源：P95《38. 进阶-SQL优化-update优化(避免行锁升级为表锁)》 · 档位 C 全新
> 与我已知的关系：InnoDB "行锁"的名字有误导性——**它锁的是索引，不是行**。这一条是第 16 章锁的伏笔

==一：意义与概念==

先给结论，再解释：

> **InnoDB 的行锁是加在索引上的。如果 `UPDATE` 的 `WHERE` 条件用不上索引，InnoDB 只能锁住扫描过的所有行——效果等同于表锁。**

举例：

```sql
UPDATE emp SET salary = 100 WHERE name = '张三';
```

- `name` 有索引 → 只锁"张三"那一行（以及间隙），别人可以改别的行。
- `name` 没索引 → InnoDB 扫全表，**扫过的每一行都加锁**，100 万行的表就是 100 万个行锁（实际上是锁住所有行 + 间隙），其他事务全被阻塞。

这就是"行锁升级为表锁"的实际含义：**不是 InnoDB 主动升级，而是因为没有索引，它锁了全部的锁。**

### 三条优化原则

**1. `UPDATE` 的条件列必须有索引**

这是最直接的一条。检查办法：`EXPLAIN UPDATE ...`（8.0 支持对 UPDATE 做 explain）看 `type` 是不是 `ALL`。

**2. 尽量用主键或唯一索引更新**

```sql
-- 最好：主键，精确锁一行
UPDATE emp SET salary=100 WHERE id=1;

-- 次好：唯一索引，精确锁一行
UPDATE emp SET salary=100 WHERE email='a@b.com';

-- 一般：普通索引，锁命中行 + 间隙
UPDATE emp SET salary=100 WHERE dept_id=3;
```

普通索引会锁"命中行 + 间隙"（间隙锁），并发写同一范围时会互相阻塞——这是第 16 章"间隙锁与临键锁"要展开的内容。

**3. `UPDATE` 的 SET 列不要更新索引列**

```sql
-- 如果 salary 有索引，这行会：删旧索引项 + 插新索引项 + 更新聚簇索引
UPDATE emp SET salary = 200 WHERE id = 1;
```

改索引列 = 维护两棵树。高频更新的字段（如 `update_time`、`view_count`）**千万别建索引**。

### 一个常被忽略的点：`UPDATE` 的 WHERE 里出现隐式转换

```sql
UPDATE emp SET salary=100 WHERE phone = 13800138000;   -- phone 是 varchar
```

隐式转换导致索引失效 → 锁全表。这和 11-09 的失效场景是同一件事，但后果更严重：读失效只是慢，**写失效会锁库**。

和 EF Core 的关系：

```csharp
// EF Core 的 SaveChanges 是"按主键更新"——天然安全
var emp = db.Emps.Find(1);
emp.Salary = 100;
db.SaveChanges();   // UPDATE ... WHERE Id = 1  ← 锁一行

// 但 ExecuteUpdate（EF Core 7+）是什么条件就锁什么
db.Emps.Where(e => e.Name == "张三").ExecuteUpdate(s => s.SetProperty(e => e.Salary, 100));
// 如果 Name 没索引 → 锁全表
```

EF Core 7 的 `ExecuteUpdate` / `ExecuteDelete` 是批量操作的好工具（不用加载实体），但**它把"走不走索引"的责任完全交给你**。用之前先 `EXPLAIN` 一下等价 SELECT。

==二：使用格式==

```sql
UPDATE 表名 SET 列=值 WHERE 索引列 = 值;         -- 安全
EXPLAIN UPDATE 表名 SET ... WHERE ...;           -- 8.0 可查看
```

==三：代码实践==

```sql
-- 危险：name 无索引，锁全表
UPDATE emp SET salary = 100 WHERE name = '张三';

-- 先建索引
CREATE INDEX idx_name ON emp(name);
-- 现在只锁命中行
```

==四：总结归纳==

- 三条：行锁加在索引上，`WHERE` 不走索引 = 锁全表；优先用主键/唯一索引做更新条件；高频更新的列不要建索引。
- 记忆锚：InnoDB 的行锁不是"锁一行"，是"锁一棵索引树上的一个位置"——没有索引就没有位置，只能全锁。
- 自测：① `WHERE` 无索引的 `UPDATE` 会锁多少行？② 为什么"高频更新的列不要建索引"？
