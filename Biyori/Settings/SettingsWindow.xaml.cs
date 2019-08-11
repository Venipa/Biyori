using Biyori.Settings.Frames;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
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
        public SettingsProviderService settingsProvider { get; private set; }
        public SettingsWindow()
        {
            InitializeComponent();
            settingsNav.SelectionChanged += SettingsNav_SelectionChanged;
            settingsNav.Items.Clear();
            this.SettingRoutes.Select(x => new ListBoxItem()
            {
                Tag = x.key,
                Content = x.pageName,
                IsEnabled = x.isEnabled
            }).ToList().ForEach(x => settingsNav.Items.Add(x));
        }
        protected override void OnInitialized(EventArgs e)
        {
            base.OnInitialized(e);
            this.settingsProvider = App.ServiceProvider.GetProvider<SettingsProviderService>();
            var accountConfig = this.settingsProvider.GetConfig<AccountSettings>();
            if (Debugger.IsAttached && accountConfig.Accounts.Count == 0)
            {
                accountConfig.Accounts.Add(new AccountInfo()
                {
                    Username = "test",
                    Password = "testPassword",
                    EmailAddress = "test@biyori.moe"
                });
            }
            this.settingsProvider.UpdateConfig(accountConfig);
            Debug.WriteLine(JsonConvert.SerializeObject(this.settingsProvider.GetConfig<AccountSettings>()));
        }

        private void SettingsNav_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            var item = e.AddedItems[0] as ListBoxItem;
            if (item != null && item.IsEnabled && item.Tag != null && this.TryGetRoute(item.Tag?.ToString()?.ToLower(), out var page))
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

        public bool ApplyChangeStatus { get; set; } = true;
        private void SaveChange_Click(object sender, RoutedEventArgs e)
        {
            Dispatcher.BeginInvoke((Action)(() =>
            {
                this.ApplyChangeStatus = false;
                this.settingsProvider.SaveSettings().Wait();
                this.ApplyChangeStatus = true;
                this.Close();
            }));
        }

        private void CloseWindow_Click(object sender, RoutedEventArgs e)
        {
            Dispatcher.BeginInvoke((Action)(() =>
            {
                this.ApplyChangeStatus = false;
                this.settingsProvider.LoadSettings().Wait();
                this.ApplyChangeStatus = true;
                this.Close();
            }));
        }
        private void ApplyChange_Click(object sender, RoutedEventArgs e)
        {
            Dispatcher.BeginInvoke((Action)(() =>
            {
                this.ApplyChangeStatus = false;
                this.settingsProvider.SaveSettings().Wait();
                this.ApplyChangeStatus = true;
            }));
        }
    }

    [AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
    public class SettingsRouteAttribute : Attribute
    {
        public SettingsRouteAttribute(string key, string pageName, bool isEnabled = true)
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
