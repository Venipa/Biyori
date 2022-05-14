using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Media.Imaging;

namespace Biyori.Core.Util
{
    public static class BitmapExtensions
    {
        public static BitmapImage ToBitmapImage(this Stream stream)
        {
            var bitmap = new BitmapImage();
            bitmap.BeginInit();
            bitmap.StreamSource = stream;
            bitmap.CacheOption = BitmapCacheOption.OnLoad;
            bitmap.EndInit();
            bitmap.Freeze();
            return bitmap;
        }
        public static string SerializeObject<T>(this T obj, Formatting formatting = Formatting.None)
        {
            return JsonConvert.SerializeObject(obj, formatting);
        }
        public static T DeserializeObject<T>(this string serializedObject)
        {
            return (T)DeserializeObject(serializedObject, typeof(T));
        }
        public static object DeserializeObject(this string serializedObject, Type type)
        {
            return JsonConvert.DeserializeObject(serializedObject, type);
        }
    }
}
