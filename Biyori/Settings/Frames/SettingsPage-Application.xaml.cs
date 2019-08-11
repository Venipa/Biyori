using Newtonsoft.Json;
using PropertyChanged;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
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

namespace Biyori.Settings.Frames
{
    [SettingsRoute("application", "Application", true)]
    /// <summary>
    /// Interaction logic for SettingsPage_Application.xaml
    /// </summary>
    public partial class SettingsPage_Application : Page, INotifyPropertyChanged
    {
        private SettingsProviderService settingsProvider { get; set; }
        [AlsoNotifyFor("selectedLanguage")]
        private ApplicationSettings appSettings { get; set; }
        public List<ApplicationLanguage> languages { get; set; } = new List<ApplicationLanguage>();
        public ApplicationLanguage selectedLanguage { get => appSettings.SelectedLanguage; set => appSettings.SelectedLanguage = value; }
        public SettingsPage_Application()
        {
            this.settingsProvider = App.ServiceProvider.GetProvider<SettingsProviderService>();
            this.appSettings = this.settingsProvider.GetConfig<ApplicationSettings>();
            this.languages.Clear();
            this.languages.AddRange(appSettings.Languages);
            InitializeComponent();
            Debug.WriteLine(appSettings.Languages.Count());
        }

        public event PropertyChangedEventHandler PropertyChanged;
        public void PropertyChange(string propName) => this.PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propName));

        private void ApplyChanges_Click(object sender, RoutedEventArgs e)
        {

            Dispatcher.BeginInvoke((Action)(() =>
            {
                this.settingsProvider.UpdateConfig(this.appSettings);
            }));
        }
    }
    [SettingsSection("application", true)]
    public class ApplicationSettings : SettingsBase
    {
        [JsonProperty("languages"), JsonIgnore]
        public List<ApplicationLanguage> Languages { get; set; } = new List<ApplicationLanguage>();
        [JsonProperty("selected_language")]
        public ApplicationLanguage SelectedLanguage { get; set; } = Biyori.Lib.Languages.Languages.DefaultAppLanguage;
    }
    public class ApplicationLanguage
    {
        [JsonIgnore]
        public bool HasImage { get => ImageUrl != null; }
        [JsonIgnore]
        public string ImageUrl { get; set; }
        [JsonIgnore]
        public Uri ImageUri { get => ImageUrl != null ? new Uri(ImageUrl) : null; }
        [JsonIgnore]
        public string DisplayName { get; set; }
        [JsonProperty("lang_key")]
        public string Name { get; set; }
    }
}
