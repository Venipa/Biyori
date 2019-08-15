using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using PropertyChanged;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.Settings
{
    [AddINotifyPropertyChangedInterface]
    [ServiceProviderParse("settings", InitializeOnStartup = true, PriotizeOrderNumber = 999)]
    public class SettingsProviderService : ServiceProviderBase
    {
        private string configPath { get => Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config"); }
        private string settingsPath { get => Path.Combine(configPath, "settings.json"); }
        private ConcurrentDictionary<string, SettingsBase> Settings { get; set; } = new ConcurrentDictionary<string, SettingsBase>();
        private bool initialConfig { get; set; } = false;
        private bool startConfig { get; set; } = true;
        public SettingsProviderService()
        {
            initialConfig = false;
            if (!Directory.Exists(this.configPath))
            {
                Directory.CreateDirectory(this.configPath);
            }
            if (!File.Exists(this.settingsPath))
            {
                initialConfig = true;
                initializeConfig();
            }
            Assembly.GetEntryAssembly().GetTypes()
                    .Where(x => x.GetCustomAttributes<SettingsSectionAttribute>().Count() > 0)
                    .Select(x => Activator.CreateInstance(x) as SettingsBase).ToList().ForEach(x =>
                    {
                        this.Settings.AddOrUpdate(
                            x.GetType().GetCustomAttribute<SettingsSectionAttribute>()?.name,
                            key => x,
                            (key, oldSettings) => oldSettings = x);
                    });

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
            return this.Settings.FirstOrDefault(x => x.Value.GetType() == typeof(T)).Value as T;
        }
        public void UpdateConfig<T>(T settings, bool saveToFile = false) where T : SettingsBase
        {
            var name = settings.GetType().GetCustomAttribute<SettingsSectionAttribute>()?.name;
            if (name == null)
            {
                throw new ArgumentNullException(name, "settings name is null");
            }
            this.Settings.AddOrUpdate(
                name,
                key => settings,
                (key, oldSettings) => oldSettings = settings);
            if (saveToFile)
            {
                this.SaveSettings();
            }
        }
        public async Task LoadSettings()
        {
            var settingsIn = File.ReadAllText(this.settingsPath);
            var settings = JsonConvert.DeserializeObject<Dictionary<string, object>>(settingsIn);

            var availableSettings = Assembly.GetEntryAssembly().GetTypes()
                    .Where(x => x.GetCustomAttributes<SettingsSectionAttribute>().Count() > 0);
            settings.ToList().ForEach(x =>
            {
                if (this.Settings.ContainsKey(x.Key))
                {
                    var avSetting = availableSettings.FirstOrDefault(y => y.GetCustomAttribute<SettingsSectionAttribute>()?.name == x.Key);
                    if (avSetting != null)
                    {
                        var obj = (x.Value as JObject).ToObject(avSetting);
                        if (obj != null)
                        {
                            if (startConfig)
                            {
                                obj.GetType().GetMethod("OnInitConfig")?.Invoke(obj, new object[] { this });
                            }
                            obj.GetType().GetMethod("OnLoadConfig")?.Invoke(obj, new object[] { this });
                        }
                        this.Settings.AddOrUpdate(x.Key, key => obj as SettingsBase, (key, oldSetting) => oldSetting = obj as SettingsBase);
                    }
                }
            });
        }
        public async Task SaveSettings()
        {
            try
            {
                File.WriteAllText(this.settingsPath, JsonConvert.SerializeObject(this.Settings, Formatting.Indented));
            }
            catch (Exception ex)
            {
                if (!(ex is FileNotFoundException || ex is DirectoryNotFoundException))
                {
                    throw ex;
                }
            }
        }
        public override void OnInitialize(ServiceProviderCollector provider)
        {
            base.OnInitialize(provider);

            if (!initialConfig)
            {
                this.LoadSettings().Wait();
            }
            startConfig = false;
        }
    }
    public abstract class SettingsBase
    {
        public virtual void OnLoadConfig(SettingsProviderService provider) { }
        public virtual void OnInitConfig(SettingsProviderService provider) { }
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
