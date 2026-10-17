==一：概念==

```csharp
**List<T> 是什么？**

`List<T>` 是 C# 中最常用的泛型集合类，它是 **ArrayList 的泛型版本**。你可以把它理解为一个 **“动态数组”**——长度不固定，可以自动扩容，但**只能存储你指定的那一种类型**。

**和 ArrayList 的关系：**

|ArrayList|List<T>|
|---|---|---|
|命名空间|`System.Collections`|`System.Collections.Generic`|
|存储类型|`object`，什么都能装|**指定类型**，装错编译报错|
|取值|必须强制转换|**直接就是原类型**|
|性能|值类型有装箱拆箱|**无装箱拆箱**|
|出现时间|C# 1.0|C# 2.0（泛型出现后）|

**为什么 List<T> 取代了 ArrayList？**

ArrayList 存的是 `object`，意味着：

- 存 `int` 进去 → **装箱**（把值类型包装成对象）
    
- 取出来 → **拆箱**（把对象还原成值类型）
    
- 装箱拆箱**消耗性能**，而且类型不安全，存错类型运行时才报错
    

`List<T>` 用泛型解决了这两个问题：**类型安全 + 无装箱拆箱**。

**打个比方：**

ArrayList 像一个**大杂烩仓库**，什么都能往里扔，但取出来的时候你得自己辨认是什么。`List<T>` 像一个**专门放某类物品的货架**——你建一个“只放苹果”的货架，就只能放苹果，取出来也一定是苹果，不用猜。

```
==二：格式==

**声明与初始化：**

```csharp

using System.Collections.Generic;
// 创建空列表
List<int> list = new List<int>();
List<string> names = new List<string>();
List<Cell> cells = new List<Cell>();  // 你扫雷里可能用到的
// 用已有集合初始化
List<int> list2 = new List<int> { 1, 2, 3, 4, 5 };
```

**常用方法：**

| 方法/属性                 | 作用       | 说明            |
| --------------------- | -------- | ------------- |
| `Add(item)`           | 添加单个元素   | 加到末尾          |
| `AddRange(集合)`        | 添加多个元素   | 批量添加          |
| `Insert(index, item)` | 在指定位置插入  | 插到中间          |
| `Remove(item)`        | 删除指定元素   | 删除**第一个**匹配的  |
| `RemoveAt(index)`     | 删除指定位置元素 | 按索引删          |
| `Clear()`             | 清空       | 删除所有          |
| `Contains(item)`      | 判断是否存在   | 返回 bool       |
| `IndexOf(item)`       | 查找位置     | 返回索引，找不到返回 -1 |
| `list[index]`         | 索引器访问    | 直接取值          |
| `Count`               | 元素个数     | 属性            |
| `Capacity`            | 当前容量     | 属性，底层数组大小     |

**和 ArrayList 的用法对比：**

```csharp

// ArrayList
ArrayList list1 = new ArrayList();
list1.Add(10);
int a = (int)list1[0];          // 要强转
// List<T>
List<int> list2 = new List<int>();
list2.Add(10);
int b = list2[0];               // 不用强转
// list2.Add("hello");          // ❌ 编译报错

```
**格式几乎一样，区别就一个：`List<T>` 要指定类型，并且类型安全。**
==三：代码==

### 基础操作

```csharp

using System;
using System.Collections.Generic;
class Program
{
    static void Main()
    {
        // 创建一个装 string 的列表
        List<string> names = new List<string>();
        // 添加
        names.Add("唐老狮");
        names.Add("小王");
        names.Add("小李");
        // 插入
        names.Insert(1, "插队的人");  // 在索引1处插入
        // 访问
        Console.WriteLine(names[0]);   // 唐老狮
        // 查找
        Console.WriteLine(names.Contains("小王"));   // True
        Console.WriteLine(names.IndexOf("小李"));    // 3
        // 删除
        names.Remove("小王");          // 删除指定元素
        names.RemoveAt(0);             // 删除索引0的元素
        // 个数
        Console.WriteLine(names.Count); // 2
    }
}
```

### 遍历

```csharp

List<int> numbers = new List<int> { 10, 20, 30, 40, 50 };
// 方式一：for 循环（需要索引时用）
for (int i = 0; i < numbers.Count; i++)
{
    Console.WriteLine(numbers[i]);
}
// 方式二：foreach（不需要索引时用）
foreach (int n in numbers)
{
    Console.WriteLine(n);
}
```

