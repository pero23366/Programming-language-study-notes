==一：方法==
①：平方： Math.Sqrt（底数）
②：任意小数进位：Math.Round（操作变量，指定第N+1位位进，mode)
```
四舍五入mode
MidpointRounding.AwayFromZero
```
==二：题目==
### Description

一个三角形的三边长分别是 aa、bb、cc，那么它的面积为 p(p−a)(p−b)(p−c)p(p−a)(p−b)(p−c)​，其中 p=12(a+b+c)p=21​(a+b+c)。输入这三个数字，计算三角形的面积，四舍五入精确到 11 位小数。

### Input

第一行输入三个实数 a,b,ca,b,c，以空格隔开。

### Output

输出一个实数，表示三角形面积。精确到小数点后 11 位。

### Sample 1

|Input复制|Output复制|
|---|---|
|3 4 5|6.0|

### Hint

数据保证能构成三角形，0≤a,b,c≤10000≤a,b,c≤1000，每个边长输入时不超过 22 位小数。
==三:代码==
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace 练习
{
    internal class 三角形面积
    {
        static void Main(string[] args)
        {
          double[] numd1=  Array.ConvertAll(Console.ReadLine().Split(new char[] { ' ' }), double.Parse);
            double a = numd1[0];
            double b = numd1[1];
            double c = numd1[2];
            double p = (a + b + c) / 2d;
            double midResult = Math.Sqrt(p * (p - a) * (p - b) * (p - c));
            double finResult = Math.Round(midResult, 2, MidpointRounding.AwayFromZero);
            Console.WriteLine($"{finResult:F1}");


        }
    }
}
```
==四：分析==
