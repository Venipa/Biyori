using Newtonsoft.Json;
using System;
using System.Collections.Generic;
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
    [SettingsRoute("accounts", "Accounts", false)]
    /// <summary>
    /// Interaction logic for SettingsPage_Accounts.xaml
    /// </summary>
    public partial class SettingsPage_Accounts : Page
    {
        public SettingsPage_Accounts()
        {
            InitializeComponent();
        }
    }
    [SettingsSection("account", true)]
    public class AccountSettings
    {
        [JsonProperty("enable_sync")]
        public bool SyncEnabled { get; set; }
        [JsonProperty("accounts")]
        public List<AccountInfo> Accounts { get; set; }
        [JsonProperty("current_account_type")]
        public AccountEndpoints CurrentAccountType { get; set; }
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
    }
    public enum AccountEndpoints
    {
        Kitsu,
        Anilist
    }
}
