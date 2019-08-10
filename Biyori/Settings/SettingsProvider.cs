using Newtonsoft.Json;
using PropertyChanged;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.Settings
{
    [AddINotifyPropertyChangedInterface]
    [ServiceProviderParse("settings", InitializeOnStartup = true)]
    public class SettingsProvider : ServiceProviderBase
    {
        private string configPath { get => Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config"); }
        private string settingsPath { get => Path.Combine(configPath, "settings.json"); }
        private List<SettingsBase> Settings { get; set; } = new List<SettingsBase>();

        public SettingsProvider()
        {
            if (!Directory.Exists(this.configPath))
            {
                Directory.CreateDirectory(this.configPath);
            }
            if (!File.Exists(this.settingsPath))
            {
                initializeConfig();
            }
            this.Settings.AddRange(
                Assembly.GetEntryAssembly().GetTypes()
                    .Where(x => x.GetCustomAttributes<SettingsSectionAttribute>().Count() > 0)
                    .Select(x => Activator.CreateInstance(x) as SettingsBase));

        }
        private void initializeConfig()
        {
            var sections = new Dictionary<string, object>();
            Assembly.GetEntryAssembly().GetTypes().Where(x => x.GetCustomAttributes<SettingsSectionAttribute>().Count() > 0).ToList().ForEach(x =>
            {
                var attr = x.GetCustomAttribute<SettingsSectionAttribute>();
                var obj = Activator.CreateInstance(x);
                if (!sections.ContainsKey(attr.name))
                {
                    sections.Add(attr.name, obj);
                }
            });
            File.WriteAllText(this.settingsPath, JsonConvert.SerializeObject(sections, Formatting.Indented));
        }
        public T GetConfig<T>() where T : SettingsBase
        {
            return this.Settings.FirstOrDefault(x => x.GetType() == typeof(T)) as T;
        }
        public void UpdateConfig<T>(T settings) where T : SettingsBase
        {
            var itemIndex = this.Settings.FindIndex(x => x.GetType() == typeof(T));
            this.Settings[itemIndex] = settings;
        }
    }
    public abstract class SettingsBase { }
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
    public class SettingsSectionAttribute : Attribute
    {
        public SettingsSectionAttribute(string name, bool isEnabled)
        {
            this.name = name;
            this.isEnabled = isEnabled;
        }

        public string name { get; set; }
        public bool isEnabled { get; set; } = false;
    }
}
