==一：方法==

```csharp
char[]arrc1=strs1.**ToCharArray();**
```

```csharp
     Array.Reverse(arrc1);
```

```csharp
**string strs2=new string(arrc1);**
```
==二：题目==
```text
### Description

输入一个不小于 100100 且小于 10001000，同时包括小数点后一位的一个浮点数，例如 123.4123.4 ，要求把这个数字翻转过来，变成 4.3214.321 并输出。

### Input

一行一个浮点数。

### Output

一行一个浮点数。

### Sample 1

|Input复制|Output复制|
|---|---|
|123.4|4.321|
```
==三:  代码==
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace 练习
{
    internal class __数字反转
    {
        static void Main(string[] args)
        {
            string strs1 = Console.ReadLine();
            char[]arrc1=strs1.ToCharArray();
            Array.Reverse(arrc1);
            string strs2=new string(arrc1);
            Console.WriteLine($"{strs2}");




        }
    }
}
```
==四：分析==
①：将字符串转为字符串数组
②：数组反转
**③：调用**