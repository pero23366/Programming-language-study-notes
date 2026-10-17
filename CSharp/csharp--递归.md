```csharp
using System;
using System.Globalization;

class Program
{
    static double F(double x, int n)
    {
        if (n == 0)
            return x;
            //最内层

        return x / (n + F(x, n - 1));
    }

    static void Main()
    {
      
        string[] s = Console.In.ReadToEnd().Split(
            new[] { ' ', '\n', '\r', '\t' },
            StringSplitOptions.RemoveEmptyEntries
        );

        double x = double.Parse(s[0], CultureInfo.InvariantCulture);
        int n = int.Parse(s[1]);

        double ans = F(x, n);

        Console.WriteLine(ans.ToString("F2", CultureInfo.InvariantCulture));
    }
}
//从次外层开始，结构+代值（结构+代值）
```