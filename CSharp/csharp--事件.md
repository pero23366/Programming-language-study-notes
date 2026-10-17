==零：补充==

|          | `   Action`    | `Func`             |
| -------- | -------------- | ------------------ |
| **返回值**  | **无返回值**（void） | **有返回值**           |
| **泛型参数** | 全部是参数类型        | 最后一个是返回值类型，前面是参数类型 |

**举例：**

```csharp

Action           → void 方法()              无参无返回
Action<string>   → void 方法(string)        一个参数无返回
Action<int,int>  → void 方法(int, int)      两个参数无返回
Func<int>            → int 方法()               无参返回int
Func<string, int>    → int 方法(string)         一个参数返回int
Func<int,int,bool>   → bool 方法(int, int)      两个参数返回bool
```

**关键：`Func` 的最后一个泛型参数永远是返回值类型，前面的都是参数类型。**

### 它们的内部构造是什么？

`Action` 和 `Func` 本质上就是**委托**。它们的源码（简化版）大概长这样：

```csharp

// Action 的源码（简化）
public delegate void Action();
// Action<T> 的源码（简化）
public delegate void Action<in T>(T obj);
// Func<TResult> 的源码（简化）
public delegate TResult Func<out TResult>();
// Func<T, TResult> 的源码（简化）
public delegate TResult Func<in T, out TResult>(T arg);
```

`?.` 叫**空条件运算符**（也叫空传播运算符）。
**一句话：`?.` 就是“如果左边是 null，就跳过，不报错”。它是防止空引用异常的利器。**
### 它的作用

**如果 `?.` 左边是 `null`，就什么都不做，直接返回 `null`，不报错。**


**你看，它们就是 `delegate` 声明，只是官方帮你写好了，放在 `System` 命名空间里，你直接用就行。**

==一：概念==

**事件是什么？**

事件本质上就是**委托的一个“安全版本”**。它基于委托实现，但加上了**访问限制**，让外部代码只能“订阅”和“取消订阅”，不能随意触发或清空。

**为什么需要事件？**

直接用 `public` 委托有个巨大的安全隐患：任何外部代码都可以**直接调用**它来触发通知，甚至用 `=` 把它**整个置空**，这完全破坏了封装性[](https://zhuanlan.zhihu.com/p/657018306#3)。

**事件的本质：对委托的封装**

事件就像给委托加了一把“锁”：

- **对外部**：只开放 `+=`（订阅）和 `-=`（取消订阅）两个操作。
    
- **对内部**：只有**声明事件的类自己**才能触发（调用）这个事件。
    

**打个比方：**

- **委托**就像你家**没锁的广播按钮**。任何路过的人（外部类）都能按一下（触发事件），甚至能把按钮拆走（置空委托）。
    
- **事件**就像给按钮加了一个**只有你能打开的锁盒**。外面的人只能通过投币口“订阅”你的广播（`+=`），但**只有你**（声明事件的类）能打开锁盒，按下按钮触发广播。
    

**事件和委托的核心区别：**

|特性|委托 (Delegate)|事件 (Event)|
|---|---|---|
|**外部触发**|✅ 任何地方都能调用|❌ **只有声明事件的类内部**能调用|
|**外部赋值**|✅ 可以用 `=` 直接赋值|❌ **只能用 `+=` / `-=`**|
|**外部置空**|✅ 可以用 `= null` 清空|❌ **不行**，保护了订阅列表|
|**本质**|方法的容器|**加了访问限制的委托**|
==二：格式==

**事件的声明格式：**

```csharp

// 第一步：先声明一个委托（定义事件的“格式”）
public delegate void 委托名(参数列表);
// 第二步：用 event 关键字声明事件
public event 委托名 事件名;
```

**使用系统自带的委托（更常用）：**

```csharp

// Action 无返回值，Func 有返回值
public event Action 事件名1;              // 无参无返回值
public event Action<string> 事件名2;      // 带一个 string 参数

```
**事件的使用格式：**

```csharp

// 订阅事件（在外部类中）
对象.事件名 += 处理方法;
// 取消订阅
对象.事件名 -= 处理方法;
// 触发事件（只能在声明事件的类内部）
事件名?.Invoke(参数);  // 安全写法：有订阅者才触发
事件名(参数);          // 不推荐，可能报空引用异常
```
==三：代码==

### 基础示例：热水器

我们用唐老狮课后的经典习题“热水器”来演示[](https://blog.csdn.net/qiushubo/article/details/120969359)。

```csharp

using System;
// 热水器类（事件发布者）
class Heater
{
    // 声明事件
    public event Action<int> OnBoiled;
    private int temperature = 0;
    // 通电加热
    public void PowerOn()
    {
        Console.WriteLine("热水器通电...");
        temperature = 95;
        // 触发事件（只能在Heater类内部触发）
        OnBoiled?.Invoke(temperature);
    }
}
class Program
{
    static void Main()
    {
        Heater heater = new Heater();
        // 订阅事件（在外部类中）
        heater.OnBoiled += ShowTemperature;  // 订阅方法1
        heater.OnBoiled += PlaySound;        // 订阅方法2
        // 通电，触发事件
        heater.PowerOn();
        // 取消订阅
        heater.OnBoiled -= PlaySound;
        Console.WriteLine("--- 取消声音提醒 ---");
        heater.PowerOn();
        // ❌ 下面这些操作会报错，因为事件的外部访问被限制了
        // heater.OnBoiled = null;          // 错误：不能在外部直接赋值
        // heater.OnBoiled(100);            // 错误：不能在外部直接触发
    }
    static void ShowTemperature(int temp)
    {
        Console.WriteLine($"水温已达到：{temp}度，水开了！");
    }
    static void PlaySound()
    {
        Console.WriteLine("叮——水开了！");
    }
}
```

**输出：**

```text

热水器通电...
水温已达到：95度，水开了！
叮——水开了！
--- 取消声音提醒 ---
热水器通电...
水温已达到：95度，水开了！
```
==四：总结==

### 核心要点

| 要点       | 说明                              |
| -------- | ------------------------------- |
| **本质**   | 对委托的封装，加上了访问限制                  |
| **关键字**  | `event`                         |
| **外部操作** | 只能 `+=` 订阅，`-=` 取消订阅            |
| **内部操作** | 只有声明事件的类内部能触发                   |
| **安全触发** | `事件名?.Invoke(...)`              |
| **标准模式** | `EventHandler<T>` + `EventArgs` |

### 事件 vs 委托 速查

|委托|事件|
|---|---|---|
|外部触发|✅ 可以|❌ **不行**|
|外部赋值 (`=`)|✅ 可以|❌ **不行**|
|外部置空|✅ 可以|❌ **不行**|
|外部订阅 (`+=`)|✅ 可以|✅ 可以|
|本质|方法容器|**加了锁的委托**|

### 为什么用事件？

- **保护封装**：防止外部代码随意触发或清空你的委托[](https://zhuanlan.zhihu.com/p/657018306#3)。
    
- **明确职责**：只有“发布者”能触发，“订阅者”只能被动接收。
    
- **低耦合**：发布者不需要知道订阅者是谁，只需在事件发生时发出通知。
    

### 一句话总结

> **事件就是一把“锁”，把委托的触发权锁在了类的内部，只留下 `+=` 和 `-=` 两个口子给外部订阅。**