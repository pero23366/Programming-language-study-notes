==一：概念==

**Stack（栈）是什么？**

Stack 是 C# 封装好的一个集合类，底层是 **object 数组**，封装了特殊的存取规则。

**核心特点：LIFO（Last In First Out，后进先出）**

最后存入的数据，最先被取出。

**打个比方：**

一摞盘子——你只能往最上面放，也只能从最上面取。最后放上去的盘子，最先被拿走。

**生活中的例子：**

- 浏览器后退（最近访问的最先返回）
    
- 编辑器撤销（最近操作的最先撤销）
    
- 扫雷泛洪翻开（你写过的那段）
    
- 方法调用栈（最后调用的方法最先返回）
    

**命名空间：** `System.Collections`（非泛型版本）
==二：格式==

**声明与初始化：**

```csharp

using System.Collections;
Stack stack = new Stack();                    // 空栈
Stack stack2 = new Stack(new int[] {1,2,3});  // 用集合初始化
```

**泛型版本（实际开发更常用）：**

```csharp

using System.Collections.Generic;
Stack<int> stack = new Stack<int>();
Stack<Cell> stack = new Stack<Cell>();  // 你扫雷里用的
```

**常用方法：**

|方法/属性|作用|是否移除|
|---|---|---|
|`Push(item)`|入栈（放到栈顶）|—|
|`Pop()`|出栈（取出栈顶）|✅ 移除|
|`Peek()`|看栈顶|❌ 不移除|
|`Count`|元素个数|—|
|`Clear()`|清空|—|
|`Contains(item)`|是否存在|—|

**关键区别：**

- `Pop()` → **取出并移除**
    
- `Peek()` → **只看不取**
==三：代码==

### 基础操作

```csharp

Stack stack = new Stack();
stack.Push("第一层");
stack.Push("第二层");
stack.Push("第三层");
Console.WriteLine(stack.Peek());   // 第三层（不移除）
Console.WriteLine(stack.Pop());    // 第三层（移除）
Console.WriteLine(stack.Pop());    // 第二层
Console.WriteLine(stack.Count);    // 1

```
**输出：**

```text

第三层
第三层
第二层
1
```

## 遍历

```csharp

Stack stack = new Stack();
stack.Push(1);
stack.Push(2);
stack.Push(3);
foreach (object item in stack)
{
    Console.WriteLine(item);  // 3, 2, 1（从栈顶到栈底）
}
```

**注意：** `foreach` 遍历不会移除元素，栈本身不变。

### 实际应用：泛洪翻开（你的扫雷代码）

```csharp

int opened = 0;
var stack = new Stack<Cell>();
stack.Push(start);                    // ① 起点入栈
while (stack.Count > 0)               // ④ 栈不空就继续
{
    Cell cell = stack.Pop();          // ② 拿出最后放进的
    if (cell.IsOpened || cell.IsFlagged || cell.IsMine)
        continue;                     // 拿出后先判断，跳过无效的
    cell.IsOpened = true;             // 翻开
    opened++;
    if (cell.IsBlank)                 // ③ 只有空白格才扩散
    {
        foreach (var n in Neighbors(cell))
            if (!n.IsOpened && !n.IsFlagged && !n.IsMine)
                stack.Push(n);        // 有效邻居入栈
    }
}
return opened;
```

**四步总结：**

1. 放起点入栈
    
2. 拿出一个 → 判断 → 翻开
    
3. 是空白 → 有效邻居入栈；是数字 → 不扩散
    
4. 重复 2、3，直到栈空
    

### 实际应用：括号匹配

```csharp

static bool IsBalanced(string str)
{
    Stack stack = new Stack();
    foreach (char c in str)
    {
        if (c == '(') stack.Push(c);        // 左括号入栈
        else if (c == ')')
        {
            if (stack.Count == 0) return false;
            stack.Pop();                     // 右括号出栈
        }
    }
    return stack.Count == 0;                 // 栈空 = 匹配
}
```
==四：总结==

### 核心特点

|特点|说明|
|---|---|
|LIFO|后进先出|
|本质|object 数组，封装了特殊规则|
|只能操作栈顶|不能中间插入/删除|
|非泛型有装箱拆箱|泛型 Stack<T> 解决|

### 方法速查

|方法|作用|移除？|
|---|---|---|
|`Push`|入栈|—|
|`Pop`|出栈|✅|
|`Peek`|看栈顶|❌|
|`Count`|个数|—|

### 和其他集合的关系

| 集合        | 规则       | 典型场景         |
| --------- | -------- | ------------ |
| ArrayList | 任意位置存取   | 通用列表         |
| **Stack** | **后进先出** | **撤销、后退、泛洪** |
| Queue     | 先进先出     | 排队、广度优先      |
|           |          |              |

### 什么时候用栈？

- 需要**后进先出**的时候
    
- 需要**撤销/回退**的时候
    
- 需要**深度优先搜索**的时候（比如你的泛洪翻开）
    
- 需要**匹配对称结构**的时候（括号匹配）
    

### 一句话总结

> **Stack 就是一摞盘子——只能从最上面放、从最上面取，最后放上去的最先被拿走。**

---

## 你的扫雷代码就是最好的例子

|你代码里的|对应知识|
|---|---|
|`new Stack<Cell>()`|创建泛型栈|
|`stack.Push(start)`|入栈|
|`stack.Pop()`|出栈|
|`while (stack.Count > 0)`|栈不空就循环|
|`stack.Push(n)`|有效邻居入栈|
|LIFO|往深处搜索（深度优先）|
