==零：补充==

> **这一节回答三个问题：这批语法为什么存在？没有它会怎样？你什么时候真的会用到它？**

## 它解决什么问题

P97–P101 这五节，讲的全部是 **C# 8 / 9 / 10 的语法糖**。糖这个字很重要——它们没有一个是"新能力"，全是"同样的东西，写起来更短"。

但 `using` 那一段是例外，它藏了一个真坑。

先看这批语法各自在省什么：

| 语法 | 你以前必须写 | 现在可以写 | 省掉的是 |
|---|---|---|---|
| 顶级语句 | `class Program { static void Main() { ... } }` | 直接写语句 | 一个类 + 一个方法 + 一层缩进 |
| 全局 using | 每个 `.cs` 文件顶部都 `using System;` | 写一次，全项目生效 | N 个文件的重复行 |
| using 声明 | `using (var a = ...) { using (var b = ...) { ... } }` | `using var a = ...;` 平铺 | 嵌套的花括号 |
| 文件范围命名空间 | `namespace X { ... }` 整文件包一层 | `namespace X;` 一行 | 一层花括号 + 全文件缩进 |
| 可空引用类型 | 无（`null` 全靠人脑记） | `string?` + 编译器警告 | 一类运行时崩溃 |
| record | 手写 `Equals`/`GetHashCode`/`==`/`ToString` | `record Person(string A, string B);` | 50 行样板代码 |

## 没有它会怎样

**最直接的后果：你看不懂别人的代码。**

这不是夸张。从 .NET 6 开始，新建任何一个项目，模板生成的 `Program.cs` 长这样：

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.Run();
```

**没有 `class`，没有 `Main`，没有 `namespace`。** 如果你不知道顶级语句，第一次看到会以为这是脚本文件，或者以为 `Main` 藏在某个看不见的地方。而它就在这个文件的第 1 行开始——只是被编译器折叠进了看不见的类里。

再看你现在写的项目。你打开 `Program.cs` 时它是几行？你写 Controller 时，文件顶部有 `using` 吗？如果 `<ImplicitUsings>enable</ImplicitUsings>` 开着，答案是**没有，但你照样能 `using Microsoft.AspNetCore.Mvc;` 里的类型**——因为全局 using 帮你引了。

**你以为你写的代码"本来就这样"，其实是你用的模板替你做了三件事，而你一件都没学过。** 这批课就是把这三件事说清楚。

## 它在整个生态里的位置

| 语法 | 引入版本 | 生态里的位置 |
|---|---|---|
| using 声明 | C# 8（2019） | **老项目里到处都是**，ADO.NET、文件流、`HttpClient` 全在用 |
| 可空引用类型 | C# 8（2019） | **现代 .NET 库的标配**，`System.Text.Json`、EF Core 的 API 签名全靠它表达"这个参数能不能传 null" |
| 顶级语句 | C# 9（2020） | ASP.NET Core 6+ 模板的**唯一写法**，Minimal API 全靠它 |
| record | C# 9（2020） | **DTO / 值对象 / 消息** 的首选类型，DDD 里的 Value Object 基本都用它 |
| 全局 using | C# 10（2021） | 项目模板默认开启，你已经在用而不知道 |
| 文件范围命名空间 | C# 10（2021） | 现在所有新文件都用它，老代码还是花括号 |

**看出规律没有：这批东西的时间点是 2019–2021，现在（.NET 10）已经是所有新代码的默认写法。**

你不学，不是在"少学一个进阶特性"，是在**读不懂 2021 年之后的 C# 代码**。

## 对你的实际意义

**第一，你现在手头的项目就在用它们。**

你的图书管理系统是 `net10.0`，`Program.cs` 用的是顶级语句，`.csproj` 里 `<Nullable>` 和 `<ImplicitUsings>` 大概率都是 `enable`。也就是说：

- 你之前看到 VS 里 `string` 下面有绿色波浪线 → 是 P99 的可空引用类型
- 你在 `Program.cs` 里没写 `using Microsoft.EntityFrameworkCore;` 却能用 `UseSqlServer` → 是 P97 的全局 using
- 你的 `Program.cs` 没有 `Main` 却能跑 → 是 P97 的顶级语句

**这三件事你已经"用过"了，只是不知道原理。** 这批课就是补这个账。

**第二，record 直接关系到你后面写 DTO。**

你之前写接口返回 `new { b.Id, b.Title, b.Price }`（匿名类型）。record 是它的"正式版"——有类型名、能当参数、能序列化、能值比较。等你做到前后端分离，返回给前端的模型基本都该是 record 或 record + 属性。

**第三，可空引用类型是"免费"的 bug 探测器。**

你已经踩过 `NullReferenceException` 吧？这个特性让编译器在你**写代码的时候**就告诉你"这里可能是 null"。它不会让程序变快，但会让你少调半小时的 bug。

## 诚实的话

这批课的信息密度**不高**，但价值是"扫盲"而不是"变强"。

- 顶级语句、全局 using、文件范围命名空间：**10 分钟能讲完的东西，视频讲了 30 分钟**，因为要反编译给你看。你只要记住"它们都是编译器替我省事"就够了。
- 可空引用类型：这个**必须认真学**，因为它影响你每天写代码时看到的警告，而且很多人误以为它"运行时真的检查了"——**没有，一行检查都没有**。
- record：**性价比最高的一节**。P100 学会用，P101 搞懂它生成了什么，之后你写 DTO 会快一倍。
- 唯一的真坑在 P98：**using 声明会把资源持有到方法结束**，你在方法中途读同一个文件就会崩。这个坑很隐蔽，报错信息还跟原因无关。

一句话：**前四节是"看懂别人代码"，第五节是"写出更好的代码"。**

---

==一：概念==

> 本篇覆盖 **P97–P101**：C# 新语法五节。
> 环境：控制台项目 **.NET 10 / C# 13**（这些语法在 .NET 6+ 全部可用，与 EF Core 无关，单独建个 Console 项目练）。
> 承接：这批课是 Part4 的开头，从这之后进入 ASP.NET Core 本体。**这批跟 EF Core 没关系**，是纯语言层。
> 反编译工具：**ILSpy**（免费开源，`View → Options → Decompiler → 把 C# 版本改成 8.0` 能看到编译器生成的原始代码）。视频里用的是这个。

---

# P97　C# 新语法 1：顶级语句与全局 using

**一句话：顶级语句让编译器替你写 `class Program` 和 `Main`；全局 using 让编译器替你写每个文件顶部的 `using`。两个都是"你看不见，但它写了"。**

## 顶级语句（C# 9）：`Main` 去哪了

**以前**，一个能跑的 C# 程序最少要这么多：

```csharp
namespace HelloWorld
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello, World!");
        }
    }
}
```

**现在**（C# 9 起）：

```csharp
Console.WriteLine("Hello, World!");
```

**一行。没有类，没有方法，没有命名空间。**

### 真相：编译器替你补了

把上面那个一行程序编译出来的 DLL 反编译（ILSpy，C# 版本切到 8.0），你会看到：

```csharp
using System;

[CompilerGenerated]
internal class Program
{
    private static void <Main>$(string[] args)
    {
        Console.WriteLine("Hello, World!");
    }
}
```

| 反编译出来的东西 | 谁生成的 | 为什么 |
|---|---|---|
| `internal class Program` | 编译器 | 程序集需要一个入口类，名字固定叫 `Program` |
| `[CompilerGenerated]` | 编译器 | 标记"这个类不是你写的，是我造的"，调试器会跳过它 |
| `<Main>$` | 编译器 | 方法名里的 `<` `>` 是 C# 标识符的合法字符，用来保证这个名字你**永远写不出来**，不会冲突 |
| `static` | 编译器 | 入口方法必须是静态的 |
| `void` + `string[] args` | 编译器 | 标准入口签名 |

> **`[CompilerGenerated]` 是什么**：`System.Runtime.CompilerServices` 命名空间下的特性（Attribute），意思是"此元素由编译器生成"。反编译器、调试器、代码分析工具看到它就知道"这不是人手写的"。`async`/`await` 生成的状态机类、record 生成的 `Equals`、lambda 生成的闭包类，全都带这个标记。

### 三条必须记住的规则

| 规则 | 说明 | 违反了会怎样 |
|---|---|---|
| **一个项目只能有一个文件有顶级语句** | 因为要生成唯一的 `Program` 类 | 编译错误 CS8802：`Only one compilation unit can have top-level statements` |
| **顶级语句必须是文件里的第一批语句** | 前面只能有 `using`、`extern`、注释 | 编译错误 CS8803 |
| **传统 `Main` 写法仍然支持** | 顶级语句不是替代品，是二选一 | 同时存在会冲突（两个入口） |

### 顶级语句里的两个特权

**特权一：可以直接 `await`。**

```csharp
await File.WriteAllTextAsync("e:/1.txt", "hello");   // 不需要 async Main
```
编译器会把 `<Main>$` 生成成 `async Task` 版本。**这是 Minimal API 能写得那么短的原因**——`app.RunAsync()` 直接 await。

**特权二：可以声明方法。**

```csharp
int i = 1, j = 2;
int w = Add(i, j);
Console.WriteLine(w);

int Add(int a, int b)     // 写在语句后面，不需要类
{
    return a + b;
}
```
反编译后 `Add` 变成 `Program` 类的一个 `private static` 方法。**注意：它不是局部函数，是类成员。** 所以你在另一个文件里 `Program.Add(...)` 是能调到的（如果它是 public 的话——默认是 private）。

