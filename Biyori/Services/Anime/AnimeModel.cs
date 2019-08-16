using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.Services.Anime
{
    public class AnimeModel
    {
        [JsonProperty("Id")]
        public string Id { get; set; }
    }
}
