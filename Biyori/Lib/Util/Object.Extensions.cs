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
    }
}
