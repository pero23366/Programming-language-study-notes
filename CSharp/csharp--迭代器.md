==一：概念==

**迭代器是什么？**

*迭代器是一种**让自定义类能够被 `foreach` 循环遍历**的机制。它的核心是**按需生成序列值**，不需要一次性把所有数据都加载到内存里。*

**为什么需要它？**

你之前用 `foreach` 遍历过 `List<T>`、`Dictionary`，但你自己写的 `Board` 类，默认是不能被 `foreach` 遍历的。迭代器就是让**你写的类也能用 `foreach`**。

**迭代器的本质：**

迭代器依赖于两个接口：`IEnumerable` 和 `IEnumerator`。

- **`IEnumerable`**：表示“可以被遍历”，它只有一个方法 `GetEnumerator()`，返回一个迭代器。
    
- **`IEnumerator`**：表示“迭代器本身”，它有 `MoveNext()` 和 `Current`，负责**一个一个取出元素**。
    

**打个比方：**

- **`IEnumerable`** = 一本**可以翻阅的书**（“我能被遍历”）
    
- **`IEnumerator`** = 一个**书签**（“我现在读到哪一页了”）
    

你拿着书签，一页一页往下读，就是迭代的过程。

**`yield return` 的魔法：**

你不用手写 `MoveNext()` 和 `Current`，只需要用 `yield return`，编译器会**自动帮你生成**一个状态机，实现“暂停/继续”的效果。

==二：格式==

**方式一：实现 `IEnumerable` 接口（标准做法）**

```csharp

using System.Collections;
public class MyClass : IEnumerable
{
    public IEnumerator GetEnumerator()
    {
        // 用 yield return 逐个返回值
        yield return 值1;
        yield return 值2;
        // ...
    }
}
```

**方式二：只写 `GetEnumerator` 方法（更简单）**

```csharp

public class MyClass
{
    public IEnumerator GetEnumerator()
    {
        yield return 值1;
        yield return 值2;
    }
}
```

**其实可以不继承 `IEnumerable`，单独实现 `GetEnumerator` 方法即可**，只要方法名和返回值正确，`foreach` 就能识别。

**泛型版本（推荐）：**

```csharp

using System.Collections.Generic;
public class MyClass : IEnumerable<int>
{
    public IEnumerator<int> GetEnumerator()
    {
        yield return 1;
        yield return 2;
    }
    IEnumerator IEnumerable.GetEnumerator()
    {
        return GetEnumerator();
    }
}
```
==三：代码==

### 基础示例：让自定义类支持 `foreach`

```csharp

using System;
using System.Collections;
class Bag
{
    private string[] items = { "剑", "盾", "药水" };
    public IEnumerator GetEnumerator()
    {
        for (int i = 0; i < items.Length; i++)
        {
            yield return items[i];
        }
    }
}
class Program
{
    static void Main()
    {
        Bag bag = new Bag();
        foreach (string item in bag)
        {
            Console.WriteLine(item);
        }
    }
}
```

你写的：

```csharp

foreach (string item in bag)
{
    Console.WriteLine(item);
}
```

编译器翻译成：

```csharp

IEnumerator e = bag.GetEnumerator();   // ① 拿到迭代器
while (e.MoveNext())                    // ② 还有下一个吗？
{
    string item = (string)e.Current;    // ③ 取出当前元素
    Console.WriteLine(item);            // ④ 执行循环体
}
```

**你写的 `foreach`，本质就是这三行在循环。**

**核心：**

- `GetEnumerator()` 只调用一次
    
- `MoveNext()` 每次循环调用一次
    
- `yield return` 让方法能“暂停/继续”
    
- 每次 `MoveNext()` 就跑到下一个 `yield return`

### `yield return` 的执行过程

```csharp

public IEnumerator GetEnumerator()
{
    Console.WriteLine("开始");
    yield return 1;
    Console.WriteLine("继续");
    yield return 2;
    Console.WriteLine("结束");
}
```

**用 `foreach` 遍历时：**

- 第一次 `MoveNext` → 输出“开始”，返回 1
    
- 第二次 `MoveNext` → 输出“继续”，返回 2
    
- 第三次 `MoveNext` → 输出“结束”，返回 false，循环结束
    

==**`yield return` 会“暂停”方法，把值交出去；下次 `MoveNext` 再从暂停处继续。**==

==四：总结==
### 核心要点

|要点|说明|
|---|---|
|**概念**|让自定义类支持 `foreach` 遍历|
|**两个接口**|`IEnumerable`（可遍历）、`IEnumerator`（迭代器）|
|**核心语法**|`yield return`|
|**本质**|编译器自动生成状态机，实现“暂停/继续”|
|**好处**|按需生成，延迟执行，代码简洁|

### 两种实现方式对比

|继承 `IEnumerable`|只写 `GetEnumerator`|
|---|---|---|
|代码量|多（要实现接口）|少|
|规范性|标准做法|也可行|
|推荐度|✅ 推荐|简单场景可用|

### `yield return` 的执行规则

|语句|作用|
|---|---|
|`yield return 值`|返回一个值，暂停方法|
|`yield break`|结束迭代，不再返回|

### 什么时候用迭代器？

- 需要**让自定义类支持 `foreach`** 时
    
- 需要**按需生成数据**，不想一次性加载所有数据时
    
- 写 **Unity 协程**时
    
- 需要**延迟执行**时
    

### 一句话总结

> **迭代器就是让自定义类支持 `foreach` 的机制——用 `yield return` 逐个返回值，编译器自动生成状态机，实现“暂停/继续”。你的 `AllCells()` 就是迭代器，Unity 协程也是迭代器。**