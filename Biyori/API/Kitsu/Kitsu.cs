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
        private const string BaseURL = "https://kitsu.io/api/edge";
        private RestClient getClient()
        {
            var client = new RestClient(BaseURL);
            client
                .AddDefaultHeader("Accept", "application/vnd.api+json")
                .AddDefaultHeader("Content-Type", "application/vnd.api+json");
            return client;
        }

        public Kitsu()
        {

        }
        /// <summary>
        /// -
        /// </summary>
        /// <param name="loginUser">Email or Username</param>
        /// <param name="Password">Password or API Key</param>
        public void InitializeUserClient(string loginUser, string Password)
        {

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
            var response = await client.ExecuteTaskAsync<KitsuPaginationModel<KitsuDataModel>>(rr);
            return response.Data;
        }
        public async Task<KitsuDataModel> GetAnimeById(int animeId)
        {
            var rr = new RestRequest("anime", Method.GET)
                .AddQueryParameter("page[limit]", "1")
                .AddQueryParameter("filter[id]", animeId.ToString());
            var client = this.getClient();
            var response = await client.ExecuteTaskAsync<KitsuPaginationModel<KitsuDataModel>>(rr);
            return response.Data?.Data?.FirstOrDefault();
        }
        public async Task<KitsuPaginationModel<KitsuDataModel>> SearchByTitle(string searchQuery, int perPage = 10)
        {
            var rr = new RestRequest("anime", Method.GET)
                .AddQueryParameter("page[limit]", perPage.ToString())
                .AddQueryParameter("filter[text]", searchQuery);
            var client = this.getClient();
            var response = await client.ExecuteTaskAsync<KitsuPaginationModel<KitsuDataModel>>(rr);
            return response.Data;
        }
    }
}
