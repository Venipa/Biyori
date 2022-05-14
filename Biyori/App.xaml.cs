using Biyori.Components.Loading;
using Biyori.Settings;
using Biyori.Settings.Frames;
using Biyori.Core;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Navigation;
using Biyori.Core.Util;
using Biyori.Services.Anime;
using Biyori.Services;
using Biyori.Core.Common;
using Biyori.Core.Win32;

namespace Biyori
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        private ResourceDictionary _darkDict = null;
        public event EventHandler OnServiceLoaded;
        public static readonly ServiceProviderCollector ServiceProvider = new ServiceProviderCollector();
        public App() : base()
        {
        }
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            
            LoadingWindow wnd = null;
            this.OnServiceLoaded += (s, _e) =>
            {
                Dispatcher.BeginInvoke((Action)(() =>
                {
                    if (wnd != null)
                    {
                        wnd.Hide();
                        new MainWindow().Show();
                        wnd.Close();
                    }
                }));
            };
            var languageInstance = Core.Languages.Languages.Instance;
            languageInstance.Initialize();
            this.AsyncDispatch(() =>
            {
                App.ServiceProvider.ScanCurrent();
                Dispatcher.BeginInvoke((Action)(() =>
                {
                    wnd = new LoadingWindow();
                    wnd.Show();
                }));
                var appService = App.ServiceProvider.GetProvider<AppService>();
                appService.LoadingStatus.Value = "Loaded Service Providers...";
                var settingsProvider = App.ServiceProvider.GetProvider<SettingsProviderService>();
                var selectedTheme = settingsProvider?.GetConfig<ApplicationSettings>()?.Theme ?? Themes.None;
                SwitchTheme(selectedTheme);
                Debug.WriteLine("Currently active Language: " + settingsProvider?.GetConfig<ApplicationSettings>()?.SelectedLanguage.DisplayName);
                appService.LoadingStatus.Value = "Loaded Language Files...";
                this.OnServiceLoaded?.Invoke(this, new EventArgs());
                appService.LoadingStatus.Value = "Ready";
            }).Execute();
            Application.Current.Exit += (s, _e) =>
            {
                App.ServiceProvider.GetProvider<AnimeService>()?.onExit();
            };
        }

        public void SwitchTheme(Themes theme)
        {
            var isDark = false;
            if (_darkDict == null)
            {
                _darkDict = new ResourceDictionary
                {
                    Source = new Uri("pack://application:,,,/Biyori.Core;component/Styles/AppDark.styles.xaml")
                };
            }
            switch (theme)
            {
                case Themes.None:
                    isDark = Win32UXTheme.AppsUseDarkTheme();
                    break;
                case Themes.Dark:
                case Themes.Light:
                    isDark = theme == Themes.Dark;
                    break;
            }

            if (isDark)
            {
                if (!Resources.MergedDictionaries.Contains(_darkDict))
                    Resources.MergedDictionaries.Add(_darkDict);
            }
            else
            {
                if (Resources.MergedDictionaries.Contains(_darkDict))
                    Resources.MergedDictionaries.Remove(_darkDict);
            }
        }
    }

}

