using Biyori.Settings;
using Biyori.Settings.Frames;
using System;
using System.Collections.Generic;
using System.Windows.Controls;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;

namespace Biyori.Lib.Languages
{
    public partial class Languages : ResourceDictionary
    {
        public static ApplicationLanguage DefaultAppLanguage { get; set; }
        public Languages()
        {
        }
        public static Languages Instance()
        {
            return Application.Current.Resources.MergedDictionaries.FirstOrDefault(x => x.Source.PathAndQuery.ToLower().EndsWith("languages.xaml")) as Languages;
        }
        public void Initialize()
        {
            var provider = App.ServiceProvider.GetProvider<SettingsProviderService>();
            var appConfig = provider.GetConfig<ApplicationSettings>();
            var selectedLanguageResource = appConfig?.SelectedLanguage?.Name != null &&
                this.MergedDictionaries.Where(x => x.Contains("LangKey") && x["LangKey"].ToString() == appConfig.SelectedLanguage.Name).Count() > 0 ?
                this.getLanguageResource(appConfig.SelectedLanguage.Name) :
                this.getLanguageResource("en-us");
            var selectedLanguage = new ApplicationLanguage()
            {
                ImageUrl = selectedLanguageResource["ImageUrl"]?.ToString(),
                DisplayName = selectedLanguageResource["DisplayName"]?.ToString(),
                Name = selectedLanguageResource["LangKey"]?.ToString(),
            };
            appConfig.Languages.AddRange(this.getLanguages());
            provider.UpdateConfig(appConfig, true);
            this.MergedDictionaries.Clear();
            this.MergedDictionaries.Add(selectedLanguageResource);
        }

        private ApplicationLanguage getDefaultLanguage()
        {
            return this.getLanguageByLangKey("en-us");
        }
        private ApplicationLanguage getLanguageByLangKey(string langKey)
        {

            var resx = this
                    .MergedDictionaries.Where(x => x.Source?.PathAndQuery?.ToLower().EndsWith(".lang.xaml") == true).ToList();
            var resource = resx.Find(x => x["LangKey"]?.ToString() == langKey);
            var lang = new ApplicationLanguage()
            {
                ImageUrl = resource["ImageUrl"]?.ToString(),
                DisplayName = resource["DisplayName"]?.ToString(),
                Name = resource["LangKey"]?.ToString(),
            };
            return lang;
        }
        private IEnumerable<ApplicationLanguage> getLanguages()
        {
            var languages = new List<ApplicationLanguage>();
            languages.AddRange(this.MergedDictionaries.Where(x => x.Source?.PathAndQuery?.ToLower().EndsWith(".lang.xaml") == true).Select(resource => new ApplicationLanguage()
            {
                ImageUrl = resource["ImageUrl"]?.ToString(),
                DisplayName = resource["Name"]?.ToString(),
                Name = resource["LangKey"]?.ToString(),
            }));
            return languages;
        }
        private ResourceDictionary getLanguageResource(string langKey)
        {
            var resx = this
                    .MergedDictionaries.Where(x => x.Source?.PathAndQuery?.ToLower().EndsWith(".lang.xaml") == true).ToList();
            return resx.Find(x => x["LangKey"]?.ToString() == langKey);
        }
    }
}
