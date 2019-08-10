﻿using Newtonsoft.Json;
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
        private AccountSettings accountSettings { get => this.settingsProvider.GetConfig<AccountSettings>(); }
        private List<AccountInfo> _accountInfo { get => this.settingsProvider.GetConfig<AccountSettings>()?.Accounts; }
        public List<AccountInfo> accountInfo { get; set; } = new List<AccountInfo>();
        [AlsoNotifyFor("selectedAccountShow")]
        public AccountInfo selectedAccount { get => this.accountSettings.CurrentAccount; set {
                var s = this.accountSettings;
                s.CurrentAccount = value;
                this.settingsProvider.UpdateConfig<AccountSettings>(s);
            } }
        public Visibility selectedAccountShow { get => this.selectedAccount != null ? Visibility.Visible : Visibility.Hidden; }
        public SettingsPage_Accounts()
        {
            InitializeComponent();
            this.accountInfo.Clear();
            this.accountInfo = _accountInfo;
        }

        private void AccountSelection_Click(object sender, RoutedEventArgs e)
        {
            Dispatcher.BeginInvoke((Action)(() =>
            {
                this.selectedAccount = (sender as Button)?.DataContext as AccountInfo;
            }));
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