```
List<T> 的底层原理：动态扩容

`List<T>` 内部**还是一个数组**，但它在数组满的时候会自动**创建一个更大的数组，把旧数据复制过去**。
```
```csharp

// 你写：
List<int> list = new List<int>();
list.Add(1);
list.Add(2);
// ... 一直加 ...
// 内部发生了什么：
// 1. 初始容量可能是 4（或指定值）
// 2. 当元素个数超过容量时，容量翻倍
// 3. 创建新数组，把旧数据复制过去
// 4. 旧数组被垃圾回收

**关键：`Count` 和 `Capacity` 不是一回事。**

- `Count` = 当前存了几个元素
    
- `Capacity` = 底层数组能装几个
    
```

```csharp

List<int> list = new List<int>();   // 初始 Capacity = 4（默认）
list.Add(1);                         // Count = 1, Capacity = 4
list.Add(2);                         // Count = 2, Capacity = 4
list.Add(3);                         // Count = 3, Capacity = 4
list.Add(4);                         // Count = 4, Capacity = 4
list.Add(5);                         // Count = 5, Capacity = 8 ← 扩容了！

```
**扩容有代价**（要复制数据），所以如果你知道大概要存多少元素，可以**提前指定容量**：

```csharp

List<int> list = new List<int>(1000);  // 直接给 1000 容量，避免反复扩容

### 实际应用：库存管理（类似你写过的 Inventory）

csharp

class Inventory
{
    private List<string> items = new List<string>();
    public void AddItem(string item)
    {
        items.Add(item);
        Console.WriteLine("添加物品：" + item);
    }
    public void RemoveItem(string item)
    {
        if (items.Remove(item))
        {
            Console.WriteLine("移除物品：" + item);
        }
        else
        {
            Console.WriteLine("没有找到：" + item);
        }
    }
    public void ShowAll()
    {
        Console.WriteLine("=== 背包内容 ===");
        foreach (string item in items)
        {
            Console.WriteLine(item);
        }
    }
}
class Program
{
    static void Main()
    {
        Inventory bag = new Inventory();
        bag.AddItem("剑");
        bag.AddItem("盾");
        bag.AddItem("药水");
        bag.ShowAll();
        bag.RemoveItem("盾");
        bag.ShowAll();
    }
}
```

**输出：**

```text

添加物品：剑
添加物品：盾
添加物品：药水
=== 背包内容 ===
剑
盾
药水
移除物品：盾
=== 背包内容 ===
剑
药水
```
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|概念|ArrayList 的泛型版本，动态数组|
|命名空间|`System.Collections.Generic`|
|核心优势|类型安全、无装箱拆箱、用法和 ArrayList 一样|
|底层|内部是数组，满了自动扩容（翻倍）|
|关键属性|`Count`（个数）、`Capacity`（容量）|
```csharp
List<T> vs ArrayList

```

|ArrayList|List<T>|
|---|---|---|
|类型安全|❌ 什么都能装，运行时可能出错|✅ 编译时检查|
|装箱拆箱|✅ 有，性能差|❌ 无，性能好|
|取值|必须强转|直接取|
|推荐使用|**不推荐**|**✅ 推荐**|

```csharp
### 什么时候用 List<T>？

- 需要**一个能动态增长的列表**时
    
- 需要**按索引访问**元素时
    
- 需要**存储同一种类型**的多个对象时（怪物列表、物品列表、分数列表……）
    
- **几乎任何需要“列表”的场景，都优先用 `List<T>`**
    
一句话总结
 **List<T> 就是 ArrayList 的“升级版”——用法几乎一样，但类型安全、性能更好。实际开发中，能用 `List<T>` 就不用 ArrayList。**
```

 和你之前知识的联系

|你写过的|对应知识|
|---|---|
|`List<string> order`|泛型 List，存名字顺序|
|`quantities.Values`|Dictionary 的 Values 返回一个可遍历集合|
|`Stack<Cell>`|泛型栈，和 List 一样是泛型集合|
|`for (int i = 0; i < inv.Count; i++)`|List 的 `Count` 属性|
