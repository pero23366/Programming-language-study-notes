==一：概念==
**ArrayList** 是 C# 为开发者封装好的一个集合类，它的**本质是一个 object 类型的数组**。它最大的特点是**长度不固定，可以自动调整空间大小**，并且能够**存储任意类型的数据**。

**泛型** 相当于一个**类型占位符**。在定义类或方法时，先用一个替代符（比如 T）代表还不确定的类型，等真正使用的时候再具体指定是什么类型。

**委托** 可以理解为一个**函数的容器**。它能够存储方法的引用，被调用时会依次执行里面添加的方法。

**迭代器** 是让自定义容器类能够支持 `foreach` 循环遍历的一种机制。`foreach` 的本质就是利用迭代器做迭代。

%%泛型 → 代码复用 + 类型安全
    
- 委托 → 把方法当参数，实现回调和事件
    
- 迭代器 → 让自定义集合支持 `foreach`%%
**迭代器相当于：你写一个普通方法，用 `yield return` 标记“每次交出一个值”，编译器自动帮你包装成一个能被 `foreach` 一步步调用的东西。**

|概念|鸟的比喻|
|---|---|
|接口|“鸟能飞、能唱歌” → 规定了鸟**能做什么**|
|委托|“我需要一个会飞的**动作**，谁来都行” → 规定了**方法的格式**|
|方法实现|“扑腾翅膀飞”“张嘴唱歌” → 具体**怎么做**|
==二：格式==
**ArrayList 的使用格式：**

```csharp

ArrayList list = new ArrayList();

引入 `System.Collections` 命名空间后即可使用，无需指定存储类型。
```

**泛型的定义格式：**

```csharp

// 泛型类
class 类名<占位字母> { }
// 泛型方法
public void 方法名<占位字母>(占位字母 参数) { }
```

占位字母可以有多个，一般使用大写字母。

**泛型约束的格式：**

```csharp

where T : struct          // 约束为值类型
where T : class           // 约束为引用类型
where T : new()           // 约束必须有无参公共构造函数
where T : 类名            // 约束为某个类或其派生类
```

多个约束可以用逗号隔开，多个类型参数用多个 `where`。

**委托的声明格式：**

```csharp

delegate 返回值类型 委托名(参数列表);
```
==三：代码==
**ArrayList 的基本操作：**

```csharp

using System.Collections;
ArrayList list = new ArrayList();
list.Add(1);              // 添加元素
list.Add("hello");        // 可以添加不同类型
list.Insert(0, 3.14f);    // 在指定位置插入
list.RemoveAt(0);         // 删除指定位置元素
object item = list[0];    // 通过索引器访问
int count = list.Count;   // 获取元素个数
```

**泛型类的定义与使用：**

```csharp

// 定义泛型类
class MyClass<T>
{
    public T value;
    public void Show(T param)
    {
        Console.WriteLine(param);
    }
}
// 使用泛型类，指定具体类型
MyClass<int> obj1 = new MyClass<int>();
obj1.value = 10;
obj1.Show(100);
MyClass<string> obj2 = new MyClass<string>();
obj2.value = "唐老狮";
obj2.Show("C#进阶");

```
**泛型方法的定义与使用：**

```csharp

// 定义泛型方法
public void GenericFun<T>(T value)
{
    Console.WriteLine("类型：" + typeof(T) + "，值：" + value);
}
// 调用时指定类型
GenericFun<int>(123);
GenericFun<string>("唐老狮");

```
**泛型约束的使用：**

```csharp

// 约束 T 必须是引用类型
class MyClass<T> where T : class
{
    public T data;
}
// 约束 T 必须有无参构造函数，且继承自某个接口
class MyClass2<T> where T : new() where T : IComparable
{
    // ...
}
```

**委托的基本用法：**

```csharp

// 声明委托
delegate void MyDelegate(string msg);
// 定义符合签名的方法
void PrintMsg(string msg)
{
    Console.WriteLine(msg);
}
// 创建委托实例并绑定方法
MyDelegate del = PrintMsg;
del("Hello Delegate");
// 使用 += 添加多个方法（多播委托）
del += PrintMsg;
del("多个方法依次执行");
```

**迭代器的实现（自定义容器支持 foreach）：**

```csharp

class MyContainer
{
    private int[] data = { 1, 2, 3, 4, 5 };
    
    public IEnumerator GetEnumerator()
    {
        for (int i = 0; i < data.Length; i++)
        {
            yield return data[i];
        }
    }
}
// 使用
MyContainer container = new MyContainer();
foreach (int item in container)
{
    Console.WriteLine(item);
}
```
==四：总结==

**ArrayList：**

- 本质是 object 数组，长度可自动调整，可存任意类型
    
- 存在**装箱拆箱**问题（存储值类型时性能较低）
    
- 属于**非泛型集合**，在进阶课程中作为对比学习
    

**泛型：**

- 核心作用是**类型占位**，使用时再指定具体类型
    
- 好处是**避免装箱拆箱**、**类型安全**、**代码复用**
    
- 泛型约束用于**限制泛型类型的范围**，常见约束有：`struct`、`class`、`new()`、继承类/接口
    
- 泛型类、泛型方法、泛型接口是泛型的三种主要应用形式
    

**委托：**

- 本质是**函数的容器**，可以存储多个方法
    
- 使用 `+=` 添加方法，`-=` 移除方法
    
- 委托是**引用类型**，但值传递时的表现与 String 类似——方法内对委托参数的修改不会影响原委托
    

**迭代器：**

- `foreach` 的本质就是利用迭代器进行遍历
    
- 实现迭代器需要使用 `yield return`
    
- 让自定义容器类能够被 `foreach` 遍历