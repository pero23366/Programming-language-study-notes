==一：概念==
```csharp
**密封类是什么？**

用 `sealed` 关键字修饰的类，叫做**密封类**。它的核心特点是：**不能被继承**。

csharp

sealed class Player : GameObject
{
    // Player 不能被其他类继承
}

**为什么需要密封类？**

- **保证程序的规范性、安全性**：有些类设计出来就是为了作为最终形态使用的，不应该再被修改或扩展。
    
- **防止意外的继承**：在团队协作或框架设计中，密封类可以明确告诉其他开发者：“这个类不能再继承了”。
    
- **性能优化**：密封类的方法调用可以跳过虚方法表查找，直接调用，效率更高（这是进阶话题，暂时了解即可）。
    

**密封类的限制：**

- 密封类**不能被继承**。
    
- 密封类**不能和 `abstract` 一起使用**（抽象类必须被继承，密封类不能被继承，两者互斥）。
    
- 密封类**可以有构造函数、字段、方法**，也可以 `new` 创建实例，只是不能被继承。
    

**密封方法是什么？**

`sealed` 也可以用来修饰**方法**，但必须和 `override` 一起出现。它的作用是：**让一个虚方法在重写之后，不能被再下一层的子类继续重写**。

csharp

class A
{
    public virtual void Say() { }
}
class B : A
{
    public sealed override void Say() { }   // B 重写了 Say，并密封
}
class C : B
{
    public override void Say() { }   // ❌ 编译错误：Say 已被密封
}

**密封方法的意义**：当某个子类重写了虚方法后，不希望它的子类再修改这个方法，就可以用 `sealed override` 锁住。
```
==二：格式==
**密封类：**
```csharp
sealed class 类名 : 父类
{
    // 类成员
}
```
**密封方法：**
```csharp
class 子类 : 父类
{
    public sealed override 返回类型 方法名()
    {
        // 方法体
    }
}
```
**注意：**

- 密封类用 `sealed` 修饰在 `class` 前面。
    
- **密封方法必须同时有 `sealed` 和 `override`，缺一不可。**
    
- 密封方法只能用于重写虚方法或抽象方法之后。
==三：代码==
**密封类示例**
```csharp
using System;

class GameObject
{
    public string name;

    public GameObject(string name)
    {
        this.name = name;
    }
}

// 密封类：Player 不能再被继承
sealed class Player : GameObject
{
    public Player(string name) : base(name) { }

    public void Attack()
    {
        Console.WriteLine(name + " 发动攻击");
    }
}

// ❌ 编译错误：Player 是密封类，不能被继承
// class Master : Player { }

class Program
{
    static void Main()
    {
        Player p = new Player("勇士");
        p.Attack();   // 输出：勇士 发动攻击
    }
}
```
**关键点**：`Player` 可以正常创建对象、调用方法，只是不能被其他类继承。

### 密封方法示例
```csharp
using System;

class A
{
    public virtual void Say()
    {
        Console.WriteLine("A.Say");
    }
}

class B : A
{
    // B 重写 Say，并用 sealed 密封
    public sealed override void Say()
    {
        Console.WriteLine("B.Say");
    }
}

class C : B
{
    // ❌ 编译错误：Say 已被 B 密封，不能再重写
    // public override void Say() { }
}

class Program
{
    static void Main()
    {
        A obj = new B();
        obj.Say();   // 输出：B.Say（多态仍然生效）
    }
}

```
**关键点**：

- `B` 用 `sealed override` 重写了 `Say()`。
    
- `C` 继承 `B` 后，不能再重写 `Say()`。
    
- 多态仍然生效：`A obj = new B(); obj.Say();` 输出 `B.Say`
==四：总结==

1. **概念**：密封类用 `sealed` 修饰，不能被继承；密封方法用 **sealed override`，让虚方法在重写后不能再被下层重写。
    
2. **格式**：
    
    - 密封类：`sealed class 类名 : 父类 { }`
        
    - 密封方法：`public sealed override 返回类型 方法名() { }`
        
3. **使用场景**：
    
    - 密封类：某些类设计为最终形态，不允许再被扩展。
        
    - 密封方法：某个子类重写虚方法后，不希望再被修改。
        
4. **注意事项**：
    
    - 密封类不能和 `abstract` 一起用。
        
    - **** 密封方法必须和 `override` 一起用。****
        
    - 密封类仍然可以实例化、调用方法，只是不能被继承。
        
    - 多态对密封方法仍然生效（父类变量调用时，执行的是密封方法重写后的版本）。
        

==**记忆口诀**：==

> `sealed` 一贴，**继承断绝**；`sealed override`，重写到此为止。