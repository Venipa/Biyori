using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.Core.Win32
{
    public class Win32UXTheme
    {
        public static bool AppsUseDarkTheme()
        {
            var value = Registry.GetValue(
                        @"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
                        "AppsUseLightTheme", 1);

            return value != null && (int)value == 0;
        }
        public static bool SystemUsesDarkTheme()
        {
            var value = Registry.GetValue(
                        @"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
                        "SystemUsesLightTheme", 0);

            return value == null || (int)value == 0;
        }
    }
}
