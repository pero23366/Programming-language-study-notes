==一：概念==

**泛型是什么？**

泛型相当于一个**类型占位符**。在定义类或方法时，先用一个替代符（比如 `T`）代表还不确定的类型，等真正使用的时候再具体指定是什么类型。[](https://blog.csdn.net/mrtang_unity/article/details/123816532)

**打个比方：**

泛型就像**模具**。你先做一个“杯子模具”，模具本身不知道要装什么。等用的时候，你往模具里倒水，它就变成水杯；倒果汁，就变成果汁杯。**模具是通用的，装什么由你决定。**

**为什么需要泛型？**

不同类型的对象，如果处理逻辑相同，就可以用泛型来统一处理，避免重复写代码。同时，泛型能**避开装箱拆箱**，提升性能。[](https://blog.csdn.net/mrtang_unity/article/details/123816532)

**核心优势：**

- **代码复用**：一套代码，适配多种类型
    
- **类型安全**：编译时就能发现类型错误
    
- **性能更好**：值类型不用装箱拆箱
    

**种类：**

泛型主要有两种形式：

- **泛型类**：整个类围绕 `T` 工作
    
- **泛型方法**：类本身普通，只有某个方法需要适配多种类型
==二：格式==

**泛型类的定义格式：**

```csharp

class 类名<占位字母>
{
    // 类内部可以使用占位字母作为类型
}
```

**泛型方法的定义格式：**

```csharp

返回值类型 函数名<占位字母>(参数类型 参数)
{
    // 方法内部可以使用占位字母作为类型
}
```

**占位字母的规则：**

- 占位字母可以有多个（比如 `<T, K, V>`）
    
- 占位字母一般使用大写字母
    
- 定义时用替代符代表类型，使用时再具体指定[](https://blog.csdn.net/mrtang_unity/article/details/123816532)
    

**泛型方法可以存在于两类地方：**

- 泛型类中
    
- 普通类中
==三：代码==

### 泛型类

```csharp

class Box<T>
{
    private T[] items = new T[10];
    private int count = 0;
    public void Add(T item)
    {
        if (count < items.Length)
        {
            items[count] = item;
            count++;
        }
    }
    public T Get(int index)
    {
        return items[index];
    }
    public int Count
    {
        get { return count; }
    }
}

```
**使用：**

```csharp

// 装 int 的盒子
Box<int> intBox = new Box<int>();
intBox.Add(10);
intBox.Add(20);
int n = intBox.Get(0);        // 直接就是 int，不用强转！
// 装 string 的盒子
Box<string> strBox = new Box<string>();
strBox.Add("唐老狮");
string s = strBox.Get(0);     // 直接就是 string，不用强转！
// intBox.Add("hello");       // ❌ 编译报错！类型安全

```
### 泛型方法

```csharp

class Program
{
    // 泛型方法：交换两个变量的值
    static void Swap<T>(ref T a, ref T b)
    {
        T temp = a;
        a = b;
        b = temp;
    }
    static void Main()
    {
        int x = 1, y = 2;
        Swap<int>(ref x, ref y);          // 指定 T 为 int
        Console.WriteLine($"x={x}, y={y}"); // x=2, y=1
        string m = "你好", n = "世界";
        Swap<string>(ref m, ref n);        // 指定 T 为 string
        Console.WriteLine($"m={m}, n={n}"); // m=世界, n=你好
        // 类型推断：编译器自动推断 T 的类型
        int a = 3, b = 4;
        Swap(ref a, ref b);                // 不写 <int> 也能跑
    }
}
```

### 非泛型 vs 泛型对比

```csharp

// 非泛型：用 object
ArrayList list1 = new ArrayList();
list1.Add(10);
int a = (int)list1[0];        // 必须强转
// 泛型：用 List<T>
List<int> list2 = new List<int>();
list2.Add(10);
int b = list2[0];             // 不用强转
// list2.Add("hello");        // ❌ 编译报错
```

**对比总结：**

|非泛型（ArrayList）|泛型（List<T>）|
|---|---|---|
|存储类型|object，什么都能装|指定类型，装错编译报错|
|取值|必须强制转换|直接就是原类型|
|性能|值类型有装箱拆箱|无装箱拆箱|
|错误发现|运行时才报错|编译时就报错|
==四：总结==

### 核心要点

|要点|说明|
|---|---|
|概念|类型占位符，使用时再指定具体类型|
|种类|泛型类、泛型方法|
|占位字母|一般用大写字母，可以有多个|
|核心优势|代码复用、类型安全、避免装箱拆箱|

### 泛型的价值

|价值|说明|
|---|---|
|代码复用|一套代码适配多种类型，不用为每种类型重复写|
|类型安全|存错类型编译就报错，错误提前到编译期|
|性能更好|值类型不用装箱拆箱，存取更快|

### 什么时候用泛型？

- 多个类型**处理逻辑相同**的时候
    
- 需要**容器类**来存任意类型数据的时候
    
- 想**避免装箱拆箱**、提升性能的时候
    
- 想**编译时发现类型错误**的时候
    

### 一句话总结

> **泛型就是类型占位符——写代码时先用 `T` 占着位置，用的时候再告诉它具体是什么类型。**

### 你之前已经用过泛型了

| 你写过的                      | 对应知识       |
| ------------------------- | ---------- |
| `Dictionary<string, int>` | 泛型类，两个占位符  |
| `List<string>`            | 泛型类，一个占位符  |
| `Stack<Cell>`             | 泛型类，装自定义类型 |
| `Swap<T>`                 | 泛型方法       |