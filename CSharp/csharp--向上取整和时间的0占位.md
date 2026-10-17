==一：方法==
```csharp
 int resultM=s/v+(s%v==0?0:1);
   Console.WriteLine($"{resulth:D2}:{resultmin:D2}");
```

==二：题目==
```text
### Description

学校和 yyy 的家之间的距离为 ss 米，而 yyy 以 vv 米每分钟的速度匀速走向学校。

在上学的路上，yyy 还要额外花费 1010 分钟的时间进行垃圾分类。

学校要求必须在上午 8:008:00 到达，请计算在不迟到的前提下，yyy 最晚能什么时候出门。

由于路途遥远，yyy 可能不得不提前一点出发，但是提前的时间不会超过一天。

注意，yyy 只能在每分钟的第 00 秒时出发。

### Input

一行两个正整数 s,vs,v，分别代表路程和速度。

### Output

输出一个 2424 小时制下的时间，代表 yyy 最晚的出发时间。

输出格式为 HH:MMHH:MM，分别代表该时间的时和分。必须输出两位，不足前面补 00。

### Sample 1

|Input复制|Output复制|
|---|---|
|100 99|07:48|

### Hint

对于 100%100% 的数据，1≤s,v≤1041≤s,v≤104。
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
    internal class 上学迟到
    {
        static void Main()
        {
            int[] arri1=Array.ConvertAll(Console.ReadLine().Split( ' '),int.Parse );
            
            int s = arri1[0];
            int v = arri1[1];
           int resultM=s/v+(s%v==0?0:1);
           
            int resultE1 = 470 - resultM;
           if(resultE1 < 0) 
            {
                resultE1 += 1440;
            
            }
           //24:00+(-resultE)-->前一天的时间
            int resultmin = resultE1 % 60;
            int resulth = (resultE1 - resultmin) / 60;
            Console.WriteLine($"{resulth:D2}:{resultmin:D2}");


        }
    }
}
```
==四：分析==
