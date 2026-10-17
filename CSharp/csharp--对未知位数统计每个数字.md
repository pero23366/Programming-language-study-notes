==一：方法==
```csharp
while循环解决未知位数
```
==二：题目==
```text
### Background

NOIP2013 普及组 T1

### Description

试计算在区间 11 到 nn 的所有整数中，数字 xx（0≤x≤90≤x≤9）共出现了多少次？例如，在 11 到 1111 中，即在 1,2,3,4,5,6,7,8,9,10,111,2,3,4,5,6,7,8,9,10,11 中，数字 11 出现了 44 次。

### Input

22 个整数 n,xn,x，之间用一个空格隔开。

### Output

11 个整数，表示 xx 出现的次数。

### Sample 1

|Input复制|Output复制|
|---|---|
|11 1|4|

### Hint

对于 100%100% 的数据，1≤n≤1061≤n≤106，0≤x≤90≤x≤9。
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
    internal class 计数问题
    {
        static void Main()
        {
            int count = 0;

            int[] arri1 = Array.ConvertAll(Console.ReadLine().Split(' '), int.Parse);
         int n = arri1[0];
            int x = arri1[1];
            for (int i = 1; i <= n; i++)
            {
                int t = i;
               
                  

                    while (t> 9)
                    {
                   int rem = t % 10;
                    if (rem == x)
                        {
                            count++;
                        }
                        t = t / 10;
                      

                    }
                    if(t== x)
                    {  count++; }
                
            }
            Console.WriteLine($"{count}");
        }
    }
}
```
==四：分析==
如果将count换成数组内部再套个循环，用长度作为边界，就可以实现将任意位数的数字的每一位上的数字提取出来。
个位和其他位数分开
核心是%10得最后一位，再/10切除
==五.补充==
**对M~N范围的数字统计其中0~9出现的次数**
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace 练习
{
    internal class 梦中的统计
    {
        static void Main()
        {
          int []arri1=  Array.ConvertAll(Console.ReadLine().Split(' '), int.Parse);
            int M = arri1[0];
            int N = arri1[1];
            int ci = N - M+1;
            int x = 0;
            int[]arrn= new int[10]{0,1,2,3,4,5,6,7,8,9};
            int[]result= new int[10];
            for (int i = 0; i < ci; i++)
            {
                if(i==0)
                {

                   x= arri1[0];
                }
                if(i>=1)
                {
                    x++;
                }
                int t = x;



                while (t > 9)
                {
                    int rem = t % 10;
                    for (int j = 0; j < arrn.Length; j++)
                    {
                        if (rem == j)
                        { result[j]++; }
                    }
                    t = t / 10;


                }
                for(int j = 0; j < arrn.Length; j++)
                {
                    if (t == j)
                    { result[j]++; }
                }

          




            }
            for (int i = 0; i < result.Length; i++)
            {
                Console.Write(result[i] + " ");
            }



        }
    }
}
```