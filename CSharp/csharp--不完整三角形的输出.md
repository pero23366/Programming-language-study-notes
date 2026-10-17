==一：方法==
```csharp
多个中间量控制总数
```
==二：题目==
```text
### Background

NOIP2015 普及组 T1

### Description

国王将金币作为工资，发放给忠诚的骑士。第一天，骑士收到一枚金币；之后两天（第二天和第三天），每天收到两枚金币；之后三天（第四、五、六天），每天收到三枚金币；之后四天（第七、八、九、十天），每天收到四枚金币……；这种工资发放模式会一直这样延续下去：当连续 nn 天每天收到 nn 枚金币后，骑士会在之后的连续 n+1n+1 天里，每天收到 n+1n+1 枚金币。

请计算在前 kk 天里，骑士一共获得了多少金币。

### Input

一个正整数 kk，表示发放金币的天数。

### Output

一个正整数，即骑士收到的金币数。

### Sample 1

|Input复制|Output复制|
|---|---|
|6|14|

### Sample 2

|Input复制|Output复制|
|---|---|
|1000|29820|

### Hint

**【样例 1 说明】**

骑士第一天收到一枚金币；第二天和第三天，每天收到两枚金币；第四、五、六天，每天收到三枚金币。因此一共收到 1+2+2+3+3+3=141+2+2+3+3+3=14 枚金币。

对于 100%100% 的数据，1≤k≤1041≤k≤104。
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
    internal class 金币
    {
        static void Main()
        {
            int k = int.Parse(Console.ReadLine());
            int num=0;
            int day = 0;
            for (int i = 1; day < k; i++)
            {
                for(int j = 1; j <= i&&day<k; j++)
                {

                    num  += i;
                    day++;
                }





            }
            Console.WriteLine(num);
        }
    }
}
```
==四：分析==
