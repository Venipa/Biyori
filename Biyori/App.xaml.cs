using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

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
        }
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            App.ServiceProvider.ScanCurrent();
            new MainWindow().Show();
        }
    }
}
