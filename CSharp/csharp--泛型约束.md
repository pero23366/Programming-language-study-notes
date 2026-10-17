==一：概念==

**泛型约束是什么？**

泛型约束就是**给泛型参数（比如 `T`）加上限制条件**，规定它必须满足某些要求才能被使用。

**为什么需要它？**

回顾一下，泛型 `T` 是个“万能占位符”，但也正因为太万能，编译器对它一无所知，所以无法在泛型代码里做任何“有前提”的操作[](https://www.bilibili.com/opus/643283176435744771)。比如：

```csharp

class MyClass<T>
{
    public void DoSomething()
    {
        T instance = new T();  // ❌ 编译报错！编译器不知道 T 有没有无参构造函数
    }
}
```

编译器会报错，因为它不知道 `T` 到底有没有一个公开的无参构造函数。**泛型约束就是来解决这类问题的**，它告诉编译器：“放心，我保证 `T` 一定满足这些条件”，这样编译器就允许你调用那些“有前提”的操作了。

**核心价值：**

- **对使用者**：规定了哪些类型能传进来，用错了编译期就报错，更安全。
    
- **对编译器**：解锁了在泛型代码里使用特定类型的能力（比如调用特定方法、创建实例）。
    

**打个比方：**

泛型约束就像**招聘要求**。泛型 `T` 是“招个人”，但有些岗位必须持证上岗（比如电工证）。`where T : 电工` 就是在说：“来应聘的这个人，必须持有电工证。”这样你才能放心让他去接电线。
==二：格式==

泛型约束使用 `where` 关键字，语法是：

```csharp

where 泛型字母 : 约束条件
```

**常见的约束类型：**

|约束写法|含义|作用|
|---|---|---|
|`where T : struct`|**值类型约束**|T 必须是值类型（如 int, float, 自定义 struct）|
|`where T : class`|**引用类型约束**|T 必须是引用类型（如 string, 自定义类）|
|`where T : new()`|**无参构造约束**|T 必须有一个公开的无参构造函数|
|`where T : 类名`|**基类约束**|T 必须是该类本身或其派生类|
|`where T : 接口名`|**接口约束**|T 必须实现该接口|
|`where T : U`|**泛型约束**|T 必须是另一个泛型参数 U 或 U 的派生类|

**使用规则：**[](https://www.bilibili.com/opus/643283176435744771)[](https://blog.csdn.net/VAherggoooooo/article/details/119132776)

- **可以组合**：多个约束用逗号隔开，例如 `where T : class, new()`
    
- **`new()` 放最后**：`new()` 约束通常写在最后
    
- **多个泛型各自约束**：多个类型参数需要多个 `where`，用空格隔开，例如 `class C<T, U> where T : class where U : struct`
    
- **部分组合禁止**：`struct` 和 `new()` 不能同时使用，因为值类型默认就有无参构造

==三：代码==

### 值类型约束 `where T : struct`
```csharp

class ValueHolder<T> where T : struct
{
    public T Value;
}
// 使用
ValueHolder<int> h1 = new ValueHolder<int>();      // ✅ int 是值类型，可以
ValueHolder<float> h2 = new ValueHolder<float>();  // ✅ float 是值类型，可以
// ValueHolder<string> h3 = new ValueHolder<string>(); // ❌ 编译报错！string 是引用类型
```

### 引用类型约束 `where T : class`

```csharp

class RefHolder<T> where T : class
{
    public T Value;
}
// 使用
RefHolder<string> h1 = new RefHolder<string>();    // ✅ string 是引用类型，可以
RefHolder<object> h2 = new RefHolder<object>();    // ✅ object 是引用类型，可以
// RefHolder<int> h3 = new RefHolder<int>();       // ❌ 编译报错！int 是值类型
```

### 无参构造约束 `where T : new()`

```csharp

class Factory<T> where T : new()
{
    public T CreateInstance()
    {
        return new T();  // ✅ 因为约束了 new()，所以编译器允许这里 new T()
    }
}
// 使用
Factory<MyClass> f = new Factory<MyClass>();
MyClass obj = f.CreateInstance();  // 成功创建 MyClass 实例

```
### 基类约束 `where T : 类名`

```csharp

class Animal { public void Eat() { } }
class AnimalHolder<T> where T : Animal
{
    public void MakeItEat(T animal)
    {
        animal.Eat();  // ✅ 因为约束了 T 是 Animal 或其派生类，所以可以调用 Eat()
    }
}
```

### 接口约束 `where T : 接口名`

```csharp

interface IFly { void Fly(); }
class Flyer<T> where T : IFly
{
    public void MakeItFly(T obj)
    {
        obj.Fly();  // ✅ 因为约束了 T 实现 IFly，所以可以调用 Fly()
    }
}

```
### 组合约束与多个泛型

```csharp

class Repository<T, K> 
    where T : class, new()   // T 是引用类型，且有无参构造
    where K : struct          // K 是值类型
{
    // ...
}

```
### 泛型约束的实际应用：你写过的 `Stack<Cell>`

```csharp

// 在 .NET 源码中，Stack<T> 并没有加约束
// 但如果你写一个需要“能比较大小”的泛型类，就必须约束
class Sorter<T> where T : IComparable<T>
{
    public void Sort(T[] array)
    {
        // 因为约束了 T 实现 IComparable<T>，
        // 所以这里可以放心使用 CompareTo 方法
        Array.Sort(array);
    }
}
// 使用
Sorter<int> s = new Sorter<int>();   // ✅ int 实现了 IComparable<int>
// Sorter<object> o = new Sorter<object>(); // ❌ object 没实现 IComparable<object>
```
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|概念|给泛型参数加限制，规定它必须满足某些条件|
|关键字|`where`|
|核心价值|解锁泛型代码里的特定操作，同时增强类型安全|
|常见约束|`struct`, `class`, `new()`, 基类名, 接口名, 泛型字母|

### 约束类型速查

|约束|含义|解锁的能力|
|---|---|---|
|`struct`|值类型|可以 `Nullable<T>` 等|
|`class`|引用类型|可以用 `==`、`!=` 比较引用|
|`new()`|有无参构造|可以 `new T()` 创建实例|
|基类名|是该类或派生类|可以调用基类的成员|
|接口名|实现了该接口|可以调用接口的方法|
|`U`|是 U 或 U 的派生类|可以转换为 U 使用|

### 使用规则

- 多个约束用**逗号**隔开
    
- 多个泛型用**多个 `where`**
    
- `new()` 通常写在**最后**
    
- `struct` 和 `new()` **不能同时使用**
    

### 一句话总结

> **泛型约束就是给 `T` 立规矩——告诉编译器“我保证 T 一定能满足这些条件”，从而解锁泛型代码里的特定能力，同时把类型错误提前到编译期。**

### 和你之前知识的联系

- **泛型**：先学“怎么用占位符”，再学“怎么给占位符立规矩”
    
- **你写过的 `Stack<Cell>`**：虽然没有加约束，但 Cell 本身是个类，所以 Stack 内部能用 `==` 判断引用相等，这就是隐式满足 `class` 约束的能力
    
- **你写过的 `Dictionary<string, int>`**：string 是引用类型，int 是值类型，它们各自满足了 Dictionary 内部的约束
    

**泛型约束是泛型的“高级用法”，实际开发中很多框架和库都靠它来保证类型安全。你现在理解了“是什么”和“怎么用”，以后看到 `where T : ...` 就知道它在干嘛了。**