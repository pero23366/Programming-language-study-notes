==零：补充==
1. **`[controller]`**：替换为**控制器类的名字**，去掉后缀 `Controller`。
    
    - `UserController` → `User`
        
    - `RetryController` → `Retry`
        
2. **`[action]`**：替换为**方法的名字**。
    
    - `public string Get()` → `Get`
        
    - `public string Download()` → `Download`

==一：概念==

**特性是什么？**

特性是一种**贴在代码上的“标签”**，用来给类、方法、字段等添加**额外的描述信息**。这些信息**不是代码逻辑本身**，但需要在运行时被读取和使用。

**特性的本质：**

特性**本身就是一个类**，必须继承自 `System.Attribute`。比如 `[Obsolete]` 的真实类名是 `ObsoleteAttribute`，C# 允许使用时省略 `Attribute` 后缀。

**为什么需要特性？**

有些信息**无法用普通代码表达**：

- “这个方法已经过时了，别用了”
    
- “这个字段在 Inspector 里显示为‘血量’”
    
- “这个插件叫扫雷，版本 1.0”
    

这些信息需要**标注**在代码上，**反射**负责读取。

**打个比方：**

特性就像**商品上的标签**。杯子本身不会告诉你它的材质、产地、使用说明，但标签上有。**特性是贴在代码上的标签，反射是读标签的工具。**
==辅助反射筛选对象==

**核心特点：**

|特点|说明|
|---|---|
|**本质**|继承自 `System.Attribute` 的类|
|**作用**|给代码元素添加元数据|
|**读取方式**|运行时通过反射读取|
|**位置**|写在方括号 `[]` 中，放在代码元素上方|
|**编译后**|**保留**在 .dll 的元数据里，反射能读到|
==二：格式==
**使用内置特性：**

```csharp

[特性名]
[特性名(参数)]
```

**特性可以贴的位置：**

```csharp

[Serializable]              // 贴在类上
public class Student
{
    [Obsolete("请使用新方法")]  // 贴在方法上
    public void OldMethod() { }
    [NonSerialized]          // 贴在字段上
    public int temp;
}
```

**自定义特性的定义格式：**

```csharp

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class MyAttribute : Attribute
{
    public string Name { get; set; }
    public MyAttribute(string name)
    {
        Name = name;
    }
}
```

**`AttributeUsage` 的三个参数：**

|参数|作用|
|---|---|
|`AttributeTargets`|规定能贴在哪里（Class、Method、Field 等）|
|`AllowMultiple`|能否重复贴，默认 `false`|
|`Inherited`|能否被子类继承，默认 `true`|

**`AttributeTargets` 常用值：**

|值|含义|
|---|---|
|`Class`|类|
|`Method`|方法|
|`Property`|属性|
|`Field`|字段|
|`All`|所有位置|

### ==`AttributeTargets` 是什么？==

**它是一个枚举**，枚举了“特性可以贴在哪里”。

```csharp

public enum AttributeTargets
{
    Assembly = 1,      // 程序集
    Module = 2,        // 模块
    Class = 4,         // 类
    Struct = 8,        // 结构体
    Enum = 16,         // 枚举
    Constructor = 32,  // 构造函数
    Method = 64,       // 方法
    Property = 128,    // 属性
    Field = 256,       // 字段
    Event = 512,       // 事件
    Interface = 1024,  // 接口
    Parameter = 2048,  // 参数
    Delegate = 4096,   // 委托
    ReturnValue = 8192,// 返回值
    GenericParameter = 16384, // 泛型参数
    All = 32767        // 所有位置
}
```

**为什么可以用 `|` 连接？**

因为它是**标志枚举**（每个值都是 2 的幂），可以用按位或 `|` 组合：

```csharp

AttributeTargets.Class | AttributeTargets.Method
// 意思：既能贴类，也能贴方法
```

### `AllowMultiple` 是什么？

**它是一个命名参数，类型是 `bool`。**

```csharp

[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
```

- `false`（默认）：同一个位置**只能贴一次**
    
- `true`：同一个位置**可以贴多次**
    

```csharp

// AllowMultiple = false
[My("A")]
[My("B")]   // ❌ 报错：不能重复贴
class Student { }
// AllowMultiple = true
[My("A")]
[My("B")]   // ✅ 可以
class Student { }
```

### `Inherited` 是什么？

**也是一个命名参数，类型是 `bool`。**

```csharp

[AttributeUsage(AttributeTargets.Class, Inherited = true)]
```

- `true`（默认）：子类**会继承**父类上的特性
    
- `false`：子类**不会继承**
    

```csharp

[My]           // Inherited = true 时
class Animal { }
class Dog : Animal { }
// Dog 也有 [My] 特性（继承来的）
[My]           // Inherited = false 时
class Animal { }
class Dog : Animal { }
// Dog 没有 [My] 特性
```

### 命名参数是什么？

`AttributeUsage` 的构造函数只有一个必填参数 `AttributeTargets`，`AllowMultiple` 和 `Inherited` 是**命名参数**，可以写也可以不写：

```csharp

// 只写第一个
[AttributeUsage(AttributeTargets.Class)]
// 写两个
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
// 写三个
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = false)]

```
**不写的就用默认值：**

- `AllowMultiple` 默认 `false`
    
- `Inherited` 默认 `true`
    

### 完整拆解

```csharp

[AttributeUsage(
    AttributeTargets.Class | AttributeTargets.Method,  // 能贴类和方法
    AllowMultiple = false,   // 不能重复贴
    Inherited = true         // 能被子类继承
)]
public class MyAttribute : Attribute { }

```
**翻译成人话：**

