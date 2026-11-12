# 流程控制：IF 与 CASE

> 来源：P107, P109《50. 进阶-存储过程-if判断 / 52. 进阶-存储过程-case》 · 档位 B 部分重叠
> 与我已知的关系：`IF` 在 T-SQL 里是"语句后跟 BEGIN...END"，MySQL 必须 `END IF` 收尾——**少写一个 END 是高频错误**

==一：意义与概念==

存储过程里的条件分支，两种写法：

**IF**（区间判断、多条件）和 **CASE**（等值/多分支映射）。

与 T-SQL 的差异集中在语法外壳，语义完全一样：

| | MySQL | T-SQL |
|---|---|---|
| IF 结构 | `IF 条件 THEN ... ELSEIF 条件 THEN ... ELSE ... END IF;` | `IF 条件 BEGIN ... END ELSE IF ...` |
| 必要条件 | **`END IF` 必须有** | 无（用 `BEGIN...END` 包语句）|
| ELSE IF 写法 | `ELSEIF`（一个词）| `ELSE IF`（两个词）|
| CASE | `CASE ... WHEN ... THEN ... END CASE;` | `CASE ... WHEN ... END`（无 END CASE）|

**`ELSEIF` 是一个词**，写成 `ELSE IF` 会报语法错——这是 MySQL 特有的坑（T-SQL 恰好反过来）。

`CASE` 在存储过程里是**语句**（要 `END CASE`），在普通 SQL 里是**表达式**（只要 `END`）。同一个关键字，两种用法，收尾不一样：

```sql
-- SQL 里（表达式）：END 就够
SELECT CASE WHEN score>=60 THEN '及格' ELSE '不及格' END FROM exam;

-- 过程里（语句）：必须 END CASE
CASE WHEN score>=60 THEN SET v='及格';
     ELSE SET v='不及格';
END CASE;
```

**IF 与 CASE 怎么选**：区间判断（`>= 90`、`BETWEEN`）用 `IF`；等值映射（状态码转文字）用 `CASE`。`CASE` 在 SQL 表达式里能用于 `SELECT` 列，`IF` 不能——这是 `CASE` 更大的价值所在。

和 EF Core 的关系：这两个结构对应你在 C# 里写的 `if/else`、`switch`。EF Core 的 LINQ 里 `(cond ? a : b)` 会翻译成 `CASE WHEN`，`.Contains(...)` 有时也翻译成 `CASE`。所以**只要你在 LINQ 里用了三元运算符，生成的 SQL 里就有 `CASE WHEN`** ——知道这一点，看到 `EXPLAIN` 里出现 `CASE` 就不会慌。

==二：使用格式==

```sql
-- IF
IF 条件 THEN
  语句;
ELSEIF 条件 THEN
  语句;
ELSE
  语句;
END IF;

-- CASE（语句形式）
CASE
  WHEN 条件 THEN 语句;
  WHEN 条件 THEN 语句;
  ELSE 语句;
END CASE;

-- CASE（简单形式，等值）
CASE 变量
  WHEN 值 THEN 语句;
  ELSE 语句;
END CASE;
```

==三：代码实践==

```sql
DELIMITER $$
CREATE PROCEDURE p_grade(IN p_score INT, OUT p_level VARCHAR(10))
BEGIN
  IF p_score >= 90 THEN
    SET p_level = '优秀';
  ELSEIF p_score >= 60 THEN
    SET p_level = '及格';
  ELSE
    SET p_level = '不及格';
  END IF;
END $$
DELIMITER ;

CALL p_grade(85, @lv);
SELECT @lv;      -- 及格
```

```sql
-- 等值映射用 CASE 更清楚
DELIMITER $$
CREATE PROCEDURE p_status_text(IN p_status INT, OUT p_text VARCHAR(10))
BEGIN
  CASE p_status
    WHEN 1 THEN SET p_text = '待付款';
    WHEN 2 THEN SET p_text = '已发货';
    ELSE SET p_text = '未知';
  END CASE;
END $$
DELIMITER ;
```

==四：总结归纳==

- 三条：`IF` 必须以 `END IF` 收尾；`ELSEIF` 是一个词；过程里的 `CASE` 是语句，要 `END CASE`。
- 记忆锚：T-SQL 用 `BEGIN...END` 包语句，MySQL 用"首尾呼应的关键字"（`IF/END IF`、`CASE/END CASE`）。
- 自测：① `ELSE IF`（带空格）在 MySQL 能编译吗？② SQL 表达式里的 `CASE` 和过程里的 `CASE` 收尾有什么不同？
