using Biyori.API.Kitsu;
using Biyori.Lib.Util;
using Biyori.Services.Anime;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
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
using System.Windows.Shapes;

namespace Biyori.Components.AnimeDialog
{
    /// <summary>
    /// Interaction logic for AnimeInfoWindow.xaml
    /// </summary>
    public partial class AnimeInfoWindow : Window, INotifyPropertyChanged
    {
        public string posterImage { get => this.Anime != null ? this.AnimeProvider?.getAnimePoster(this.Anime.Id) : null; }
        public string coverImage { get => this.Anime != null ? this.AnimeProvider?.getAnimeCover(this.Anime.Id) : null; }
        public string AnimeTitle { get => this.Anime?.Attributes?.getTitle() ?? "No Title defined"; }
        public Visibility HasVideo { get => this.Anime?.Attributes?.YoutubeVideoId != null ? Visibility.Visible : Visibility.Collapsed; }

        public KitsuDataModel Anime { get; private set; }
        public int animeId { get; private set; }
        public AnimeService AnimeProvider { get; private set; }
        public AnimeInfoWindow(int animeId)
        {
            this.animeId = animeId;
            this.AnimeProvider = App.ServiceProvider.GetProvider<AnimeService>();

            this.Anime = this.AnimeProvider.getAnime(animeId);
            if (this.Anime == null)
            {
                this.Close();
                return;
            }
            InitializeComponent();
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected override void OnInitialized(EventArgs e)
        {
            base.OnInitialized(e);
        }

        private void YoutubeButton_Click(object sender, RoutedEventArgs e)
        {
            if (this.Anime?.Attributes?.YoutubeVideoId != null)
            {
                Process.Start($"https://youtu.be/{this.Anime.Attributes.YoutubeVideoId}");
            }
        }
    }
}
