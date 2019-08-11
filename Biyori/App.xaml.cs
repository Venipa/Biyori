using Biyori.Components.Loading;
using Biyori.Settings;
using Biyori.Settings.Frames;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Navigation;

namespace Biyori
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        public static readonly ServiceProviderCollector ServiceProvider = new ServiceProviderCollector();
        public App() : base()
        {
            App.ServiceProvider.ScanCurrent();
        }
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);


            var languageInstance = Lib.Languages.Languages.Instance();
            languageInstance.Initialize();
            Debug.WriteLine("Currently active Language: " + App.ServiceProvider.GetProvider<SettingsProviderService>()?.GetConfig<ApplicationSettings>()?.SelectedLanguage.DisplayName);
            new LoadingWIndow().Show();
        }

    }
}
