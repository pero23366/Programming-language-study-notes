## 三：聚合函数

```csharp

int maxSalary = list.Max(e => e.Salary);       // 最大值
int minSalary = list.Min(e => e.Salary);       // 最小值
double avgAge = list.Average(e => e.Age);      // 平均值
int totalSalary = list.Sum(e => e.Salary);     // 求和
int count = list.Count(e => e.Age > 20);       // 计数
```

这些方法都支持传入Lambda表达式，对集合中每个元素的指定属性进行聚合计算[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。

---

## 四：分组 `GroupBy`

`GroupBy` 用于按指定条件将集合分组，返回 `IEnumerable<IGrouping<TKey, TSource>>`。`IGrouping` 是一个继承自 `IEnumerable` 的接口，`Key` 属性表示分组键，遍历它则获取组内元素[](https://blog.csdn.net/a313966416/article/details/120235821)。

```csharp

var groups = list.GroupBy(e => e.Gender);
foreach (var group in groups)
{
    string gender = group.Key ? "男" : "女";
    Console.WriteLine($"{gender}：{group.Count()}人");
}

```
### 进阶：分组后的聚合计算

```csharp

var groups = list.GroupBy(e => e.Gender);
foreach (var group in groups)
{
    string gender = group.Key ? "男" : "女";
    int count = group.Count();
    double avgSalary = group.Average(e => e.Salary);
    Console.WriteLine($"{gender}：{count}人，平均工资{avgSalary:F0}");
}