## 全局 using（C# 10）：写一次，全项目生效

### 问题

一个 Web 项目有 200 个 `.cs` 文件，每个文件顶部都是这五行：

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
```

**1000 行重复，全是噪音。**

### 解法

```csharp
global using System.Text.Json;
global using System.Text.Json.Serialization;
global using MyApp.Models;
```

`global` 修饰符让这条 `using` **对整个项目（整个编译单元集）生效**。

| 写法 | 作用范围 |
|---|---|
| `using System.Text.Json;` | 当前**文件** |
| `global using System.Text.Json;` | 当前**项目**的所有文件 |
| `global using static System.Math;` | 全项目，且免类名调 `Sqrt()` |
| `global using Json = System.Text.Json.JsonSerializer;` | 全项目，别名 |

### 三条规则

| 规则 | 说明 |
|---|---|
| **必须在所有 `using` 和 `namespace` 之前** | 且**不能**写在 `namespace { }` 内部 |
| **习惯上单独建一个文件** | 惯例命名 `GlobalUsings.cs`，里面只有 `global using` 行 |
| **重复声明同一个全局 using 会报错** | CS8933：`The using directive ... appeared previously as global using` |

### `ImplicitUsings`：你已经在用而不知道

打开你项目的 `.csproj`，会看到：

```xml
<PropertyGroup>
  <ImplicitUsings>enable</ImplicitUsings>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

`<ImplicitUsings>enable</ImplicitUsings>` = **编译器自动帮你加一批 `global using`**。这批集合由 **SDK 类型**决定：

| SDK | 自动引入的命名空间 |
|---|---|
| `Microsoft.NET.Sdk`（控制台/类库） | `System`、`System.Collections.Generic`、`System.IO`、`System.Linq`、`System.Net.Http`、`System.Threading`、`System.Threading.Tasks` |
| `Microsoft.NET.Sdk.Web`（Web 项目） | 上面全部 + `System.Net.Http.Json`、`Microsoft.AspNetCore.Builder`、`Microsoft.AspNetCore.Hosting`、`Microsoft.AspNetCore.Http`、`Microsoft.AspNetCore.Routing`、`Microsoft.Extensions.Configuration`、`Microsoft.Extensions.DependencyInjection`、`Microsoft.Extensions.Hosting`、`Microsoft.Extensions.Logging` |

**这就是为什么你的 Controller 里没写 `using Microsoft.AspNetCore.Mvc;` 也能用 `[HttpGet]`——Web SDK 替你引了。**

> **想关掉**：`<ImplicitUsings>disable</ImplicitUsings>`。老项目迁移时常关掉，因为可能跟已有的 `using` 冲突（比如 `System.Net.Http` 和某个自定义类的 `HttpClient` 重名）。

---

# P98　C# 新语法 2：using 声明与文件范围命名空间

**一句话：`using` 声明把嵌套的花括号摊平了，代价是资源活到方法结束——这个代价会咬人。**

## 复习：`using` 语句在管什么

`using` 管的是 **`IDisposable` 接口**。实现了这个接口的类型，说明它持有"需要主动交还的东西"——文件句柄、数据库连接、网络流、GDI 句柄。

```csharp
public interface IDisposable
{
    void Dispose();     // "我要走了，把东西还回去"
}
```

**不管的话会怎样？**

| 资源 | 不 Dispose 的后果 |
|---|---|
| `FileStream` | 文件被锁，别的进程（包括你自己的代码）读不了，直到 GC 回收 |
| `SqlConnection` | 连接池被占满，几十个请求后整个网站卡死 |
| `HttpClient` | socket 耗尽（`TIME_WAIT` 堆积） |

**GC 会兜底，但不知道什么时候。** 在 GC 动手之前，资源一直是占用状态。这就是为什么必须 `using`。

## 老写法：`using` 语句（still 支持）

```csharp
using (var conn = new SqlConnection(connStr))
{
    conn.Open();
    using (var cmd = conn.CreateCommand())
    {
        cmd.CommandText = "select * from T_Articles";
        using (var reader = cmd.ExecuteReader())
        {
            while (reader.Read())
            {
                Console.WriteLine(reader.GetString(0));
            }
        }
    }
}
```

**三个资源 = 三层嵌套 = 三级缩进。** 到第七层就看不见代码了。

## 新写法：`using` 声明（C# 8）

```csharp
using var conn = new SqlConnection(connStr);
conn.Open();

using var cmd = conn.CreateCommand();
cmd.CommandText = "select * from T_Articles";

using var reader = cmd.ExecuteReader();
while (reader.Read())
{
    Console.WriteLine(reader.GetString(0));
}
```

**平铺，零缩进。** 规律是：

| | `using` 语句 | `using` 声明 |
|---|---|---|
| 写法 | `using (var x = ...) { ... }` | `using var x = ...;` |
| 作用域 | 花括号内 | **包含它的那个块**（通常是整个方法体） |
| 释放时机 | 离开花括号 | **离开方法**（或离开所在的 `{ }`） |
| 释放顺序 | 逆序（LIFO） | 逆序（LIFO），和嵌套等价 |
| 能声明几个 | 一个语句一个 | 可以连着写多个 |

### 关键细节：作用域变成"整个块"

**编译器怎么实现的**：它不是魔法，是把你的 `using var x` 包进一个隐式的 `try/finally`：

```csharp
// 你写的
using var conn = new SqlConnection(connStr);
DoSomething();

// 编译器生成的（等价）
var conn = new SqlConnection(connStr);
try
{
    DoSomething();
}
finally
{
    if (conn != null) conn.Dispose();
}
```

**记住这张转换表，P98 的坑就全解释通了。**

### `await using`：异步版本（C# 8）

```csharp
await using var stream = new FileStream("e:/1.txt", FileMode.Open);
```
对应 `IAsyncDisposable` 接口，释放时 `await DisposeAsync()`。EF Core 的 `DbContext` 就是 `IAsyncDisposable`——但**你平时不要 `await using` 一个注入进来的 `DbContext`**，容器管生命周期。

## ⚠️ 陷阱：作用域泄漏

视频里那个例子必须亲手跑一遍：

```csharp
using var outStream = File.OpenWrite("e:/1.txt");
using var writer = new StreamWriter(outStream);

writer.WriteLine("hello");

string s = File.ReadAllText("e:/1.txt");    // ← 这里炸
Console.WriteLine(s);
```

**报错：**

```
System.IO.IOException: The process cannot access the file 'e:\1.txt'
because it is being used by another process.
```

**为什么会这样？**

`using var` 的作用域是**整个方法体**。所以执行到 `File.ReadAllText` 这一行时：

| 对象 | 状态 |
|---|---|
| `outStream`（`FileStream`） | **还开着**，独占锁还没释放 |
| `writer`（`StreamWriter`） | **还开着** |
| `File.ReadAllText` | 请求以"共享读"打开同一个文件 → 被自己的 `outStream` 挡住 |

**不是别的程序占的，是你自己的代码占的。** 报错信息里那句"another process"极具误导性——它其实是"另一个句柄"。

**还有第二层坑**：即使文件不被占用，`StreamWriter` 有内部缓冲区。`writer.WriteLine("hello")` 只是写进了内存缓冲，没落盘。**必须 `Flush()` 或 `Dispose()` 之后，文件内容才是 "hello"。**

**解法：给它一个明确的作用域。**

```csharp
{
    using var outStream = File.OpenWrite("e:/1.txt");
    using var writer = new StreamWriter(outStream);
    writer.WriteLine("hello");
}   // ← 离开这个块，两个对象逆序 Dispose：writer 先（把缓冲刷盘），outStream 后（放锁）

string s = File.ReadAllText("e:/1.txt");    // 现在能读了
Console.WriteLine(s);
```

**一对裸花括号就够了。** 花括号在 C# 里可以单独出现，作用就是"造一个作用域"。

### 什么时候该用哪个

| 场景 | 选哪个 |
|---|---|
| 资源用完就该立刻放（文件、连接） | **`using` 语句**（花括号圈定范围） |
| 资源要用到方法最后（一个方法只干一件事） | `using` 声明 |
| 方法里要"中间读一下自己刚写的文件" | **必须** `using` 语句 + 花括号 |
| 一个方法里要开七八个资源 | `using` 声明（老写法会嵌套成灾难） |

**判断标准一句话：这个资源什么时候可以走了？如果答案是"方法结束时"，用声明；如果是"干完这件事就该走"，用语句。**

## 文件范围命名空间（C# 10）

**以前**，整个文件要包一层：

```csharp
namespace TMS.Admin
{
    class Teacher
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    class Student
    {
        // ...
    }
}
```
**每个类都多一级缩进，文件末尾还要记得补 `}`。**

**现在**：

```csharp
namespace TMS.Admin;

class Teacher
{
    public int Id { get; set; }
    public string Name { get; set; }
}
```

**一行声明，整个文件都在这个命名空间里。** 分号结束，没有花括号，不用配对。

### 规则和一个容易搞错的地方

| 规则 | 说明 |
|---|---|
| 一个文件**只能有一个**文件范围命名空间 | 两个就报错 |
| **不能嵌套**命名空间 | 文件范围命名空间内部不能再写 `namespace X { }` |
| `using` 的位置决定它的作用域 | **写在 `namespace` 之前 = 文件级（命名空间外）；写在之后 = 命名空间内** |

最后一条容易踩：

