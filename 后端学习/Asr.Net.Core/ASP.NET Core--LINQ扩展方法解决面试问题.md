==一：概念==
### 1. LINQ的性能迷思

杨中科老师指出，**LINQ大部分时间不会影响性能**。在绝大多数业务场景中，几乎遇不到因为用了LINQ而导致性能不够的情况。LINQ的链式调用虽然看起来“做了很多事”，但它本质上是延迟执行的，只有在最终遍历结果时才会真正运行。

### 2. `IEnumerable` vs `IQueryable`（核心考点）

这是面试中**最高频**的问题之一，也是这节课最重要的概念[](https://blog.csdn.net/qq_32979811/article/details/145824346#1)。

- **`IEnumerable`（客户端评估）** ：当你用 `IEnumerable` 接收LINQ的 `Where` 查询结果时，它会直接生成 `SELECT * FROM 表名`，把**整张表的所有数据**都拉到内存中，然后在内存里逐一遍历、筛选。这叫**客户端评估（Client Evaluation）** 。
    
- **`IQueryable`（服务器端评估）** ：当你用 `IQueryable` 接收时，LINQ会把 `Where` 的条件**翻译成SQL语句**（比如 `WHERE Age > 30`），直接在数据库服务器上执行筛选，只返回符合条件的数据。这叫**服务器端评估（Server Evaluation）** 。
    

**结论**：`IQueryable` 比 `IEnumerable` 性能更高，因为它把筛选工作交给了更擅长此事的数据库，避免了不必要的数据传输和内存占用[](https://blog.csdn.net/qq_32979811/article/details/145824346#1)。

### 3. 延迟执行

`IQueryable` 的查询只有在**被遍历时**才会真正执行SQL语句。如果你只是定义了一个查询但没有 `foreach` 它，那么程序**根本不会向数据库发送任何SQL**。调用 `ToArray()`、`ToList()`、`Count()`、`Min()`、`Max()` 等“终结方法”时，才会触发真正的数据库查询[](https://blog.csdn.net/qq_32979811/article/details/145824346#1)。

### 4. 自定义 `WhereIf` 方法

在实际开发中，查询条件往往不是固定的。比如搜索图书时，用户可能只填了书名，也可能只填了作者名，还可能两个都填了。`WhereIf` 是一个扩展方法，它接收一个 `bool` 条件，只有当条件为 `true` 时，才应用后面的筛选表达式[](https://blog.csdn.net/qq_46103137/article/details/139253991)。
==二：格式==
### 1. `IEnumerable` vs `IQueryable`

```csharp

// IEnumerable（客户端评估）—— 不推荐
IEnumerable<Employee> badQuery = dbContext.Employees
    .Where(e => e.Age > 30); 
// 先 SELECT * 拉全表，再在内存筛选
// IQueryable（服务器端评估）—— 推荐
IQueryable<Employee> goodQuery = dbContext.Employees
    .Where(e => e.Age > 30); 
// 翻译成 SQL: SELECT * FROM Employees WHERE Age > 30

```
### 2. `WhereIf` 扩展方法的格式

```csharp

public static IQueryable<T> WhereIf<T>(
    this IQueryable<T> source, 
    bool condition, 
    Expression<Func<T, bool>> predicate)
{
    return condition ? source.Where(predicate) : source;
}
```

参数说明[](https://blog.csdn.net/qq_46103137/article/details/139253991)：

- `this IQueryable<T> source`：扩展方法所在类型。
    
- `bool condition`：执行条件，为 `true` 时才应用后面的表达式。
    
- `Expression<Func<T, bool>> predicate`：封装查询条件的Lambda表达式。
==三：代码==
### 1. `IEnumerable` vs `IQueryable` 的性能对比

```csharp

// ❌ 客户端评估：先把所有员工拉到内存，再筛选
IEnumerable<Employee> list1 = dbContext.Employees
    .Where(e => e.Age > 30).ToList();
// ✅ 服务器端评估：直接在数据库筛选
IQueryable<Employee> query = dbContext.Employees
    .Where(e => e.Age > 30);
List<Employee> list2 = query.ToList();
// 生成的 SQL: SELECT * FROM Employees WHERE Age > 30

```
### 2. `WhereIf` 的实际应用

```csharp

// 模拟搜索图书：书名和作者名都是可选条件
string searchTitle = "C#";
string searchAuthor = null;
var books = dbContext.Books
    .WhereIf(!string.IsNullOrEmpty(searchTitle), 
             b => b.Title.Contains(searchTitle))
    .WhereIf(!string.IsNullOrEmpty(searchAuthor), 
             b => b.Author.Contains(searchAuthor))
    .ToList();
// 因为 searchAuthor 为 null，第二个 WhereIf 的条件为 false，
// 所以只应用了书名筛选，SQL 中不会出现作者相关的 WHERE 条件
```

### 3. 链式调用的综合面试题

杨中科老师课程中经典的链式调用示例：获取 `Id > 2` 的数据，按 `Age` 分组，按 `Age` 排序，取前3条，最后投影取得年龄、人数、平均工资[](https://www.cnblogs.com/python-web/p/19072448#1)。

```csharp

var items = list.Where(e => e.Id > 2)
                .GroupBy(e => e.Age)
                .OrderBy(g => g.Key)
                .Take(3)
                .Select(g => new { 
                    NL = g.Key, 
                    RS = g.Count(), 
                    PJ = g.Average(e => e.Salary) 
                });
```
==四：总结==

1. **`IEnumerable` vs `IQueryable`**：这是面试必考。`IQueryable` 会把条件翻译成SQL在数据库执行，性能远优于 `IEnumerable` 的全表拉取再内存筛选。**在EF Core中，始终优先使用 `IQueryable`**。
    
2. **LINQ性能**：绝大多数业务场景下，LINQ不会成为性能瓶颈。真正影响性能的是**不合理的用法**（如客户端评估、滥用 `ToList()` 过早执行查询）。
    
3. **延迟执行**：`IQueryable` 查询在被遍历或调用终结方法前不会执行。这个特性让**动态拼接查询条件**变得非常自然。
    
4. **`WhereIf`**：封装可选查询条件的利器，让代码更简洁、更易读。
    
5. **面试应对**：当被问到“LINQ性能怎么样”时，回答的逻辑是：先说明LINQ本身性能足够好，再指出真正的关键在于**区分 `IEnumerable` 和 `IQueryable`**，最后补充延迟执行和终结方法的知识。