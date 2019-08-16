using Biyori.Settings.Frames;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Biyori.Services.Sync
{
    [ServiceProviderParse("animeSync", PriotizeOrderNumber = 1, InitializeOnStartup = true)]
    public class SyncProviderService : ServiceProviderBase
    {
        private List<Thread> _threads = new List<Thread>();
        public string dataPath { get => Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "data"); }
        public string userPath { get => Path.Combine(this.dataPath, "user"); }
        public string profilePath { get => Path.Combine(this.userPath, App.ServiceProvider.GetProvider<Settings.SettingsProviderService>()?
            .GetConfig<AccountSettings>()?.CurrentAccount?.ProfileHash ?? "default"); }
        public string animeImagePath { get => Path.Combine(this.dataPath, "images"); }
        public string animeCoverPath { get => Path.Combine(this.dataPath, "covers"); }
        private string animeDbPath { get => Path.Combine(this.dataPath, "anime-db.json"); }
        public override void OnInitialize(ServiceProviderCollector provider)
        {
            base.OnInitialize(provider);
            new string[] { dataPath, userPath, profilePath, animeImagePath, animeCoverPath }
                .Where(x => !Directory.Exists(x))
                .ToList()
                .ForEach(x => Directory.CreateDirectory(x));
        }
    }
}
