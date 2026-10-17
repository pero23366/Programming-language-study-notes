```text
一个数 x 如果不是质数，那它一定能分解成两个数相乘：

text

x = a × b

其中 a 和 b 中，**至少有一个 ≤ √x**。

举例：x = 36

- 36 = 2 × 18 ← 2 ≤ √36 = 6
    
- 36 = 3 × 12 ← 3 ≤ 6
    
- 36 = 4 × 9 ← 4 ≤ 6
    
- 36 = 6 × 6 ← 6 = 6


如果要判断 x 是不是质数，只需要试试：

> **2 到 √x 之间有没有能整除 x 的数？**

- 有 → x 是合数
    
- 没有 → x 是质数
    

不需要试到 x-1，试到 √x 就够了，省很多时间。
```


```csharp
using System;

class Program
{
    static void Main()
    {
        int N = int.Parse(Console.ReadLine());

        // 筛法求质数，范围到 N
        bool[] isPrime = new bool[N + 1];
        for (int i = 2; i <= N; i++) isPrime[i] = true;

        for (int i = 2; i * i <= N; i++)
        {
            //i<=sqrt(N)
            if (isPrime[i])
            {
                for (int j = i * i; j <= N; j += i)
                {
                    //一个质数的2倍及以上的倍数一定不是质数
                    //一个合数一定有一个质因数小于等于它的平方根，
                    //所以从i*i开始筛选即可
                    //从i到sqrt(N)
                    isPrime[j] = false;
                    //筛掉所有 i 的倍数
                  
                }
            }
        }

        // 遍历 4 到 N 的所有偶数
        for (int even = 4; even <= N; even += 2)
        {
            // 从小到大找第一个质数 p，使得 even - p 也是质数
            for (int p = 2; p <= even / 2; p++)
            {
                if (isPrime[p] && isPrime[even - p])
                {
                    Console.WriteLine($"{even}={p}+{even - p}");
                    break;
                }
            }
        }
    }
}
```