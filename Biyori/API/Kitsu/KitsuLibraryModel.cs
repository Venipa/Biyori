using Biyori.Core.Util;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.API.Kitsu
{
    public class KitsuLibraryModel : KitsuDataBase
    {
        [JsonProperty("id")]
        public int Id { get; set; }
        [JsonProperty("included")]
        public List<KitsuDataModel> Anime { get; set; }
        [JsonProperty("type")]
        public string Type { get; set; }
        [JsonProperty("attributes")]
        public KitsuLibraryAttributeModel Attributes { get; set; }
        [JsonProperty("relationships")]
        public Dictionary<string, Dictionary<string, KitsuRelationDataRef>> Relationships { get; set; } = new Dictionary<string, Dictionary<string, KitsuRelationDataRef>>();
        [JsonProperty("animeId", NullValueHandling = NullValueHandling.Ignore)]
        public int? AnimeId { get => Relationships.FirstOrDefault(x => x.Key == "anime").Value?.FirstOrDefault(x => x.Key == "data").Value?.Id; }
    }
    public class KitsuRelationData
    {
        [JsonProperty("data")]
        public KitsuRelationDataRef Raw { get; set; }
    }
    public class KitsuRelationDataRef
    {
        [JsonProperty("type")]
        public string Type { get; set; }
        [JsonProperty("id")]
        public int Id { get; set; }
    }
    public class KitsuLibraryAttributeModel
    {
        [JsonProperty("rating")]
        public string Rating { get; set; }
        [JsonProperty("ratingTwenty")]
        public int ExtendedRating { get; set; }
        [JsonProperty("status")]
        public string Status { get; set; }
        [JsonProperty("reconsuming")]
        public bool Reconsuming { get; set; }
        [JsonProperty("reconsumeCount")]
        public bool ReconsumeCount { get; set; }
        [JsonProperty("progress")]
        public int Progress { get; set; }
        [JsonProperty("notes")]
        public string Notes { get; set; }
        [JsonProperty("volumesOwned")]
        public int VolumesOwned { get; set; }
        [JsonProperty("reactionSkipped")]
        public string ReactionSkipped { get; set; }
        [JsonProperty("startedAt")]
        public DateTime StartedAt { get; set; }
        [JsonProperty("finishedAt")]
        public DateTime FinishedAt { get; set; }
        [JsonProperty("progressedAt")]
        public DateTime ProgressedAt { get; set; }
        [JsonProperty("createdAt")]
        public DateTime CreatedAt { get; set; }
        [JsonProperty("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }
}
