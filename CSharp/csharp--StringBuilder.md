==一：概念==
上一节我们说过：**string 是不可变的**。每次拼接或修改字符串，都会在堆上**创建一个新的字符串对象**，原来的对象变成垃圾等待回收。

如果只是偶尔拼接几次，这没问题。但如果在**循环中频繁拼接**，比如：

csharp

string result = "";
for (int i = 0; i < 10000; i++)
{
    result += i.ToString();  // 每次都在堆上创建新字符串！
}

这会创建 10000 个临时字符串对象，严重浪费内存和性能。

### StringBuilder 是什么？

`StringBuilder` 是 C# 提供的一个**用于处理字符串的公共类**，位于 `System.Text` 命名空间。

它的核心特点是：**可变（mutable）**。它内部维护一个**字符数组**，修改字符串时直接在数组上操作，而不是每次都创建新对象。只有容量不够时才会自动扩容。

> **一句话对比**：string 是“只读”的，StringBuilder 是“可编辑”的。

| 场景        | 推荐使用                |
| --------- | ------------------- |
| 少量拼接（几次）  | `string` 就够了        |
| 循环中大量拼接   | **`StringBuilder`** |
| 频繁修改字符串内容 | **`StringBuilder`** |
| 只需要读取字符串  | `string`            |
|           |                     |
==二：格式==
### 1. 引用命名空间

```csharp

using System.Text;
```

### 2. 初始化

```csharp

// 方式1：直接指定内容
StringBuilder sb = new StringBuilder("Hello");
// 方式2：指定内容 + 初始容量
StringBuilder sb2 = new StringBuilder("Hello", 100);
// 方式3：只指定容量
StringBuilder sb3 = new StringBuilder(100);
```

### 3. 容量与长度

csharp

Console.WriteLine(sb.Capacity);  // 当前分配的容量
Console.WriteLine(sb.Length);    // 当前字符个数

- **Length**：实际字符数量
    
- **Capacity**：内部数组已分配的空间
    
- 每次添加内容时，如果长度超过 Capacity，会自动扩容（通常是翻倍）
    

### 4. 常用方法（增、删、查、改、替换）

| 操作     | 方法                                | 说明                    |
| ------ | --------------------------------- | --------------------- |
| **增**  | `sb.Append("内容")`                 | 在末尾追加                 |
|        | `sb.AppendLine("内容")`             | 追加并换行                 |
|        | `sb.AppendFormat("{0}{1}", a, b)` | 格式化追加                 |
| **插**  | `sb.Insert(index, "内容")`          | 在指定位置插入               |
| **删**  | `sb.Remove(index, count)`         | 从 index 开始删 count 个字符 |
|        | `sb.Clear()`                      | 清空所有内容                |
| **查**  | `sb[index]`                       | 通过索引访问字符              |
|        | `sb.ToString()`                   | 转换为普通 string          |
| **改**  | `sb[index] = 'A'`                 | 修改指定位置的字符             |
| **替换** | `sb.Replace("旧", "新")`            | 替换内容                  |

### 5. 链式调用

大部分方法都返回 StringBuilder 自身，所以可以**连续调用**：

```csharp

sb.Append("A").Append("B").Insert(0, "C").Replace("A", "X");
```
==三：代码==
```csharp

using System;
using System.Text;   // 必须引用
namespace StringBuilderDemo
{
    class Program
    {
        static void Main(string[] args)
        {
            // ===== 初始化 =====
            StringBuilder sb = new StringBuilder("123123123");
            Console.WriteLine(sb);              // 123123123
            Console.WriteLine($"容量: {sb.Capacity}");  // 容量
            Console.WriteLine($"长度: {sb.Length}");    // 9
            // ===== 增 =====
            sb.Append("4444");
            Console.WriteLine(sb);              // 1231231234444
            Console.WriteLine($"长度: {sb.Length}");    // 13
            Console.WriteLine($"容量: {sb.Capacity}");  // 自动扩容了
            // ===== 格式化追加 =====
            sb.AppendFormat("{0}{1}", 100, 999);
            Console.WriteLine(sb);              // ...100999
            // ===== 插入 =====
            sb.Insert(0, "唐老狮");
            Console.WriteLine(sb);              // 唐老狮1231231234444100999
            // ===== 删 =====
            sb.Remove(0, 3);                    // 从索引0删3个字符
            Console.WriteLine(sb);              // 1231231234444100999
            // ===== 查 =====
            Console.WriteLine(sb[0]);           // '1'
            Console.WriteLine(sb.ToString());   // 转换为 string
            // ===== 改 =====
            sb[0] = 'A';
            Console.WriteLine(sb);              // A231231234444100999
            // ===== 替换 =====
            sb.Replace("1", "唐");
            Console.WriteLine(sb);              // A23唐23唐23...
            // ===== 清空 =====
            sb.Clear();
            Console.WriteLine($"清空后长度: {sb.Length}");  // 0
            // ===== 对比：循环拼接的性能差异 =====
            // string 方式（慢）
            string s = "";
            for (int i = 0; i < 1000; i++)
            {
                s += i;          // 每次创建新对象
            }
            // StringBuilder 方式（快）
            StringBuilder sb2 = new StringBuilder();
            for (int i = 0; i < 1000; i++)
            {
                sb2.Append(i);   // 在原数组上追加，不创建新对象
            }
            string result = sb2.ToString();  // 最后一次性转成 string
        }
    }
}
```
==四：总结==

|对比项|`string`|`StringBuilder`|
|---|---|---|
|**可变性**|❌ 不可变|✅ 可变|
|**命名空间**|`System`|`System.Text`|
|**频繁拼接**|慢，产生大量垃圾|快，直接在原数组上操作|
|**适用场景**|少量操作、只读|循环拼接、频繁修改|
|**转成 string**|本身就是 string|`sb.ToString()`|

**核心方法速查：**

|方法|作用|
|---|---|
|`Append`|末尾追加|
|`AppendLine`|追加并换行|
|`AppendFormat`|格式化追加|
|`Insert`|指定位置插入|
|`Remove`|删除指定范围|
|`Clear`|清空|
|`Replace`|替换|
|`ToString`|转成普通 string|

**一句话总结：**

> `StringBuilder` 是**可变的字符串**。当需要**频繁修改或拼接字符串**时用它，避免像 `string` 那样每次都创建新对象，从而**大幅提升性能**。用之前记得 `using System.Text;`，最后用 `ToString()` 转回普通字符串。