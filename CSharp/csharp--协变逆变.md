**协变（out）：**

> 你有一个“**只负责往外拿**”的工具箱（`IEnumerable<Dog>`）。  
> 你从里面拿出来的，都是狗。  
> 但狗也是动物，所以你也可以把它当成“**只负责往外拿**”的动物箱（`IEnumerable<Animal>`）来用。
> 
> **关键：往外拿（out），拿出来的东西可以“当父类用”。**

**逆变（in）：**

> 你有一个“**只负责往里放**”的工具箱（`Action<Animal>`）。  
> 它能接受任何动物放进去。  
> 既然它能接受任何动物，那它当然也能接受狗放进去。  
> 所以你可以把它当成“**只负责往里放**”的狗箱（`Action<Dog>`）来用。
> 
> **关键：往里放（in），能接受父类的，当然也能接受子类。**

==一：概念==

**协变和逆变是什么？**

它们是描述**泛型类型参数在继承关系中如何转换**的规则。简单说，就是**当一个泛型类型（如`IEnumerable<Derived>`）的类型参数存在继承关系（`Derived` 继承 `Base`）时，这个泛型类型本身能否进行隐式引用转换**。

**核心规则：**

|术语|英文|关键字|规则|方向|
|---|---|---|---|---|
|**协变**|Covariance|`out`|允许**派生类**（更具体）替换**基类**（更不具体）|**子类 → 父类**（和谐，所以叫"协"）|
|**逆变**|Contravariance|`in`|允许**基类**（更不具体）替换**派生类**（更具体）|**父类 → 子类**（反过来，所以叫"逆"）|

**打个比方：**

- **协变 (`out`)**：你有一个`IEnumerable<Cat>`（只读的猫列表），它可以安全地当作`IEnumerable<Animal>`（只读的动物列表）来用。因为从里面**取出**一只猫，它当然也是一只动物。
    
- **逆变 (`in`)**：你有一个`Action<Animal>`（能处理任何动物的方法），它可以安全地当作`Action<Cat>`（能处理猫的方法）来用。因为一个能处理所有动物的方法，**喂给它**一只猫，它当然也能处理。
    

**关键点：**

- **协变(`out`)**：类型参数只能用于**输出**位置（如方法返回值），代表"产出"。
    
- **逆变(`in`)**：类型参数只能用于**输入**位置（如方法参数），代表"消费"。
    
- **不变**：既不支持协变也不支持逆变的泛型类型，如`List<T>`。
==二：格式==

**声明变体泛型接口：**

```csharp

// 协变接口：用 out 修饰类型参数，T 只能用于返回值
interface IProducer<out T>
{
    T Produce();  // T 在输出位置
}
// 逆变接口：用 in 修饰类型参数，T 只能用于参数
interface IConsumer<in T>
{
    void Consume(T item);  // T 在输入位置
}
```

**声明变体泛型委托：**

```csharp

// 协变委托
delegate T Factory<out T>();
// 逆变委托
delegate void Handler<in T>(T item);
```
- `T` 出现在**返回值** → 用 `out` → 协变
    
- `T` 出现在**参数** → 用 `in` → 逆变
**使用规则：**

- `out` 和 `in` 关键字只能用于**泛型接口**和**泛型委托**。
    
- **泛型类**和**泛型方法**的类型参数**不支持**协变和逆变。
    
- 类型必须是**引用类型**，值类型（如`int`）不支持。
==三：代码==

### 示例 1：协变 (`out`) —— `IEnumerable<T>`

```csharp

using System;
using System.Collections.Generic;
class Animal { public string Name; }
class Dog : Animal { }
class Program
{
    static void Main()
    {
        // 创建一个"狗的集合"
        IEnumerable<Dog> dogs = new List<Dog> { new Dog { Name = "旺财" } };
        // 协变：IEnumerable<Dog> 可以隐式转换为 IEnumerable<Animal>
        // 因为 IEnumerable<T> 在 .NET 中定义为 IEnumerable<out T>
        IEnumerable<Animal> animals = dogs; // ✅ 编译通过
        foreach (var animal in animals)
        {
            Console.WriteLine(animal.Name); // 旺财
        }
    }
}
```

**为什么安全？** `IEnumerable<T>` 是**只读**的，你只能从中**取出**元素。取出一只狗，它当然也是一只动物，所以安全。

### 示例 2：逆变 (`in`) —— `Action<T>`

```csharp

using System;
class Animal { public string Name; }
class Dog : Animal { }
class Program
{
    static void Main()
    {
        // 一个能处理任何动物的方法
        Action<Animal> animalHandler = (Animal a) => Console.WriteLine("处理动物: " + a.Name);
        // 逆变：Action<Animal> 可以隐式转换为 Action<Dog>
        // 因为 Action<T> 在 .NET 中定义为 Action<in T>
        Action<Dog> dogHandler = animalHandler; // ✅ 编译通过
        // 喂给它一只狗，它能处理（因为它连动物都能处理）
        dogHandler(new Dog { Name = "旺财" }); // 输出: 处理动物: 旺财
    }
}

```
**为什么安全？** `Action<T>` 是**只写**的，你只能向它**传入**参数。一个能处理所有动物的方法，喂给它一只狗，当然也能处理。

### 示例 3：自定义变体接口

```csharp

// 协变接口
interface IReadOnlyContainer<out T>
{
    T Get(); // T 只用于返回值
}
// 逆变接口
interface IWriteOnlyContainer<in T>
{
    void Set(T value); // T 只用于参数
}
// 实现类
class AnimalContainer<T> : IReadOnlyContainer<T>, IWriteOnlyContainer<T>
{
    private T _value;
    public T Get() => _value;
    public void Set(T value) => _value = value;
}
class Program
{
    static void Main()
    {
        // 协变
        IReadOnlyContainer<Dog> dogContainer = new AnimalContainer<Dog>();
        IReadOnlyContainer<Animal> animalContainer = dogContainer; // ✅
        // 逆变
        IWriteOnlyContainer<Animal> animalWrite = new AnimalContainer<Animal>();
        IWriteOnlyContainer<Dog> dogWrite = animalWrite; // ✅
    }
}
```

==四：总结==

### 核心要点

|要点|说明|
|---|---|
|**协变 (`out`)**|子类→父类，类型参数用于**输出**（返回值）|
|**逆变 (`in`)**|父类→子类，类型参数用于**输入**（方法参数）|
|**适用范围**|仅限**泛型接口**和**泛型委托**|
|**不适用范围**|泛型类、泛型方法、值类型|
|**目的**|让泛型代码更灵活，增强类型兼容性|

### 记忆口诀

> **`out` 出协变，`in` 入逆变。**  
> **输出用 out，输入用 in；out 让子替父，in 让父替子。**

### 什么时候用？

- **你自己设计泛型接口/委托时**：如果类型参数只用于返回值，就加 `out`；如果只用于参数，就加 `in`。
    
- **使用现有库时**：理解为什么 `IEnumerable<Dog>` 能当 `IEnumerable<Animal>` 用，而 `List<Dog>` 不能。
    

### 一句话总结

> **协变和逆变是泛型接口/委托的“类型转换规则”——协变(`out`)让“更具体的集合”能当“更不具体的集合”用（只读场景）；逆变(`in`)让“更通用的处理器”能当“更具体的处理器”用（只写场景）。**