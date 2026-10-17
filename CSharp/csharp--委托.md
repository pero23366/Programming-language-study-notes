==一：概念==

**委托是什么？**

简单说，**委托就是一个“方法的容器”**，或者说是一个“方法的类型”。它允许你把方法当作参数一样传递、存储和调用。

**核心特点：**

|特点|说明|
|---|---|
|**方法的容器**|可以存储一个或多个方法|
|**类型安全**|只能存储与委托签名（参数和返回值）完全匹配的方法|
|**面向对象**|委托是引用类型，本质是一个类，继承自 `System.Delegate`|
|**多播能力**|一个委托可以搭载多个方法，调用时依次执行|

**打个比方：**

委托就像一张**“任务单”**。单子上写着：“我需要一个能接收 `string` 参数、没有返回值的方法”。谁符合这个格式，谁就能“接单”。你把任务单交给谁，谁就去执行。

**为什么需要委托？**

因为有时候，**我们写代码的时候，并不知道具体要调用哪个方法**。比如按钮点击，你写按钮代码时，根本不知道用户会点击哪个按钮，会触发什么逻辑。委托就是用来解决这个问题的——**把“调用哪个方法”的决定权，推迟到运行时**。

**委托和接口的相似与不同：**

它们都是一种“约定”。接口约定的是**类**能做什么，委托约定的是**方法**长什么样。你可以把委托理解为一个“只有一个方法的迷你接口”。
==二：格式==

**委托的声明：**

```csharp

访问修饰符 delegate 返回值类型 委托名(参数列表);

```
**示例：**

```csharp

// 无参无返回值
public delegate void SimpleDelegate();
// 有参无返回值
public delegate void MessageDelegate(string message);
// 有参有返回值
public delegate int CalcDelegate(int a, int b);
```

**委托的实例化和赋值：**

```csharp

// 1. 声明委托类型
delegate void MessageDelegate(string msg);
// 2. 定义符合签名的方法
static void PrintMessage(string msg)
{
    Console.WriteLine(msg);
}
// 3. 实例化委托并绑定方法
MessageDelegate del = PrintMessage;   // 直接赋值方法名
MessageDelegate del2 = new MessageDelegate(PrintMessage); // 或用 new
```

**多播委托的格式：**

```csharp

del += 方法2;   // 添加方法
del += 方法3;
del -= 方法2;   // 移除方法
```

**委托的位置：**

委托可以写在**类的外面**（命名空间级别），也可以写在**类的里面**。写在外面，当前命名空间下所有类都能用；写在里面，只有这个类能用。
==三：代码==

### 基础使用：单播委托

```csharp

using System;
// 声明委托
delegate void SayHello(string name);
class Program
{
    static void Chinese(string name)
    {
        Console.WriteLine("你好，" + name);
    }
    static void English(string name)
    {
        Console.WriteLine("Hello, " + name);
    }
    static void Main()
    {
        // 委托变量，先指向 Chinese
        SayHello say = Chinese;
        say("唐老狮");   // 输出：你好，唐老狮
        // 运行时切换指向 English
        say = English;
        say("唐老狮");   // 输出：Hello, 唐老狮
    }
}
```

**观察：** 同一个委托变量 `say`，在不同时间指向了不同的方法。这就是“运行时决定调用哪个方法”的体现。

### 多播委托：一个委托，多个方法

```csharp

delegate void Notify(string message);
class Program
{
    static void PrintToConsole(string msg)
    {
        Console.WriteLine("控制台：" + msg);
    }
    static void PrintToLog(string msg)
    {
        Console.WriteLine("日志：" + msg);
    }
    static void Main()
    {
        Notify notify = PrintToConsole;
        notify += PrintToLog;   // 添加第二个方法
        notify("系统启动");     // 依次执行两个方法
        // 输出：
        // 控制台：系统启动
        // 日志：系统启动
        notify -= PrintToConsole; // 移除第一个方法
        notify("系统关闭");       // 只执行 PrintToLog
        // 输出：
        // 日志：系统关闭
    }
}
```

**观察：** `notify` 委托现在是一个“多播委托”，调用一次，`PrintToConsole` 和 `PrintToLog` 会依次执行。

### 委托作为方法参数

这是委托最强大的用法之一。

