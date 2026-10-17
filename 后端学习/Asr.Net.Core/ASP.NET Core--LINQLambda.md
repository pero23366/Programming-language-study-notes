==一：概念==
**1. 委托（Delegate）：方法的“变量”**

委托是一种**可以指向方法的类型**。你可以把委托变量想象成一个“容器”，它不装数据，而是装一个**方法**。当你调用这个委托变量时，实际执行的就是它指向的那个方法[](https://blog.csdn.net/weixin_43847546/article/details/142817636#1)[](https://blog.csdn.net/qq630864068/article/details/131388636#1)。

**2. 匿名方法：没有名字的方法**

委托变量不仅可以指向有名字的普通方法，还可以直接指向一个**匿名方法**（用 `delegate` 关键字声明）。匿名方法的好处是：如果某个方法只用一次，就不需要专门为它起个名字[](https://blog.csdn.net/qq630864068/article/details/131388636#1)。

**3. Lambda 表达式：匿名方法的“极简版”**

Lambda 表达式就是**匿名方法的语法糖**。它省略了 `delegate` 关键字，用 `=>`（读作“goes to”）来连接参数和方法体，让代码更简洁、更易读。Lambda 是 LINQ 的核心“燃料”，没有 Lambda，LINQ 的链式调用就无法工作[](https://blog.csdn.net/weixin_43847546/article/details/142817636#1)。

**4. 推演路径**

杨中科老师这节课的核心推演逻辑是：

**委托 → 匿名方法 → Lambda 表达式 → LINQ**

每一步都是在简化上一步的写法，最终让数据处理变得极其简洁[](https://blog.csdn.net/weixin_43847546/article/details/142817636#1)[](https://blog.csdn.net/qq630864068/article/details/131388636#1)
==二：格式==
**1. 委托的基本格式**
```csharp

// Action：无返回值
Action<int, string> a1 = (age, name) => Console.WriteLine($"年龄{age}，姓名{name}");
// Func：有返回值，最后一个泛型参数是返回值类型
Func<int, int, string> f1 = (i1, i2) => $"{i1}+{i2}={i1 + i2}";
```

.NET 中已经内置了泛型委托 `Action`（无返回值）和 `Func`（有返回值），所以一般不需要自定义委托类型[](https://blog.csdn.net/qq630864068/article/details/131388636#1)。

**2. 匿名方法的格式**

```csharp

Func<int, int, string> f1 = delegate (int i1, int i2)
{
    return $"{i1}+{i2}={i1 + i2}";
};
```

**3. Lambda 表达式的简化规则**

```csharp

// 完整写法
Func<int, int, string> f1 = (int i1, int i2) => { return $"{i1}+{i2}={i1 + i2}"; };
// 省略参数类型（编译器能推断）
Func<int, int, string> f1 = (i1, i2) => { return $"{i1}+{i2}={i1 + i2}"; };
// 方法体只有一行，省略 {} 和 return
Func<int, int, string> f1 = (i1, i2) => $"{i1}+{i2}={i1 + i2}";
// 只有一个参数，省略 ()
Action<string> a1 = s => Console.WriteLine(s);
```

**简化规则总结**：

- 参数类型可省略（编译器根据委托类型推断）
    
- 方法体只有一行时，`{}` 和 `return` 可同时省略
    
- 只有一个参数时，`()` 可省略
==三：代码==
**1. 委托指向普通方法**

```csharp

static string Add(int i1, int i2) => $"{i1}+{i2}={i1 + i2}";
Func<int, int, string> f1 = Add;
string result = f1(1, 2); // 输出：1+2=3
```

**2. 委托指向匿名方法**

```csharp

Func<int, int, string> f2 = delegate (int i1, int i2)
{
    return $"{i1}+{i2}={i1 + i2}";
};
string result = f2(1, 2); // 输出：1+2=3
```

**3. 匿名方法改写为 Lambda**

```csharp

Func<int, int, string> f3 = (i1, i2) => $"{i1}+{i2}={i1 + i2}";
string result = f3(1, 2); // 输出：1+2=3
```

**4. 结合 LINQ 使用 Lambda**

```csharp

int[] nums = { 3, 5, 6, 87, 89, 45, 7, 435, 45, 765, 324 };
// Where 方法：遍历每个元素，对每个元素调用 Lambda，返回 true 的保留
IEnumerable<int> result = nums.Where(a => a > 10);
foreach (int i in result)
{
    Console.WriteLine(i);
}
```

`Where` 是 LINQ 的扩展方法，它遍历集合中的每个元素，对每个元素调用 Lambda 表达式，判断是否为 `true`，为 `true` 则保留[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。
==四：总结==

1. **委托是基础**：委托是可以指向方法的类型，`Action` 和 `Func` 是 .NET 内置的泛型委托，一般不需要自定义。
    
2. **匿名方法简化了委托的使用**：不需要为只用一次的方法单独命名。
    
3. **Lambda 是匿名方法的语法糖**：用 `=>` 连接参数和方法体，写法更简洁。
    
4. **推演路径**：委托 → 匿名方法 → Lambda → LINQ，每一步都在简化上一步。
    
5. **Lambda 是 LINQ 的燃料**：LINQ 的链式调用（`Where`、`Select`、`OrderBy` 等）都依赖 Lambda 表达式传入条件。