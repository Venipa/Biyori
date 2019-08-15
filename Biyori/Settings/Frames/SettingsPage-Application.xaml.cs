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
        public List<ApplicationLanguage> languages { get => appSettings?.Languages; }
        public ApplicationLanguage selectedLanguage { get => appSettings.SelectedLanguage; set => appSettings.SelectedLanguage = value; }
        public int selectedLanguageIndex { get => appSettings?.Languages?.IndexOf(appSettings.SelectedLanguage) ?? -1; }
        public SettingsPage_Application()
        {
            this.settingsProvider = App.ServiceProvider.GetProvider<SettingsProviderService>();
            this.appSettings = this.settingsProvider.GetConfig<ApplicationSettings>();
            InitializeComponent();
            var currentLangKey = appSettings?.SelectedLanguage?.Name;
            Debug.WriteLine(appSettings.Languages.Count());
            Debug.WriteLine(appSettings.SelectedLanguage?.DisplayName);

            if (currentLangKey != null)
            {
                this.languageComboBox.SelectedIndex = selectedLanguageIndex;
            }
        }

        public event PropertyChangedEventHandler PropertyChanged;
        public void PropertyChange(string propName)
        {
            this.PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propName));
        }

        private void ApplyChanges_Click(object sender, RoutedEventArgs e)
        {

            Dispatcher.BeginInvoke((Action)(() =>
            {
                this.settingsProvider.UpdateConfig(this.appSettings);
            }));
        }
    }
    [AddINotifyPropertyChangedInterface]
    [SettingsSection("application", true)]
    public class ApplicationSettings : SettingsBase
    {
        [JsonProperty("languages"), JsonIgnore]
        public List<ApplicationLanguage> Languages { get; set; } = new List<ApplicationLanguage>();
        [JsonProperty("selected_language")]
        public ApplicationLanguage SelectedLanguage { get; set; }
        public override void OnLoadConfig(SettingsProviderService provider)
        {
            base.OnLoadConfig(provider);
            Languages = Biyori.Lib.Languages.Languages.AvailableLanguages;
            SelectedLanguage = this.Languages.FirstOrDefault(x => x.Name == this.SelectedLanguage?.Name) ?? Biyori.Lib.Languages.Languages.DefaultAppLanguage;
            Lib.Languages.Languages.Instance()?.setLanguage(SelectedLanguage);
        }
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
