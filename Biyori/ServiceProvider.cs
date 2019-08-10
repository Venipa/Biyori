using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Biyori
{
    public class ServiceProviderCollector
    {
        private List<ServiceProviderBase> serviceProviders { get; set; }
        public ServiceProviderCollector()
        {
            this.serviceProviders = new List<ServiceProviderBase>();
        }

        public T GetProvider<T>() where T : ServiceProviderBase
        {
            return GetProvider(typeof(T)) as T;
        }

        private object GetProvider(Type type)
        {
            return serviceProviders.Where(x => x.GetType() == type).FirstOrDefault();
        }
        public void Add<T>(T serviceProvider) where T : ServiceProviderBase
        {
            this.serviceProviders.Add(serviceProvider);
        }
        public void Remove<T>(T serviceProvider) where T : ServiceProviderBase
        {
            this.serviceProviders.RemoveAll(x => x.GetType() == serviceProvider.GetType());
        }
        public void AddOrUpdateRange<T>(IEnumerable<T> serviceProviders) where T : ServiceProviderBase
        {
            foreach(var sp in serviceProviders)
            {
                this.AddOrUpdate(sp);
            }
        }
        public void AddOrUpdate<T>(T serviceProvider) where T : ServiceProviderBase
        {
            if (this.serviceProviders.Where(x => x.GetType() == serviceProvider.GetType()).Count() == 0)
            {
                this.serviceProviders.Add(serviceProvider);
            } else
            {
                this.serviceProviders.Remove(serviceProvider);
                this.AddOrUpdate(serviceProvider);
            }
        }
        public void ScanCurrent() => ScanAssembly(Assembly.GetEntryAssembly());
        public void ScanAssembly(Assembly assembly)
        {
            var providers = assembly.GetTypes().Where(x => x.GetCustomAttributes<ServiceProviderParseAttribute>().Count() > 0);
            var provderInstances = providers.Select(x =>
            {
                var attr = x.GetCustomAttribute<ServiceProviderParseAttribute>();
                var instance = Activator.CreateInstance(x);
                if (attr.InitializeOnStartup)
                {
                    instance.GetType().GetMethod("OnInitialize")?.Invoke(instance, new object[] { });
                }
                return instance as ServiceProviderBase;
            });
            this.AddOrUpdateRange(provderInstances);
        }
    }
    public abstract class ServiceProviderBase
    {
        private void OnInitialize()
        {
        }
    }
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
    public class ServiceProviderParseAttribute : Attribute
    {
        public ServiceProviderParseAttribute(string name)
        {
            Name = name;
        }

        public string Name { get; set; }
        public bool InitializeOnStartup { get; set; } = false;
    }
}
