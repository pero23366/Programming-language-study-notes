==一：概念==

**预处理器指令是什么？**

预处理器指令是**指导编译器在实际编译开始之前，对源代码进行预处理**的特殊命令。它们就像给编译器看的“备注”，告诉编译器哪些代码需要编译、哪些不需要，或者在编译前需要做什么准备工作。

**为什么需要它？**

你写代码时，可能会遇到这些场景：

- 需要**根据不同的运行环境**（比如开发版 vs 发布版）编译不同的代码。
    
- 需要**临时注释掉一大段代码**进行调试。
    
- 需要**让编译器发出自定义的警告或错误**。
    

预处理器指令就是用来解决这些问题的。

**核心特点：**

|特点|说明|
|---|---|
|**以 `#` 开头**|所有预处理器指令都以 `#` 开始|
|**不是语句**|所以**不需要以分号 `;` 结尾**|
|**单独占一行**|指令必须出现在自己的一行（前面可以有空白）|
|**编译前生效**|在编译真正开始前，预处理阶段就已经处理完了|

**打个比方：**

预处理器指令就像**给装修队（编译器）的“施工备注”**。在真正开始砌墙（编译）之前，你先告诉工头：“这面墙先别砌（`#if`）”、“这段材料要特殊处理（`#define`）”。工头根据你的备注，决定最终怎么施工。

**常见的预处理器指令：**

|指令|作用|
|---|---|
|`#define`|定义一个符号（类似一个没有值的变量）|
|`#undef`|取消 `#define` 定义的符号，让它失效|
|`#if` / `#elif` / `#else` / `#endif`|条件编译，根据符号是否存在决定编译哪段代码|
|`#warning`|让编译器发出一个警告|
|`#error`|让编译器报一个错误|
|`#region` / `#endregion`|折叠代码块（你在Visual Studio里用的折叠功能）|

**Unity中的常见用途：**

- **平台差异化代码**：用 `#if UNITY_EDITOR` 或 `#if UNITY_ANDROID` 来编写只在特定平台下编译的代码。
    
- **调试代码**：用 `#if DEBUG` 来包裹只在调试模式下运行的日志输出。
==二：格式==

**`#define` 和 `#undef` 格式：**

```csharp

#define 符号名
#undef 符号名
```

**注意：** 这两个指令**必须写在脚本文件的最前面**（所有 `using` 语句之前）。

**条件编译格式：**

```csharp

#if 符号名
    // 如果符号被定义，编译这里的代码
#elif 另一个符号名
    // 否则，如果另一个符号被定义，编译这里的代码
#else
    // 否则，编译这里的代码
#endif

```
**`#warning` 和 `#error` 格式：**

```csharp

#warning 自定义警告信息
#error 自定义错误信息
```

**`#region` 和 `#endregion` 格式：**

```csharp

#region 区域说明
    // 需要折叠的代码
#endregion
```
==三：代码==

### `#define` 和 `#undef`

```csharp

// 必须写在文件最前面
#define DEBUG_MODE
//#undef DEBUG_MODE
using System;
class Program
{
    static void Main()
    {
        #if DEBUG_MODE
            Console.WriteLine("调试模式已开启");
        #else
            Console.WriteLine("正常运行模式");
        #endif
    }
}
```

**输出：** `调试模式已开启`

**说明：** `#define DEBUG_MODE` 定义了 `DEBUG_MODE` 符号，所以 `#if DEBUG_MODE` 条件成立，编译调试模式代码。如果你把 `#define` 注释掉，就会输出“正常运行模式”。

### `#if` / `#elif` / `#else` / `#endif`

```csharp

#define PROFESSIONAL
using System;
class Program
{
    static void Main()
    {
        #if PROFESSIONAL
            Console.WriteLine("专业版功能已解锁");
        #elif STANDARD
            Console.WriteLine("标准版功能");
        #else
            Console.WriteLine("免费版功能");
        #endif
    }
}
```

