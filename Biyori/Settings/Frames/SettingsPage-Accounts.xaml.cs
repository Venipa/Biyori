using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using PropertyChanged;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace Biyori.Settings.Frames
{
    [AddINotifyPropertyChangedInterface]
    [SettingsRoute("accounts", "Accounts")]
    /// <summary>
    /// Interaction logic for SettingsPage_Accounts.xaml
    /// </summary>
    public partial class SettingsPage_Accounts : Page
    {
        private SettingsProvider settingsProvider { get => App.ServiceProvider.GetProvider<SettingsProvider>(); }
        private List<AccountInfo> _accountInfo { get => this.settingsProvider.GetConfig<AccountSettings>()?.Accounts; }
        public List<AccountInfo> accountInfo { get; set; } = new List<AccountInfo>();
        public SettingsPage_Accounts()
        {
            InitializeComponent();
            this.accountInfo.Clear();
            this.accountInfo = _accountInfo;
        }
    }
    [SettingsSection("account", true)]
    public class AccountSettings : SettingsBase
    {
        [JsonProperty("enable_sync")]
        public bool SyncEnabled { get; set; } = false;
        [JsonProperty("accounts")]
        public List<AccountInfo> Accounts { get; set; } = new List<AccountInfo>();
        [JsonProperty("current_account")]
        public AccountInfo CurrentAccount { get; set; }
    }
    public class AccountInfo
    {
        [JsonProperty("email")]
        public string EmailAddress { get; set; }
        [JsonProperty("username")]
        public string Username { get; set; }
        [JsonProperty("password")]
        public string Password { get; set; }
        [JsonProperty("account_type"), JsonConverter(typeof(StringEnumConverter))]
        public AccountEndpoints Type { get; set; } = AccountEndpoints.Kitsu;
        [JsonIgnore]
        public string TypeString { get => this.Type.ToString(); }
    }
    public enum AccountEndpoints
    {
        Kitsu,
        Anilist
    }
}
