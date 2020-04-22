using Biyori.Components.Loading;
using Biyori.Settings;
using Biyori.Settings.Frames;
using Biyori.Lib;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Navigation;
using Biyori.Lib.Util;
using Biyori.Services.Anime;

namespace Biyori
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        public event EventHandler OnServiceLoaded;
        public static readonly ServiceProviderCollector ServiceProvider = new ServiceProviderCollector();
        public App() : base()
        {
        }
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            var wnd = new LoadingWindow();
            wnd.Show();
            this.OnServiceLoaded += (s, _e) =>
            {
                Dispatcher.BeginInvoke((Action)(() =>
                {
                    wnd.Hide();
                    new MainWindow().Show();
                    wnd.Close();
                }));
            };
            this.AsyncDispatch(() =>
            {
                var languageInstance = Lib.Languages.Languages.Instance();
                languageInstance.Initialize();
                App.ServiceProvider.ScanCurrent();
                var settingsProvider = App.ServiceProvider.GetProvider<SettingsProviderService>();
                Debug.WriteLine("Currently active Language: " + settingsProvider?.GetConfig<ApplicationSettings>()?.SelectedLanguage.DisplayName);
                this.OnServiceLoaded?.Invoke(this, new EventArgs());
            }).Execute();
            Application.Current.Exit += (s, _e) =>
            {
                App.ServiceProvider.GetProvider<AnimeService>()?.onExit();
            };
        }

    }
}
