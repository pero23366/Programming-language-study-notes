==一：概念==

### 1. LINQ方法的本质：扩展方法

LINQ中提供了很多集合的扩展方法，配合Lambda能简化数据处理[](https://www.e-com-net.com/article/1679687131733241856.htm#1)。你之前用的 `Where()`、`Count()`、`Any()` 等，本质上都是**对 `IEnumerable<T>` 接口的扩展方法**。

### 2. 为什么能“链式调用”？

LINQ中所有的扩展方法几乎都是针对 `IEnumerable` 接口的，而所有能返回集合的方法都返回 `IEnumerable`，所以可以把几乎所有方法“链式使用”。

例如：

csharp

list.Where(e => e.Age > 30).Min(e => e.Salary)

### 3. `Where()` 方法的原理

`Where()` 方法的作用是：**遍历集合中的所有元素，对于每个元素都使用Lambda表达式进行判断，如果结果为 `true`，则将该元素放到返回的集合中**[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。

### 4. 延迟执行

LINQ使用**延迟执行**：当你调用 `Where()` 时，它并不立即执行过滤，而是返回一个 `IEnumerable<T>`。只有当你**实际遍历**这个 `IEnumerable<T>` 时，过滤逻辑才会真正执行。

### 5. `yield` 语法

要实现延迟执行，C# 提供了 `yield` 关键字。使用 `yield return` 可以在遍历过程中逐个返回元素，而不是一次性构建整个结果列表[](https://blog.csdn.net/a313966416/article/details/120235821)。

### 6. `var` 与匿名类型

`var` 可以让编译器进行“类型推断”来简化类型的声明，在LINQ中常用[](https://www.e-com-net.com/article/1679687131733241856.htm#1)。C#的 `var` 和 JavaScript 的 `var` 不一样，仍然是**强类型**的[](https://www.e-com-net.com/article/1679687131733241856.htm#1)。

匿名类型允许你创建没有名字的类型，编译器会自动生成一个类，常用于 `Select` 投影[](https://blog.csdn.net/a313966416/article/details/120235821)。

==二：格式==
### 1. 扩展方法的基本格式

```csharp

// 扩展方法必须定义在静态类中，且方法必须是静态的
public static class MyLinqExtensions
{
    // this 关键字表示扩展的是 IEnumerable<T> 类型
    public static IEnumerable<T> MyWhere<T>(this IEnumerable<T> source, Func<T, bool> predicate)
    {
        // 实现逻辑
    }
}
```

### 2. 使用 `yield` 实现延迟执行

```csharp

public static IEnumerable<T> MyWhere<T>(this IEnumerable<T> source, Func<T, bool> predicate)
{
    foreach (var item in source)
    {
        if (predicate(item))
        {
            yield return item; // 逐个返回，而不是一次性构建列表
        }
    }
}
```

### 3. `var` 与匿名类型的格式

```csharp

// var 类型推断
var result = nums.Where(i => i > 10);
// 匿名类型
var obj = new { Name = "张三", Age = 25 };
```
==三：代码==
### 1. 手动实现一个简化版的 `Where` 方法

```csharp

// 自定义扩展方法
public static class MyLinq
{
    public static IEnumerable<T> MyWhere<T>(this IEnumerable<T> source, Func<T, bool> predicate)
    {
        foreach (var item in source)
        {
            if (predicate(item))
            {
                yield return item;
            }
        }
    }
}

// 使用自定义的 Where
int[] nums = { 3, 99, 88, 77, 7, 8, 9, 66, 15, 7 };
IEnumerable<int> items = nums.MyWhere(i => i > 10);
foreach (int i in items)
{
    Console.WriteLine(i);
}
```


### 2. 对比：标准 LINQ 的 `Where`

```csharp

using System.Linq;
int[] nums = { 3, 99, 88, 77, 7, 8, 9, 66, 15, 7 };
IEnumerable<int> items = nums.Where(i => i > 10);
foreach (int i in items)
{
    Console.WriteLine(i);
}
```

### 3. 使用 `var` 简化类型声明

```csharp

// 不用 var
IEnumerable<int> result = nums.Where(i => i > 10);
// 使用 var，编译器自动推断为 IEnumerable<int>
var result = nums.Where(i => i > 10);
```

### 4. 匿名类型与投影


```csharp

var items = list.Select(e => new
{
    XingMing = e.Name,
    NianLing = e.Age,
    XingBie = e.Gender ? "男" : "女"
});

编译器会自动生成一个具有 `XingMing`、`NianLing`、`XingBie` 三个属性的匿名类型[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。
```

==四：总结==

1. **LINQ方法的本质**：是 `IEnumerable<T>` 的扩展方法，配合 Lambda 表达式实现数据查询。
    
2. **`Where()` 的原理**：遍历集合，对每个元素调用 Lambda 判断，为 `true` 则保留[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。
    
3. **延迟执行**：调用 `Where()` 时不执行，遍历结果时才真正过滤。
    
4. **`yield` 关键字**：实现延迟执行的核心，逐个返回元素而非一次性构建列表。
    
5. **`var` 是强类型**：编译器自动推断类型，和 JavaScript 的 `var` 完全不同[](https://www.e-com-net.com/article/1679687131733241856.htm#1)。
    
6. **匿名类型**：`Select` 投影时常用，编译器自动生成类[](https://blog.csdn.net/a313966416/article/details/120235821)。