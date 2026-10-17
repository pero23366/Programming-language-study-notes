[[csharp--练习]]
==一：方法==
```csharp
1.
(string.IsNullOrWhiteSpace(input))
2.
using System.Text;
StringBuilder sb = new StringBuilder();


        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                sb.Append(grid[i, j]);
            }
            sb.AppendLine();
        }
3. Console.Write(sb.ToString());
```

```
### Description

设某汉字由 N×NN×N 的 00 和 11 的点阵图案组成。

我们依照以下规则生成压缩码。连续一组数值：从汉字点阵图案的第一行第一个符号开始计算，按书写顺序从左到右，由上至下。第一个数表示连续有几个 00，第二个数表示接下来连续有几个 11，第三个数再接下来连续有几个 00，第四个数接着连续几个 11，以此类推……

例如: 以下汉字点阵图案：

```none
0001000
0001000
0001111
0001000
0001000
0001000
1111111
```

Plain text

对应的压缩码是： 7 3 1 6 1 6 4 3 1 6 1 6 1 3 77 3 1 6 1 6 4 3 1 6 1 6 1 3 7 （第一个数是 NN ,其余各位表示交替表示0和1 的个数，压缩码保证 N×N=N×N= 交替的各位数之和）

### Input

数据输入一行，由空格隔开的若干个整数，表示压缩码。

其中，压缩码的第一个数字就是 NN，表示这个点阵应当是 N×NN×N 的大小。

接下来的若干个数字，含义如题目描述所述。

### Output

输出一个 N×NN×N 的 01 矩阵，表示最后的汉字点阵图（点阵符号之间不留空格）。

### Sample 1

|Input复制|Output复制|
|---|---|
|7 3 1 6 1 6 4 3 1 6 1 6 1 3 7|0001000<br>0001000<br>0001111<br>0001000<br>0001000<br>0001000<br>1111111|

### Hint

## 样例解释

![](https://cdn.vjudge.net.cn/3d85f300c6651e21ba3ca6cd00c899b6?13)

## 数据范围

数据保证，3≤N≤2003≤N≤200。
==二：题目==
```text

```
==三:  代码==
```csharp
using System;
using System.Text;

class Program
{
    static void Main()
    {
        string input = Console.ReadLine();
        if (string.IsNullOrWhiteSpace(input)) return;

        string[] parts = input.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

        int n = int.Parse(parts[0]);

        char[,] grid = new char[n, n];

        int idx = 1;          
        char cur = '0';       
        int row = 0;
        int col = 0;

        while (idx < parts.Length)
        {
            int count = int.Parse(parts[idx]);
            idx++;

            for (int i = 0; i < count; i++)
            {
                grid[row, col] = cur;

                col++;
                if (col == n)
                {
                    col = 0;
                    row++;
                }
            }

            cur = cur == '0' ? '1' : '0';
        }

        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                sb.Append(grid[i, j]);
            }
            sb.AppendLine();
        }

        Console.Write(sb.ToString());
    }
}
```
==四：分析==
```csharp
- `StringBuilder` 本身是一个“可变字符串对象”，不是 `string` 类型
    
- `new StringBuilder()` 创建的是**内容为空的 StringBuilder**
    
- 它内部通常会预分配一些容量，默认容量一般是 16 个字符，但**长度是 0**




`Append` 的意思是：

> **在 `StringBuilder` 的末尾追加内容。**

`StringBuilder` 你可以把它想象成一个“可变的字符串本子”：

- `Append`：往本子后面写东西
    
- `ToString`：把本子上写好的所有内容读出来，变成一个完整字符串
    
- `Console.Write`：真正输出到屏幕
  
  
  
  if (string.IsNullOrWhiteSpace(input)) return;
  意思就是：**如果没有输入，或者输入的全是空白，就直接结束程序，不往下执行。**
  
  
  
  
  Console.Write(sb.ToString());
  显示转换（没有也行）
```