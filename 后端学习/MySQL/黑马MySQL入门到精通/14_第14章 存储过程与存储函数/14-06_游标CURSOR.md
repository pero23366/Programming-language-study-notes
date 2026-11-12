# 游标 CURSOR

> 来源：P113《56. 进阶-存储过程-游标-cursor》 · 档位 C 全新
> 与我已知的关系：游标就是"在数据库里用 `foreach` 遍历结果集"——**但它是性能最差的遍历方式**

==一：意义与概念==

痛点：你想"逐行处理查询结果"，比如给每个部门单独算一个复杂的奖金系数。普通 SQL 是集合操作，一次处理所有行，做不到"逐行不同逻辑"。游标就是干这个的。

**定义**：游标是查询结果集的**指针**，可以一行一行地取（`FETCH`）。

四步固定流程：

```sql
DECLARE 游标名 CURSOR FOR SELECT 语句;   -- 1. 声明
OPEN 游标名;                             -- 2. 打开（此时才真正执行查询）
FETCH 游标名 INTO 变量列表;              -- 3. 逐行取值
CLOSE 游标名;                            -- 4. 关闭
```

**游标的三个硬限制**：

1. **只读、不可滚动**：只能往前 `FETCH`，不能往回、不能随机跳。
2. **必须配 `HANDLER` 处理结束**：`FETCH` 到没有行了会报 `NOT FOUND`（SQLSTATE `02000`），要用 `DECLARE CONTINUE HANDLER FOR NOT FOUND` 捕获并跳出循环（14-07）。
3. **声明顺序有严格要求**：`DECLARE 变量` → `DECLARE 游标` → `DECLARE HANDLER`。顺序错了报语法错。

**性能**：游标是逐行处理，每 `FETCH` 一次就有一轮开销。处理 10 万行时，比 `UPDATE ... WHERE` 这种集合操作慢几十倍。所以：

> **能用集合 SQL 解决的，绝不用游标。** 游标只用于"确实需要逐行不同逻辑"且数据量可控的场景。

和 EF Core 的关系：`DbDataReader` 是客户端游标，`while (reader.Read())` 就是 `FETCH` 的等价物。你在 C# 里做"边读边处理"很自然，但在数据库侧做同样的事会占住连接和锁——**这也是"逻辑放应用层"的一个理由**：应用层的循环不会长时间锁表。

==二：使用格式==

```sql
DECLARE 变量 类型;                                    -- 先声明接收变量
DECLARE 游标名 CURSOR FOR SELECT ...;                 -- 再声明游标
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;  -- 最后声明 handler
```

==三：代码实践==

```sql
DELIMITER $$
CREATE PROCEDURE p_cursor_demo()
BEGIN
  DECLARE v_id INT;
  DECLARE v_salary DECIMAL(10,2);
  DECLARE done INT DEFAULT 0;

  -- 顺序：变量 → 游标 → handler
  DECLARE cur CURSOR FOR SELECT id, salary FROM emp;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_id, v_salary;
    IF done = 1 THEN LEAVE read_loop; END IF;      -- 读完就跳
    UPDATE emp SET salary = v_salary * 1.1 WHERE id = v_id;
  END LOOP;
  CLOSE cur;
END $$
DELIMITER ;
```

等价的集合写法（**快几十倍**）：

```sql
UPDATE emp SET salary = salary * 1.1;
```

==四：总结归纳==

- 三条：游标=逐行指针，只读不回头；声明顺序必须是"变量→游标→handler"；逐行处理极慢，能用 `UPDATE ... WHERE` 就别用游标。
- 记忆锚：游标是数据库里的 `foreach`，位置在数据库侧，代价是锁和连接被占着。
- 自测：① 游标声明和 handler 声明谁先谁后？② `FETCH` 到没数据时会怎样，靠什么处理？
