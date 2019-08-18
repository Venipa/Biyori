using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using RestSharp;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.API.Kitsu
{

    public class Kitsu
    {
        public static readonly string AuthBaseURL = "https://kitsu.io/api";
        public static readonly string BaseURL = "https://kitsu.io/api/edge";
        private RestClient getClient(bool useUserAuthIfAvailable = true)
        {
            var client = new RestClient(BaseURL);
            client
                .AddDefaultHeader("Accept", "application/vnd.api+json")
                .AddDefaultHeader("Content-Type", "application/vnd.api+json");
            if (this.Token != null && useUserAuthIfAvailable)
            {
                client.AddDefaultHeader("Authorization", $"{this.Token.TokenType} {this.Token.AccessToken}");
            }
            return client;
        }
        private KitsuToken Token { get; set; }

        public Kitsu()
        {
        }
        /// <summary>
        /// -
        /// </summary>
        /// <param name="loginUser">Email or Username</param>
        /// <param name="Password">Password or API Key</param>
        /// <returns>bool, checks if expired</returns>
        public bool InitializeUserClient(string loginUser, string Password)
        {
            var client = this.getClient();
            client.BaseUrl = new Uri(AuthBaseURL);
            var rr = new RestRequest("oauth/token", Method.POST)
                .AddJsonBody(new
                {
                    grant_type = "password",
                    username = loginUser,
                    password = Password
                });
            var response = client.Execute<KitsuToken>(rr);
            this.Token = response?.Data;
            return this.isAuthenticated();
        }
        /// <summary>
        /// Works only if Initialize returned a valid Refresh Token
        /// </summary>
        public void ReInitializeUserClient()
        {
            throw new NotImplementedException();
            var client = this.getClient(false);
        }
        public async Task<KitsuPaginationModel<KitsuDataModel>> GetAnimeByBulkId(params int[] animeId)
        {
            if (animeId.Length == 0)
            {
                return null;
            }
            var rr = new RestRequest("anime", Method.GET)
                .AddQueryParameter("page[limit]", "20")
                .AddQueryParameter("filter[id]", string.Join(",", animeId.Distinct().Select(x => x.ToString())));
            var client = this.getClient();
            var response = client.Execute<KitsuPaginationModel<KitsuDataModel>>(rr);
            return response.Data;
        }
        public async Task<KitsuDataModel> GetAnimeById(int animeId)
        {
            var rr = new RestRequest("anime", Method.GET)
                .AddQueryParameter("page[limit]", "1")
                .AddQueryParameter("filter[id]", animeId.ToString());
            var client = this.getClient();
            var response = client.Execute<KitsuPaginationModel<KitsuDataModel>>(rr);
            return response.Data?.Data?.FirstOrDefault();
        }
        public async Task<KitsuPaginationModel<KitsuDataModel>> SearchByTitle(string searchQuery, int perPage = 10)
        {
            var rr = new RestRequest("anime", Method.GET)
                .AddQueryParameter("page[limit]", perPage.ToString())
                .AddQueryParameter("filter[text]", searchQuery);
            var client = this.getClient();
            var response = client.Execute<KitsuPaginationModel<KitsuDataModel>>(rr);
            return response.Data;
        }
        public const int LIBRARY_MAX_PAGESIZE = 500;
        public async Task<List<KitsuLibraryModel>> GetLibraryEntries(int userId, DateTime? sinceDate = null, int perPage = LIBRARY_MAX_PAGESIZE)
        {
            if (perPage < 0 || perPage > 500)
                throw new ArgumentException($"Argument must be inbetween 0 and {LIBRARY_MAX_PAGESIZE}", "perPage");
            var _entries = new List<KitsuLibraryModel>();
            var rr = new RestRequest("library-entries", Method.GET)
                .AddQueryParameter("page[limit]", perPage.ToString())
                .AddQueryParameter("filter[userId]", userId.ToString())
                .AddQueryParameter("filter[kind]", "anime")
                .AddQueryParameter("include", "anime");
            if (sinceDate != null)
            {
                rr.AddQueryParameter("filter[since]", sinceDate.Value.ToString());
            }
            var client = this.getClient();
            var response = client.Execute<KitsuPaginationModel<KitsuLibraryModel>>(rr);
            _entries.AddRange(response.Data.Data);
            if (response.IsSuccessful && response.Data != null &&
                response.Data?.Count > 0 && response.Data.Meta?.Count > 500 &&
                response.Data.Links?.NextPage != null)
            {
                var next = client.Execute<KitsuPaginationModel<KitsuLibraryModel>>(response.Data.NextPage()).Data;
                while(next.Data.Count > 0)
                {
                    _entries.AddRange(next.Data);
                    if (next?.Links?.NextPage != null)
                        next = client.Execute<KitsuPaginationModel<KitsuLibraryModel>>(next.NextPage()).Data;
                }
            }
            return _entries;
        }
        private bool isAuthenticated()
        {
            return this.Token != null && this.Token.CreatedAt.Add(this.Token.ExpiresIn) > DateTime.Now;
        }
        public async Task<KitsuUserModel> GetCurrentUser()
        {
            if (!this.isAuthenticated())
            {
                throw new NotAuthenticatedException("Not Authenticated");
            }
            var client = this.getClient();
            var rr = new RestRequest("users", Method.GET)
                .AddQueryParameter("filter[self]", "");
            var response = client.Execute<KitsuPaginationModel<KitsuUserModel>>(rr);
            return response?.Data?.Data.FirstOrDefault();
        }
    }
    public class KitsuToken
    {
        [JsonProperty("created_at")]
        public DateTime CreatedAt { get; set; }
        [JsonProperty("expires_in")]
        public TimeSpan ExpiresIn { get; set; }
        [JsonProperty("access_token")]
        public string AccessToken { get; set; }
        [JsonProperty("refresh_token")]
        public string RefreshToken { get; set; }
        [JsonProperty("token_type")]
        public string TokenType { get; set; }
    }
    public class NotAuthenticatedException : Exception
    {
        public NotAuthenticatedException(string message) : base(message)
        {
        }
    }
    public class InvalidAuthInformationException : Exception { }
}
