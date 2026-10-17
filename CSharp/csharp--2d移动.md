==一：方法==
```csharp
方向数组
```
==二：题目==
```text
### Description

给出一个不大于 99 的正整数 nn，输出 n×nn×n  
的蛇形方阵。

从左上角填上 11 开始，顺时针方向依次填入数字，如同样例所示。注意每个数字有都会占用 33 个字符，前面使用空格补齐。

### Input

输入一个正整数 nn，含义如题所述。

### Output

输出符合题目要求的蛇形矩阵。

### Sample 1

|Input复制|Output复制|
|---|---|
|4|1  2  3  4<br> 12 13 14  5<br> 11 16 15  6<br> 10  9  8  7|

### Hint

数据保证，1≤n≤91≤n≤9。
```
==三:  代码==
==四：分析==
```csharp
using System;

class Program
{
    static void Main()
    {
        int n = int.Parse(Console.ReadLine());

        int[,] a = new int[n, n];

        //     方向：右、下、左、上（一种形式）
        int[] dr = { 0, 1, 0, -1 };
        int[] dc = { 1, 0, -1, 0 };
（d——>变化量，row排，col列）
        int row = 0, col = 0;
        int dir = 0; // 0=右, 1=下, 2=左, 3=上

        for (int num = 1; num <= n * n; num++)
        {
            a[row, col] = num;

            // 尝试按当前方向走一步
            int nr = row + dr[dir];
            int nc = col + dc[dir];

            // 如果下一步越界或已经有数字，就转向
            if (nr < 0 || nr >= n || nc < 0 || nc >= n || a[nr, nc] != 0)
            {
                dir = (dir + 1) % 4;
                nr = row + dr[dir];
                nc = col + dc[dir];
            }
            （改成console.Readkey可实现移动）

            row = nr;
            col = nc;
            //记录本次
        }

        // 输出，每个数字占 3 个字符，右对齐
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                Console.Write(a[i, j].ToString().PadLeft(3));
            }
            Console.WriteLine();
        }
    }
}
```
