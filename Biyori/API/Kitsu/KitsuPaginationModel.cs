﻿using Biyori.Lib.Util;
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
    public class KitsuPaginationModel<T> where T : KitsuDataBase
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
        public List<T> Data { get; set; } = new List<T>();
        [JsonProperty("links")]
        public KitsuLinkModel Links { get; set; }

        public RestRequest NextPage()
        {
            if (this.Links?.NextPage == null)
                return null;

            var rr = new RestRequest(new Uri(this.Links.NextPage, UriKind.Absolute), Method.GET);
            return rr;
        }
        public RestRequest PreviousPage()
        {
            if (this.Links?.PreviousPage == null)
                return null;

            var rr = new RestRequest(new Uri(this.Links.PreviousPage, UriKind.Absolute));
            return rr;
        }
        public RestRequest FirstPage()
        {
            if (this.Links?.FirstPage == null)
                return null;

            var rr = new RestRequest(new Uri(this.Links.FirstPage, UriKind.Absolute));
            return rr;
        }
        public RestRequest LastPage()
        {
            if (this.Links?.LastPage == null)
                return null;

            var rr = new RestRequest(new Uri(this.Links.LastPage, UriKind.Absolute));
            return rr;
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
    public class KitsuDataModel : KitsuDataBase
    {
        [JsonProperty("id", Required = Required.DisallowNull)]
        public int Id { get; set; }
        [JsonProperty("type")]
        public string Type { get; set; }
        [JsonProperty("Attributes")]
        public KitsuAttributeModel Attributes { get; set; }
    }
    public class KitsuDataBase { }
    
    public class KitsuMetaModel
    {
        [JsonProperty("count")]
        public int Count { get; set; } = 0;
        [JsonProperty("statusCounts")]
        public KitsuLibraryStatus StatusCounts { get; set; }
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
