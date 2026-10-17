==一、概念==
```csharp
继承中的构造函数，核心规则只有一条：

> **创建子类对象时，必须先执行父类的构造函数，再执行子类的构造函数。**
> (先执行父类无参的，再执行父类有参的)
> //如果有参一定要写方法a():b(){}

执行顺序是**从最顶层的父类开始，一路向下到子类**。  
例如 `A → B → C`，创建 `C` 对象时：先 `A()`，再 `B()`，最后 `C()`。

父类构造函数的作用是初始化父类那一部分数据；子类构造函数的作用是初始化子类自己特有的数据。  
如果父类没有无参构造函数，子类就必须用 `: base(...)` 显式告诉编译器：该调用父类的哪一个有参构造函数。
```
==二：格式==
**子类默认行为：**
```csharp
class 子类 : 父类
{
    public 子类()
    {
        // 编译器默认先调用父类无参构造 父类()
    }
}
```
**显式调用父类有参构造：**
```csharp
class 子类 : 父类
{
    public 子类(参数列表) : base(参数列表)
    {
        // 先执行父类对应构造函数，再执行这里
    }
}

```
**调用本类另一个构造函数：**
```csharp
class 子类 : 父类
{
    public 子类() : this(默认值)
    {
    }

    public 子类(参数) : base(参数)
    {
    }
}
```
- `class 子类 : 父类` —— 继承的冒号，永远必须。
    
- `public 子类(...) : base(...)` —— 调用父类构造的冒号，父类无参构造时必须写。
==三：代码==
```csharp
using System;

class Person
{
    public string name;

    public Person(string name)   // 只有有参构造，没有无参构造
    {
        this.name = name;
        Console.WriteLine("Person构造: " + name);
    }
}

class Student : Person
{
    public string school;

    public Student(string name, string school) : base(name)
    {
        this.school = school;
        Console.WriteLine("Student构造: " + school);
    }
}

class GraduateStudent : Student
{
    public string major;

    public GraduateStudent(string name, string school, string major)
        : base(name, school)
    {
        this.major = major;
        Console.WriteLine("GraduateStudent构造: " + major);
    }
}

class Program
{
    static void Main()
    {
        GraduateStudent g = new GraduateStudent("张三", "清华大学", "计算机");
    }
}
```
==四：总结==

1、**执行顺序**：先父类构造，再子类构造；多层继承从最顶层一路向下。

2、**默认规则**：子类构造函数如果没有 `: base(...)`，编译器默认调用父类**无参构造函数**

3、**必须显式调用的场景**：父类只有有参构造、有参构造时，子类必须写 `: base(参数)`，否则编译报错。

4、**关键字分工**：`base` 代表父类，用于构造函数声明后指定调用父类哪个构造；`this` 代表当前类，用于调用本类另一个构造。`base` 和 `this` 可以形成链式调用，但最终必须能正确调到父类构造函数。