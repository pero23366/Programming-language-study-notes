==一：概念==

```csharp
**顺序存储和链式存储是什么？**

它们是**数据的两种物理存储方式**。之前学的 `ArrayList、Stack、List<T>`，底层数据在内存里“怎么放”，就取决于这两种方式。

**顺序存储（Sequential Storage）：**

> 数据元素存放在**一块地址连续**的内存空间里。

就像**一排连号的储物柜**，1号、2号、3号紧挨着。你想找第5个柜子，直接走到第5个位置就行。

- **典型代表：数组**（以及` ArrayList、List<T>` 的底层）
    
- 数据之间的逻辑关系，靠**物理位置相邻**来体现[](https://wapbaike.baidu.com/item/%E9%A1%BA%E5%BA%8F%E5%AD%98%E5%82%A8/23162204)
    

**链式存储（Linked Storage）：**

> 数据元素存放在**地址任意**的内存空间里，每个元素通过保存**下一个元素的地址**来找到它。

就像**寻宝游戏**，每个线索纸条上写着下一个线索藏在哪里。这些纸条可以散落在任何地方，但通过线索能串起来。

- **典型代表：链表**（以及 LinkedList<T> 的底层）
    
- 数据之间的逻辑关系，靠**指针（引用）** 来维持[]
    
**打个比方：**
```


|顺序存储|链式存储|
|---|---|---|
|比喻|一排连号的储物柜|寻宝游戏，每个纸条指向下一个|
|找第 n 个|直接走过去（快）|从第一个开始一个一个找（慢）|
|中间插入/删除|后面的全部挪位置（慢）|改一下指针就行（快）|


==二：格式==

**顺序存储的格式：**

```csharp

// 数组就是最典型的顺序存储
int[] arr = new int[10];
// List<T> 底层也是顺序存储
List<int> list = new List<int>();
```

**链式存储的格式（自定义节点类）：**

```csharp

// 链表节点
class Node<T>
{
    public T Data;       // 数据
    public Node<T> Next; // 指向下一个节点的引用
}
// 链表本身
class MyLinkedList<T>
{
    private Node<T> head;  // 头节点
    private int count;     // 元素个数
}
```

**C# 官方封装好的链表：**

```csharp

using System.Collections.Generic;
LinkedList<int> list = new LinkedList<int>();
```

**关键区别：**

|顺序存储|链式存储|
|---|---|---|
|内存|连续|任意（不连续）|
|访问方式|索引直接访问|从头遍历|
|存储密度|高（只存数据）|低（还要存引用）|
==三：代码==

### 顺序存储：数组

```csharp

int[] arr = new int[5];
arr[0] = 10;
arr[1] = 20;
arr[2] = 30;
// 访问第2个元素：直接通过索引
Console.WriteLine(arr[1]);  // 20，O(1)，一步到位
// 在中间插入：后面的全部后移
// 比如在索引1处插入 15
// 原来：[10, 20, 30, _, _]
// 插入后：[10, 15, 20, 30, _]
// 20 和 30 都要往后挪一格
```

**观察：**

- 访问快（直接定位）
    
- 插入/删除慢（要挪动后面所有元素）[](https://wapbaike.baidu.com/item/%E9%A1%BA%E5%BA%8F%E5%AD%98%E5%82%A8/23162204)
    

### 链式存储：自定义单链表
```csharp

class Node<T>
{
    public T Data;
    public Node<T> Next;
    public Node(T data)
    {
        Data = data;
        Next = null;
    }
}
class MyLinkedList<T>
{
    private Node<T> head;  // 头节点
    // 在头部插入
    public void AddFirst(T data)
    {
        Node<T> newNode = new Node<T>(data);
        newNode.Next = head;  // 新节点指向原来的头
        head = newNode;       // 新节点变成新的头
    }
    // 遍历
    public void PrintAll()
    {
        Node<T> current = head;
        while (current != null)
        {
            Console.WriteLine(current.Data);
            current = current.Next;  // 沿着引用走到下一个
        }
    }
}
// 使用
MyLinkedList<int> list = new MyLinkedList<int>();
list.AddFirst(10);
list.AddFirst(20);
list.AddFirst(30);
list.PrintAll();  // 30, 20, 10
```

**观察：**

- 插入时只改了两个引用，**没有移动任何数据**[](https://developer.aliyun.com/article/1105121#1)
    
- 但访问第 n 个元素，必须**从头一个一个走**
    

### 用图理解区别

```text

顺序存储：[10][20][30][40][50]
           ↑  ↑  ↑  ↑  ↑
          连续的内存地址
链式存储：  [10|→]  [20|→]  [30|→]  [40|→]  [50|→]
             ↑         ↑         ↑
           散落在内存各处，靠 → 串起来
```

### `C# 官方 LinkedList<T>`

```csharp

LinkedList<string> list = new LinkedList<string>();
list.AddLast("A");
list.AddLast("B");
list.AddFirst("C");   // 插到最前面
foreach (string item in list)
{
    Console.WriteLine(item);  // C, A, B
}
```

**注意：** C# 的 `LinkedList<T>` 是**双向链表**，每个节点同时知道前一个和后一个[](https://developer.aliyun.com/article/1105121#1)。
==四：总结==