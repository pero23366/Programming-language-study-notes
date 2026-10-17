```csharp
using System;

namespace 练习
{
    internal class 培训
    {
        public struct Student
        {
            public string name;
            public int age;
            public int score;
        }

        static Student Train(Student s)
        {
            s.age += 1;
            s.score = s.score * 6 / 5;  
            if (s.score > 600)
                s.score = 600;
            return s;
        }

        static void Main()
        {
            int n = int.Parse(Console.ReadLine());
            Student[] students = new Student[n];

      
            for (int i = 0; i < n; i++)
            {
                string[] input = Console.ReadLine().Split(' ');
                students[i].name = input[0];
                students[i].age = int.Parse(input[1]);
                students[i].score = int.Parse(input[2]);
            }

     
            for (int i = 0; i < n; i++)
            {
                students[i] = Train(students[i]);
                Console.WriteLine($"{students[i].name} {students[i].age} {students[i].score}");
            }
        }
    }
}
```