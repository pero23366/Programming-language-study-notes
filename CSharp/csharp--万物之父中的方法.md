==一：概念==
所有类都继承自 `Object`，所以所有对象都拥有这些方法。按**调用方式和能否重写**，可以分为：

|分类|数量|特点|
|---|---|---|
|**静态方法**|2个|用 `Object.方法名()` 调用，不属于某个对象|
|**成员方法**|2个|用 `对象.方法名()` 调用，不能重写|
|**虚方法**|3个|用 `对象.方法名()` 调用，**可以在子类中重写**|
==二：格式==
### **1. 静态方法（2个）**

**① `Object.Equals(objA, objB)`**


```csharp


bool result = Object.Equals(a, b);

```
- 判断两个对象是否相等
    
- 内部会调用**左侧对象**的 `Equals` 虚方法
    
- 如果 `a` 是 `null`，则调用 `b.Equals(null)`
    

**② `Object.ReferenceEquals(objA, objB)`**

```csharp

bool result = Object.ReferenceEquals(a, b);

```
- 判断两个对象是否是**同一个引用**（同一块内存）
    
- 值类型永远返回 `false`（因为值类型会装箱成不同对象）
    

---

### 2. 成员方法（2个）

**① `GetType()`**

```csharp

Type t = 对象.GetType();

```
- 获取对象**运行时的类型**
    
- 返回 `Type` 对象，可以通过 `.Name`、`.FullName` 等获取类型信息
    
- **不能重写**
    

**② `MemberwiseClone()`**

```csharp

object copy = 对象.MemberwiseClone();  // protected，只能在类内部调用
```

- 创建对象的**浅拷贝**
    
- 返回一个新对象，但引用类型字段仍指向原对象
    
- **不能重写**，`protected` 权限
    

---

### 3. 虚方法（3个）

**① `Equals(object obj)`**

```csharp

public virtual bool Equals(object obj);
```

- 默认行为：和 `ReferenceEquals` 一样，比较引用
    
- **可以重写**，自定义“相等”规则
    

**② `GetHashCode()`**

```csharp

public virtual int GetHashCode();
```

- 返回对象的哈希码，用于 `Dictionary`、`HashSet` 等哈希表
    
- **可以重写**，重写 `Equals` 时通常要一起重写
    

**③ `ToString()`** ⭐ 最常用

```csharp

public virtual string ToString();
```

- 默认返回**完全限定类型名**（如 `ObjectDemo.Player`）
    
- **可以重写**，返回自定义字符串
    
- `Console.WriteLine(对象)` 默认打印的就是 `ToString()` 的结果


==三：代码==
```csharp
using System;

namespace ObjectDemo
{
    class Player
    {
        public string Name;
        public int Age;

        // 重写虚方法 ToString
        public override string ToString()
        {
            return $"玩家：{Name}，年龄：{Age}";
        }

        // 重写虚方法 Equals
        public override bool Equals(object obj)
        {
            if (obj is Player other)
                return Name == other.Name && Age == other.Age;
            return false;
        }

        // 重写虚方法 GetHashCode（配合 Equals）
        public override int GetHashCode()
        {
            return HashCode.Combine(Name, Age);
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            Player p1 = new Player { Name = "唐老狮", Age = 18 };
            Player p2 = new Player { Name = "唐老狮", Age = 18 };
            Player p3 = p1;

            // ===== 静态方法 =====
            Console.WriteLine("--- 静态方法 ---");
            Console.WriteLine(Object.Equals(p1, p2));          // True（重写了Equals）
            Console.WriteLine(Object.Equals(p1, p3));          // True
            Console.WriteLine(Object.ReferenceEquals(p1, p3)); // True（同一引用）
            Console.WriteLine(Object.ReferenceEquals(p1, p2)); // False（不同对象）

            // ===== 成员方法 =====
            Console.WriteLine("--- 成员方法 ---");
            Console.WriteLine(p1.GetType());                   // ObjectDemo.Player
            Console.WriteLine(p1.GetType().Name);              // Player
            // p1.MemberwiseClone();  // ❌ protected，外部调不了

            // ===== 虚方法 =====
            Console.WriteLine("--- 虚方法 ---");
            Console.WriteLine(p1.ToString());                  // 玩家：唐老狮，年龄：18
            Console.WriteLine(p1);                             // 同上（自动调用ToString）
            Console.WriteLine(p1.Equals(p2));                  // True（重写了）
            Console.WriteLine(p1.GetHashCode());               // 某个哈希值
        }
    }
}
```
==四：总结==

|分类|方法|调用方式|能否重写|作用|
|---|---|---|---|---|
|**静态**|`Object.Equals(a,b)`|`Object.Equals(a,b)`|❌|判断两对象相等|
|**静态**|`Object.ReferenceEquals(a,b)`|`Object.ReferenceEquals(a,b)`|❌|判断是否同一引用|
|**成员**|`GetType()`|`对象.GetType()`|❌|获取运行时类型|
|**成员**|`MemberwiseClone()`|`对象.MemberwiseClone()`|❌|浅拷贝（protected）|
|**虚**|`Equals(obj)`|`对象.Equals(obj)`|✅|自定义相等规则|
|**虚**|`GetHashCode()`|`对象.GetHashCode()`|✅|哈希码|
|**虚**|`ToString()`|`对象.ToString()`|✅|自定义字符串表示|

### 一句话总结

> **静态方法**用 `Object.` 调用，**成员方法**和**虚方法**用 `对象.` 调用。其中**虚方法可以重写**，最常用的是 `ToString`，其次是 `Equals` 和 `GetHashCode`（两者要一起重写）。