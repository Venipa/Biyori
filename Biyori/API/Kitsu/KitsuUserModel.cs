
using System;
using System.Collections.Generic;
using System.Globalization;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Biyori.API.Kitsu
{
    public class KitsuUserModel : KitsuDataBase
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("attributes")]
        public KitsuUserAttributes Attributes { get; set; }
    }

    public class KitsuUserAttributes
    {
        [JsonProperty("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonProperty("updatedAt")]
        public DateTime UpdatedAt { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("pastNames")]
        public List<object> PastNames { get; set; }

        [JsonProperty("slug")]
        public string Slug { get; set; }

        [JsonProperty("about")]
        public string About { get; set; }

        [JsonProperty("location")]
        public object Location { get; set; }

        [JsonProperty("waifuOrHusbando")]
        public object WaifuOrHusbando { get; set; }

        [JsonProperty("followersCount")]
        public int FollowersCount { get; set; }

        [JsonProperty("followingCount")]
        public int FollowingCount { get; set; }

        [JsonProperty("lifeSpentOnAnime")]
        public int LifeSpentOnAnime { get; set; }

        [JsonProperty("birthday")]
        public object Birthday { get; set; }

        [JsonProperty("gender")]
        public object Gender { get; set; }

        [JsonProperty("commentsCount")]
        public int CommentsCount { get; set; }

        [JsonProperty("favoritesCount")]
        public int FavoritesCount { get; set; }

        [JsonProperty("likesGivenCount")]
        public int LikesGivenCount { get; set; }

        [JsonProperty("reviewsCount")]
        public int ReviewsCount { get; set; }

        [JsonProperty("likesReceivedCount")]
        public int LikesReceivedCount { get; set; }

        [JsonProperty("postsCount")]
        public int PostsCount { get; set; }

        [JsonProperty("ratingsCount")]
        public int RatingsCount { get; set; }

        [JsonProperty("mediaReactionsCount")]
        public int MediaReactionsCount { get; set; }

        [JsonProperty("proExpiresAt")]
        public object ProExpiresAt { get; set; }

        [JsonProperty("title")]
        public object Title { get; set; }

        [JsonProperty("profileCompleted")]
        public bool ProfileCompleted { get; set; }

        [JsonProperty("feedCompleted")]
        public bool FeedCompleted { get; set; }

        [JsonProperty("website")]
        public Uri Website { get; set; }

        [JsonProperty("proTier")]
        public object ProTier { get; set; }

        [JsonProperty("avatar")]
        public KitsuImage AvatarImage { get; set; }

        [JsonProperty("coverImage")]
        public KitsuImage CoverImage { get; set; }

        [JsonProperty("email")]
        public string Email { get; set; }

        [JsonProperty("password")]
        public string Password { get; set; }

        [JsonProperty("confirmed")]
        public bool Confirmed { get; set; }

        [JsonProperty("previousEmail")]
        public string PreviousEmail { get; set; }

        [JsonProperty("language")]
        public string Language { get; set; }

        [JsonProperty("timeZone")]
        public string TimeZone { get; set; }

        [JsonProperty("country")]
        public string Country { get; set; }

        [JsonProperty("shareToGlobal")]
        public bool ShareToGlobal { get; set; }

        [JsonProperty("titleLanguagePreference")]
        public string TitleLanguagePreference { get; set; }

        [JsonProperty("sfwFilter")]
        public bool SfwFilter { get; set; }

        [JsonProperty("ratingSystem")]
        public string RatingSystem { get; set; }

        [JsonProperty("theme")]
        public string Theme { get; set; }

        [JsonProperty("facebookId")]
        public object FacebookId { get; set; }

        [JsonProperty("hasPassword")]
        public bool HasPassword { get; set; }

        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("subscribedToNewsletter")]
        public bool SubscribedToNewsletter { get; set; }

        [JsonProperty("aoPro")]
        public object AoPro { get; set; }
    }
}