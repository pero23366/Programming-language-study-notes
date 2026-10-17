==一：概念==

**Assembly 和 Activator 是什么？**

它们是反射中用于 **“动态加载”** 和 **“动态创建”** 的两个核心类。

- **`Assembly`**：代表一个**程序集**。你可以把它理解为一个 `.dll` 或 `.exe` 文件。`Assembly` 允许你在运行时**动态加载**一个程序集文件，并从中获取类型信息[](https://www.cnblogs.com/lxw1541524663/p/19259917#1)。这就像是你手里多了一本“新字典”，可以随时翻看里面有什么内容。
    
- **`Activator`**：是一个**对象工厂**。它的核心方法是 `CreateInstance`，能根据你提供的 `Type` 对象，**动态地创建**这个类型的实例（对象）。
    

**为什么需要它们？**

- **`Assembly` 的意义在于“解耦”和“扩展”**。你的主程序可以完全不引用某个功能模块（.dll）。在运行时，根据配置或用户操作，动态加载这个 .dll，并调用里面的功能。这就是**插件系统**的基础。
    
- **`Activator` 的意义在于“动态创建”**。当你从配置文件中读到一个类名（字符串），或者从 `Assembly` 中获取了一个 `Type` 时，你无法使用 `new` 关键字，因为编译器不知道这个类。`Activator` 就是来解决这个问题的，它能在运行时帮你 `new` 出对象。
    

**和上一课（Type）的关系：**

- **第40课的 `Type`**：告诉你“这个类有什么”（方法、字段、属性）。
    
- **本课的 `Assembly`**：告诉你“我有哪些类”（从哪个 .dll 里找）。
    
- **本课的 `Activator`**：告诉你“怎么把这个类变成对象”。
==二：格式==

**加载程序集（`Assembly`）：**

```csharp

using System.Reflection;
// 方式一：加载当前正在运行的程序集
Assembly asm1 = Assembly.GetExecutingAssembly();
// 方式二：根据文件路径加载指定的 .dll 或 .exe
Assembly asm2 = Assembly.LoadFrom(@"C:\MyProject\MyPlugin.dll");
// 方式三：根据程序集名称加载（需要该程序集在可搜索路径下）
Assembly asm3 = Assembly.Load("MyPlugin");

```
**从程序集中获取类型（`Type`）：**

```csharp

// 参数必须是类型的“完全限定名”（命名空间.类名）
Type t = asm2.GetType("MyPlugin.MyClass");

```
**动态创建对象（`Activator`）：**

```csharp

// 根据 Type 创建实例（调用无参构造函数）
object obj = Activator.CreateInstance(t);
// 如果需要调用带参数的构造函数，传入参数数组
object obj2 = Activator.CreateInstance(t, new object[] { 参数1, 参数2 });
```
==三：代码==
### 示例1：动态加载并创建对象

```csharp

using System;
using System.Reflection;
// 假设这是从外部 .dll 加载进来的类（在另一个项目中定义）
// namespace MyPlugin
// {
//     public class MyPluginClass
//     {
//         public void SayHello() { Console.WriteLine("Hello from Plugin!"); }
//     }
// }
class Program
{
    static void Main()
    {
        // 1. 动态加载程序集（这里用当前程序集模拟外部 .dll）
        Assembly asm = Assembly.GetExecutingAssembly();
        // 2. 获取类型
        Type t = asm.GetType("MyPlugin.MyPluginClass");
        // 3. 动态创建对象
        object obj = Activator.CreateInstance(t);
        // 4. 调用方法（复用上一课的知识）
        MethodInfo method = t.GetMethod("SayHello");
        method.Invoke(obj, null);
    }
}

```
**关键观察：** 整个过程，代码里**没有出现 `new MyPluginClass()`，也没有直接写 `obj.SayHello()`**。程序集、类型、对象、方法调用，全部在运行时动态完成。

### 示例2：用参数创建对象

```csharp

using System;
using System.Reflection;
class Student
{
    public string Name;
    public int Age;
    public Student(string name, int age)
    {
        Name = name;
        Age = age;
    }
    public void ShowInfo()
    {
        Console.WriteLine($"{Name}, {Age}岁");
    }
}
class Program
{
    static void Main()
    {
        Type t = typeof(Student);
        // 使用 Activator 创建对象，并传入构造函数参数
        object obj = Activator.CreateInstance(t, new object[] { "唐老狮", 18 });
        // 动态调用方法
        MethodInfo method = t.GetMethod("ShowInfo");
        method.Invoke(obj, null);
        // 输出：唐老狮, 18岁
    }
}

```
**关键理解：** `Activator.CreateInstance` 的第二个参数 `object[]` 会匹配到相应的构造函数。这里匹配的是 `Student(string name, int age)`。

### 示例3：你扫雷代码的潜在应用（插件式地图生成）

假设你扫雷游戏支持从外部加载不同的“地图生成器”：

```csharp

// 在外部 .dll 中定义
public interface IMapGenerator
{
    int[,] Generate(int rows, int cols, int mineCount);
}
public class RandomMapGenerator : IMapGenerator
{
    public int[,] Generate(int rows, int cols, int mineCount) { /* ... */ }
}
// 在你的主程序中
Assembly asm = Assembly.LoadFrom("MapGenerators.dll");
Type t = asm.GetType("MapGenerators.RandomMapGenerator");
IMapGenerator generator = (IMapGenerator)Activator.CreateInstance(t);
int[,] map = generator.Generate(16, 16, 40);
```

**这就是插件式设计的雏形**——主程序不依赖具体的生成器实现，而是在运行时动态加载。

==四：总结==

### 核心要点

|类|作用|关键方法|
|---|---|---|
|**`Assembly`**|代表程序集，用于动态加载 .dll / .exe|`LoadFrom()`, `GetType()`|
|**`Activator`**|对象工厂，用于动态创建实例|`CreateInstance()`|

### 和上一课（Type）的关系

|类|解决的问题|类比|
|---|---|---|
|**`Type`**|这个类有什么？（方法、字段）|产品说明书|
|**`Assembly`**|从哪里找这个类？|产品仓库（.dll 文件）|
|**`Activator`**|怎么把这个类变成对象？|生产线（根据说明书造产品）|

### 什么时候用它们？

- **插件系统**：主程序不引用插件，运行时动态加载并创建插件对象。
    
- **依赖注入**：框架根据配置，动态创建并注入依赖对象。
    
- **序列化/反序列化**：根据类型名（字符串）创建对象并填充数据。
    
- **Unity 中的脚本动态加载**：在编辑器或运行时加载外部程序集。
    

### 一句话总结

> **`Assembly` 负责“找”（加载程序集），`Activator` 负责“造”（创建对象）。它们让你能在运行时，完全动态地加载和创建代码，是构建可扩展、插件化系统的基石。**

### 和你之前知识的联系

|你学过的|和本课的关系|
|---|---|
|**第40课：`Type`**|`Assembly.GetType()` 返回的就是 `Type` 对象|
|**反射调用方法**|`Activator` 创建对象后，仍需 `MethodInfo.Invoke` 来调用方法|
|**你扫雷的 `Board`**|可以将地图生成逻辑抽象为接口，用 `Assembly` + `Activator` 动态加载不同生成器|
|**多态/接口**|动态创建的对象通常强转为接口类型来使用，体现了面向接口编程的思想|
