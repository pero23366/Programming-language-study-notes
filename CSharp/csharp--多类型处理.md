==一：方法==
1.objet[]（万能格式）
2.var（类结构体）
3.结构体
==二：题目==
### Description

读入一个字符，一个整数，一个单精度浮点数，一个双精度浮点数，然后按顺序输出它们，并且要求在他们之间用一个空格分隔。输出浮点数时保留 66 位小数。

### Input

第一行是一个字符；

第二行是一个整数；

第三行是一个单精度浮点数；

第四行是一个双精度浮点数。

### Output

输出字符、整数、单精度浮点数和双精度浮点数，之间用空格分隔。

### Sample 1

|Input复制|Output复制|
|---|---|
|a<br>12<br>2.3<br>3.2|a 12 2.300000 3.200000|
==三.代码==
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace 练习
{
    internal class _空格分隔输出
    {
        struct Type
        {
            public string str;
            public int num1;
            public float num2;
            public double num3;
        }
        static void Main(string[] args)
        {
            Type date = new Type();
            string stra1 = Console.ReadLine();
            date.str = stra1;
            string stra2 = Console.ReadLine();
            date.num1 = int.Parse(stra2);
            string stra3 = Console.ReadLine();
            date.num2 = float.Parse(stra3);
            string stra4 = Console.ReadLine();
            date.num3 = double.Parse(stra4);
            Console.WriteLine($"{date.str} {date.num1} {date.num2:F6} {date.num3:F6}");

        }
    }
}

```
==四：分析==
**1.public**
类与类的数据调用权限要开
**2结构体名字 新名字 = new 结构体名字();**
==开一个新口子，再用一个变量来接住原来的数据==**（重命名）**
**倒着读**
结构体调用时要开个新位置