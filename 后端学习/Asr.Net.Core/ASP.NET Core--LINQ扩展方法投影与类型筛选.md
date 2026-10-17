 五：投影 `Select`

`Select` 用于将集合中的每个元素**转换为新的形式**（投影）[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。



```csharp
// 只取姓名
var names = list.Select(e => e.Name);
// 投影为匿名类型
var items = list.Select(e => new
{
    XingMing = e.Name,
    NianLing = e.Age,
    XingBie = e.Gender ? "男" : "女"
});
```

匿名类型允许你创建没有名字的类型，编译器会自动生成一个类。`var` 在LINQ中常用于接收 `Select` 的投影结果，但C#的 `var` 是**强类型**的，编译器会推断出准确类型[](https://blog.csdn.net/a313966416/article/details/120235821)。

---

## 六：类型筛选 `OfType`

`OfType<T>` 用于从混合类型的集合中筛选出指定类型的数据。

```csharp

object[] mixed = { 1, "hello", 2.5, "world", 3 };
var strings = mixed.OfType<string>(); // 只保留字符串元素
```