```csharp
using System;                 // ← 在 namespace 之前：相当于全局/文件外

namespace TMS.Admin;

using System.Text;            // ← 在 namespace 之后：只在这个命名空间内有效
```

**这个区别在正常开发里几乎感觉不到**，因为两者都能用 `System.Text` 里的类型。但在**生成代码**或**同名类型解析**时会咬人——比如两个命名空间都有 `Timer`，位置不同，选中的那个也不同。

---

# P99　C# 新语法 3：可空引用类型

**一句话：它在编译期告诉你"这里可能是 null"，让你在写代码时就发现空引用；它不改运行时行为——一个字节的检查都没有。**

## 复习：值类型和引用类型的空

| 类型 | 能存 null 吗 | 例子 |
|---|---|---|
| **值类型** | 默认**不能** | `int`、`double`、`DateTime`、`bool`、`struct` |
| **值类型的可空版** | 加 `?` 才能 | `int?`（`Nullable<int>`）、`DateTime?` |
| **引用类型** | **默认就能**（一直是） | `string`、`数组`、`class`、`object` |

**问题就在最后一行**：引用类型从 C# 1.0 起就能是 null，编译器从来不管。于是：

```csharp
Student s1 = GetData();          // 可能返回 null
Console.WriteLine(s1.Name);      // 运行时：NullReferenceException
```

**这个异常要到线上才炸，而且炸的时候堆栈只告诉你"这里炸了"，不告诉你"为什么这里是 null"。**

## 开启：`<Nullable>enable</Nullable>`

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

**.NET 6 之后新建的项目默认就是 `enable`。** 如果你打开的是老项目，可能是 `disable`，那这批警告一个都不会出现。

开启后，编译器把"引用类型"劈成两个：

| 写法 | 含义 | 谁负责保证 |
|---|---|---|
| `string` | **不可空**引用类型 | 你，赋值 null 会警告 |
| `string?` | **可空**引用类型 | 你，**使用前必须判空** |

## 三处警告 + 一处初始化警告

### 警告一：可能返回 null 却声明成不可空（CS8603）

```csharp
static string GetName()
{
    return null;      // ⚠️ CS8603: Possible null reference return.
}
```
**编译器说**：你声明了"我保证返回非空"，但你在返回 null。

### 警告二：把可能为 null 的值赋给不可空变量（CS8600 / CS8625）

```csharp
string s = null;              // ⚠️ CS8625: Cannot convert null literal to non-nullable reference type.
string? t = GetName();        // ✅ 声明成可空，合法
string  u = GetName();        // ⚠️ CS8600: Converting null literal or possible null value to non-nullable type.
```

### 警告三：解引用可能为 null 的变量（CS8602）

```csharp
Student? s = GetData();
Console.WriteLine(s.Name);    // ⚠️ CS8602: Dereference of a possibly null reference.
```

**这是你以后最常看到的一个。** 绿色（现在 VS 里是绿色波浪线）就出现在 `s` 下面。

### 警告四：非空属性没在构造函数里赋初值（CS8618）

```csharp
public class Student
{
    public string Name { get; set; }    // ⚠️ CS8618: Non-nullable property 'Name'
                                        //    must contain a non-null value when exiting constructor.
}
```
**编译器说**：你说 `Name` 永远非空，但 `new Student()` 之后它就是 null。

**三种解法，各有适用场景**：

```csharp
// ① 给默认值（最省事，但对"必须传"的字段不合适）
public string Name { get; set; } = string.Empty;

// ② 让它可空（承认它可能没值）
public string? Name { get; set; }

// ③ 用 required（C# 11）：逼调用方在对象初始化器里赋值
public required string Name { get; set; }
```

> **`required` 是什么**：C# 11 的修饰符，加在属性/字段上，表示"`new` 的时候必须用对象初始化器赋值，否则编译不过"：
> ```csharp
> var s = new Student();                    // ❌ 编译错误 CS9035
> var s2 = new Student { Name = "张三" };   // ✅
> ```
> 它比"构造函数强制传参"更灵活（不影响无参构造），比你手写 `= string.Empty` 更安全（不会悄悄给出错误默认值）。

## `!`：抑制警告的操作符

```csharp
Student? s = GetData();
Console.WriteLine(s!.Name);    // ← 加个 !，警告消失
```

`!` 叫 **null-forgiving operator（原谅操作符）**，也叫"dammit operator"。它的唯一作用是：

> **"我保证这里不会是 null，别警告我了。"**

**它什么都不做。** 不判空、不检查、不改变运行时行为。如果 `s` 真的是 null，照样 `NullReferenceException`。

**所以这是最危险的一个符号——它把编译器的保护关掉了，而且不留痕迹。**

| 该用 `!` 的场景 | 不该用 `!` 的场景 |
|---|---|
| 你刚判过空，但编译器跟不上（跨方法调用） | "警告好烦，加个 `!` 吧" |
| 框架保证非空（如 `[FromBody]` 绑定的参数） | 你真的不确定会不会是 null |
| 单元测试里构造非法输入 | 生产代码里"先跑通再说" |

**视频里说的"不要滥用"，指的就是右边那两行。**

## 最反直觉的一点：运行时没有检查

写完这些，把程序跑起来：

```csharp
static string GetName() => null!;      // 编译通过，零警告

string name = GetName();               // 编译通过，零警告
Console.WriteLine(name.Length);        // 运行时：NullReferenceException
```

**该崩还是崩，一行检查都没多。**

**为什么？** 因为 `string` 和 `string?` **编译后是完全相同的类型**（都是 `System.String`）。`?` 只是一个**给编译器看的注解**，编译时被记录成元数据里的 `[Nullable]` 特性：

```csharp
// 你写的
public string? Name { get; set; }

// 元数据里实际的样子
[Nullable(2)]                      // 2 = 可空
public string Name { get; set; }
```

> **为什么只是注解就够用**：因为它的目标是"在**写代码时**发现错误"，而不是"在运行时拦截错误"。运行时拦截要付出性能代价（每次解引用都判断），而且治标不治本——空引用的根因是"逻辑上不该为空的地方空了"，这只能靠人改逻辑。编译期警告把这个问题提前到了写代码的时候，成本几乎为零。

**这也解释了一个常见困惑**：为什么我给 `List<Student>` 里塞了个 null，编译不报错？
因为 `List<Student>` 的元素类型在运行时**不检查**——泛型擦除后它就只是个引用。**可空引用类型管不到泛型容器的内容。**

## 文件级开关：`#nullable`

不想整个项目开？可以用指令按文件控制：

| 指令 | 作用 |
|---|---|
| `#nullable enable` | 本文件开启（注解 + 警告） |
| `#nullable disable` | 本文件关闭 |
| `#nullable annotations` | 只开注解（能写 `?`），不开警告 |
| `#nullable warnings` | 只开警告，不认 `?` 的新含义 |
| `#nullable restore` | 恢复到项目设置 |

**老项目迁移的典型做法**：项目级 `disable`，新写的文件顶部加 `#nullable enable`，一个文件一个文件地改。

---

# P100　C# 新语法 4：record 基础

**一句话：`record` 让"两个对象内容一样就是相等"这件事，从 50 行样板代码变成一个关键字。**

## 先看 `==` 的默认行为

```csharp
var a = new Person("Yang", "Zack");
var b = new Person("Yang", "Zack");

Console.WriteLine(a == b);              // False ← 内容一样，但不相等
Console.WriteLine(a.Equals(b));         // False
```

**为什么？** C# 里 `==` 对**引用类型**默认比较的是"是否指向同一个对象"，也就是**引用相等**。

| 比较方式 | 比的是什么 | 典型类型 |
|---|---|---|
| **引用相等**（`==` 默认） | 内存地址是不是同一个 | `class`、`object`、`数组` |
| **值相等** | 内容是不是一样 | `int`、`double`、`DateTime`、`struct` |
| 字符串特例 | 内容（`string` 重写了 `==`） | `string` |

**想让它按内容比较，以前要手写这些东西**：

```csharp
public class Person : IEquatable<Person>
{
    public string FirstName { get; }
    public string LastName { get; }

    public Person(string firstName, string lastName)
    {
        FirstName = firstName;
        LastName = lastName;
    }

    public bool Equals(Person? other) =>
        other is not null &&
        FirstName == other.FirstName &&
        LastName == other.LastName;

    public override bool Equals(object? obj) => Equals(obj as Person);

    public override int GetHashCode() =>
        HashCode.Combine(FirstName, LastName);

    public static bool operator ==(Person? left, Person? right) =>
        ReferenceEquals(left, right) || (left is not null && left.Equals(right));

    public static bool operator !=(Person? left, Person? right) => !(left == right);

    public override string ToString() =>
        $"Person {{ FirstName = {FirstName}, LastName = {LastName} }}";
}
```

**50 行，全是机械劳动，而且漏一个就出 bug**（只重写 `Equals` 不重写 `GetHashCode`，放进 `HashSet` 就找不到）。

## record：一行搞定

```csharp
public record Person(string FirstName, string LastName);
```

**就这一行。** 这叫 **位置记录（positional record）**——括号里的参数既是构造参数，也是属性。

```csharp
var p1 = new Person("Yang", "Zack");
var p2 = new Person("Yang", "Zack");
var p3 = new Person("Gates", "Bill");

Console.WriteLine(p1);          // Person { FirstName = Yang, LastName = Zack }
Console.WriteLine(p1 == p2);    // True   ← 内容相同
Console.WriteLine(p1 == p3);    // False
Console.WriteLine(p1.FirstName); // Yang
```

