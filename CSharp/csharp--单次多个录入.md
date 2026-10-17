==一：方法==
**string str= Console.ReadLine();
string[]arr=str.Split(' ');**
二.题目
### Description

输入三个整数，整数之间由一个空格分隔。把第二个输入的整数输出。

### Input

只有一行，共三个整数，整数之间由一个空格分隔。

### Output

只有一行，一个整数，即输入的第二个整数。

### Sample 1

|Input复制|Output复制|
|---|---|
|123 456 789|456|

### Hint

对于 100%100% 的数据，输入的整数在 [1,109][1,109] 内。
三：代码
```csharp

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace 练习
{
    internal class _输出第二个整数
    {
        static void Main(string[] args)
        {
            string str = Console.ReadLine();
            string[] arr = str.Split(' ');
            Console.WriteLine($"{arr[1]}");





        }


    }


}
```
四：分析
1. str.Split('');
创建一个数组检测前缀的字符串，每次到‘’为止，将索引【0~N】投入