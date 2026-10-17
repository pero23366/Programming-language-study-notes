==一：概念==
```csharp
**接口**是一种**规范/标准**，它只规定“必须有什么行为”，不提供任何具体实现。任何类只要“签了合同”（声明实现这个接口），就必须自己把接口里规定的所有功能都实现出来。

接口表达的是 **“能做什么”** 的能力，而不是“是什么”。比如飞机和鸟在继承上毫无关系，但它们都能飞，就可以都实现 `IFly` 接口。

三个核心特点：

- **不能实例化**，但可以用接口类型的变量装实现类的对象。
    
- **一个类可以实现多个接口**，突破了 C# 类只能单继承的限制。
    
- **接口成员不能有方法体**，不能有字段，默认是 `public`。
```
==二：格式==
**声明接口：**
```csharp
interface 接口名
{
    返回值类型 方法名(参数列表);   // 只有声明，分号结尾
}
```
**类实现接口：**
```csharp
class 类名 : 接口名
{
    public 返回值类型 方法名(参数列表)   // 必须是 public，不用 override
    {
        // 具体实现
    }
}
```
**核心规则：**

- 接口**不能实例化**，但可以用接口类型变量装实现类对象（里氏替换）。
    
- 一个类**可以同时实现多个接口**，用逗号隔开。
    
- 如果同时继承类和实现接口，**类必须写在最前面**：`class Dog : Animal, IFly`。
    
- 实现接口的方法**必须是 `public`**，且**不需要写 `override`**。
    
- 接口命名通常以 **`I`** 开头，如 `IFly`、`IAttackable`。
==三：代码==
```csharp
// 接口：定义“能攻击”的规范
interface IAttackable
{
    void Attack();
}

// 接口：定义“能防御”的规范
interface IDefendable
{
    void Defend();
}

// 战士：只能攻击
class Warrior : IAttackable
{
    public void Attack()
    {
        Console.WriteLine("战士挥剑攻击");
    }
}

// 守卫：只能防御
class Guardian : IDefendable
{
    public void Defend()
    {
        Console.WriteLine("守卫举盾防御");
    }
}

// 圣骑士：既能攻击，也能防御（实现两个接口）
class Paladin : IAttackable, IDefendable
{
    public void Attack()
    {
        Console.WriteLine("圣骑士用圣光攻击");
    }

    public void Defend()
    {
        Console.WriteLine("圣骑士用圣盾防御");
    }
}
```
**主程序测试：**
```csharp
// 接口类型变量装实现类对象
IAttackable w = new Warrior();
IDefendable g = new Guardian();

w.Attack();   // 输出：战士挥剑攻击
g.Defend();   // 输出：守卫举盾防御

// 圣骑士两个身份都能用
Paladin p = new Paladin();
IAttackable pa = p;
IDefendable pd = p;

pa.Attack();  // 输出：圣骑士用圣光攻击
pd.Defend();  // 输出：圣骑士用圣盾防御

// 接口做参数：不关心具体是什么类，只关心有没有这个能力
static void LetItAttack(IAttackable obj)
{
    obj.Attack();
}

LetItAttack(new Warrior());   // 输出：战士挥剑攻击
LetItAttack(new Paladin());   // 输出：圣骑士用圣光攻击
```
==四：总结==

| 要点          | 内容                                                   |
| ----------- | ---------------------------------------------------- |
| **本节主题**    | 多态的第三种实现方式：接口（interface）                             |
| **核心概念**    | 接口表示一种能力/规范，定义“能做什么”，不规定“怎么做”                        |
| **关键字**     | `interface`（声明接口）、`:`（实现接口）、`public`（实现成员必须是 public） |
| **接口成员**    | 只能有方法、属性、索引器、事件；不能有字段；不能有实现                          |
| **独特功能一**   | **一个类可以实现多个接口**，突破单继承限制                              |
| **独特功能二**   | 毫无关系的类可以共享同一种能力                                      |
| **独特功能三**   | 接口做参数/变量，可以统一处理不同家族的类                                |
| **与抽象类的区别** | 抽象类是单继承、表达“是什么”；接口可多实现、表达“**能做什么**”                  |
| **易错点**     | 接口里写方法体；实现时忘写 `public`；实现时多写 `override`；试图 `new` 接口  |

一句话收尾：**抽象类管“是不是”，接口管“能不能”。** 到这一节，多态的三种实现方式（`vob`、抽象类、接口）就全部学完了。