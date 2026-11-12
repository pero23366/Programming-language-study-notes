# order by 优化

> 来源：P91《34. 进阶-SQL优化-order by优化》 · 档位 C 全新
> 与我已知的关系：`Extra: Using filesort` 是最常见的性能警报，这一篇讲清"怎么让它消失"

==一：意义与概念==

排序两种实现，性能差一个数量级：

| 方式 | 怎么做的 | `Extra` 显示 | 代价 |
|---|---|---|---|
| **索引排序**（好）| 索引本身有序，顺着叶子链表读即可 | `Using index`（或空）| 无额外开销 |
| **filesort**（坏）| 把行取出来，在内存/磁盘排序 | **`Using filesort`** | CPU + 可能落磁盘 |

名字叫 filesort 但**不一定用文件**——数据量小的时候在内存排（`sort_buffer_size` 内），大了才落磁盘归并。所以"看到 filesort 不一定慢"，但**一定无法避免额外开销**。

### 两条规则（决定能不能用索引排序）

**规则一：`ORDER BY` 的列顺序必须与索引列顺序一致，且方向一致**

```sql
-- 索引 (a, b)
ORDER BY a, b          -- ✅ 索引有序
ORDER BY a DESC, b DESC -- ✅ 8.0 支持降序索引，方向一致即可
ORDER BY b, a          -- ❌ 顺序不符
ORDER BY a ASC, b DESC -- ❌ 方向不一致（8.0 有降序索引时可以，但要建 (a ASC, b DESC)）
```

**规则二：`WHERE` 的条件必须是索引的"最左前缀"（等值），否则排序用不上索引**

```sql
-- 索引 (a, b, c)
WHERE a=1 ORDER BY b, c        -- ✅ a 等值 → b,c 在索引内有序
WHERE a>1 ORDER BY b, c        -- ❌ a 是范围 → a 相同块内才有序，整体乱
WHERE b=1 ORDER BY c           -- ❌ 跳过最左列 a
```

这条最容易忽略：**范围条件会破坏后续列的索引有序性**。所以 `WHERE a>1 ORDER BY b` 必然 filesort。

### 两种 filesort 算法（了解即可）

- **全字段排序**：把 SELECT 的所有列都放进 sort buffer 排。内存够就快，不够就落磁盘。
- **rowid 排序**：只把"排序列 + 主键"放 buffer，排完再按主键回表取整行。省内存，但多一轮回表。

MySQL 用 `max_length_for_sort_data` 决定用哪种（8.0.20 起该参数废弃，改为自适应）。

和 EF Core 的关系：`.OrderBy(o => o.CreatedAt)` 生成 `ORDER BY CreatedAt`，能否免 filesort 取决于**索引**。典型陷阱：

```csharp
// 索引 (UserId, CreatedAt)
db.Orders.Where(o => o.UserId == 1).OrderByDescending(o => o.CreatedAt)  // ✅ 免排序
db.Orders.Where(o => o.UserId > 1).OrderByDescending(o => o.CreatedAt)   // ❌ 范围 → filesort
db.Orders.Where(o => o.Status == 1).OrderByDescending(o => o.CreatedAt)  // ❌ 跳列 → filesort
```

**分页场景要特别注意**：`ORDER BY` 走不了索引 + `LIMIT 100000, 10` = 把 10 万行全排序再丢掉前面。这是深分页慢的双重原因（12-05）。

==二：使用格式==

```sql
EXPLAIN SELECT * FROM t WHERE a=1 ORDER BY b, c;   -- 看 Extra 是否 Using filesort
```

==三：代码实践==

```sql
CREATE INDEX idx_abc ON t(a, b, c);

-- ✅ 索引排序
EXPLAIN SELECT * FROM t WHERE a=1 ORDER BY b, c;        -- Extra 无 filesort
-- ❌ 范围破坏有序性
EXPLAIN SELECT * FROM t WHERE a>1 ORDER BY b, c;        -- Extra: Using filesort
-- ❌ 方向混用（未建降序索引）
EXPLAIN SELECT * FROM t WHERE a=1 ORDER BY b ASC, c DESC;  -- Using filesort
-- ✅ 覆盖索引 + 排序都免
EXPLAIN SELECT a, b, c FROM t WHERE a=1 ORDER BY b, c;  -- Extra: Using index
```

==四：总结归纳==

- 三条：`ORDER BY` 列顺序与方向都要跟索引一致；`WHERE` 必须是最左前缀等值才能借索引排序；范围条件一定导致 filesort。
- 记忆锚：索引是"已经排好序的书架"，`ORDER BY` 想免排序，就得让书架的顺序刚好等于你要的顺序。
- 自测：① `WHERE a>1 ORDER BY b`（索引 `(a,b)`）会 filesort 吗？为什么？② `ORDER BY a DESC, b ASC` 能用索引吗？
