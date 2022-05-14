using Biyori.API.Kitsu;
using Biyori.Components.AnimeDialog;
using Biyori.Core.Util;
using Biyori.Services.Anime;
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

namespace Biyori.Components.AnimeList
{
    /// <summary>
    /// Interaction logic for AnimeList.xaml
    /// </summary>
    public partial class AnimeList : UserControl, INotifyPropertyChanged
    {
        public AnimeService AnimeService { get; set; }
        public AnimeList()
        {
            this.AnimeService = App.ServiceProvider.GetProvider<AnimeService>();
            InitializeComponent();
            this.Loaded += (s, e) =>
            {

                this.AnimeLibrary = AnimeLibrarySource.Select(x =>
                {
                    var anime = this.AnimeService.getAnime((int)x.AnimeId);
                    var lib = new LibraryDisplayDataModel(x)
                    {
                        Progress = x.Attributes.Progress,
                        LastChangedAt = x.Attributes.ProgressedAt,
                        Title = anime.Attributes.getTitle(),
                        Rating = anime.Attributes.AverageRating
                    };
                    return lib;
                }).ToList();
            };
        }
        public List<LibraryDisplayDataModel> AnimeLibrary { get; set; } = new List<LibraryDisplayDataModel>();
        public LibraryDisplayDataModel SelectedAnimeItem { get; set; }
        public List<KitsuLibraryModel> AnimeLibrarySource { get => this.AnimeService?.AnimeLibrary?.Values.ToList(); }

        public event PropertyChangedEventHandler PropertyChanged;
        public void InvokePropertyChanged(string propName) => this.PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propName));

        private void itemOpenInfoDialog(object sender, RoutedEventArgs e)
        {
            if (e.Handled)
                return;
            if (this.SelectedAnimeItem?.Id == null)
                return;
            Dispatcher.BeginInvoke((Action)(async () =>
            {
                new AnimeInfoWindow(this.SelectedAnimeItem.Id) { Owner = MyVisualTreeHelper.FindParent<Window>(this), WindowStartupLocation = WindowStartupLocation.CenterOwner }.ShowDialog();
            }));
        }
    }
    public class LibraryDisplayDataModel
    {
        public LibraryDisplayDataModel(KitsuLibraryModel data)
        {
            this.Id = (int)data.AnimeId;
            this.LibraryId = data.Id;
        }
        public int Id { get; private set; }
        public int LibraryId { get; private set; }
        public string Title { get; set; }
        public string Rating { get; set; }
        public int Progress { get; set; }
        public DateTime LastChangedAt { get; set; }
    }
}
