```csharp
using System;

class Program
{
    static void Main()
    {
        string[] first = Console.ReadLine().Split(' ');
        int n = int.Parse(first[0]);
        int m = int.Parse(first[1]);

        int[,] a = new int[n, m];

        for (int i = 0; i < n; i++)
        {
            string[] line = Console.ReadLine().Split(' ');
            for (int j = 0; j < m; j++)
            {
                a[i, j] = int.Parse(line[j]);
            }
        }

        // 顺时针旋转 90 度：新矩阵 m 行 n 列
        for (int i = 0; i < m; i++)          // 新行号
        {
            for (int j = 0; j < n; j++)      // 新列号
            {
                // 原行 = n - 1(最后一个列) - j（最后的列），原列 = i
                Console.Write(a[n - 1 - j, i]);
                if (j != n - 1) Console.Write(' ');
            }
            Console.WriteLine();
        }
    }
}
```