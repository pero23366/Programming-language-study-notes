# count 优化

> 来源：P94《37. 进阶-SQL优化-count优化》 · 档位 C 全新
> 与我已知的关系：`COUNT(*)` 为什么慢、该选哪种写法，这一篇给的是"引擎层怎么数行"的答案

==一：意义与概念==

首先纠正一个常见误解：**`COUNT(*)` 不比 `COUNT(1)` 慢**。MySQL 优化器对两者的处理完全一样。

四种写法的真实差异：

| 写法 | 语义 | InnoDB 下的行为 |
|---|---|---|
| `COUNT(*)` | 数行数 | 选**最小的索引**遍历（通常是二级索引），不取值 |
| `COUNT(1)` | 数行数 | 同上，等价 |
| `COUNT(主键)` | 数非 NULL 主键 = 行数 | 遍历聚簇索引，**比 `COUNT(*)` 慢**（聚簇索引页更大）|
| `COUNT(列)` | 数该列非 NULL 的行 | 遍历该列索引，要判断 NULL，且若列无索引要回表 |

**结论：`COUNT(*)` 或 `COUNT(1)` 最快，别写 `COUNT(列)` 除非你确实想排除 NULL。**

### 为什么 InnoDB 的 `COUNT(*)` 慢

MyISAM 维护了一个"行数"计数器，`COUNT(*)` 直接读——O(1)。
**InnoDB 不行**，因为 MVCC：不同事务看到的行数可能不同（有未提交的插入/删除），所以**必须实时遍历统计**。

8.0 有一个优化：`information_schema.tables` 里的 `TABLE_ROWS` 是估算值，但如果表结构简单，`COUNT(*)` 会选"最小的那个二级索引"来遍历（索引页比数据页小，扫的页更少）。

### 怎么优化

| 场景 | 方案 |
|---|---|
| 需要精确总数 + 分页 | 单独 `COUNT(*)`，加缓存（Redis）或计数表 |
| 只要"有没有" | `SELECT EXISTS(SELECT 1 FROM t WHERE ...)` 或 `LIMIT 1`，比 `COUNT` 快得多 |
| 大致数量够用 | `SHOW TABLE STATUS` 的 `Rows` 估算值（误差可能 30%+）|
| 超大表分页 | 用"是否有下一页"代替总数（`LIMIT n+1` 判断）|

**分页的总数问题**是最实际的：`SELECT COUNT(*)` 在千万行表上要 1 秒以上，用户每翻一页都查一次就是灾难。主流做法是**只查一次总数 + 缓存**，或干脆不显示总数。

和 EF Core 的关系：

```csharp
// 危险：每次分页都 count
var total = db.Orders.Count();
var list = db.Orders.Skip(skip).Take(size).ToList();

// 好：不显示总数，用"取 n+1 条判断有没有下一页"
var list = db.Orders.OrderBy(o => o.Id).Skip(skip).Take(size + 1).ToList();
bool hasMore = list.Count > size;
```

EF Core 的 `.Count()` 生成 `SELECT COUNT(*)`，没有更聪明的做法。**"要不要显示总数"是产品决策，不是技术决策** —— 但很多人是在发现接口慢了以后才回头改产品。

==二：使用格式==

```sql
SELECT COUNT(*) FROM t [WHERE ...];      -- 推荐
SELECT COUNT(1)  FROM t [WHERE ...];     -- 等价
SELECT EXISTS(SELECT 1 FROM t WHERE ...); -- 只判断存在
SHOW TABLE STATUS LIKE 't';               -- 估算行数（Rows 列）
```

==三：代码实践==

```sql
-- 三种写法的执行计划对比（表有二级索引 idx_name）
EXPLAIN SELECT COUNT(*) FROM emp;        -- key=idx_name（选最小索引）
EXPLAIN SELECT COUNT(1) FROM emp;        -- key=idx_name
EXPLAIN SELECT COUNT(id) FROM emp;       -- key=PRIMARY（扫聚簇索引，页更大）
EXPLAIN SELECT COUNT(name) FROM emp;     -- key=idx_name（但多了 NULL 判断）
```

==四：总结归纳==

- 三条：`COUNT(*)` = `COUNT(1)`，都最快；InnoDB 因 MVCC 必须实时遍历，没有 MyISAM 那种 O(1)；分页总数要缓存或用"是否有下一页"替代。
- 记忆锚：InnoDB 数行像"数书架上的书"——每本书可能正被别人拿着（未提交），只能一本本数。
- 自测：① `COUNT(*)` 和 `COUNT(主键)` 哪个快？为什么？② 为什么 MyISAM 的 `COUNT(*)` 是 O(1)？
