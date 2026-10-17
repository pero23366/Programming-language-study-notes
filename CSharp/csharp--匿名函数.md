==一：概念==
**匿名函数是什么？**

匿名函数就是**没有名字的函数**。它不需要像普通方法那样先声明一个名字再使用，而是**直接写在需要的地方**。

**为什么需要它？**

因为你之前学委托时，每次都要先定义一个具名方法：

```csharp

// 先定义一个有名有姓的方法
static void PrintMessage(string msg)
{
    Console.WriteLine(msg);
}
// 再把方法名赋值给委托
Action<string> action = PrintMessage;
```

但有时候，这个方法**只用一次**，还要专门为它起个名字，很麻烦。匿名函数就是来解决这个问题的——**不用起名字，直接写逻辑**。

**核心用途：**

匿名函数**主要是配合委托和事件使用的**。脱离委托和事件，匿名函数基本不会用到。它让你在需要委托的地方，直接写方法逻辑，不用单独声明一个方法。

**打个比方：**

普通方法像**提前做好的一道菜**——你给它起个名字，放在菜谱里，需要的时候端上来。匿名函数像**现做现吃**——不用起名字，也不用写进菜谱，需要的时候直接做，做完就完事。

**匿名函数的两种写法：**

C# 中匿名函数有两种写法：

- **delegate 写法**：`delegate (参数) { 代码 };`
    
- **Lambda 写法**：`(参数) => { 代码 };`（第30课会详细讲）
==二：格式==

**delegate 写法的格式：**

```csharp

delegate (参数列表)
{
    // 函数体
};
```

**配合委托使用：**

```csharp

// 声明委托
delegate void MyDelegate(string msg);
// 用匿名函数赋值
MyDelegate del = delegate (string msg)
{
    Console.WriteLine(msg);
};
// 调用
del("唐老狮");

```
**匿名函数也可以有返回值：**

```csharp

delegate int Calc(int a, int b);
Calc add = delegate (int a, int b)
{
    return a + b;
};
Console.WriteLine(add(3, 5)); // 8
```

**关键格式要点：**

- `delegate` 关键字后面直接跟参数列表，**没有方法名**
    
- 参数列表的类型可以省略（编译器能推断时）
    
- 最后要加分号 `;`
==三：代码==

### 基础使用：配合委托

```csharp

using System;
// 声明委托
delegate void SayHello(string name);
class Program
{
    static void Main()
    {
        // 用匿名函数赋值，不用先写一个具名方法
        SayHello say = delegate (string name)
        {
            Console.WriteLine("你好，" + name);
        };
        say("唐老狮");   // 输出：你好，唐老狮
        // 换一个匿名函数
        say = delegate (string name)
        {
            Console.WriteLine("Hello, " + name);
        };
        say("唐老狮");   // 输出：Hello, 唐老狮
    }
}
```

**观察：** 不需要写 `static void Chinese(...)` 这样的具名方法，直接在赋值的地方写逻辑。

### 匿名函数配合多播委托

```csharp

delegate void Notify(string message);
class Program
{
    static void Main()
    {
        Notify notify = delegate (string msg)
        {
            Console.WriteLine("控制台：" + msg);
        };
        // 可以再 += 一个匿名函数
        notify += delegate (string msg)
        {
            Console.WriteLine("日志：" + msg);
        };
        notify("系统启动");
        // 输出：
        // 控制台：系统启动
        // 日志：系统启动
    }
}
```

### 匿名函数配合事件

```csharp

class Heater
{
    public event Action<int> OnBoiled;
    private int temperature = 0;
    public void PowerOn()
    {
        temperature = 95;
        OnBoiled?.Invoke(temperature);
    }
}
class Program
{
    static void Main()
    {
        Heater heater = new Heater();
        // 用匿名函数订阅事件，不用单独写一个方法
        heater.OnBoiled += delegate (int temp)
        {
            Console.WriteLine($"水温已达到：{temp}度，水开了！");
        };
        heater.PowerOn();
    }
}
```

**观察：** 订阅事件时直接用匿名函数，代码更紧凑。

### 匿名函数作为方法参数

```csharp

delegate bool Compare(int a, int b);
class Program
{
    static void Sort(int[] arr, Compare compare)
    {
        for (int i = 0; i < arr.Length - 1; i++)
        {
            for (int j = 0; j < arr.Length - 1 - i; j++)
            {
                if (compare(arr[j], arr[j + 1]))
                {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }
    static void Main()
    {
        int[] arr = { 3, 1, 4, 1, 5, 9, 2, 6 };
        // 直接用匿名函数作为比较规则，不用先定义 Ascending 方法
        Sort(arr, delegate (int a, int b) { return a > b; });  // 升序
        Console.WriteLine(string.Join(", ", arr));
        Sort(arr, delegate (int a, int b) { return a < b; });  // 降序
        Console.WriteLine(string.Join(", ", arr));
    }
}

```
**这就是你上一课学委托时那个例子的“匿名函数版”**——不用先写 `Ascending` 和 `Descending` 两个具名方法，直接在调用时写规则。
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|**概念**|没有名字的函数，直接写在需要的地方|
|**关键字**|`delegate`|
|**格式**|`delegate (参数) { 代码 };`|
|**主要用途**|**配合委托和事件使用**|
|**好处**|不用单独声明具名方法，代码更紧凑|
|**本质**|编译器自动生成一个方法，只是你没给它起名字|

### 匿名函数 vs 具名方法

|具名方法|匿名函数|
|---|---|---|
|有没有名字|✅ 有|❌ 没有|
|定义位置|类里面，单独定义|直接写在委托赋值处|
|复用性|✅ 可以多处调用|❌ 通常只用一次|
|代码量|多（要写方法声明）|少（直接写逻辑）|
|配合委托|需要先定义再赋值|直接赋值|

### 什么时候用匿名函数？

- **方法只用一次**，不想为它单独起名字时
    
- **配合委托或事件**，临时写一段逻辑时
    
- **方法逻辑很短**，写在赋值处更直观时
    

### 匿名函数的两种写法对比

```csharp

// delegate 写法（第28课）
Action<string> action1 = delegate (string msg)
{
    Console.WriteLine(msg);
};
// Lambda 写法（第30课，更简洁）
Action<string> action2 = (msg) =>
{
    Console.WriteLine(msg);
};
```

**Lambda 是匿名函数的简写形式**，第30课会专门讲。先掌握 delegate 写法，理解匿名函数的本质，再学 Lambda 会更轻松。

### 一句话总结

> **匿名函数就是“没有名字的函数”——需要委托的时候，直接在赋值处写逻辑，不用先声明一个具名方法。它主要是为了配合委托和事件使用的。**

### 和你之前知识的联系

|你学过的|和匿名函数的关系|
|---|---|
|**委托**|匿名函数是委托的“快捷写法”|
|**事件**|匿名函数可以用于订阅事件|
|**多播委托**|匿名函数可以 `+=` 到多播委托上|
|**Lambda（第30课）**|匿名函数的简写形式|
|**闭包（第30课）**|匿名函数能“记住”外部变量|

**匿名函数是委托和事件之间的桥梁，也是 Lambda 表达式的基础。你现在把 delegate 写法搞懂，第30课的 Lambda 会非常轻松。**