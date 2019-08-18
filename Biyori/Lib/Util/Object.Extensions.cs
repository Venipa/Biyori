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
    }
}
