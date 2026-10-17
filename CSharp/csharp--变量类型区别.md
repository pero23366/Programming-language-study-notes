==一：==
**值变量 ：int、double、struct**
值类型变量里**直接保存数据本身**
==二：==
**引用类型：class**
引用类型变量里保存的是**对象的地址（引用）**，不是对象本身。
```csharp
C# 类型
├── 值类型
│   ├── 简单类型
│   │   ├── 整数：byte, sbyte, short, ushort, int, uint, long, ulong
│   │   ├── 浮点：float, double, decimal
│   │   ├── 字符：char
│   │   └── 布尔：bool
│   ├── 枚举：enum描述一组固定的值，比如星期一到星期天
│   ├── 结构体：struct轻量级的类，不常用了，主要是性能考虑。
│   └── 可空值类型：int?, double?, bool?
│
└── 引用类型
    ├── 类：class最核心，描述对象有什么数据、能做什么。
    ├── 接口：interface 描述“能做什么”，不管“怎么做的”。
    ├── 数组：int[], string[], GameObject[]
    ├── 委托：Action, Func, 自定义 delegate 描述“方法长什么样”，为事件和回调做准备。
    ├── 字符串：string
    └── 对象：object
```
引用类型相当于自带“指针”