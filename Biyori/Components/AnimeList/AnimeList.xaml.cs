using Biyori.API.Kitsu;
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

namespace Biyori.Components.AnimeList
{
    /// <summary>
    /// Interaction logic for AnimeList.xaml
    /// </summary>
    public partial class AnimeList : UserControl
    {
        public AnimeList()
        {
            InitializeComponent();
        }


        public List<KitsuLibraryModel> AnimeLibrarySource
        {
            get { return (List<KitsuLibraryModel>)GetValue(AnimeLibrarySourceProperty); }
            set { SetValue(AnimeLibrarySourceProperty, value); }
        }

        // Using a DependencyProperty as the backing store for MyProperty.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty AnimeLibrarySourceProperty =
            DependencyProperty.Register("AnimeLibrarySource", typeof(List<KitsuLibraryModel>), typeof(AnimeList), new PropertyMetadata(new List<KitsuLibraryModel>()));


    }
}