**四行输出，四个能力：**

| 输出 | 靠什么 |
|---|---|
| `Person { FirstName = Yang, LastName = Zack }` | 编译器生成的 `ToString()` |
| `True` | 编译器生成的 `Equals` + `==` 运算符 |
| `False` | 同上，内容不同 |
| `Yang` | 编译器生成的**只读属性** `FirstName` |

## 编译器到底生成了什么

先给结论，P101 再展开验证：

| 生成的成员 | 作用 |
|---|---|
| `public string FirstName { get; init; }` | 主构造函数的每个参数 → 一个 **`init` 属性** |
| `public Person(string FirstName, string LastName)` | 包含全部属性的构造函数 |
| `Equals(Person?)` / `Equals(object?)` | 逐字段比较 |
| `GetHashCode()` | 逐字段算哈希 |
| `==` / `!=` 运算符 | 内部调 `Equals` |
| `ToString()` | `类型名 { 属性 = 值, ... }` |
| `Deconstruct(out ...)` | 支持 `var (a, b) = p1;`，这是位置记录才有的 |

> **`init` 是什么**：C# 9 的访问器，比 `set` 收窄——**只能在对象初始化器里赋值**，之后就是只读：
> ```csharp
> var p = new Person("Yang", "Zack") { FirstName = "Li" };  // ✅ 对象初始化器里可以
> p.FirstName = "Li";                                       // ❌ 编译错误 CS8852
> ```
> **为什么不直接用 `readonly`**：`init` 属性可以在对象初始化器里赋值，`readonly` 字段只能在构造函数里。所以 `init` 让"构造完就不可变"这件事变得灵活——序列化框架（`System.Text.Json`）、对象初始化器都能用。

## record 的三种形态

```csharp
// ① 位置记录：属性全在括号里，全只读
public record Person(string FirstName, string LastName);

// ② 普通 record：花括号里手写属性，写法跟 class 一样
public record Person
{
    public string FirstName { get; init; } = "";
    public string LastName { get; init; } = "";
}

// ③ record struct（C# 10）：值类型版
public record struct Point(int X, int Y);
```

| 形态 | 类型 | 相等性 | 什么时候用 |
|---|---|---|---|
| `record` / `record class` | 引用类型 | 值相等 | **默认选这个** |
| `record struct` | 值类型 | 值相等 | 很小、复制成本低、不需要 null |

**`record struct` 的关键区别**：它是**值类型**，赋值时复制整个值，不是复制引用；不能是 null（除非 `Point?`）。

## 可变的 record

```csharp
public record User
{
    public string UserName { get; set; } = "";    // ← set 不是 init
    public string Email { get; set; } = "";
    public int Age { get; set; }
}
```

**能编译，能跑，但要想清楚：**

**`GetHashCode` 是基于字段算的。** 如果对象在 `HashSet` / `Dictionary` 的 key 位置，你又改了它的属性，哈希值变了——**它就永远找不回来了**。

```csharp
var u = new User { UserName = "a", Email = "a@x.com", Age = 1 };
var set = new HashSet<User> { u };
u.Age = 2;
Console.WriteLine(set.Contains(u));    // False ← 还在里面，但找不到了
```

**这就是为什么 record 的默认形态是全只读（`init`）。** P101 会再谈这个。

## 和 `class` 的选择

| 你的需求 | 选 |
|---|---|
| 纯数据载体，没有行为（DTO、消息、配置） | **record** |
| 需要可变状态（实体、有状态的 service） | `class` |
| 需要继承体系 + 多态行为 | `class`（record 也能继承，但限制多） |
| 需要在 `HashSet`/`Dictionary` 里当 key | **record**（值相等才当得了 key） |
| 需要"内容相同就相等"的比较 | **record** |

**一句话：record 是"值"（value），class 是"对象"（entity）。** 两个 `Person("Yang","Zack")` 是同一个值；两个 `new UserService()` 不是同一个东西。

---

# P101　C# 新语法 5：record 的原理及深入

**一句话：record 不是新类型，它就是普通类；`record` 关键字只是让编译器往里塞代码。搞清楚塞了什么，你才知道什么时候它会咬人。**

## 反编译：record 长什么样

```csharp
public record Person(string FirstName, string LastName);
```

**ILSpy 反编译（C# 版本切到 8.0，避免它用新语法反向优化）后：**

```csharp
public class Person : IEquatable<Person>
{
    // ① 两个 init 属性
    public string FirstName { get; init; }
    public string LastName { get; init; }

    // ② 构造函数
    public Person(string FirstName, string LastName)
    {
        this.FirstName = FirstName;
        this.LastName = LastName;
    }

    // ③ 克隆方法（with 表达式用）
    public virtual Person <Clone>$() => new Person(this);

    // ④ 相等性契约（继承时判断类型用）
    protected virtual Type EqualityContract => typeof(Person);

    // ⑤ ToString
    public override string ToString()
    {
        StringBuilder sb = new StringBuilder();
        sb.Append("Person");
        sb.Append(" { ");
        if (PrintMembers(sb)) sb.Append(' ');
        sb.Append('}');
        return sb.ToString();
    }

    protected virtual bool PrintMembers(StringBuilder builder)
    {
        builder.Append("FirstName = ");
        builder.Append(FirstName);
        builder.Append(", LastName = ");
        builder.Append(LastName);
        return true;
    }

    // ⑥ 相等性（逐字段）
    public virtual bool Equals(Person? other) =>
        other is not null &&
        EqualityContract == other.EqualityContract &&
        EqualityComparer<string>.Default.Equals(FirstName, other.FirstName) &&
        EqualityComparer<string>.Default.Equals(LastName, other.LastName);

    public override bool Equals(object? obj) => Equals(obj as Person);

    // ⑦ 哈希（逐字段）
    public override int GetHashCode() =>
        (EqualityComparer<string>.Default.GetHashCode(FirstName) * -1521134295
         + EqualityComparer<string>.Default.GetHashCode(LastName)) * -1521134295
        + EqualityContract.GetHashCode();

    // ⑧ 运算符
    public static bool operator ==(Person? left, Person? right) =>
        (object)left == right || (left?.Equals(right) ?? false);

    public static bool operator !=(Person? left, Person? right) => !(left == right);

    // ⑨ 解构（位置记录才有）
    public void Deconstruct(out string FirstName, out string LastName)
    {
        FirstName = this.FirstName;
        LastName = this.LastName;
    }
}
```

**结论：`record` 就是一个 `class`，上面这些全是编译器帮你写的。**

## 五个细节，每个都会咬人

### 细节一：`EqualityContract` —— 继承时判类型

```csharp
var p = new Person("Yang", "Zack");
var s = new Student("Yang", "Zack", 18);    // record Student : Person

Console.WriteLine(p == s);    // False ← 内容可能一样，但类型不同
```

**靠的就是 `EqualityContract == other.EqualityContract`。** 这一行保证了 `Person` 永远不等于 `Student`。

**如果 record 不生成这个会怎样？** 一个 `Student` 和一个 `Person` 只要字段值相同就相等了——这会破坏相等性的对称性和传递性（`a==b` 但 `b!=a` 的诡异情况）。

### 细节二：`<Clone>$` 和 `with` 表达式

```csharp
var u1 = new User { UserName = "yang", Email = "old@x.com", Age = 18 };
var u2 = u1 with { Email = "new@x.com" };      // 复制 + 改一个属性
```

**`with` 的等价代码：**

```csharp
var u2 = u1.<Clone>$();        // 浅拷贝：MemberwiseClone
u2.Email = "new@x.com";        // 改指定属性
```

**三步：浅拷贝 → 改属性 → 返回新对象。`u1` 完全不受影响。**

**注意 `<Clone>$` 是 `virtual` 的**，就是为了在继承链里复制出正确类型（复制 `Student` 得到 `Student`，不是 `Person`）。

### 细节三：浅拷贝 —— `with` 的陷阱

```csharp
public record Team(string Name, List<string> Members);

var t1 = new Team("A", new List<string> { "张三", "李四" });
var t2 = t1 with { Name = "B" };

t2.Members.Add("王五");

Console.WriteLine(t1.Members.Count);    // 3 ← 被改了！
```

**为什么？** `with` 用的是 `MemberwiseClone()`，它**只复制引用，不复制引用的对象**。

```
t1 ──┐
     ├──→ 同一个 List<string>  ← t2.Members.Add 改的就是这个
t2 ──┘
```

| 字段类型 | `with` 之后 |
|---|---|
| `string`（不可变） | 安全，字符串改不了 |
| `int`/`double`/`DateTime` | 安全，值复制 |
| `List<T>`/`数组`/`class` | **危险，共享同一个实例** |

**要真正的深拷贝，得自己写**（序列化反序列化、或手写 `Clone` 方法）。record 不替你解决这个。

> **`MemberwiseClone()` 是什么**：`System.Object` 的 `protected` 方法，创建一个"字段逐个复制"的浅拷贝。它是 `with` 的底层实现，也是所有"浅拷贝"的统一机制。

### 细节四：record 的继承限制

```csharp
public record Person(string Name);
public record Student(string Name, int Age) : Person(Name);    // ✅ record 继承 record
```

| 允许 | 不允许 |
|---|---|
| `record` 继承 `record` | ❌ 普通 `class` 继承 `record` |
| `record` 继承 `object` | ❌ `record` 继承普通 `class` |

**原因**：record 要保证值相等性的语义完整（`EqualityContract`、`<Clone>$`、`PrintMembers` 都得能被重写）。如果允许混继承，这套契约就断了。

