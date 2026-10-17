==一：方法==
 decimal[] numa1 = Array.ConvertAll(arra1, decimal.Parse);
 decimal num = numa1[0] / numa1[1];
==二：题目==
### Description

两个整数 aa 和 bb 分别作为分子和分母，即分数 abba​，求它的浮点数值（双精度浮点数，保留小数点后 99 位）。

### Input

输入仅一行，包括两个整数 aa 和 bb。

### Output

输出也仅一行，分数 abba​ 的浮点数值（双精度浮点数，保留小数点后 99 位）。

### Sample 1

|Input复制|Output复制|
|---|---|
|5 7|0.714285714|

### Hint

对于 100%100% 的数据，1≤a,b≤1091≤a,b≤109。
==三：代码==
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace 练习
{
    internal class _计算分数的浮点数值
    {
        static void Main(string[] args)
        {

            string str=Console.ReadLine();
          
           string[]arra1= str.Split(' ');
            decimal[] numa1 = Array.ConvertAll(arra1, decimal.Parse);
            decimal num = numa1[0] / numa1[1];
            Console.WriteLine($"{num:F9}");



        }
    }
}
```
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace 练习
{
    struct Type
    {
        public decimal t;
        public int n;

    }
    internal class _再分肥宅水
    {
        static void Main(string[] args)
        {
            Type date = new Type();
            string[] arr= Console.ReadLine().Split(' ');

            string stra1 = arr[0];
            date.t=decimal.Parse(stra1);

            string stra2 = arr[1];
            date.n=int.Parse(stra2);
            decimal result=date.t/date.n;
            int result0=date.n*2;
            Console.WriteLine($"{result:F3}");
            Console.WriteLine($"{result}");



        }
    }
}

```
==四：分析==
1.日常小数运算用decimal(四舍五入)
2.Array.ConvertAll(数组名, 转换类型.Parse);
