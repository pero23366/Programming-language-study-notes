
==一：意义==
可以实现有限制的访问，例如银行柜台
==二代码==
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace C__2
{
    class Student
    {
        private string grade;
        
        private int score;
        public string Name { get; set; }
        public int Score
        {
            set
            {
                score = value;
                if (score < 0 || score > 100)
                {
                    score = -1;
                }
            }
            get
            {
                return score;
            }

        }
        public string Grade
        {


            get
            {
                if (score >= 90 && score <= 100)
                    return "A";
                else if (score >= 80 && score <= 89)
                    return "B";
                else if (score >= 70 && score <= 79)
                    return "C";
                else if (score >= 60 && score <= 69)
                    return "D";
                else if (score >= 0 && score <= 59)
                {
                    return "E";
                }
                else
                {
                    return "请输入一个0~100的数字";
                }



            }






        }
    }
        
        internal class _属性
        {
            static void Main()
            {
              Student s=  new Student();
                s.Name = "小明";
                s.Score = 285;
                
                Console.WriteLine($"{s.Name},{s.Score},{s.Grade}");





            }
        }
    
}
```
==三：分析==
①：
```csharp
public string Name { get; set; }
```
自动属性会自动帮我们谱写存储，get,set，也就不用小写存储的啦。
②：
```text
CS0161：并非所有代码都为返回值
```
例如：
```csharp
get
{
    if (score >= 90 && score <= 100)
        return "A";
    else if (score >= 80 && score <= 89)
        return "B";
    else if (score >= 70 && score <= 79)
        return "C";
    else if (score >= 60 && score <= 69)
        return "D";
    else if (score >= 0 && score <= 59)
    {
        return "E";
    }
    else
    {
        return "请输入一个0~100的数字";
    }



}
```
==csharp规定必须所有情况都有返回值才成立，因此上述代码必须要else兜底==
③：
调用的时候记得区分大小写
**（大写才是get set)**