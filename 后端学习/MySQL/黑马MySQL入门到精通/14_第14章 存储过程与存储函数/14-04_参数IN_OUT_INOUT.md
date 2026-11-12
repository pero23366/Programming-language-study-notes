# 参数：IN、OUT、INOUT

> 来源：P108《51. 进阶-存储过程-参数(IN,OUT,INOUT)》 · 档位 B 部分重叠
> 与我已知的关系：T-SQL 用 `OUTPUT` 关键字标记输出参数，**MySQL 用 `IN/OUT/INOUT` 三个方位词，且默认是 IN**

==一：意义与概念==

三种参数方向：

| 类型 | 方向 | 行为 | 类比 C# |
|---|---|---|---|
| `IN`（默认）| 传入 | 过程内改它，**不影响外部** | 按值传参 |
| `OUT` | 传出 | 过程内必须先赋值；调用时传变量，结束后变量变成过程里写的值 | `out` 参数 |
| `INOUT` | 传入 + 传出 | 初始值传进去，过程可改，改完传出 | `ref` 参数 |

**最容易错的：`OUT` 参数在过程内是 `NULL`，不是外部传入的值。** 所以 `OUT` 参数进来先赋值，不能"读取它的旧值"。

```sql
-- 错：以为 OUT 能拿到外部值
CREATE PROCEDURE p(OUT x INT) BEGIN SET x = x + 1; END;
SET @a = 5; CALL p(@a); SELECT @a;   -- NULL，因为 x 初始是 NULL
```

调用时的传参规则：

- `IN` 可以传字面量（`CALL p(1)`）
- `OUT` / `INOUT` **必须传变量**（`CALL p(@a)`），传字面量会报错

`INOUT` 的正确用法：

```sql
CREATE PROCEDURE p(INOUT x INT) BEGIN SET x = x + 1; END;
SET @a = 5; CALL p(@a); SELECT @a;   -- 6
```

和 EF Core 的关系（这是个实际痛点）：EF Core 的 `ExecuteSqlRaw` **拿不到 `OUT` 参数的值**，必须用 `DbCommand` 手写：

```csharp
using var cmd = db.Database.GetDbConnection().CreateCommand();
cmd.CommandText = "CALL p_emp_count(@dept, @cnt)";
// 需要显式添加参数并指定 Direction = ParameterDirection.Output
```

而 MySqlConnector/Pomelo 对 `OUT` 参数的支持也不如 SQL Server 顺畅。**这也是"存储过程不适合 ORM 项目"的具体证据**：不是不能用，是用起来别扭。

==二：使用格式==

```sql
CREATE PROCEDURE 过程名(
  [IN]  参数名 类型,      -- 默认，可省略 IN
  OUT   参数名 类型,
  INOUT 参数名 类型
)
BEGIN ... END;

CALL 过程名(值, @变量, @变量);
SELECT @变量;
```

==三：代码实践==

```sql
DELIMITER $$
CREATE PROCEDURE p_calc(
  IN    p_a INT,
  IN    p_b INT,
  OUT   p_sum INT,
  INOUT p_acc INT
)
BEGIN
  SET p_sum = p_a + p_b;      -- OUT 直接赋值
  SET p_acc = p_acc + p_sum;  -- INOUT 用旧值累加
END $$
DELIMITER ;

SET @acc = 100;
CALL p_calc(3, 4, @s, @acc);
SELECT @s, @acc;     -- 7, 107
```

==四：总结归纳==

- 三条：`IN` 是默认；`OUT` 进来是 NULL，必须自己赋值；`OUT`/`INOUT` 调用时必须传变量而不是字面量。
- 记忆锚：`IN` 是"只读副本"，`OUT` 是"空白回执"，`INOUT` 是"带批注的回执"。
- 自测：① `CALL p(1, 2)` 而第二个参数是 `OUT`，会怎样？② `OUT x` 里 `SET x = x+1` 的结果是什么？