**位置记录继承位置记录时，必须在后面调基类构造函数** `: Person(Name)`，而且要保证参数对得上。

### 细节五：部分只读 / 部分可变的混合

```csharp
public record User(string UserName, string Email)
{
    public int Age { get; set; }    // ← 这个是可变的
}
```

**能跑，但要注意：`GetHashCode` 和 `Equals` 会包含 `Age`。** 所以这个 record 同时是：

- 一半不可变（`UserName`、`Email`）
- 一半可变（`Age`）
- **整体参与值比较**（包括可变的 `Age`）

**放进 `HashSet` 之后改 `Age`，就找不回来了**（P100 演示过）。

**所以视频里的建议是对的：要可变的部分，别放在 record 的相等性范围里。**

## 为什么"不可变"值得追求

视频里有一句话值得单独拿出来讲：**所有属性都为只读的类型叫"不可变类型"，能让程序逻辑变简单。**

| 不可变的好处 | 具体解释 |
|---|---|
| **线程安全** | 没人能改它，就不需要锁。多线程共享一个 record 实例，天然安全 |
| **可安全当 key** | 哈希值不会变，`Dictionary` / `HashSet` 里永远找得到 |
| **可安全当缓存 key** | 内容相同即相等，缓存命中率直觉化 |
| **调试友好** | `ToString()` 直接打印内容，`Console.WriteLine(p1)` 就有意义 |
| **并发/异步友好** | `with` 生成新对象，不用改共享状态，符合函数式风格 |

**代价**：每次修改都要新建对象（内存开销、GC 压力）。**但对 DTO、消息、配置这类"读多写少"的类型，这个代价可忽略。**

## record 在 EF Core 里的边界（和你项目直接相关）

**你这批之后就要回到 EF Core 的世界，所以必须说清楚：**

| 用途 | 能不能用 record | 说明 |
|---|---|---|
| **DTO / 接口返回模型** | ✅ **强烈推荐** | `public record BookDto(long Id, string Title, double Price);` |
| **查询投影结果** | ✅ 可以 | `.Select(b => new BookDto(b.Id, b.Title, b.Price))` |
| **Entity（数据库实体）** | ⚠️ **不推荐** | 见下面三条 |
| **配置绑定（Options）** | ✅ 可以 | `record` 有 init 属性，配置系统能绑 |

**为什么 entity 不推荐 record：**

1. **EF 的变更跟踪靠"改属性"**——record 的 `init` 属性改不了，EF 只能用"整体替换"的方式，笨重。
2. **值相等性会骗 EF**——EF 的 `ChangeTracker` 内部用引用做身份识别，record 的 `==` 语义跟它不一致，容易出诡异 bug。
3. **`with` 生成的副本不在跟踪里**——`var b2 = b1 with { Price = 9.9 }`，`b2` 是个新对象，EF 根本不知道它的存在，`SaveChanges()` 不会存它。

**结论：实体老老实实用 `class`，DTO 放心用 `record`。** 这条分界线你以后会一直用到。

---

==二：格式==

## P97　顶级语句 / 全局 using / ImplicitUsings

**顶级语句**——文件里直接写语句，不用 `class` / `Main`：

```csharp
Console.WriteLine("Hello, World!");

int i = 1, j = 2;
int w = Add(i, j);
await File.WriteAllTextAsync("e:/1.txt", "hello" + w);

int Add(int a, int b) => a + b;
```

| 约束 | 违反后果 |
|---|---|
| 一个项目只能有一个文件有顶级语句 | CS8802 |
| 必须是文件里的第一批语句（前面只能有 `using`/`extern`/注释） | CS8803 |
| 传统 `class Program { static void Main }` 仍支持，但不能与顶级语句共存 | 两个入口冲突 |

**全局 using**——写在独立的 `GlobalUsings.cs` 里：

```csharp
global using System.Text.Json;
global using System.Text.Json.Serialization;
global using static System.Math;
global using Json = System.Text.Json.JsonSerializer;
global using MyApp.Models;
```

| 形式 | 全项目生效的东西 |
|---|---|
| `global using X;` | 命名空间 |
| `global using static X;` | 静态成员（免类名） |
| `global using Alias = X;` | 别名 |

**`ImplicitUsings`（csproj 开关）**：

```xml
<PropertyGroup>
  <ImplicitUsings>enable</ImplicitUsings>    <!-- 默认 enable（.NET 6+） -->
</PropertyGroup>
```

等价于编译器自动写入一批 `global using`，集合由 SDK 决定（`Microsoft.NET.Sdk` vs `Microsoft.NET.Sdk.Web`）。

---

## P98　using 声明 / 文件范围命名空间

**using 语句（老，仍然支持）**：

```csharp
using (var conn = new SqlConnection(connStr))
{
    conn.Open();
}
```

**using 声明（C# 8）**：

```csharp
using var conn = new SqlConnection(connStr);
// 作用域 = 当前块，离开块时逆序 Dispose
```

**`await using`（异步释放 `IAsyncDisposable`）**：

```csharp
await using var stream = new FileStream(path, FileMode.Open);
```

**手写作用域（限制 using 声明的作用范围）**：

```csharp
{
    using var outStream = File.OpenWrite("e:/1.txt");
    using var writer = new StreamWriter(outStream);
    writer.WriteLine("hello");
}   // 逆序释放：writer → outStream
```

**文件范围命名空间（C# 10）**：

```csharp
namespace TMS.Admin;

class Teacher
{
    public int Id { get; set; }
}
```

| 约束 | 说明 |
|---|---|
| 一个文件只能有一个 | 两个报错 |
| 不能嵌套命名空间 | 内部不能再写 `namespace X { }` |
| `using` 在它之前 = 命名空间外；之后 = 命名空间内 | 影响同名类型的解析 |

---

## P99　可空引用类型

**开启**：

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

**两种类型 + 两个操作符**：

```csharp
string   a = "x";      // 不可空：赋值 null 会警告
string?  b = null;     // 可空：使用前必须判空
string   c = b!;       // ! = 别警告我（不做任何检查）
string   d = b ?? "";  // ?? = 为 null 时给默认值
b ??= "default";       // ??= = 为 null 时才赋值
```

| 警告编号 | 含义 | 典型写法 |
|---|---|---|
| CS8600 | 把可能为 null 的值赋给不可空类型 | `string s = GetNullable();` |
| CS8602 | 解引用可能为 null 的变量 | `s.Name` 而 `s` 是 `Student?` |
| CS8603 | 可能返回 null 的引用 | `string GetName() => null;` |
| CS8618 | 非空属性/字段未在构造函数里初始化 | `public string Name { get; set; }` |
| CS8625 | 把 null 字面量转成不可空类型 | `string s = null;` |

**文件级开关**：

```csharp
#nullable enable          // 开（注解+警告）
#nullable disable         // 关
#nullable annotations     // 只认 ? 语法，不报警告
#nullable warnings        // 只报警告，不认 ? 新语义
#nullable restore         // 回到项目设置
```

**最常被问的一个问题**：

| 你以为 | 实际 |
|---|---|
| 加 `?` 后运行时会检查 null | ❌ 运行时**零检查**，`string` 和 `string?` 编译后是同一个 `System.String` |
| 它记录在哪 | 元数据里的 `[Nullable]` 特性（`[Nullable(2)]` = 可空） |
| 那它的价值 | 把空引用问题从"运行时崩溃"提前到"写代码时的警告" |

---

## P100　record 基础

**三种形态**：

```csharp
public record Person(string FirstName, string LastName);      // 位置记录（最常用）

public record Person                                          // 普通 record
{
    public string FirstName { get; init; } = "";
    public string LastName  { get; init; } = "";
}

public record struct Point(int X, int Y);                     // record struct（C# 10，值类型）
```

**编译器生成的成员**（位置记录）：

| 成员 | 签名 |
|---|---|
| 属性 | `public string FirstName { get; init; }` |
| 构造函数 | `public Person(string FirstName, string LastName)` |
| 相等性 | `Equals(Person?)` / `Equals(object?)` |
| 哈希 | `GetHashCode()` |
| 运算符 | `static bool operator ==` / `!=` |
| 打印 | `ToString()` / `PrintMembers(StringBuilder)` |
| 克隆 | `virtual Person <Clone>$()` |
| 类型契约 | `protected virtual Type EqualityContract` |
| 解构 | `void Deconstruct(out string FirstName, out string LastName)` |

**`init` 访问器（C# 9）**：

```csharp
public string Name { get; init; }     // 只能在构造函数 / 对象初始化器里赋值

var p = new Person("Yang", "Zack") { FirstName = "Li" };   // ✅
p.FirstName = "Li";                                        // ❌ CS8852
```

**可空属性的三种收口方式**：

```csharp
public string  Name { get; set; } = string.Empty;    // ① 默认值
public string? Name { get; set; }                    // ② 承认可空
public required string Name { get; set; }            // ③ required（C# 11，强制初始化）
```

---

## P101　record 的原理及深入

**`with` 表达式（复制 + 改部分属性）**：

```csharp
var u2 = u1 with { Email = "new@x.com" };
// 等价于：var u2 = u1.<Clone>$();  u2.Email = "new@x.com";
```

| `with` 的特点 | 说明 |
|---|---|
| 浅拷贝 | `MemberwiseClone()`：只复制引用，不复制引用的对象 |
| 不改原对象 | 生成新实例 |
| 依赖 virtual `<Clone>$` | 保证继承链里复制出正确类型 |

