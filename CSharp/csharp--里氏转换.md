==一：概念==
```csharp
**里氏替换原则（LSP）**  
父类变量可以指向子类对象，即“父类容器可以装子类”。

csharp

GameCharacter c = new Warrior();

这样做的好处是：可以用统一的父类容器（如 `List<GameCharacter>`）管理不同子类对象。

**父类容器的限制**  
父类变量只能调用父类中定义的成员，不能直接调用子类特有的方法。

csharp

c.Attack();        // ✅ 父类有 Attack
c.ShieldBlock();   // ❌ 父类没有，编译错误

**is 和 as**  
用于在运行时判断对象的真实类型，并安全地转换回子类，以便调用子类特有成员。

- `is`：判断对象是否是指定类型，返回 `bool`。
  //最好有这一步
    %% `is 检查的是对象的真实类型`，不是变量的声明类型。%%
- `as`：将对象转换为指定类型，成功返回对象，失败返回 `null`。
    

**与多态的区别**

- 里氏替换原则解决“**能不能装**”的问题。
    
- 多态（`virtual` + `override`）解决“**调用哪个版本**”的问题。  
    用父类容器装子类对象本身不是多态，只有虚方法重写才是。
```
==二：格式：==
**父类容器装子类对象**
```csharp
父类类型 变量名 = new 子类类型();
```
**is 判断**
```csharp
if (对象 is 子类类型)
{
    // 是这种类型
}
```
**as 转换**
```csharp
子类类型 变量名 = 对象 as 子类类型;
if (变量名 != null)
{
    // 转换成功，可以使用子类成员
}
```
**模式匹配（推荐，C# 7.0+）**
```csharp
if (对象 is 子类类型 变量名)
{
    // 判断成功的同时完成转换，直接使用变量名
}
```
==三：代码==
```csharp
using System;
using System.Collections.Generic;

// 父类
class GameCharacter
{
    public string name;

    public virtual void Attack()
    {
        Console.WriteLine(name + " 发动攻击");
    }
}

// 子类：战士
class Warrior : GameCharacter
{
    public override void Attack()
    {
        Console.WriteLine(name + " 挥剑攻击");
    }

    public void ShieldBlock()
    {
        Console.WriteLine(name + " 使用盾牌格挡");
    }
}

// 子类：法师
class Mage : GameCharacter
{
    public override void Attack()
    {
        Console.WriteLine(name + " 释放火球");
    }

    public void Teleport()
    {
        Console.WriteLine(name + " 闪现");
    }
}

// 子类：弓箭手
class Archer : GameCharacter
{
    public override void Attack()
    {
        Console.WriteLine(name + " 射箭");
    }

    public void Trap()
    {
        Console.WriteLine(name + " 布置陷阱");
    }
}

class Program
{
    static void Main()
    {
        // 父类容器装子类对象
        List<GameCharacter> list = new List<GameCharacter>();

        Warrior w = new Warrior(); w.name = "战士";
        Mage m = new Mage();       m.name = "法师";
        Archer a = new Archer();   a.name = "弓箭手";

        list.Add(w);
        list.Add(m);
        list.Add(a);

        // 第一次遍历：多态调用 Attack
        foreach (GameCharacter c in list)
        {
            c.Attack();
        }

        Console.WriteLine("------------");

        // 第二次遍历：is 判断 + 调用子类特有方法
        foreach (GameCharacter c in list)
        {
            if (c is Warrior warrior)
            {
                warrior.ShieldBlock();
            }
            else if (c is Mage mage)
            {
                mage.Teleport();
            }
            else if (c is Archer archer)
            {
                archer.Trap();
            }
        }
    }
}
```
==四：总结==

| 要点         | 说明                                               |
| ---------- | ------------------------------------------------ |
| **核心概念**   | 父类变量可以指向子类对象（`Father f = new Son();`）            |
| **主要作用**   | 用统一父类容器存储和管理不同子类对象                               |
| **父类容器限制** | 只能调用父类中定义的成员，不能直接调用子类特有方法                        |
| **is**     | 判断对象是否是指定类型，返回 `bool`                            |
| **as**     | 将对象转换为指定类型，成功返回对象，失败返回 `null`                    |
| **标准用法**   | 先用 `is` 判断，再用 `as` 转换；推荐模式匹配 `if (obj is 子类 变量)` |
| **与多态区别**  | 里氏替换解决“能不能装”，多态解决“调用哪个版本”                        |
| **注意**     | 用 `as` 后必须判空，否则可能空引用异常                           |

**记忆口诀：**

 >**父类装子类，判断用 is，转换用 as，转换之后判空再使用。**  
> **is 返回 bool，as 返回对象或 null。**

