==一：概念==
**1. 什么是链式调用？**

链式调用就是像接火车一样，把多个LINQ方法**首尾相连**地写在一行代码里。例如：

csharp

list.Where(e => e.Age > 30).OrderBy(e => e.Salary).Select(e => e.Name)

**2. 为什么能链式调用？**

核心原因在于：**几乎所有LINQ扩展方法的返回值类型都是 `IEnumerable<T>`（或 `IQueryable<T>`）**。而 `Where`、`Select`、`OrderBy` 等方法又都是针对 `IEnumerable<T>` 的扩展方法。所以，前一个方法返回的结果，天然就是后一个方法可以继续操作的“原材料”。

**3. 链式调用的本质：流水线**

链式调用本质上是一条**数据处理流水线**。数据从一端进入，依次经过过滤、排序、投影等工序，最终在另一端输出。每个LINQ方法只负责一道工序，但它们通过 `IEnumerable<T>` 这个“传送带”连接在一起。

**4. 延迟执行**

链式调用默认是**延迟执行**的：你写下一长串链式调用时，什么都不会发生。只有当你**实际遍历**最终结果时（如 `foreach`、`ToList()`、`Count()`），整条流水线才会真正运转起来。
==二：格式==
**1. 基础链式格式**

```csharp

// 数据源.方法1().方法2().方法3()...
var result = list.Where(e => e.Age > 30)
                 .OrderBy(e => e.Salary)
                 .Select(e => e.Name);
```

**2. 杨中科老师课程中的经典示例**

“获取Id>2的数据，然后按照Age分组，并且把分组按照Age排序，然后取出前3条，最后再投影取得年龄、人数”：

```csharp

var result = list.Where(e => e.Id > 2)
                 .GroupBy(e => e.Age)
                 .OrderBy(g => g.Key)
                 .Take(3)
                 .Select(g => new { Age = g.Key, Count = g.Count() });
```

**3. 链式调用 vs 变量拆分**

从功能上讲，链式调用和把每一步结果存到不同变量里是**等价的**：

```csharp

// 链式调用写法
var result = list.Where(e => e.Age > 30).OrderBy(e => e.Salary).Select(e => e.Name);
// 变量拆分写法（功能完全一样）
var step1 = list.Where(e => e.Age > 30);
var step2 = step1.OrderBy(e => e.Salary);
var result = step2.Select(e => e.Name);
```
==三：代码==
**1. 准备测试数据**

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
**2. 综合链式调用示例**

```csharp

// 目标：筛选年龄>20的员工，按薪资降序排列，取前3名，只保留姓名和薪资
var result = list.Where(e => e.Age > 20)
                 .OrderByDescending(e => e.Salary)
                 .Take(3)
                 .Select(e => new { e.Name, e.Salary });
foreach (var item in result)
{
    Console.WriteLine($"{item.Name}，薪资：{item.Salary}");
}
```

**3. 链式调用中的延迟执行验证**

```csharp

var query = list.Where(e => e.Age > 30); // 此时并未执行
Console.WriteLine("--- 开始遍历 ---");
foreach (var item in query) // 此时才真正执行过滤
{
    Console.WriteLine(item.Name);
}
```
==四：总结==
1. **链式调用的根基**：LINQ方法几乎都是 `IEnumerable<T>` 的扩展方法，且返回值也是 `IEnumerable<T>`，因此可以无限拼接。
    
2. **链式调用的本质**：一条数据处理流水线，每个方法负责一道工序。
    
3. **链式 vs 变量拆分**：功能完全等价，链式更简洁，变量拆分更便于调试。
    
4. **延迟执行**：链式调用不会立即执行，只有实际遍历结果时才运转。
    
5. **实战价值**：链式调用是LINQ最优雅的特性，在EF Core数据库查询中尤其强大——它会被翻译成SQL语句在数据库端执行。
    

**建议练习**：把上面“综合链式调用示例”的代码亲手敲一遍，然后把 `.Select(e => new { e.Name, e.Salary })` 改成 `.Select(e => e)`，观察输出结果的差异，体会投影在链式调用中的“最后一公里”作用。