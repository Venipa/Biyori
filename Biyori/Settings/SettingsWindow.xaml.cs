using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace Biyori.Settings
{
    /// <summary>
    /// Interaction logic for SettingsWindow.xaml
    /// </summary>
    public partial class SettingsWindow : Window
    {
        public IEnumerable<SettingsRouteAttribute> SettingRoutes { get => Assembly.GetEntryAssembly().GetTypes().Where(x => x.GetCustomAttributes<SettingsRouteAttribute>().Count() > 0).Select(x => x.GetCustomAttribute<SettingsRouteAttribute>()); }
        public SettingsWindow()
        {
            InitializeComponent();
            settingsNav.SelectionChanged += SettingsNav_SelectionChanged;
            settingsNav.Items.Clear();
            this.SettingRoutes.Select(x => new ListBoxItem()
            {
                Tag = x.key,
                Content = x.pageName
            }).ToList().ForEach(x => settingsNav.Items.Add(x));
        }

        private void SettingsNav_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            var item = e.AddedItems[0] as ListBoxItem;
            if (item != null & item.Tag != null && this.TryGetRoute(item.Tag?.ToString()?.ToLower(), out var page))
            {
                settingsFrame.Navigate(new Uri(page.RelativeRoute));
            }
        }
        private bool TryGetRoute(string key, out SettingsRouteAttribute page)
        {
            page = null;

            var pages = Assembly.GetEntryAssembly().GetTypes().Where(x => x.GetCustomAttributes<SettingsRouteAttribute>().Count() > 0);
            var pInfo = pages.FirstOrDefault(x => x.GetCustomAttribute<SettingsRouteAttribute>()?.key == key);
            page = pInfo?.GetCustomAttribute<SettingsRouteAttribute>();
            if (page != null)
            {
                if (page.RelativeRoute == null)
                {
                    page.RelativeRoute = page.toRelativeRoute(pInfo);
                }
                return true;
            }
            return false;
        }

        private void Window_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape)
            {
                this.Close();
            }
        }
    }

    [AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
    public class SettingsRouteAttribute : Attribute
    {
        public SettingsRouteAttribute(string key, string pageName, bool isEnabled)
        {
            this.key = key;
            this.pageName = pageName;
            this.isEnabled = isEnabled;
        }

        public string key { get; set; }
        public string pageName { get; set; }
        public bool isEnabled { get; set; }
        public string RelativeRoute { get; set; }
        public string toRelativeRoute<T>() => toRelativeRoute(typeof(T));
        public string toRelativeRoute(Type type)
        {
            return $"pack://application:,,,/Settings/Frames/{type.Name.Replace('_', '-').Replace(' ', '-')}.xaml";
        }
    }
}
