==一：概念==
****
```csharp
**内部类**：在一个类的里面再定义一个类。  
它默认是 `private`，只有外部类能访问。内部类可以访问外部类的私有成员。  
用来表示“从属关系”，比如：汽车 `Car` 里面有个引擎 `Engine`。

**分部类**：把一个类的定义拆到多个文件里写。  
每个文件都加 `partial` 关键字，编译时编译器会自动合并成一个完整的类。  
用来方便代码组织、多人协作，或者把自动生成的代码和手写代码分开。

一句话：

> **内部类管“从属”，分部类管“拆分”。**
```
==二：格式==
```csharp
1.内部类
class 外部类
{
    class 内部类
    {
        // 内部类成员
    }
}
2.分部类
// 文件1
public partial class 类名
{
    // 一部分代码
}

// 文件2
public partial class 类名
{
    // 另一部分代码
}
```
**创建内部类对象：**
```csharp
外部类.内部类 变量名 = new 外部类.内部类();
```

==三：代码==
```csharp
using System;

namespace 内部类和分部类
{
    public partial class Car
    {
        private string brand;

        public Car(string brand)
        {
            this.brand = brand;
        }

        // 内部类
        public class Engine
        {
            public void ShowBrand(Car car)
            {
                Console.WriteLine("品牌是：" + car.brand);
            }
        }
    }
}
```
```csharp
using System;

namespace 内部类和分部类
{
    public partial class Car
    {
        public void Run()
        {
            Console.WriteLine("汽车跑起来了");
        }
    }
}

```
```csharp
using System;

namespace 内部类和分部类
{
    internal class Program
    {
        static void Main()
        {
            Car car = new Car("宝马");
            //外部类

            // 创建内部类对象
            Car.Engine engine = new Car.Engine();
            engine.ShowBrand(car);

            // 调用分部类另一个文件里的方法
            car.Run();
        }
    }
}
```
==四：总结==

| 对比项  | 内部类                           | 分部类                        |
| ---- | ----------------------------- | -------------------------- |
| 核心   | 类里面再定义类                       | 一个类拆到多个文件                  |
| 关键字  | 无特殊关键字                        | `partial`                  |
| 创建对象 | `外部类.内部类 变量 = new 外部类.内部类();` | `new 类名()`                 |
| 访问权限 | 默认 `private`，可加 `public`      | 各部分可访问性必须一致                |
| 主要用途 | 表示从属关系、封装                     | 代码组织、团队协作                  |
| 注意点  | 访问外部私有成员通常要传外部类实例             | 所有部分都要 `partial`，命名空间和类名一致 |