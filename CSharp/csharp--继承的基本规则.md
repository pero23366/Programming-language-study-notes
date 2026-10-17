==一：概念==
```csharp
**继承是什么？**  
让一个类（子类）拥有另一个类（父类）的成员，实现代码复用。

**核心关系：is-a**  
如果“子类是一种父类”，就可以继承。例如：`Car` 是一种 `Vehicle`，`Student` 是一种 `Person`。

**关键规则：**

- C# 只支持**单继承**：一个类只能有一个直接父类。
    
- 子类自动拥有父类中 `public` 和 `protected` 的成员。
    
- `private` 成员**不能**被子类直接访问（但对象内存里仍然存在）。
    
- 继承可以传递：`A → B → C`，C 也拥有 A 的成员。
    
```


**访问修饰符在继承中的表现：**

|修饰符|父类内部|子类内部|外部代码|
|---|---|---|---|
|`public`|✅|✅|✅|
|`protected`|✅|✅|❌|
|`private`|✅|❌|❌|

> `protected` 可以理解为“对子类开放的私有成员”。

==二：格式==
**父类：** 和普通类一样。
```csharp
class 父类名
{
    // 字段、方法等
}
```
**子类：** 用冒号 `:` 指定继承的父类。
```csharp
class 子类名 : 父类名
{
    // 子类自己特有的成员
}
```
**同名成员的处理格式：**

- 隐藏父类成员：`public new 返回类型 方法名()`
    //父类指向子类时候，调用父类
- 重写父类虚方法：父类写 `public virtual ...`，子类写 `public override ...`
  //父类指向子类时候，调用子类

==三：代码==
```csharp
using System;

// 父类
class Vehicle
{
    public string brand;          // 公开，外部可访问
    protected int speed;          // 受保护，子类内部可访问
    private int price;            // 私有，子类也不能访问

    public void Run()
    {
        Console.WriteLine("Vehicle is running");
    }

    protected void ShowSpeed()
    {
        Console.WriteLine("Speed: " + speed);
    }

    public virtual void Move()    // 虚方法，允许子类重写
    {
        Console.WriteLine("Vehicle is moving");
    }
}

// 子类继承父类
class Car : Vehicle
{
    public int doors;

    // 通过方法给父类的 protected 字段赋值
    public void SetSpeed(int s)
    {
        speed = s;
    }

    public void ShowInfo()
    {
        Console.WriteLine("Brand: " + brand);   // 继承来的 public
        ShowSpeed();                            // 继承来的 protected 方法
        Console.WriteLine("Doors: " + doors);
        // Console.WriteLine(price);            // 编译错误：private 不能访问
    }

    // 隐藏父类的 Run 方法
    public new void Run()
    {
        Console.WriteLine("Car is running");
    }

    // 重写父类的虚方法 Move
    //虚方法指的是用 `virtual` 关键字修饰的方法。
    //**虚方法的作用：允许子类用 `override` 重写它。**
    public override void Move()
    {
        Console.WriteLine("Car is moving");
    }
}

class Program
{
    static void Main()
    {
        Car myCar = new Car();
        myCar.brand = "Su7";
        myCar.doors = 4;
        myCar.SetSpeed(120);

        myCar.ShowInfo();
        // 输出：
        // Brand: Su7
        // Speed: 120
        // Doors: 4

        myCar.Run();        // 子类变量，new 隐藏 → Car is running

        Vehicle v = myCar;  // 父类变量指向子类对象
        v.Run();            // 父类变量，new 隐藏 → Vehicle is running
        v.Move();           // override 重写 → Car is moving
    }
}
```
==四：总结==
- **继承用 `:`C# 只支持单继承**。
    //一个儿子不能有多个父亲
- **子类自动获得父类 `public` 和 `protected` 成员**，`private` 成员不能直接访问。
    //例：class a,class b,class Main,
    public:123
    protected:12
    private:1
- **`protected` 只允许父类和子类的内部代码访问**，外部通过对象访问会报错。
    
- **子类可以添加自己特有的成员**，也可以隐藏或重写父类同名成员。
    
- **`new` 隐藏**：
    
    - 看变量的编译时类型。
        
    - 父类变量调父类版本，子类变量调子类版本。
        
- **`override` 重写**：
    
    - 父类方法必须是 `virtual`。
        
    - 看对象的运行时类型。
        
    - 父类变量指向子类对象时，调用子类版本。
        
- **记忆口诀**：
    //Vechicle v =myCar
    - `new`：变量是什么类型，就调哪个版本。
        //Vechicle
    - `override`：对象是什么类型，就调哪个版本。
       //myCar