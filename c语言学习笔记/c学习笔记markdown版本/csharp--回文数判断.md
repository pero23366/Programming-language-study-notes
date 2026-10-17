```csharp
using System;

class Program
{
    static void Main()
    {
        string s = Console.ReadLine();

        char[] arr = s.ToCharArray();
        Array.Reverse(arr);
        string rev = new string(arr);

        Console.WriteLine(s == rev ? "yes" : "no");
    }
}
```
` Array.Reverse(arr);`
