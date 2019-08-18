using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.Lib.Util
{
    public static class ObjectExtensions
    {
        public static T ToType<T>(this object obj) => (T)Convert.ChangeType(obj, typeof(T));
        public static T GetPropValue<T>(this object obj, string propName)
            => obj == null ? default(T) : obj.GetType().GetProperty(propName).GetValue(obj).ToType<T>();
        public static void SetPropValue<T>(this object obj, string propName, T value)
            => obj?.GetType().GetProperty(propName).SetValue(obj, value);

        public static List<List<T>> ChunckBy<T>(this List<T> items, int sliceSize = 30)
        {
            List<List<T>> list = new List<List<T>>();
            for (int i = 0; i < items.Count; i += sliceSize)
                list.Add(items.GetRange(i, Math.Min(sliceSize, items.Count - i)));
            return list;
        }
    }
}
