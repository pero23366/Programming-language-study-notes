==一：概念==

**泛型栈和队列是什么？**

`Stack<T>` 和 `Queue<T>` 分别是**非泛型 Stack 和 Queue 的泛型版本**，位于 `System.Collections.Generic` 命名空间下。[](https://blog.csdn.net/VAherggoooooo/article/details/119315371)

**和非泛型版本的关系：**

|非泛型版本|泛型版本|
|---|---|---|
|命名空间|`System.Collections`|`System.Collections.Generic`|
|存储类型|`object`，什么都能装|**指定类型**，装错编译报错|
|取值|必须强制转换|**直接就是原类型**|
|性能|值类型有装箱拆箱|**无装箱拆箱**|

**为什么需要泛型版本？**

回顾你之前学的：

- **Stack** 后进先出，底层是 `object[]`
    
- **Queue** 先进先出，底层也是 `object[]`
    

它们存 `int` 时会**装箱**，取出来要**拆箱**，性能差，而且类型不安全。`Stack<T>` 和 `Queue<T>` 用泛型解决了这两个问题。

**打个比方：**

非泛型 Stack 像一个**大杂烩仓库**，什么都能扔进去，但取出来得自己辨认。`Stack<T>` 像一个**专门放某类物品的货架**——建一个“只放 int”的栈，就只能放 int，取出来也一定是 int，不用猜。

**核心要点：泛型栈和队列的使用方法，和非泛型版本一模一样，只是要指定类型，并且更安全、更快。**
==二：格式==

**声明与初始化：**

```csharp

using System.Collections.Generic;
// 泛型栈
Stack<int> stack = new Stack<int>();
Stack<string> stack2 = new Stack<string>();
// 泛型队列
Queue<int> queue = new Queue<int>();
Queue<string> queue2 = new Queue<string>();
```

**泛型栈的方法（和 Stack 完全一样）：**

|方法/属性|作用|是否移除|
|---|---|---|
|`Push(item)`|入栈|—|
|`Pop()`|出栈|✅ 移除|
|`Peek()`|看栈顶|❌ 不移除|
|`Count`|元素个数|—|

**泛型队列的方法（和 Queue 完全一样）：**

|方法/属性|作用|是否移除|
|---|---|---|
|`Enqueue(item)`|入队|—|
|`Dequeue()`|出队|✅ 移除|
|`Peek()`|看队头|❌ 不移除|
|`Count`|元素个数|—|

**关键：用法和非泛型版本一模一样，只是 `Stack` 要写 `Stack<int>`，`Queue` 要写 `Queue<string>`。**
==三：代码==

### 泛型栈

```csharp

using System;
using System.Collections.Generic;
class Program
{
    static void Main()
    {
        Stack<int> stack = new Stack<int>();
        stack.Push(1);
        stack.Push(2);
        stack.Push(3);
        Console.WriteLine(stack.Peek());  // 3（不移除）
        Console.WriteLine(stack.Pop());   // 3（移除）
        Console.WriteLine(stack.Count);   // 2
        int n = stack.Pop();              // 直接就是 int，不用强转！
        Console.WriteLine(n);             // 2
        // stack.Push("hello");           // ❌ 编译报错！类型安全
    }
}
```

### 泛型队列

```csharp

using System;
using System.Collections.Generic;
class Program
{
    static void Main()
    {
        Queue<string> queue = new Queue<string>();
        queue.Enqueue("第一人");
        queue.Enqueue("第二人");
        queue.Enqueue("第三人");
        Console.WriteLine(queue.Peek());     // 第一人（不移除）
        Console.WriteLine(queue.Dequeue());  // 第一人（移除）
        Console.WriteLine(queue.Count);      // 2
        string s = queue.Dequeue();          // 直接就是 string，不用强转！
        Console.WriteLine(s);                // 第二人
        // queue.Enqueue(123);               // ❌ 编译报错！类型安全
    }
}
```
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|概念|Stack 和 Queue 的泛型版本|
|命名空间|`System.Collections.Generic`|
|核心优势|类型安全、无装箱拆箱|
|用法|和非泛型版本**完全一样**|
|关键区别|要指定类型（如 `Stack<int>`）|

### 泛型 vs 非泛型

|非泛型|泛型|
|---|---|---|
|存储类型|`object`|指定类型|
|取值|必须强转|直接取|
|装箱拆箱|✅ 有|❌ 无|
|类型安全|❌ 运行时才报错|✅ 编译时就报错|
|推荐使用|**不推荐**|**✅ 推荐**|

### 什么时候用泛型栈和队列？

- **几乎任何需要栈或队列的场景，都优先用泛型版本**
    
- 只有需要存**混合类型**时，才考虑非泛型（但这种情况很少）
    

### 一句话总结

> **泛型栈和队列就是 Stack 和 Queue 的升级版——用法完全一样，但类型安全、性能更好。实际开发中，能用 `Stack<T>` 就不用 Stack，能用 `Queue<T>` 就不用 Queue。**

### 和你之前知识的联系

| 你学过的                      | 对应知识             |
| ------------------------- | ---------------- |
| Stack（非泛型）                | 后进先出，底层 object[] |
| Queue（非泛型）                | 先进先出，底层 object[] |
| 泛型                        | 类型占位符，使用时指定具体类型  |
| **`Stack<Cell>`（你扫雷里用的）** | **泛型栈**          |
| **`Queue<Cell>`（如果改过）**   | **泛型队列**         |
