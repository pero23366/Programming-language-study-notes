==一、概念==
```csharp

**万物之父 `object`**  
C# 中所有类型最终都继承自 `System.Object`（关键字 `object`）。

- `object` 是**引用类型**，但可以装下任何类型的值或对象。
    
- 根据里氏替换原则，父类容器可以装子类对象，所以 `object` 变量可以指向任意对象。
    
- 常用场景：用 `object[]` 或 `ArrayList` 统一存储不同类型的数据；函数参数用 `object` 表示任意类型。
    

**装箱与拆箱**  
值类型（`int`、`bool`、`float`、结构体等）与 `object` 之间转换时发生：

- **装箱**：值类型 → `object`，在堆上分配新对象并复制值，**隐式**发生。
    
- **拆箱**：`object` → 值类型，从堆对象复制回栈，**必须显式强制转换**。
    
- 装箱拆箱有性能开销（堆分配、复制、GC 压力），能避免就避免。
    

**类型检查与转换工具**

- `is`：判断对象是否是指定类型，返回 `bool`。
    
- `as`：**尝试**安全转换，成功返回目标类型对象，失败返回 `null`。只能用于引用类型和可空值类型。
  //如果不是引用类型或可空值类型（值类型？）则会报错
    
- `GetType()`：返回对象**运行时实际类型**（`Type` 对象），常用于调试或精确判断。
    
- 模式匹配：`if (obj is 类型 变量)` 一步完成判断、转换、赋值。
```

==二、格式==

**子类默认行为：**

```csharp

// 万物之父装一切
object 变量 = 任意对象;

// 装箱（隐式）
object o = 123;

// 拆箱（显式）
int i = (int)o;

// is 判断
if (obj is int) { ... }

// as 安全转换（引用类型或可空值类型）
Person p = obj as Person;
int? num = obj as int?;

// 模式匹配（判断 + 转换 + 赋值）
if (obj is Person p) { p.SayHello(); }

// GetType 查看实际类型
Console.WriteLine(obj.GetType());        // 完整类型名（含命名空间）
Console.WriteLine(obj.GetType().Name);   // 仅类名
```
==三、代码==

```csharp

using System;

class Person
{
    public string name;
    public Person(string name) { this.name = name; }
    public void SayHello() { Console.WriteLine("我是" + name); }
}

class Program
{
    static void Main()
    {
        object[] items = new object[4];
        items[0] = new Person("张三");   // 引用类型，直接放
        items[1] = 123;                  // 装箱：int → object
        items[2] = "hello";              // 引用类型，直接放
        items[3] = true;                 // 装箱：bool → object

        for (int i = 0; i < items.Length; i++)
        {
            object obj = items[i];
            Console.WriteLine("实际类型：" + obj.GetType());

            if (obj is Person p)
            {
                p.SayHello();                    // 模式匹配直接使用
            }
            else if (obj is int)
            {
                int? num = obj as int?;          // 拆箱：object → int?
                Console.WriteLine("值+1：" + (num + 1));
            }
            else if (obj is string s)
            {
                Console.WriteLine("字符串长度：" + s.Length);
            }
            else
            {
                Console.WriteLine("未知类型");
            }
            Console.WriteLine("---");
        }
    }
}
```

输出：

实际类型：Person
我是张三
---
实际类型：System.Int32
值+1：124
---
实际类型：System.String
字符串长度：5
---
实际类型：System.Boolean
未知类型
---

==四、总结==

```csharp
一、**万物之父**：`object` 是所有类型的基类，可以装任何对象，常用于统一容器或不确定类型。

二、**装箱拆箱**：值类型与 `object` 互转。装箱隐式、拆箱显式；有性能代价，避免频繁使用。

三、**类型判断与转换**：

- `is` → 判断类型，返回 `bool`。
    
- `as` → 安全转换，失败返回 `null`，只能用于引用类型或可空值类型。
    
- `GetType()` → 查看运行时真实类型。
    
- 模式匹配 `if (obj is 类型 变量)` 最简洁，一步到位。
    

四、**注意事项**：

- `as` 的结果必须赋值给变量才能使用，不能单独写 `obj as Person;`。
    
- 拆箱必须用强制转换 `(int)obj`，且要确保类型匹配，否则抛异常。
    
- 能用具体类型就用具体类型，不要为了“通用”而滥用 `object`，以免引入不必要的装箱拆箱。
    
- `GetType()` 返回完整类型名，`.Name` 只取类名。
    

**记忆口诀**：  
万物之父 `object`，装箱拆箱有代价；  
`is` 判断 `as` 转换，模式匹配最方便；  
`GetType` 看真身，类型安全记心间。
```
%%object a=new object[4]%%
***不报错，但是！！a就无法存值了***