**record 继承**：

```csharp
public record Person(string Name);
public record Student(string Name, int Age) : Person(Name);
```

| 允许 | 不允许 |
|---|---|
| record → record | class → record |
| record → object | record → class |

**只读 / 可读写的混合**：

```csharp
public record User(string UserName, string Email)
{
    public int Age { get; set; }       // 可变，但会参与 Equals/GetHashCode
}
```

**record 用在哪儿（和你项目直接相关）**：

| 场景 | 用什么 | 理由 |
|---|---|---|
| 接口返回的 DTO | `record` | 值语义、`ToString` 可读、序列化友好 |
| `Select` 投影结果 | `record` | 同上，且能当 `Dictionary` key |
| EF Core 实体 | `class` | 需要可变状态 + 引用身份识别 |
| 配置 Options | `record` | `init` 属性可被配置系统绑定 |

---

==三：代码==

> **准备**：新建一个控制台项目，跟图书管理系统无关，纯练语法。
> ```bash
> mkdir D:/code/csharp-sugar && cd D:/code/csharp-sugar
> dotnet new console -n SugarDemo
> cd SugarDemo
> ```
> `SugarDemo.csproj` 确认这两行是 `enable`（.NET 6+ 默认就是）：
> ```xml
> <ImplicitUsings>enable</ImplicitUsings>
> <Nullable>enable</Nullable>
> ```

---

## Step 1（P97）：顶级语句——`Main` 到底在哪

**把 `Program.cs` 整个替换成：**

```csharp
using System.Reflection;

Console.WriteLine("Hello, World!");

// 入口方法是谁？用反射问一下
var entry = Assembly.GetExecutingAssembly().EntryPoint;

Console.WriteLine($"入口方法所属的类：{entry?.DeclaringType?.FullName}");
Console.WriteLine($"入口方法的名字：{entry?.Name}");
Console.WriteLine($"入口方法的返回类型：{entry?.ReturnType.Name}");
```

**运行（`dotnet run`）：**

```
Hello, World!
入口方法所属的类：Program
入口方法的名字：<Main>$
入口方法的返回类型：Void
```

**三个信息，全是编译器补的：**

| 你写的 | 实际存在的 |
|---|---|
| 一行 `Console.WriteLine` | `internal class Program` |
| 没有方法 | `private static void <Main>$(string[] args)` |
| 没有命名空间 | 全局命名空间（`global`） |

**再验证一次：传统写法仍然支持。** 新建 `OldStyle.cs`：

```csharp
namespace SugarDemo;

class OldStyle
{
    static void Main()
    {
        Console.WriteLine("传统 Main");
    }
}
```

**保存后编译（`dotnet build`）：**

```
error CS0017: Program has more than one entry point defined.
Compile with /main to specify the type that contains the entry point.
```

**这就是"一个项目只能有一个入口"的具体表现。** 顶级语句和传统 `Main` 是二选一，不是叠加。

> 删掉 `OldStyle.cs` 再继续。

---

## Step 2（P97）：顶级语句的两个特权

```csharp
// 特权一：直接 await，不需要 async Main
await File.WriteAllTextAsync("top-level-demo.txt", "hello from top-level");

// 特权二：直接声明方法（不是局部函数，是 Program 类的私有静态方法）
int i = 1, j = 2;
int w = Add(i, j);
Console.WriteLine($"1 + 2 = {w}");

int Add(int a, int b) => a + b;
```

**运行：**

```
1 + 2 = 3
```

**验证 `Add` 是类成员而不是局部函数：**

```csharp
using System.Reflection;

var methods = typeof(Program)
    .GetMethods(BindingFlags.NonPublic | BindingFlags.Static)
    .Select(m => $"{m.ReturnType.Name} {m.Name}({string.Join(", ", m.GetParameters().Select(p => p.ParameterType.Name))})");

foreach (var m in methods) Console.WriteLine(m);
```

**输出：**

```
Void <Main>$(String[])
Int32 Add(Int32, Int32)
```

**`Add` 和 `<Main>$` 平级，都是 `Program` 的静态方法。** 这就是为什么"顶级语句里声明的方法"能被反编译看到——它压根不是局部函数。

---

## Step 3（P97）：全局 using

**新建 `GlobalUsings.cs`：**

```csharp
global using System.Text.Json;
global using static System.Math;
```

**改 `Program.cs`：**

```csharp
// 注意：这里没有 using System.Text.Json; 也没有 using static System.Math;

var book = new { Id = 1, Title = "C# 入门", Price = 59.9 };

// 来自 System.Text.Json（全局 using 引入）
string json = JsonSerializer.Serialize(book, new JsonSerializerOptions { WriteIndented = true });
Console.WriteLine(json);

// 来自 System.Math 的静态成员（global using static 引入，免类名）
Console.WriteLine($"sqrt(16) = {Sqrt(16)}");
Console.WriteLine($"PI = {PI}");
```

**运行：**

```json
{
  "Id": 1,
  "Title": "C# 入门",
  "Price": 59.9
}
sqrt(16) = 4
PI = 3.141592653589793
```

**`Book.cs` 里也直接能用，不用重复 using：**

```csharp
namespace SugarDemo;

public class Book
{
    public long Id { get; set; }
    public string Title { get; set; } = "";

    // 没有任何 using，但 JsonSerializer / Sqrt 都能用
    public string ToJson() => JsonSerializer.Serialize(this);
    public double SqrtId() => Sqrt(Id);
}
```

**验证 `ImplicitUsings` 在起作用：** 把 csproj 里那行改成：

```xml
<ImplicitUsings>disable</ImplicitUsings>
```

**`Program.cs` 立刻报错：**

```
error CS0103: 当前上下文中不存在名称"Console"
error CS0246: 未能找到类型或命名空间名"File"
```

**`Console` 在 `System` 里，`File` 在 `System.IO` 里——这两个都是 `ImplicitUsings` 自动引的。** 关掉它，全部暴露出来。

> 改回 `enable` 再继续。

---

## Step 4（P98）：`using` 语句 vs `using` 声明

**先看老的嵌套写法：**

```csharp
string path = Path.Combine(Path.GetTempPath(), "sugar-demo.txt");

using (var fs = new FileStream(path, FileMode.Create, FileAccess.Write))
{
    using (var writer = new StreamWriter(fs))
    {
        writer.WriteLine("第一行");
        writer.WriteLine("第二行");
    }
}

Console.WriteLine("旧写法写完：" + File.ReadAllText(path));
```

**再看新的平铺写法：**

```csharp
using var fs2 = new FileStream(path, FileMode.Create, FileAccess.Write);
using var writer2 = new StreamWriter(fs2);
writer2.WriteLine("第一行");
writer2.WriteLine("第二行");

// ← 注意：这里 fs2 / writer2 还没释放
Console.WriteLine("新写法写到一半：" + File.ReadAllText(path));   // 💥 抛异常
```

**运行结果：**

```
Unhandled exception. System.IO.IOException: The process cannot access the file
'C:/Users/.../Temp/sugar-demo.txt' because it is being used by another process.
```

**这就是 P98 那个陷阱。** 详细拆解：

| 时刻 | `fs2` 状态 | 文件锁 | `File.ReadAllText` 能读吗 |
|---|---|---|---|
| 写完后 | 未释放 | 独占 | ❌ 被自己的 `fs2` 挡住 |

**报错说"another process"，其实是"another handle"——同一个进程里的另一个句柄。**

---

## Step 5（P98）：用一对花括号收住作用域

```csharp
string path = Path.Combine(Path.GetTempPath(), "sugar-demo.txt");

{
    using var fs = new FileStream(path, FileMode.Create, FileAccess.Write);
    using var writer = new StreamWriter(fs);
    writer.WriteLine("第一行");
    writer.WriteLine("第二行");
}   // ← 离开这个块：writer 先 Dispose（刷缓冲），fs 后 Dispose（放锁）

string content = File.ReadAllText(path);
Console.WriteLine("读到了：");
Console.WriteLine(content);
```

**输出：**

```
读到了：
第一行
第二行
```

**两件事同时发生了，缺一不可：**

| 动作 | 谁做的 | 不做会怎样 |
|---|---|---|
| 缓冲刷盘 | `writer.Dispose()` 内部调 `Flush()` | 读出来是空文件 |
| 释放文件锁 | `fs.Dispose()` 内部调 `CloseHandle` | 读的时候抛 `IOException` |

**验证顺序是逆序的：** 加个自定义类打印 Dispose 顺序。

```csharp
class Trace : IDisposable
{
    private readonly string _name;
    public Trace(string name) { _name = name; Console.WriteLine($"  + 创建 {_name}"); }
    public void Dispose() => Console.WriteLine($"  - 释放 {_name}");
}

Console.WriteLine("进入块：");
{
    using var a = new Trace("A");
    using var b = new Trace("B");
    using var c = new Trace("C");
    Console.WriteLine("  块内结束");
}
Console.WriteLine("离开块：");
```

**输出：**

```
进入块：
  + 创建 A
  + 创建 B
  + 创建 C
  块内结束
  - 释放 C
  - 释放 B
  - 释放 A
离开块：
```

**LIFO（后进先出）**——和嵌套 `using` 完全一致，因为编译器真的把它们编译成了嵌套的 `try/finally`。

---

## Step 6（P98）：文件范围命名空间

**新建 `Teacher.cs`：**

```csharp
namespace SugarDemo.School;

public class Teacher
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
}

public class Student
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
}
```

