# 检查选项 LOCAL

> 来源：P99《42. 进阶-视图-检查选项(local)》 · 档位 C 全新
> 与我已知的关系：LOCAL 是 CASCADED 的"放宽版"，理解它的漏检边界比记住语法更重要

==一：意义与概念==

`LOCAL` 的规则一句话：**只检查当前视图自己的 `WHERE` 条件，对下层视图"如果下层没声明检查选项，就不管它"。**

对比 CASCADED（13-02）：

| 场景 | CASCADED | LOCAL |
|---|---|---|
| v1 有 `WITH CHECK OPTION`，v2 有 | v1+v2 都查 | v1+v2 都查（下层自己要求了）|
| v1 无检查选项，v2 有 | **v1 也查** | **v1 不查** |
| v1 无，v2 无 | 不查 | 不查 |

所以 `LOCAL` 的风险场景很明确：**下层视图没写检查选项时，`LOCAL` 会让不符合下层过滤条件的行也能写进来**，结果是"插进去了，但通过视图看不到"——这正是 `WITH CHECK OPTION` 想解决的问题。

那 `LOCAL` 存在的意义是什么？

1. **跨权限边界时更合理**：v1 是 DBA 建的（不给检查选项），v2 是业务团队建的。业务团队只对自己这层负责，不想被 v1 的规则绑住。
2. **性能**：`CASCADED` 要沿着视图链逐层验证条件，链长时有额外开销。
3. **组合视图**：v2 是基于 v1 的"并集扩展"（比如 v2 想允许写更多行），这时必须用 `LOCAL`。

**实用建议：单层视图用默认的 `CASCADED` 就够了；只有明确知道"下层不该约束我"时才用 `LOCAL`。** 用 `LOCAL` 之前先问一句：下层视图为什么没加检查选项？如果答案是"忘了加"，那该修的是下层。

和 EF Core 的关系：这一篇没有 EF Core 对应点——EF Core 不管理视图的检查选项。但有一个相关影响：如果视图有 `WITH CHECK OPTION`，**任何绕过视图直接写基表的路径都不受限**（检查只在"通过视图写入"时生效）。所以它不是安全边界，只是"防手滑"。

==二：使用格式==

```sql
CREATE VIEW 视图名 AS SELECT ... WITH LOCAL CHECK OPTION;
```

==三：代码实践==

```sql
-- 下层：不声明检查
CREATE VIEW v1 AS SELECT * FROM emp WHERE dept_id = 1;

-- 上层：LOCAL 只查自己
CREATE VIEW v2 AS
SELECT * FROM v1 WHERE salary > 5000
WITH LOCAL CHECK OPTION;

-- 能插入（v2 只看 salary>5000，不管 v1 的 dept_id）
INSERT INTO v2 (name, dept_id, salary) VALUES ('李四', 2, 8000);   -- 成功

-- 但查不到 —— 这就是 LOCAL 的漏检
SELECT * FROM v2 WHERE name = '李四';   -- 空
```

==四：总结归纳==

- 三条：`LOCAL` 只查本层条件；下层没声明检查选项时不检查；只在"明确不想被下层约束"时才用。
- 记忆锚：`CASCADED` 是"连坐"，`LOCAL` 是"各管一段"。
- 自测：① v1 有检查选项、v2 用 LOCAL，插入时会检查 v1 吗？② 什么情况下 `LOCAL` 会留下"写了看不见"的数据？
