==一.查找==
**①：2分查找**
```csharp
static void Hsc(int[] arr, int len,int num)
{   int Left = 0;
    int Right= len - 1;
           
    while(Left<=Right)
    {
        int Mid = (Left + Right) / 2;
        if (arr[Mid]==num)
        { 
        Console.WriteLine($"{num}是第{Mid}位");
            break;
        }
        else if(arr[Mid]>num)
            {
            Right = Mid-1;
                  
        }
        else 
        {
            Left = Mid+1;
                    
           
        }

    }
           
       
}
```
**②：遍历**
```csharp
        static void Hsb(int[] arr, int len)
   {
       for (int i = 0; i < len; i++)
       { Console.WriteLine(arr[i]); }
   }
```
==二.排序==
**①：冒泡排序**
```csharp
               static void BubbleSort(int[] arr, int len)
        {

            for (int o = 1; o < len; o++)
            {
                bool swapped = false;
                for (int i = 0; i < len - 1; i++)
                {
                    
                    bool pd = arr[i] > arr[i + 1];
                    if (pd)
                    {
                        int temp = arr[i];

                        arr[i] = arr[i + 1];
                        arr[i + 1] = temp;
                        swapped = true;
                    }
              
                }
                if(!swapped)
                {
                    break;
                }
            }
        }
```
**②：选择排序**
```csharp
static void Hsd(ref int[] arr,ref int len)
{
for (int i=0; i < len-1; i++)
    {
        int LS=i ;
        for (int o=i+1;o<len;o++)
        {
            if (arr[LS] > arr[o])
            {
                LS = o;
            }
        }
       int temp= arr[i];
        arr[i] = arr[LS];
        arr[LS] = temp;
    }
}
```