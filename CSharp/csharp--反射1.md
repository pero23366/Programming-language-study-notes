==一：概念==

**反射是什么？**

反射是程序在**运行时**检查自身结构，并动态操作这些结构的能力。简单说，就是**代码在运行时“看”自己有哪些类、方法、字段，并且可以动态地创建对象、调用方法、访问字段**。

**为什么需要它？**

你写代码时，类型是编译时定死的：

csharp

Student s = new Student(); // 编译时就知道是 Student
s.SayHello();               // 编译时就知道有 SayHello

但有些场景，**编译时根本不知道要用哪个类**：

- 从配置文件读到一个类名 `"MyPlugin"`，怎么创建它？
    
- 框架需要扫描所有类，找到带 `[Serializable]` 标签的，怎么扫？
    
- Unity 的 Inspector 怎么知道一个 `MonoBehaviour` 有哪些字段要显示？
    

反射就是解决这类问题的——**运行时再查、再建、再调**。

**核心关键类：`Type`**

`Type` 是反射的入口，它代表“一个类型的信息”[](https://cloud.tencent.cn/developer/article/2476644?from=15425#1)。通过 `Type`，你可以拿到这个类所有的：

- 方法（`GetMethods`）
    
- 字段（`GetFields`）
    
- 属性（`GetProperties`）
    
- 构造函数（`GetConstructors`）[](https://se.inf.ethz.ch/courses/2014a_spring/JavaCSharp/lectures/Lecture_08_B_Cs_reflection.pdf#1#1)
    

**打个比方：**

普通写代码像**照着菜谱做菜**——菜谱写什么你做什么。反射像**拿着食材问“你能做成什么菜”**——你手里有个东西（对象），你可以在运行时去“问”它：你是什么类型？你有哪些方法？然后动态地调用它们。

**面试为什么必考？**

因为它考察你对**程序运行时机制**的理解，是框架设计的基石。ORM、依赖注入、序列化、Unity的Inspector，底层全是反射。
==二：格式==

**引入命名空间：**

```csharp

using System.Reflection;
```

**获取 `Type` 的三种方式：**

```csharp

// 方式一：通过对象实例
Student s = new Student();
Type t1 = s.GetType();
// 方式二：通过 typeof 运算符（编译时已知类型）
Type t2 = typeof(Student);
// 方式三：通过类名字符串（编译时未知，运行时查）[reference:4]
Type t3 = Type.GetType("demo01.Student");
```

**通过 `Type` 获取成员信息：**

```csharp

MethodInfo[] methods = t.GetMethods();        // 所有方法
FieldInfo[] fields = t.GetFields();           // 所有公开字段
PropertyInfo[] props = t.GetProperties();     // 所有属性
ConstructorInfo[] ctors = t.GetConstructors(); // 所有公开构造函数
```

**动态创建对象（`Activator` 类）：**

```csharp

object obj = Activator.CreateInstance(t); // 用无参构造创建实例[reference:5]

```
**动态调用方法（`MethodInfo.Invoke`）：**

```csharp

MethodInfo m = t.GetMethod("SayHello");
m.Invoke(obj, null); // obj是实例，null是无参数[reference:6]
```

**动态读写字段（`FieldInfo.GetValue` / `SetValue`）：**

```csharp

FieldInfo f = t.GetField("name");
object val = f.GetValue(obj);   // 读[reference:7]
f.SetValue(obj, "新值");        // 写
```

==三：代码==

### 示例1：获取类的基本信息

```csharp

using System;
using System.Reflection;
class Student
{
    public string name;
    private int id;
    public void SayHello() { Console.WriteLine("你好，我是" + name); }
    public int GetId() { return id; }
}
class Program
{
    static void Main()
    {
        Type t = typeof(Student);  // 获取 Student 的类型信息
        Console.WriteLine("类名：" + t.Name);          // Student
        Console.WriteLine("命名空间：" + t.Namespace); // 全局命名空间（无）
        // 获取所有公开方法
        foreach (MethodInfo m in t.GetMethods())
        {
            Console.WriteLine("方法：" + m.Name);
        }
        // 输出会包含 SayHello、GetId，以及从 object 继承的 ToString 等
        // 获取所有公开字段
        foreach (FieldInfo f in t.GetFields())
        {
            Console.WriteLine("字段：" + f.Name);
        }
        // 输出：name（private id 不会被列出，因为 GetFields 默认只返回 public 的）[reference:8]
    }
}
```

**关键观察：** `GetFields()` 默认只返回 **public** 字段，`id` 是 private，所以看不到。

### 示例2：动态创建对象并调用方法

```csharp

using System;
using System.Reflection;
class Student
{
    public string name;
    public void SayHello() { Console.WriteLine("你好，我是" + name); }
}
class Program
{
    static void Main()
    {
        // 编译时不知道 Student 类？用字符串获取类型
        Type t = Type.GetType("Student");  // 注意：需要完全限定名，这里简化了
        // 动态创建实例
        object obj = Activator.CreateInstance(t);
        // 动态调用方法
        MethodInfo sayHello = t.GetMethod("SayHello");
        sayHi.Invoke(obj, null);  // 输出：你好，我是（name为空）
        // 动态设置字段
        FieldInfo nameField = t.GetField("name");
        nameField.SetValue(obj, "唐老狮");
        // 再调用一次
        sayHello.Invoke(obj, null);  // 输出：你好，我是唐老狮
    }
}
```

**关键理解：** 整个过程，**代码里没有出现 `new Student()`，也没有直接写 `obj.SayHello()`**。一切都是运行时动态完成的。

### 示例3：运行时动态调用——你当年计算器的困扰

```csharp

using System;
using System.Reflection;
class Calculator
{
    public int Add(int a, int b) { return a + b; }
    public int Subtract(int a, int b) { return a - b; }
}
class Program
{
    static void Main()
    {
        string 用户输入的方法名 = "Add"; // 用户选择的方法
        Type t = typeof(Calculator);
        object calc = Activator.CreateInstance(t);
        // 运行时根据字符串找方法
        MethodInfo method = t.GetMethod(用户输入的方法名);
        object result = method.Invoke(calc, new object[] { 3, 5 });
        Console.WriteLine("结果：" + result); // 8
    }
}
```

**这就是你当年想要的**——不用写一堆 `if`，根据运行时传入的字符串，动态找到并调用方法。**反射给了你这个能力。**
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|**概念**|运行时检查和操作程序结构的能力|
|**入口**|`Type` 类，通过 `GetType()`、`typeof` 或 `Type.GetType()` 获取|
|**核心类**|`MethodInfo`、`FieldInfo`、`PropertyInfo`、`ConstructorInfo`|
|**创建实例**|`Activator.CreateInstance(t)`|
|**调用方法**|`methodInfo.Invoke(实例, 参数数组)`|
|**读写字段**|`fieldInfo.GetValue/SetValue(实例, 值)`|

### 反射的三种“用法”

|用法|代码|场景|
|---|---|---|
|**获取类型信息**|`typeof(Student)`|知道类名时|
|**运行时查类型**|`obj.GetType()`|有对象但不知道类型时|
|**完全动态**|`Type.GetType("完整类名")`|编译时完全不知道类型时|

### 和你之前知识的联系

|你学过的|和反射的关系|
|---|---|
|**你当年的计算器**|“不知道用户输入什么类型”——反射就是解决这个的|
|**泛型**|反射可以在运行时创建泛型类型 `typeof(List<>)`|
|**委托**|反射可以动态创建委托来调用方法|
|**特性（下一课）**|特性是贴在代码上的标签，反射是读取标签的工具|

### 一句话总结

> **反射是程序在运行时“照镜子”的能力——看自己有哪些类、方法、字段，并且动态地创建对象、调用方法、访问字段。它是框架设计的基石，也是理解C#运行时机制的钥匙。**

### 学习建议

反射的API很多，**不要试图一次记全**。先记住三个核心：

1. **`Type`**：类型信息的入口
    
2. **`Activator.CreateInstance`**：动态创建对象
    
3. **`MethodInfo.Invoke`**：动态调用方法