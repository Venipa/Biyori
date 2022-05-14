using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.Core.Languages
{
    public class ApplicationLanguage
    {
        [JsonIgnore]
        public bool HasImage { get => ImageUrl != null; }
        [JsonIgnore]
        public string ImageUrl { get; set; }
        [JsonIgnore]
        public Uri ImageUri { get => ImageUrl != null ? new Uri(ImageUrl) : null; }
        [JsonIgnore]
        public string DisplayName { get; set; }
        [JsonProperty("lang_key")]
        public string Name { get; set; }
    }
}
