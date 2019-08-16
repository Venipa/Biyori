using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.API.Kitsu
{
    public class KitsuAttributeModel
    {
        [JsonProperty("canonicalTitle")]
        public string Title { get; set; }
        public string getTitle()
        {
            return this.Title ?? this.Titles?.FirstOrDefault(x => x.Key.StartsWith("en")).Value ?? this.Titles?.FirstOrDefault(x => x.Key.Contains("jp")).Value;
        }
        [JsonProperty("titles")]
        public Dictionary<string, string> Titles { get; set; } = new Dictionary<string, string>();
        [JsonProperty("slug")]
        public string Slug { get; set; }
        [JsonProperty("synopsis")]
        public string Synopsis { get; set; }
        [JsonProperty("userCount")]
        public int UserCount { get; set; }
        [JsonProperty("episodeCount")]
        public int EpisodeCount { get; set; }
        [JsonProperty("episodeLength")]
        public int EpisodeLength { get; set; }
        [JsonProperty("totalLength")]
        public int TotalLength { get; set; }
        [JsonProperty("favoritesCount")]
        public int FavoritesCount { get; set; }
        [JsonProperty("youtubeVideoId")]
        public string YoutubeVideoId { get; set; }
        [JsonProperty("nsfw")]
        public bool IsNsfw { get; set; } = false;
        [JsonProperty("averageRating")]
        public string AverageRating { get; set; }
        [JsonProperty("coverImage")]
        public KitsuImage CoverImage { get; set; }
        public string getLargestCoverThumb()
        {
            if (this.CoverImage == null)
                return null;

            return
                this.CoverImage?.Large ??
                this.CoverImage?.Medium ??
                this.CoverImage?.Original ??
                this.CoverImage?.Small;
        }
        [JsonProperty("posterImage")]
        public KitsuImage PosterImage { get; set; }
        public string getLargestPosterThumb()
        {
            if (this.PosterImage == null)
                return null;

            return
                this.PosterImage?.Large ??
                this.PosterImage?.Medium ??
                this.PosterImage?.Original ??
                this.PosterImage?.Small;
        }
        [JsonProperty("ratingFrequencies")]
        public Dictionary<string, string> RatingFrequencies { get; set; } = new Dictionary<string, string>();
        [JsonProperty("createdAt")]
        public DateTime CreatedAt { get; set; }
        [JsonProperty("updatedAt")]
        public DateTime UpdatedAt { get; set; }
        [JsonProperty("startDate")]
        public DateTime StartDate { get; set; }
        [JsonProperty("endDate")]
        public DateTime EndDate { get; set; }
    }

    public class KitsuImage
    {
        [JsonProperty("tiny")]
        public string Tiny { get; set; }
        [JsonProperty("small")]
        public string Small { get; set; }
        [JsonProperty("medium")]
        public string Medium { get; set; }
        [JsonProperty("large")]
        public string Large { get; set; }
        [JsonProperty("original")]
        public string Original { get; set; }
        [JsonProperty("meta")]
        public KitsuImageMeta Meta { get; set; }
    }

    public class KitsuImageMeta
    {
        [JsonProperty("dimensions")]
        public KitsuImageDimension Dimensions { get; set; }
    }

    public class KitsuImageDimension
    {
        [JsonProperty("tiny")]
        public KitsuImageAsset Tiny { get; set; }
        [JsonProperty("small")]
        public KitsuImageAsset Small { get; set; }
        [JsonProperty("medium")]
        public KitsuImageAsset Medium { get; set; }
        [JsonProperty("large")]
        public KitsuImageAsset Large { get; set; }
    }

    public class KitsuImageAsset
    {
        [JsonProperty("width")]
        public int Width { get; set; }
        [JsonProperty("height")]
        public int Height { get; set; }
    }
}
