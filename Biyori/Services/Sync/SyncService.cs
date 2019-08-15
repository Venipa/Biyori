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
    [ServiceProviderParse("animeSync", InitializeOnStartup = true)]
    public class SyncProviderService : ServiceProviderBase
    {
        private List<Thread> _threads = new List<Thread>();
        private string dataPath { get => Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "data"); }
        private string userPath { get => Path.Combine(this.dataPath, "user"); }
        private string profilePath { get => Path.Combine(this.userPath, App.ServiceProvider.GetProvider<Settings.SettingsProviderService>()?
            .GetConfig<AccountSettings>()?.CurrentAccount?.ProfileHash ?? "default"); }
        private string animeImagePath { get => Path.Combine(this.dataPath, "images"); }
        private string animeCoverPath { get => Path.Combine(this.dataPath, "covers"); }
        private string animeDbPath { get => Path.Combine(this.dataPath, "anime.db"); }
        public override void OnInitialize(ServiceProviderCollector provider)
        {
            base.OnInitialize(provider);
            Debug.WriteLine(this.profilePath);
        }
    }
}