**输出：** `专业版功能已解锁`

**说明：** `#if` / `#elif` / `#else` / `#endif` 的逻辑和普通的 `if` / `else if` / `else` 完全一样，只是它是在**编译前**判断的。

### `#warning` 和 `#error`

```csharp

#define TEST
using System;
class Program
{
    static void Main()
    {
        #if TEST
            #warning 这是一个测试警告
        #endif
        // 取消注释下面这行，编译会直接报错
        // #error 这是一个测试错误
        Console.WriteLine("程序继续运行");
    }
}
```

**说明：** `#warning` 会让编译器在“错误列表”中显示一个警告，但程序还能编译。`#error` 则会让编译器直接报错，**阻止程序编译**。

### `#region` 和 `#endregion`

```csharp

using System;
class Program
{
    static void Main()
    {
        #region 初始化部分
        Console.WriteLine("初始化...");
        int a = 10;
        int b = 20;
        #endregion
        #region 计算部分
        int sum = a + b;
        Console.WriteLine("结果：" + sum);
        #endregion
    }
}
```

**说明：** `#region` 和 `#endregion` 只是**代码折叠**用的，不影响编译。你在Visual Studio或Rider里可以点击 `#region` 旁边的减号，把整块代码折叠起来。

### Unity实战：平台差异化代码

```csharp

using UnityEngine;
public class PlatformTest : MonoBehaviour
{
    void Start()
    {
        #if UNITY_EDITOR
            Debug.Log("当前在Unity编辑器模式下运行");
        #elif UNITY_ANDROID
            Debug.Log("当前在Android设备上运行");
        #elif UNITY_IOS
            Debug.Log("当前在iOS设备上运行");
        #else
            Debug.Log("当前在其他平台运行");
        #endif
        // 只在调试模式下输出日志
        #if DEBUG
            Debug.Log("这是调试日志");
        #endif
    }
}
```

**说明：** Unity内置了很多平台符号（如 `UNITY_EDITOR`、`UNITY_ANDROID`、`UNITY_IOS`、`DEBUG` 等），你可以用它们来编写只在特定平台或配置下编译的代码。
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|**概念**|指导编译器在编译前进行预处理的命令|
|**格式**|以 `#` 开头，单独占一行，**不以分号结尾**|
|**`#define` / `#undef`**|定义/取消定义符号，**必须写在文件最前面**|
|**`#if` / `#elif` / `#else` / `#endif`**|条件编译，根据符号是否存在决定编译哪段代码|
|**`#warning` / `#error`**|让编译器发出警告或错误|
|**`#region` / `#endregion`**|折叠代码块，不影响编译|

### 指令速查

|指令|作用|
|---|---|
|`#define`|定义符号|
|`#undef`|取消符号|
|`#if`|条件判断开始|
|`#elif`|否则如果|
|`#else`|否则|
|`#endif`|条件判断结束|
|`#warning`|发出警告|
|`#error`|报错|
|`#region` / `#endregion`|折叠代码|

### 什么时候用预处理器指令？

- **平台差异化**：根据运行平台编译不同代码（Unity中很常用）。
    
- **调试开关**：用 `#if DEBUG` 控制调试日志的输出。
    
- **版本控制**：免费版/专业版功能切换。
    
- **临时注释**：用 `#if false` 临时屏蔽一大段代码。
    

### 一句话总结

> **预处理器指令是给编译器的“施工备注”——在真正编译前，告诉它哪些代码要编译、哪些不要，或者让它发出警告/错误。**

### 和你之前知识的联系

|你学过的|和预处理器指令的关系|
|---|---|
|**普通 `if` 语句**|`#if` 语法类似，但 `#if` 在编译前判断，`if` 在运行时判断|
|**Unity平台符号**|Unity内置了 `UNITY_EDITOR`、`UNITY_ANDROID` 等符号，配合 `#if` 使用|
|**代码折叠**|`#region` 就是你在编辑器里折叠代码用的|