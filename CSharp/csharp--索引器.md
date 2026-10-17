==一：本质==
它本质上就是一个**带参数的属性**。或者说，它就是一个**伪装成 `[]` 的方法**。**

==二：使用==
## `int this[Type Name]`
1.
```csharp
public string this[int index]
用法：`inv[0]`  
返回：`string`
```
2.
```csharp
public int this[string name]
用法：`inv["苹果"]`  
返回：`int`
```
3.
```csharp
public int this[int row, int col]
用法：`matrix[1, 2]`  
返回：`int`
比喻：像表格，你报第几行第几列，它给你格子里的数
```
%%既然索引器只是“语法糖”，那为什么 C# 还要设计它？

因为**代码是给人看的，顺便给机器执行**。%%