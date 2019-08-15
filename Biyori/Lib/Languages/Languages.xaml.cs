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
        public static List<ApplicationLanguage> AvailableLanguages { get; private set; }
        public Languages()
        {
        }
        public static Languages Instance()
        {
            return Application.Current.Resources.MergedDictionaries.FirstOrDefault(x => x.Source.PathAndQuery.ToLower().EndsWith("languages.xaml")) as Languages;
        }
        public void Initialize()
        {
            Languages.AvailableLanguages = this.getLanguages().ToList();
            Languages.DefaultAppLanguage = Languages.AvailableLanguages.FirstOrDefault(x => x.Name == "en-us");
            this.setLanguage(Languages.DefaultAppLanguage);
            
        }
        public void setLanguage(ApplicationLanguage selectedLanguage)
        {
            var items = this.MergedDictionaries.ToList();
            this.MergedDictionaries.Clear();
            items.Where(x => x["LangKey"]?.ToString() != selectedLanguage.Name).ToList().ForEach(x => this.MergedDictionaries.Add(x));
            this.MergedDictionaries.Add(items.FirstOrDefault(x => x["LangKey"]?.ToString() == selectedLanguage.Name));
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
                DisplayName = resource["Name"]?.ToString(),
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
