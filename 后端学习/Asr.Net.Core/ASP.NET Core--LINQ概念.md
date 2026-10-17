==一：概念==
### 1. 什么是 LINQ？

**LINQ** 的全称是 **Language Integrated Query（语言集成查询）**。它是一组**直接集成在 C# 语言中的查询技术**，让你可以用统一的语法去查询各种数据源（数组、集合、数据库、XML 等）。

传统的做法是写 `for` 循环，手动遍历、判断、收集结果。而 LINQ 让你用**声明式**的方式描述“我要什么数据”，而不是“怎么一步步去拿”。LINQ 把查询变成了像类、方法一样的一等语言结构。

### 2. 为什么要学 LINQ？

杨中科老师在这节课里用了一个非常经典的例子来说明[](https://blog.csdn.net/weixin_43847546/article/details/142817636#1)：

**统计一个字符串中每个字母出现的频率（忽略大小写），按频率从高到低输出出现次数超过 2 次的字母。**

如果用传统 `for` 循环，代码会很长。而用 LINQ，一行链式调用就能搞定：

```csharp

var items = s.Where(c => char.IsLetter(c))        // 过滤非字母
             .Select(c => char.ToLower(c))         // 统一小写
             .GroupBy(c => c)                      // 按字母分组
             .Where(g => g.Count() > 2)            // 过滤频率 ≤ 2
             .OrderByDescending(g => g.Count())    // 按频率降序
             .Select(g => new { Char = g.Key, Count = g.Count() });
```

**这就是 LINQ 的价值：让数据处理变得简单、直观、可读。**

### 3. LINQ 的知识脉络

杨中科老师把 LINQ 的学习拆成了一条清晰的推演路径：

**委托 → Lambda → LINQ**

- **委托**：可以指向方法的类型，调用委托变量时执行的就是它指向的方法[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。
    
- **Lambda**：匿名方法的简化写法，是 LINQ 的“燃料”[](https://www.e-com-net.com/article/1679687131733241856.htm#1)。
    
- **LINQ**：基于 `IEnumerable<T>` 的扩展方法，配合 Lambda 实现强大的数据查询[](https://www.e-com-net.com/article/1679687131733241856.htm#1)。
    

```csharp

// 一步一步演化
Func<int, bool> f1 = delegate(int i) { return i > 5; };  // 匿名方法
Func<int, bool> f2 = (i) => i > 5;                        // Lambda
var result = nums.Where(i => i > 5);                      // LINQ
```
==二：格式==
### 1. 委托的基本格式

```csharp

// Action：无返回值
Action<int, string> a1 = (age, name) => Console.WriteLine($"年龄{age}，姓名{name}");
// Func：有返回值，最后一个泛型参数是返回值类型
Func<int, int, string> f1 = (i1, i2) => $"{i1}+{i2}={i1 + i2}";

```
### 2. Lambda 表达式的简化规则

```csharp

// 完整写法
Func<int, int, string> f1 = (int i1, int i2) => { return $"{i1}+{i2}"; };
// 省略参数类型（编译器能推断）
Func<int, int, string> f1 = (i1, i2) => { return $"{i1}+{i2}"; };
// 方法体只有一行，省略 {} 和 return
Func<int, int, string> f1 = (i1, i2) => $"{i1}+{i2}";
// 只有一个参数，省略 ()
Action<string> a1 = s => Console.WriteLine(s);
```

### 3. LINQ 的基本格式

```csharp

using System.Linq; // 使用 LINQ 必须引入这个命名空间
// 链式调用格式
var result = 数据源.Where(过滤条件).Select(投影).OrderBy(排序);
```
==三：代码==
### 1. 委托与 Lambda 的完整示例

```csharp

// 委托指向普通方法
static string Add(int i1, int i2) => $"{i1}+{i2}={i1 + i2}";
Func<int, int, string> f1 = Add;
// 委托指向匿名方法
Func<int, int, string> f2 = delegate (int i1, int i2) { return $"{i1}+{i2}={i1 + i2}"; };
// 匿名方法改写为 Lambda
Func<int, int, string> f3 = (i1, i2) => $"{i1}+{i2}={i1 + i2}";
```

### 2. 第一个 LINQ 查询

```csharp

int[] nums = { 3, 5, 6, 87, 89, 45, 7, 435, 45, 765, 324 };
// Where 方法：遍历每个元素，对每个元素调用 Lambda，返回 true 的保留
IEnumerable<int> result = nums.Where(a => a > 10);
foreach (int i in result)
{
    Console.WriteLine(i);
}
```

### 3. `var` 在 LINQ 中的使用

```csharp

// 编译器自动推断类型，LINQ 中常用
var result = nums.Where(a => a > 10);
```

**注意**：C# 的 `var` 是**强类型**的，编译器会推断出准确类型，而不是像 JavaScript 那样是弱类型[](https://www.e-com-net.com/article/1679687131733241856.htm#1)。
==四：总结==
### 核心要点

1. **LINQ 让数据处理变简单**：用声明式语法替代手写循环，代码更短、更可读。
    
2. **知识脉络**：委托 → Lambda → LINQ，三者层层递进。
    
3. **委托**：`Action`（无返回值）和 `Func`（有返回值）是 .NET 内置的泛型委托，一般不需要自定义[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。
    
4. **Lambda**：匿名方法的简化写法，是 LINQ 的核心“燃料”。
    
5. **LINQ 的本质**：`IEnumerable<T>` 的扩展方法，配合 Lambda 实现查询。