**两个类，一个 `namespace` 声明，零额外缩进。**

**在 `Program.cs` 里用：**

```csharp
using SugarDemo.School;

var t = new Teacher { Id = 1, Name = "杨老师" };
var s = new Student { Id = 2, Name = "张三" };
Console.WriteLine($"{t.Name} / {s.Name}");
```

**验证 `using` 位置的区别：**

```csharp
// A：using 在 namespace 之前 —— 文件级
using System.Text;

namespace SugarDemo.School;

// B：using 在 namespace 之后 —— 只在 SugarDemo.School 内有效
// using System.Text;
```

**两种写法在这里都能用 `StringBuilder`。** 差别只在"生成代码"和"同名类型冲突"时才显现——正常业务代码不必纠结，**默认写在 `namespace` 之前**（这也是 VS 自动整理 using 的行为）。

---

## Step 7（P99）：可空引用类型——让编译器帮你找 null

**新建 `NullableDemo.cs`：**

```csharp
namespace SugarDemo;

public class Student2
{
    public string Name { get; set; }              // ⚠️ CS8618
    public string? PhoneNumber { get; set; }      // ✅ 明确可空
}

public static class DataSource
{
    public static Student2? GetStudent(bool found)
        => found ? new Student2 { Name = "张三" } : null;      // ⚠️ CS8618 在 Student2 里
}
```

**编译（`dotnet build`）：**

```
warning CS8618: 不可为 null 的属性"Name"在退出构造函数时必须包含非 null 值。
```

**三种收口方式，逐个试：**

```csharp
// ① 默认值
public string Name { get; set; } = string.Empty;

// ② 承认可空
public string? Name { get; set; }

// ③ required（C# 11）
public required string Name { get; set; }
```

**`required` 的效果：**

```csharp
var s1 = new Student2();                    // ❌ error CS9035: 必须设置 required 成员"Name"
var s2 = new Student2 { Name = "张三" };    // ✅
```

**再看解引用警告（CS8602）：**

```csharp
var stu = DataSource.GetStudent(true);
Console.WriteLine(stu.Name.ToLower());       // ⚠️ CS8602: 解引用可能为 null 的引用
```

**三行修法，对比风险：**

```csharp
// ① 判空（最稳）
if (stu is not null) Console.WriteLine(stu.Name.ToLower());

// ② ?? 兜底
Console.WriteLine((stu?.Name ?? "无名").ToLower());

// ③ ! 硬压（最危险：不判空、不检查，null 照样崩）
Console.WriteLine(stu!.Name.ToLower());
```

---

## Step 8（P99）：证明"运行时零检查"

**这一步是为了打掉一个常见的错误理解。**

```csharp
#nullable enable

Console.WriteLine("=== 开始 ===");

string name = GetName();      // 编译器认为 GetName 返回非空 string
Console.WriteLine($"拿到了：{name}");
Console.WriteLine($"长度：{name.Length}");     // ← 这里崩

static string GetName()
{
    return null!;             // ← ! 把警告压掉了
}
```

**运行结果：**

```
=== 开始 ===
拿到了：
Unhandled exception. System.NullReferenceException: Object reference not set to an instance of an object.
```

**注意：程序真的跑到了 `name.Length` 才崩。** 说明：

| 检查点 | 有没有做 |
|---|---|
| 编译期：赋值 null 给 `string` | ✅ 警告（被 `!` 压掉了） |
| **运行期：`return null` 的那一刻** | ❌ **什么都没有** |
| **运行期：`name.Length` 的那一刻** | ❌ 没有"提前检查"，就是正常解引用 → 崩 |

**再加一段，证明 `string` 和 `string?` 是同一个类型：**

```csharp
Console.WriteLine(typeof(string) == typeof(string?));     // True
Console.WriteLine(typeof(string).FullName);               // System.String
Console.WriteLine(typeof(string?).FullName);              // System.String
```

**结论：`?` 只存在于源码和元数据里，不存在于运行时类型系统里。**

---

## Step 9（P100）：record 的值相等性

**新建 `Records.cs`：**

```csharp
namespace SugarDemo;

public record Person(string FirstName, string LastName);

// 对照组：普通 class，什么都不重写
public class PersonClass
{
    public string FirstName { get; init; } = "";
    public string LastName { get; init; } = "";
}
```

**`Program.cs`：**

```csharp
using SugarDemo;

Console.WriteLine("=== record ===");
var p1 = new Person("Yang", "Zack");
var p2 = new Person("Yang", "Zack");
var p3 = new Person("Gates", "Bill");

Console.WriteLine(p1);                        // Person { FirstName = Yang, LastName = Zack }
Console.WriteLine($"p1 == p2 : {p1 == p2}");   // True
Console.WriteLine($"p1 == p3 : {p1 == p3}");   // False
Console.WriteLine($"p1.FirstName : {p1.FirstName}");

Console.WriteLine();
Console.WriteLine("=== 普通 class ===");
var c1 = new PersonClass { FirstName = "Yang", LastName = "Zack" };
var c2 = new PersonClass { FirstName = "Yang", LastName = "Zack" };
Console.WriteLine($"c1 == c2 : {c1 == c2}");           // False
Console.WriteLine($"c1.ToString() : {c1}");            // SugarDemo.PersonClass

Console.WriteLine();
Console.WriteLine("=== 放进 HashSet ===");
var set = new HashSet<Person> { p1 };
Console.WriteLine($"Contains(p2) : {set.Contains(p2)}");     // True  ← 内容相同就找得到
```

**输出：**

```
=== record ===
Person { FirstName = Yang, LastName = Zack }
p1 == p2 : True
p1 == p3 : False
p1.FirstName : Yang

=== 普通 class ===
c1 == c2 : False
c1.ToString() : SugarDemo.PersonClass

=== 放进 HashSet ===
Contains(p2) : True
```

**一张表说清差别：**

| 能力 | `record` | 普通 `class` |
|---|---|---|
| `==` 比较内容 | ✅ | ❌ 比较引用 |
| `ToString()` 打印内容 | ✅ | ❌ 打印类型名 |
| 能当 `HashSet`/`Dictionary` key（按内容） | ✅ | ❌ |
| 属性只读（`init`） | ✅ 默认 | ❌ 要自己写 |

---

## Step 10（P101）：反编译 + 反射，看编译器塞了什么

**先不改代码，直接反射列出 record 的成员：**

```csharp
using System.Reflection;

var type = typeof(SugarDemo.Person);

Console.WriteLine("=== 属性 ===");
foreach (var p in type.GetProperties())
    Console.WriteLine($"  {p.PropertyType.Name} {p.Name} " +
                      $"{{ {(p.CanWrite ? "get; set; " : "get; init; ")} }}");

Console.WriteLine("=== 方法（含编译器生成的） ===");
foreach (var m in type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic |
                                  BindingFlags.Instance | BindingFlags.Static |
                                  BindingFlags.DeclaredOnly))
    Console.WriteLine($"  {m.ReturnType.Name} {m.Name}");

Console.WriteLine("=== 接口 ===");
foreach (var i in type.GetInterfaces())
    Console.WriteLine($"  {i.Name}");
```

**输出（顺序可能不同）：**

```
=== 属性 ===
String FirstName { get; init; }
String LastName { get; init; }
=== 方法（含编译器生成的） ===
String get_FirstName
Void set_FirstName
String get_LastName
Void set_LastName
Boolean Equals
Boolean Equals
Int32 GetHashCode
String ToString
Boolean PrintMembers
Person <Clone>$
Type get_EqualityContract
Void Deconstruct
Boolean op_Equality
Boolean op_Inequality
=== 接口 ===
IEquatable`1
```

**这张清单就是 P101 全部内容的实证。**

| 你看到的 | 对应 |
|---|---|
| `set_FirstName` | `init` 属性也生成 setter，只是编译器限制调用位置 |
| `Equals` ×2 | `Equals(Person?)` 和 `Equals(object?)` |
| `GetHashCode` | 逐字段哈希 |
| `ToString` / `PrintMembers` | 分成两个是为了继承时只覆盖增量部分 |
| `<Clone>$` | `with` 用 |
| `get_EqualityContract` | 继承时判类型 |
| `Deconstruct` | `var (a, b) = p1;` |
| `op_Equality` / `op_Inequality` | `==` / `!=` |
| `IEquatable<Person>` | 泛型相等性接口，避免 `HashSet` 装箱 |

---

## Step 11（P101）：`with` 的浅拷贝陷阱

```csharp
namespace SugarDemo;

public record Team(string Name, List<string> Members);
```

```csharp
using SugarDemo;

var t1 = new Team("A 组", new List<string> { "张三", "李四" });

Console.WriteLine("=== 改 Name（string，安全） ===");
var t2 = t1 with { Name = "B 组" };
Console.WriteLine($"t1.Name = {t1.Name}");     // A 组   ← 没被改
Console.WriteLine($"t2.Name = {t2.Name}");     // B 组

Console.WriteLine();
Console.WriteLine("=== 改 Members（List，危险） ===");
var t3 = t1 with { Name = "C 组" };
t3.Members.Add("王五");                        // ← 改的是共享的那个 List

Console.WriteLine($"t1.Members.Count = {t1.Members.Count}");     // 3  ← 被改了！
Console.WriteLine($"t3.Members.Count = {t3.Members.Count}");     // 3
Console.WriteLine($"ReferenceEquals(t1.Members, t3.Members) = {ReferenceEquals(t1.Members, t3.Members)}");
```

**输出：**

```
=== 改 Name（string，安全） ===
t1.Name = A 组
t2.Name = B 组

