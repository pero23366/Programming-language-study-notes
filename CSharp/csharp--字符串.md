==一：概念==
`string`在C#中是一个**特殊引用类型**，它本质上是一个**不可变**（immutable）的**字符序列**[](https://blog.csdn.net/weixin_52398264/article/details/133912103#1)。

这里有两个关键点：

1. **它是引用类型**：`string`是`System.String`类的别名，属于引用类型。
    
2. **它是不可变的**：一旦创建了一个字符串对象，它的内容就永远不能被修改。任何看似修改字符串的操作（如拼接、替换），实际上都是**创建了一个新的字符串对象**，而不是在原对象上改动。
    

因为字符串在开发中极其常用，C#提供了很多便捷的操作方式。
==二：格式==
**1. 声明与初始化**

```csharp

// 直接用双引号，这是最常用的方式
string name = "唐老狮";
string empty = ""; // 空字符串
// 也可以用构造函数
char[] letters = { 'H', 'e', 'l', 'l', 'o' };
string greeting = new string(letters); // "Hello"
```

**2. 字符串拼接**

```csharp

string firstName = "唐";
string lastName = "老狮";
// 方式1：使用 + 运算符
string fullName1 = firstName + lastName; // "唐老狮"
// 方式2：使用 string.Format (较老的写法)
string fullName2 = string.Format("{0}{1}", firstName, lastName); 
// 方式3：使用 $ 字符串插值 (C# 6+，**最推荐**)
string fullName3 = $"{firstName}{lastName}"; // "唐老狮"
```

**3. 常用成员方法**

***子串 = 一个字符串中的一部分连续字符***
```csharp

string str = "Hello World";
// 获取长度
int len = str.Length; // 11
// 判断是否为空
bool isEmpty = string.IsNullOrEmpty(str); // false
// 查找子串位置，找不到返回 -1
int index = str.IndexOf("World"); // 6
// 判断是否包含子串
bool contains = str.Contains("Hello"); // true
// 截取子串
string sub = str.Substring(6); // "World"
// 替换
string replaced = str.Replace("World", "C#"); // "Hello C#"
// 分割
string[] parts = str.Split(' '); // ["Hello", "World"]
// 大小写转换
string upper = str.ToUpper(); // "HELLO WORLD"
string lower = str.ToLower(); // "hello world"
// 去除首尾空白
string trimmed = "  abc  ".Trim(); // "abc"
```
==三：代码==
```csharp

using System;
namespace StringDemo
{
    class Program
    {
        static void Main(string[] args)
        {
            string name = "唐老狮";
            int age = 18;
            // 1. 字符串插值：最推荐的拼接方式
            string intro = $"我是{name}，今年{age}岁。";
            Console.WriteLine(intro); // 输出：我是唐老狮，今年18岁。
            // 2. 证明字符串的不可变性
            string original = "Hello";
            string modified = original.ToUpper(); // 看似修改了original
            
            Console.WriteLine($"original: {original}");   // 输出：original: Hello
            Console.WriteLine($"modified: {modified}");   // 输出：modified: HELLO
            // original 的值并没有改变，ToUpper() 返回的是一个**新字符串**
            // 3. 常用方法演示
            string sentence = "  Unity, C#, 游戏开发  ";
            Console.WriteLine($"原始字符串: [{sentence}]");
            Console.WriteLine($"去除空白后: [{sentence.Trim()}]"); // 去除首尾空白
            Console.WriteLine($"是否包含C#: {sentence.Contains("C#")}"); // true
            Console.WriteLine($"分割后: {string.Join(" | ", sentence.Trim().Split(','))}"); 
            // 输出：分割后: Unity |  C# |  游戏开发
        }
    }
}
```
==四：总结==

**核心要点**

- **不可变性**：string一旦创建就不能修改，任何“修改”都会产生新对象。这是理解string所有行为的基础。
    
- **引用类型**：虽然是引用类型，但在作为参数传递时，表现有点像值类型（因为内部值不可变）。
    
- **字符串驻留**：C#会缓存字符串字面量，相同的字面量会指向同一内存地址，以节省内存。
    

**常用方法速查表**

| 方法/属性             | 作用        | 示例                                |
| ----------------- | --------- | --------------------------------- |
| `Length`          | 获取字符个数    | `"abc".Length` → 3                |
| `IsNullOrEmpty()` | 判断null或空串 | `string.IsNullOrEmpty("")` → true |
| `IndexOf()`       | 查找子串位置    | `"abc".IndexOf("b")` → 1          |
| `Contains()`      | 判断是否包含    | `"abc".Contains("b")` → true      |
| `Substring()`     | 截取子串      | `"abc".Substring(1)` → "bc"       |
| `Replace()`       | 替换内容      | `"abc".Replace("b", "x")` → "axc" |
| `Split()`         | 按分隔符分割    | `"a,b".Split(',')` → ["a", "b"]   |
| `Trim()`          | 去除首尾空白    | `" a ".Trim()` → "a"              |
| `ToUpper/ToLower` | 大小写转换     | `"aB".ToUpper()` → "AB"           |

**一句话总结**

> `string` 是一个**不可变的字符序列**。理解它的**不可变性**是掌握它的关键，而 **`$""` 插值语法**和**`Split()`/`Trim()`等常用方法**是日常开发中最得力的工具。

**与Unity开发的小关联**  
在Unity中，`string.Split()` 非常实用，常被用来解析**游戏配置表**（如CSV文件），将一行文本按逗号分割成不同的数据字段[](https://zhuanlan.zhihu.com/p/616517965#0)。

这个“不可变性”是理解string最核心的一点，可以把它想象成“只读”的字符数组。你目前在Unity里有用到字符串处理的地方吗？比如解析配置表或者处理玩家输入，可以结合具体场景看看这些方法是怎么用的。