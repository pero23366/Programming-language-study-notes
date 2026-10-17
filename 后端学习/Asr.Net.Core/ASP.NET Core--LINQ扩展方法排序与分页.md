## 二：排序与分页

### 1. `OrderBy` / `OrderByDescending`

```csharp

var sorted = list.OrderBy(e => e.Name);              // 按姓名升序
var sortedDesc = list.OrderByDescending(e => e.Salary); // 按工资降序
```

### 2. `ThenBy` / `ThenByDescending`

用于**第二排序字段**，在 `OrderBy` 的基础上继续排序：

```csharp

var multiSort = list.OrderBy(e => e.Name[0]).ThenBy(e => e.Age);
// 先按姓名首字母升序，首字母相同的再按年龄升序
```

### 3. `Skip` / `Take`（分页核心）

```csharp

var page2 = list.Skip(10).Take(10); // 跳过前10条，取接下来的10条

```
这是实现**分页**的标准写法：`Skip((页码-1) × 每页条数).Take(每页条数)`[](https://www.cnblogs.com/guan-tou6/p/18232641#1)。
