==一：概念==
### 1. 什么是“另一种倩影”？

“另一种倩影”指的就是LINQ的**查询表达式语法（Query Expression Syntax）**。它和链式调用（方法语法）功能完全等价，只是写起来更像SQL。

### 2. 为什么会有两种写法？

C#设计查询表达式，是为了让**熟悉SQL的开发者**能更自然地书写查询。编译时，编译器会**自动把查询表达式翻译成链式调用**，所以两者在运行时完全一样。

### 3. 两种写法的对比

```csharp

// 链式调用（方法语法）
var result1 = list.Where(e => e.Age > 30)
                  .OrderBy(e => e.Salary)
                  .Select(e => e.Name);
// 查询表达式（查询语法）
var result2 = from e in list
              where e.Age > 30
              orderby e.Salary
              select e.Name;
```

两段代码的执行结果完全一致。

### 4. 查询表达式的编译过程

编译器会把 `from ... where ... orderby ... select` 自动翻译成对应的扩展方法调用：

```csharp

// 查询表达式
from e in list
where e.Age > 30
select e.Name
// 编译后等价于
list.Where(e => e.Age > 30).Select(e => e.Name)
```
==二：格式==
### 1. 基本格式

```csharp

var result = from 变量 in 数据源
             where 条件
             orderby 排序字段
             select 投影内容;
```

### 2. 常用子句

|子句|作用|对应方法|
|---|---|---|
|`from`|指定数据源和范围变量|无直接对应，是查询的起点|
|`where`|筛选条件|`Where`|
|`orderby`|排序，`descending`表示降序|`OrderBy` / `OrderByDescending`|
|`select`|投影|`Select`|
|`group ... by`|分组|`GroupBy`|
|`join ... in ... on ... equals ...`|连接|`Join`|

### 3. 多数据源与多条件

```csharp

// 多个 from 子句（交叉连接）
var result = from a in listA
             from b in listB
             where a.Id == b.Id
             select new { a.Name, b.Salary };
// 多个 where 子句（逻辑与）
var result2 = from e in list
              where e.Age > 30
              where e.Salary > 5000
              select e;
```

### 4. orderby 的用法

```csharp

// 升序
orderby e.Salary
// 降序
orderby e.Salary descending
// 多字段排序
orderby e.Age, e.Salary descending
```
==三：代码==
### 1. 准备测试数据

```csharp

public class Employee
{
    public long Id { get; set; }
    public string Name { get; set; }
    public int Age { get; set; }
    public bool Gender { get; set; }
    public int Salary { get; set; }
}
var list = new List<Employee>
{
    new Employee { Id = 1, Name = "jerry", Age = 28, Gender = true,  Salary = 5000 },
    new Employee { Id = 2, Name = "jim",   Age = 33, Gender = true,  Salary = 3000 },
    new Employee { Id = 3, Name = "lily",  Age = 35, Gender = false, Salary = 9000 },
    new Employee { Id = 4, Name = "lucy",  Age = 16, Gender = false, Salary = 2000 },
    new Employee { Id = 5, Name = "kimi",  Age = 25, Gender = true,  Salary = 1000 },
    new Employee { Id = 6, Name = "nancy", Age = 35, Gender = false, Salary = 8000 },
    new Employee { Id = 7, Name = "zack",  Age = 35, Gender = true,  Salary = 8500 },
    new Employee { Id = 8, Name = "jack",  Age = 33, Gender = true,  Salary = 8000 }
};
```

### 2. 查询表达式示例

```csharp

// 示例1：筛选年龄大于20，按薪资降序，取前3，投影姓名和薪资
var result = (from e in list
              where e.Age > 20
              orderby e.Salary descending
              select new { e.Name, e.Salary })
             .Take(3);
foreach (var item in result)
{
    Console.WriteLine($"{item.Name}，薪资：{item.Salary}");
}
```

```csharp

// 示例2：分组统计
var groups = from e in list
             group e by e.Gender into g
             select new
             {
                 Gender = g.Key ? "男" : "女",
                 Count = g.Count(),
                 AvgSalary = g.Average(e => e.Salary)
             };
foreach (var g in groups)
{
    Console.WriteLine($"{g.Gender}：{g.Count}人，平均薪资{g.AvgSalary:F0}");
}

```
### 3. 查询表达式的“局限”

**查询表达式只支持部分LINQ方法**。以下方法**没有对应的查询语法**，只能用链式调用：

- `Skip` / `Take`（分页）
    
- `First` / `Single` / `Any` / `All`
    
- `Max` / `Min` / `Sum` / `Average`
    

所以实际开发中，**查询表达式和链式调用经常混合使用**：

```csharp

var result = (from e in list
              where e.Age > 20
              orderby e.Salary descending
              select new { e.Name, e.Salary })
             .Take(3); // Take 只能用链式调用
```
==四：总结==
1. **“另一种倩影”** = 查询表达式语法，写法像SQL，本质是链式调用的语法糖。
    
2. **两者等价**：编译器会把 `from...where...select` 自动翻译成 `Where().Select()`。
    
3. **常用子句**：`from`、`where`、`orderby`、`select`、`group by`、`join`。
    
4. **查询表达式的局限**：`Skip`、`Take`、`First`、`Count` 等方法没有查询语法，需要链式调用补充。
    
5. **实际写法**：两者混合使用，查询表达式负责主查询，链式调用负责分页和获取单条数据。