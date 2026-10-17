==一：概念==

## 一：概念

**LinkedList`<T>` 是什么？**

`LinkedList<T>` 是 C# 中内置的**双向链表**实现，属于泛型集合[](https://www.cnblogs.com/nyan/p/17668835.html#1)。它和你之前学的 `List<T>` 最大的不同在于底层存储方式：`List<T>` 是**顺序存储**，而 `LinkedList<T>` 是**链式存储**。

**双向链表的结构：**

每个节点（`LinkedListNode<T>`）都包含三部分：

- **Value**：数据本身
    
- **Next**：指向下一个节点的引用
    
- **Previous**：指向上一个节点的引用
    

正因为有了 `Previous` 和 `Next`，链表才能从头到尾、从尾到头**双向遍历**[](https://blog.csdn.net/VAherggoooooo/article/details/119219731)。

**和 List`<T>` 的核心区别：**

|List<T>|LinkedList<T>|
|---|---|---|
|底层|数组（连续内存）|双向链表（散落内存）|
|访问第 n 个|**O(1)**，直接索引|**O(n)**，从头遍历|
|中间插入/删除|**O(n)**，挪元素|**O(1)**，改引用|
|遍历方式|索引/foreach|foreach / 节点遍历|

**打个比方：**

`List<T>` 像**一排连号的储物柜**——找第5个直接走到5号，但在中间塞东西要挪一排。`LinkedList<T>` 像**寻宝游戏**——每个纸条指向下一个，塞东西只需改两个纸条的指向，但找第5个得从第一个开始摸。

**你之前写过的双向链表**

你之前提到过：“自己写一个双向链表真的很难”。`LinkedList<T>` 就是 C# 官方为你封装好的双向链表，用法和 `List<T>` 类似，但底层换成了链式结构。
==二：格式==

**声明与初始化：**

```csharp

using System.Collections.Generic;
LinkedList<int> list = new LinkedList<int>();
LinkedList<string> names = new LinkedList<string>();
```

**核心类：**

`LinkedList<T>` 需要掌握**两个类**[](https://www.cnblogs.com/nyan/p/17668835.html#1)：

- `LinkedList<T>` → 链表本身
    
- `LinkedListNode<T>` → 链表节点
    

**常用方法：**

|方法/属性|作用|说明|
|---|---|---|
|`AddLast(item)`|尾部添加|加到链表末尾|
|`AddFirst(item)`|头部添加|加到链表开头|
|`AddAfter(node, item)`|在节点后添加|需要先得到节点|
|`AddBefore(node, item)`|在节点前添加|需要先得到节点|
|`RemoveFirst()`|移除头节点||
|`RemoveLast()`|移除尾节点||
|`Remove(item)`|移除指定值|删除第一个匹配的|
|`Clear()`|清空||
|`First`|头节点|返回 `LinkedListNode<T>`|
|`Last`|尾节点|返回 `LinkedListNode<T>`|
|`Find(item)`|查找节点|返回 `LinkedListNode<T>`，找不到返回 `null`|
|`Contains(item)`|判断是否存在|返回 bool|
|`Count`|节点个数|属性|

**关键理解：** `LinkedList<T>` **无法通过下标直接访问**。想找第3个元素，只能从 `First` 开始，沿着 `Next` 一个一个走[](https://www.cnblogs.com/nyan/p/17668835.html#1)。
==三：代码==

### 增删查改

```csharp

using System;
using System.Collections.Generic;
class Program
{
    static void Main()
    {
        LinkedList<int> list = new LinkedList<int>();
        // ===== 增 =====
        list.AddLast(10);   // 尾部添加：10
        list.AddLast(20);   // 尾部添加：10, 20
        list.AddFirst(5);   // 头部添加：5, 10, 20
        // 在某节点后添加：先找到节点
        LinkedListNode<int> node10 = list.Find(10);
        list.AddAfter(node10, 15);  // 5, 10, 15, 20
        // 在某节点前添加
        list.AddBefore(node10, 8);  // 5, 8, 10, 15, 20
        // ===== 查 =====
        Console.WriteLine(list.First.Value);  // 5（头节点）
        Console.WriteLine(list.Last.Value);   // 20（尾节点）
        LinkedListNode<int> found = list.Find(15);
        if (found != null)
            Console.WriteLine("找到：" + found.Value);  // 15
        Console.WriteLine(list.Contains(8));  // True
        // ===== 改 =====
        // 要先得到节点，再修改 Value
        list.First.Value = 100;  // 把头节点的值改成 100
        Console.WriteLine(list.First.Value);  // 100
        // ===== 删 =====
        list.RemoveFirst();   // 移除头节点
        list.RemoveLast();    // 移除尾节点
        list.Remove(15);      // 移除值为15的节点
        list.Clear();         // 清空
    }
}
```

### 遍历：三种方式

```csharp

LinkedList<int> list = new LinkedList<int>();
list.AddLast(1);
list.AddLast(2);
list.AddLast(3);
list.AddLast(4);
// 方式一：foreach（最常用）
foreach (int item in list)
{
    Console.WriteLine(item);  // 1, 2, 3, 4
}
// 方式二：从头到尾，用节点遍历
LinkedListNode<int> node = list.First;
while (node != null)
{
    Console.WriteLine(node.Value);
    node = node.Next;  // 沿着 Next 走到下一个
}
// 方式三：从尾到头，用 Previous 反向遍历
node = list.Last;
while (node != null)
{
    Console.WriteLine(node.Value);
    node = node.Previous;  // 沿着 Previous 往回走
}

```
**方式三就是双向链表“双向”的体现**——这是 `List<T>` 做不到的[](https://blog.csdn.net/VAherggoooooo/article/details/119219731)。

### 实际应用：任务队列（频繁插队）

```csharp

class TaskManager
{
    private LinkedList<string> tasks = new LinkedList<string>();
    // 普通任务加到末尾
    public void AddTask(string task)
    {
        tasks.AddLast(task);
        Console.WriteLine("添加任务：" + task);
    }
    // 紧急任务插到最前面
    public void AddUrgentTask(string task)
    {
        tasks.AddFirst(task);
        Console.WriteLine("【紧急】添加任务：" + task);
    }
    // 处理第一个任务
    public void ProcessTask()
    {
        if (tasks.Count > 0)
        {
            string task = tasks.First.Value;
            tasks.RemoveFirst();
            Console.WriteLine("处理任务：" + task);
        }
        else
        {
            Console.WriteLine("没有任务了");
        }
    }
    // 查看所有任务
    public void ShowTasks()
    {
        Console.WriteLine("=== 任务列表 ===");
        foreach (string task in tasks)
        {
            Console.WriteLine(task);
        }
    }
}
class Program
{
    static void Main()
    {
        TaskManager manager = new TaskManager();
        manager.AddTask("写代码");
        manager.AddTask("测试");
        manager.AddUrgentTask("修复Bug");
        manager.ShowTasks();
        manager.ProcessTask();  // 先处理紧急任务
        manager.ProcessTask();
    }
}
```

**输出：**

```text

添加任务：写代码
添加任务：测试
【紧急】添加任务：修复Bug
=== 任务列表 ===
修复Bug
写代码
测试
处理任务：修复Bug
处理任务：写代码
```

**为什么用 LinkedList 而不是 List？** 因为**频繁在头部插入**（`AddFirst`）时，`LinkedList` 是 O(1)，而 `List` 需要把所有元素后移，是 O(n)。
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|概念|C# 内置的双向链表|
|命名空间|`System.Collections.Generic`|
|本质|可变类型的泛型双向链表[](https://www.cnblogs.com/nyan/p/17668835.html#1)|
|核心类|`LinkedList<T>` + `LinkedListNode<T>`|
|特点|增删快，查找慢，不能下标访问|

### 方法速查

|操作|方法|
|---|---|
|尾部添加|`AddLast(item)`|
|头部添加|`AddFirst(item)`|
|节点后添加|`AddAfter(node, item)`|
|节点前添加|`AddBefore(node, item)`|
|移除头/尾|`RemoveFirst()` / `RemoveLast()`|
|查找节点|`Find(item)`|
|判断存在|`Contains(item)`|
|修改值|`node.Value = newValue`|

### LinkedList vs List

|List`<T>`|LinkedList`<T>`|
|---|---|---|
|底层|数组|双向链表|
|随机访问|**快**（O(1)）|**慢**（O(n)）|
|头部插入/删除|**慢**（O(n)）|**快**（O(1)）|
|内存|连续，缓存友好|分散，缓存不友好|
|双向遍历|❌ 只能正向|✅ 可正向可反向|

### 什么时候用 LinkedList？

- 需要**频繁在头部或中间插入/删除**时
    
- 需要**双向遍历**时
    
- 数据量**不确定**，需要按需分配时
    
- **不需要**频繁按索引随机访问时
    

### 一句话总结

> **LinkedList`<T>` 就是 C# 封装好的双向链表——增删快、查找慢、不能下标访问。适合频繁插队、双向遍历的场景，不适合频繁按索引查找的场景。**

### 和你之前知识的联系

|你学过的|底层存储|
|---|---|
|`List<T>`|顺序存储（数组）|
|`Stack<T>` / `Queue<T>`|顺序存储|
|**`LinkedList<T>`**|**链式存储（双向链表）**|