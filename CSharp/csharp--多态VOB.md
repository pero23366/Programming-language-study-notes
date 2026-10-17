==一：概念==
```csharp
**多态**是什么？一句话概括：

> **同一类型对象，执行相同行为，有不同的表现。**

举个例子：父类 `GameObject` 有一个方法 `Atk()`，子类 `Player` 和子类 `Monster` 都继承自 `GameObject`。当你用父类类型的变量去调用 `Atk()` 时，如果变量里装的是 `Player` 对象，就执行 `Player` 的 `Atk()`；如果装的是 `Monster` 对象，就执行 `Monster` 的 `Atk()`。同一个方法调用，因为对象不同而产生了不同的结果，这就是多态。

这一节讲的 **“vob”** ，是**运行时多态**的一种实现方式，依靠三个关键字配合完成[](https://zhuanlan.zhihu.com/p/478698627#0)：

- **v = virtual**：写在父类的方法前，表示“这个方法可以被重写”。
    
- **o = override**：写在子类的方法前，表示“我重新实现了父类那个虚方法”。
    
- **b = base**：在子类中访问父类的成员，常用来**保留父类原有的逻辑**，再额外拓展。
    

这里有一个**初学者最容易踩的坑**：如果在子类中不用 `override`，而是用 `new` 关键字来“覆盖”父类方法，表面上看起来也能调用到子类的方法，但实际上**不构成多态**。因为当你用父类容器装载子类对象时，调用的仍然会是父类的方法，而不是子类重写的方法，这就破坏了“同一对象唯一行为”的表现[](https://zhuanlan.zhihu.com/p/478698627#0)。

所以记住：**实现多态，必须用 `virtual` + `override` 这一对组合。**
```

==二：格式==
**父类中定义虚方法：**
```csharp
public virtual 返回值类型 方法名(参数列表)
{
    // 父类中的默认逻辑
}
```
**子类中重写虚方法：**
```csharp
public override 返回值类型 方法名(参数列表)
{
    // 子类自己的逻辑
    // 如果需要保留父类逻辑，可以用 base.方法名() 先调用父类版本
}
```
**核心规则：**

- `virtual` 和 `override` 必须**成对出现**：父类写了 `virtual`，子类才能写 `override`。
    
- 子类中如果用 `base.方法名()`，会先执行父类的逻辑，然后再执行子类中 `base` 调用之后的代码，实现“在父类行为基础上扩展”[](https://zhuanlan.zhihu.com/p/478698627#0)。
==三：代码==
用一个最经典的例子来演示。假设有一个父类 `GameObject`，和两个子类 `Player`、`Monster`
```csharp
// 父类
class GameObject
{
    public string name;

    public GameObject(string name)
    {
        this.name = name;
    }

    // virtual：声明这是一个虚方法，允许子类重写
    public virtual void Atk()
    {
        Console.WriteLine(name + " 发动了基础攻击");
    }
}

// 子类 Player
class Player : GameObject
{
    public Player(string name) : base(name) { }

    // override：重写父类的 Atk 方法
    public override void Atk()
    {
        base.Atk();  // 先调用父类原有的攻击逻辑
        Console.WriteLine(name + " 额外发射了一枚子弹");  // 再追加子类特有的逻辑
    }
}

// 子类 Monster
class Monster : GameObject
{
    public Monster(string name) : base(name) { }

    public override void Atk()
    {
        Console.WriteLine(name + " 用爪子进行了攻击");
    }
}
```
**在主程序中测试多态效果：**
```csharp
GameObject p = new Player("唐老狮");   // 父类容器装子类对象（里氏替换原则）
GameObject m = new Monster("小怪物");

p.Atk();   // 输出：唐老狮 发动了基础攻击 / 唐老狮 额外发射了一枚子弹
m.Atk();   // 输出：小怪物 用爪子进行了攻击
```
**关键观察：** 变量 `p` 和 `m` 的类型都是 `GameObject`，但调用 `Atk()` 时，实际执行的是各自子类中 `override` 过的方法。这就是多态——“同一类型对象，执行相同行为，有不同的表现”。
==四：总结==

|要点|内容|
|---|---|
|**本节主题**|多态的实现方式之一：vob（virtual + override + base）|
|**核心概念**|同一类型对象，执行相同行为，有不同的表现|
|**关键字**|`virtual`（父类标记）、`override`（子类重写）、`base`（保留父类行为）|
|**必须成对**|`virtual` 和 `override` 缺一不可，不能用 `new` 替代|
|**base 的作用**|在子类中调用父类逻辑，实现“保留父类行为 + 子类扩展”|
|**易错点**|用 `new` 隐藏父类方法不构成多态，里氏替换后调用的是父类版本|

这一节是多态的第一个实现方式，后面还会学到**抽象类和抽象函数**、**接口**来实现多态，但 `vob` 是最基础、最常用的一种，务必先把这一节的格式和用法练熟。