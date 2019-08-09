using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.Settings
{
    public class SettingsProvider
    {
        private string configPath { get => Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config"); }
        private string settingsPath { get => Path.Combine(configPath, "settings.json"); }
        public SettingsProvider()
        {
            if (!Directory.Exists(this.configPath))
            {
                Directory.CreateDirectory(this.configPath);
                initializeConfig();
            }
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
    }
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
