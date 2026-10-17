==一：概念==

**多线程是什么？**

多线程是指**在一个程序中同时运行多个执行路径**。每个执行路径称为一个“线程”，它们**并发执行**，各自完成不同的任务。

**为什么需要多线程？**

默认情况下，C#程序只有一个**主线程**，所有代码都在这条线上排队执行。如果某个操作很耗时（比如下载文件、加载大资源），主线程就会被“卡住”，后面的代码都得等着。

多线程就是来解决这个问题的——**把耗时操作放到另一个线程去跑，主线程继续做自己的事，互不干扰。**

**打个比方：**

- **单线程**：一家餐厅只有一个厨师，他做完一道菜才能做下一道。客人点了个炖汤（要等1小时），后面所有客人都得干等。
    
- **多线程**：餐厅有多个厨师。一个厨师去炖汤，其他厨师继续炒菜，互不影响。
    

**核心概念：**

|概念|说明|
|---|---|
|**进程**|一个正在运行的程序，拥有独立的内存空间|
|**线程**|进程中的一个执行路径，共享进程的内存|
|**主线程**|程序启动时自动创建的第一个线程|
|**子线程**|手动创建的其他线程|
|**前台线程**|只要有一个前台线程在跑，程序就不会退出|
|**后台线程**|所有前台线程结束后，后台线程会被强制终止|
|**线程同步**|多个线程访问共享资源时，保证数据不出错|
|**锁（lock）**|保证同一时间只有一个线程能访问某段代码|

**Unity中的重要限制：**

Unity中**大部分API只能在主线程调用**（如 `transform.Translate`、`Instantiate`、`Destroy`）。子线程通常用于**纯数据计算**（如寻路算法、地图生成），计算完再把结果交给主线程使用。
==二：格式==
**引入命名空间：**

```csharp

using System.Threading;
```

**创建和启动线程：**

```csharp

// 1. 创建线程，传入一个方法名
Thread thread = new Thread(方法名);
// 2. 启动线程
thread.Start();
// 3. 等待线程结束（可选）
thread.Join();
```

**传递参数：用Lambda（推荐）**

```csharp

Thread thread = new Thread(() =>
{
    // 可以直接使用外部变量
});
thread.Start();

```
**常用方法：**

|方法/属性|作用|
|---|---|
|`Start()`|启动线程|
|`Join()`|等待该线程执行完毕|
|`Sleep(毫秒)`|让当前线程暂停指定毫秒|
|`IsAlive`|线程是否还在运行|
|`IsBackground`|是否为后台线程|
|`Name`|线程名称（调试用）|
|`CurrentThread`|获取当前正在执行的线程|

**lock的格式：**

```csharp

private readonly object lockObj = new object();
lock (lockObj)
{
    // 需要保护的代码
}
```
==三：代码==

### 基础使用：创建子线程

```csharp

using System;
using System.Threading;
class Program
{
    static void Main()
    {
        Console.WriteLine("主线程开始");
        Thread thread = new Thread(DoWork);
        thread.Start();
        Console.WriteLine("主线程继续做自己的事");
        thread.Join();   // 等子线程结束
        Console.WriteLine("主线程结束");
    }
    static void DoWork()
    {
        Console.WriteLine("子线程开始工作");
        Thread.Sleep(2000);
        Console.WriteLine("子线程工作完成");
    }
}
```

**输出（顺序可能不同）：**

```text

主线程开始
主线程继续做自己的事
子线程开始工作
（等2秒）
子线程工作完成
主线程结束

```
### 线程安全问题与lock

```csharp

static int counter = 0;
static readonly object lockObj = new object();
static void Increment()
{
    for (int i = 0; i < 100000; i++)
    {
        lock (lockObj)  // 同一时间只有一个线程能进来
        {
            counter++;
        }
    }
}
static void Main()
{
    Thread t1 = new Thread(Increment);
    Thread t2 = new Thread(Increment);
    t1.Start();
    t2.Start();
    t1.Join();
    t2.Join();
    Console.WriteLine(counter);  // 200000
}
```

**不加 `lock` 会出错：** `counter++` 分三步（读→加→写），两个线程可能同时读到同一个值，导致加法“丢失”。

### 前台线程 vs 后台线程

```csharp

Thread thread = new Thread(DoWork);
thread.IsBackground = true;  // 设为后台线程
thread.Start();
// 主线程结束后，后台线程被强制终止

```
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|**概念**|同时运行多个执行路径|
|**命名空间**|`System.Threading`|
|**创建线程**|`new Thread(方法名)` + `Start()`|
|**等待线程**|`Join()`|
|**暂停线程**|`Thread.Sleep(毫秒)`|
|**线程安全**|多线程访问共享资源要加 `lock`|
|**前台/后台**|前台拖住程序，后台不拖|

### 方法速查

|方法/属性|作用|
|---|---|
|`Start()`|启动线程|
|`Join()`|等待线程结束|
|`Sleep(ms)`|暂停当前线程|
|`IsBackground`|设为后台线程|
|`CurrentThread`|获取当前线程|

### 线程安全要点

|要点|说明|
|---|---|
|**问题**|多线程同时修改共享变量会出错|
|**原因**|`counter++` 不是原子操作（读→加→写）|
|**解决**|用 `lock` 保证同一时间只有一个线程访问|
|**锁对象**|用 `private readonly object`，不要用 `this`|

### 前台 vs 后台

|前台线程|后台线程|
|---|---|---|
|程序退出时|等它跑完|强制终止|
|默认|`new Thread()` 默认前台|需手动设 `IsBackground = true`|
|比喻|正式员工|临时工|

### 什么时候用多线程？

- 需要**执行耗时操作**，不想卡住主线程时
    
- 需要**并行计算**，提高性能时
    
- **Unity中**：纯数据计算（寻路、地图生成），但**不能调用Unity API**
    

### 一句话总结

> **多线程就是“多开一条线”让耗时操作在后台跑，主线程继续做自己的事。但多个线程同时改同一个数据会出错，需要用 `lock` 保护。Unity中，子线程只能做纯计算，不能碰Unity的API。**