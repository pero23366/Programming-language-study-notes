==一：概念==
**密封函数**的核心作用是：**阻止一个虚方法或抽象方法在子类中继续被重写。**

之前学过，父类的 `virtual` 方法可以被一层层子类不断 `override` 下去。但有时候，某个子类重写完这个方法后，不希望它的子类再改了。这时候，就在这个方法前面加上 `sealed` 关键字。

关键词义：

- **sealed** 修饰类 → **密封类**，不能被继承（P32 学过）。
    
- **sealed** 修饰方法 → **密封函数**，不能被继续重写。
    

密封函数只用在一种场景下：**子类重写父类虚方法时，顺便把这个方法“封死”。** 它必须和 `override` 一起出现，不能单独使用。[](https://zhuanlan.zhihu.com/p/480568766#0)

用一个比喻来理解：爷爷留了一份遗嘱（`virtual` 方法），爸爸有权修改（`override`），但爸爸改完之后说“就按我改的办，以后谁也别再改了”（`sealed override`），于是孙子就不能再改这份遗嘱了
==二：格式==
**在子类中重写父类虚方法时，加上 sealed：**

```csharp
class 子类 : 父类
{
    public sealed override 返回值类型 方法名(参数列表)
    {
        // 子类的具体实现
    }
}
```
**核心规则：**

- `sealed` 必须和 `override` 一起使用，不能单独写在普通方法上。
    
- 密封函数**只能出现在已经重写了父类虚方法的子类中**，不能直接在父类里把 `virtual` 方法标成 `sealed`。
    
- 一旦某个方法被标记为 `sealed override`，它的所有后代子类都**不能再重写**这个方法，否则编译报错。
    
- 密封类不能被继承，密封函数不能被重写，但密封函数不影响类的继承关系——类还是可以继续被继承，只是这一个方法被“封死”了。
==三：代码==
```csharp
// 爷爷类
class Animal
{
    public virtual void Speak()
    {
        Console.WriteLine("动物发出声音");
    }
}

// 爸爸类：重写 Speak
class Person : Animal
{
    public override void Speak()
    {
        Console.WriteLine("人说话");
    }
}

// 儿子类：重写 Speak，并加上 sealed，从此封死
class WhitePerson : Person
{
    public sealed override void Speak()
    {
        Console.WriteLine("白种人说话");
    }
}

// 孙子类：试图再次重写 Speak → 编译报错
class LittleWhitePerson : WhitePerson
{
    // 下面这行会报错：CS0239，无法重写继承成员，因为它是密封的
    // public override void Speak()
    // {
    //     Console.WriteLine("小白人说话");
    // }
}
```
**在主程序中测试：**
```csharp
Animal a = new Animal();
Person p = new Person();
WhitePerson w = new WhitePerson();

a.Speak();   // 输出：动物发出声音
p.Speak();   // 输出：人说话
w.Speak();   // 输出：白种人说话
```
**关键观察：**

- `Animal` 的 `Speak()` 是 `virtual`，所以 `Person` 可以 `override`。
    
- `Person` 重写后没有加 `sealed`，所以 `WhitePerson` 还可以继续 `override`。
    
- `WhitePerson` 重写时加了 `sealed`，**从这里开始，后面的子类不能再重写 `Speak()` 了**。[](https://zhuanlan.zhihu.com/p/480568766#0)
    

如果去掉 `LittleWhitePerson` 中注释的那段代码，编译器会直接报错，这就是密封函数的作用。
==四：总结==

|要点|内容|
|---|---|
|**本节主题**|密封函数（密封方法），多态体系的收尾知识点|
|**核心概念**|阻止虚方法或抽象方法在子类中继续被重写|
|**关键字**|`sealed`|
|**使用场景**|子类重写父类虚方法时，用 `sealed override` 把方法封死|
|**必须搭配**|必须和 `override` 一起出现，不能单独使用|
|**与密封类的区别**|密封类（P32）禁止整个类被继承；密封函数只禁止**一个方法**被继续重写|
|**易错点**|把 `sealed` 单独写在普通方法上（报错）；在密封函数的后代子类中再次尝试 `override`（报错 CS0239）|

一句话收尾：**密封类封的是“整个类”，密封函数封的是“一个方法”。** 到这一节，多态相关的全部知识点——`vob`、抽象类、接口、密封函数——就全部学完了。