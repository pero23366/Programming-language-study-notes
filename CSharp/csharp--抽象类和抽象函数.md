==一：概念==
**抽象类**和**抽象函数**是多态的第二种实现方式，核心思想一句话：

> **父类只规定“必须有什么行为”，不规定“具体怎么做”，把实现的责任完全交给子类。**

对比上一节的 `vob`：


|virtual（vob）|abstract（抽象）|
|---|---|---|
|父类方法有方法体吗|有|**没有**|
|子类必须重写吗|可选，不重写就用父类的|**必须重写**|


两个关键词义：

- **abstract 修饰类** → 抽象类，**不能被 `new`**。
    
- **abstract 修饰方法** → 抽象方法，**没有方法体**，只能写在抽象类里。
    
- 抽象方法也叫**纯虚方法**，相当于一个完全没有实现的虚方法。
==二：格式==
**抽象类 + 抽象方法：**
```csharp
abstract class 类名
{
    public abstract 返回值类型 方法名(参数列表);   // 只有声明，分号结尾
}
```
**子类继承并重写：**
```csharp
class 子类名 : 抽象类名
{
    public override 返回值类型 方法名(参数列表)
    {
        // 子类具体实现
    }
}

```
**核心规则：**

- 抽象类**不能实例化**，但可以用它类型的变量装子类对象（里氏替换）。
    
- 抽象方法**只能写在抽象类里**，普通类里不能有。
    
- ==子类**必须重写全部抽象方法**；少重写一个，子类自己也得是 `abstract`。==
    
- 抽象类里**可以放普通成员**（字段、普通方法、构造函数），不是所有东西都必须是抽象的。
==三：代码==
```csharp
// 抽象类：怪物
abstract class Monster
{
    public string name;
    public int hp;

    public Monster(string name, int hp)
    {
        this.name = name;
        this.hp = hp;
    }

    public abstract void Attack();   // 抽象方法：只规定“必须会攻击”
    public abstract void Defend();   // 抽象方法：只规定“必须会防御”

    public void ShowInfo()           // 普通方法：所有怪物都一样，直接写在父类
    {
        Console.WriteLine(name + "  HP:" + hp);
    }
}

// 子类：史莱姆
class Slime : Monster
{
    public Slime() : base("史莱姆", 50) { }

    public override void Attack()
    {
        Console.WriteLine("史莱姆吐酸液");
    }

    public override void Defend()
    {
        Console.WriteLine("史莱姆缩成一团");
    }
}

// 子类：巨龙
class Dragon : Monster
{
    public Dragon() : base("巨龙", 500) { }

    public override void Attack()
    {
        Console.WriteLine("巨龙喷火焰");
    }

    public override void Defend()
    {
        Console.WriteLine("巨龙展翅格挡");
    }
}
```
==四：总结==

|要点|内容|
|---|---|
|**本节主题**|多态的第二种实现方式：抽象类和抽象函数|
|**核心概念**|父类规定“必须有什么行为”，子类负责“具体怎么做”|
|**关键字**|`abstract`（修饰类和方法）、`override`（子类重写）|
|**抽象类特点**|不能实例化；可含普通成员；可含抽象方法|
|**抽象方法特点**|无方法体；只能在抽象类里；子类必须重写|
|**与 vob 的区别**|`virtual` 有方法体、可重写可不重写；`abstract` 无方法体、必须重写|
|**易错点**|忘记 `override`；试图 `new` 抽象类；子类没重写完却不当抽象类|

一句话收尾：**抽象类就是“管有没有”，子类就是“管怎么做”。** 它是 `vob` 的升级版，把“可选重写”变成了“**强制重写**”，为下一节的**接口**打下基础。