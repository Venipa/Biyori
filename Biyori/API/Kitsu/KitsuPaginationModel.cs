using Newtonsoft.Json;
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
        [JsonProperty("data")]
        public IEnumerable<T> Data { get; set; } = new List<T>();
        [JsonProperty("links")]
        public KitsuLinkModel Links { get; set; }
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