```csharp

delegate bool Compare(int a, int b);
class Program
{
    // 排序方法，接收一个"比较规则"作为参数
    static void Sort(int[] arr, Compare compare)
    {
        for (int i = 0; i < arr.Length - 1; i++)
        {
            for (int j = 0; j < arr.Length - 1 - i; j++)
            {
                if (compare(arr[j], arr[j + 1])) // 调用传入的比较方法
                {
                    // 交换
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }
    static bool Ascending(int a, int b)  { return a > b; }
    static bool Descending(int a, int b) { return a < b; }
    static void Main()
    {
        int[] arr = { 3, 1, 4, 1, 5, 9, 2, 6 };
        Sort(arr, Ascending);   // 升序排序
        Console.WriteLine(string.Join(", ", arr)); // 1, 1, 2, 3, 4, 5, 6, 9
        Sort(arr, Descending);  // 降序排序
        Console.WriteLine(string.Join(", ", arr)); // 9, 6, 5, 4, 3, 2, 1, 1
    }
}

```
**观察：** `Sort` 方法本身不关心怎么比较，它把比较规则“委托”给了传入的 `compare` 参数。这就是“把方法当参数传递”。

### 委托与 Lambda 表达式

Lambda 是写匿名方法的简写，用来快速创建委托。

```csharp

delegate int Calc(int a, int b);
class Program
{
    static void Main()
    {
        // 用 Lambda 表达式直接创建委托
        Calc add = (a, b) => a + b;
        Calc sub = (a, b) => a - b;
        Calc mul = (a, b) => a * b;
        Console.WriteLine(add(3, 5)); // 8
        Console.WriteLine(sub(3, 5)); // -2
        Console.WriteLine(mul(3, 5)); // 15
    }
}
```

**关键：** `(a, b) => a + b` 等价于一个接收 `a`、`b` 并返回 `a + b` 的方法。Lambda 让创建委托变得非常简洁。
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|概念|方法的容器，可以存储、传递、调用方法|
|本质|引用类型，继承自 `System.Delegate`|
|声明|`delegate 返回值 委托名(参数列表);`|
|实例化|`委托名 变量 = 方法名;`|
|调用|`变量(参数);`|
|多播|`+=` 添加，`-=` 移除，调用时依次执行|
|Lambda|`(参数) => 表达式`，创建匿名方法的简写|

### 委托的价值

|价值|说明|
|---|---|
|**解耦**|调用者不需要知道具体执行哪个方法|
|**回调**|可以把方法作为参数传递，实现回调机制|
|**动态调用**|运行时才决定调用哪个方法|
|**多播**|一个委托可以通知多个订阅者，是事件的基础|

### 委托需要注意的几个问题

根据唐老狮课程的讲解，委托使用中需要留意以下几点：

1. **命名空间中的默认访问修饰符是 `internal`**：如果不写访问修饰符，委托默认是 `internal`，只能在当前程序集内访问。
    
2. **委托作为参数传递时的“副本”问题**：如果把委托作为方法参数传入，并在方法内对委托做了 `+=` 或 `-=` 操作，那么这个委托和原来的委托已经不是同一个实例了。**方法内对该参数委托的修改，不会影响到原委托。**
    
3. **多播委托的返回值**：如果多播委托绑定的方法有返回值，调用时只会返回**最后一个方法**的返回值。前面的方法返回值会被忽略。所以多播委托通常用于返回 `void` 的方法。
    

### 什么时候用委托？

- 需要**把方法作为参数传递**时
    
- 需要**实现回调机制**时（比如异步操作完成后通知）
    
- 需要**一个事件通知多个订阅者**时（事件的基础）
    
- 需要**运行时动态决定调用哪个方法**时
    

### 一句话总结

> **委托就是一张“任务单”——上面写着方法的格式要求，谁符合格式谁就能“接单”。你可以把任务单传来传去，也可以让多个方法同时“接单”，调用时它们会依次执行。**

### 和你之前知识的联系

|你学过的|和委托的关系|
|---|---|
|**接口**|都是一种“约定”，但接口约束类，委托约束方法|
|**多态**|多态是“选一个”子类方法，委托可以“选一个”方法，也可以“全都要”（多播）|
|**Lambda**|写匿名方法的简写，用来快速创建委托|
|**事件（下一课）**|事件本质就是委托的封装，是委托的“安全版”|

