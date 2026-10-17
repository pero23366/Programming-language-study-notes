==一：方法==
```csharp
1.读题，找有限的终点
2.判断是否为可以求的终点值
3.对可以求的终点值求最小值
```
==二：题目==
```text
你有三个正整数 r，g，b。你可以进行以下操作若干次（可以不操作）。

- 若 r>0，将 r 减少 1，将 g 增加 1（即 `r--`，`g++`）。
    
- 将 r 增加 1（即 `r++`）。
    
- 若 b>0，将 b 减少 1，将 g 增加 1（即 `b--`，`g++`）。
    
- 将 b 增加 1（即 `b++`）。
    

求使 r，g，b 三个数相等的**最小**操作次数。

## 输入格式

**本题测试点内有多组测试数据**。

第一行是一个整数，表示数据组数 T。

接下来 T 行，每行三个整数 r，g，b。

## 输出格式

对每组数据，输出一个整数，表示最小的操作次数。

## 输入输出样例

**输入 #1**复制

5
1 2 1
6 4 4
6 4 6
7 2 7
7 3 7

**输出 #1**复制

2
2
4
6
4

## 说明/提示

- 对 10% 的数据，1≤T≤10，1≤r，g，b≤10。
    
- 对 25% 的数据，1≤T≤50，1≤r，g，b≤1000。
    
- 对 50% 的数据，1≤T≤500，1≤r，g，b≤105。
    
- 对 80% 的数据，1≤T≤800，1≤r，g，b≤109。
    
- 对 100% 的数据，1≤T≤1000，1≤r，g，b≤1015。
```
==三:  代码==
==四：分析==
```csharp
让我一个个分析using System;

namespace training
{
    internal class 红蓝与绿
    {
        static void Main()
        {
            int T = int.Parse(Console.ReadLine());

         
            long[] arrc = new long[T];

            for (int i = 0; i < T; i++)//循环每一行
            {
                string[] parts = Console.ReadLine().Split(' ');
                long r = long.Parse(parts[0]);
                long g = long.Parse(parts[1]);
                long b = long.Parse(parts[2]);
//每一行的数字记入，并且下一次会刷新覆盖
               
                long high = r;
                if (g > high) high = g;
                if (b > high) high = b;

                long best = -1;//初始值

               
                for (long x = g; x <= high; x++)//1.先计算每一种情况到相同值x的次数，再用x作为唯一的未知数处理总次数，起到最优解算法的作用。2.本题的特殊处，G只能增加。同时比最大值还大的x一定不是 最优解，卡出循环
                {
                    
                    long need = x - g;//给if用

                    
                    long extraR = 0;//初始化
                    if (r > x) extraR = r - x;//比可行x大，才转换

                 
                    long extraB = 0;
                    if (b > x) extraB = b - x;//同上

                   
                    if (extraR + extraB <= need)//比G还小的值做不到（本题G只能增加导致），G路径可行的话后续可以补回R,B的值，不行的话，就一定不是可行的x
                    {
                       
                        long cost = 4 * x - r - b - 2 * g;

                        if (best == -1 || cost < best)
                        {
                            best = cost;//将所用的可行的x比较大小
                        }
                    }
                }

                arrc[i] = best;//记录
            }

          
            for (int i = 0; i < T; i++)
            {
                Console.WriteLine(arrc[i]);//遍历输出
            }
        }
    }
}
```
