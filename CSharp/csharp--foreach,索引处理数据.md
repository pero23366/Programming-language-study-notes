```csharp
using System;

class Program
{
    static void Main()
    {
        string s = Console.ReadLine();


        int[] press = new int[26]
        {
            1, 2, 3,
            1, 2, 3,
            1, 2, 3,
            1, 2, 3,
            1, 2, 3,
            1, 2, 3, 4,
            1, 2, 3,
            1, 2, 3, 4
        };

        int total = 0;

        foreach (char c in s)
        {
            if (c == ' ')
                total += 1;
            else
                total += press[c - 'a'];

           
        }
        Console.WriteLine(total);
    }
}
```
` foreach (char c in s)`
```text
- `foreach`：C# 的循环关键字，意思是“遍历”。
    
- `char c`：声明一个字符类型的变量，名字叫 `c`。你可以把 `c` 改成 `x`、`ch` 等，都行。(每一次拿出的字母)
    
- `in`：固定关键字，表示“从……里面取”。
    
- `s`：要遍历的字符串。
    
- 大括号 `{ }`：每取一个字符，就执行一次里面的代码。
```