using Biyori.API.Kitsu;
using Biyori.Core.Util;
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
using System.Web;
using System.Windows;

namespace Biyori.Services.Anime
{
    [ServiceProviderParse("animeStore", InitializeOnStartup = true)]
    public class AnimeService : ServiceProviderBase
    {
        public ConcurrentDictionary<int, KitsuLibraryModel> AnimeLibrary { get; private set; }
        public ConcurrentDictionary<int, KitsuDataModel> AnimeItems { get; private set; }
        public ConcurrentDictionary<int, string> AnimeCovers { get; private set; }
        public ConcurrentDictionary<int, string> AnimePosters { get; private set; }
        public SyncProviderService SyncProvider { get => App.ServiceProvider.GetProvider<SyncProviderService>(); }
        public Kitsu Client { get; private set; }
        public AnimeService()
        {
            this.Client = new Kitsu();
            this.AnimeItems = new ConcurrentDictionary<int, KitsuDataModel>();
            this.AnimeLibrary = new ConcurrentDictionary<int, KitsuLibraryModel>();
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
                }
                catch (JsonReaderException) { }
            }
            if (File.Exists(this.SyncProvider.libraryDbPath))
            {
                try
                {
                    Debug.WriteLine("Loading Cached Anime Items...");
                    this.AnimeLibrary = File.ReadAllText(this.SyncProvider.libraryDbPath)
                        .DeserializeObject(this.AnimeLibrary.GetType()) as ConcurrentDictionary<int, KitsuLibraryModel>;
                    Debug.WriteLine($"Loaded {this.AnimeLibrary.Count} Library Items");
                }
                catch (JsonReaderException) { }
            }
            var accountConfig = App.ServiceProvider.GetProvider<SettingsProviderService>()?.GetConfig<AccountSettings>();
            if (this.Client.InitializeUserClient(accountConfig.CurrentAccount.Username, accountConfig.CurrentAccount.Password))
            {
                accountConfig.CurrentAccount.User = this.Client.GetCurrentUser().Result;
            }
            else
            {
                throw new Exception("Could not Login, Wrong User/Password?");
            }
            if (accountConfig?.LastSyncAt == null || (DateTime.Now - accountConfig?.LastSyncAt).Value.TotalHours > 12)
            {
                DateTime? checkSince = null;
                if (File.Exists(SyncProvider.libraryDbPath))
                {
                    checkSince = DateTime.Now.AddDays(-1);
                }

                Debug.WriteLine("Downloading Library Entries...");
                var entries = this.Client.GetLibraryEntries(accountConfig.CurrentAccount.User.Id, checkSince).Result;
                Debug.WriteLine("Adding/Updating Library Entries...");
                entries.Where(x => x.AnimeId != null).ToList()?.ForEach(x =>
                {
                    this.AnimeLibrary.AddOrUpdate(x.Id, (animeId) => x, (animeId, oldAnimeitem) => oldAnimeitem = x);
                });
                Debug.WriteLine($"Added {this.AnimeLibrary.Count} Library Entries");
                // TODO
            }
            var missingAnimeItems = this.AnimeLibrary.Where(x => !this.AnimeItems.ContainsKey((int)x.Value.AnimeId)).Select(x => (int)x.Value.AnimeId).ToList();
            if (missingAnimeItems.Count() > 0)
            {
                missingAnimeItems.ChunckBy(Kitsu.FETCH_BULK_ANIME_MAX).Select(x => this.Client.GetAnimeByBulkId(x.ToArray()).Result?.Data).ToList().SelectMany(item => item).ToList().ForEach(x =>
                {
                    this.AnimeItems.AddOrUpdate(x.Id, x, (id, anime) => anime = x);
                });
                this.saveAnimeItems();
            }
        }

        private void Current_Exit(object sender, ExitEventArgs e) => this.onExit();
        public void onExit()
        {
            // Save Items to JSON
            Task.WaitAll(
                Task.Run((Action)(() =>
                {
                    this.saveLibraryItems();
                })),
                Task.Run((Action)(() =>
                {
                    this.saveAnimeItems();
                })));

            this.AnimeItems = null;
            this.AnimeLibrary = null;
            this.AnimePosters = null;
            this.AnimeCovers = null;
        }
        private void saveLibraryItems()
        {
            File.WriteAllText(this.SyncProvider.libraryDbPath, this.AnimeLibrary.SerializeObject(Formatting.Indented));
        }
        private void saveAnimeItems()
        {
            File.WriteAllText(this.SyncProvider.animeDbPath, this.AnimeItems.SerializeObject(Formatting.Indented));
        }
        public string getAnimePoster(int id)
        {
            return this.AnimePosters.FirstOrDefault(x => x.Key == id).Value;
        }
        public Task<string> downloadAnimePoster(int id)
        {
            return Task.Run(() =>
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
                    try
                    {
                        wc.DownloadFile(imageUrl, filePath);
                    }
                    catch (WebException wex)
                    {
                        if (new HttpStatusCode[] { HttpStatusCode.NotFound, HttpStatusCode.Forbidden, HttpStatusCode.BadRequest, HttpStatusCode.BadGateway }.Contains(((HttpWebResponse)wex.Response).StatusCode))
                        {
                            return null;
                        }
                    }
                    return filePath;
                });
            });
        }
        private Stream returnStream(Stream stream)
        {
            stream.Position = 0;
            return stream;
        }
        public string getAnimeCover(int id)
        {
            return this.AnimeCovers.FirstOrDefault(x => x.Key == id).Value;
        }
        public Task<string> downloadAnimeCover(int id)
        {
            return Task.Run(async () =>
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
                    try
                    {
                        wc.DownloadFile(imageUrl, filePath);
                    }
                    catch (WebException wex)
                    {
                        if (new HttpStatusCode[] { HttpStatusCode.NotFound, HttpStatusCode.Forbidden, HttpStatusCode.BadRequest, HttpStatusCode.BadGateway }.Contains(((HttpWebResponse)wex.Response).StatusCode))
                        {
                            return null;
                        }
                    }
                    return filePath;
                });
            });
        }
        public KitsuDataModel getAnime(int id)
        {
            var anime = this.AnimeItems.GetOrAdd(id, (animeId) =>
            {
                var data = this.Client.GetAnimeById(animeId).Result;
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
