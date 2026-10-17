**编译器看到 Lambda 捕获了外部变量，会自动生成一个“闭包类”，把捕获的变量变成这个类的字段。变量的生命周期跟着这个类的对象走，所以方法结束了，变量还活着。**
## 变量从“栈”搬到了“堆”

==一：概念==

### 1. Lambda表达式是什么？

Lambda表达式是**匿名函数的一种更简洁的写法**。

在第28课，匿名函数这样写：

```csharp

Action<string> action = delegate (string msg)
{
    Console.WriteLine(msg);
};
```

用Lambda表达式，可以简化成：

```csharp

Action<string> action = (msg) =>
{
    Console.WriteLine(msg);
};
```
//类型的省略，编译器可以通过前面的string识别

**核心：Lambda表达式 = 匿名函数的“简写版”。** 它去掉了 `delegate` 关键字，用 `=>` 运算符代替，让代码更短、更直观。

==**(不止于此，还能延长变量生命周期)**==

### 2. 闭包是什么？

闭包是一个**会“记住”自己出生环境的函数**。

简单说：**内层的函数可以引用外层函数的变量，即使外层函数已经执行结束，这些变量依然被内层函数“记住”并能继续使用。**

**打个比方：**

你是一个在“厨房”里做菜的厨师（内层函数），厨房里有一本菜谱（外层变量）。你离开厨房后，依然能记得菜谱上的内容，继续按菜谱做菜。**闭包就是“记住了菜谱的厨师”。**

### 3. 为什么需要Lambda表达式和闭包？

- **Lambda表达式**：让匿名函数写起来更简洁，是LINQ查询、事件订阅、List排序等场景的核心语法。
    
- **闭包**：让函数可以“携带”环境变量，是实现回调、延迟执行、工厂函数等高级模式的基础。
    

**核心用途：Lambda表达式配合委托和事件使用；==闭包是Lambda表达式的“隐藏能力”。==**
==二：格式==

### Lambda表达式的格式

```csharp

(参数列表) => 表达式或语句块
```

**两种写法：**

```csharp

// 表达式Lambda：右边是一个表达式，表达式的值就是返回值
(int a, int b) => a + b
// 语句Lambda：右边是花括号包裹的语句块
(int a, int b) => { return a + b; }

```
### 参数类型的省略

```csharp

// 完整写法
Func<int, int, int> add = (int a, int b) => a + b;
// 省略参数类型（编译器能推断时）
Func<int, int, int> add = (a, b) => a + b;

### 无参数、无返回值

csharp

Action action = () => Console.WriteLine("Hello Lambda");

```
### 闭包的形成条件

```csharp

int num = 10;  // 外层变量
Action action = () =>
{
    Console.WriteLine(num);  // 内层函数引用了外层变量
};
// 此时就形成了闭包
```
==三：代码==

### 基础使用：从匿名函数到Lambda

```csharp

using System;
class Program
{
    static void Main()
    {
        // 匿名函数写法（第28课）
        Action<string> action1 = delegate (string msg)
        {
            Console.WriteLine("匿名函数：" + msg);
        };
        // Lambda表达式写法（第30课）
        Action<string> action2 = (msg) =>
        {
            Console.WriteLine("Lambda：" + msg);
        };
        action1("唐老狮");
        action2("唐老狮");
    }
}
```

### 表达式Lambda vs 语句Lambda

csharp

// 表达式Lambda（右边是表达式，自动作为返回值）
Func<int, int, int> add = (a, b) => a + b;
Console.WriteLine(add(3, 5));  // 8
// 语句Lambda（右边是语句块，需要显式return）
Func<int, int, int> add2 = (a, b) => { return a + b; };
Console.WriteLine(add2(3, 5));  // 8

### 配合List排序（第32课会详细讲）

```csharp

using System;
using System.Collections.Generic;
class Program
{
    static void Main()
    {
        List<int> numbers = new List<int> { 3, 1, 4, 1, 5, 9, 2, 6 };
        // 用Lambda表达式直接作为排序规则
        numbers.Sort((a, b) => a - b);  // 升序
        Console.WriteLine(string.Join(", ", numbers));  // 1, 1, 2, 3, 4, 5, 6, 9
        numbers.Sort((a, b) => b - a);  // 降序
        Console.WriteLine(string.Join(", ", numbers));  // 9, 6, 5, 4, 3, 2, 1, 1
    }
}
```

**对比你之前学委托时的写法：**

```csharp

// 第24课：先写具名方法，再传给Sort
static bool Ascending(int a, int b) { return a > b; }
Sort(arr, Ascending);
// 第30课：用Lambda直接写
numbers.Sort((a, b) => a - b);

```
### 闭包的核心示例

