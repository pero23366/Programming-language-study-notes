==一：概念==
结构体和类在语法上非常相似，都可以包含字段、方法、构造函数等，但它们最根本的区别在于**类型本质**：

| 对比项                 | **结构体 (struct)**   | **类 (class)**        |
| ------------------- | ------------------ | -------------------- |
| **类型**              | **值类型**            | **引用类型**             |
| **存储位置**            | 栈（Stack）或内联在对象中    | 堆（Heap）              |
| **赋值行为**            | **复制数据**（两个变量互不影响） | **复制引用**（两个变量指向同一对象） |
| **能否继承**            | ❌ 不能继承，也不能被继承      | ✅ 可以继承               |
| **默认构造函数**          | ❌ 不能显式声明无参构造       | ✅ 有默认无参构造            |
| **析构函数**            | ❌ 不能声明             | ✅ 可以声明               |
| **`protected` 修饰符** | ❌ 不能使用             | ✅ 可以使用               |
| **字段初始值**           | ❌ 字段声明时不能赋值        | ✅ 可以                 |
| **`static` 修饰**     | ❌ 不能是静态结构体         | ✅ 可以是静态类             |
### 为什么会有这两种类型？

- **结构体**：轻量级数据容器，适合存储少量数据，分配和释放成本低[](https://download.microsoft.com/download/4/D/1/4D1D0562-C215-46DD-B9B9-210059914BCE/VS2005_CSharp_zh-cn.pdf#167#71)。
    
- **类**：功能完整的面向对象类型，支持继承和多态，适合描述复杂对象[](https://download.microsoft.com/download/4/D/1/4D1D0562-C215-46DD-B9B9-210059914BCE/VS2005_CSharp_zh-cn.pdf#167#71)。

==二：格式==
### 结构体声明

```csharp

struct 结构体名
{
    // 字段（不能赋初始值）
    public int X;
    public int Y;
    // 可以有带参构造函数（必须初始化所有字段）
    public 结构体名(int x, int y)
    {
        X = x;
        Y = y;
    }
    // 可以有方法
    public void Show() { ... }
}

```
### 类声明

```csharp

class 类名
{
    // 字段（可以赋初始值）
    public int X = 10;
    public int Y = 20;
    // 可以有任意构造函数
    public 类名() { }
    public 类名(int x, int y) { X = x; Y = y; }
    // 可以有析构函数
    ~类名() { }
    // 可以有方法、属性、事件等
}
```

### 关键语法差异

|语法点|结构体|类|
|---|---|---|
|无参构造函数|❌ 不能显式声明|✅ 可以|
|带参构造函数|✅ 可以，但**必须初始化所有字段**|✅ 可以，随意|
|字段初始值|❌ 不能写 `= 值`|✅ 可以|
|`protected` 成员|❌ 不允许|✅ 允许|
|析构函数 `~类名()`|❌ 不允许|✅ 允许|
|继承|❌ `struct A : B` 不允许|✅ `class A : B` 允许|

[](https://blog.csdn.net/mrtang_unity/article/details/122083211/)
==三：代码==
```csharp
using System;

namespace StructVsClass
{
    // 结构体：值类型
    struct PointStruct
    {
        public int X;
        public int Y;

        public PointStruct(int x, int y)
        {
            X = x;
            Y = y;
        }
    }

    // 类：引用类型
    class PointClass
    {
        public int X;
        public int Y;

        public PointClass(int x, int y)
        {
            X = x;
            Y = y;
        }
    }

    class Program
    {
        static void Main()
        {
            // ===== 核心差异：赋值行为 =====
            Console.WriteLine("--- 结构体（值类型）赋值 ---");
            PointStruct s1 = new PointStruct(1, 2);
            PointStruct s2 = s1;      // 复制数据
            s2.X = 100;
            Console.WriteLine($"s1.X = {s1.X}");   // 1（不受影响）
            Console.WriteLine($"s2.X = {s2.X}");   // 100

            Console.WriteLine("--- 类（引用类型）赋值 ---");
            PointClass c1 = new PointClass(1, 2);
            PointClass c2 = c1;       // 复制引用
            c2.X = 100;
            Console.WriteLine($"c1.X = {c1.X}");   // 100（被影响了！）
            Console.WriteLine($"c2.X = {c2.X}");   // 100

            // ===== 结构体不能继承 =====
            // struct MyStruct : PointStruct { }  // ❌ 编译错误
            // class MyClass : PointClass { }     // ✅ 可以

            // ===== 结构体字段不能赋初始值 =====
            // struct BadStruct { public int X = 10; }  // ❌ 编译错误
        }
    }
}
```
==四：总结==

|维度|结构体 (struct)|类 (class)|
|---|---|---|
|**本质**|值类型|引用类型|
|**内存**|栈/内联|堆|
|**赋值**|复制数据|复制引用|
|**继承**|❌ 不支持|✅ 支持|
|**多态**|❌ 不支持|✅ 支持|
|**无参构造**|❌ 不能显式声明|✅ 默认有|
|**字段初值**|❌ 不能指定|✅ 可以|
|**析构函数**|❌ 不能声明|✅ 可以|
|**`protected`**|❌ 不允许|✅ 允许|
|**`static`**|❌ 不能是静态结构体|✅ 可以是静态类|

### 如何选择？

**优先使用类（class），除非满足以下所有条件才考虑结构体：**

1. 逻辑上表示**单个值**（如坐标、颜色、区间）
    
2. 实例大小**小于 16 字节**
    
3. **不可变**（创建后不修改）
    
4. 不会频繁装箱拆箱
    

**一句话总结：**

> **结构体是轻量级的值类型，适合封装少量纯数据；类是功能完整的引用类型，支持继承和多态，适合描述复杂对象。** 实际开发中，**90% 的情况都用类**，结构体只在性能敏感且数据极小的场景下才考虑使用。