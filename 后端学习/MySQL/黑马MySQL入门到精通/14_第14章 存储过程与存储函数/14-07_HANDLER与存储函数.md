# 条件处理程序 HANDLER 与存储函数

> 来源：P114–P115《57–58. 进阶-存储过程-条件处理程序-handler / 存储函数》 · 档位 C 全新
> 与我已知的关系：handler 就是数据库侧的 `try/catch`；存储函数则是"能在 SQL 里用的自定义函数"

==一：意义与概念==

### HANDLER：数据库里的 try/catch

```sql
DECLARE {CONTINUE | EXIT | UNDO} HANDLER
  FOR {SQLSTATE '状态码' | 错误码 | SQLWARNING | NOT FOUND | SQLEXCEPTION}
  语句;
```

三个要素：

| 要素 | 取值 | 含义 |
|---|---|---|
| **动作** | `CONTINUE` | 执行完 handler 里的语句后，**继续**执行出错语句的下一条 |
| | `EXIT` | 执行完 handler 后，**退出**当前 `BEGIN...END` 块 |
| | `UNDO` | MySQL **不支持**（写了报错）|
| **条件类型** | `SQLSTATE '02000'` | 具体的状态码 |
| | 错误码（如 `1062`）| 重复键 |
| | `NOT FOUND` | 等价 `SQLSTATE '02000'`，**游标读完就是它** |
| | `SQLWARNING` | 所有 `01` 开头的警告 |
| | `SQLEXCEPTION` | 所有非 `00`/`01` 的错误 |

最常用的是这一行（配合游标）：

```sql
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
```

意思：**"没有更多数据"这个情况出现了，就执行 `SET done=1` 然后继续往下走**，不报错。

另一个常见用法是"插入冲突时改成更新"：

```sql
DECLARE CONTINUE HANDLER FOR 1062
BEGIN
  -- 重复键：改成 UPDATE
END;
```

注意 `EXIT` 与 `CONTINUE` 的区别：`CONTINUE` 是"我知道出错了，处理完继续"，`EXIT` 是"出错了，整个块就此结束"（但**不会回滚**，除非外面有事务）。

### 存储函数：能在 SELECT 里用的自定义函数

```sql
SELECT name, f_bonus(salary, years) FROM emp;   -- 像内置函数一样用
```

与存储过程的关键区别：

| | 存储过程 | 存储函数 |
|---|---|---|
| 调用方式 | `CALL p(...)` | 在 SQL 表达式里 `f(...)` |
| 返回值 | `OUT` 参数 / 结果集 | **必须有且只有一个 `RETURN 值`** |
| 参数 | `IN/OUT/INOUT` | **只有 IN**（默认就是 IN）|
| 能否在 SELECT 中用 | ❌ | ✅ |
| 能否有事务控制 | ✅ | ❌（不能 `COMMIT`）|
| 创建限制 | 无 | **必须开 `log_bin_trust_function_creators`**（开了 binlog 时）|

最后一条是实际会卡住你的：报错

```
ERROR 1418: This function has none of DETERMINISTIC, NO SQL, or READS SQL DATA in its declaration
```

解法二选一：

```sql
SET GLOBAL log_bin_trust_function_creators = 1;   -- 信任创建者
-- 或在定义时声明特性
CREATE FUNCTION f(...) RETURNS INT DETERMINISTIC READS SQL DATA ...
```

**性能警告**：存储函数在 `SELECT` 里是**逐行调用**的。100 万行结果集 = 100 万次函数调用。所以"用函数做格式化"在 SQL 里很贵，**能放应用层就放应用层**。

和 EF Core 的关系：EF Core 可以把存储函数映射成方法：

```csharp
modelBuilder.HasDbFunction(typeof(MyDb).GetMethod(nameof(FBonus)))
    .HasName("f_bonus");
```

但同样的问题：逐行调用、调试困难、迁移不受控。**绝大多数情况下，在 C# 里算比在数据库里算更好维护**——除非数据量太大不能拉到内存。

==二：使用格式==

```sql
-- HANDLER
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
DECLARE EXIT     HANDLER FOR SQLEXCEPTION BEGIN ... END;

-- 存储函数
CREATE FUNCTION 函数名(参数 类型, ...) RETURNS 返回类型
  [DETERMINISTIC | READS SQL DATA | NO SQL]
  [COMMENT '...']
BEGIN
  ...
  RETURN 值;
END;
```

==三：代码实践==

```sql
DELIMITER $$
CREATE FUNCTION f_bonus(p_salary DECIMAL(10,2), p_years INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
  DECLARE v DECIMAL(10,2);
  IF p_years >= 5 THEN SET v = p_salary * 0.2;
  ELSE SET v = p_salary * 0.1;
  END IF;
  RETURN v;
END $$
DELIMITER ;

SELECT name, salary, f_bonus(salary, years) AS 奖金 FROM emp;
```

==四：总结归纳==

- 三条：handler 三个动作（`CONTINUE`/`EXIT`，`UNDO` 不支持）；`NOT FOUND` 是游标读完的信号；存储函数必须在 SQL 表达式中用、只有一个 `RETURN`、可能需开 `log_bin_trust_function_creators`。
- 记忆锚：handler 是"错误捕手"，函数是"能塞进 SELECT 的自定义公式"。
- 自测：① `CONTINUE` 和 `EXIT` 的区别？② 为什么在 `SELECT` 里调存储函数会慢？