```csharp

using System;
class Program
{
    // 返回一个Lambda表达式（闭包）
    static Func<int, int> CreateMultiplier(int factor)
    {
        // 返回的Lambda“捕获”了factor变量
        return (x) => x * factor;
    }
    static void Main()
    {
        // 调用CreateMultiplier(4)，返回一个Lambda
        Func<int, int> multiplyBy4 = CreateMultiplier(4);
        // CreateMultiplier已经执行结束了，但factor=4依然被“记住”
        Console.WriteLine(multiplyBy4(5));   // 20
        Console.WriteLine(multiplyBy4(10));  // 40
        // 再创建一个乘以3的
        Func<int, int> multiplyBy3 = CreateMultiplier(3);
        Console.WriteLine(multiplyBy3(5));   // 15
    }
}

```
**关键：`CreateMultiplier` 执行结束后，`factor` 这个局部变量本应销毁，但因为被Lambda“捕获”了，它的生命周期被延长了，Lambda依然能访问它。这就是闭包。**

### 课后练习题：打印1~10

唐老狮第30课的练习题中有一道经典闭包题：

**有一个函数，返回一个委托函数，执行返回的委托函数时，可以打印出1~10。**

```csharp

using System;
class Program
{
    static Func<Action> LambdaTest()
    {
        return () =>
        {
            Action action = null;
            for (int i = 1; i <= 10; i++)
            {
                int index = i;  // 关键：在循环内部声明临时变量
                action += () => { Console.Write(index + " "); };
            }
            return action;
        };
    }
    static void Main()
    {
        Func<Action> test = LambdaTest();
        test()();  // 输出：1 2 3 4 5 6 7 8 9 10
    }
}
```

**为什么要在循环内部声明 `int index = i;`？**

- 如果直接使用 `i`，所有Lambda捕获的是**同一个变量 `i`**，循环结束后 `i` 的值是 11，所以会打印 11 十次（这是闭包的经典“坑”）。
    
- 在循环内部声明 `index`，每次循环都会创建**一个新的 `index` 变量**，每个Lambda捕获的是各自独立的 `index`，所以能正确打印 1~10。
    

### 闭包的经典“坑”：循环变量捕获

```csharp

using System;
using System.Collections.Generic;
class Program
{
    static void Main()
    {
        // ❌ 错误写法：所有Lambda捕获同一个变量 i
        List<Action> actions1 = new List<Action>();
        for (int i = 1; i <= 3; i++)
        {
            actions1.Add(() => Console.Write(i + " "));
        }
        foreach (var action in actions1) action();
        // 输出：4 4 4（不是1 2 3！）
        // ✅ 正确写法：在循环内部创建临时变量
        List<Action> actions2 = new List<Action>();
        for (int i = 1; i <= 3; i++)
        {
            int index = i;  // 创建独立的临时变量
            actions2.Add(() => Console.Write(index + " "));
        }
        foreach (var action in actions2) action();
        // 输出：1 2 3
    }
}
```
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|**Lambda表达式**|匿名函数的简写形式，用 `=>` 运算符|
|**闭包**|内层函数“记住”外层变量的机制|
|**Lambda格式**|`(参数) => 表达式` 或 `(参数) => { 语句 }`|
|**闭包形成条件**|内层函数引用了外层函数的局部变量|
|**闭包效果**|外层函数执行结束后，被捕获的变量依然存活|

### Lambda表达式 vs 匿名函数

|匿名函数（第28课）|Lambda表达式（第30课）|
|---|---|---|
|关键字|`delegate`|`=>`|
|写法|`delegate (参数) { 代码 }`|`(参数) => 代码`|
|简洁度|较长|**更短**|
|本质|一样|**一样，只是语法糖**|

### 闭包的注意事项

|注意事项|说明|
|---|---|
|**循环变量捕获**|在循环中直接使用循环变量，所有Lambda会共享同一个变量|
|**解决方法**|在循环内部创建临时变量（`int index = i;`）|
|**变量生命周期**|被捕获的变量生命周期会延长，至少和委托一样长|

### 什么时候用Lambda表达式？

- **配合委托和事件**，写简短的回调逻辑
    
- **List排序**，直接写比较规则（第32课）
    
- **LINQ查询**，写查询条件（后续课程）
    
- **任何需要匿名函数的地方**，优先用Lambda
    

### 一句话总结

> **Lambda表达式是匿名函数的简写版，用 `=>` 让代码更短；闭包是Lambda的“隐藏能力”，让内层函数能“记住”外层变量，即使外层函数已经结束。**