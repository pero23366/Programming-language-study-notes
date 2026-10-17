  1.对于数字**默认是升序，想降序就传 Lambda 把 a 和 b 反过来比。**
2. **string类型**：默认按“字典顺序”升序
3. ### 3. 自定义类：默认不能排序！
==一：概念==

**List排序是什么？**

`List<T>` 提供了一个 `Sort()` 方法，可以**对列表中的元素进行排序**。

**为什么需要排序？**

在游戏开发中，排序无处不在：怪物按攻击力排序、物品按价格排序、排行榜按分数排序……你不可能每次都手写冒泡排序。`List<T>.Sort()` 就是C#官方提供的高效排序工具。

**Sort() 的三种用法：**

|方式|适用场景|需要做什么|
|---|---|---|
|**默认排序**|元素本身能比较大小（int、string等）|直接 `list.Sort()`|
|**传入比较委托**|自定义类的某个字段排序|用Lambda或匿名函数写比较规则|
|**传入IComparer对象**|比较规则复杂、需要复用|写一个实现 `IComparer<T>` 的类|

**核心理解：`Sort()` 内部用的是什么排序算法？**

你不需要关心。C#内部使用的是**内省排序**（Introspective Sort），是快速排序、堆排序和插入排序的混合体，效率很高。你只需要告诉它**怎么比较两个元素**就行。

**打个比方：**

`Sort()` 就像一个**裁判**，它负责组织比赛（排序），但**规则由你定**。你告诉它“谁大谁小”，它就能把整个队列排好。
==二：格式==

**默认排序（适用于int、string等本身可比较的类型）：**

```csharp

List<int> numbers = new List<int> { 3, 1, 4, 1, 5 };
numbers.Sort();  // 升序

**传入Lambda表达式（最常用）：**

csharp

list.Sort((a, b) =>
{
    // 返回负数：a 排在 b 前面
    // 返回正数：a 排在 b 后面
    // 返回 0：a 和 b 相等
    return a.某字段.CompareTo(b.某字段);
});
```

**传入匿名函数（第28课的写法）：**

```csharp

list.Sort(delegate (Monster a, Monster b)
{
    return a.attack.CompareTo(b.attack);
});
```

**传入IComparer对象（需要复用比较规则时）：**

```csharp

// 定义一个比较器类
class AttackComparer : IComparer<Monster>
{
    public int Compare(Monster x, Monster y)
    {
        return x.attack.CompareTo(y.attack);
    }
}
```
// 使用
```csharp
list.Sort(new AttackComparer());

```
**比较函数的返回值规则（关键）：**

|返回值|含义|
|---|---|
|**负数**|第一个参数排在前面|
|**正数**|第一个参数排在后面|
|**0**|两个参数相等，顺序不变|

**速记：升序用 `a.字段.CompareTo(b.字段)`，降序反过来写 `b.字段.CompareTo(a.字段)`。**
==三：代码==

### 基础排序：int列表

```csharp

using System;
using System.Collections.Generic;
class Program
{
    static void Main()
    {
        List<int> numbers = new List<int> { 3, 1, 4, 1, 5, 9, 2, 6 };
        // 默认升序
        numbers.Sort();
        Console.WriteLine(string.Join(", ", numbers));  // 1, 1, 2, 3, 4, 5, 6, 9
        // 用Lambda降序
        numbers.Sort((a, b) => b.CompareTo(a));
        Console.WriteLine(string.Join(", ", numbers));  // 9, 6, 5, 4, 3, 2, 1, 1
    }
}

```
### 自定义类排序：怪物类

