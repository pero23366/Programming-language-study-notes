==一：概念==

**Queue（队列）是什么？**

Queue 是 C# 封装好的集合类，底层和 ArrayList、Stack 一样是 **object 数组**，但封装了特殊的存取规则。

**核心特点：FIFO（First In First Out，先进先出）**

**最先存入的数据，最先被取出。**

**打个比方：**

排队买奶茶——你先来，就站在队头，先买到；后来的人站在队尾，后买到。你只能从队头取人，只能从队尾加人。

**生活中的例子：**

- 打印任务排队（先提交的先打印）
    
- 消息队列（先收到的消息先处理）
    
- 游戏中的回合制行动顺序
    
- 你扫雷代码里如果把 `Stack` 换成 `Queue`，泛洪翻开就变成“一层一层扩散”
    

**命名空间：** `System.Collections`（非泛型版本）

**和 Stack 的关系：**

|Stack|Queue|
|---|---|---|
|规则|LIFO（后进先出）|FIFO（先进先出）|
|操作端|只能操作**同一端**（栈顶）|**一端进，另一端出**|
|入|`Push`|`Enqueue`|
|出|`Pop`|`Dequeue`|
==二：格式==

**声明与初始化：**
```csharp

using System.Collections;
Queue queue = new Queue();                       // 空队列
Queue queue2 = new Queue(new int[] {1, 2, 3});   // 用集合初始化
```

**泛型版本（实际开发更常用）：**

```csharp

using System.Collections.Generic;
Queue<int> queue = new Queue<int>();
Queue<Cell> queue = new Queue<Cell>();  // 和 Stack<Cell> 对应

```
**常用方法：**

|方法/属性|作用|是否移除|
|---|---|---|
|`Enqueue(item)`|入队（放到队尾）|—|
|`Dequeue()`|出队（取出队头）|✅ 移除|
|`Peek()`|查看队头|❌ 不移除|
|`Count`|元素个数|—|
|`Clear()`|清空|—|
|`Contains(item)`|是否存在|—|

**和 Stack 的对应关系：**

|操作|Stack|Queue|
|---|---|---|
|入|`Push`|`Enqueue`|
|出|`Pop`|`Dequeue`|
|看|`Peek`|`Peek`|
|个数|`Count`|`Count`|

**关键区别：**

- `Dequeue()` → **取出并移除队头**
    
- `Peek()` → **只看不取**
==三：代码==

### 基础操作

```csharp

Queue queue = new Queue();
queue.Enqueue("第一人");
queue.Enqueue("第二人");
queue.Enqueue("第三人");
Console.WriteLine(queue.Peek());     // 第一人（不移除）
Console.WriteLine(queue.Dequeue());  // 第一人（移除）
Console.WriteLine(queue.Dequeue());  // 第二人
Console.WriteLine(queue.Count);      // 1
```

**输出：**

```text

第一人
第一人
第二人
1

```
**你要观察：**

- 入队顺序：第一人 → 第二人 → 第三人
    
- 出队顺序：第一人 → 第二人 → 第三人
    
- **先进先出！** 和 Stack 正好相反
    

### 遍历队列

```csharp

Queue queue = new Queue();
queue.Enqueue(1);
queue.Enqueue(2);
queue.Enqueue(3);
foreach (object item in queue)
{
    Console.WriteLine(item);  // 1, 2, 3（从队头到队尾）
}
```

**注意：** `foreach` 遍历不会移除元素，队列本身不变。

### 实际应用：把扫雷的 Stack 换成 Queue

你之前写的泛洪翻开用的是 `Stack<Cell>`。如果把 `Stack` 换成 `Queue`，只需要改三个地方：

```csharp

// 原来（Stack）
var stack = new Stack<Cell>();
stack.Push(start);
while (stack.Count > 0)
{
    Cell cell = stack.Pop();
    // ...
    stack.Push(n);
}
// 改成（Queue）
var queue = new Queue<Cell>();
queue.Enqueue(start);          // 入队
while (queue.Count > 0)
{
    Cell cell = queue.Dequeue();  // 出队
    // ...
    queue.Enqueue(n);             // 入队
}

**结果一样**（翻开的格子相同），但**翻开的顺序不同**：

- Stack → 深度优先（一条路走到黑）
    
- Queue → 广度优先（一层一层扩散）
    
```

**这就是数据结构选择带来的差异。**

### 实际应用：用 Queue 实现“消息队列”

```csharp

Queue<string> messages = new Queue<string>();
// 模拟收到消息
messages.Enqueue("玩家进入游戏");
messages.Enqueue("玩家拾取物品");
messages.Enqueue("玩家击败敌人");
// 按顺序处理
while (messages.Count > 0)
{
    string msg = messages.Dequeue();
    Console.WriteLine("处理消息：" + msg);
}

**输出：**

text

处理消息：玩家进入游戏
处理消息：玩家拾取物品
处理消息：玩家击败敌人

**先收到的消息先处理——这就是队列的意义。**
```
==四：总结==

### 核心特点

|特点|说明|
|---|---|
|FIFO|先进先出|
|本质|object 数组，封装了特殊规则|
|一端进一端出|队尾进，队头出|
|非泛型有装箱拆箱|泛型 Queue<T> 解决|

### 方法速查

|方法|作用|移除？|
|---|---|---|
|`Enqueue`|入队（队尾）|—|
|`Dequeue`|出队（队头）|✅|
|`Peek`|看队头|❌|
|`Count`|个数|—|

### Stack vs Queue

|Stack|Queue|
|---|---|---|
|规则|后进先出|先进先出|
|入|`Push`（栈顶）|`Enqueue`（队尾）|
|出|`Pop`（栈顶）|`Dequeue`（队头）|
|典型场景|撤销、后退、泛洪（深度优先）|排队、消息处理、泛洪（广度优先）|

### 什么时候用队列？

- 需要**先进先出**的时候
    
- 需要**按顺序处理**的时候（消息队列、任务队列）
    
- 需要**广度优先搜索**的时候
    
- 需要**公平调度**的时候
    

### 一句话总结

> **Queue 就是排队——先来的先服务，后来的后服务。**