=== 改 Members（List，危险） ===
t1.Members.Count = 3
t3.Members.Count = 3
ReferenceEquals(t1.Members, t3.Members) = True
```

**`ReferenceEquals` 返回 `True`——两个 record 的 `Members` 是同一个 List 对象。**

**要真正的"复制"，得自己写：**

```csharp
public record Team2(string Name, List<string> Members)
{
    // 用新 List 包一层，切断共享
    public Team2 WithMembers() => this with { Members = new List<string>(Members) };
}
```

**或者用不可变集合彻底避免这个问题：**

```csharp
using System.Collections.Immutable;

public record Team3(string Name, ImmutableList<string> Members);

var x = new Team3("A", ImmutableList.Create("张三"));
var y = x with { Members = x.Members.Add("李四") };   // Add 返回新集合，不改原集合

Console.WriteLine(x.Members.Count);    // 1
Console.WriteLine(y.Members.Count);    // 2
```

> **`ImmutableList<T>` 是什么**：`System.Collections.Immutable` 命名空间下的不可变集合，任何"修改"操作都返回新集合，原集合永远不变。**和 record 是绝配**——record 保证字段引用不变，`ImmutableList` 保证集合内容不变，两者合起来才是真正不可变。

---

## Step 12（P100/P101 收尾）：一个能直接用的 DTO

**这一步把 record 用回你的图书管理系统。**

```csharp
namespace SugarDemo;

// 接口返回模型：只读、可序列化、可当缓存 key
public record BookDto(long Id, string Title, double Price, string AuthorName)
{
    // 计算属性：不参与构造，也不参与相等性
    public string Display => $"{Title}（{AuthorName}）￥{Price}";
}

// 分页结果的通用包装：泛型 + record
public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int PageIndex, int PageSize)
{
    public int TotalPages => (int)Math.Ceiling(Total / (double)PageSize);
    public bool HasNext => PageIndex < TotalPages;
}
```

```csharp
using SugarDemo;

var books = new List<BookDto>
{
    new(1, "C# 入门", 59.9, "张三"),
    new(2, "EF Core 实战", 79.0, "李四"),
    new(3, "ASP.NET Core 内幕", 99.0, "王五"),
};

var page = new PagedResult<BookDto>(books, Total: 42, PageIndex: 1, PageSize: 3);

Console.WriteLine($"第 {page.PageIndex}/{page.TotalPages} 页，本页 {page.Items.Count} 条，共 {page.Total} 条");
foreach (var b in page.Items) Console.WriteLine("  " + b.Display);
Console.WriteLine($"有没有下一页：{page.HasNext}");
```

**输出：**

```
第 1/14 页，本页 3 条，共 42 条
  C# 入门（张三）￥59.9
  EF Core 实战（李四）￥79
  ASP.NET Core 内幕（王五）￥99
  有没有下一页：True
```

**两个点值得注意：**

| 特性 | 说明 |
|---|---|
| `Display` 计算属性**不参与相等性** | 只有构造函数参数（`Id`/`Title`/`Price`/`AuthorName`）进 `Equals`/`GetHashCode` |
| `PagedResult<T>` 是**泛型 record** | record 支持泛型，`PagedResult<BookDto>` 和 `PagedResult<AuthorDto>` 是两个独立类型 |

**这就是你以后写接口的默认姿势**：`record` 承载数据，`class` 承载行为，`record` 当 DTO 发给前端。

---

==四：总结==

**五节一页速查**

| 节 | 一句话结论 | 关键符号 |
|---|---|---|
| **P97** 顶级语句 | 编译器替你写 `class Program` + `<Main>$`；一个项目只能有一个文件这么干 | `<Main>$` / `[CompilerGenerated]` |
| **P97** 全局 using | 写一次，全项目生效；`ImplicitUsings` 已经在替你写 | `global using` / `<ImplicitUsings>` |
| **P98** using 声明 | 摊平嵌套，代价是资源活到方法结束——**中途读自己写的文件会崩** | `using var` / `await using` |
| **P98** 文件范围命名空间 | `namespace X;` 一行搞定整个文件，省一层花括号 | `namespace X;` |
| **P99** 可空引用类型 | 编译期提醒空引用，**运行时一行检查都没有** | `string?` / `!` / `#nullable` |
| **P100** record 基础 | 一行拿到值相等 + `ToString` + 只读属性 | `record Person(...)` / `init` |
| **P101** record 原理 | record 就是 class，`with` 是浅拷贝，可变字段会毁掉哈希 | `<Clone>$` / `EqualityContract` / `MemberwiseClone` |

**六个语法一句话记住**

| 语法 | 记忆点 |
|---|---|
| 顶级语句 | "`Main` 没消失，只是藏进了 `Program` 类" |
| 全局 using | "`global` = 从文件级升到项目级" |
| using 声明 | "省了花括号，代价是活到方法末尾" |
| 文件范围 namespace | "分号代替花括号" |
| 可空引用类型 | "只警告，不检查" |
| record | "值语义的 class" |

**九个易错点**

1. **一个项目里写了两个文件的顶级语句** → CS8802，报错信息在第二个文件上，看起来像是那个文件有问题。
2. **顶级语句写在了 `using` 之前** → CS8803，因为 `using` 必须先出现。
3. **以为顶级语句里声明的方法是局部函数** → 它是 `Program` 的 `private static` 方法，反编译能看到。
4. **`using var` 之后在同一方法里读同一个文件** → `IOException: ...being used by another process`，其实占用者是你自己。
5. **只 `using var writer` 不 `using var stream`** → 或者顺序写反（先 stream 后 writer 是对的，反过来先创建的流会在后面释放），容易漏。
6. **以为把 `string?` 改成 `string` 就不会崩了** → 编译期警告消失，运行时该崩还是崩。
7. **`!` 当"消警告按钮"用** → 它是"我保证非空"的**承诺**，不是检查。承诺错了就 `NullReferenceException`。
8. **可变属性放在 record 里又当 `HashSet` key** → 改了属性哈希就变，`Contains` 永远返回 `false`。
9. **把 EF Core 实体改成 record** → `init` 属性让 EF 没法改属性做变更跟踪；`with` 出来的副本不在跟踪里，`SaveChanges()` 存不进去。

**一个对照表：什么时候用 record，什么时候用 class**

| 判断 | 用 |
|---|---|
| 这个东西"是什么值"（两本书 Id 一样就是同一本） | `record` |
| 这个东西"是哪个对象"（两个购物车就算是空的也不同） | `class` |
| 会传给前端 / 会被序列化 | `record` |
| 会被 EF Core 跟踪 | `class` |
| 需要可变状态、需要累加、需要生命周期 | `class` |
| 需要放进 `Dictionary` 当 key | `record` |

**记忆口诀**

> **顶级语句不是"没有 Main"，是"Main 被藏进 Program 类"；反编译一眼就看见 `<Main>$`。**
> **`global using` 把 using 从"文件级"提到"项目级"；`ImplicitUsings=enable` 是编译器替你写的那一批。**
> **`using var` 只改作用域，不改语义：它仍然是 try/finally，只不过 finally 挪到了方法末尾。**
> **所以在方法中途读自己写的文件，会被自己的句柄挡住；想吃掉这个坑，给它一对花括号。**
> **`namespace X;` 一个分号结束战斗，代价是一个文件只能有一个命名空间。**
> **可空引用类型是"编译期的提醒"，不是"运行时的保险"；`string` 和 `string?` 编译后是同一个类型。**
> **`!` 是你对编译器的承诺，不是编译器对你的检查——承诺错了就 NRE。**
> **record 就是 class，只是编译器替你写了 `Equals`/`GetHashCode`/`==`/`ToString`/`<Clone>$` 那一堆。**
> **`with` 是浅拷贝：改 `string` 安全，改 `List` 会连带改原对象——要真复制，得自己 `new` 一个集合。**
> **最后一句：这五节讲的全是"糖"（除了 `using` 作用域那个坑）。糖不影响能力，但影响你读懂 2021 年之后的 C# 代码——而你现在写的每一行，都是 2021 年之后的写法。**

---

## 附：这批语法在你项目里的落点

| 你项目里的现象 | 对应的语法 | 出处 |
|---|---|---|
| `Program.cs` 只有几行、没有 `Main` | 顶级语句 | P97 |
| `Program.cs` 里 `await app.RunAsync()` 能直接写 | 顶级语句的 await 特权 | P97 |
| Controller 里没写 `using Microsoft.AspNetCore.Mvc;` 也能用 `[HttpGet]` | `ImplicitUsings` 自动引入 Web SDK 那批命名空间 | P97 |
| `Program.cs` 里 `var builder = WebApplication.CreateBuilder(args);` 之后直接 `builder.Services.AddControllers()` | 全局 using + 顶级语句 | P97 |
| 属性下面有绿色波浪线（`string Title`） | CS8618，`<Nullable>enable</Nullable>` | P99 |
| `long? ReviewerId` 这种可空外键 | 可空引用/值类型语法 | P99 |
| 接口返回 `new { b.Id, b.Title }` | 匿名类型，升级版就是 record | P100 |
| 以后写 `BookDto` / `PagedResult<T>` | record | P100 / P101 |

**下一批（P102–P109）开始进入 ASP.NET Core 本体：入门 → MVC → HotReload → WebAPI 入门 → REST。**
