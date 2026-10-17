```csharp
using System;

class Program
{
    static int n;
    static int[,] map;

   
    static void Illuminate(int x, int y, int type)
    {
        int range = 2; // 火把和萤石的扩散范围都是 2

        for (int dx = -range; dx <= range; dx++)
        {
            for (int dy = -range; dy <= range; dy++)
            {
                // 火把：曼哈顿距离 <= 2
                if (type == 2 && Math.Abs(dx) + Math.Abs(dy) > 2)
                    continue;
                //大于的范围不照亮

                int nx = x + dx;
                int ny = y + dy;
                //空白不管
                if (nx >= 0 && nx < n && ny >= 0 && ny < n)
                {
                    // 不覆盖火把(2)和萤石(3)本身
                    if (map[nx, ny] != 2 && map[nx, ny] != 3)
                    {
                        map[nx, ny] = 1;
                    }
                }
            }
        }
    }

    static void Main()
    {
        string[] first = Console.ReadLine().Split();
        n = int.Parse(first[0]);
        int m = int.Parse(first[1]);
        int k = int.Parse(first[2]);

        map = new int[n, n]; // 默认全 0

        // 先放火把
        for (int i = 0; i < m; i++)
        {
            string[] line = Console.ReadLine().Split();
            int x = int.Parse(line[0]) - 1;
            int y = int.Parse(line[1]) - 1;
            map[x, y] = 2;
        }

        // 再放萤石
        for (int i = 0; i < k; i++)
        {
            string[] line = Console.ReadLine().Split();
            int x = int.Parse(line[0]) - 1;
            int y = int.Parse(line[1]) - 1;
            map[x, y] = 3;
        }

        // 统一照亮
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                if (map[i, j] == 2)
                    Illuminate(i, j, 2);
                else if (map[i, j] == 3)
                    Illuminate(i, j, 3);
            }
        }

        // 统计 0 的数量，即会生成怪物的点
        int ans = 0;
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                if (map[i, j] == 0)
                    ans++;
            }
        }

        Console.WriteLine(ans);
    }
}
```