这是唐老狮第32课的**核心课后习题**：创建一个怪物类，包含攻击、防御、血量，根据用户输入按不同字段排序。[](https://blog.csdn.net/u012177821/article/details/130963643#comments_26835574#1)

```csharp

using System;
using System.Collections.Generic;
class Monster
{
    public int Attack;   // 攻击力
    public int Defense;  // 防御力
    public int Hp;       // 血量
    public Monster(int attack, int defense, int hp)
    {
        Attack = attack;
        Defense = defense;
        Hp = hp;
    }
    public void ShowInfo()
    {
        Console.WriteLine($"攻击:{Attack} 防御:{Defense} 血量:{Hp}");
    }
}
class Program
{
    static void Main()
    {
        List<Monster> monsters = new List<Monster>();
        Random r = new Random();
        // 创建10个怪物
        for (int i = 0; i < 10; i++)
        {
            monsters.Add(new Monster(r.Next(1, 100), r.Next(1, 100), r.Next(1, 100)));
        }
        Console.WriteLine("请选择排序方式：1-攻击 2-防御 3-血量 4-反转");
        int choice = int.Parse(Console.ReadLine());
        switch (choice)
        {
            case 1:  // 按攻击升序
                monsters.Sort((a, b) => a.Attack.CompareTo(b.Attack));
                break;
            case 2:  // 按防御升序
                monsters.Sort((a, b) => a.Defense.CompareTo(b.Defense));
                break;
            case 3:  // 按血量升序
                monsters.Sort((a, b) => a.Hp.CompareTo(b.Hp));
                break;
            case 4:  // 反转
                monsters.Reverse();
                break;
        }
        // 打印结果
        foreach (var m in monsters)
        {
            m.ShowInfo();
        }
    }
}
```

**这就是唐老狮课后习题的标准解法。** 核心就是 `monsters.Sort((a, b) => a.某字段.CompareTo(b.某字段))`。[](https://blog.csdn.net/qiushubo/article/details/120991090)

### 用匿名函数写比较规则（第28课写法）

```csharp

// 用匿名函数代替Lambda
monsters.Sort(delegate (Monster a, Monster b)
{
    return a.Attack.CompareTo(b.Attack);
});
```

**效果完全一样，只是写法不同。** Lambda更简洁，推荐用Lambda。

### 多重条件排序

如果攻击力相同，再按防御排序：

```csharp

monsters.Sort((a, b) =>
{
    int result = a.Attack.CompareTo(b.Attack);
    if (result == 0)  // 攻击相同
        result = a.Defense.CompareTo(b.Defense);  // 再比防御
    return result;
});
```

### 用IComparer接口（可复用）

```csharp

class AttackComparer : IComparer<Monster>
{
    public int Compare(Monster x, Monster y)
    {
        return x.Attack.CompareTo(y.Attack);
    }
}
// 使用
monsters.Sort(new AttackComparer());
```

**适合比较规则需要在多个地方复用的情况。**

### 你扫雷代码里的潜在应用

你扫雷的 `Board` 类如果存了格子列表，也可以用 `Sort()` 按某个属性排序：

```csharp

List<Cell> cells = new List<Cell>();
// ... 添加格子 ...
cells.Sort((a, b) => a.Row.CompareTo(b.Row));  // 按行号排序
```
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|**方法**|`List<T>.Sort()`|
|**默认排序**|`list.Sort()`，适用于int、string等|
|**Lambda排序**|`list.Sort((a, b) => a.字段.CompareTo(b.字段))`|
|**比较返回值**|负数：a在前；正数：a在后；0：相等|
|**升序写法**|`a.字段.CompareTo(b.字段)`|
|**降序写法**|`b.字段.CompareTo(a.字段)`|

### 三种排序方式对比

|方式|写法|适用场景|
|---|---|---|
|默认排序|`list.Sort()`|int、string等自带比较的类型|
|Lambda|`list.Sort((a,b) => ...)`|自定义类，简单比较规则|
|IComparer|`list.Sort(new MyComparer())`|比较规则需要复用|

### Sort() 的底层

C#的 `List<T>.Sort()` 内部使用的是**内省排序**（快速排序+堆排序+插入排序的混合），时间复杂度平均 **O(n log n)**，效率很高，不需要你自己实现排序算法。

### 什么时候用 List排序？

- 需要**对列表按某个字段排序**时
    
- 需要**多种排序规则切换**时（用Lambda动态传入）
    
- **几乎任何需要排序的场景**，都优先用 `List<T>.Sort()`，不要手写冒泡排序
    

### 一句话总结

> **`List<T>.Sort()` 就是C#官方的高效排序工具——你只需要告诉它“谁大谁小”（用Lambda写比较规则），它就能帮你排好整个列表。**