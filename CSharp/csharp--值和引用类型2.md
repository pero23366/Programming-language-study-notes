==一：概念==

**值类型和引用类型，到底有什么区别？**

核心区别只有一句话：

> **值类型变量直接包含数据，引用类型变量存储的是数据的“地址”。**

| 值类型        | 引用类型                       |                       |
| ---------- | -------------------------- | --------------------- |
| **变量里装什么** | 数据本身                       | 数据在内存中的地址（引用）         |
| **赋值时**    | 复制一份数据副本                   | 复制地址，两个变量指向同一个对象      |
| **修改一个变量** | 不影响另一个                     | **会影响另一个**            |
| **典型代表**   | int、float、bool、struct、enum | class、string、数组、委托、接口 |

**打个比方：**

- **值类型** = 你手里拿着一本书。别人要，你把书**复印一份**给他。他涂改他的复印件，你的原书不受影响。
    
- **引用类型** = 你手里拿着一张**纸条，上面写着书柜的地址**。别人要，你把地址**抄一份**给他。他按地址找到同一本书，涂改它，你按地址找到的也是同一本被涂改的书。
    

**进阶视角：内存分配**

|值类型|引用类型|
|---|---|---|
|**通常分配在**|栈（Stack）|堆（Heap）|
|**为什么快**|栈是连续内存，分配释放极快|堆需要垃圾回收管理|
|**注意**|“值类型一定在栈上”是**常见误区**|当值类型作为类的字段时，它存储在堆上|

**值类型 vs 引用类型的判断方法：**

```csharp

// 值类型：继承自 System.ValueType
int a = 10;           // 值类型
float b = 3.14f;      // 值类型
bool c = true;        // 值类型
struct MyStruct { }    // 值类型
// 引用类型：不继承 ValueType
string s = "hello";   // 引用类型（特殊）
object o = new object(); // 引用类型
int[] arr = new int[5];  // 引用类型（数组）

```
==二：格式==

**判断值类型还是引用类型：**

```csharp

Type t = typeof(int);
Console.WriteLine(t.IsValueType);  // True
Type t2 = typeof(string);
Console.WriteLine(t2.IsValueType); // False
```

**装箱与拆箱：**

```csharp

// 装箱：值类型 → 引用类型
int num = 10;
object obj = num;        // 装箱（隐式）
// 拆箱：引用类型 → 值类型
int num2 = (int)obj;     // 拆箱（显式，必须强转）
```

**参数传递修饰符：**

```csharp

// 值传递（默认）：复制一份
void Method(int a) { a = 100; }
// 引用传递：直接操作原变量
void Method(ref int a) { a = 100; }
void Method(out int a) { a = 100; }
```

**`ref` 和 `out` 的区别：**

|`ref`|`out`|
|---|---|---|
|传入前必须初始化|✅ 必须|❌ 不要求|
|方法内必须赋值|❌ 不要求|✅ 必须|
|用途|可能读也可能写|只用于输出|
==三：代码==

### 值类型 vs 引用类型：赋值行为

```csharp

class Person { public string Name; }
class Program
{
    static void Main()
    {
        // 值类型：复制数据
        int a = 10;
        int b = a;
        b = 20;
        Console.WriteLine($"a={a}, b={b}");  // a=10, b=20（互不影响）
        // 引用类型：复制地址
        Person p1 = new Person { Name = "小明" };
        Person p2 = p1;
        p2.Name = "小红";
        Console.WriteLine($"p1.Name={p1.Name}");  // 小红（被影响了！）
    }
}
```

### 装箱与拆箱

```csharp

int num = 10;
// 装箱：值类型 → 引用类型
object obj = num;        // 在堆上创建一个对象，把 num 的值复制进去
// 拆箱：引用类型 → 值类型
int num2 = (int)obj;     // 从堆上的对象里把值复制出来
// 修改装箱后的值，不影响原值
obj = 20;
Console.WriteLine(num);  // 10（没变）

**装箱拆箱的性能代价：** 装箱要在堆上分配内存，拆箱要复制数据，频繁操作会严重影响性能。这就是为什么泛型比 ArrayList 快——泛型避免了装箱拆箱。

```
### 参数传递：值传递 vs 引用传递

