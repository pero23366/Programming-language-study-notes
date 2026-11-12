# group by 优化

> 来源：P92《35. 进阶-SQL优化-group by优化》 · 档位 B 部分重叠
> 与我已知的关系：`GROUP BY` 的隐含排序行为，和 T-SQL 一致但更容易被忽略

==一：意义与概念==

`GROUP BY` 的两个性能点：

**1. 能借索引就免排序、免临时表**

```sql
-- 索引 (a, b)
SELECT a, COUNT(*) FROM t GROUP BY a;         -- ✅ 索引本身按 a 有序，直接分组
SELECT a, b, COUNT(*) FROM t GROUP BY a, b;   -- ✅ 全命中
SELECT b, COUNT(*) FROM t GROUP BY b;         -- ❌ 跳过 a，要临时表 + 排序
```

不行时 `EXPLAIN` 的 `Extra` 会出现 **`Using temporary; Using filesort`**——先建内存临时表（可能落磁盘），再排序，成本很高。

**2. `GROUP BY` 隐含 `ORDER BY`（8.0 之前的坑）**

MySQL 5.7 及之前，`GROUP BY a` 会自动按 `a` 排序。这会带来一次隐式排序开销。**8.0 起已移除这个隐式排序**，所以：

- 5.7 上如果不想排序，要加 `ORDER BY NULL`
- 8.0 上想要排序结果，必须显式写 `ORDER BY`

这个差异会让"从 5.7 迁到 8.0"的报表 SQL 输出顺序变化——**不是数据错了，是默认行为变了**。

### 优化手段

| 手段 | 做法 | 效果 |
|---|---|---|
| 建索引 | 给 `GROUP BY` 列建索引（顺序与 GROUP BY 一致）| 免临时表、免排序 |
| 先过滤 | 把 `HAVING` 里能前移的条件写成 `WHERE` | 减少分组行数 |
| 覆盖索引 | `SELECT` 只要分组列 + 聚合列 | 免回表 |
| 拆分 | 大表按时间分区后分组 | 减少单次扫描量 |

`WHERE` 与 `HAVING` 的时机在 04-04 讲过：`WHERE` 在分组前筛行（能用索引），`HAVING` 在分组后筛组（不能用索引）。所以**能放 `WHERE` 的绝不放 `HAVING`**。

和 EF Core 的关系：`.GroupBy(x => x.UserId).Select(g => new { g.Key, Count = g.Count() })` 生成的 SQL 就是 `GROUP BY UserId`。EF Core 默认翻译是正确的，但**如果你在 `Select` 里引用了非分组列，EF Core 会在客户端分组**（`AsEnumerable()` 之后），或者直接抛异常。看到 EF Core 报 `could not be translated` 时，先确认是不是分组列没写全。

==二：使用格式==

```sql
SELECT 分组列, 聚合函数 FROM 表
WHERE 行条件            -- 优先放这里
GROUP BY 分组列
HAVING 组条件
ORDER BY ...;           -- 8.0 需要显式写
```

==三：代码实践==

```sql
CREATE INDEX idx_dept ON emp(dept_id);

-- ✅ 借索引分组
EXPLAIN SELECT dept_id, COUNT(*) FROM emp GROUP BY dept_id;   -- Extra: Using index

-- ❌ 无索引 → 临时表
EXPLAIN SELECT name, COUNT(*) FROM emp GROUP BY name;         -- Using temporary; Using filesort

-- ✅ 条件前移：能放 WHERE 就别放 HAVING
SELECT dept_id, COUNT(*) FROM emp
WHERE age > 20                    -- 分组前筛，可用索引
GROUP BY dept_id
HAVING COUNT(*) > 5;              -- 分组后筛，必须留在这
```

==四：总结归纳==

- 三条：`GROUP BY` 列建索引可免临时表与排序；`WHERE` 优先于 `HAVING`；8.0 移除了 `GROUP BY` 的隐式排序。
- 记忆锚：分组要么借索引（免费的顺序），要么临时表（自己造顺序）。
- 自测：① `Extra` 出现 `Using temporary` 说明什么？② 5.7 上 `GROUP BY` 会自动排序，8.0 呢？
