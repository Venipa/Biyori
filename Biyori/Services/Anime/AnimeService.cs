using Biyori.API.Kitsu;
using Biyori.Lib.Util;
using Biyori.Services.Sync;
using Biyori.Settings;
using Biyori.Settings.Frames;
using Newtonsoft.Json;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;

namespace Biyori.Services.Anime
{
    [ServiceProviderParse("animeStore", InitializeOnStartup = true)]
    public class AnimeService : ServiceProviderBase
    {
        public ConcurrentDictionary<int, KitsuDataModel> AnimeItems { get; private set; }
        public ConcurrentDictionary<int, string> AnimeCovers { get; private set; }
        public ConcurrentDictionary<int, string> AnimePosters { get; private set; }
        public SyncProviderService SyncProvider { get => App.ServiceProvider.GetProvider<SyncProviderService>(); }
        public AnimeService()
        {
            this.AnimeItems = new ConcurrentDictionary<int, KitsuDataModel>();
            this.AnimeCovers = new ConcurrentDictionary<int, string>();
            this.AnimePosters = new ConcurrentDictionary<int, string>();
        }
        public override void OnInitialize(ServiceProviderCollector provider)
        {
            base.OnInitialize(provider);
            if (File.Exists(this.SyncProvider.animeDbPath))
            {
                try
                {
                    Debug.WriteLine("Loading Cached Anime Items...");
                    this.AnimeItems = File.ReadAllText(this.SyncProvider.animeDbPath)
                        .DeserializeObject(this.AnimeItems.GetType()) as ConcurrentDictionary<int, KitsuDataModel>;
                    Debug.WriteLine($"Loaded {this.AnimeItems.Count} Anime Items");
                } catch(JsonReaderException) { }
            }
            var accountConfig = App.ServiceProvider.GetProvider<SettingsProviderService>()?.GetConfig<AccountSettings>();
            if (accountConfig?.LastSyncAt == null || (DateTime.Now - accountConfig?.LastSyncAt).Value.TotalHours > 12)
            {
                Debug.WriteLine("Downloading Library Entries...");
                // TODO
            }
            Application.Current.Exit += Current_Exit;
        }

        private void Current_Exit(object sender, ExitEventArgs e)
        {
            // Save Items to JSON
            File.WriteAllText(this.SyncProvider.animeDbPath, this.AnimeItems.SerializeObject(Formatting.Indented));

            this.AnimeItems = null;
            this.AnimePosters = null;
            this.AnimeCovers = null;
        }
        public string getAnimePoster(int id)
        {
            return this.AnimePosters.GetOrAdd(id, (animeId) =>
            {
                var anime = this.getAnime(animeId);
                var filePath = Path.Combine(SyncProvider.animeImagePath, anime.Id.ToString());
                var imageUrl = anime.Attributes.getLargestPosterThumb();
                if (imageUrl == null)
                {
                    return null;
                }
                if (File.Exists(filePath))
                {
                    return filePath;
                }
                var wc = new WebClient();
                wc.DownloadFile(imageUrl, filePath);
                return filePath;
            });
        }
        private Stream returnStream(Stream stream)
        {
            stream.Position = 0;
            return stream;
        }
        public string getAnimeCover(int id)
        {
            return this.AnimeCovers.GetOrAdd(id, (animeId) =>
            {
                var anime = this.getAnime(animeId);
                var filePath = Path.Combine(SyncProvider.animeCoverPath, anime.Id.ToString());
                var imageUrl = anime.Attributes.getLargestCoverThumb();
                if (imageUrl == null)
                {
                    return null;
                }
                if (File.Exists(filePath))
                {
                    return filePath;
                }
                var wc = new WebClient();
                wc.DownloadFile(imageUrl, filePath);
                return filePath;
            });
        }
        public KitsuDataModel getAnime(int id)
        {
            var anime = this.AnimeItems.GetOrAdd(id, (animeId) =>
            {
                var client = new Kitsu();
                var data = client.GetAnimeById(animeId).Result;
                if (data?.Attributes?.Synopsis != null)
                {
                    var replc = new Regex(@"$\n$\n");
                    data.Attributes.Synopsis = replc.Replace(data.Attributes.Synopsis, "\n");
                }
                return data;
            });
            return anime;
        }
    }
}