```csharp

// 值传递：方法内修改不影响外部
void ChangeValue(int x) { x = 100; }
// 引用传递：方法内修改影响外部
void ChangeRef(ref int x) { x = 100; }
// out：方法内必须赋值，外部不需要初始化
void GetValue(out int x) { x = 100; }
class Program
{
    static void Main()
    {
        int a = 10;
        ChangeValue(a);
        Console.WriteLine(a);  // 10（没变）
        ChangeRef(ref a);
        Console.WriteLine(a);  // 100（变了）
        int b;
        GetValue(out b);
        Console.WriteLine(b);  // 100
    }
}
```

### 引用类型参数传递的“坑”

```csharp

class Person { public string Name; }
// 修改对象内部的数据 → 会影响外部
void ModifyObject(Person p) { p.Name = "小红"; }
// 重新赋值引用 → 不影响外部
void ReassignObject(Person p) { p = new Person { Name = "小刚" }; }
class Program
{
    static void Main()
    {
        Person p1 = new Person { Name = "小明" };
        ModifyObject(p1);
        Console.WriteLine(p1.Name);  // 小红（被影响了）
        Person p2 = new Person { Name = "小明" };
        ReassignObject(p2);
        Console.WriteLine(p2.Name);  // 小明（没变！）
    }
}
```

**为什么？** 因为引用类型传递的**也是“地址的副本”**。方法内重新赋值，只是把副本指向了新对象，原变量指向的还是旧对象。

### 你项目里的实际应用

你的 `DeepSeekService.cs`：

```csharp

public async Task<string> GetResponseAsync(List<ChatMessage> history, string model = "deepseek-chat")

- `List<ChatMessage>` 是**引用类型**，传递的是引用，方法内修改列表内容会影响外部
    
- `string model` 是**引用类型**，但 string 是不可变的，赋值新字符串不会影响外部
    

```
你的 `MainWindow.xaml.cs`：

```csharp

_history.Add(new ChatMessage { Role = "user", Content = userInput });
```

`_history` 是 `List<ChatMessage>`，引用类型。`Add` 是在**同一个列表对象**上操作，所以外部也能看到新加的消息。
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|**值类型**|变量直接包含数据，赋值复制副本|
|**引用类型**|变量存储地址，赋值复制引用，两个变量指向同一对象|
|**内存分配**|值类型通常在栈，引用类型在堆（有例外）|
|**装箱**|值类型 → 引用类型，在堆上分配内存|
|**拆箱**|引用类型 → 值类型，从堆上复制数据|
|**值传递**|默认，复制一份，方法内修改不影响外部|
|**引用传递**|`ref`/`out`，直接操作原变量，方法内修改影响外部|

### 常见误区

|误区|真相|
|---|---|
|“值类型一定在栈上”|作为类字段时，值类型存储在堆上|
|“引用类型传递的是引用，所以方法内一定能改外部”|传递的是**地址的副本**，重新赋值不影响外部|
|“string 是值类型”|string 是**引用类型**，但具有不可变性|
|“装箱拆箱没性能问题”|频繁装箱拆箱严重影响性能，泛型就是为了解决这个|
### 什么时候用值类型？什么时候用引用类型？

|场景|推荐|
|---|---|
|数据量小、生命周期短、不需要继承|**值类型（struct）**|
|需要继承、多态、引用语义|**引用类型（class）**|
|需要避免装箱拆箱的性能损耗|**用泛型，避免用 object**|

### 一句话总结

> **值类型直接装数据，赋值复制副本；引用类型装地址，赋值复制引用，两个变量指向同一对象。装箱拆箱是值类型和引用类型之间的转换，有性能代价。参数传递默认是值传递，`ref`/`out` 才是引用传递**