==一：本质==
```text
Dictionary:一个空的字典
List:可变数组
```
==二：调用==
```csharp
   private readonly Dictionary<string, int> quantities
    = new Dictionary<string, int>();


private readonly List<string> order = new List<string>();
构造函数，代表传输变量的类型
```
==三：方法==
```csharp
.Count   计数
TryGetValue  尝试寻找字典中的单词
```
==四：比喻==
```text
1.页码->单词，
2.按 order 的顺序，先拿到名字，再用名字去查分数。
顺序靠order
（注意：页码！=值）
3.字典写完了
查字典，统计字典
```