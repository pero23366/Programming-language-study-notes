==一：概念==
**命名空间（Namespace）** 是C#中用于**组织和管理类**的一种机制。它的核心作用可以总结为两点：

1. **管理类**：将不同功能、不同模块的类放在不同的命名空间中进行管理，让代码逻辑更清晰[](https://zhuanlan.zhihu.com/p/483060299#0)。
    
2. **将代码模块化**：通过命名空间，可以把相关的类组织在一起，避免代码混乱[](https://zhuanlan.zhihu.com/p/483060299#0)。
    

唐老狮用一个很形象的比喻来解释：**命名空间就像是一个“工具包”** ，在其中声明的类相当于各种工具。当我们要使用其中的工具时，需要先引用这个工具包，然后才能使用里面的工具[](https://zhuanlan.zhihu.com/p/483060299#0)。

命名空间在C#编程中非常常用，主要体现在两个方面：一是.NET框架本身使用命名空间来组织它的类（例如 `System` 命名空间中包含了 `Console` 类）；二是开发者可以声明自己的命名空间来组织大型项目中的代码。

### 为什么需要命名空间？

在没有命名空间的情况下，如果两个不同的模块都定义了一个名为 `Person` 的类，编译器就无法区分它们。而通过命名空间，可以将它们分别放在 `ModuleA.Person` 和 `ModuleB.Person` 中，互不冲突[](https://zhuanlan.zhihu.com/p/483060299#0)。
==二：格式==
### 1. 声明命名空间

使用 **`namespace`** 关键字来声明一个命名空间：

```csharp

namespace 命名空间名称
{
    // 类、接口、结构体等定义
}

```
命名空间的名称必须是有效的C#标识符名称。

### 2. 嵌套命名空间

命名空间可以被包裹（嵌套），即在一个命名空间内部再声明另一个命名空间：

```csharp

namespace 外层命名空间
{
    namespace 内层命名空间
    {
        class MyClass { }
    }
}
```

**也可以通过点号（`.`）来简写嵌套：**

```csharp

namespace 外层命名空间.内层命名空间
{
    class MyClass { }
}

```
### 3. 引用命名空间

==**只往上找父级，兄弟之间必须显式 `using` 或写完全限定名。**==

使用 **`using`** 关键字来引用其他命名空间，从而可以直接使用其中的公共类，而不必每次都写完整名称[](https://zhuanlan.zhihu.com/p/483060299#0)：

```csharp

using System;           // 引用System命名空间
using System.Collections.Generic;  // 引用泛型集合命名空间
```

### 4. 不同命名空间中同名类的使用

如果两个命名空间中有同名类，需要使用**完全限定名**来指明出处[](https://zhuanlan.zhihu.com/p/483060299#0)：

```csharp

命名空间A.MyClass obj = new 命名空间A.MyClass();
命名空间B.MyClass obj2 = new 命名空间B.MyClass();
```

### 5. 文件范围命名空间（C# 10+）

从C# 10开始，可以使用**文件范围命名空间声明**，将整个文件的所有类型都放在同一个命名空间中，语法更简洁：

```csharp

namespace MyApp.Services;  // 注意：这里用分号结尾，而不是大括号
class Greeter { }  // 自动属于 MyApp.Services 命名空间
```
==三：代码==
### 示例1：基本命名空间的声明与使用

```csharp

// 声明一个名为 GameTools 的命名空间
namespace GameTools
{
    // 在这个命名空间中定义一个 Player 类
    public class Player
    {
        public string Name;
        public void ShowInfo()
        {
            Console.WriteLine("玩家名称：" + Name);
        }
    }
}
// 声明另一个命名空间
namespace GameUI
{
    using GameTools;  // 引用 GameTools 命名空间
    public class UIManager
    {
        public void ShowPlayer()
        {
            // 由于引用了 GameTools，可以直接使用 Player 类
            Player p = new Player();
            p.Name = "唐老狮";
            p.ShowInfo();
        }
    }
}

```
### 示例2：不同命名空间中的同名类

```csharp

namespace NamespaceA
{
    public class MyClass
    {
        public void SayHello()
        {
            Console.WriteLine("我是 NamespaceA 中的 MyClass");
        }
    }
}
namespace NamespaceB
{
    public class MyClass
    {
        public void SayHello()
        {
            Console.WriteLine("我是 NamespaceB 中的 MyClass");
        }
    }
}
class Program
{
    static void Main(string[] args)
    {
        // 使用完全限定名来区分同名类
        NamespaceA.MyClass a = new NamespaceA.MyClass();
        NamespaceB.MyClass b = new NamespaceB.MyClass();
        a.SayHello();  // 输出：我是 NamespaceA 中的 MyClass
        b.SayHello();  // 输出：我是 NamespaceB 中的 MyClass
    }
}
```

### 示例3：在Unity中的实际应用

```csharp

using UnityEngine;  // 引用Unity引擎的命名空间
using System.Collections;  // 引用泛型集合命名空间
namespace MyGame
{
    public class GameManager : MonoBehaviour
    {
        void Start()
        {
            // 可以直接使用 MonoBehaviour 和 Debug，
           // 因为它们来自 using 引用的命名空间
            Debug.Log("游戏开始！");
        }
    }
}
```
==四：总结==

| 项目       | 内容                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| **关键字**  | `namespace`（声明命名空间）、`using`（引用命名空间）                                                                                     |
| **核心作用** | 管理类，将代码模块化，避免命名冲突                                                                                                       |
| **主要特点** | ① 命名空间可以被包裹（嵌套）；② 允许不同命名空间存在同名类；③ 使用不同空间中同名类需要指明出处；④ 命名空间可以通过 `using` 关键字引用[](https://zhuanlan.zhihu.com/p/483060299#0) |
| **使用场景** | 大型项目中组织代码；引用.NET框架类库；Unity开发中组织游戏脚本                                                                                     |
| **命名建议** | 使用有意义的名称，通常采用 PascalCase（如 `MyGame.Player`）                                                                             |
|          |                                                                                                                         |
|          |                                                                                                                         |

**一句话总结**：命名空间就是**类的“工具包”** ，让代码更有组织、更清晰，不同工具包中可以有同名工具，使用时需要先引用工具包[](https://zhuanlan.zhihu.com/p/483060299#0)。

---

如果你在Unity中写脚本，通常会看到文件顶部有 `using UnityEngine;` 这样的语句，这就是在引用Unity引擎的命名空间。掌握了命名空间，你就能更好地理解为什么需要写这些 `using` 语句，也能在自己的项目中合理地组织代码结构。