> “MyAttribute 这个特性，只能贴在类和方法上，同一个位置只能贴一次，子类可以继承父类上的这个特性。”

==三：代码==

### 内置特性

```csharp

using System;
class Program
{
    [Obsolete("这个方法已经过时了，请使用NewMethod")]
    static void OldMethod()
    {
        Console.WriteLine("旧方法");
    }
    static void NewMethod()
    {
        Console.WriteLine("新方法");
    }
    static void Main()
    {
        OldMethod();  // 编译器警告，但能编译
        NewMethod();
    }
}
```

**`[Obsolete]` 第二个参数设为 `true` 时，编译直接报错：**

```csharp

[Obsolete("已过时", true)]
static void OldMethod() { }
// OldMethod();  // ❌ 编译报错
```

### 自定义特性

```csharp

using System;
using System.Reflection;
// 1. 定义特性
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class AuthorAttribute : Attribute
{
    public string Name { get; set; }
    public string Date { get; set; }
    public AuthorAttribute(string name)
    {
        Name = name;
    }
}
```
// 2. 使用特性
```csharp
[Author("唐老狮", Date = "2024-01-01")]
class MyClass
{
    [Author("枕头")]
    public void MyMethod() { }
}
// 3. 通过反射读取特性
class Program
{
    static void Main()
    {
        Type t = typeof(MyClass);
        AuthorAttribute attr = (AuthorAttribute)t.GetCustomAttribute(typeof(AuthorAttribute));
        if (attr != null)
            Console.WriteLine($"类作者：{attr.Name}，日期：{attr.Date}");
        var method = t.GetMethod("MyMethod");
        AuthorAttribute methodAttr = (AuthorAttribute)method.GetCustomAttribute(typeof(AuthorAttribute));
        if (methodAttr != null)
            Console.WriteLine($"方法作者：{methodAttr.Name}");
    }
}

```
**一句话：**

> **Debug/Release 是编译配置，决定了哪些预定义符号被定义。`AttributeUsage` 的三个参数，是规定自定义特性“能贴哪里、能不能重复、能不能继承”。**
### 桌宠插件实战

```csharp

// 定义插件特性
[AttributeUsage(AttributeTargets.Class)]
public class PluginInfoAttribute : Attribute
{
    public string Name { get; }
    public string Version { get; }
    public PluginInfoAttribute(string name, string version)
    {
        Name = name;
        Version = version;
    }
}
// 插件类使用特性
[PluginInfo("扫雷", "1.0")]
public class MineSweeperPlugin : IGame { }
[PluginInfo("贪吃蛇", "1.0")]
public class SnakePlugin : IGame { }
// 主程序自动扫描
Assembly asm = Assembly.LoadFrom("Minesweeper.dll");
foreach (Type t in asm.GetTypes())
{
    var info = t.GetCustomAttribute<PluginInfoAttribute>();
    if (info != null)
        Console.WriteLine($"发现插件：{info.Name} v{info.Version}");
}
```
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|**概念**|贴在代码上的“标签”，添加元数据|
|**本质**|继承自 `System.Attribute` 的类|
|**格式**|`[特性名(参数)]` 写在代码元素上方|
|**读取**|反射的 `GetCustomAttribute`|
|**自定义**|继承 `Attribute`，用 `AttributeUsage` 限定范围|

### 特性 vs 注释

|注释|特性|
|---|---|---|
|给谁看|人|程序（反射）|
|编译后|消失|**保留在元数据里**|
|能否被程序读取|❌|✅|
|能否影响程序行为|❌|✅|

### 常用内置特性

| 特性                 | 作用           |
| ------------------ | ------------ |
| `[Obsolete]`       | 标记过时         |
| `[Serializable]`   | 标记可序列化       |
| `[Conditional]`    | 条件编译         |
| `[AttributeUsage]` | 限定自定义特性的使用范围 |

==***特性本质是类***==


==条件编译==
**符号名**通常用 `DEBUG`、`TRACE` 等预定义符号。
==自定义特性==

**参数 1：`AttributeTargets`（能贴在哪里）**

|值|含义|
|---|---|
|`Class`|类|
|`Method`|方法|
|`Property`|属性|
|`Field`|字段|
|`Parameter`|参数|
|`All`|所有位置|

多个用 `|` 连接：

```csharp

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
```

**参数 2：`AllowMultiple`（能否重复贴）**

```csharp

// AllowMultiple = false（默认）：只能贴一次
[My("A")]
[My("B")]   // ❌ 报错
class Student { }
// AllowMultiple = true：可以贴多次
[My("A")]
[My("B")]   // ✅ 可以
class Student { }
```

**参数 3：`Inherited`（能否被子类继承）**

```csharp

[AttributeUsage(AttributeTargets.Class, Inherited = true)]
class MyAttribute : Attribute { }
[My]
class Animal { }
class Dog : Animal { }   // Dog 也会“继承”到 [My] 特性

```
```csharp

[AttributeUsage(AttributeTargets.Class, Inherited = false)]
class MyAttribute : Attribute { }
[My]
class Animal { }
class Dog : Animal { }   // Dog 没有 [My] 特性
```
### 自定义特性四步

1. **定义**：继承 `Attribute`
    
2. **限定**：用 `[AttributeUsage]` 规定能贴哪里
    
3. **使用**：用 `[MyAttribute(...)]` 贴在代码上
    
4. **读取**：反射 `GetCustomAttribute`
    

### 一句话总结

> **特性是贴在代码上的“标签”，编译后保留在元数据里。它本身不做任何事，真正干活的是反射——反射读取标签，根据标签内容做相应处理。它让框架能“自动发现”信息，不用手动维护。**