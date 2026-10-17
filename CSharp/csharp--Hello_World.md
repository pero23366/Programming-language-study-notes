==1.和c语言对比==
```
using System;

//打印
namespace Hello_World
{//命名空间
    internal class Program
    {//锁
        /*
         public：门是敞开的，其他项目（程序集）也能进来调用。

         private：门锁死了，只有自己类内部能调用。

         internal：门只对“同一栋楼（同一个项目/程序集）”的人开放。
         外面的人（别的 .exe 或 .dll）看不到也进不来。


         */

        static void Main(string[] args)
        {//入口
            Console.WriteLine("Hello_World");
            //输出并换行
            //Console.Write输出不换行
        }
    }
}
```