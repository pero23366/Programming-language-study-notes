==一：方法==
0.2=20/100
**0.2，0.5，0.3=（20+50+30）/100**
==二：题目==
### Background

NOIP2017 普及组 T1

### Description

牛牛最近学习了 C++ 入门课程，这门课程的总成绩计算方法是：

总成绩=作业成绩×20%+小测成绩×30%+期末考试成绩×50%总成绩=作业成绩×20%+小测成绩×30%+期末考试成绩×50%

牛牛想知道，这门课程自己最终能得到多少分。

### Input

三个非负整数 A,B,CA,B,C，分别表示牛牛的作业成绩、小测成绩和期末考试成绩。相邻两个数之间用一个空格隔开，三项成绩满分都是 100100 分。

### Output

一个整数，即牛牛这门课程的总成绩，满分也是 100100 分。

### Sample 1

|Input复制|Output复制|
|---|---|
|100 100 80|90|

### Sample 2

|Input复制|Output复制|
|---|---|
|60 90 80|79|

### Hint

**样例 1 说明**

牛牛的作业成绩是 100100 分，小测成绩是 100100 分，期末考试成绩是 8080 分，总成绩是 100×20%+100×30%+80×50%=20+30+40=90100×20%+100×30%+80×50%=20+30+40=90。

**样例 2 说明**

牛牛的作业成绩是 6060 分，小测成绩是 9090 分，期末考试成绩是 8080 分，总成绩是 60×20%+90×30%+80×50%=12+27+40=7960×20%+90×30%+80×50%=12+27+40=79。

**数据说明**

对于 30%30% 的数据，A=B=0A=B=0。

对于另外 30%30% 的数据，A=B=100A=B=100。

对于 100%100% 的数据，0≤A,B,C≤1000≤A,B,C≤100 且 A,B,CA,B,C 都是 1010 的整数倍。
==三:  代码==
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace 练习
{
    internal class _成绩
    {
        static void Main()
        {
           int[] arrnum1= Array.ConvertAll(Console.ReadLine().Split(' '), int.Parse);
            int A = arrnum1[0]; 
            int B = arrnum1[1]; 
            int C = arrnum1[2];
            int result =( arrnum1[0] * 20 +arrnum1[1] * 30 +arrnum1[2] * 50)/100;
            Console.WriteLine($"{result}");



        }
    }
}
```
==四：分析==
用整十数再相除的形式实现
