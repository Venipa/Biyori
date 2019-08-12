using Biyori.Lib.Util;
using Newtonsoft.Json;
using RestSharp;
using RestSharp.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.API.Kitsu
{
    public class KitsuPaginationModel<T> where T : KitsuDataModel
    {
        [JsonProperty("meta")]
        public KitsuMetaModel Meta { get; set; }
        [JsonIgnore]
        public int Count { get => this.Meta?.Count ?? 0; }
        [JsonIgnore]
        private int Limit { get => (new RestRequest(this.Links.NextPage.UrlDecode()).Parameters.FirstOrDefault(x => x.Name == "page[limit]")?.Value.ToType<int>() ?? 0); }
        [JsonIgnore]
        private int Offset { get => (new RestRequest(this.Links.NextPage.UrlDecode()).Parameters.FirstOrDefault(x => x.Name == "page[offset]")?.Value.ToType<int>() ?? 0); }
        [JsonIgnore]
        public int Pages { get => Links != null ? Count / Limit : 0; }
        [JsonIgnore]
        public int CurrentPage { get => Pages == 0 ? 1 : Offset / Limit; }
        [JsonProperty("data")]
        public IEnumerable<T> Data { get; set; } = new List<T>();
        [JsonProperty("links")]
        public KitsuLinkModel Links { get; set; }

        public async Task<KitsuPaginationModel<T>> NextPage()
        {
            if (this.Links?.NextPage == null)
                return null;

            var client = this.getClient();
            var rr = new RestRequest(new Uri(this.Links.NextPage, UriKind.Absolute));
            return (await client.ExecuteTaskAsync<KitsuPaginationModel<T>>(rr))?.Data;
        }
        public async Task<KitsuPaginationModel<T>> PreviousPage()
        {
            if (this.Links?.PreviousPage == null)
                return null;

            var client = this.getClient();
            var rr = new RestRequest(new Uri(this.Links.PreviousPage, UriKind.Absolute));
            return (await client.ExecuteTaskAsync<KitsuPaginationModel<T>>(rr))?.Data;
        }
        public async Task<KitsuPaginationModel<T>> FirstPage()
        {
            if (this.Links?.FirstPage == null)
                return null;

            var client = this.getClient();
            var rr = new RestRequest(new Uri(this.Links.FirstPage, UriKind.Absolute));
            return (await client.ExecuteTaskAsync<KitsuPaginationModel<T>>(rr))?.Data;
        }
        public async Task<KitsuPaginationModel<T>> LastPage()
        {
            if (this.Links?.LastPage == null)
                return null;

            var client = this.getClient();
            var rr = new RestRequest(new Uri(this.Links.LastPage, UriKind.Absolute));
            return (await client.ExecuteTaskAsync<KitsuPaginationModel<T>>(rr))?.Data;
        }
        private RestClient getClient()
        {
            var client = new RestClient(Kitsu.BaseURL);
            client
                .AddDefaultHeader("Accept", "application/vnd.api+json")
                .AddDefaultHeader("Content-Type", "application/vnd.api+json");
            return client;
        }
    }
    public class KitsuDataModel { }
    public class KitsuMetaModel
    {
        [JsonProperty("count")]
        public int Count { get; set; } = 0;
    }
    public class KitsuLinkModel
    {
        [JsonProperty("first")]
        public string FirstPage { get; set; }
        [JsonProperty("previous")]
        public string PreviousPage { get; set; }
        [JsonProperty("next")]
        public string NextPage { get; set; }
        [JsonProperty("last")]
        public string LastPage { get; set; }
    }
}
