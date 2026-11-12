# EXPlAIN 执行计划

> 来源：P78《21. 进阶-索引-性能分析-explain》 · 档位 C 全新
> 与我已知的关系：这是 MySQL 版的"执行计划窗口"（SSMS 里的图形化执行计划），但**字段含义完全不同，必须逐个记**

==一：意义与概念==

痛点：一条 SQL 慢，你猜是"没索引"，改成"索引用错了"，其实真正原因可能是"索引走了但回表 50 万次"。`EXPLAIN` 告诉你**优化器到底怎么执行**，不用猜。

它输出的是"计划"，不是"实际执行"（要实际耗时用 `EXPLAIN ANALYZE`，8.0.18+）。

十二个字段里，**只有六个真正影响判断**，其余是噪音：

| 字段 | 看什么 | 好 / 坏 |
|---|---|---|
| `type` | **访问类型，最重要** | 至少要到 `range`，`ALL` 是灾难 |
| `key` | 实际用了哪个索引 | `NULL` = 没用索引 |
| `key_len` | 用了索引的多少字节 | 联合索引用了几列、有没有被截断 |
| `rows` | 预估扫描行数 | 越小越好，接近全表行数就是有问题 |
| `filtered` | 扫出来的行有多少比例有效 | 低于 10% 说明索引选择性差 |
| `Extra` | 补充信息 | `Using filesort` / `Using temporary` 是警报 |

### type 的七个档位（从好到坏，必须背）

| type | 含义 | 触发条件 | 评价 |
|---|---|---|---|
| `system` | 表只有 1 行 | 系统表 | 最好 |
| `const` | 主键/唯一索引等值查，最多 1 行 | `WHERE id = 1` | 极好 |
| `eq_ref` | 联表时被驱动表用主键/唯一索引 | `JOIN ... ON a.id = b.id` | 极好 |
| `ref` | 普通索引等值查 | `WHERE name = '张三'`（name 有普通索引）| 好 |
| `range` | 索引范围扫描 | `WHERE id > 10`、`BETWEEN`、`IN` | 可接受（分页常见）|
| `index` | **全索引扫描**（扫整棵索引树）| 覆盖索引但无过滤条件 | 差（等于遍历全部索引）|
| `ALL` | **全表扫描** | 无可用索引 | 最差，必须优化 |

记住一句话：**`type = ALL` 且 `rows` 很大 = 这条 SQL 要出事。**

### Extra 里三个警报

| Extra 值 | 含义 | 该怎么办 |
|---|---|---|
| `Using filesort` | 无法用索引排序，额外做了排序（可能在内存也可能落磁盘）| 给 `ORDER BY` 的列建索引，且顺序与 `ORDER BY` 一致 |
| `Using temporary` | 用了临时表（`GROUP BY`、`DISTINCT`、`UNION` 常见）| 给 `GROUP BY` 列建索引 |
| `Using index` | ✅ **好**：覆盖索引，不用回表 | 这就是你要的结果 |

另外两个中性值：`Using where`（在引擎层过滤后再由服务层筛，正常）、`Using index condition`（用了索引下推 ICP，5.6+ 的优化，是好现象）。

和 EF Core 的关系：`.ToQueryString()` 拿到 SQL → 贴到客户端 → `EXPLAIN`。**这是排查 EF Core 慢查询的标准三步**。特别注意 `type=ALL` 时不要怀疑 EF Core，是 LINQ 里的 `Where` 字段没有索引，或者用了函数导致索引失效（`x.Name.ToLower() == "abc"` 会变成 `LOWER(name)='abc'`，索引直接废掉）。

常见误解：以为 `key` 有值就说明优化到位。**`key` 有值但 `type=index` 是最隐蔽的坑**——它扫了整棵索引树，看起来"用了索引"，实际和全表扫差不多。

==二：使用格式==

```sql
EXPLAIN SELECT ...;
EXPLAIN FORMAT=JSON SELECT ...;        -- 更详细，含成本估算
EXPLAIN ANALYZE SELECT ...;            -- 8.0.18+，真实执行并给出实际耗时
```

==三：代码实践==

```sql
-- 建表：只有主键
CREATE TABLE emp (id INT PRIMARY KEY, name VARCHAR(20), age INT, dept_id INT);
-- 插入 100 万行...

EXPLAIN SELECT * FROM emp WHERE name = '张三';
-- type=ALL, key=NULL, rows≈1000000, Extra=Using where   ← 必须优化

CREATE INDEX idx_name ON emp(name);
EXPLAIN SELECT * FROM emp WHERE name = '张三';
-- type=ref, key=idx_name, rows=1, Extra=NULL            ← 好了

-- 再看联合索引的 key_len（name varchar(20) utf8mb4 = 20*4+1+2 = 83）
EXPLAIN SELECT * FROM emp WHERE name='张三' AND age=25;
-- 若 key_len=83 说明只用了 name 一列；若 =88 说明两列都用上了
```

==四：总结归纳==

- 三条：先看 `type`（`ALL` 必须改）、再看 `key`/`rows`、最后看 `Extra` 有没有 `filesort`/`temporary`。
- 记忆锚：`type` 是"怎么找"，`rows` 是"找了多少"，`Extra` 是"找完还干了什么额外活"。
- 自测：① `type=index` 是不是好现象？② `Extra=Using filesort` 说明什么，怎么修？
