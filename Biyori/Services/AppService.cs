using Biyori.Core.Util;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Biyori.Services
{
    [ServiceProviderParse("appService", InitializeOnStartup = true)]
    public class AppService : ServiceProviderBase
    {
        public PropertyQueueBase<string> LoadingStatus { get; private set; } = new PropertyQueueBase<string>("Loading...");
        public AppService()
        {
        }
        public override void OnInitialize(ServiceProviderCollector provider)
        {
            base.OnInitialize(provider);

        }
    }
}
