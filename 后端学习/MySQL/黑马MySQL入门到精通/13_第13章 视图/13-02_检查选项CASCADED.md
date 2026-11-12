# 检查选项 CASCADED

> 来源：P98《41. 进阶-视图-检查选项(cascaded)》 · 档位 C 全新
> 与我已知的关系：SQL Server 的 `WITH CHECK OPTION` 同名同义，但 MySQL 的 CASCADED/LOCAL 两级语义更明确

==一：意义与概念==

痛点：视图 `v_emp_sales` 定义成"只看销售部员工"：

```sql
CREATE VIEW v_emp_sales AS SELECT * FROM emp WHERE dept_id = 1;
```

然后你往里插一条 `dept_id = 2` 的记录——**插入成功了，但通过视图查不到它**。数据"从视图里消失了"，非常反直觉。

`WITH CHECK OPTION` 就是拦住这种事：**通过视图写入的行，必须满足视图的定义条件，否则报错**。

```sql
CREATE VIEW v_emp_sales AS
SELECT * FROM emp WHERE dept_id = 1
WITH CHECK OPTION;
-- 现在插 dept_id=2 会报错 1369: CHECK OPTION failed
```

### CASCADED 与 LOCAL 的区别

差别只在**视图嵌套**时。假设：

```
v1: SELECT * FROM emp WHERE dept_id = 1
v2: SELECT * FROM v1 WHERE salary > 5000    ← 基于视图再建视图
```

| 选项 | 写在 v2 上时，检查哪些条件 |
|---|---|
| `CASCADED`（默认）| **v2 的条件 + 所有下层视图（v1）的条件** → 必须 `dept_id=1` 且 `salary>5000` |
| `LOCAL` | **只检查 v2 自己的条件**，下层视图若没写 `WITH CHECK OPTION` 则不检查 |

所以 `LOCAL` 是"松散版"：它只保证"写进来的你能看见"，不保证"满足所有上层视图的过滤"。而 `CASCADED` 是"严格版"：保证"满足整条视图链的所有条件"。

**默认是 `CASCADED`**，这也是更安全的选择。`WITH CHECK OPTION` 不写 `CASCADED/LOCAL` 时就是 `CASCADED`。

### 什么时候需要它

- 多租户系统：视图按 `tenant_id` 过滤，写入必须带同一租户 → 防越权。
- 分表/归档：视图只暴露"未删除"的数据，写入不允许写已删除状态。
- 权限受限的视图：给外部用户只读某个子集，且禁止他们通过视图插入越界数据。

和 EF Core 的关系：EF Core 映射视图时**不会自动加 `WITH CHECK OPTION`**，而且 `HasNoKey()` 的实体本来就不能写。所以这个特性主要在"手写 SQL 或存储过程写视图"时用到。但如果你的团队用视图做多租户隔离，**一定要加 `WITH CHECK OPTION`**，否则"插入成功但查不到"的 bug 会非常难查。

==二：使用格式==

```sql
CREATE VIEW 视图名 AS SELECT ... [WITH [CASCADED|LOCAL] CHECK OPTION];
```

==三：代码实践==

```sql
-- 底层视图：不加检查
CREATE VIEW v1 AS SELECT * FROM emp WHERE dept_id = 1;

-- 上层视图：CASCADED（默认），两层条件都检查
CREATE VIEW v2 AS
SELECT * FROM v1 WHERE salary > 5000
WITH CASCADED CHECK OPTION;

-- 插入 dept_id=1, salary=3000 → 报错（不满足 v2 的 salary>5000）
-- 插入 dept_id=2, salary=8000 → 报错（不满足 v1 的 dept_id=1）
INSERT INTO v2 (name, dept_id, salary) VALUES ('张三', 2, 8000);   -- 1369

-- 改成 LOCAL：只查 v2 自己的条件
CREATE OR REPLACE VIEW v2 AS
SELECT * FROM v1 WHERE salary > 5000
WITH LOCAL CHECK OPTION;
-- 插入 dept_id=2, salary=8000 → 成功！（v1 没写检查选项，不被检查）
-- 但通过 v2 查不到这条 → 又回到了"写了看不见"的状态
```

==四：总结归纳==

- 三条：`WITH CHECK OPTION` 保证"通过视图写入的行，能从视图查到"；`CASCADED`（默认）检查整条视图链；`LOCAL` 只查本层。
- 记忆锚：`CASCADED` 是"祖上三代都要审"，`LOCAL` 是"只管我自己这一关"。
- 自测：① 不写 `CASCADED/LOCAL` 时默认是哪个？② `LOCAL` 在什么情况下会漏检？
