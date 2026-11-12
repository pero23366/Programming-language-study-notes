# limit 优化（深分页）

> 来源：P93《36. 进阶-SQL优化-limit优化》 · 档位 C 全新
> 与我已知的关系：EF Core 的 `.Skip(100000).Take(10)` 生成的就是这种 SQL，**这是最容易在线上爆的一种慢查询**

==一：意义与概念==

痛点：

```sql
SELECT * FROM emp ORDER BY id LIMIT 1000000, 10;
```

你说"只要 10 行"，实际 MySQL 要：**扫描 100 万零 10 行 → 丢弃前 100 万 → 返回 10 行**。如果还带 `ORDER BY` 走不了索引，那就先把 100 万行排序一遍。

这就是**深分页问题**：越往后翻越慢，第 1 页 10ms，第 10 万页 10 秒。

### 三个解法

**解法一：延迟关联（覆盖索引 + 回表只做最后一层）**

```sql
-- 原始：100 万行都要回表
SELECT * FROM emp ORDER BY id LIMIT 1000000, 10;

-- 优化：子查询只取主键（覆盖索引，不回表）
SELECT e.* FROM emp e
JOIN (SELECT id FROM emp ORDER BY id LIMIT 1000000, 10) t ON e.id = t.id;
```

原理：`SELECT id FROM emp ORDER BY id` 走聚簇索引/覆盖索引，扫描但**不回表**，只对最后 10 个 id 回表。IO 从"100 万次随机"降到"100 万次顺序 + 10 次随机"。

注意：**只有在 `ORDER BY` 的列有索引时才有效**。如果 `ORDER BY create_time`（无索引），子查询自己就要 filesort，优化有限。

**解法二：游标分页 / 键集分页（推荐，彻底解决）**

```sql
-- 不用 OFFSET，用"上一页最后一个 id"
SELECT * FROM emp WHERE id > 1000000 ORDER BY id LIMIT 10;
```

原理：`WHERE id > 上次的最大值` 直接走索引定位到起点，**不扫描前面 100 万行**。任何页码都是 O(1) 定位 + 10 行。

代价：**只能"下一页"，不能跳到第 N 页**。而且要保证排序键唯一稳定（用 `(create_time, id)` 组合排序）。

**解法三：业务方案**

- 限制最大页数（"最多翻到 500 页"，主流产品都这么干）
- 改用"加载更多"而不是页码
- 导出/报表走单独的只读库或离线任务

### 顺带一条：`LIMIT` 与 `ORDER BY` 的配合

`LIMIT` 本身很快（截取而已），慢的是"为了找到第 N 行而扫描"。所以**优化 `LIMIT` 就是优化它前面的扫描与排序**，这也是为什么 12-03 的 `order by` 优化是深分页的前置条件。

和 EF Core 的关系：

```csharp
// 危险：深分页
var page = db.Orders.OrderBy(o => o.Id).Skip(1000000).Take(10).ToList();

// 好：键集分页
var page = db.Orders.Where(o => o.Id > lastId).OrderBy(o => o.Id).Take(10).ToList();
```

EF Core 没有"自动优化深分页"的能力，`Skip` 会原样翻译成 `OFFSET`。所以**分页接口设计阶段就要决定用页码还是游标**——后期改接口成本很高。

==二：使用格式==

```sql
-- 深分页：延迟关联
SELECT e.* FROM 表 e
JOIN (SELECT 主键 FROM 表 ORDER BY 排序列 LIMIT 偏移, 条数) t ON e.主键 = t.主键;

-- 键集分页
SELECT * FROM 表 WHERE 排序列 > 上次最后值 ORDER BY 排序列 LIMIT 条数;
```

==三：代码实践==

```sql
-- 对比执行时间（100 万行表）
SELECT * FROM emp ORDER BY id LIMIT 1000000, 10;                    -- 约 1.2s

SELECT e.* FROM emp e
JOIN (SELECT id FROM emp ORDER BY id LIMIT 1000000, 10) t ON e.id=t.id;  -- 约 0.3s

SELECT * FROM emp WHERE id > 1000000 ORDER BY id LIMIT 10;          -- 约 0.001s
```

==四：总结归纳==

- 三条：深分页慢的本质是"扫了再丢"；延迟关联把回表压到最后 10 行；键集分页彻底解决但只能顺序翻页。
- 记忆锚：`LIMIT 1000000,10` 不是"跳到第 100 万行"，是"数到第 100 万行"。
- 自测：① 延迟关联为什么能提速？② 键集分页的代价是什么？
