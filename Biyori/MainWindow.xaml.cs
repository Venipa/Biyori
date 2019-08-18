using Biyori.API.Kitsu;
using Biyori.Components.AnimeDialog;
using Biyori.Services.Anime;
using System;
using System.Collections.Generic;
using System.ComponentModel;
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
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace Biyori
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window, INotifyPropertyChanged
    {
        private AnimeService animeService { get; set; }
        public MainWindow()
        {
            this.animeService = App.ServiceProvider.GetProvider<AnimeService>();
            InitializeComponent();
            this.Title = Assembly.GetExecutingAssembly()?.GetName()?.Name ?? "Biyori";
            _test_showAnimeDialog.Click += onTestAnimeClick;
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected override void OnInitialized(EventArgs e)
        {
            base.OnInitialized(e);
        }

        private void onTestAnimeClick(object sender, RoutedEventArgs e)
        {
            var wnd = new AnimeInfoWindow(42068);
            wnd.Owner = this;
            wnd.ShowDialog();
        }
        private void onSettingsClick(object sender, RoutedEventArgs e)
        {
            var settingsWindow = new Settings.SettingsWindow();
            settingsWindow.Owner = this;
            settingsWindow.ShowDialog();
        }
        public void InvokePropertyChanged(string propName) => this.PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propName));

        private void SyncButton_Click(object sender, RoutedEventArgs e)
        {
        }
    }
}
